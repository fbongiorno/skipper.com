/**
 * screenshot.mjs - Full-page screenshots using Chrome DevTools Protocol
 * No external dependencies — uses only Node.js built-ins.
 */
import { spawn } from 'child_process';
import http from 'http';
import net from 'net';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url      = process.argv[2] || 'http://localhost:3000';
const label    = process.argv[3] || '';
const startY   = parseInt(process.argv[4] || '0');
const clipH    = parseInt(process.argv[5] || '0'); // 0 = full page
const CDP_PORT = 9223;

// ── Output path ──────────────────────────────────────────────────────────────
const dir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
let n = 1;
while (fs.existsSync(path.join(dir, label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`))) n++;
const filename = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
const outPath = path.join(dir, filename);

// ── Chrome path ───────────────────────────────────────────────────────────────
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
if (!fs.existsSync(CHROME)) { console.error('Chrome not found at', CHROME); process.exit(1); }

const userDataDir = path.join(__dirname, '.chrome-cdp-tmp');

// ── Minimal WebSocket client ──────────────────────────────────────────────────
function wsConnect(wsUrl) {
  return new Promise((resolve, reject) => {
    const u = new URL(wsUrl);
    const key = crypto.randomBytes(16).toString('base64');
    const socket = net.connect(parseInt(u.port) || 80, u.hostname, () => {
      socket.write(
        `GET ${u.pathname} HTTP/1.1\r\n` +
        `Host: ${u.host}\r\n` +
        `Upgrade: websocket\r\n` +
        `Connection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${key}\r\n` +
        `Sec-WebSocket-Version: 13\r\n\r\n`
      );
    });

    let upgraded = false;
    let buf = Buffer.alloc(0);
    const pending = new Map();
    let msgId = 1;

    socket.on('data', chunk => {
      if (!upgraded) {
        const s = chunk.toString();
        if (s.includes('101')) {
          upgraded = true;
          const rest = chunk.slice(chunk.indexOf('\r\n\r\n') + 4);
          if (rest.length) processFrames(rest);
        }
        return;
      }
      processFrames(chunk);
    });

    function processFrames(data) {
      buf = Buffer.concat([buf, data]);
      while (buf.length >= 2) {
        const fin  = (buf[0] & 0x80) !== 0;
        const opcode = buf[0] & 0x0f;
        let   len  = buf[1] & 0x7f;
        let   offset = 2;
        if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); offset = 4; }
        else if (len === 127) { if (buf.length < 10) break; len = Number(buf.readBigUInt64BE(2)); offset = 10; }
        if (buf.length < offset + len) break;
        const payload = buf.slice(offset, offset + len);
        buf = buf.slice(offset + len);
        if (opcode === 1) {
          try {
            const msg = JSON.parse(payload.toString());
            if (msg.id && pending.has(msg.id)) {
              const { resolve, reject } = pending.get(msg.id);
              pending.delete(msg.id);
              if (msg.error) reject(new Error(msg.error.message));
              else resolve(msg.result);
            }
          } catch {}
        }
      }
    }

    function send(method, params = {}) {
      return new Promise((res, rej) => {
        const id = msgId++;
        pending.set(id, { resolve: res, reject: rej });
        const msg = JSON.stringify({ id, method, params });
        const msgBuf = Buffer.from(msg);
        const len = msgBuf.length;
        let header;
        if (len < 126)       { header = Buffer.from([0x81, 0x80 | len, 0, 0, 0, 0]); }
        else if (len < 65536){ header = Buffer.from([0x81, 0xFE, (len >> 8) & 0xff, len & 0xff, 0, 0, 0, 0]); }
        else                  { const h = Buffer.alloc(14); h[0]=0x81; h[1]=0xFF; h.writeBigUInt64BE(BigInt(len),2); h.fill(0,10); header=h; }
        socket.write(Buffer.concat([header, msgBuf]));
      });
    }

    socket.on('error', reject);
    setTimeout(() => resolve({ send, close: () => socket.destroy() }), 100);
  });
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────────────────
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${CDP_PORT}`,
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  `--user-data-dir=${userDataDir}`,
  'about:blank',
], { detached: false, stdio: 'ignore' });

try {
  // Wait for Chrome to start
  let targets = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try { targets = await httpGet(`http://127.0.0.1:${CDP_PORT}/json`); break; } catch {}
  }
  if (!targets) throw new Error('Chrome did not start');

  const target = Array.isArray(targets) ? targets.find(t => t.type === 'page') : null;
  if (!target?.webSocketDebuggerUrl) throw new Error('No page target found');

  const ws = await wsConnect(target.webSocketDebuggerUrl);

  // Enable domains
  await ws.send('Page.enable');
  await ws.send('Runtime.enable');
  await ws.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });

  // Navigate
  await ws.send('Page.navigate', { url });
  await sleep(3500); // wait for fonts, animations settle

  // Trigger all reveal animations immediately
  await ws.send('Runtime.evaluate', {
    expression: 'document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"))',
  });
  await sleep(300);

  // Get full page height (keeping viewport at 900px so vh units stay correct)
  const { result } = await ws.send('Runtime.evaluate', {
    expression: 'JSON.stringify({w: document.body.scrollWidth, h: document.body.scrollHeight})',
    returnByValue: true,
  });
  const { w, h } = JSON.parse(result.value);

  // Screenshot (clip can extend beyond viewport — Chrome renders full page content)
  const sy = startY;
  const sh = clipH > 0 ? clipH : h - sy;
  const { data } = await ws.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { x: 0, y: sy, width: 1440, height: Math.min(sh, h - sy), scale: 1 },
  });

  fs.writeFileSync(outPath, Buffer.from(data, 'base64'));
  ws.close();
  console.log(`Screenshot saved: temporary screenshots/${filename}`);
} finally {
  chrome.kill();
}

'use client'

import { useState, useEffect } from 'react'

interface TripPlan {
  tripName: string
  summary: string
  distance: string
  bestSeason: string
  estimatedDays: string
  route: {
    overview: string
    waypoints: { name: string; description: string }[]
  }
  weather: {
    typicalConditions: string
    windPatterns: string
    hazards: string
    tip: string
  }
  checklist: {
    safety: string[]
    navigation: string[]
    provisions: string[]
    documents: string[]
  }
  costs: {
    fuel: string
    marina: string
    provisions: string
    total: string
    currency: string
  }
  tips: { title: string; body: string }[]
  affiliateContext: {
    boatRentalNeeded: boolean
    insuranceRecommended: boolean
    gearSuggestions: string[]
  }
}

export default function PlannerPage() {
  const [scrolled, setScrolled] = useState(false)
  const [departure, setDeparture] = useState('')
  const [destination, setDestination] = useState('')
  const [duration, setDuration] = useState('')
  const [boatType, setBoatType] = useState('')
  const [experience, setExperience] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const loadingMessages = [
    'Charting your course...',
    'Checking sea conditions...',
    'Plotting waypoints...',
    'Preparing your voyage plan...',
    'Finalising checklist...',
  ]

  const handlePlan = async () => {
    if (!departure.trim() || !destination.trim()) {
      setError('Please enter both departure and destination ports.')
      return
    }
    setError('')
    setLoading(true)
    setLoadingStep(0)
    setTripPlan(null)

    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % 5)
    }, 1800)

    try {
      const res = await fetch('/api/plan-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departure, destination, duration, boatType, experience }),
      })

      if (!res.body) throw new Error('No response body')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        for (const line of text.split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.error) throw new Error(data.error)
              if (data.tripPlan) setTripPlan(data.tripPlan)
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message.startsWith('Failed')) throw parseErr
            }
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      clearInterval(stepInterval)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* Nav */}
      <nav className={`planner-nav${scrolled ? ' scrolled' : ''}`}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span className="nav-wordmark">Skipper</span>
        </a>
        <div className="nav-links">
          <a href="/#destinations">Destinations</a>
          <a href="/#experiences">Experiences</a>
          <a href="#">Rent a Boat</a>
          <a href="#">Guides</a>
          <a href="/planner" className="nav-cta active">Plan a Trip</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="planner-hero">
        <span className="section-label">AI Trip Planner</span>
        <h1 className="planner-title">Chart Your <em>Perfect</em> Voyage</h1>
        <p className="planner-sub">
          Expert trip planning for sailors and boaters. Routes, weather, checklists, and costs — in seconds.
        </p>
      </section>

      {/* Main */}
      <main className="planner-main">

        {/* Form Card */}
        <div className="planner-card fade-up">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label className="field-label">Departure Port</label>
              <input
                className="skipper-input"
                placeholder="e.g. Miami, FL"
                value={departure}
                onChange={e => setDeparture(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePlan()}
              />
            </div>
            <div>
              <label className="field-label">Destination</label>
              <input
                className="skipper-input"
                placeholder="e.g. Nassau, Bahamas"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePlan()}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <div>
              <label className="field-label">Duration</label>
              <select className="skipper-input" value={duration} onChange={e => setDuration(e.target.value)}>
                <option value="">Flexible</option>
                <option value="weekend">Weekend</option>
                <option value="1 week">1 Week</option>
                <option value="2 weeks">2 Weeks</option>
                <option value="1 month">1 Month</option>
              </select>
            </div>
            <div>
              <label className="field-label">Vessel Type</label>
              <select className="skipper-input" value={boatType} onChange={e => setBoatType(e.target.value)}>
                <option value="">Sailboat</option>
                <option value="powerboat">Powerboat</option>
                <option value="catamaran">Catamaran</option>
                <option value="motor yacht">Motor Yacht</option>
                <option value="dinghy">Dinghy</option>
              </select>
            </div>
            <div>
              <label className="field-label">Experience Level</label>
              <select className="skipper-input" value={experience} onChange={e => setExperience(e.target.value)}>
                <option value="">Intermediate</option>
                <option value="beginner">Beginner</option>
                <option value="advanced">Advanced</option>
                <option value="offshore captain">Offshore Captain</option>
              </select>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}

          <button className="btn-plan" onClick={handlePlan} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <span style={{ display: 'flex', gap: '3px', alignItems: 'flex-end' }}>
                  <span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" />
                  <span className="wave-bar" /><span className="wave-bar" />
                </span>
                {loadingMessages[loadingStep]}
              </span>
            ) : (
              'Plan My Voyage'
            )}
          </button>
        </div>

        {/* Results */}
        {tripPlan && (
          <div>

            {/* Trip Overview */}
            <div className="result-card fade-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <span className="result-section-label">Your Voyage</span>
                  <h2 className="result-title">{tripPlan.tripName}</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Lora, serif', fontSize: '26px', fontWeight: 600, color: 'var(--teal-dark)' }}>{tripPlan.costs.total}</div>
                  <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-light)', marginTop: '2px' }}>estimated total</div>
                </div>
              </div>
              <p className="result-body" style={{ marginBottom: '24px' }}>{tripPlan.summary}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                  { label: 'Distance', value: tripPlan.distance },
                  { label: 'Best Season', value: tripPlan.bestSeason },
                  { label: 'Est. Duration', value: tripPlan.estimatedDays },
                ].map(s => (
                  <div key={s.label} className="stat-box">
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Route */}
            <div className="result-card fade-up-1">
              <span className="result-section-label">Route Plan</span>
              <p className="result-body" style={{ marginBottom: '20px' }}>{tripPlan.route.overview}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {tripPlan.route.waypoints.map((wp, i) => (
                  <div key={i} style={{ display: 'flex', gap: '14px' }}>
                    <div className="waypoint-num">{i + 1}</div>
                    <div>
                      <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: 600, color: 'var(--navy)', marginBottom: '3px' }}>{wp.name}</div>
                      <div className="result-body" style={{ fontSize: '13px' }}>{wp.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weather */}
            <div className="result-card fade-up-2">
              <span className="result-section-label">Weather &amp; Conditions</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Typical Conditions', value: tripPlan.weather.typicalConditions },
                  { label: 'Wind Patterns', value: tripPlan.weather.windPatterns },
                  { label: 'Watch For', value: tripPlan.weather.hazards },
                  { label: 'Pro Tip', value: tripPlan.weather.tip },
                ].map(item => (
                  <div key={item.label} className="weather-box">
                    <div className="weather-box-label">{item.label}</div>
                    <div className="result-body" style={{ fontSize: '13px' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Costs */}
            <div className="result-card fade-up-3">
              <span className="result-section-label">Cost Estimate</span>
              {[
                { label: 'Fuel', value: tripPlan.costs.fuel },
                { label: 'Marina &amp; Anchorage', value: tripPlan.costs.marina },
                { label: 'Provisions', value: tripPlan.costs.provisions },
              ].map(item => (
                <div key={item.label} className="cost-row">
                  <span className="result-body" style={{ fontSize: '14px' }} dangerouslySetInnerHTML={{ __html: item.label }} />
                  <span style={{ fontFamily: 'Open Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{item.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', marginTop: '4px' }}>
                <span style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mid)' }}>Total Estimate</span>
                <span className="cost-total">{tripPlan.costs.total}</span>
              </div>

              {/* Affiliates */}
              <hr className="skipper-divider" style={{ marginTop: '24px' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
                {tripPlan.affiliateContext.boatRentalNeeded && (
                  <a href="https://www.boatsetter.com/?ref=skipper" target="_blank" rel="noopener noreferrer"
                    className="affiliate-pill"
                    style={{ background: 'var(--teal-pale)', color: 'var(--teal-dark)', border: '1px solid rgba(30,138,150,0.2)' }}>
                    Find a Boat — Boatsetter
                  </a>
                )}
                {tripPlan.affiliateContext.insuranceRecommended && (
                  <a href="https://www.boatus.com/insurance/?ref=skipper" target="_blank" rel="noopener noreferrer"
                    className="affiliate-pill"
                    style={{ background: 'var(--sand)', color: 'var(--text)', border: '1px solid rgba(10,30,48,0.1)' }}>
                    Trip Insurance — BoatUS
                  </a>
                )}
                <a href="https://www.westmarine.com/?ref=skipper" target="_blank" rel="noopener noreferrer"
                  className="affiliate-pill"
                  style={{ background: 'var(--sand)', color: 'var(--text)', border: '1px solid rgba(10,30,48,0.1)' }}>
                  Marine Gear — West Marine
                </a>
              </div>
            </div>

            {/* Checklist */}
            <div className="result-card fade-up">
              <span className="result-section-label">Trip Checklist</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
                {[
                  { title: 'Safety', items: tripPlan.checklist.safety },
                  { title: 'Navigation', items: tripPlan.checklist.navigation },
                  { title: 'Provisions', items: tripPlan.checklist.provisions },
                  { title: 'Documents', items: tripPlan.checklist.documents },
                ].map(section => (
                  <div key={section.title}>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--navy)', marginBottom: '12px' }}>{section.title}</div>
                    {section.items.map((item, i) => (
                      <div key={i} className="checklist-item">
                        <div className="check-dot">
                          <svg viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#1E8A96" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="result-card fade-up">
              <span className="result-section-label">Skipper&apos;s Tips</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {tripPlan.tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div className="tip-num">0{i + 1}</div>
                    <div>
                      <div style={{ fontFamily: 'Lora, serif', fontSize: '16px', fontWeight: 600, color: 'var(--navy)', marginBottom: '6px' }}>{tip.title}</div>
                      <div className="result-body" style={{ fontSize: '13px' }}>{tip.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset */}
            <div style={{ textAlign: 'center', paddingTop: '8px', paddingBottom: '16px' }}>
              <button
                onClick={() => { setTripPlan(null); setDeparture(''); setDestination('') }}
                style={{ fontFamily: 'Montserrat, sans-serif', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-light)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}
              >
                ← Plan Another Voyage
              </button>
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="planner-footer">
        <p>© {new Date().getFullYear()} Skipper.com — Nautical Trip Planning</p>
      </footer>

    </div>
  )
}

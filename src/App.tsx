import { useEffect, useState } from 'react'
import { prizes } from './data/prizes'
import { store } from './data/store'
import { api } from './services/api'
import type { AdminEntry } from './services/api'
import type { Customer, Prize } from './types'

type Step = 'mobile' | 'details' | 'social' | 'spin' | 'result'
const mobilePattern = /^[6-9]\d{9}$/
const WHEEL_SIZE = 300
const WHEEL_CENTER = WHEEL_SIZE / 2
const WHEEL_RADIUS = 132
const SEGMENT_ANGLE = 360 / prizes.length

const pointOnWheel = (angle: number) => {
  const radians = (angle * Math.PI) / 180
  return [WHEEL_CENTER + WHEEL_RADIUS * Math.cos(radians), WHEEL_CENTER + WHEEL_RADIUS * Math.sin(radians)]
}

const segmentPath = (index: number) => {
  const start = -90 + index * SEGMENT_ANGLE
  const end = start + SEGMENT_ANGLE
  const [startX, startY] = pointOnWheel(start)
  const [endX, endY] = pointOnWheel(end)
  return `M ${WHEEL_CENTER} ${WHEEL_CENTER} L ${startX} ${startY} A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 0 1 ${endX} ${endY} Z`
}

function App() {
  const [step, setStep] = useState<Step>('mobile')
  const [mobile, setMobile] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [social, setSocial] = useState({ facebook: false, instagram: false, whatsapp: false })
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [reward, setReward] = useState<Prize | null>(null)
  const [alreadyPlayed, setAlreadyPlayed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminAuthenticated, setAdminAuthenticated] = useState(false)
  const [adminNotice, setAdminNotice] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [adminEntries, setAdminEntries] = useState<AdminEntry[]>([])
  const [adminLoading, setAdminLoading] = useState(false)

  const loadTodayEntries = async () => {
    setAdminLoading(true); setAdminNotice('')
    try { const result = await api.getTodayEntries(); setAdminEntries(result.entries) }
    catch (error) { setAdminNotice(error instanceof Error ? error.message : 'Unable to load today’s entries.') }
    finally { setAdminLoading(false) }
  }

  useEffect(() => {
    if (window.location.pathname.replace(/\/$/, '') !== '/admin') return
    api.adminSession().then((result) => {
      if (result.authenticated) { setAdminAuthenticated(true); void loadTodayEntries() }
    }).catch(() => undefined)
  }, [])

  const checkMobile = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalized = mobile.replace(/\D/g, '')
    if (!mobilePattern.test(normalized)) { setNotice('Please enter a valid 10-digit Indian mobile number.'); return }
    setNotice(''); setLoading(true)
    try {
      const result = await api.checkCustomer(normalized)
      setMobile(normalized)
      if (result.exists && result.customer) {
        setCustomer(result.customer)
        if (result.spin?.reward) { setAlreadyPlayed(true); setReward(result.spin.reward); setStep('result') }
        else { setName(result.customer.name); setAddress(result.customer.address); setStep(result.customer.socialComplete ? 'spin' : 'social') }
      } else { setAlreadyPlayed(false); setCustomer(null); setStep('details') }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to connect right now. Please try again.') } finally { setLoading(false) }
  }

  const saveDetails = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !address.trim()) { setNotice('Please provide your name and address.'); return }
    setLoading(true); setNotice('')
    try {
      const result = await api.registerCustomer(mobile, name.trim(), address.trim())
      setCustomer(result.customer)
      if (result.spin?.reward) { setAlreadyPlayed(true); setReward(result.spin.reward); setStep('result') } else setStep('social')
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to connect right now. Please try again.') } finally { setLoading(false) }
  }

  const spin = () => {
    if (spinning || !customer) return
    setSpinning(true); setStorageError('')
    api.spin(customer.mobile).then((result) => {
      const selected = result.spin.reward
      const index = selected.segmentIndex ?? prizes.findIndex((item) => item.id === selected.id)
      const section = 360 / prizes.length
      const targetAngle = 360 - ((index < 0 ? 0 : index) * section + section / 2)
      setRotation((previous) => previous + 1800 + targetAngle - (previous % 360))
      window.setTimeout(() => { setAlreadyPlayed(result.already_spun); setCustomer(result.customer); setReward(selected); setSpinning(false); setStep('result') }, 4800)
    }).catch((error: unknown) => { setSpinning(false); setStorageError(error instanceof Error ? error.message : 'Unable to complete your spin right now. Please try again.') })
  }

  const completeSocial = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!customer || !social.facebook || !social.instagram || !social.whatsapp) { setNotice('Please confirm all three social media requirements.'); return }
    setLoading(true); setNotice('')
    try { const result = await api.completeSocial(customer.mobile); setCustomer(result.customer); setStep('spin') }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to save your confirmation. Please try again.') }
    finally { setLoading(false) }
  }

  const restart = () => { setStep('mobile'); setMobile(''); setCustomer(null); setReward(null); setAlreadyPlayed(false); setName(''); setAddress(''); setSocial({ facebook: false, instagram: false, whatsapp: false }); setNotice(''); setStorageError('') }

  const loginAdmin = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!adminPassword) { setAdminNotice('Enter the admin password.'); return }
    setDownloading(true); setAdminNotice('')
    try { await api.adminLogin(adminPassword); setAdminAuthenticated(true); setAdminPassword(''); await loadTodayEntries() }
    catch (error) { setAdminNotice(error instanceof Error ? error.message : 'Unable to sign in.') }
    finally { setDownloading(false) }
  }

  const downloadTodayEntries = async () => {
    setDownloading(true); setAdminNotice('')
    try {
      const { blob, filename } = await api.downloadTodayEntries()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove()
      URL.revokeObjectURL(url)
      setAdminNotice('Today’s entries downloaded.')
    } catch (error) { setAdminNotice(error instanceof Error ? error.message : 'Unable to generate the Excel report.') }
    finally { setDownloading(false) }
  }

  if (window.location.pathname.replace(/\/$/, '') === '/admin') {
    return <main><header className="site-header"><img src="/mobile.jpeg" alt="Mobile Hub — Our Hub, Your Choice" /><div className="header-copy"><span>ADMIN DASHBOARD</span><small>Today’s completed entries</small></div></header><section className="app-card admin-card">{!adminAuthenticated ? <><div className="step-label">ADMIN LOGIN</div><h2>Welcome back</h2><p className="muted">Enter the admin password to access today’s customer entries.</p><form onSubmit={loginAdmin}><label>Admin password<input type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} autoComplete="current-password" placeholder="Enter password" /></label>{adminNotice && <div className="alert error">{adminNotice}</div>}<button className="primary" type="submit" disabled={downloading}>{downloading ? 'Signing in...' : 'Login'} <span>→</span></button></form></> : <><div className="step-label">MOBILE HUB REPORTS</div><h2>Today’s Entries</h2><p className="muted">{adminLoading ? 'Loading today’s completed entries...' : `${adminEntries.length} completed ${adminEntries.length === 1 ? 'entry' : 'entries'} today.`}</p>{adminNotice && <div className={`alert ${adminNotice.includes('downloaded') ? 'success' : 'error'}`}>{adminNotice}</div>}<div className="admin-entries">{!adminLoading && adminEntries.length === 0 ? <p>No completed spins have been recorded today.</p> : adminEntries.map((entry) => <article className="admin-entry" key={`${entry.mobile_no}-${entry.created_at}`}><div><b>{entry.customer_name}</b><span>{entry.mobile_no}</span></div><p>{entry.address}</p><strong>{entry.gift}</strong><small>{new Date(entry.created_at).toLocaleString('en-IN')}</small></article>)}</div><button className="primary" type="button" onClick={downloadTodayEntries} disabled={downloading || adminLoading}>{downloading ? 'Generating report...' : 'Download Today’s Entries'} <span>↓</span></button></>}<a className="admin-back" href="/">← Back to Spin Wheel</a></section></main>
  }

  return <main>
    <header className="site-header"><img src="/mobile.jpeg" alt="Mobile Hub — Our Hub, Your Choice" /><div className="header-copy"><span>SPIN & WIN</span><small>Exciting rewards await</small></div></header>
    <section className="hero"><div><p className="eyebrow">MOBILE HUB EXCLUSIVE</p><h1>Spin. Win.<br /><em>Smile.</em></h1><p className="hero-text">A little thank-you for choosing Mobile Hub. One mobile number gets one chance to win.</p></div><div className="hero-badges"><strong>✦</strong><span>Exclusive<br />in-store rewards</span></div></section>
    <section className="app-card" aria-live="polite">
      {storageError && <div className="alert error">{storageError}</div>}
      {step === 'mobile' && <><div className="step-label">STEP 1 OF 4</div><h2>Ready for your lucky spin?</h2><p className="muted">Enter your mobile number to begin.</p><form onSubmit={checkMobile}><label>Mobile number<input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile number" aria-describedby="mobile-help" /></label><small id="mobile-help">Valid Indian numbers only (starts with 6, 7, 8 or 9)</small>{notice && <div className="alert error">{notice}</div>}<button className="primary" type="submit" disabled={loading}>{loading ? 'Checking...' : 'Continue'} <span>→</span></button></form></>}
      {step === 'details' && <><div className="step-label">STEP 2 OF 4</div><h2>Tell us a little about you</h2><p className="muted">Your details help us make this offer yours.</p><form onSubmit={saveDetails}><label>Your name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Enter your full name" /></label><label>Mobile number<input value={mobile} disabled /></label><label>Your address<textarea value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" placeholder="Enter your address" rows={3} /></label>{notice && <div className="alert error">{notice}</div>}<button className="primary" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Continue'} <span>→</span></button></form></>}
      {step === 'social' && <><div className="step-label">STEP 3 OF 4</div><h2>Social Media Requirements <sup>*</sup></h2><p className="muted">Please follow and confirm each option to unlock your spin.</p><form onSubmit={completeSocial} className="social-requirements">{([{ key: 'facebook', title: 'Follow Mobile Hub on Facebook', action: 'Click here to follow', url: 'https://www.facebook.com/profile.php?id=61555352783316' }, { key: 'instagram', title: 'Follow Mobile Hub on Instagram', action: 'Click here to follow', url: 'https://www.instagram.com/mobilehub_tadepalligudem_/' }, { key: 'whatsapp', title: 'Join Mobile Hub WhatsApp Group', action: 'Click here to join', url: 'https://whatsapp.com/channel/0029VajCJxRADTOB8x4ocV2t' }] as const).map((item) => <label className="social-item" key={item.key}><input type="checkbox" checked={social[item.key]} onChange={(e) => setSocial({ ...social, [item.key]: e.target.checked })} /><span><b>{item.title}</b><a href={item.url} target="_blank" rel="noreferrer">→ {item.action}</a></span></label>)}{notice && <div className="alert error">{notice}</div>}<button className="primary" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Continue to spin'} <span>→</span></button></form></>}
      {step === 'spin' && <><div className="step-label">STEP 4 OF 4</div><h2>It’s your lucky moment!</h2><p className="muted">Tap the wheel or button and let the backend decide.</p><div className="wheel-area premium-wheel-area"><div className="premium-pointer" aria-hidden="true">◆</div><div className="wheel-assembly"><div className="wheel premium-wheel" style={{ transform: `rotate(${rotation}deg)` }}><svg viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`} role="img" aria-label="Six reward promotional spin wheel"><defs><radialGradient id="chrome" cx="30%" cy="25%"><stop offset="0" stopColor="#fff" /><stop offset=".22" stopColor="#8c9297" /><stop offset=".48" stopColor="#f8f8f5" /><stop offset=".72" stopColor="#62676d" /><stop offset="1" stopColor="#e4e6e5" /></radialGradient><filter id="wheelShadow"><feDropShadow dx="0" dy="8" stdDeviation="7" floodOpacity=".42" /></filter></defs><circle cx="150" cy="150" r="148" fill="url(#chrome)" filter="url(#wheelShadow)" /><circle cx="150" cy="150" r="137" fill="#771018" />{prizes.map((prize, index) => { const textAngle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2; const [x, y] = pointOnWheel(textAngle - 90); return <g key={prize.id}><path d={segmentPath(index)} fill={index % 2 === 0 ? '#b90e1b' : '#fff8ef'} stroke="#7d1119" strokeWidth="1.5" /><g transform={`translate(${x} ${y}) rotate(${textAngle})`}><text className={index % 2 === 0 ? 'wheel-svg-text light' : 'wheel-svg-text dark'} textAnchor="middle" y="-4">{prize.label}</text><text className="wheel-svg-icon" textAnchor="middle" y="17">{prize.icon}</text></g></g>})}<circle cx="150" cy="150" r="53" fill="url(#chrome)" stroke="#5c1117" strokeWidth="5" /></svg></div><button className="center-spin" type="button" onClick={spin} disabled={spinning} aria-label="Spin the wheel">{spinning ? '...' : 'SPIN'}</button></div></div><button className="primary spin-button" type="button" onClick={spin} disabled={spinning}>{spinning ? 'Spinning...' : 'SPIN NOW'} <span>{spinning ? '✦' : '⟳'}</span></button><p className="fine-print">One spin per mobile number. Your result is securely saved by Mobile Hub.</p></>}
      {step === 'result' && reward && <div className="celebration-popup" role="dialog" aria-label="Spin result"><div className="result-top">{alreadyPlayed ? 'ALREADY PLAYED' : 'YOUR REWARD'}</div><div className="confetti">✦ &nbsp; ✦ &nbsp; ✦</div><h2>{alreadyPlayed ? 'Welcome back!' : 'Congratulations!'}</h2><p className="muted">{alreadyPlayed ? 'Your earlier reward is safely saved below.' : 'You have unlocked a Mobile Hub reward.'}</p><article className="reward-card"><img src={reward.image} alt="" /><div><span>{alreadyPlayed ? 'YOUR EARLIER REWARD' : 'YOU WON'}</span><h3>{reward.title}</h3><p>{reward.description}</p></div></article><p className="claim">Show this screen at Mobile Hub to claim your offer.</p><button className="secondary" type="button" onClick={restart}>Done</button></div>}
    </section>
    <section className="how"><h2>How it works</h2><div><p><b>1</b> Enter your number</p><p><b>2</b> Fill in your details</p><p><b>3</b> Spin and enjoy!</p></div></section>
    <footer><div className="footer-brand"><img src="/mobile.jpeg" alt="Mobile Hub" /><p>{store.address.map((line) => <span key={line}>{line}<br /></span>)}Mob: {store.phone}</p></div><div className="footer-links"><p>Stay connected</p><div>{store.socials.map((social) => <a key={social.name} href={social.url} target="_blank" rel="noreferrer" aria-label={`Open ${social.name}`}>{social.icon}</a>)}</div><a className="admin-link" href="/admin">Admin dashboard</a></div></footer>
  </main>
}

export default App

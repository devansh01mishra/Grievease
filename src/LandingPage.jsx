import {
  ArrowRight, ArrowUpRight, CheckCircle2, ChevronRight, Clock3,
  FileCheck2, Fingerprint, LockKeyhole, Menu, ShieldCheck,
  Sparkles, TicketCheck, Workflow, X
} from 'lucide-react';
import { useState } from 'react';

const steps = [
  { number: '01', icon: FileCheck2, title: 'Raise your concern', text: 'Share what happened, choose a category, and submit your grievance through a guided form.' },
  { number: '02', icon: Workflow, title: 'Get a clear path forward', text: 'Your grievance receives a unique ticket ID and can be assigned to the appropriate official.' },
  { number: '03', icon: TicketCheck, title: 'Track every update', text: 'Follow its status and review the recorded timeline until a resolution is provided.' },
];

const features = [
  { icon: Fingerprint, title: 'Privacy by design', text: 'Grievance details are intended for authorized people only—not the public.' },
  { icon: Clock3, title: 'Clear status tracking', text: 'Know whether a ticket is filed, assigned, in review, or resolved.' },
  { icon: ShieldCheck, title: 'A traceable history', text: 'Important actions can be recorded to support accountability and audit review.' },
];

export default function LandingPage({ onLogin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const goLogin = () => { setMenuOpen(false); onLogin?.(); };

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="brand landing-brand" href="#top" aria-label="Grievease home">
          <span className="brand-mark"><ShieldCheck size={23} strokeWidth={2.2} /></span>
          <span className="brand-name">grievease<span>.</span></span>
        </a>
        <button className="mobile-menu-toggle" type="button" onClick={() => setMenuOpen(v => !v)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav className={`landing-links ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
          <a href="#why-grievease" onClick={() => setMenuOpen(false)}>Why Grievease</a>
          <a href="#privacy" onClick={() => setMenuOpen(false)}>Privacy</a>
          <button type="button" className="nav-login" onClick={goLogin}>Sign in <ArrowUpRight size={16} /></button>
        </nav>
      </header>

      <main id="top">
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="landing-eyebrow"><span className="eyebrow-pulse" /> A clearer campus grievance process</div>
            <h1>Your concern deserves<br />to be <span>heard and handled.</span></h1>
            <p className="hero-description">Grievease gives students a straightforward way to raise concerns, follow progress, and understand what happens next—without losing sight of privacy or accountability.</p>
            <div className="hero-actions">
              <button type="button" className="landing-primary" onClick={goLogin}>Get started <ArrowRight size={18} /></button>
              <a className="landing-secondary" href="#how-it-works">See how it works <ChevronRight size={17} /></a>
            </div>
            <div className="hero-assurance"><span className="assurance-icon"><LockKeyhole size={15} /></span><span>Private by design</span><span className="assurance-dot" /><span>Trackable from submission to resolution</span></div>
          </div>

          <div className="hero-visual" aria-label="Illustration of a grievance being tracked through its stages">
            <div className="visual-glow" />
            <div className="orbit orbit-a" /><div className="orbit orbit-b" />
            <div className="floating-chip chip-top"><span className="chip-check"><CheckCircle2 size={15} /></span> Updates recorded</div>
            <div className="ticket-preview">
              <div className="ticket-topline"><span className="ticket-symbol"><ShieldCheck size={18} /></span><span className="ticket-label">GRIEVANCE TRACKER</span><span className="ticket-menu">•••</span></div>
              <div className="ticket-id-label">TICKET REFERENCE</div>
              <div className="ticket-id">GR-2026-0148 <span className="copy-mark">↗</span></div>
              <div className="ticket-title">Hostel water supply issue</div>
              <div className="ticket-meta"><span>Infrastructure</span><span className="ticket-status"><i /> In review</span></div>
              <div className="ticket-divider" />
              <div className="ticket-progress-title"><strong>Progress timeline</strong><span>3 of 4 steps</span></div>
              <div className="timeline-preview">
                <div className="timeline-line" />
                <div className="timeline-step done"><span><CheckCircle2 size={14} /></span><div><strong>Grievance filed</strong><small>Ticket created successfully</small></div><time>Oct 21</time></div>
                <div className="timeline-step done"><span><CheckCircle2 size={14} /></span><div><strong>Assigned</strong><small>Sent to the relevant office</small></div><time>Oct 21</time></div>
                <div className="timeline-step current"><span><span className="current-dot" /></span><div><strong>Under review</strong><small>Being reviewed by an official</small></div><time>Now</time></div>
                <div className="timeline-step upcoming"><span><span className="empty-dot" /></span><div><strong>Resolution</strong><small>Final response will appear here</small></div></div>
              </div>
              <div className="ticket-bottom"><ShieldCheck size={15} /><span>Updates form a traceable history</span></div>
            </div>
            <div className="floating-chip chip-bottom"><span className="bottom-icon"><Fingerprint size={17} /></span><span><strong>Privacy matters</strong><small>Access for authorized users</small></span></div>
            <div className="visual-caption"><Sparkles size={14} /> A more transparent path to resolution</div>
          </div>
        </section>

        <section className="landing-trust-strip" id="privacy">
          <div className="trust-item"><span className="trust-icon"><LockKeyhole size={18} /></span><div><strong>Confidential by default</strong><small>Private grievance details stay protected</small></div></div>
          <div className="trust-divider" />
          <div className="trust-item"><span className="trust-icon"><TicketCheck size={18} /></span><div><strong>One ticket, clear updates</strong><small>Follow progress in one place</small></div></div>
          <div className="trust-divider" />
          <div className="trust-item"><span className="trust-icon"><FileCheck2 size={18} /></span><div><strong>History you can follow</strong><small>Important status changes are recorded</small></div></div>
        </section>

        <section className="landing-section how-section" id="how-it-works">
          <div className="section-heading"><div className="landing-eyebrow">SIMPLE BY DESIGN</div><h2>From concern to resolution.<br /><span>Without the guesswork.</span></h2><p>A clear process helps everyone understand what happens after a grievance is submitted.</p></div>
          <div className="steps-grid">{steps.map((step) => { const Icon = step.icon; return <article className="step-card" key={step.number}><div className="step-card-top"><span className="step-icon"><Icon size={22} /></span><span className="step-number">{step.number}</span></div><h3>{step.title}</h3><p>{step.text}</p></article>; })}</div>
        </section>

        <section className="landing-section why-section" id="why-grievease">
          <div className="why-intro"><div className="landing-eyebrow">BUILT AROUND TRUST</div><h2>A better process<br />starts with <span>clarity.</span></h2><p>Grievease is designed to make grievance handling easier to follow while keeping personal information out of public view.</p><button type="button" className="text-cta" onClick={goLogin}>Continue to Grievease <ArrowRight size={17} /></button></div>
          <div className="feature-stack">{features.map((feature) => { const Icon = feature.icon; return <article className="feature-row" key={feature.title}><div className="feature-icon"><Icon size={21} /></div><div><h3>{feature.title}</h3><p>{feature.text}</p></div><CheckCircle2 className="feature-check" size={18} /></article>; })}</div>
        </section>

        <section className="landing-cta">
          <div className="cta-decoration cta-decoration-one" /><div className="cta-decoration cta-decoration-two" />
          <div className="cta-copy"><div className="landing-eyebrow">YOUR VOICE MATTERS</div><h2>Ready to raise a concern?</h2><p>Sign in to submit a grievance or follow the progress of one you've already raised.</p></div>
          <button type="button" className="landing-cta-button" onClick={goLogin}>Go to sign in <ArrowRight size={18} /></button>
        </section>
      </main>

      <footer className="landing-footer"><a className="brand landing-brand" href="#top"><span className="brand-mark"><ShieldCheck size={21} /></span><span className="brand-name">grievease<span>.</span></span></a><p>A clearer path from concern to resolution.</p><div className="footer-right"><span>© 2026 Grievease · API Avengers</span><span className="footer-live"><i /> Designed for trust and transparency</span></div></footer>
    </div>
  );
}

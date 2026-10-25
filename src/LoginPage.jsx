import { useState } from 'react';
import {
  ShieldCheck, Eye, EyeOff, ArrowRight, LockKeyhole, Mail,
  GraduationCap, Building2, Settings2, CheckCircle2, CircleHelp,
  Fingerprint, ChevronDown
} from 'lucide-react';

const roles = [
  { id: 'student', label: 'Student', detail: 'File and track your grievances', icon: GraduationCap },
  { id: 'official', label: 'College official', detail: 'Manage assigned grievances', icon: Building2 },
  { id: 'admin', label: 'Administrator', detail: 'Oversee the grievance system', icon: Settings2 },
];

function LoginPage({ onBackHome }) {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);
  const [signedInAs, setSignedInAs] = useState('');

  const selectedRole = roles.find((item) => item.id === role);

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email or college ID and password to continue.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    // UI-only demonstration: this does NOT authenticate against a server.
    // Replace this block with D's API call when the backend is ready.
    setSignedInAs(selectedRole.label);
    setDemo(true);
  }

  function resetForm() {
    setDemo(false);
    setSignedInAs('');
    setPassword('');
    setError('');
  }

  if (demo) {
    return (
      <main className="success-page">
        <div className="success-card">
          <div className="success-icon"><CheckCircle2 size={34} /></div>
          <div className="eyebrow">FRONTEND DEMO</div>
          <h1>Sign-in flow is working.</h1>
          <p className="success-copy">The form validated successfully for the <strong>{signedInAs}</strong> role. This is a demonstration screen; no account has been authenticated yet.</p>
          <div className="demo-note"><ShieldCheck size={19} /><span>When D's backend is ready, this step will call the real login API and the server will verify your identity and permissions.</span></div>
          <button className="primary-button full-button" onClick={resetForm}>Back to sign in <ArrowRight size={17} /></button>
        </div>
      </main>
    );
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); onBackHome?.(); }} aria-label="Grievease home">
          <span className="brand-mark"><ShieldCheck size={23} strokeWidth={2.2} /></span>
          <span className="brand-name">grievease<span>.</span></span>
        </a>
        <div className="topbar-right"><span className="secure-label"><LockKeyhole size={14} /> Secure campus portal</span><span className="topbar-divider" /><a className="help-link" href="mailto:support@grievease.example"><CircleHelp size={16} /> Help</a></div>
      </header>

      <main className="main-layout" id="home">
        <section className="welcome-panel" aria-label="About Grievease">
          <div className="welcome-content">
            <div className="eyebrow"><span className="eyebrow-dot" /> A BETTER WAY TO BE HEARD</div>
            <h1>Your voice matters.<br /><span>We make sure</span><br />it’s heard.</h1>
            <p className="welcome-description">A transparent, secure space for students to raise concerns and follow every step towards a resolution.</p>
            <div className="benefit-list">
              <div className="benefit"><span className="benefit-icon"><Fingerprint size={19} /></span><span><strong>Your privacy comes first</strong><small>Grievances are visible only to authorized people.</small></span></div>
              <div className="benefit"><span className="benefit-icon"><CheckCircle2 size={19} /></span><span><strong>Know where things stand</strong><small>Track progress with a unique grievance ticket.</small></span></div>
              <div className="benefit"><span className="benefit-icon"><ShieldCheck size={19} /></span><span><strong>Built for accountability</strong><small>Important updates leave a traceable history.</small></span></div>
            </div>
          </div>
          <div className="decor decor-one" /><div className="decor decor-two" />
          <div className="welcome-footer"><span className="footer-line" />A clearer path from concern to resolution.</div>
        </section>

        <section className="login-panel" aria-labelledby="login-heading">
          <div className="login-card">
            <button type="button" className="mobile-brand mobile-brand-button" onClick={onBackHome} aria-label="Back to Grievease home"><span className="brand-mark"><ShieldCheck size={22} /></span><span className="brand-name">grievease<span>.</span></span></button>
            <div className="card-heading">
              <div className="eyebrow">WELCOME BACK</div>
              <h2 id="login-heading">Sign in to your account</h2>
              <p>Choose your account type to continue to Grievease.</p>
            </div>

            <div className="role-label">I AM SIGNING IN AS</div>
            <div className="role-options" role="group" aria-label="Choose account type">
              {roles.map((item) => {
                const Icon = item.icon;
                const active = role === item.id;
                return (
                  <button type="button" key={item.id} className={`role-option ${active ? 'active' : ''}`} onClick={() => { setRole(item.id); setError(''); }} aria-pressed={active}>
                    <span className="role-icon"><Icon size={20} /></span>
                    <span className="role-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
                    <span className="radio-dot" />
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <label className="field-label" htmlFor="email">College email address</label>
              <div className="input-wrap"><Mail size={18} /><input id="email" type="email" autoComplete="username" placeholder="you@college.edu" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} /></div>

              <div className="password-label-row"><label className="field-label" htmlFor="password">Password</label><a href="mailto:support@grievease.example?subject=Password%20reset" className="forgot-link">Forgot password?</a></div>
              <div className="input-wrap"><LockKeyhole size={18} /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} /><button className="visibility-button" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>

              <label className="remember-row"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span className="custom-checkbox" /><span>Remember me on this device</span></label>
              {error && <p className="error-message" role="alert">{error}</p>}
              <button type="submit" className="primary-button full-button">Sign in securely <ArrowRight size={18} /></button>
            </form>

            <div className="security-note"><ShieldCheck size={17} /><span>Your sign-in is protected. Access is based on your assigned role.</span></div>
            {role === 'student' && <p className="register-prompt">New to Grievease? <a href="mailto:support@grievease.example?subject=Account%20access">Request account access</a></p>}
            {role !== 'student' && <p className="register-prompt staff-note">Staff accounts are provisioned by the college administrator.</p>}
          </div>
          <div className="login-bottom">By continuing, you agree to follow your institution’s grievance and privacy policies.</div>
        </section>
      </main>

      <footer className="site-footer"><span>© 2026 Grievease · API Avengers</span><span className="footer-status"><span /> Designed for trust and transparency</span></footer>
    </div>
  );
}

export default LoginPage;

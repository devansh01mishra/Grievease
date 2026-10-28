import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bell, CheckCircle2, Clock3, FileText,
  LogOut, Menu, Plus, Search, ShieldCheck, UserPlus, X
} from 'lucide-react';
import LandingPage from './LandingPage.jsx';
import LoginPage from './LoginPage.jsx';
import {
  apiRequest, clearAuthToken, downloadFile, getStoredAuthToken
} from './api.js';

const transitions = {
  Submitted: ['Under Review', 'Rejected'],
  'Under Review': ['In Progress', 'Rejected'],
  'In Progress': ['Resolved', 'Rejected'],
  Escalated: ['Under Review', 'In Progress', 'Resolved', 'Rejected'],
  Resolved: [],
  Rejected: []
};

function displayStatus(grievance) {
  if (grievance.isPastDue && !['Resolved', 'Rejected'].includes(grievance.status)) return 'Overdue';
  if (grievance.status === 'Submitted' && grievance.assignedTo) return 'Assigned';
  return ({
    Submitted: 'Filed',
    'Under Review': 'In Review',
    'In Progress': 'In Progress',
    Resolved: 'Resolved',
    Rejected: 'Rejected',
    Escalated: 'Escalated'
  })[grievance.status] || grievance.status;
}

function formatDate(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString();
}

function toCase(grievance) {
  return {
    ...grievance,
    id: grievance.ticketId,
    statusLabel: displayStatus(grievance),
    owner: grievance.assignedTo?.name || 'Unassigned',
    studentName: grievance.student?.name || 'You',
    createdLabel: formatDate(grievance.createdAt),
    updatedLabel: formatDate(grievance.updatedAt),
    deadlineLabel: formatDate(grievance.deadline)
  };
}

function CaseTable({ cases, onOpen }) {
  if (!cases.length) {
    return <div className="integration-empty"><FileText size={23} /><strong>No grievances found</strong><span>Submitted cases will appear here.</span></div>;
  }
  return (
    <div className="table-scroll">
      <table className="case-table">
        <thead><tr><th>GRIEVANCE</th><th>STATUS</th><th>PRIORITY</th><th>LAST UPDATED</th><th /></tr></thead>
        <tbody>{cases.map((item) => (
          <tr key={item.id} onClick={() => onOpen(item.id)}>
            <td><div className="table-title"><span className="table-file"><FileText size={16} /></span><span><b>{item.title}</b><small>{item.id} · {item.category}</small></span></div></td>
            <td><span className={`badge ${item.statusLabel.toLowerCase().replaceAll(' ', '-')}`}>{item.statusLabel}</span></td>
            <td><span className={`priority priority-${item.priority.toLowerCase()}`}><i />{item.priority}</span></td>
            <td className="table-update">{item.updatedLabel}</td>
            <td><button className="row-action" type="button" onClick={(event) => { event.stopPropagation(); onOpen(item.id); }} aria-label={`View ${item.id}`}><ArrowRight size={17} /></button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function App() {
  const [page, setPage] = useState('landing');
  const [section, setSection] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [officials, setOfficials] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [audit, setAudit] = useState(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ title: '', category: 'Hostel & Facilities', description: '', priority: 'Medium', attachments: [] });
  const [statusNote, setStatusNote] = useState('');
  const [nextStatus, setNextStatus] = useState('');
  const [officialForm, setOfficialForm] = useState({ name: '', email: '', password: '', department: '' });
  const [policyForm, setPolicyForm] = useState({ deadlineHours: '', escalateAfterHours: '', enabled: true });

  const roleLabel = user?.role === 'administrator' ? 'Administrator' : user?.role === 'official' ? 'College official' : 'Student';

  const loadCases = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest('/grievances?limit=100&page=1');
      setCases(result.grievances.map(toCase));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      setSessionLoading(false);
      return;
    }
    apiRequest('/auth/me')
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        setPage('portal');
      })
      .catch((requestError) => {
        clearAuthToken();
        setError(`Your saved session could not be restored. ${requestError.message}`);
        setPage('login');
      })
      .finally(() => setSessionLoading(false));
  }, []);

  useEffect(() => {
    if (user) loadCases();
  }, [user, loadCases]);

  useEffect(() => {
    if (!user || user.role !== 'administrator') return;
    Promise.all([
      apiRequest('/admin/officials'),
      apiRequest('/admin/escalation-policy')
    ]).then(([officialResult, policyResult]) => {
      setOfficials(officialResult.officials);
      setPolicy(policyResult.policy);
      setPolicyForm({
        deadlineHours: policyResult.policy.deadlineHours,
        escalateAfterHours: policyResult.policy.escalateAfterHours,
        enabled: policyResult.policy.enabled
      });
    }).catch((requestError) => setError(requestError.message));
  }, [user]);

  const visibleCases = useMemo(() => cases.filter((item) => {
    const matchesText = `${item.id} ${item.title} ${item.category} ${item.owner}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = filter === 'All' || item.statusLabel === filter;
    return matchesText && matchesStatus;
  }), [cases, filter, query]);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }

  function openCase(ticketId) {
    setError('');
    setAudit(null);
    setLoading(true);
    apiRequest(`/grievances/${encodeURIComponent(ticketId)}`)
      .then(({ grievance }) => {
        setSelectedCase(toCase(grievance));
        setNextStatus(transitions[grievance.status]?.[0] || '');
        setSection('details');
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }

  async function submitGrievance(event) {
    event.preventDefault();
    setError('');
    const body = new FormData();
    body.append('title', form.title);
    body.append('category', form.category);
    body.append('description', form.description);
    body.append('priority', form.priority);
    form.attachments.forEach((file) => body.append('attachments', file));
    setLoading(true);
    try {
      const { grievance } = await apiRequest('/grievances', { method: 'POST', body });
      const created = toCase(grievance);
      setCases((items) => [created, ...items]);
      setSelectedCase(created);
      setModalOpen(false);
      setForm({ title: '', category: 'Hostel & Facilities', description: '', priority: 'Medium', attachments: [] });
      setSection('details');
      showNotice(`Grievance submitted. Tracking ID: ${created.id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(event) {
    event.preventDefault();
    if (!selectedCase || !nextStatus) return;
    setLoading(true);
    setError('');
    try {
      const { grievance } = await apiRequest(`/grievances/${encodeURIComponent(selectedCase.id)}/status`, {
        method: 'PATCH',
        body: { status: nextStatus, note: statusNote }
      });
      const updated = toCase(grievance);
      setSelectedCase(updated);
      setCases((items) => items.map((item) => item.id === updated.id ? updated : item));
      setStatusNote('');
      setNextStatus(transitions[grievance.status]?.[0] || '');
      showNotice('Grievance status updated.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function assignCase(event) {
    event.preventDefault();
    const officialId = event.currentTarget.elements.officialId.value;
    if (!selectedCase || !officialId) return;
    setLoading(true);
    setError('');
    try {
      const { grievance } = await apiRequest(`/grievances/${encodeURIComponent(selectedCase.id)}/assign`, {
        method: 'PATCH',
        body: { officialId }
      });
      const updated = toCase(grievance);
      setSelectedCase(updated);
      setCases((items) => items.map((item) => item.id === updated.id ? updated : item));
      showNotice('Official assigned to the grievance.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAudit() {
    if (!selectedCase) return;
    setLoading(true);
    setError('');
    try {
      setAudit(await apiRequest(`/grievances/${encodeURIComponent(selectedCase.id)}/audit`));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function createOfficial(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { user: created } = await apiRequest('/admin/officials', { method: 'POST', body: officialForm });
      setOfficials((items) => [...items, created]);
      setOfficialForm({ name: '', email: '', password: '', department: '' });
      showNotice('Official account created.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function savePolicy(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const updated = await apiRequest('/admin/escalation-policy', {
        method: 'PATCH',
        body: {
          deadlineHours: Number(policyForm.deadlineHours),
          escalateAfterHours: Number(policyForm.escalateAfterHours),
          enabled: policyForm.enabled
        }
      });
      setPolicy(updated.policy);
      showNotice('Escalation policy saved.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function signOut() {
    clearAuthToken();
    setUser(null);
    setCases([]);
    setSelectedCase(null);
    setPage('landing');
    setSection('dashboard');
    setError('');
  }

  if (sessionLoading) return <div className="integration-loading">Checking your session…</div>;
  if (page === 'landing') return <LandingPage onLogin={() => { setError(''); setPage('login'); }} />;
  if (page === 'login') return <><LoginPage onBackHome={() => setPage('landing')} onAuthenticated={(authenticatedUser) => { setUser(authenticatedUser); setPage('portal'); setSection('dashboard'); }} /><ErrorNotice error={error} onDismiss={() => setError('')} /></>;

  const isAdministrator = user?.role === 'administrator';
  const canUpdate = user?.role === 'official' || isAdministrator;
  const statusOptions = selectedCase ? transitions[selectedCase.status] || [] : [];
  const pageTitle = section === 'details' ? 'Grievance details' : section === 'grievances' ? 'My grievances' : section === 'administration' ? 'Administration' : 'Dashboard';

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="sidebar-head"><div className="brand"><span className="brand-mark"><ShieldCheck size={22} /></span><span>grievease<span className="brand-dot">.</span></span></div><button className="icon-btn sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="role-switch"><span className="role-avatar">{user?.name?.slice(0, 2).toUpperCase()}</span><div><b>{user?.name}</b><small>{roleLabel}</small></div></div>
        <nav className="side-nav">
          <span className="nav-label">MENU</span>
          <button className={section === 'dashboard' ? 'active' : ''} onClick={() => { setSection('dashboard'); setMobileNav(false); }}><FileText size={18} /> Dashboard</button>
          <button className={section === 'grievances' ? 'active' : ''} onClick={() => { setSection('grievances'); setMobileNav(false); }}><Search size={18} /> Grievances <span className="nav-count">{cases.length}</span></button>
          {isAdministrator && <button className={section === 'administration' ? 'active' : ''} onClick={() => { setSection('administration'); setMobileNav(false); }}><UserPlus size={18} /> Administration</button>}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon"><ShieldCheck size={17} /></span><b>Private and traceable</b><p>Only authorized accounts can access grievance details.</p></div>
          <button className="profile-row" onClick={signOut}><span className="profile-avatar">{user?.name?.slice(0, 2).toUpperCase()}</span><span><b>{user?.email}</b><small>Sign out</small></span><LogOut size={17} /></button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="icon-btn mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu /></button><div className="breadcrumb">Portal <span>/</span> <b>{pageTitle}</b></div></div><div className="topbar-actions"><span className="secure-label"><ShieldCheck size={14} /> {roleLabel}</span><Bell size={18} /></div></header>
        <main className="page-content">
          <ErrorNotice error={error} onDismiss={() => setError('')} />
          {notice && <div className="integration-notice" role="status">{notice}</div>}
          {loading && <div className="integration-progress">Working…</div>}

          {section === 'dashboard' && (
            <>
              <div className="page-title-row"><div><div className="eyebrow">GRIEVEASE PORTAL</div><h1>Welcome, {user?.name}</h1><p>Track grievance progress and review the latest updates.</p></div>{user?.role === 'student' && <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={17} /> New grievance</button>}</div>
              <div className="stat-grid">
                <StatCard icon={FileText} label="Total grievances" value={cases.length} />
                <StatCard icon={Clock3} label="In progress" value={cases.filter((item) => !['Resolved', 'Rejected'].includes(item.status)).length} />
                <StatCard icon={CheckCircle2} label="Resolved" value={cases.filter((item) => item.status === 'Resolved').length} />
              </div>
              <section className="panel list-panel"><div className="panel-head"><div><h2>Recent grievances</h2><p>Cases available to your account.</p></div><button className="text-button" onClick={() => setSection('grievances')}>View all <ArrowRight size={14} /></button></div><CaseTable cases={cases.slice(0, 5)} onOpen={openCase} /></section>
            </>
          )}

          {section === 'grievances' && (
            <>
              <div className="page-title-row"><div><div className="eyebrow">YOUR RECORDS</div><h1>Grievances</h1><p>Search authorized cases and follow their progress.</p></div>{user?.role === 'student' && <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={17} /> New grievance</button>}</div>
              <section className="panel list-panel">
                <div className="list-tools"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, category or ticket ID" /></div><div className="filter-wrap"><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All</option>{[...new Set(cases.map((item) => item.statusLabel))].map((status) => <option key={status}>{status}</option>)}</select></div><span className="result-count">{visibleCases.length} cases</span></div>
                <CaseTable cases={visibleCases} onOpen={openCase} />
              </section>
            </>
          )}

          {section === 'details' && selectedCase && (
            <>
              <button className="text-button integration-back" onClick={() => setSection('grievances')}><ArrowLeft size={15} /> Back to grievances</button>
              <div className="page-title-row"><div><div className="eyebrow">{selectedCase.id}</div><h1>{selectedCase.title}</h1><p>{selectedCase.category} · Submitted {selectedCase.createdLabel}</p></div><span className={`badge ${selectedCase.statusLabel.toLowerCase().replaceAll(' ', '-')}`}>{selectedCase.statusLabel}</span></div>
              <section className="panel integration-detail"><h2>Case information</h2><p className="integration-description">{selectedCase.description}</p><div className="integration-metadata"><div><small>Priority</small><strong>{selectedCase.priority}</strong></div><div><small>Assigned official</small><strong>{selectedCase.owner}</strong></div><div><small>Deadline</small><strong>{selectedCase.deadlineLabel}</strong></div><div><small>Student</small><strong>{selectedCase.studentName}</strong></div></div>
                {selectedCase.attachments?.length > 0 && <div className="integration-attachments"><h3>Attachments</h3>{selectedCase.attachments.map((attachment) => <button key={attachment.downloadUrl} className="text-button" onClick={() => downloadFile(attachment.downloadUrl, attachment.originalName).catch((requestError) => setError(requestError.message))}>{attachment.originalName} <ArrowRight size={14} /></button>)}</div>}
              </section>
              {canUpdate && statusOptions.length > 0 && <section className="panel integration-action"><h2>Update status</h2><form onSubmit={updateStatus} className="integration-form"><label>Next status<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} required>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label>Update note<textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} maxLength={1000} /></label><button className="btn btn-primary" disabled={loading}>Save update</button></form></section>}
              {isAdministrator && <section className="panel integration-action"><h2>Assign official</h2><form onSubmit={assignCase} className="integration-form inline"><label>Official<select name="officialId" required defaultValue={selectedCase.assignedTo?._id || ''}><option value="" disabled>Select an official</option>{officials.map((official) => <option value={official.id || official._id} key={official.id || official._id}>{official.name} · {official.department}</option>)}</select></label><button className="btn btn-outline" disabled={loading}>Assign</button></form><button className="text-button" onClick={loadAudit}>View audit history</button>{audit && <AuditTrail audit={audit} />}</section>}
            </>
          )}

          {section === 'administration' && isAdministrator && (
            <>
              <div className="page-title-row"><div><div className="eyebrow">ADMINISTRATOR</div><h1>Administration</h1><p>Manage official accounts and grievance handling settings.</p></div></div>
              <section className="panel integration-action"><h2>Create official account</h2><form onSubmit={createOfficial} className="integration-form"><label>Name<input required maxLength={120} value={officialForm.name} onChange={(event) => setOfficialForm({ ...officialForm, name: event.target.value })} /></label><label>College email<input required type="email" value={officialForm.email} onChange={(event) => setOfficialForm({ ...officialForm, email: event.target.value })} /></label><label>Temporary password<input required type="password" minLength={12} maxLength={128} value={officialForm.password} onChange={(event) => setOfficialForm({ ...officialForm, password: event.target.value })} /></label><label>Department<input required maxLength={120} value={officialForm.department} onChange={(event) => setOfficialForm({ ...officialForm, department: event.target.value })} /></label><button className="btn btn-primary" disabled={loading}>Create official</button></form><h3>Active officials</h3>{officials.map((official) => <div className="integration-official" key={official.id || official._id}><strong>{official.name}</strong><span>{official.department} · {official.email}</span></div>)}</section>
              {policy && <section className="panel integration-action"><h2>Escalation policy</h2><form onSubmit={savePolicy} className="integration-form"><label>Initial deadline (hours)<input type="number" min="1" max="8760" required value={policyForm.deadlineHours} onChange={(event) => setPolicyForm({ ...policyForm, deadlineHours: event.target.value })} /></label><label>Escalate after (hours)<input type="number" min="1" max="8760" required value={policyForm.escalateAfterHours} onChange={(event) => setPolicyForm({ ...policyForm, escalateAfterHours: event.target.value })} /></label><label className="integration-checkbox"><input type="checkbox" checked={policyForm.enabled} onChange={(event) => setPolicyForm({ ...policyForm, enabled: event.target.checked })} /> Escalation enabled</label><button className="btn btn-primary" disabled={loading}>Save policy</button></form></section>}
            </>
          )}

          {!loading && cases.length === 0 && section !== 'administration' && <div className="integration-empty"><FileText size={24} /><strong>No cases available</strong><span>{user?.role === 'student' ? 'Submit a grievance to begin tracking it here.' : 'Assigned cases will appear here when available.'}</span></div>}
        </main>
      </div>

      {modalOpen && <div className="modal-backdrop" role="presentation"><div className="modal integration-modal" role="dialog" aria-modal="true" aria-labelledby="create-heading"><div className="modal-head"><div><span className="eyebrow">NEW SUBMISSION</span><h2 id="create-heading">Raise a grievance</h2><p>Your grievance will be linked to your signed-in account.</p></div><button className="icon-btn" onClick={() => setModalOpen(false)} aria-label="Close">×</button></div><form onSubmit={submitGrievance} className="grievance-form"><label>Grievance title<input required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Hostel & Facilities</option><option>Academic Services</option><option>Fees & Payments</option><option>Infrastructure</option><option>Accessibility</option><option>Other</option></select></label><label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label><label>Description<textarea required maxLength={10000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><label>Attachments (up to 5 files)<input type="file" multiple onChange={(event) => setForm({ ...form, attachments: Array.from(event.target.files || []).slice(0, 5) })} /></label>{error && <ErrorNotice error={error} onDismiss={() => setError('')} />}<div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading}>Submit grievance</button></div></form></div></div>}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return <div className="stat-card"><div className="stat-top"><span className="stat-icon"><Icon size={18} /></span></div><div className="stat-value">{String(value).padStart(2, '0')}</div><div className="stat-label">{label}</div></div>;
}

function ErrorNotice({ error, onDismiss }) {
  if (!error) return null;
  return <div className="integration-error" role="alert"><span>{error}</span><button type="button" onClick={onDismiss} aria-label="Dismiss error">×</button></div>;
}

function AuditTrail({ audit }) {
  return <div className="integration-audit"><strong>Audit chain: {audit.valid ? 'Verified' : 'Invalid'}</strong>{audit.entries.map((entry) => <article key={entry._id}><b>{entry.action}</b><span>{entry.performedBy?.name || entry.actorLabel || 'System'} · {formatDate(entry.timestamp)}</span></article>)}</div>;
}

export default App;

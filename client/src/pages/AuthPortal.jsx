import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, GraduationCap, CheckCircle, Clock, BookOpen, Lock } from 'lucide-react';
import { useAuth, API } from '../App';
import Logo from '../components/Logo';

const CLASSES = ['P1','P2','P3','P4','P5','P6','P7','S1','S2','S3','S4','S5','S6'];

export default function AuthPortal() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // login | register | pending
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingName, setPendingName] = useState('');

  // A-Level subject selection state
  const [aLevelSubjects, setALevelSubjects] = useState([]); // all A-Level subjects from server
  const [selectedPrincipals, setSelectedPrincipals] = useState([]); // 3 principal subject ids
  const [selectedSubsidiaries, setSelectedSubsidiaries] = useState([]); // 2 subsidiary subject ids
  const [gpSubjectId, setGpSubjectId] = useState(null); // GP subject id (auto-locked)

  const [loginForm, setLoginForm] = useState({ loginKey: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '', phone: '', username: '', password: '', confirmPassword: '', level: 'S1', inviteCode: ''
  });

  // Fetch A-Level subjects whenever we need them
  useEffect(() => {
    if (['S5', 'S6'].includes(registerForm.level)) {
      fetch(`${API}/subjects`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            const alevel = data.filter(s => s.level === 'A-Level');
            setALevelSubjects(alevel);
            // Find General Paper automatically
            const gp = alevel.find(s =>
              s.name?.toLowerCase().includes('general paper') ||
              s.code?.toUpperCase() === 'GP'
            );
            if (gp) {
              setGpSubjectId(gp.id);
              // Auto-lock GP as a subsidiary
              setSelectedSubsidiaries([gp.id]);
            } else {
              setSelectedSubsidiaries([]);
            }
            setSelectedPrincipals([]);
          }
        })
        .catch(() => {});
    }
  }, [registerForm.level]);

  const principalSubjects = aLevelSubjects.filter(s => s.classification === 'Principal');
  const subsidiarySubjects = aLevelSubjects.filter(s => s.classification === 'Subsidiary');

  const togglePrincipal = (id) => {
    setSelectedPrincipals(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  };

  const toggleSubsidiary = (id) => {
    if (id === gpSubjectId) return; // GP is locked
    setSelectedSubsidiaries(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return prev; // max 2
      return [...prev, id];
    });
  };

  // Derive combination code from selected principals for backward compat
  const deriveCombination = () => {
    if (selectedPrincipals.length !== 3) return '';
    const initials = selectedPrincipals.map(id => {
      const sub = aLevelSubjects.find(s => s.id == id);
      return sub?.code?.substring(0, 1).toUpperCase() || sub?.name?.substring(0, 1).toUpperCase() || '?';
    });
    return initials.join('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.message?.includes('pending')) {
          setPendingName(loginForm.loginKey);
          setMode('pending');
        } else {
          setError(data.message || 'Login failed');
        }
        return;
      }
      login(data.user, data.token);
      switch (data.user.role) {
        case 'admin': navigate('/admin'); break;
        case 'teacher': navigate('/teacher'); break;
        case 'student': navigate('/student'); break;
        default: navigate('/');
      }
    } catch {
      setError('Server connection error. Is the backend running on port 5000?');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (registerForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    const isALevel = ['S5', 'S6'].includes(registerForm.level);

    if (isALevel) {
      if (selectedPrincipals.length !== 3) {
        setError('Please select exactly 3 Principal subjects');
        return;
      }
      if (selectedSubsidiaries.length !== 2) {
        setError('Please select exactly 2 Subsidiary subjects (General Paper is compulsory)');
        return;
      }
    }

    setLoading(true);
    try {
      const body = {
        name: registerForm.name,
        phone: registerForm.phone,
        username: registerForm.username,
        password: registerForm.password,
        role: 'student',
        level: registerForm.level,
        combination: isALevel ? deriveCombination() : null,
        principalSubjects: isALevel ? JSON.stringify(selectedPrincipals) : null,
        subsidiarySubjects: isALevel ? JSON.stringify(selectedSubsidiaries) : null,
        inviteCode: registerForm.inviteCode
      };
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Registration failed');
        return;
      }
      setPendingName(registerForm.name);
      setMode('pending');
    } catch {
      setError('Server connection error. Is the backend running on port 5000?');
    } finally {
      setLoading(false);
    }
  };

  // ── Reusable subject chip component ──
  const SubjectChip = ({ subject, selected, locked, onToggle }) => (
    <button
      type="button"
      onClick={() => !locked && onToggle(subject.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: locked ? 'default' : 'pointer',
        background: locked
          ? 'rgba(245,158,11,0.15)'
          : selected
            ? 'rgba(99,102,241,0.2)'
            : 'rgba(255,255,255,0.04)',
        border: `1px solid ${locked ? 'rgba(245,158,11,0.4)' : selected ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
        color: locked ? 'var(--accent-amber)' : selected ? 'var(--primary)' : 'var(--text-muted)',
        fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.18s ease',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {locked ? <Lock size={12} /> : selected ? <CheckCircle size={12} /> : <BookOpen size={12} />}
      <span>{subject.name}</span>
      {subject.code && (
        <span style={{
          background: locked ? 'rgba(245,158,11,0.2)' : selected ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)',
          padding: '1px 6px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace'
        }}>
          {subject.code}
        </span>
      )}
    </button>
  );

  return (
    <div className="auth-wrapper">
      <div style={{ width: '100%', maxWidth: '540px' }}>
        {/* Back to home */}
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: '24px' }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={14} /> Back to Home
        </button>

        {/* ─── PENDING STATE ─── */}
        {mode === 'pending' && (
          <div className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{
              background: 'rgba(245,158,11,0.15)', width: '72px', height: '72px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: 'var(--accent-amber)'
            }}>
              <Clock size={36} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '12px' }}>Awaiting Approval</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
              Hello <strong style={{ color: 'var(--text-main)' }}>{pendingName}</strong>!
              Your registration is pending Administrator approval.
              You'll be able to log in once the Admin reviews and approves your account.
            </p>
            <div style={{
              background: 'rgba(16,185,129,0.1)', padding: '16px', borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(16,185,129,0.2)', marginBottom: '24px', textAlign: 'left'
            }}>
              <div style={{ color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '8px', fontSize: '0.85rem' }}>📋 What happens next?</div>
              <ul style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '2', paddingLeft: '16px' }}>
                <li>Admin reviews your registration details</li>
                <li>You receive approval notification</li>
                <li>Log in with your username and password</li>
                <li>Start accessing your learning materials!</li>
              </ul>
            </div>
            <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setMode('login'); setError(''); }}>
              Back to Login
            </button>
          </div>
        )}

        {/* ─── LOGIN FORM ─── */}
        {mode === 'login' && (
          <div className="glass-card auth-card">
            <div className="auth-header">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <Logo iconOnly size={56} />
              </div>
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">Login to Alinda Digital Learners</p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Username or Phone Number</label>
                <input
                  className="input-field"
                  placeholder="Enter username or phone..."
                  value={loginForm.loginKey}
                  onChange={e => setLoginForm(p => ({ ...p, loginKey: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-field"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Your password..."
                    value={loginForm.password}
                    onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                    required
                    style={{ paddingRight: '46px' }}
                  />
                  <button type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ padding: '12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              New student?{' '}
              <span className="auth-toggle-link" onClick={() => { setMode('register'); setError(''); }}>
                Register here
              </span>
            </div>
          </div>
        )}

        {/* ─── REGISTER FORM ─── */}
        {mode === 'register' && (
          <div className="glass-card auth-card">
            <div className="auth-header">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <Logo iconOnly size={56} />
              </div>
              <h1 className="auth-title">Student Registration</h1>
              <p className="auth-subtitle">Create your account — pending admin approval</p>
            </div>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">School Invite Code</label>
                <input className="input-field" placeholder="e.g. STM1234 or DEFAULT2026" value={registerForm.inviteCode}
                  onChange={e => setRegisterForm(p => ({ ...p, inviteCode: e.target.value }))} required />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <input className="input-field" placeholder="e.g. Namukasa Sarah Beatrice" value={registerForm.name}
                  onChange={e => setRegisterForm(p => ({ ...p, name: e.target.value }))} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input className="input-field" placeholder="+256 7XX XXX XXX" value={registerForm.phone}
                    onChange={e => setRegisterForm(p => ({ ...p, phone: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Class / Level</label>
                  <select className="select-field" value={registerForm.level}
                    onChange={e => setRegisterForm(p => ({ ...p, level: e.target.value }))}>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* ─── A-LEVEL SUBJECT SELECTION ─── */}
              {['S5', 'S6'].includes(registerForm.level) && (
                <div style={{
                  background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 'var(--radius-md)', padding: '16px',
                  display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                  {/* Header banner */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--accent-emerald))',
                      width: '32px', height: '32px', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <BookOpen size={16} color="white" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>A-Level Subject Selection</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        Choose 3 Principal + 2 Subsidiary (GP is compulsory)
                      </div>
                    </div>
                    {/* Progress indicator */}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', fontSize: '0.75rem' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontWeight: 600,
                        background: selectedPrincipals.length === 3 ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.1)',
                        color: selectedPrincipals.length === 3 ? 'var(--accent-emerald)' : 'var(--primary)',
                        border: `1px solid ${selectedPrincipals.length === 3 ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`
                      }}>
                        {selectedPrincipals.length}/3 P
                      </span>
                      <span style={{
                        padding: '3px 8px', borderRadius: '12px', fontWeight: 600,
                        background: selectedSubsidiaries.length === 2 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.1)',
                        color: selectedSubsidiaries.length === 2 ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                        border: `1px solid ${selectedSubsidiaries.length === 2 ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                      }}>
                        {selectedSubsidiaries.length}/2 S
                      </span>
                    </div>
                  </div>

                  {/* Principal Subjects */}
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ background: 'var(--primary)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>P</span>
                      Principal Subjects — Select exactly 3
                    </div>
                    {principalSubjects.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '8px' }}>
                        No principal subjects defined yet. Please contact the administrator.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {principalSubjects.map(s => (
                          <SubjectChip
                            key={s.id}
                            subject={s}
                            selected={selectedPrincipals.includes(s.id)}
                            locked={false}
                            onToggle={togglePrincipal}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Subsidiary Subjects */}
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-amber)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ background: 'var(--accent-amber)', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>S</span>
                      Subsidiary Subjects — Select 2 (GP is compulsory)
                    </div>
                    {subsidiarySubjects.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '8px' }}>
                        No subsidiary subjects defined yet. Please contact the administrator.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {subsidiarySubjects.map(s => (
                          <SubjectChip
                            key={s.id}
                            subject={s}
                            selected={selectedSubsidiaries.includes(s.id)}
                            locked={s.id === gpSubjectId}
                            onToggle={toggleSubsidiary}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preview of selected combination */}
                  {selectedPrincipals.length > 0 && (
                    <div style={{
                      background: 'rgba(16,185,129,0.08)', borderRadius: '8px',
                      padding: '10px 14px', border: '1px solid rgba(16,185,129,0.15)',
                      fontSize: '0.8rem', color: 'var(--text-muted)'
                    }}>
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>📚 Your combination: </span>
                      {selectedPrincipals.map(id => {
                        const s = aLevelSubjects.find(x => x.id == id);
                        return s ? `${s.name} (${s.code || '?'})` : '?';
                      }).join(', ')}
                      {selectedSubsidiaries.length > 0 && (
                        <span style={{ color: 'var(--text-muted)' }}>
                          {' + '}
                          {selectedSubsidiaries.map(id => {
                            const s = aLevelSubjects.find(x => x.id == id);
                            return s ? s.name : '?';
                          }).join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Username</label>
                <input className="input-field" placeholder="Choose a unique username" value={registerForm.username}
                  onChange={e => setRegisterForm(p => ({ ...p, username: e.target.value }))} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Password</label>
                  <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters" value={registerForm.password}
                    onChange={e => setRegisterForm(p => ({ ...p, password: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Confirm Password</label>
                  <input className="input-field" type={showPass ? 'text' : 'password'} placeholder="Repeat password" value={registerForm.confirmPassword}
                    onChange={e => setRegisterForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <input type="checkbox" id="showpw" onChange={e => setShowPass(e.target.checked)} />
                <label htmlFor="showpw">Show passwords</label>
              </div>

              {error && (
                <div style={{ padding: '12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-rose)', fontSize: '0.85rem' }}>
                  ⚠️ {error}
                </div>
              )}

              <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
                {loading ? 'Registering...' : 'Submit Registration'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Already registered?{' '}
              <span className="auth-toggle-link" onClick={() => { setMode('login'); setError(''); }}>Login here</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

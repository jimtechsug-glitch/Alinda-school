import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, GraduationCap, Monitor, Star, Phone, Mail, ArrowRight, Sun, Moon, Menu, X } from 'lucide-react';
import { API } from '../App';
import Logo from '../components/Logo';
import schoolBuilding from '../assets/school_building.png';
import studentsLearning from '../assets/students_learning.jpg';
import teacherOnline from '../assets/teacher_online.jpg';

const LEVELS = [
  { label: 'Primary (P1–P7)', desc: 'Uganda National Curriculum for Primary Education', color: 'var(--accent-emerald)', icon: '🏫' },
  { label: 'O-Level (S1–S4)', desc: 'New Lower Secondary Curriculum (NLSC) competency-based', color: 'var(--primary)', icon: '📗' },
  { label: 'A-Level (S5–S6)', desc: 'Advanced Level principal & subsidiary combinations (UACE)', color: 'var(--accent-amber)', icon: '🎓' },
];

const FEATURES = [
  { icon: <BookOpen size={22} />, title: 'Notes & Resources', desc: 'Access curated study notes, support materials aligned to NCDC Uganda syllabus.' },
  { icon: <Monitor size={22} />, title: 'Live Lessons', desc: 'Join scheduled interactive video lessons with your assigned facilitator.' },
  { icon: <Star size={22} />, title: 'AutoAssistant AI', desc: 'Get instant academic answers powered by an AI tuned to Uganda\'s curriculum.' },
  { icon: <GraduationCap size={22} />, title: 'Performance Reports', desc: 'View Uganda-standard grade reports: PLE divisions, NLSC competencies, UACE points.' },
];

export default function GuestPortal() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [feedback, setFeedback] = useState({ name: '', email: '', message: '' });
  const [feedbackStatus, setFeedbackStatus] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('alinda_theme') || 'dark');
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }, [theme]);

  useEffect(() => {
    fetch(`${API}/teachers`).then(r => r.json()).then(setTeachers).catch(() => { });
    fetch(`${API}/subjects`).then(r => r.json()).then(setSubjects).catch(() => { });
  }, []);

  const handleFeedback = async (e) => {
    e.preventDefault();
    setFeedbackStatus('sending');
    try {
      const res = await fetch(`${API}/guest/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback)
      });
      const data = await res.json();
      setFeedbackStatus(data.message || 'Sent successfully!');
      setFeedback({ name: '', email: '', message: '' });
    } catch {
      setFeedbackStatus('Failed to send. Please try again.');
    }
  };

  return (
    <div style={{ background: 'var(--bg-guest)', minHeight: '100vh', color: 'var(--text-main)' }}>
      {/* Navbar */}
      <nav className="guest-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo iconOnly size={36} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>Alinda Digital Learners</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--accent-amber)', fontWeight: 500, textTransform: 'uppercase' }}>Uganda E-School</div>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <div className="guest-nav-links-desktop">
          <a href="#levels">Levels</a>
          <a href="#teachers">Facilitators</a>
          <a href="#subjects">Subjects</a>
          <a href="#contact">Contact</a>
          <button
            onClick={() => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); localStorage.setItem('alinda_theme', t); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')}>
            Login / Register
          </button>
        </div>

        {/* Mobile Toggle Button */}
        <div className="guest-nav-mobile-toggle">
          <button
            onClick={() => setNavOpen(p => !p)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', padding: '4px' }}
            aria-label="Toggle Navigation Menu"
          >
            {navOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {navOpen && (
        <div className="guest-mobile-menu">
          <a href="#levels" onClick={() => setNavOpen(false)}>Academic Levels</a>
          <a href="#teachers" onClick={() => setNavOpen(false)}>Facilitators</a>
          <a href="#subjects" onClick={() => setNavOpen(false)}>Subjects & Curriculum</a>
          <a href="#contact" onClick={() => setNavOpen(false)}>Contact Us</a>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Appearance</span>
            <button
              onClick={() => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); localStorage.setItem('alinda_theme', t); }}
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => { setNavOpen(false); navigate('/auth'); }} style={{ width: '100%', marginTop: '4px', padding: '12px' }}>
            Login / Register <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Hero Section */}
      <section className="guest-hero-section">
        {/* Building background image directly behind text */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${schoolBuilding})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0
        }} />
        {/* Soft anti-glare gradient overlay for crystal clear text readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(15, 23, 42, 0.88) 60%, rgba(15, 23, 42, 0.96) 100%)',
          zIndex: 1
        }} />

        {/* Hero content sitting directly above the background image */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '850px', margin: '0 auto' }}>
          <div className="hero-badge" style={{ display: 'inline-block', marginBottom: '16px' }}>
            Uganda's Premier Digital Learning Platform
          </div>
          <h1 className="guest-hero-title">
            Learn Smarter<br />
            <span style={{ color: 'var(--primary)' }}>Grow Faster</span>
          </h1>
          <p className="guest-hero-desc">
            Alinda Digital Learners brings Primary, O-Level, and A-Level curricula online — with live lessons, AI academic research, and smart performance tracking.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/auth')}>
              Get Started Free <ArrowRight size={18} />
            </button>
            <a href="#levels" className="btn btn-secondary btn-lg">Explore Levels</a>
          </div>

          {/* Stats row */}
          <div className="guest-stats-grid">
            {[
              { label: 'School Levels', value: '3' },
              { label: 'Classes Supported', value: 'P1–S6' },
              { label: 'Live AI Research', value: '24/7' },
              { label: 'Curriculum', value: 'NCDC' },
            ].map(stat => (
              <div key={stat.label} className="guest-stat-card">
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {stat.value}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px', fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="guest-section">
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="hero-section">Platform Features</div>
          <h2 className="guest-section-heading">Everything You Need to Excel</h2>
        </div>
        <div className="grid-container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {FEATURES.map(f => (
            <div key={f.title} className="glass-card">
              <div style={{
                background: 'var(--primary-glow)', border: '1px solid rgba(99,102,241,0.3)',
                width: '44px', height: '44px', borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--primary)', marginBottom: '16px'
              }}>
                {f.icon}
              </div>
              <div className="card-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{f.title}</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.6' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Levels */}
      <section id="levels" className="guest-section" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="hero-section">Academic Levels</div>
          <h2 className="guest-section-heading">Uganda Curriculum Levels We Support</h2>
        </div>

        {/* Two-column layout */}
        <div className="guest-two-col">
          {/* Image column */}
          <div style={{ flex: '1 1 300px', minWidth: '0' }}>
            <div style={{
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 48px rgba(0,0,0,0.4)',
              border: '1.5px solid rgba(99,102,241,0.25)',
              position: 'relative'
            }}>
              <img
                src={studentsLearning}
                alt="Students engaged in digital learning"
                style={{
                  width: '100%',
                  height: '360px',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block'
                }}
              />
              {/* Caption overlay */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.82))',
                padding: '24px 16px 14px',
                color: '#fff', fontSize: '0.82rem', fontWeight: 500
              }}>
                📡 Students learning live online with Alinda Digital Learners
              </div>
            </div>
          </div>

          {/* Level cards column */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {LEVELS.map(l => (
              <div key={l.label} className="glass-card" style={{ borderLeft: `4px solid ${l.color}`, marginBottom: 0, padding: '18px 20px' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{l.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px', color: l.color }}>{l.label}</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.5', margin: 0 }}>{l.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects */}
      {subjects.length > 0 && (() => {
        const getSubjectLevel = (s) => {
          const lvl = s.level || '';
          const cls = s.className || '';
          if (lvl === 'Primary' || cls.startsWith('P') || cls === 'Primary') return 'Primary';
          if (lvl === 'A-Level' || ['S5', 'S6', 'A-Level'].includes(cls)) return 'A-Level';
          return 'O-Level';
        };

        const columns = [
          {
            id: 'primary',
            title: 'Primary Level',
            subtitle: 'P1 – P7 Curriculum',
            color: 'var(--accent-emerald)',
            badgeBg: 'rgba(16, 185, 129, 0.12)',
            border: 'rgba(16, 185, 129, 0.3)',
            icon: '🏫',
            items: subjects.filter(s => getSubjectLevel(s) === 'Primary')
          },
          {
            id: 'olevel',
            title: 'O-Level',
            subtitle: 'S1 – S4 (NLSC Competency)',
            color: 'var(--primary)',
            badgeBg: 'rgba(99, 102, 241, 0.12)',
            border: 'rgba(99, 102, 241, 0.3)',
            icon: '📗',
            items: subjects.filter(s => getSubjectLevel(s) === 'O-Level')
          },
          {
            id: 'alevel',
            title: "A' Level",
            subtitle: 'S5 – S6 Combinations',
            color: 'var(--accent-amber)',
            badgeBg: 'rgba(245, 158, 11, 0.12)',
            border: 'rgba(245, 158, 11, 0.3)',
            icon: '🎓',
            items: subjects.filter(s => getSubjectLevel(s) === 'A-Level')
          }
        ];

        return (
          <section id="subjects" className="guest-section">
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <div className="hero-section">Our Curriculum</div>
              <h2 className="guest-section-heading">Subjects We Teach</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '6px' }}>
                Categorized by Uganda National Curriculum Levels
              </p>
            </div>

            <div className="guest-subjects-grid">
              {columns.map(col => (
                <div key={col.id} className="glass-card" style={{
                  padding: '20px',
                  borderTop: `4px solid ${col.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  height: '100%'
                }}>
                  {/* Column Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.5rem' }}>{col.icon}</span>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: col.color, margin: 0 }}>{col.title}</h3>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{col.subtitle}</div>
                      </div>
                    </div>
                    <span style={{
                      background: col.badgeBg,
                      color: col.color,
                      border: `1px solid ${col.border}`,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      {col.items.length} {col.items.length === 1 ? 'Subject' : 'Subjects'}
                    </span>
                  </div>

                  {/* Subject Chips */}
                  {col.items.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '12px 0' }}>
                      No subjects added for this level yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {col.items.map(s => (
                        <div key={s.id} style={{
                          background: col.badgeBg,
                          border: `1px solid ${col.border}`,
                          color: 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>{s.name}</span>
                          {s.category && s.category !== 'Both' && (
                            <span style={{
                              fontSize: '0.7rem',
                              opacity: 0.8,
                              background: 'rgba(255,255,255,0.12)',
                              padding: '1px 5px',
                              borderRadius: '4px'
                            }}>
                              {s.category}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Teachers */}
      <section id="teachers" className="guest-section" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div className="hero-section">Our Team</div>
          <h2 className="guest-section-heading">Our Facilitators</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '540px', margin: '8px auto 0' }}>
            Qualified and experienced educators dedicated to your learning journey
          </p>
        </div>

        {/* Two-column layout */}
        <div className="guest-two-col">
          {/* Left: teacher cards or placeholder */}
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {teachers.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
                <Users size={40} style={{ marginBottom: '10px', opacity: 0.4 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Facilitator profiles coming soon. Register and login to connect with your teachers.</p>
              </div>
            ) : (
              teachers.map(t => (
                <div key={t.id} className="glass-card" style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: 0, padding: '16px 18px' }}>
                  <div className="avatar" style={{ width: '46px', height: '46px', fontSize: '1rem', flexShrink: 0 }}>
                    {t.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>{t.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{t.profile || 'Facilitator'}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: teacher illustration */}
          <div style={{ flex: '1 1 300px', minWidth: '0' }}>
            <div style={{
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 48px rgba(0,0,0,0.4)',
              border: '1.5px solid rgba(99,102,241,0.25)',
              position: 'relative'
            }}>
              <img
                src={teacherOnline}
                alt="Facilitator conducting an online lesson"
                style={{
                  width: '100%',
                  height: '360px',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  display: 'block'
                }}
              />
              {/* Caption overlay */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                padding: '24px 16px 14px',
                color: '#fff', fontSize: '0.82rem', fontWeight: 500
              }}>
                🎓 A facilitator conducting a live lesson on Alinda Digital Learners
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Feedback */}
      <section id="contact" className="guest-section">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div className="hero-section">Get in Touch</div>
            <h2 className="guest-section-heading">Contact Us</h2>
          </div>

          <div className="guest-contact-grid">
            {/* Contact info */}
            <div className="glass-card">
              <div className="card-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>Contact Information</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ background: 'var(--primary-glow)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', display: 'flex', flexShrink: 0 }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Phone / WhatsApp</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>+256 757 906 118</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ background: 'var(--primary-glow)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', display: 'flex', flexShrink: 0 }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Email</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>info@alindadigital.ug</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                  You can also use the <strong style={{ color: 'var(--accent-emerald)' }}>WhatsApp chatbot</strong> bubble at the bottom-right of this page for instant automated responses.
                </p>
              </div>
            </div>

            {/* Feedback Form */}
            <div className="glass-card">
              <div className="card-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>Send Us Feedback</div>
              <form onSubmit={handleFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Your Name</label>
                  <input className="input-field" placeholder="Full Name" value={feedback.name}
                    onChange={e => setFeedback(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email Address</label>
                  <input className="input-field" type="email" placeholder="email@example.com" value={feedback.email}
                    onChange={e => setFeedback(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Message / Enquiry</label>
                  <textarea className="textarea-field" placeholder="Type your message here..." value={feedback.message}
                    onChange={e => setFeedback(p => ({ ...p, message: e.target.value }))} required rows={3} />
                </div>
                {feedbackStatus && feedbackStatus !== 'sending' && (
                  <div style={{ padding: '10px', background: 'var(--primary-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', fontSize: '0.85rem' }}>
                    ✅ {feedbackStatus}
                  </div>
                )}
                <button className="btn btn-primary" type="submit" disabled={feedbackStatus === 'sending'} style={{ padding: '10px' }}>
                  {feedbackStatus === 'sending' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 16px', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', fontSize: '1.05rem' }}>Alinda Digital Learners</div>
        <p style={{ margin: 0 }}>Uganda's e-school platform for Primary, O-Level, and A-Level students · © 2026</p>
        <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => navigate('/auth')}>
          Register / Login <ArrowRight size={14} />
        </button>
      </footer>
    </div>
  );
}

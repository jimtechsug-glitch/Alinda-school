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
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(2, 129, 38, 0.8)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px', height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Logo iconOnly size={36} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Alinda Digital Learners</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--accent-amber)', fontWeight: 500, textTransform: 'uppercase' }}>Uganda E-School</div>
          </div>
        </div>

        {/* Desktop nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <a href="#levels" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Levels</a>
          <a href="#teachers" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Facilitators</a>
          <a href="#subjects" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Subjects</a>
          <a href="#contact" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Contact</a>
          <button onClick={() => { const t = theme === 'dark' ? 'light' : 'dark'; setTheme(t); localStorage.setItem('alinda_theme', t); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/auth')}>
            Login / Register
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{
        padding: '110px 32px 80px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid var(--border)'
      }}>
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
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.85) 60%, rgba(15, 23, 42, 0.95) 100%)',
          zIndex: 1
        }} />

        {/* Hero content sitting directly above the background image */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '850px', margin: '0 auto' }}>
          <div className="hero-badge" style={{ display: 'inline-block', marginBottom: '20px' }}>
            Uganda's Premier Digital Learning Platform
          </div>
          <h1 className="hero-title" style={{ maxWidth: '750px', margin: '0 auto 24px', fontSize: '4rem', lineHeight: 1.2 }}>
            Learn Smarter<br />
            <span style={{ color: 'var(--primary)' }}>Grow Faster</span>
          </h1>
          <p className="hero-desc" style={{ color: 'var(--text-muted)', maxWidth: '620px', margin: '0 auto 40px', fontSize: '2rem', lineHeight: 1.6 }}>
            Alinda Digital Learners brings Primary, O-Level, and A-Level curricula online — with live lessons, AI academic research, and smart performance tracking.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '60px' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/auth')}>
              Get Started Free <ArrowRight size={18} />
            </button>
            <a href="#levels" className="btn btn-secondary btn-lg">Explore Levels</a>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap',
            paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            {[
              { label: 'School Levels', value: '3' },
              { label: 'Classes Supported', value: 'P1–S6' },
              { label: 'Live AI Research', value: '24/7' },
              { label: 'Curriculum', value: 'NCDC' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {stat.value}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '4px', fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '64px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="hero-section">Platform Features</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '16px' }}>Everything You Need to Excel</h2>
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
              <div className="card-title">{f.title}</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.4rem', lineHeight: '1.6' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Levels */}
      <section id="levels" style={{ padding: '64px 32px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="hero-section">Academic Levels</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '16px' }}>Uganda Curriculum Levels We Support</h2>
        </div>

        {/* Two-column: image left, cards right */}
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          display: 'flex', gap: '48px', alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Image column */}
          <div style={{ flex: '1 1 340px', minWidth: '280px' }}>
            <div style={{
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
              border: '2px solid rgba(99,102,241,0.25)',
              position: 'relative'
            }}>
              <img
                src={studentsLearning}
                alt="Students engaged in digital learning"
                style={{
                  width: '100%',
                  height: '420px',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block'
                }}
              />
              {/* Caption overlay */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                padding: '28px 20px 16px',
                color: '#fff', fontSize: '0.88rem', fontWeight: 500
              }}>
                📡 Students learning live online with Alinda Digital Learners
              </div>
            </div>
          </div>

          {/* Level cards column */}
          <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {LEVELS.map(l => (
              <div key={l.label} className="glass-card" style={{ borderLeft: `4px solid ${l.color}`, marginBottom: 0 }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{l.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '6px', color: l.color }}>{l.label}</div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', lineHeight: '1.6', margin: 0 }}>{l.desc}</p>
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
          <section id="subjects" style={{ padding: '64px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div className="hero-section">Our Curriculum</div>
              <h2 style={{ fontSize: '2.3rem', fontWeight: 700, marginTop: '16px' }}>Subjects We Teach</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.5rem', marginTop: '8px' }}>
                Categorized by Uganda National Curriculum Levels
              </p>
            </div>

            <div style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
              alignItems: 'start'
            }}>
              {columns.map(col => (
                <div key={col.id} className="glass-card" style={{
                  padding: '24px',
                  borderTop: `4px solid ${col.color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  height: '100%'
                }}>
                  {/* Column Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.9rem' }}>{col.icon}</span>
                      <div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: col.color, margin: 0 }}>{col.title}</h3>
                        <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>{col.subtitle}</div>
                      </div>
                    </div>
                    <span style={{
                      background: col.badgeBg,
                      color: col.color,
                      border: `1px solid ${col.border}`,
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
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
                          padding: '8px 14px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>{s.name}</span>
                          {s.category && s.category !== 'Both' && (
                            <span style={{
                              fontSize: '1.2rem',
                              opacity: 0.75,
                              background: 'rgba(255,255,255,0.1)',
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
      <section id="teachers" style={{ padding: '64px 32px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="hero-section">Our Team</div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginTop: '16px' }}>Our Facilitators</h2>
          <p style={{ fontSize: '1.8rem', color: 'var(--text-added)', marginTop: '12px', maxWidth: '600px', margin: '12px auto 0' }}>
            Qualified and experienced educators dedicated to your learning journey
          </p>
        </div>

        {/* Two-column: teacher cards left, image right */}
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          display: 'flex', gap: '48px', alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Left: teacher cards or placeholder */}
          <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {teachers.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <Users size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p style={{ color: 'var(--text-muted)' }}>Facilitator profiles coming soon. Register and login to connect with your teachers.</p>
              </div>
            ) : (
              teachers.map(t => (
                <div key={t.id} className="glass-card" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: 0 }}>
                  <div className="avatar" style={{ width: '52px', height: '52px', fontSize: '1.5rem', flexShrink: 0 }}>
                    {t.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>{t.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>{t.profile || 'Facilitator'}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: teacher illustration */}
          <div style={{ flex: '1 1 340px', minWidth: '280px' }}>
            <div style={{
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
              border: '2px solid rgba(99,102,241,0.25)',
              position: 'relative'
            }}>
              <img
                src={teacherOnline}
                alt="Facilitator conducting an online lesson"
                style={{
                  width: '100%',
                  height: '420px',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  display: 'block'
                }}
              />
              {/* Caption overlay */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.78))',
                padding: '28px 20px 16px',
                color: '#fff', fontSize: '0.85rem', fontWeight: 500
              }}>
                🎓 A facilitator conducting a live lesson on Alinda Digital Learners
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact & Feedback */}
      <section id="contact" style={{ padding: '64px 32px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div className="hero-section">Get in Touch</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '16px' }}>Contact Us</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Contact info */}
            <div className="glass-card">
              <div className="card-title">Contact Information</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ background: 'var(--primary-glow)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Phone / WhatsApp</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>+256 757 906 118</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ background: 'var(--primary-glow)', padding: '10px', borderRadius: 'var(--radius-sm)', color: 'var(--primary)' }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Email</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>info@alindadigital.ug</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6' }}>
                  You can also use the <strong style={{ color: 'var(--accent-emerald)' }}>WhatsApp chatbot</strong> bubble at the bottom-right of this page for instant automated responses.
                </p>
              </div>
            </div>

            {/* Feedback Form */}
            <div className="glass-card">
              <div className="card-title">Send Us Feedback</div>
              <form onSubmit={handleFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    onChange={e => setFeedback(p => ({ ...p, message: e.target.value }))} required rows={4} />
                </div>
                {feedbackStatus && feedbackStatus !== 'sending' && (
                  <div style={{ padding: '10px', background: 'var(--primary-glow)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', fontSize: '1.1rem' }}>
                    ✅ {feedbackStatus}
                  </div>
                )}
                <button className="btn btn-primary" type="submit" disabled={feedbackStatus === 'sending'}>
                  {feedbackStatus === 'sending' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
        <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>Alinda Digital Learners</div>
        <p>Uganda's e-school platform for Primary, O-Level, and A-Level students · © 2026</p>
        <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={() => navigate('/auth')}>
          Register / Login <ArrowRight size={14} />
        </button>
      </footer>
    </div>
  );
}

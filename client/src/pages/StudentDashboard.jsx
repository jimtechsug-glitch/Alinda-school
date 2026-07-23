import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, BookOpen, FileText, ClipboardList,
  Video, BarChart2, Users, Bot, Send, ExternalLink,
  User, Camera, Save
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import AIAssistant from '../components/AIAssistant';
import FileViewer from '../components/FileViewer';
import { useAuth, API } from '../App';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'profile', label: 'My Profile', icon: <User size={18} /> },
  { id: 'notes', label: 'Notes & Resources', icon: <FileText size={18} /> },
  { id: 'activities', label: 'Activities', icon: <ClipboardList size={18} /> },
  { id: 'lessons', label: 'Live Lessons', icon: <Video size={18} /> },
  { id: 'report', label: 'Performance Report', icon: <BarChart2 size={18} /> },
  { id: 'teachers', label: 'Our Facilitators', icon: <Users size={18} /> },
  { id: 'ai', label: 'AutoAssistant AI', icon: <Bot size={18} /> },
];

const GRADE_COLORS = {
  'D1': '#10b981', 'D2': '#10b981', 'C3': '#6366f1', 'C4': '#6366f1',
  'C5': '#f59e0b', 'C6': '#f59e0b', 'P7': '#f59e0b', 'P8': '#f43f5e', 'F9': '#f43f5e',
  'A': '#10b981', 'B': '#10b981', 'C': '#6366f1', 'D': '#f59e0b', 'E': '#f59e0b',
  'O': '#f59e0b', 'F': '#f43f5e',
  '3 (Advanced)': '#10b981', '2 (Achieving)': '#6366f1', '1 (Basic)': '#f59e0b', 'U (Unachieved)': '#f43f5e',
};

// Material card (used in the 3-column grid)
function MaterialCard({ m, subjects, onView }) {
  const sub = subjects.find(s => s.id == m.subjectId);
  const ext = (m.fileType || '').toLowerCase();
  const isVideo = ['mp4','mkv','webm','avi','mov'].includes(ext);
  const isImage = ['jpg','jpeg','png','gif','webp','svg'].includes(ext);
  const isPdf   = ext === 'pdf';
  const isWord  = ['doc','docx'].includes(ext);
  const isExcel = ['xls','xlsx'].includes(ext);
  const isPpt   = ['ppt','pptx'].includes(ext);

  const fileIcon = isVideo ? '🎬' : isImage ? '🖼️' : isPdf ? '📄' : isWord ? '📝' : isExcel ? '📊' : isPpt ? '📑' : '📁';
  const accentColor = isPdf ? '#ef4444' : isVideo ? '#6366f1' : isImage ? '#10b981' : isWord ? '#3b82f6' : isExcel ? '#22c55e' : 'var(--primary)';
  const typeLabel = isPdf ? 'PDF' : isVideo ? 'Video' : isImage ? 'Image' : isWord ? 'Word Doc' : isExcel ? 'Spreadsheet' : isPpt ? 'Slides' : m.type || 'Resource';

  return (
    <div className="note-card">
      <div className="note-card-stripe" style={{ background: accentColor }}/>
      <div className="note-card-top">
        <div className="note-card-icon" style={{ background: `${accentColor}20` }}>
          {m.fileData ? fileIcon : <FileText size={17} style={{ color: accentColor }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="note-card-title">{m.title}</div>
        </div>
      </div>
      <div className="note-card-badges">
        <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{typeLabel}</span>
        {m.classLevel && <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{m.classLevel}</span>}
      </div>
      {m.fileData && isImage && (
        <img src={m.fileData} alt={m.title} className="note-card-preview" />
      )}
      <div className="note-card-action">
        {m.fileData ? (
          <button className="btn btn-primary btn-sm" style={{ width: '100%', fontSize: '0.75rem' }}
            onClick={() => onView({ fileData: m.fileData, fileType: m.fileType, fileName: m.fileName, title: m.title })}>
            👁 View {typeLabel}
          </button>
        ) : m.contentUrl ? (
          <a href={m.contentUrl} target="_blank" rel="noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', textAlign: 'center', textDecoration: 'none', fontSize: '0.75rem', display: 'block' }}>
            <ExternalLink size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Open Link
          </a>
        ) : (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '6px 0' }}>
            Available in class
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { token, user, login } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [msg, setMsg] = useState('');
  const [viewFile, setViewFile] = useState(null);
  const photoInputRef = useRef(null);

  const [subjects, setSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [activities, setActivities] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [report, setReport] = useState(null);

  // Profile form
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '', photoData: user?.photoData || '' });
  const [profileLoading, setProfileLoading] = useState(false);

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const fetchAll = async () => {
    const [subs, mats, acts, subms, les, tch, rep] = await Promise.all([
      fetch(`${API}/subjects`).then(r => r.json()).catch(() => []),
      fetch(`${API}/materials`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/activities`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/submissions`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/lessons`).then(r => r.json()).catch(() => []),
      fetch(`${API}/teachers`).then(r => r.json()).catch(() => []),
      fetch(`${API}/performance/report/${user?.id}`, { headers: authHeaders }).then(r => r.json()).catch(() => null),
    ]);
    setSubjects(Array.isArray(subs) ? subs : []);
    setMaterials(Array.isArray(mats) ? mats : []);
    setActivities(Array.isArray(acts) ? acts : []);
    setMySubmissions(Array.isArray(subms) ? subms : []);
    setLessons(Array.isArray(les) ? les.filter(l => l.level === user?.level) : []);
    setTeachers(Array.isArray(tch) ? tch : []);
    setReport(rep && rep.subjects ? rep : null);
  };

  useEffect(() => { fetchAll(); }, [tab]);
  useEffect(() => {
    setProfileForm({ name: user?.name || '', phone: user?.phone || '', photoData: user?.photoData || '' });
  }, [user]);

  const renderSubjectsText = (jsonStr) => {
    if (!jsonStr) return 'None';
    try {
      const ids = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      if (!Array.isArray(ids)) return 'None';
      return ids.map(id => {
        const s = subjects.find(sub => sub.id == id);
        return s ? `${s.name} (${s.code || '—'})` : `Subject ${id}`;
      }).join(', ');
    } catch {
      return 'None';
    }
  };

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  // Profile photo handler
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileForm(p => ({ ...p, photoData: reader.result }));
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({ name: profileForm.name, phone: profileForm.phone, photoData: profileForm.photoData })
      });
      const d = await res.json();
      if (res.ok && d.user) {
        // Update local auth context so avatar updates everywhere
        login({ ...user, ...d.user }, token);
      }
      showMsg(d.message || 'Profile updated!');
    } catch { showMsg('Could not save profile.'); }
    setProfileLoading(false);
  };

  // Activity submission
  const [submitting, setSubmitting] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [submissionFile, setSubmissionFile] = useState({ fileName: '', fileType: '', fileData: '' });
  const [previewing, setPreviewing] = useState(false);

  const handleSubmissionFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload only PDF files.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setSubmissionFile({
        fileName: file.name,
        fileType: 'pdf',
        fileData: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const submitActivity = async (actId) => {
    if (!answerText.trim() && !submissionFile.fileData) {
      showMsg('Please write an answer or upload a PDF document before submitting.');
      return;
    }
    const res = await fetch(`${API}/submissions`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({
        activityId: actId,
        studentAnswer: answerText,
        fileName: submissionFile.fileName || null,
        fileType: submissionFile.fileType || null,
        fileData: submissionFile.fileData || null
      })
    });
    const d = await res.json();
    showMsg(d.message || 'Submitted!');
    setSubmitting(null);
    setAnswerText('');
    setSubmissionFile({ fileName: '', fileType: '', fileData: '' });
    setPreviewing(false);
    fetchAll();
  };

  const hasSubmitted = (actId) => mySubmissions.some(s => s.activityId == actId);
  const getSubmission = (actId) => mySubmissions.find(s => s.activityId == actId);

  const renderAttemptForm = (a) => {
    const isOpen = submitting === a.id;
    if (!isOpen) {
      return (
        <button
          className="btn btn-primary btn-sm"
          style={{ width: '100%' }}
          onClick={() => {
            setSubmitting(a.id);
            setAnswerText('');
            setSubmissionFile({ fileName: '', fileType: '', fileData: '' });
            setPreviewing(false);
          }}
        >
          Attempt Activity
        </button>
      );
    }

    if (previewing) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary)' }}>🔍 Preview Your Submission</div>
          
          <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Text Answer:</span>
            <div style={{ 
              background: 'rgba(0,0,0,0.2)', 
              padding: '8px', 
              borderRadius: '6px', 
              maxHeight: '120px', 
              overflowY: 'auto', 
              whiteSpace: 'pre-wrap', 
              border: '1px solid rgba(255,255,255,0.05)',
              color: 'var(--text-main)'
            }}>
              {answerText.trim() ? answerText : <em style={{ color: 'var(--text-muted)' }}>(No text answer typed)</em>}
            </div>
          </div>

          {submissionFile.fileName && (
            <div style={{ fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>PDF File:</span>
              <div style={{ color: 'var(--accent-emerald)', fontWeight: 600, marginTop: '2px' }}>
                📄 {submissionFile.fileName}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => submitActivity(a.id)}>
              🚀 Confirm & Submit
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setPreviewing(false)}>
              ✏️ Edit
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* ── Text Response Section ── */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>✍️ Type your answer <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(optional if uploading PDF)</span></span>
            <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>{answerText.length} chars</span>
          </label>
          <textarea
            className="textarea-field"
            rows={5}
            placeholder="Type your response here... (you may also attach a PDF below instead, or do both)"
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
          />
        </div>

        {/* ── OR Divider ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '2px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>AND / OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* ── PDF Upload Section ── */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>
            📄 Attach PDF document <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(optional if typing answer)</span>
          </label>
          {!submissionFile.fileName ? (
            <input
              type="file"
              accept=".pdf"
              className="input-field"
              onChange={handleSubmissionFileChange}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(52,211,153,0.08)', borderRadius: '6px', border: '1px solid rgba(52,211,153,0.25)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', flex: 1 }}>
                📄 <strong>{submissionFile.fileName}</strong>
              </span>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px' }}
                onClick={() => setSubmissionFile({ fileName: '', fileType: '', fileData: '' })}
              >
                ✕ Remove
              </button>
            </div>
          )}
        </div>

        {/* ── Hint ── */}
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border)' }}>
          💡 You can submit a typed answer, a PDF file, or <strong>both</strong> — at least one is required.
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            onClick={() => {
              if (!answerText.trim() && !submissionFile.fileData) {
                showMsg('Please write a text answer or upload a PDF first.');
                return;
              }
              setPreviewing(true);
            }}
          >
            👁️ Preview Answer
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSubmitting(null);
              setAnswerText('');
              setSubmissionFile({ fileName: '', fileType: '', fileData: '' });
              setPreviewing(false);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  const upcomingLessons = lessons.filter(l => new Date(l.scheduleTime) > new Date());
  const pastLessons = lessons.filter(l => new Date(l.scheduleTime) <= new Date());

  // Group materials by subjectId
  const materialsBySubject = subjects
    .map(sub => ({ sub, items: materials.filter(m => m.subjectId == sub.id) }))
    .filter(g => g.items.length > 0);
  const ungroupedMaterials = materials.filter(m => !subjects.find(s => s.id == m.subjectId));

  // Group activities by subjectId
  const activitiesBySubject = subjects
    .map(sub => ({ sub, items: activities.filter(a => a.subjectId == sub.id) }))
    .filter(g => g.items.length > 0);
  const ungroupedActivities = activities.filter(a => !subjects.find(s => s.id == a.subjectId));

  const tabTitles = {
    dashboard: `Welcome, ${user?.name?.split(' ')[0]}!${['S5', 'S6'].includes(user?.level) ? ` (${user?.level} - Combination: ${user?.combination || 'Not Configured'})` : ''}`,
    profile: 'My Profile',
    notes: 'Notes & Resources',
    activities: 'Activities & Assessments',
    lessons: 'Live Lessons',
    report: 'My Performance Report',
    teachers: 'Our Facilitators',
    ai: 'AutoAssistant AI'
  };

  // Subject section header
  const SubjectSection = ({ label, children, color = 'var(--primary)', icon = '📚' }) => (
    <div style={{ marginBottom: '36px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
        padding: '10px 16px', background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px', border: '1px solid var(--border)',
        borderLeft: `4px solid ${color}`
      }}>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: '1rem', color }}>{label}</span>
      </div>
      {children}
    </div>
  );

  return (
    <>
      <DashboardLayout title={tabTitles[tab]} navItems={NAV} activeTab={tab} onTabChange={(t) => {
        setTab(t);
      }}>
        {msg && (
          <div style={{ padding: '12px 18px', background: 'var(--primary-glow)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.4)', marginBottom: '20px', color: 'var(--primary)', fontWeight: 500 }}>
            ✅ {msg}
          </div>
        )}

        {/* ─── DASHBOARD ─── */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{
              padding: '28px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(16,185,129,0.1))',
              borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginBottom: '8px',
              display: 'flex', alignItems: 'center', gap: '20px'
            }}>
              {/* Profile photo on dashboard hero */}
              {user?.photoData ? (
                <img src={user.photoData} alt={user.name} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent-emerald))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              )}
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>🎓 {user?.level} Student</span>
                  {['S5', 'S6'].includes(user?.level) && (
                    <span className="badge badge-success" style={{ fontSize: '0.72rem', background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)', border: '1px solid rgba(16,185,129,0.3)' }}>
                      Combination: {user?.combination || 'Not Configured'}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '6px' }}>
                  Hello, {user?.name?.split(' ')[0]}! 👋
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Keep learning, keep growing. Uganda's future is in your hands!
                </p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }} onClick={() => setAiOpen(true)}>
                  <Bot size={14} /> Open AutoAssistant AI
                </button>
              </div>
            </div>

            <div className="grid-container">
              {[
                { label: 'Available Notes', value: materials.length, color: 'var(--accent-emerald)' },
                { label: 'Activities to Attempt', value: activities.filter(a => !hasSubmitted(a.id)).length, color: 'var(--accent-amber)' },
                { label: 'Submitted Activities', value: mySubmissions.length, color: 'var(--primary)' },
                { label: 'Upcoming Lessons', value: upcomingLessons.length, color: 'var(--accent-rose)' },
              ].map(m => (
                <div key={m.label} className="glass-card" style={{ borderLeft: `4px solid ${m.color}` }}>
                  <div className="metric-value">{m.value}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {upcomingLessons.length > 0 && (
              <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
                <div className="card-title" style={{ color: 'var(--accent-emerald)' }}>
                  📅 Upcoming Live Lessons
                </div>
                {upcomingLessons.slice(0, 3).map(l => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{l.title}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px' }}>
                        🕐 {new Date(l.scheduleTime).toLocaleString()}
                      </div>
                    </div>
                    <a href={l.meetUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                      <ExternalLink size={13} /> Join
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── PROFILE ─── */}
        {tab === 'profile' && (
          <div style={{ maxWidth: '540px', margin: '0 auto' }}>
            <div className="glass-card">
              <div className="card-title"><User size={16} /> My Profile</div>

              {/* Profile Photo Upload */}
              <div className="profile-upload-container">
                {profileForm.photoData ? (
                  <img src={profileForm.photoData} alt="Profile" className="profile-preview-avatar" />
                ) : (
                  <div style={{
                    width: '90px', height: '90px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent-emerald), var(--primary))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', fontWeight: 700, color: 'white', flexShrink: 0
                  }}>
                    {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '6px' }}>Profile Photo</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '10px' }}>
                    Upload a clear photo of yourself. JPG or PNG up to 5MB.
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Camera size={14} /> {profileForm.photoData ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoChange}
                  />
                </div>
              </div>

              <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name</label>
                  <input className="input-field" value={profileForm.name}
                    onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone Number</label>
                  <input className="input-field" value={profileForm.phone}
                    onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Class Level</label>
                  <input className="input-field" value={user?.level || ''} disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
                {['S5', 'S6'].includes(user?.level) && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">A-Level Combination</label>
                      <input className="input-field" value={user?.combination || 'Not Configured'} disabled
                        style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                    </div>
                    <div style={{ marginTop: '6px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px', color: 'var(--primary)' }}>Combination Subjects</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><strong>Principals:</strong> {renderSubjectsText(user?.principalSubjects)}</div>
                        <div><strong>Subsidiaries:</strong> {renderSubjectsText(user?.subsidiarySubjects)}</div>
                      </div>
                    </div>
                  </>
                )}
                <button className="btn btn-primary" type="submit" disabled={profileLoading}>
                  <Save size={15} /> {profileLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ─── NOTES ─── */}
        {tab === 'notes' && (
          <div>
            {materials.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <FileText size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>No notes or resources are available for your class yet. Check back later!</p>
              </div>
            ) : (
              <>
                {/* Grouped by subject */}
                {materialsBySubject.map(({ sub, items }) => (
                  <SubjectSection key={sub.id} label={sub.name} icon="📖"
                    color={sub.level === 'A-Level' ? 'var(--accent-rose)' : sub.level === 'O-Level' ? 'var(--accent-amber)' : 'var(--accent-emerald)'}>
                    <div className="four-column-grid">
                      {items.map(m => (
                        <MaterialCard key={m.id} m={m} subjects={subjects} onView={setViewFile} />
                      ))}
                    </div>
                  </SubjectSection>
                ))}
                {/* Ungrouped (no matching subject) */}
                {ungroupedMaterials.length > 0 && (
                  <SubjectSection label="General Study Resources" icon="📁" color="var(--primary)">
                    <div className="four-column-grid">
                      {ungroupedMaterials.map(m => (
                        <MaterialCard key={m.id} m={m} subjects={subjects} onView={setViewFile} />
                      ))}
                    </div>
                  </SubjectSection>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── ACTIVITIES ─── */}
        {tab === 'activities' && (
          <div>
            {activities.length === 0 && (
              <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <ClipboardList size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>No activities created yet. Check back soon!</p>
              </div>
            )}

            {/* Grouped by subject */}
            {activitiesBySubject.map(({ sub, items }) => (
              <SubjectSection key={sub.id} label={sub.name} icon="✏️"
                color={sub.level === 'A-Level' ? 'var(--accent-rose)' : sub.level === 'O-Level' ? 'var(--accent-amber)' : 'var(--accent-emerald)'}>
                <div className="three-column-grid">
                  {items.map(a => {
                    const submitted = hasSubmitted(a.id);
                    const mySub = getSubmission(a.id);
                    return (
                      <div key={a.id} className="glass-card"
                        style={{ borderTop: `3px solid ${submitted ? 'var(--accent-emerald)' : 'var(--primary)'}`, display: 'flex', flexDirection: 'column', gap: '10px', padding: '18px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', lineHeight: '1.35', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {a.title}
                        </div>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>{a.levelType}</span>
                          <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>Max: {a.maxScore}</span>
                          {submitted && <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>✅ Submitted</span>}
                        </div>
                        <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.6', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                          {a.instructions}
                        </div>

                        {a.fileData && (
                          <button
                            onClick={() => setViewFile({ fileData: a.fileData, fileType: a.fileType, fileName: a.fileName, title: a.title })}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '7px', color: 'var(--accent-emerald)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                            👁 View Assignment File
                          </button>
                        )}

                        {/* Submission details & marking */}
                        {submitted && mySub && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Your Submission:</div>
                              <div style={{ 
                                whiteSpace: 'pre-wrap', 
                                maxHeight: '100px', 
                                overflowY: 'auto', 
                                background: 'rgba(0,0,0,0.1)', 
                                padding: '6px', 
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                border: '1px solid rgba(255,255,255,0.03)'
                              }}>
                                {mySub.studentAnswer || '(Uploaded PDF only)'}
                              </div>
                              {mySub.fileData && (
                                <button
                                  onClick={() => setViewFile({ fileData: mySub.fileData, fileType: mySub.fileType, fileName: mySub.fileName, title: `Your PDF Attempt` })}
                                  className="btn btn-secondary btn-sm"
                                  style={{ marginTop: '8px', display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                >
                                  👁 View Submitted PDF
                                </button>
                              )}
                            </div>

                            {mySub.isMarked ? (
                              <div style={{ padding: '10px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.82rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
                                  ✅ Graded: {mySub.score}/{a.maxScore}
                                </div>
                                {mySub.feedback && <div style={{ color: 'var(--text-muted)' }}>Feedback: {mySub.feedback}</div>}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', padding: '4px 0' }}>⏳ Awaiting marking…</div>
                            )}
                          </div>
                        )}

                        {/* Submission form */}
                        {!submitted && (
                          <div style={{ marginTop: 'auto' }}>
                            {renderAttemptForm(a)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SubjectSection>
            ))}

            {/* Ungrouped activities */}
            {ungroupedActivities.length > 0 && (
              <SubjectSection label="General Activities" icon="📋" color="var(--primary)">
                <div className="three-column-grid">
                  {ungroupedActivities.map(a => {
                    const submitted = hasSubmitted(a.id);
                    const mySub = getSubmission(a.id);
                    return (
                      <div key={a.id} className="glass-card"
                        style={{ borderTop: `3px solid ${submitted ? 'var(--accent-emerald)' : 'var(--primary)'}`, display: 'flex', flexDirection: 'column', gap: '10px', padding: '18px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{a.title}</div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.6', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                          {a.instructions}
                        </div>

                        {/* Submission details & marking */}
                        {submitted && mySub && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
                            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Your Submission:</div>
                              <div style={{ 
                                whiteSpace: 'pre-wrap', 
                                maxHeight: '100px', 
                                overflowY: 'auto', 
                                background: 'rgba(0,0,0,0.1)', 
                                padding: '6px', 
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                border: '1px solid rgba(255,255,255,0.03)'
                              }}>
                                {mySub.studentAnswer || '(Uploaded PDF only)'}
                              </div>
                              {mySub.fileData && (
                                <button
                                  onClick={() => setViewFile({ fileData: mySub.fileData, fileType: mySub.fileType, fileName: mySub.fileName, title: `Your PDF Attempt` })}
                                  className="btn btn-secondary btn-sm"
                                  style={{ marginTop: '8px', display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                >
                                  👁 View Submitted PDF
                                </button>
                              )}
                            </div>

                            {mySub.isMarked ? (
                              <div style={{ padding: '10px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', fontSize: '0.82rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
                                  ✅ Graded: {mySub.score}/{a.maxScore}
                                </div>
                                {mySub.feedback && <div style={{ color: 'var(--text-muted)' }}>Feedback: {mySub.feedback}</div>}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', padding: '4px 0' }}>⏳ Awaiting marking…</div>
                            )}
                          </div>
                        )}

                        {!submitted && (
                          <div style={{ marginTop: 'auto' }}>
                            {renderAttemptForm(a)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SubjectSection>
            )}
          </div>
        )}

        {/* ─── LESSONS ─── */}
        {tab === 'lessons' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-emerald)' }}>📅</span> Upcoming Lessons
              </h3>
              {upcomingLessons.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No upcoming lessons for {user?.level} yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {upcomingLessons.map(l => {
                    const sub = subjects.find(s => s.id == l.subjectId);
                    return (
                      <div key={l.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{l.title}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {sub?.name || '—'} · 📆 {new Date(l.scheduleTime).toLocaleString()}
                          </div>
                        </div>
                        <a href={l.meetUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                          <ExternalLink size={13} /> Join Live Lesson
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {pastLessons.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>🕐</span> Past Lessons
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pastLessons.map(l => {
                    const sub = subjects.find(s => s.id == l.subjectId);
                    return (
                      <div key={l.id} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', opacity: 0.7 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{l.title}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{sub?.name} · {new Date(l.scheduleTime).toLocaleString()}</div>
                        </div>
                        <a href={l.meetUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                          Recording / Replay
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── PERFORMANCE REPORT ─── */}
        {tab === 'report' && (
          <div>
            {!report ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <BarChart2 size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>No marked activities yet. Complete and submit activities to see your performance report.</p>
              </div>
            ) : (
              <div>
                <div className="report-header">
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{report.studentName}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Class: {report.level}</div>
                  </div>
                  <div className="report-summary-badge">{report.summaryDescriptor}</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {report.subjects.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No graded subjects yet.</div>
                  )}
                  {report.subjects.map((s, i) => {
                    const gradeColor = GRADE_COLORS[s.grade] || 'var(--primary)';
                    const pct = s.level === 'O-Level' ? (s.averageScore / 3) * 100 : s.level === 'A-Level' ? (s.averageScore / 100) * 100 : s.averageScore;
                    return (
                      <div key={i} className="report-grade-card">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, marginBottom: '4px' }}>{s.subjectName}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '10px' }}>
                            {s.className} · {s.activitiesCount} {s.activitiesCount === 1 ? 'activity' : 'activities'}
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: gradeColor, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                            Average: {s.level === 'O-Level' ? `${s.averageScore}/3` : `${s.averageScore}%`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'center', padding: '16px', marginLeft: '20px', minWidth: '100px' }}>
                          <div className="report-grade-val" style={{ color: gradeColor }}>{s.grade}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{s.descriptor}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="glass-card" style={{ marginTop: '24px' }}>
                  <div className="card-title">Uganda Grading Scale Reference</div>
                  {user?.level?.startsWith('P') ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '2' }}>
                      <strong style={{ color: 'var(--text-main)' }}>Primary (PLE):</strong> D1 (≥90%), D2 (≥80%), C3 (≥70%), C4 (≥60%), C5 (≥55%), C6 (≥50%), P7 (≥45%), P8 (≥40%), F9 (&lt;40%)
                    </div>
                  ) : ['S1','S2','S3','S4'].includes(user?.level) ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '2' }}>
                      <strong style={{ color: 'var(--text-main)' }}>O-Level NLSC (UCE):</strong> 3 = Advanced/Outstanding · 2 = Achieving/Intermediate · 1 = Basic/Beginning · U = Unachieved
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '2' }}>
                      <strong style={{ color: 'var(--text-main)' }}>A-Level (UACE):</strong> A (≥80%) · B (≥70%) · C (≥60%) · D (≥50%) · E (≥40%) · O (≥35% subsidiary) · F (&lt;35%)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TEACHERS ─── */}
        {tab === 'teachers' && (
          <div>
            {teachers.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Users size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>No facilitator profiles available yet.</p>
              </div>
            ) : (
              <div className="three-column-grid">
                {teachers.map(t => (
                  <div key={t.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '12px', padding: '28px 20px' }}>
                    {/* Teacher avatar with photo support */}
                    {t.photoData ? (
                      <img src={t.photoData} alt={t.name} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-amber)' }} />
                    ) : (
                      <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-amber), var(--accent-rose))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700, color: 'white' }}>
                        {t.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>{t.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
                        {t.profile || 'Facilitator'}
                      </div>
                      {t.phone && (
                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--accent-emerald)', fontWeight: 500 }}>
                          📞 {t.phone}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── AUTOASSISTANT AI ─── */}
        {tab === 'ai' && (
          <AIAssistant />
        )}

      </DashboardLayout>

      {viewFile && <FileViewer file={viewFile} onClose={() => setViewFile(null)} />}
    </>
  );
}

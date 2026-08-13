import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, BookOpen, FileText, ClipboardList,
  Video, User, Plus, CheckSquare, Edit3, Camera, Save, ExternalLink, X
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import FileViewer from '../components/FileViewer';
import { useAuth, API } from '../App';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'profile', label: 'My Profile', icon: <User size={18} /> },
  { id: 'materials', label: 'My Notes', icon: <FileText size={18} /> },
  { id: 'activities', label: 'My Activities', icon: <ClipboardList size={18} /> },
  { id: 'mark', label: 'Mark Submissions', icon: <CheckSquare size={18} /> },
  { id: 'lessons', label: 'Live Lessons', icon: <Video size={18} /> },
];

const CLASSES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];


export default function TeacherDashboard() {
  const { token, user, login } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [msg, setMsg] = useState('');
  const photoInputRef = useRef(null);

  const [subjects, setSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [activities, setActivities] = useState([]);
  const [allActivities, setAllActivities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [viewFile, setViewFile] = useState(null);

  // Marking filters state
  const [markFilterShow, setMarkFilterShow] = useState('unmarked'); // 'unmarked', 'marked', 'all'
  const [markFilterCreator, setMarkFilterCreator] = useState('all'); // 'all', 'mine'

  // Form visibility toggles
  const [showMatForm, setShowMatForm] = useState(false);
  const [showActForm, setShowActForm] = useState(false);
  const [showLesForm, setShowLesForm] = useState(false);

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const fetchAll = async () => {
    const [subs, mats, acts, subms, les] = await Promise.all([
      fetch(`${API}/subjects`).then(r => r.json()).catch(() => []),
      fetch(`${API}/materials`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/activities`).then(r => r.json()).catch(() => []),
      fetch(`${API}/submissions`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/lessons`).then(r => r.json()).catch(() => []),
    ]);
    setSubjects(Array.isArray(subs) ? subs : []);
    setMaterials(Array.isArray(mats) ? mats : []);
    setActivities(Array.isArray(acts) ? acts.filter(a => a.teacherId == user?.id) : []);
    setAllActivities(Array.isArray(acts) ? acts : []);
    setSubmissions(Array.isArray(subms) ? subms : []);
    setLessons(Array.isArray(les) ? les : []);
  };

  useEffect(() => { fetchAll(); }, [tab]);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  // Profile (with photo)
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '', profile: user?.profile || '', photoData: user?.photoData || '' });
  const [profileLoading, setProfileLoading] = useState(false);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileForm(p => ({ ...p, photoData: reader.result }));
    reader.readAsDataURL(file);
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    const res = await fetch(`${API}/auth/profile`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(profileForm) });
    const d = await res.json();
    if (res.ok && d.user) login({ ...user, ...d.user }, token);
    showMsg(d.message || 'Profile updated!');
    setProfileLoading(false);
  };

  // Material form
  const [matForm, setMatForm] = useState({
    title: '', type: 'notes', contentUrl: '', subjectId: '',
    classLevel: '', combination: '', fileName: '', fileType: '', fileData: ''
  });

  const handleMaterialFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setMatForm(prev => ({
        ...prev,
        fileName: file.name,
        fileType: file.name.split('.').pop().toLowerCase(),
        fileData: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const addMaterial = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/materials`, { method: 'POST', headers: authHeaders, body: JSON.stringify(matForm) });
      const d = await res.json();
      if (!res.ok) {
        showMsg(d.message || 'Upload failed. Please check the file and details.');
        return;
      }
      showMsg(d.message || 'Material uploaded successfully!');
      fetchAll();
      setMatForm({ title: '', type: 'notes', contentUrl: '', subjectId: '', classLevel: '', combination: '', fileName: '', fileType: '', fileData: '' });
      const fi = document.getElementById('teacher-file-upload');
      if (fi) fi.value = '';
      setShowMatForm(false);
    } catch (err) {
      showMsg('Upload failed due to network or server error.');
    }
  };

  // Activity form
  const [actForm, setActForm] = useState({
    title: '', instructions: '', levelType: 'Primary', maxScore: 100, subjectId: '',
    classLevel: '', combination: '', fileName: '', fileType: '', fileData: ''
  });

  const handleActivityFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setActForm(prev => ({
        ...prev,
        fileName: file.name,
        fileType: file.name.split('.').pop().toLowerCase(),
        fileData: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const addActivity = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/activities`, { method: 'POST', headers: authHeaders, body: JSON.stringify(actForm) });
    const d = await res.json();
    showMsg(d.message); fetchAll();
    setActForm({ title: '', instructions: '', levelType: 'Primary', maxScore: 100, subjectId: '', classLevel: '', combination: '', fileName: '', fileType: '', fileData: '' });
    const fi = document.getElementById('teacher-activity-file');
    if (fi) fi.value = '';
    setShowActForm(false);
  };


  // Lesson form
  const [lesForm, setLesForm] = useState({ title: '', scheduleTime: '', meetUrl: '', subjectId: '', level: 'S1' });
  const addLesson = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/lessons`, { method: 'POST', headers: authHeaders, body: JSON.stringify(lesForm) });
    const d = await res.json();
    showMsg(d.message); fetchAll();
    setLesForm({ title: '', scheduleTime: '', meetUrl: '', subjectId: '', level: 'S1' });
    setShowLesForm(false);
  };

  const deleteLesson = async (id) => {
    if (!window.confirm('Are you sure you want to delete this live lesson schedule?')) return;
    const res = await fetch(`${API}/lessons/${id}`, { method: 'DELETE', headers: authHeaders });
    const d = await res.json();
    showMsg(d.message || 'Lesson deleted.');
    fetchAll();
  };

  const deleteMaterial = async (id) => {
    if (!id) {
      showMsg('Invalid material ID.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this study material/resource?')) return;
    try {
      const res = await fetch(`${API}/materials/${id}`, { method: 'DELETE', headers: authHeaders });
      const d = await res.json();
      if (!res.ok) {
        showMsg(d.message || 'Failed to delete material.');
        return;
      }
      showMsg(d.message || 'Material deleted.');
      fetchAll();
    } catch {
      showMsg('Failed to delete material due to network error.');
    }
  };

  // Marking
  const [markForms, setMarkForms] = useState({});
  const markSubmission = async (subId) => {
    const { score, feedback } = markForms[subId] || {};
    if (score === undefined || score === '') { showMsg('Please enter a score first.'); return; }
    const res = await fetch(`${API}/submissions/${subId}/mark`, {
      method: 'PUT', headers: authHeaders,
      body: JSON.stringify({ score: Number(score), feedback })
    });
    const d = await res.json();
    showMsg(d.message || 'Marked!'); fetchAll();
  };

  const CLASSES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

  const myActivitiesForMarking = submissions.filter(s => {
    const act = activities.find(a => a.id == s.activityId);
    return act != null;
  });
  const pendingMark = myActivitiesForMarking.filter(s => !s.isMarked);
  const markedSubs = myActivitiesForMarking.filter(s => s.isMarked);

  const submissionsForMarking = submissions.filter(s => {
    const act = allActivities.find(a => a.id == s.activityId);
    if (!act) return false;

    // Filter by ownership
    if (markFilterCreator === 'mine' && act.teacherId != user?.id) return false;

    // Filter by marked status
    if (markFilterShow === 'unmarked' && s.isMarked) return false;
    if (markFilterShow === 'marked' && !s.isMarked) return false;

    return true;
  });

  const tabTitles = {
    dashboard: 'Teacher Dashboard', profile: 'My Profile',
    materials: 'My Notes & Resources', activities: 'My Activities & Assessments',
    mark: 'Mark Submissions', lessons: 'Live Lessons'
  };

  return (
    <>
      <DashboardLayout title={tabTitles[tab]} navItems={NAV} activeTab={tab} onTabChange={setTab}>
        {msg && (
          <div style={{ padding: '12px 18px', background: 'var(--primary-glow)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.4)', marginBottom: '20px', color: 'var(--primary)', fontWeight: 500 }}>
            ✅ {msg}
          </div>
        )}

        {/* ─── DASHBOARD ─── */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="grid-container">
              {[
                { label: 'My Notes Uploaded', value: materials.length, color: 'var(--accent-emerald)', icon: <FileText size={22} /> },
                { label: 'My Activities', value: activities.length, color: 'var(--primary)', icon: <ClipboardList size={22} /> },
                { label: 'Pending to Mark', value: pendingMark.length, color: 'var(--accent-amber)', icon: <CheckSquare size={22} /> },
                { label: 'Marked Submissions', value: markedSubs.length, color: 'var(--accent-rose)', icon: <CheckSquare size={22} /> },
                { label: 'Scheduled Lessons', value: lessons.length, color: 'var(--primary)', icon: <Video size={22} /> },
              ].map(m => (
                <div key={m.label} className="glass-card" style={{ borderLeft: `4px solid ${m.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ color: m.color }}>{m.icon}</div>
                  </div>
                  <div className="metric-value">{m.value}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {pendingMark.length > 0 && (
              <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
                <div className="card-title" style={{ color: 'var(--accent-amber)' }}>⏳ Pending Submissions to Mark</div>
                {pendingMark.slice(0, 3).map(s => {
                  const act = activities.find(a => a.id == s.activityId);
                  return (
                    <div key={s.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Activity: {act?.title || s.activityId}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>Student ID: {s.studentId}</div>
                    </div>
                  );
                })}
                <button className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }} onClick={() => setTab('mark')}>
                  View All →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── PROFILE ─── */}
        {tab === 'profile' && (
          <div className="glass-card" style={{ maxWidth: '560px' }}>
            <div className="card-title"><Edit3 size={16} /> Edit My Profile</div>

            {/* Profile Photo */}
            <div className="profile-upload-container">
              {profileForm.photoData ? (
                <img src={profileForm.photoData} alt="Profile" className="profile-preview-avatar" />
              ) : (
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-amber), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600, marginBottom: '6px' }}>Profile Photo</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '10px' }}>Upload a clear photo. JPG or PNG.</div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => photoInputRef.current?.click()}>
                  <Camera size={14} /> {profileForm.photoData ? 'Change Photo' : 'Upload Photo'}
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
              </div>
            </div>

            <form onSubmit={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <input className="input-field" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone Number</label>
                <input className="input-field" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Profile / Subjects Taught</label>
                <textarea className="textarea-field" rows={3} placeholder="e.g. Mathematics, Physics for S1-S4" value={profileForm.profile} onChange={e => setProfileForm(p => ({ ...p, profile: e.target.value }))} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={profileLoading}>
                <Save size={15} /> {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* ─── MY MATERIALS ─── */}
        {tab === 'materials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Upload form toggle */}
            <div style={{ marginBottom: '8px' }}>
              <button
                className={`btn ${showMatForm ? 'btn-secondary' : 'btn-primary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => setShowMatForm(v => !v)}
              >
                {showMatForm ? <X size={16} /> : <Plus size={16} />}
                {showMatForm ? 'Cancel' : '+ Upload Note / Resource'}
              </button>
            </div>

            {showMatForm && (
              <div className="glass-card" style={{ border: '1px solid rgba(99,102,241,0.3)', animation: 'slideUp 0.2s ease-out' }}>
                <div className="card-title"><Plus size={16} /> Upload Note / Resource</div>
                <form onSubmit={addMaterial} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Title</label>
                    <input className="input-field" placeholder="e.g. S3 Chemistry Term 2 Notes" value={matForm.title} onChange={e => setMatForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Type</label>
                    <select className="select-field" value={matForm.type} onChange={e => setMatForm(p => ({ ...p, type: e.target.value }))}>
                      <option value="notes">Study Notes</option>
                      <option value="support">Support Material</option>
                      <option value="resource">Extra Resources</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Subject</label>
                    <select className="select-field" value={matForm.subjectId} onChange={e => setMatForm(p => ({ ...p, subjectId: e.target.value }))} required>
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Visible to Class Level</label>
                    <select className="select-field" value={matForm.classLevel} onChange={e => setMatForm(p => ({ ...p, classLevel: e.target.value, combination: '' }))}>
                      <option value="">All Classes (Public)</option>
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {['S5', 'S6'].includes(matForm.classLevel) && (
                    <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                      <label className="form-label">A-Level Combination (leave empty = all combos)</label>
                      <select className="select-field" value={matForm.combination} onChange={e => setMatForm(p => ({ ...p, combination: e.target.value }))}>
                        <option value="">All Combinations</option>
                        <option value="PCM">PCM (Physics, Chemistry, Math)</option>
                        <option value="BCM">BCM (Biology, Chemistry, Math)</option>
                        <option value="PCB">PCB (Physics, Chemistry, Biology)</option>
                        <option value="PEM">PEM (Physics, Economics, Math)</option>
                        <option value="HEG">HEG (History, Economics, Geography)</option>
                        <option value="MEG">MEG (Math, Economics, Geography)</option>
                        <option value="HEL">HEL (History, Economics, Lit)</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                    <label className="form-label">📎 Upload File (PDF, Word, Image, Video)</label>
                    <input
                      id="teacher-file-upload"
                      type="file"
                      className="input-field"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.mkv,.webm,.avi"
                      onChange={handleMaterialFileChange}
                      style={{ paddingTop: '10px' }}
                    />
                    {matForm.fileName && (
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
                        ✅ Selected: <strong>{matForm.fileName}</strong>
                      </div>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                    <label className="form-label">OR External URL / Link (optional)</label>
                    <input className="input-field" placeholder="https://drive.google.com/..." value={matForm.contentUrl} onChange={e => setMatForm(p => ({ ...p, contentUrl: e.target.value }))} />
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" type="submit" style={{ flex: 1 }}><Plus size={16} /> Upload</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowMatForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
            {/* Uploaded materials grouped by subject */}
            {(() => {
              const grouped = subjects
                .map(s => ({ sub: s, items: materials.filter(m => m.subjectId == s.id) }))
                .filter(g => g.items.length > 0);
              const ungrouped = materials.filter(m => !subjects.find(s => s.id == m.subjectId));

              const MatCard = ({ m }) => (
                <div className="note-card">
                  <div className="note-card-stripe" style={{ background: 'var(--accent-emerald)' }}/>
                  <div className="note-card-title">{m.title}</div>
                  <div className="note-card-badges">
                    <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{m.type}</span>
                    {m.classLevel && <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>{m.classLevel}{m.combination ? ` · ${m.combination}` : ''}</span>}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    👤 {m.creatorName || 'System'} ({m.creatorRole || 'admin'})
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    {m.fileData
                      ? <a href={m.fileData} download={m.fileName} style={{ color: 'var(--accent-emerald)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>⬇ Download</a>
                      : m.contentUrl
                        ? <a href={m.contentUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><ExternalLink size={12} /> Open Link</a>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>}

                    {m.teacherId == user?.id ? (
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.72rem', marginLeft: 'auto' }}
                        onClick={() => deleteMaterial(m.id)}
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="badge badge-primary" style={{ fontSize: '0.62rem', marginLeft: 'auto' }}>Read-only</span>
                    )}
                  </div>
                </div>
              );

              return (
                <>
                  {grouped.map(({ sub, items }) => (
                    <div key={sub.id} style={{ marginBottom: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '4px solid var(--accent-emerald)' }}>
                        <span>📖</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>{sub.name}</span>
                        <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>{items.length} note{items.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="four-column-grid">
                        {items.map(m => <MatCard key={m.id} m={m} />)}
                      </div>
                    </div>
                  ))}
                  {ungrouped.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--text-muted)' }}>📁 Uncategorised</div>
                      <div className="four-column-grid">
                        {ungrouped.map(m => <MatCard key={m.id} m={m} />)}
                      </div>
                    </div>
                  )}
                  {materials.length === 0 && <div style={{ color: 'var(--text-muted)', padding: '32px', textAlign: 'center' }}>You haven't uploaded any materials yet.</div>}
                </>
              );
            })()}
          </div>
        )}

        {/* ─── MY ACTIVITIES ─── */}
        {tab === 'activities' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Create activity form toggle */}
            <div style={{ marginBottom: '8px' }}>
              <button
                className={`btn ${showActForm ? 'btn-secondary' : 'btn-primary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => setShowActForm(v => !v)}
              >
                {showActForm ? <X size={16} /> : <Plus size={16} />}
                {showActForm ? 'Cancel' : '+ Create Activity / Assessment'}
              </button>
            </div>

            {showActForm && (
              <div className="glass-card" style={{ border: '1px solid rgba(99,102,241,0.3)', animation: 'slideUp 0.2s ease-out' }}>
                <div className="card-title"><Plus size={16} /> Create Activity / Assessment</div>
                <form onSubmit={addActivity} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Title</label>
                    <input className="input-field" placeholder="Activity title..." value={actForm.title} onChange={e => setActForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Level Type</label>
                    <select className="select-field" value={actForm.levelType} onChange={e => setActForm(p => ({ ...p, levelType: e.target.value }))}>
                      <option>Primary</option><option>O-Level</option><option>A-Level</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Subject</label>
                    <select className="select-field" value={actForm.subjectId} onChange={e => setActForm(p => ({ ...p, subjectId: e.target.value }))} required>
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Max Score</label>
                    <input className="input-field" type="number" value={actForm.maxScore} onChange={e => setActForm(p => ({ ...p, maxScore: e.target.value }))} min={1} max={actForm.levelType === 'O-Level' ? 3 : 100} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Target Class Level</label>
                    <select className="select-field" value={actForm.classLevel} onChange={e => setActForm(p => ({ ...p, classLevel: e.target.value, combination: '' }))}>
                      <option value="">All Classes</option>
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    {['S5', 'S6'].includes(actForm.classLevel) ? (
                      <>
                        <label className="form-label">A-Level Combination</label>
                        <select className="select-field" value={actForm.combination} onChange={e => setActForm(p => ({ ...p, combination: e.target.value }))}>
                          <option value="">All Combinations</option>
                          <option value="PCM">PCM (Physics, Chemistry, Math)</option>
                          <option value="BCM">BCM (Biology, Chemistry, Math)</option>
                          <option value="PCB">PCB (Physics, Chemistry, Biology)</option>
                          <option value="PEM">PEM (Physics, Economics, Math)</option>
                          <option value="HEG">HEG (History, Economics, Geography)</option>
                          <option value="MEG">MEG (Math, Economics, Geography)</option>
                          <option value="HEL">HEL (History, Economics, Lit)</option>
                        </select>
                      </>
                    ) : <div />}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                    <label className="form-label">Instructions / Questions</label>
                    <textarea className="textarea-field" rows={4} value={actForm.instructions} onChange={e => setActForm(p => ({ ...p, instructions: e.target.value }))} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                    <label className="form-label">📎 Attach File (PDF or Word — optional)</label>
                    <input
                      id="teacher-activity-file"
                      type="file"
                      className="input-field"
                      accept=".pdf,.doc,.docx,.ppt,.pptx"
                      onChange={handleActivityFileChange}
                      style={{ paddingTop: '10px' }}
                    />
                    {actForm.fileName && (
                      <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
                        ✅ Attached: <strong>{actForm.fileName}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" type="submit" style={{ flex: 1 }}><Plus size={16} /> Create Activity</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowActForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
            {/* Activities grouped by subject */}
            {(() => {
              const grouped = subjects
                .map(s => ({ sub: s, items: activities.filter(a => a.subjectId == s.id) }))
                .filter(g => g.items.length > 0);
              const ungrouped = activities.filter(a => !subjects.find(s => s.id == a.subjectId));

              const ActCard = ({ a }) => (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '18px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: '1.35', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{a.title}</div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>{a.levelType}</span>
                    {a.classLevel && <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>{a.classLevel}{a.combination ? ` · ${a.combination}` : ''}</span>}
                    <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>Score: {a.maxScore}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {a.instructions}
                  </div>
                  {a.fileData && (
                    <a href={a.fileData} download={a.fileName} style={{ color: 'var(--accent-emerald)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>⬇ {a.fileName}</a>
                  )}
                </div>
              );

              return (
                <>
                  {grouped.map(({ sub, items }) => (
                    <div key={sub.id} style={{ marginBottom: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)', borderLeft: '4px solid var(--primary)' }}>
                        <span>✏️</span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{sub.name}</span>
                        <span className="badge badge-primary" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>{items.length} activit{items.length !== 1 ? 'ies' : 'y'}</span>
                      </div>
                      <div className="three-column-grid">
                        {items.map(a => <ActCard key={a.id} a={a} />)}
                      </div>
                    </div>
                  ))}
                  {ungrouped.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--text-muted)' }}>📋 Uncategorised</div>
                      <div className="three-column-grid">
                        {ungrouped.map(a => <ActCard key={a.id} a={a} />)}
                      </div>
                    </div>
                  )}
                  {activities.length === 0 && <div style={{ color: 'var(--text-muted)', padding: '32px', textAlign: 'center' }}>No activities created yet.</div>}
                </>
              );
            })()}
          </div>
        )}


        {/* ─── MARK SUBMISSIONS ─── */}
        {tab === 'mark' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)', padding: '2px' }}>
                <button
                  type="button"
                  className={`btn btn-sm`}
                  style={{
                    background: markFilterShow === 'unmarked' ? 'var(--primary)' : 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    color: markFilterShow === 'unmarked' ? 'white' : 'var(--text-mark)'
                  }}
                  onClick={() => setMarkFilterShow('unmarked')}
                >
                  ⏳ Unmarked
                </button>
                <button
                  type="button"
                  className={`btn btn-sm`}
                  style={{
                    background: markFilterShow === 'marked' ? 'var(--primary)' : 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    color: markFilterShow === 'marked' ? 'white' : 'var(--text-mark)'
                  }}
                  onClick={() => setMarkFilterShow('marked')}
                >
                  ✅ Graded
                </button>
                <button
                  type="button"
                  className={`btn btn-sm`}
                  style={{
                    background: markFilterShow === 'all' ? 'var(--primary)' : 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    color: markFilterShow === 'all' ? 'white' : 'var(--text-mark)'
                  }}
                  onClick={() => setMarkFilterShow('all')}
                >
                  All
                </button>
              </div>

              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)', padding: '2px' }}>
                <button
                  type="button"
                  className={`btn btn-sm`}
                  style={{
                    background: markFilterCreator === 'all' ? 'var(--primary)' : 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    color: markFilterCreator === 'all' ? 'white' : 'var(--text-mark)'
                  }}
                  onClick={() => setMarkFilterCreator('all')}
                >
                  🌐 All Activities
                </button>
                <button
                  type="button"
                  className={`btn btn-sm`}
                  style={{
                    background: markFilterCreator === 'mine' ? 'var(--primary)' : 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    color: markFilterCreator === 'mine' ? 'white' : 'var(--text-mark)'
                  }}
                  onClick={() => setMarkFilterCreator('mine')}
                >
                  👤 My Activities
                </button>
              </div>
            </div>

            {submissionsForMarking.length === 0 && (
              <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <CheckSquare size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>No student submissions found matching the criteria.</p>
              </div>
            )}
            {submissionsForMarking.map(sub => {
              const act = allActivities.find(a => a.id == sub.activityId);
              const mf = markForms[sub.id] || {};
              return (
                <div key={sub.id} className="glass-card" style={{ borderLeft: sub.isMarked ? '4px solid var(--accent-emerald)' : '4px solid var(--accent-amber)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: '4px' }}>{act?.title || 'Activity'}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Student ID: {sub.studentId} · Level: {act?.levelType || '—'} {act?.classLevel ? `(${act.classLevel})` : ''}
                      </div>
                    </div>
                    {sub.isMarked
                      ? <span className="badge badge-success">Marked: {sub.score}/{act?.maxScore}</span>
                      : <span className="badge badge-warning">Pending</span>}
                  </div>

                  <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', marginBottom: '6px' }}>Student Answer:</div>
                    <div style={{ fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{sub.studentAnswer || <em style={{ color: 'var(--text-muted)' }}>(No text answer provided)</em>}</div>

                    {sub.fileData && (
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => setViewFile({ fileData: sub.fileData, fileType: sub.fileType, fileName: sub.fileName, title: `Student Attempt - Activity: ${act?.title || 'Assessment'}` })}
                        >
                          👁 View Submitted PDF
                        </button>
                      </div>
                    )}
                  </div>

                  {!sub.isMarked && (
                    <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div className="form-group" style={{ marginBottom: 0, flex: '0 0 120px' }}>
                        <label className="form-label">
                          Score {act?.levelType === 'O-Level' ? '(1-3)' : `(0-${act?.maxScore})`}
                        </label>
                        <input className="input-field" type="number"
                          min={0} max={act?.maxScore || 100}
                          placeholder="Score..."
                          value={mf.score || ''}
                          onChange={e => setMarkForms(p => ({ ...p, [sub.id]: { ...p[sub.id], score: e.target.value } }))}
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                        <label className="form-label">Feedback (optional)</label>
                        <input className="input-field" placeholder="Write feedback for student..."
                          value={mf.feedback || ''}
                          onChange={e => setMarkForms(p => ({ ...p, [sub.id]: { ...p[sub.id], feedback: e.target.value } }))}
                        />
                      </div>
                      <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => markSubmission(sub.id)}>
                        <CheckSquare size={14} /> Submit Mark
                      </button>
                    </div>
                  )}
                  {sub.isMarked && sub.feedback && (
                    <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--accent-emerald)' }}>
                      📝 Feedback given: {sub.feedback}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── LESSONS ─── */}
        {tab === 'lessons' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Schedule Live Lesson toggle */}
            <div style={{ marginBottom: '8px' }}>
              <button
                className={`btn ${showLesForm ? 'btn-secondary' : 'btn-primary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => setShowLesForm(v => !v)}
              >
                {showLesForm ? <X size={16} /> : <Plus size={16} />}
                {showLesForm ? 'Cancel' : '+ Schedule Live Lesson'}
              </button>
            </div>

            {showLesForm && (
              <div className="glass-card" style={{ border: '1px solid rgba(99,102,241,0.3)', animation: 'slideUp 0.2s ease-out' }}>
                <div className="card-title"><Plus size={16} /> Schedule Live Lesson</div>
                <form onSubmit={addLesson} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Lesson Title</label>
                    <input className="input-field" placeholder="Lesson title..." value={lesForm.title} onChange={e => setLesForm(p => ({ ...p, title: e.target.value }))} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Class Level</label>
                    <select className="select-field" value={lesForm.level} onChange={e => setLesForm(p => ({ ...p, level: e.target.value }))}>
                      {CLASSES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Date & Time</label>
                    <input className="input-field" type="datetime-local" value={lesForm.scheduleTime} onChange={e => setLesForm(p => ({ ...p, scheduleTime: e.target.value }))} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Subject</label>
                    <select className="select-field" value={lesForm.subjectId} onChange={e => setLesForm(p => ({ ...p, subjectId: e.target.value }))} required>
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                    <label className="form-label">Meet Link</label>
                    <input className="input-field" placeholder="https://meet.google.com/..." value={lesForm.meetUrl} onChange={e => setLesForm(p => ({ ...p, meetUrl: e.target.value }))} required />
                  </div>
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary" type="submit" style={{ flex: 1 }}><Plus size={16} /> Schedule</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowLesForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
            <div className="table-container">
              <table className="custom-table">
                <thead><tr><th>Title</th><th>Host</th><th>Class</th><th>Subject</th><th>Schedule</th><th>Link</th><th>Action</th></tr></thead>
                <tbody>
                  {lessons.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No lessons scheduled yet.</td></tr>}
                  {lessons.map(l => (
                    <tr key={l.id}>
                      <td style={{ fontWeight: 600 }}>{l.title}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{l.creatorName || (l.teacherId == user?.id ? 'Me' : 'Other')}</td>
                      <td><span className="badge badge-primary">{l.level}</span></td>
                      <td style={{ color: 'var(--text-muted)' }}>{subjects.find(s => s.id == l.subjectId)?.name || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(l.scheduleTime).toLocaleString()}</td>
                      <td><a href={l.meetUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>Join</a></td>
                      <td>
                        {l.teacherId == user?.id ? (
                          <button className="btn btn-danger btn-sm" style={{ padding: '3px 8px', fontSize: '0.78rem' }} onClick={() => deleteLesson(l.id)}>Delete</button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Read-only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DashboardLayout>

      {viewFile && (
        <FileViewer file={viewFile} onClose={() => setViewFile(null)} />
      )}
    </>
  );
}

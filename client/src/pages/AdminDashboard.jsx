import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, BookOpen, Video, FileText,
  MessageSquare, ClipboardList, Plus, Trash2, CheckCircle,
  UserCheck, Bot, ChevronRight, Edit2, Ban, ShieldOff, Shield,
  EyeOff, Eye, Save, X, Key
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth, API } from '../App';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'students', label: 'Students', icon: <Users size={18} /> },
  { id: 'teachers', label: 'Teachers', icon: <UserCheck size={18} /> },
  { id: 'subjects', label: 'Subjects', icon: <BookOpen size={18} /> },
  { id: 'combinations', label: "A' Level Combinations", icon: <BookOpen size={18} /> },
  { id: 'materials', label: 'Notes & Resources', icon: <FileText size={18} /> },
  { id: 'activities', label: 'Activities', icon: <ClipboardList size={18} /> },
  { id: 'lessons', label: 'Live Lessons', icon: <Video size={18} /> },
  { id: 'subscription', label: 'School Subscription', icon: <Key size={18} /> },
  { id: 'security', label: 'Security & Password', icon: <Key size={18} /> },
];

const CLASSES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

// ── Inline-edit field helper ──
function InlineInput({ label, value, onChange, type = 'text', style = {} }) {
  return (
    <div className="form-group" style={{ marginBottom: 0, ...style }}>
      <label className="form-label">{label}</label>
      <input className="input-field" type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const [tab, setTab] = useState('dashboard');

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [activities, setActivities] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [msg, setMsg] = useState('');

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({});
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editMatForm, setEditMatForm] = useState({});
  const [editingActivity, setEditingActivity] = useState(null);
  const [editActForm, setEditActForm] = useState({});

  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingCombination, setEditingCombination] = useState(null);
  const [combForm, setCombForm] = useState({ code: '', name: '', subjectIds: [] });

  // Subscription state
  const [activationKey, setActivationKey] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);

  const handleApplyKey = async (e) => {
    e.preventDefault();
    if (!activationKey) return showMsg('Please enter an activation key.');
    setKeyLoading(true);
    try {
      const res = await fetch(`${API}/admin/apply-key`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ key: activationKey })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to apply activation key');
      showMsg(data.message);
      setActivationKey('');
    } catch (err) {
      showMsg(err.message);
    } finally {
      setKeyLoading(false);
    }
  };

  // ── Password change state ──
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passForm.currentPassword || !passForm.newPassword || !passForm.confirmPassword) {
      showMsg('Please fill in all password fields.');
      return;
    }
    if (passForm.newPassword.length < 6) {
      showMsg('New password must be at least 6 characters long.');
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      showMsg('New password and confirmation do not match.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(passForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to change password');

      showMsg('Password changed successfully!');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showMsg(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  // ── Form visibility toggles ──
  const [showForms, setShowForms] = useState({
    teacher: false, subject: false, material: false,
    activity: false, lesson: false, combination: false
  });
  const toggleForm = (key) => setShowForms(p => ({ ...p, [key]: !p[key] }));
  const closeForm = (key) => setShowForms(p => ({ ...p, [key]: false }));

  const fetchAll = async () => {
    const [us, ts, subs, mats, acts, les, combs] = await Promise.all([
      fetch(`${API}/admin/users`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/teachers`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/subjects`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/materials`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/activities`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/lessons`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch(`${API}/combinations`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
    ]);
    setStudents(Array.isArray(us) ? us.filter(u => u.role === 'student') : []);
    setTeachers(Array.isArray(ts) ? ts.filter(u => u.role === 'teacher') : []);
    setSubjects(Array.isArray(subs) ? subs : []);
    setMaterials(Array.isArray(mats) ? mats : []);
    setActivities(Array.isArray(acts) ? acts : []);
    setLessons(Array.isArray(les) ? les : []);
    setCombinations(Array.isArray(combs) ? combs : []);
  };

  useEffect(() => { fetchAll(); }, [tab]);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };

  const approveStudent = async (id) => {
    await fetch(`${API}/admin/approve-student/${id}`, { method: 'PUT', headers: authHeaders });
    showMsg('Student approved!');
    fetchAll();
  };

  // ── User actions ──
  const deleteUser = async (id, role) => {
    if (!window.confirm(`Are you sure you want to permanently delete this ${role}? This cannot be undone.`)) return;
    const res = await fetch(`${API}/admin/users/${id}`, { method: 'DELETE', headers: authHeaders });
    const d = await res.json();
    showMsg(d.message || 'User deleted.');
    fetchAll();
  };

  // ── Combination actions ──
  const handleToggleSubjectInCombForm = (subId) => {
    setCombForm(prev => {
      const idx = prev.subjectIds.indexOf(subId);
      if (idx > -1) {
        return { ...prev, subjectIds: prev.subjectIds.filter(id => id !== subId) };
      } else {
        if (prev.subjectIds.length >= 3) return prev; // max 3
        return { ...prev, subjectIds: [...prev.subjectIds, subId] };
      }
    });
  };

  const startEditCombination = (comb) => {
    let parsedIds = [];
    try {
      parsedIds = typeof comb.subjectIds === 'string' ? JSON.parse(comb.subjectIds) : comb.subjectIds;
    } catch {
      parsedIds = [];
    }
    setEditingCombination(comb);
    setCombForm({
      code: comb.code,
      name: comb.name,
      subjectIds: parsedIds
    });
  };

  const saveCombination = async (e) => {
    e.preventDefault();
    if (!combForm.code.trim() || !combForm.name.trim()) {
      showMsg('Please fill in Code and Name.');
      return;
    }
    if (combForm.subjectIds.length !== 3) {
      showMsg('Please select exactly 3 principal subjects.');
      return;
    }

    const payload = {
      code: combForm.code.toUpperCase().trim(),
      name: combForm.name.trim(),
      subjectIds: combForm.subjectIds
    };

    const url = editingCombination
      ? `${API}/combinations/${editingCombination.id}`
      : `${API}/combinations`;
    const method = editingCombination ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (res.ok) {
        showMsg(editingCombination ? 'Combination updated!' : 'Combination created!');
        setEditingCombination(null);
        setCombForm({ code: '', name: '', subjectIds: [] });
        closeForm('combination');
        fetchAll();
      } else {
        showMsg(d.message || 'Action failed.');
      }
    } catch {
      showMsg('Server error.');
    }
  };

  const deleteCombination = async (id) => {
    if (!window.confirm('Are you sure you want to delete this combination?')) return;
    try {
      const res = await fetch(`${API}/combinations/${id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        showMsg('Combination deleted.');
        fetchAll();
      } else {
        showMsg('Failed to delete combination.');
      }
    } catch {
      showMsg('Server error.');
    }
  };

  const renderStudentSubjects = (subjectIdsJson) => {
    if (!subjectIdsJson) return 'None';
    try {
      const ids = typeof subjectIdsJson === 'string' ? JSON.parse(subjectIdsJson) : subjectIdsJson;
      if (!Array.isArray(ids)) return 'None';
      return ids.map(id => {
        const s = subjects.find(sub => sub.id == id);
        return s ? `${s.name} (${s.code || 'No Code'})` : `Subject ID ${id}`;
      }).join(', ');
    } catch {
      return 'None';
    }
  };

  const suspendUser = async (id, currentlySuspended) => {
    const action = currentlySuspended ? 'unsuspend' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} this account?`)) return;
    const res = await fetch(`${API}/admin/users/${id}/suspend`, { method: 'PUT', headers: authHeaders });
    const d = await res.json();
    showMsg(d.message || `User ${action}ed.`);
    fetchAll();
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setEditUserForm({
      name: u.name || '',
      phone: u.phone || '',
      profile: u.profile || '',
      level: u.level || '',
    });
  };

  const saveEditUser = async () => {
    const res = await fetch(`${API}/admin/users/${editingUser.id}`, {
      method: 'PUT', headers: authHeaders,
      body: JSON.stringify(editUserForm)
    });
    const d = await res.json();
    showMsg(d.message || 'User updated.');
    setEditingUser(null);
    fetchAll();
  };

  // ── Subject form & Filter state ──
  const [subForm, setSubForm] = useState({
    name: '', level: 'Primary', description: '',
    category: 'Both', code: '', classification: ''
  });
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [selectedSubjects, setSelectedSubjects] = useState([]);

  const filteredSubjects = subjects.filter(s => subjectFilter === 'All' || s.level === subjectFilter);
  const allSelectedOnFiltered = filteredSubjects.length > 0 &&
    filteredSubjects.every(s => selectedSubjects.includes(s.id));

  const addSubject = async (e) => {
    e.preventDefault();
    const url = editingSubject ? `${API}/subjects/${editingSubject}` : `${API}/subjects`;
    const method = editingSubject ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(subForm) });
    const d = await res.json();
    showMsg(d.message);
    setEditingSubject(null);
    setSubForm({ name: '', level: 'Primary', description: '', category: 'Both', code: '', classification: '' });
    fetchAll();
  };

  const editSubject = (s) => {
    setEditingSubject(s.id);
    setSubForm({
      name: s.name,
      level: s.level,
      description: s.description || '',
      category: s.category || 'Both',
      code: s.code || '',
      classification: s.classification || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBulkDelete = async (actionType) => {
    let payload = {};
    if (actionType === 'all') {
      if (!window.confirm('Are you sure you want to delete ALL subjects? This cannot be undone.')) return;
      payload = { ids: 'all' };
    } else {
      if (selectedSubjects.length === 0) { alert('Please select at least one subject to delete.'); return; }
      if (!window.confirm(`Are you sure you want to delete the ${selectedSubjects.length} selected subjects?`)) return;
      payload = { ids: selectedSubjects };
    }
    try {
      const res = await fetch(`${API}/subjects/bulk-delete`, { method: 'POST', headers: authHeaders, body: JSON.stringify(payload) });
      const d = await res.json();
      showMsg(d.message);
      setSelectedSubjects([]);
      fetchAll();
    } catch { showMsg('Bulk deletion failed.'); }
  };

  const toggleSelectSubject = (id) => {
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAllSubjects = (filteredList) => {
    const filteredIds = filteredList.map(s => s.id);
    const allSelected = filteredIds.every(id => selectedSubjects.includes(id));
    if (allSelected) {
      setSelectedSubjects(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedSubjects(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  // ── Material form ──
  const [matForm, setMatForm] = useState({
    title: '', type: 'notes', contentUrl: '', subjectId: '',
    classLevel: '', combination: '', fileName: '', fileType: '', fileData: ''
  });
  const handleMaterialFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setMatForm(prev => ({ ...prev, fileName: file.name, fileType: file.name.split('.').pop().toLowerCase(), fileData: reader.result }));
    };
    reader.readAsDataURL(file);
  };
  const addMaterial = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/materials`, { method: 'POST', headers: authHeaders, body: JSON.stringify(matForm) });
    const d = await res.json();
    showMsg(d.message); fetchAll();
    setMatForm({ title: '', type: 'notes', contentUrl: '', subjectId: '', classLevel: '', combination: '', fileName: '', fileType: '', fileData: '' });
    const fi = document.getElementById('admin-file-upload');
    if (fi) fi.value = '';
  };

  // Material edit/block
  const openEditMaterial = (m) => {
    setEditingMaterial(m);
    setEditMatForm({ title: m.title, type: m.type, classLevel: m.classLevel || '', combination: m.combination || '', contentUrl: m.contentUrl || '' });
  };
  const saveEditMaterial = async () => {
    const res = await fetch(`${API}/materials/${editingMaterial.id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(editMatForm) });
    const d = await res.json();
    showMsg(d.message || 'Material updated.');
    setEditingMaterial(null);
    fetchAll();
  };
  const toggleBlockMaterial = async (id, currentBlocked) => {
    const res = await fetch(`${API}/materials/${id}/block`, { method: 'PUT', headers: authHeaders });
    const d = await res.json();
    showMsg(d.message || (currentBlocked ? 'Material unblocked.' : 'Material blocked.'));
    fetchAll();
  };

  // ── Activity form ──
  const [actForm, setActForm] = useState({
    title: '', instructions: '', levelType: 'Primary', maxScore: 100, subjectId: '',
    classLevel: '', combination: '', fileName: '', fileType: '', fileData: ''
  });
  const handleActivityFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setActForm(prev => ({ ...prev, fileName: file.name, fileType: file.name.split('.').pop().toLowerCase(), fileData: reader.result }));
    };
    reader.readAsDataURL(file);
  };
  const addActivity = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/activities`, { method: 'POST', headers: authHeaders, body: JSON.stringify(actForm) });
    const d = await res.json();
    showMsg(d.message); fetchAll();
    setActForm({ title: '', instructions: '', levelType: 'Primary', maxScore: 100, subjectId: '', classLevel: '', combination: '', fileName: '', fileType: '', fileData: '' });
    const fi = document.getElementById('admin-activity-file');
    if (fi) fi.value = '';
  };

  // Activity edit/block
  const openEditActivity = (a) => {
    setEditingActivity(a);
    setEditActForm({
      title: a.title, instructions: a.instructions, levelType: a.levelType,
      classLevel: a.classLevel || '', combination: a.combination || '', maxScore: a.maxScore
    });
  };
  const saveEditActivity = async () => {
    const res = await fetch(`${API}/activities/${editingActivity.id}`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(editActForm) });
    const d = await res.json();
    showMsg(d.message || 'Activity updated.');
    setEditingActivity(null);
    fetchAll();
  };
  const toggleBlockActivity = async (id, currentBlocked) => {
    const res = await fetch(`${API}/activities/${id}/block`, { method: 'PUT', headers: authHeaders });
    const d = await res.json();
    showMsg(d.message || (currentBlocked ? 'Activity unblocked.' : 'Activity blocked.'));
    fetchAll();
  };

  // ── Lesson form ──
  const [lesForm, setLesForm] = useState({ title: '', scheduleTime: '', meetUrl: '', subjectId: '', level: 'S1' });
  const addLesson = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/lessons`, { method: 'POST', headers: authHeaders, body: JSON.stringify(lesForm) });
    const d = await res.json();
    showMsg(d.message); fetchAll();
    setLesForm({ title: '', scheduleTime: '', meetUrl: '', subjectId: '', level: 'S1' });
  };

  // ── Teacher register form ──
  const [tchForm, setTchForm] = useState({ name: '', phone: '', username: '', password: '', profile: '' });
  const addTeacher = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/auth/register`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ ...tchForm, role: 'teacher' }) });
    const d = await res.json();
    showMsg(d.message); fetchAll();
    setTchForm({ name: '', phone: '', username: '', password: '', profile: '' });
  };


  // ── Assign teacher ──
  const [assignForm, setAssignForm] = useState({ studentId: '', teacherId: '' });
  const assignTeacher = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/admin/assign-teacher`, { method: 'PUT', headers: authHeaders, body: JSON.stringify(assignForm) });
    const d = await res.json();
    showMsg(d.message); fetchAll();
  };

  const deleteItem = async (endpoint, id) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    await fetch(`${API}/${endpoint}/${id}`, { method: 'DELETE', headers: authHeaders });
    showMsg('Deleted successfully!'); fetchAll();
  };

  const pendingStudents = students.filter(s => !s.isApproved);
  const approvedStudents = students.filter(s => s.isApproved);

  const tabTitles = {
    dashboard: 'Admin Dashboard',
    students: 'Student Management',
    teachers: 'Teacher Management',
    subjects: 'Subjects & Units',
    combinations: "A' Level Combinations",
    materials: 'Notes & Resources',
    activities: 'Activities & Assessments',
    lessons: 'Live Lesson Schedules'
  };

  // ── Modal overlay style ──
  const modalOverlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
  };
  const modalCard = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
    padding: '28px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
  };

  return (
    <DashboardLayout title={tabTitles[tab]} navItems={NAV} activeTab={tab} onTabChange={setTab}>
      {msg && (
        <div style={{ padding: '12px 18px', background: 'var(--primary-glow)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.4)', marginBottom: '20px', color: 'var(--primary)', fontWeight: 500 }}>
          ✅ {msg}
        </div>
      )}

      {/* ─── VIEW STUDENT MODAL ─── */}
      {viewingStudent && (
        <div style={modalOverlay} onClick={() => setViewingStudent(null)}>
          <div style={{ ...modalCard, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                👤 Student Details: {viewingStudent.name}
              </div>
              <button onClick={() => setViewingStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Full Name</label>
                  <div style={{ fontWeight: 600, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    {viewingStudent.name}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Username</label>
                  <div style={{ fontWeight: 600, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    @{viewingStudent.username}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                  <div style={{ fontWeight: 600, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    {viewingStudent.phone}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Class / Level</label>
                  <div style={{ fontWeight: 600, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span className="badge badge-primary">{viewingStudent.level}</span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Account Status</label>
                  <div style={{ fontWeight: 600, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    {viewingStudent.isSuspended ? (
                      <span className="badge badge-warning" style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)' }}>🚫 Suspended</span>
                    ) : viewingStudent.isApproved ? (
                      <span className="badge badge-success">✅ Active</span>
                    ) : (
                      <span className="badge badge-warning">⏳ Pending Approval</span>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Assigned Facilitator</label>
                  <div style={{ fontWeight: 600, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    {viewingStudent.assignedTeacherId ? (
                      teachers.find(t => t.id == viewingStudent.assignedTeacherId)?.name || `ID: ${viewingStudent.assignedTeacherId}`
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None Assigned</span>
                    )}
                  </div>
                </div>
              </div>

              {/* A-Level Combinations Details */}
              {['S5', 'S6'].includes(viewingStudent.level) && (
                <div style={{ marginTop: '10px', padding: '16px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📚 A' Level Combination Details
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Combination Code: </span>
                      <span className="badge badge-success" style={{ fontSize: '0.85rem', marginLeft: '6px' }}>
                        {viewingStudent.combination || 'Not Configured'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Principal Subjects: </span>
                      <div style={{ fontSize: '0.88rem', fontWeight: 500, marginTop: '4px', paddingLeft: '8px', borderLeft: '3px solid var(--accent-emerald)' }}>
                        {renderStudentSubjects(viewingStudent.principalSubjects)}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Subsidiary Subjects: </span>
                      <div style={{ fontSize: '0.88rem', fontWeight: 500, marginTop: '4px', paddingLeft: '8px', borderLeft: '3px solid var(--accent-amber)' }}>
                        {renderStudentSubjects(viewingStudent.subsidiarySubjects)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setViewingStudent(null)} style={{ minWidth: '100px' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT USER MODAL ─── */}
      {editingUser && (
        <div style={modalOverlay} onClick={() => setEditingUser(null)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                ✏️ Edit {editingUser.role === 'teacher' ? 'Teacher' : 'Student'}: {editingUser.name}
              </div>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <InlineInput label="Full Name" value={editUserForm.name} onChange={v => setEditUserForm(p => ({ ...p, name: v }))} />
              <InlineInput label="Phone" value={editUserForm.phone} onChange={v => setEditUserForm(p => ({ ...p, phone: v }))} />
              {editingUser.role === 'teacher' && (
                <InlineInput label="Profile / Subjects Taught" value={editUserForm.profile} onChange={v => setEditUserForm(p => ({ ...p, profile: v }))} />
              )}
              {editingUser.role === 'student' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Class / Level</label>
                  <select className="select-field" value={editUserForm.level} onChange={e => setEditUserForm(p => ({ ...p, level: e.target.value }))}>
                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button className="btn btn-primary" onClick={saveEditUser} style={{ flex: 1 }}>
                  <Save size={15} /> Save Changes
                </button>
                <button className="btn btn-secondary" onClick={() => setEditingUser(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT MATERIAL MODAL ─── */}
      {editingMaterial && (
        <div style={modalOverlay} onClick={() => setEditingMaterial(null)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>✏️ Edit Material</div>
              <button onClick={() => setEditingMaterial(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <InlineInput label="Title" value={editMatForm.title} onChange={v => setEditMatForm(p => ({ ...p, title: v }))} />
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Type</label>
                <select className="select-field" value={editMatForm.type} onChange={e => setEditMatForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="notes">Study Notes</option>
                  <option value="support">Support Material</option>
                  <option value="resource">Extra Resources</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Visible to Class Level</label>
                <select className="select-field" value={editMatForm.classLevel} onChange={e => setEditMatForm(p => ({ ...p, classLevel: e.target.value, combination: '' }))}>
                  <option value="">All Classes (Public)</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {['S5', 'S6'].includes(editMatForm.classLevel) && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">A-Level Combination</label>
                  <select className="select-field" value={editMatForm.combination} onChange={e => setEditMatForm(p => ({ ...p, combination: e.target.value }))}>
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
              <InlineInput label="External URL (optional)" value={editMatForm.contentUrl} onChange={v => setEditMatForm(p => ({ ...p, contentUrl: v }))} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button className="btn btn-primary" onClick={saveEditMaterial} style={{ flex: 1 }}><Save size={15} /> Save</button>
                <button className="btn btn-secondary" onClick={() => setEditingMaterial(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT ACTIVITY MODAL ─── */}
      {editingActivity && (
        <div style={modalOverlay} onClick={() => setEditingActivity(null)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>✏️ Edit Activity</div>
              <button onClick={() => setEditingActivity(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <InlineInput label="Title" value={editActForm.title} onChange={v => setEditActForm(p => ({ ...p, title: v }))} />
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Instructions / Questions</label>
                <textarea className="textarea-field" rows={4} value={editActForm.instructions} onChange={e => setEditActForm(p => ({ ...p, instructions: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Level Type</label>
                <select className="select-field" value={editActForm.levelType} onChange={e => setEditActForm(p => ({ ...p, levelType: e.target.value }))}>
                  <option>Primary</option>
                  <option>O-Level</option>
                  <option>A-Level</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Target Class Level</label>
                <select className="select-field" value={editActForm.classLevel} onChange={e => setEditActForm(p => ({ ...p, classLevel: e.target.value, combination: '' }))}>
                  <option value="">All Classes</option>
                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {['S5', 'S6'].includes(editActForm.classLevel) && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">A-Level Combination</label>
                  <select className="select-field" value={editActForm.combination} onChange={e => setEditActForm(p => ({ ...p, combination: e.target.value }))}>
                    <option value="">All Combinations</option>
                    <option value="PCM">PCM</option>
                    <option value="BCM">BCM</option>
                    <option value="PCB">PCB</option>
                    <option value="PEM">PEM</option>
                    <option value="HEG">HEG</option>
                    <option value="MEG">MEG</option>
                    <option value="HEL">HEL</option>
                  </select>
                </div>
              )}
              <InlineInput label="Max Score" value={editActForm.maxScore} type="number" onChange={v => setEditActForm(p => ({ ...p, maxScore: v }))} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button className="btn btn-primary" onClick={saveEditActivity} style={{ flex: 1 }}><Save size={15} /> Save</button>
                <button className="btn btn-secondary" onClick={() => setEditingActivity(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── OVERVIEW DASHBOARD ─── */}
      {tab === 'dashboard' && (
        <>
          <div className="grid-container">
            {[
              { label: 'Pending Approvals', value: pendingStudents.length, color: 'var(--accent-amber)', icon: <Users size={22} /> },
              { label: 'Approved Students', value: approvedStudents.length, color: 'var(--accent-emerald)', icon: <CheckCircle size={22} /> },
              { label: 'Teachers', value: teachers.length, color: 'var(--primary)', icon: <UserCheck size={22} /> },
              { label: 'Subjects', value: subjects.length, color: 'var(--accent-rose)', icon: <BookOpen size={22} /> },
              { label: 'Materials', value: materials.length, color: 'var(--accent-emerald)', icon: <FileText size={22} /> },
              { label: 'Activities', value: activities.length, color: 'var(--accent-amber)', icon: <ClipboardList size={22} /> },
              { label: 'Live Lessons', value: lessons.length, color: 'var(--primary)', icon: <Video size={22} /> },
              { label: 'Feedbacks', value: feedbacks.length, color: 'var(--accent-rose)', icon: <MessageSquare size={22} /> },
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

          {pendingStudents.length > 0 && (
            <div className="glass-card" style={{ marginTop: '8px' }}>
              <div className="card-title" style={{ color: 'var(--accent-amber)' }}>
                ⏳ Pending Student Approvals ({pendingStudents.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingStudents.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>@{s.username} · {s.phone} · Class {s.level}</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => approveStudent(s.id)}>
                      <CheckCircle size={14} /> Approve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── STUDENTS ─── */}
      {tab === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Assign teacher */}
          <div className="glass-card">
            <div className="card-title">Assign Student to Teacher</div>
            <form onSubmit={assignTeacher} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select className="select-field" style={{ flex: 1, minWidth: '180px' }} value={assignForm.studentId} onChange={e => setAssignForm(p => ({ ...p, studentId: e.target.value }))} required>
                <option value="">Select Student</option>
                {approvedStudents.map(s => <option key={s.id} value={s.id}>{s.name} ({s.level})</option>)}
              </select>
              <select className="select-field" style={{ flex: 1, minWidth: '180px' }} value={assignForm.teacherId} onChange={e => setAssignForm(p => ({ ...p, teacherId: e.target.value }))} required>
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button className="btn btn-primary" type="submit">Assign</button>
            </form>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead><tr>
                <th>Name</th><th>Username</th><th>Phone</th><th>Class</th>
                <th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {students.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No students registered yet.</td></tr>
                )}
                {students.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>@{s.username}</td>
                    <td>{s.phone}</td>
                    <td><span className="badge badge-primary">{s.level}</span></td>
                    <td>
                      {s.isSuspended
                        ? <span className="badge badge-warning" style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' }}>🚫 Suspended</span>
                        : s.isApproved
                          ? <span className="badge badge-success">✅ Active</span>
                          : <span className="badge badge-warning">⏳ Pending</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {!s.isApproved && (
                          <button className="btn btn-primary btn-sm" onClick={() => approveStudent(s.id)} title="Approve">
                            <CheckCircle size={13} />
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setViewingStudent(s)}
                          title="View Details"
                          style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--primary)' }}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditUser(s)}
                          title="Edit"
                          style={{ padding: '4px 8px' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => suspendUser(s.id, s.isSuspended)}
                          title={s.isSuspended ? 'Unsuspend' : 'Suspend'}
                          style={{
                            padding: '4px 8px',
                            background: s.isSuspended ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            border: `1px solid ${s.isSuspended ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                            color: s.isSuspended ? 'var(--accent-emerald)' : 'var(--accent-amber)', cursor: 'pointer', borderRadius: '6px'
                          }}
                        >
                          {s.isSuspended ? <Shield size={13} /> : <ShieldOff size={13} />}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteUser(s.id, 'student')} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TEACHERS ─── */}
      {tab === 'teachers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ── Register Teacher toggle ── */}
          <div style={{ marginBottom: '8px' }}>
            <button
              className={`btn ${showForms.teacher ? 'btn-secondary' : 'btn-primary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => toggleForm('teacher')}
            >
              {showForms.teacher ? <X size={16} /> : <Plus size={16} />}
              {showForms.teacher ? 'Cancel' : '+ Register New Teacher'}
            </button>
          </div>

          {showForms.teacher && (
            <div className="glass-card" style={{ border: '1px solid rgba(99,102,241,0.3)', animation: 'slideUp 0.2s ease-out' }}>
              <div className="card-title" style={{ marginBottom: '20px' }}><Plus size={16} /> Register New Teacher</div>
              <form onSubmit={async (e) => { await addTeacher(e); closeForm('teacher'); }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Full Name</label>
                  <input className="input-field" placeholder="Teacher Full Name" value={tchForm.name} onChange={e => setTchForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Phone</label>
                  <input className="input-field" placeholder="+256 7XX XXX XXX" value={tchForm.phone} onChange={e => setTchForm(p => ({ ...p, phone: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Username</label>
                  <input className="input-field" placeholder="Unique username" value={tchForm.username} onChange={e => setTchForm(p => ({ ...p, username: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Password</label>
                  <input className="input-field" type="password" placeholder="Min. 6 chars" value={tchForm.password} onChange={e => setTchForm(p => ({ ...p, password: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label">Profile / Subjects Taught</label>
                  <input className="input-field" placeholder="e.g. Mathematics, Physics (S1–S4)" value={tchForm.profile} onChange={e => setTchForm(p => ({ ...p, profile: e.target.value }))} />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" type="submit" style={{ flex: 1 }}><Plus size={16} /> Add Teacher</button>
                  <button className="btn btn-secondary" type="button" onClick={() => closeForm('teacher')} style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="table-container">
            <table className="custom-table">
              <thead><tr>
                <th>Name</th><th>Username</th><th>Phone</th><th>Profile</th>
                <th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {teachers.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No teachers registered yet.</td></tr>
                )}
                {teachers.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>@{t.username}</td>
                    <td>{t.phone}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.profile || '—'}</td>
                    <td>
                      {t.isSuspended
                        ? <span className="badge badge-warning" style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)' }}>🚫 Suspended</span>
                        : <span className="badge badge-success">✅ Active</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditUser(t)} title="Edit" style={{ padding: '4px 8px' }}>
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => suspendUser(t.id, t.isSuspended)}
                          title={t.isSuspended ? 'Unsuspend' : 'Suspend'}
                          style={{
                            padding: '4px 8px',
                            background: t.isSuspended ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            border: `1px solid ${t.isSuspended ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                            color: t.isSuspended ? 'var(--accent-emerald)' : 'var(--accent-amber)', cursor: 'pointer', borderRadius: '6px'
                          }}
                        >
                          {t.isSuspended ? <Shield size={13} /> : <ShieldOff size={13} />}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteUser(t.id, 'teacher')} title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── SUBJECTS ─── */}
      {tab === 'subjects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ── Add Subject toggle ── */}
          <div style={{ marginBottom: '8px' }}>
            <button
              className={`btn ${showForms.subject || editingSubject ? 'btn-secondary' : 'btn-primary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => {
                if (editingSubject) { setEditingSubject(null); setSubForm({ name: '', level: 'Primary', description: '', category: 'Both', code: '', classification: '' }); }
                else toggleForm('subject');
              }}
            >
              {showForms.subject || editingSubject ? <X size={16} /> : <Plus size={16} />}
              {editingSubject ? 'Cancel Edit' : showForms.subject ? 'Cancel' : '+ Add Subject'}
            </button>
          </div>

          {(showForms.subject || editingSubject) && (
            <div className="glass-card" style={{ border: '1px solid rgba(99,102,241,0.3)', animation: 'slideUp 0.2s ease-out' }}>
              <div className="card-title" style={{ marginBottom: '20px' }}>
                {editingSubject ? '✏️ Edit Subject Details' : <><Plus size={16} /> Add Subject</>}
              </div>
              <form onSubmit={async (e) => { await addSubject(e); if (!editingSubject) closeForm('subject'); }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Subject Name</label>
                  <input className="input-field" placeholder="e.g. Mathematics" value={subForm.name} onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Subject Code</label>
                  <input className="input-field" placeholder="e.g. M101, 553" value={subForm.code} onChange={e => setSubForm(p => ({ ...p, code: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Level</label>
                  <select className="select-field" value={subForm.level} onChange={e => setSubForm(p => ({ ...p, level: e.target.value, classification: '' }))}>
                    <option value="Primary">Primary</option>
                    <option value="O-Level">O-Level</option>
                    <option value="A-Level">A-Level</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Group / Category</label>
                  <select className="select-field" value={subForm.category} onChange={e => setSubForm(p => ({ ...p, category: e.target.value }))}>
                    <option value="Both">Both (General)</option>
                    <option value="Art">Art (Humanities)</option>
                    <option value="Science">Science</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  {subForm.level === 'O-Level' ? (
                    <>
                      <label className="form-label">O-Level Classification</label>
                      <select className="select-field" value={subForm.classification} onChange={e => setSubForm(p => ({ ...p, classification: e.target.value }))} required>
                        <option value="">Select Option</option>
                        <option value="Compulsory">Compulsory</option>
                        <option value="Optional">Optional</option>
                      </select>
                    </>
                  ) : subForm.level === 'A-Level' ? (
                    <>
                      <label className="form-label">A-Level Classification</label>
                      <select className="select-field" value={subForm.classification} onChange={e => setSubForm(p => ({ ...p, classification: e.target.value }))} required>
                        <option value="">Select Option</option>
                        <option value="Principal">Principal Subject</option>
                        <option value="Subsidiary">Subsidiary Subject</option>
                      </select>
                    </>
                  ) : (
                    <div />
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label">Description</label>
                  <input className="input-field" placeholder="Short description..." value={subForm.description} onChange={e => setSubForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>
                    {editingSubject ? 'Save Changes' : 'Add Subject'}
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => { setEditingSubject(null); setSubForm({ name: '', level: 'Primary', description: '', category: 'Both', code: '', classification: '' }); closeForm('subject'); }} style={{ flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List Controls & Filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '14px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['All', 'Primary', 'O-Level', 'A-Level'].map(lvl => (
                <button key={lvl} className={`btn btn-sm ${subjectFilter === lvl ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSubjectFilter(lvl)}>
                  {lvl}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-danger btn-sm" disabled={selectedSubjects.length === 0} onClick={() => handleBulkDelete('selected')}>
                🗑️ Delete Selected ({selectedSubjects.length})
              </button>
              <button className="btn btn-danger btn-sm" style={{ background: 'var(--accent-rose)' }} onClick={() => handleBulkDelete('all')}>
                🚨 Delete All Subjects
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input type="checkbox" checked={allSelectedOnFiltered} onChange={() => toggleSelectAllSubjects(filteredSubjects)} />
                  </th>
                  <th>Code</th><th>Subject</th><th>Level</th><th>Group</th><th>Type</th><th>Description</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No subjects found matching filters.</td></tr>
                )}
                {filteredSubjects.map(s => (
                  <tr key={s.id} style={{ background: selectedSubjects.includes(s.id) ? 'rgba(99,102,241,0.05)' : 'none' }}>
                    <td>
                      <input type="checkbox" checked={selectedSubjects.includes(s.id)} onChange={() => toggleSelectSubject(s.id)} />
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.code || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td><span className="badge badge-primary">{s.level}</span></td>
                    <td>
                      <span className={`badge ${s.category === 'Science' ? 'badge-success' : s.category === 'Art' ? 'badge-warning' : 'badge-primary'}`}>
                        {s.category || 'Both'}
                      </span>
                    </td>
                    <td>
                      {s.classification ? (
                        <span className="badge badge-success" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-emerald)', border: '1px solid rgba(16,185,129,0.2)' }}>
                          {s.classification}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.description || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => editSubject(s)} style={{ padding: '4px 8px' }}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteItem('subjects', s.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MATERIALS ─── */}
      {tab === 'materials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ── Upload Material toggle ── */}
          <div style={{ marginBottom: '8px' }}>
            <button
              className={`btn ${showForms.material ? 'btn-secondary' : 'btn-primary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => toggleForm('material')}
            >
              {showForms.material ? <X size={16} /> : <Plus size={16} />}
              {showForms.material ? 'Cancel' : '+ Upload Note / Resource'}
            </button>
          </div>

          {showForms.material && (
            <div className="glass-card" style={{ border: '1px solid rgba(99,102,241,0.3)', animation: 'slideUp 0.2s ease-out' }}>
              <div className="card-title" style={{ marginBottom: '20px' }}><Plus size={16} /> Upload Note / Resource</div>
              <form onSubmit={async (e) => { await addMaterial(e); closeForm('material'); }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Title</label>
                  <input className="input-field" placeholder="e.g. P6 Science Term 2 Notes" value={matForm.title} onChange={e => setMatForm(p => ({ ...p, title: e.target.value }))} required />
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
                    <label className="form-label">A-Level Combination (leave empty for all combinations)</label>
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
                  <input id="admin-file-upload" type="file" className="input-field"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.mkv,.webm,.avi"
                    onChange={handleMaterialFileChange} style={{ paddingTop: '10px' }} />
                  {matForm.fileName && (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ✅ Selected: <strong>{matForm.fileName}</strong>
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label">OR Content URL / External Link (optional)</label>
                  <input className="input-field" placeholder="https://drive.google.com/..." value={matForm.contentUrl} onChange={e => setMatForm(p => ({ ...p, contentUrl: e.target.value }))} />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" type="submit" style={{ flex: 1 }}><Plus size={16} /> Upload Material</button>
                  <button className="btn btn-secondary" type="button" onClick={() => closeForm('material')} style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div className="table-container">
            <table className="custom-table">
              <thead><tr><th>Title</th><th>Type</th><th>Subject</th><th>Level</th><th>Combo</th><th>File/Link</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {materials.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No materials uploaded yet.</td></tr>}
                {materials.map(m => (
                  <tr key={m.id} style={{ opacity: m.isBlocked ? 0.6 : 1 }}>
                    <td style={{ fontWeight: 600 }}>{m.title}</td>
                    <td><span className="badge badge-primary">{m.type}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{subjects.find(s => s.id == m.subjectId)?.name || '—'}</td>
                    <td>{m.classLevel ? <span className="badge badge-success">{m.classLevel}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>All</span>}</td>
                    <td>{m.combination ? <span className="badge badge-warning">{m.combination}</span> : '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {m.fileData
                        ? <a href={m.fileData} download={m.fileName} style={{ color: 'var(--accent-emerald)' }}>⬇ {m.fileName}</a>
                        : m.contentUrl
                          ? <a href={m.contentUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Open Link</a>
                          : '—'}
                    </td>
                    <td>
                      {m.isBlocked
                        ? <span className="badge" style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)', fontSize: '0.72rem' }}>🔒 Blocked</span>
                        : <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>✅ Visible</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditMaterial(m)} title="Edit" style={{ padding: '4px 8px' }}>
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => toggleBlockMaterial(m.id, m.isBlocked)}
                          title={m.isBlocked ? 'Unblock' : 'Block'}
                          style={{
                            padding: '4px 8px', cursor: 'pointer', borderRadius: '6px',
                            background: m.isBlocked ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.1)',
                            border: `1px solid ${m.isBlocked ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                            color: m.isBlocked ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                          }}
                        >
                          {m.isBlocked ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteItem('materials', m.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ACTIVITIES ─── */}
      {tab === 'activities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ── Create Activity toggle ── */}
          <div style={{ marginBottom: '8px' }}>
            <button
              className={`btn ${showForms.activity ? 'btn-secondary' : 'btn-primary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => toggleForm('activity')}
            >
              {showForms.activity ? <X size={16} /> : <Plus size={16} />}
              {showForms.activity ? 'Cancel' : '+ Create Activity / Assessment'}
            </button>
          </div>

          {showForms.activity && (
            <div className="glass-card" style={{ border: '1px solid rgba(99,102,241,0.3)', animation: 'slideUp 0.2s ease-out' }}>
              <div className="card-title" style={{ marginBottom: '20px' }}><Plus size={16} /> Create Activity / Assessment</div>
              <form onSubmit={async (e) => { await addActivity(e); closeForm('activity'); }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Activity Title</label>
                  <input className="input-field" placeholder="e.g. Term 1 Mid-Term Science Quiz" value={actForm.title} onChange={e => setActForm(p => ({ ...p, title: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Level Type</label>
                  <select className="select-field" value={actForm.levelType} onChange={e => setActForm(p => ({ ...p, levelType: e.target.value }))}>
                    <option>Primary</option>
                    <option>O-Level</option>
                    <option>A-Level</option>
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
                  <label className="form-label">Max Score {actForm.levelType === 'O-Level' ? '(1=Basic, 2=Achieving, 3=Advanced)' : '(out of 100)'}</label>
                  <input className="input-field" type="number" value={actForm.maxScore} onChange={e => setActForm(p => ({ ...p, maxScore: e.target.value }))} min={1} max={actForm.levelType === 'O-Level' ? 3 : 100} required />
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
                        <option value="PCM">PCM</option><option value="BCM">BCM</option>
                        <option value="PCB">PCB</option><option value="PEM">PEM</option>
                        <option value="HEG">HEG</option><option value="MEG">MEG</option>
                        <option value="HEL">HEL</option>
                      </select>
                    </>
                  ) : <div />}
                </div>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label">Instructions / Questions</label>
                  <textarea className="textarea-field" rows={4} placeholder="Write the activity instructions or questions here..." value={actForm.instructions} onChange={e => setActForm(p => ({ ...p, instructions: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label">📎 Attach File (PDF or Word — optional)</label>
                  <input id="admin-activity-file" type="file" className="input-field" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={handleActivityFileChange} style={{ paddingTop: '10px' }} />
                  {actForm.fileName && (
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
                      ✅ Attached: <strong>{actForm.fileName}</strong>
                    </div>
                  )}
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" type="submit" style={{ flex: 1 }}><Plus size={16} /> Create Activity</button>
                  <button className="btn btn-secondary" type="button" onClick={() => closeForm('activity')} style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div className="table-container">
            <table className="custom-table">
              <thead><tr><th>Title</th><th>Level Type</th><th>Subject</th><th>Class</th><th>Combo</th><th>File</th><th>Score</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {activities.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No activities created yet.</td></tr>}
                {activities.map(a => (
                  <tr key={a.id} style={{ opacity: a.isBlocked ? 0.6 : 1 }}>
                    <td style={{ fontWeight: 600 }}>{a.title}</td>
                    <td><span className="badge badge-primary">{a.levelType}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{subjects.find(s => s.id == a.subjectId)?.name || '—'}</td>
                    <td>{a.classLevel ? <span className="badge badge-success">{a.classLevel}</span> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>All</span>}</td>
                    <td>{a.combination ? <span className="badge badge-warning">{a.combination}</span> : '—'}</td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {a.fileData ? <a href={a.fileData} download={a.fileName} style={{ color: 'var(--accent-emerald)' }}>⬇ {a.fileName}</a> : '—'}
                    </td>
                    <td>{a.maxScore}</td>
                    <td>
                      {a.isBlocked
                        ? <span className="badge" style={{ background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)', fontSize: '0.72rem' }}>🔒 Blocked</span>
                        : <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>✅ Visible</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditActivity(a)} title="Edit" style={{ padding: '4px 8px' }}>
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => toggleBlockActivity(a.id, a.isBlocked)}
                          title={a.isBlocked ? 'Unblock' : 'Block'}
                          style={{
                            padding: '4px 8px', cursor: 'pointer', borderRadius: '6px',
                            background: a.isBlocked ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.1)',
                            border: `1px solid ${a.isBlocked ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
                            color: a.isBlocked ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                          }}
                        >
                          {a.isBlocked ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteItem('activities', a.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── LESSONS ─── */}
      {tab === 'lessons' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ── Schedule Lesson toggle ── */}
          <div style={{ marginBottom: '8px' }}>
            <button
              className={`btn ${showForms.lesson ? 'btn-secondary' : 'btn-primary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => toggleForm('lesson')}
            >
              {showForms.lesson ? <X size={16} /> : <Plus size={16} />}
              {showForms.lesson ? 'Cancel' : '+ Schedule Live Lesson'}
            </button>
          </div>

          {showForms.lesson && (
            <div className="glass-card" style={{ border: '1px solid rgba(99,102,241,0.3)', animation: 'slideUp 0.2s ease-out' }}>
              <div className="card-title" style={{ marginBottom: '20px' }}><Plus size={16} /> Schedule Live Lesson</div>
              <form onSubmit={async (e) => { await addLesson(e); closeForm('lesson'); }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Lesson Title</label>
                  <input className="input-field" placeholder="e.g. S3 Biology Live Revision" value={lesForm.title} onChange={e => setLesForm(p => ({ ...p, title: e.target.value }))} required />
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
                  <label className="form-label">Meet Link (Zoom / Google Meet)</label>
                  <input className="input-field" placeholder="https://meet.google.com/..." value={lesForm.meetUrl} onChange={e => setLesForm(p => ({ ...p, meetUrl: e.target.value }))} required />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" type="submit" style={{ flex: 1 }}><Plus size={16} /> Schedule Lesson</button>
                  <button className="btn btn-secondary" type="button" onClick={() => closeForm('lesson')} style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            </div>
          )}
          <div className="table-container">
            <table className="custom-table">
              <thead><tr><th>Title</th><th>Class</th><th>Subject</th><th>Schedule</th><th>Link</th><th>Action</th></tr></thead>
              <tbody>
                {lessons.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No lessons scheduled yet.</td></tr>}
                {lessons.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.title}</td>
                    <td><span className="badge badge-primary">{l.level}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{subjects.find(s => s.id == l.subjectId)?.name || '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(l.scheduleTime).toLocaleString()}</td>
                    <td><a href={l.meetUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>Join</a></td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => deleteItem('lessons', l.id)}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ─── A' LEVEL COMBINATIONS ─── */}
      {tab === 'combinations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* ── Add/Edit Combination toggle ── */}
          <div style={{ marginBottom: '8px' }}>
            <button
              className={`btn ${showForms.combination || editingCombination ? 'btn-secondary' : 'btn-primary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => {
                if (editingCombination) {
                  setEditingCombination(null);
                  setCombForm({ code: '', name: '', subjectIds: [] });
                } else {
                  toggleForm('combination');
                }
              }}
            >
              {showForms.combination || editingCombination ? <X size={16} /> : <Plus size={16} />}
              {editingCombination ? 'Cancel Edit' : showForms.combination ? 'Cancel' : "+ Add Combination"}
            </button>
          </div>

          {(showForms.combination || editingCombination) && (
            <div className="glass-card" style={{ border: '1px solid rgba(99,102,241,0.3)', animation: 'slideUp 0.2s ease-out' }}>
              <div className="card-title" style={{ marginBottom: '20px' }}>
                {editingCombination ? '✏️ Edit A\' Level Combination' : <><Plus size={16} /> Add A\' Level Combination</>}
              </div>
              <form onSubmit={saveCombination} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Combination Code</label>
                    <input className="input-field" placeholder="e.g. PCM" value={combForm.code} onChange={e => setCombForm(p => ({ ...p, code: e.target.value }))} required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Full Name</label>
                    <input className="input-field" placeholder="e.g. Physics, Chemistry, Math" value={combForm.name} onChange={e => setCombForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ marginBottom: '8px' }}>Select Exactly 3 Principal Subjects ({combForm.subjectIds.length}/3 selected)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    {subjects
                      .filter(s => s.level === 'A-Level' && s.classification === 'Principal')
                      .map(sub => {
                        const isSelected = combForm.subjectIds.includes(sub.id);
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleToggleSubjectInCombForm(sub.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '20px',
                              border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                              background: isSelected ? 'rgba(99,102,241,0.15)' : 'none',
                              color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                              cursor: 'pointer',
                              fontSize: '0.82rem',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {isSelected ? '✅' : '➕'} {sub.name} {sub.code ? `(${sub.code})` : ''}
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>
                    {editingCombination ? 'Save Changes' : 'Create Combination'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => {
                      setEditingCombination(null);
                      setCombForm({ code: '', name: '', subjectIds: [] });
                      closeForm('combination');
                    }}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Full Name</th>
                  <th>Core Principal Subjects</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {combinations.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                      No A' Level combinations created yet.
                    </td>
                  </tr>
                )}
                {combinations.map(comb => (
                  <tr key={comb.id}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>{comb.code}</td>
                    <td style={{ fontWeight: 600 }}>{comb.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {renderStudentSubjects(comb.subjectIds)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => startEditCombination(comb)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteCombination(comb.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* ─── SCHOOL SUBSCRIPTION / ACTIVATION KEY ─── */}
      {tab === 'subscription' && (
        <div style={{ maxWidth: '580px', margin: '0 auto', width: '100%' }}>
          <div className="glass-card" style={{ border: '1px solid rgba(99, 102, 241, 0.25)', padding: '28px' }}>
            <div className="card-title" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
              <Key size={22} style={{ color: 'var(--primary)' }} /> Renew School Platform Subscription
            </div>
            <p className="card-subtitle" style={{ marginBottom: '24px', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Enter a valid term activation key generated by the Super-Admin to extend your school's trial or active subscription (UGX 500,000 / term).
            </p>

            <form onSubmit={handleApplyKey} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Activation Key Code</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. ALINDA-XXXX-XXXX"
                  value={activationKey}
                  onChange={e => setActivationKey(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <button className="btn btn-primary" type="submit" disabled={keyLoading} style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}>
                <Key size={18} /> {keyLoading ? 'Applying Key...' : 'Activate / Extend Subscription'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── SECURITY / CHANGE PASSWORD ─── */}
      {tab === 'security' && (
        <div style={{ maxWidth: '580px', margin: '0 auto', width: '100%' }}>
          <div className="glass-card" style={{ border: '1px solid rgba(99, 102, 241, 0.25)', padding: '28px' }}>
            <div className="card-title" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem' }}>
              <Key size={22} style={{ color: 'var(--primary)' }} /> Administrator Password & Security
            </div>
            <p className="card-subtitle" style={{ marginBottom: '24px', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.5' }}>
              Update your account password below. Choose a strong, unique password to ensure admin platform security.
            </p>

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Enter current password"
                    value={passForm.currentPassword}
                    onChange={e => setPassForm(p => ({ ...p, currentPassword: e.target.value }))}
                    style={{ paddingRight: '42px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(p => !p)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                  >
                    {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    className="input-field"
                    placeholder="At least 6 characters"
                    value={passForm.newPassword}
                    onChange={e => setPassForm(p => ({ ...p, newPassword: e.target.value }))}
                    style={{ paddingRight: '42px' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(p => !p)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                  >
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Re-enter new password"
                  value={passForm.confirmPassword}
                  onChange={e => setPassForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  required
                />
              </div>

              <button className="btn btn-primary" type="submit" disabled={passLoading} style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}>
                <Save size={16} /> {passLoading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

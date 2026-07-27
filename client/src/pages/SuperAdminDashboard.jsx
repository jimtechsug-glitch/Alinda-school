import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Building2, Users, UserCheck, DollarSign, Shield, Key,
  Plus, Trash2, Edit2, ShieldOff, Eye, Ban, CheckCircle, FileText,
  ClipboardList, Video, X, Lock, EyeOff, Search, Filter, RefreshCw, MessageSquare, Bot
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth, API } from '../App';

export default function SuperAdminDashboard() {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [msg, setMsg] = useState('');

  // Data states
  const [tenants, setTenants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [keys, setKeys] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [activities, setActivities] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('ALL');

  // Modal control states (BUTTONS INSTEAD OF OPEN FORMS)
  const [showCreateSchoolModal, setShowCreateSchoolModal] = useState(false);
  const [showGenerateKeysModal, setShowGenerateKeysModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(null); // holds target tenant object
  const [editingUser, setEditingUser] = useState(null); // holds user to edit
  const [editingContent, setEditingContent] = useState(null); // holds material/activity/lesson to edit

  // Form states
  const [schoolForm, setSchoolForm] = useState({ name: '', trialDays: 14 });
  const [keyForm, setKeyForm] = useState({ count: 1, price: 500000, durationDays: 90 });
  const [adminForm, setAdminForm] = useState({ name: '', phone: '', username: '', password: '' });
  const [userEditForm, setUserEditForm] = useState({ name: '', phone: '', profile: '', level: '' });
  const [contentEditForm, setContentEditForm] = useState({ title: '', contentUrl: '', classLevel: '' });
  const [chatForm, setChatForm] = useState({ keyword: '', response: '' });
  const [showChatbotForm, setShowChatbotForm] = useState(false);

  // Password change state
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const NAV = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'platforms', label: 'School Platforms', icon: <Building2 size={18} /> },
    { id: 'students', label: 'Students Control', icon: <Users size={18} /> },
    { id: 'teachers', label: 'Teachers Control', icon: <UserCheck size={18} /> },
    { id: 'content', label: 'Content & Resources', icon: <FileText size={18} /> },
    { id: 'feedbacks', label: 'Guest Feedbacks', icon: <MessageSquare size={18} /> },
    { id: 'chatbot', label: 'Chatbot Rules', icon: <Bot size={18} /> },
    { id: 'revenue', label: 'Revenue & Subscriptions', icon: <DollarSign size={18} /> },
    { id: 'security', label: 'Security & Password', icon: <Key size={18} /> },
  ];

  const showToast = (m) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [tRes, uRes, kRes, mRes, aRes, lRes] = await Promise.all([
        fetch(`${API}/superadmin/tenants`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
        fetch(`${API}/admin/users`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
        fetch(`${API}/superadmin/activation-keys`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
        fetch(`${API}/materials`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
        fetch(`${API}/activities`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
        fetch(`${API}/lessons`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
        fetch(`${API}/superadmin/feedbacks`, { headers: authHeaders }).then(r => r.json()).catch(() => []),
      ]);
      setTenants(Array.isArray(tRes) ? tRes : []);
      setAllUsers(Array.isArray(uRes) ? uRes : []);
      setKeys(Array.isArray(kRes) ? kRes : []);
      setMaterials(Array.isArray(mRes) ? mRes : []);
      setActivities(Array.isArray(aRes) ? aRes : []);
      setLessons(Array.isArray(lRes) ? lRes : []);
      setFeedbacks(Array.isArray(fRes) ? fRes : []);
    } catch (err) {
      showToast('Error loading master data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, [tab]);

  // Derived user subsets
  const students = allUsers.filter(u => u.role === 'student');
  const teachers = allUsers.filter(u => u.role === 'teacher');
  const admins = allUsers.filter(u => u.role === 'admin');

  // Helper mapping
  const getTenantName = (tId) => {
    if (!tId) return 'Default Legacy School';
    const t = tenants.find(x => x.id == tId);
    return t ? t.name : 'Default Legacy School';
  };

  // Actions: Platform creation
  const handleCreateSchool = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/superadmin/tenants`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(schoolForm)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to create platform');
      showToast(`✨ School Platform Created! Invite Code: ${d.tenant.inviteCode}`);
      setSchoolForm({ name: '', trialDays: 14 });
      setShowCreateSchoolModal(false);
      fetchAllData();
    } catch (err) {
      showToast(err.message);
    }
  };

  // Actions: Admin creation for platform
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!showCreateAdminModal) return;
    try {
      const res = await fetch(`${API}/superadmin/tenants/${showCreateAdminModal.id}/admin`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(adminForm)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to create admin');
      showToast(`👤 Platform Admin created for ${showCreateAdminModal.name}`);
      setAdminForm({ name: '', phone: '', username: '', password: '' });
      setShowCreateAdminModal(null);
      fetchAllData();
    } catch (err) {
      showToast(err.message);
    }
  };

  // Actions: Generate keys
  const handleGenerateKeys = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/superadmin/activation-keys`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(keyForm)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to generate keys');
      showToast(`🔑 ${keyForm.count} Activation Keys generated successfully!`);
      setShowGenerateKeysModal(false);
      fetchAllData();
    } catch (err) {
      showToast(err.message);
    }
  };

  // User Actions: Suspend, Delete, Edit
  const handleSuspendUser = async (uId, currentSuspended) => {
    const act = currentSuspended ? 'unsuspend' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${act} this user account across the system?`)) return;
    try {
      const res = await fetch(`${API}/admin/users/${uId}/suspend`, { method: 'PUT', headers: authHeaders });
      const d = await res.json();
      showToast(d.message || `User ${act}ed`);
      fetchAllData();
    } catch (err) {
      showToast('Suspend action failed');
    }
  };

  const handleDeleteUser = async (uId, roleName) => {
    if (!window.confirm(`PERMANENT ACTION: Delete this ${roleName} account from the system?`)) return;
    try {
      const res = await fetch(`${API}/admin/users/${uId}`, { method: 'DELETE', headers: authHeaders });
      const d = await res.json();
      showToast(d.message || 'User deleted');
      fetchAllData();
    } catch (err) {
      showToast('Delete user failed');
    }
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(userEditForm)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'User update failed');
      showToast('User account updated successfully');
      setEditingUser(null);
      fetchAllData();
    } catch (err) {
      showToast(err.message);
    }
  };

  // Content Actions: Block/Unblock & Delete
  const handleBlockMaterial = async (mId, currentBlocked) => {
    try {
      const res = await fetch(`${API}/materials/${mId}/block`, { method: 'PUT', headers: authHeaders });
      const d = await res.json();
      showToast(d.message || 'Material block state updated');
      fetchAllData();
    } catch (err) {
      showToast('Material block failed');
    }
  };

  const handleDeleteMaterial = async (mId) => {
    if (!window.confirm('Delete this study material/note from the platform?')) return;
    try {
      const res = await fetch(`${API}/materials/${mId}`, { method: 'DELETE', headers: authHeaders });
      showToast('Material deleted');
      fetchAllData();
    } catch (err) {
      showToast('Delete material failed');
    }
  };

  const handleBlockActivity = async (aId) => {
    try {
      const res = await fetch(`${API}/activities/${aId}/block`, { method: 'PUT', headers: authHeaders });
      const d = await res.json();
      showToast(d.message || 'Activity block state updated');
      fetchAllData();
    } catch (err) {
      showToast('Activity block failed');
    }
  };

  const handleDeleteActivity = async (aId) => {
    if (!window.confirm('Delete this activity from the platform?')) return;
    try {
      const res = await fetch(`${API}/activities/${aId}`, { method: 'DELETE', headers: authHeaders });
      showToast('Activity deleted');
      fetchAllData();
    } catch (err) {
      showToast('Delete activity failed');
    }
  };

  const handleDeleteLesson = async (lId) => {
    if (!window.confirm('Delete this scheduled live lesson link?')) return;
    try {
      const res = await fetch(`${API}/lessons/${lId}`, { method: 'DELETE', headers: authHeaders });
      showToast('Live lesson deleted');
      fetchAllData();
    } catch (err) {
      showToast('Delete lesson failed');
    }
  };

  const handleAddChatRule = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/superadmin/chatbot`, { method: 'POST', headers: authHeaders, body: JSON.stringify(chatForm) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to save rule');
      showToast(d.message);
      setChatForm({ keyword: '', response: '' });
      setShowChatbotForm(false);
    } catch (err) {
      showToast(err.message);
    }
  };

  // Password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      return showToast('Passwords do not match');
    }
    setPassLoading(true);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(passForm)
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to change password');
      showToast('SuperAdmin password updated successfully');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const totalRevenue = tenants.reduce((acc, t) => acc + (t.revenueGenerated || 0), 0);

  return (
    <DashboardLayout
      title="Master SuperAdmin System Control"
      navItems={NAV}
      activeTab={tab}
      onTabChange={setTab}
    >
      {/* Toast Alert Banner */}
      {msg && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          background: 'var(--primary)', color: '#fff', padding: '12px 20px',
          borderRadius: 'var(--radius-md)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span>⚡ {msg}</span>
        </div>
      )}

      {/* ─── TAB 1: DASHBOARD OVERVIEW ─── */}
      {tab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>SCHOOL PLATFORMS</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }}>{tenants.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>Active Multi-Tenant Systems</div>
            </div>

            <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent-amber)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>TOTAL STUDENTS</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }}>{students.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered across all schools</div>
            </div>

            <div className="glass-card stat-card" style={{ borderLeft: '4px solid #9b59b6' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>TOTAL TEACHERS</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0' }}>{teachers.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>School Facilitators</div>
            </div>

            <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>TOTAL PLATFORM REVENUE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-emerald)', margin: '4px 0' }}>UGX {totalRevenue.toLocaleString()}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subscription Rate: 500,000 / Term</div>
            </div>
          </div>

          {/* Action Buttons Hub (NO OPEN FORMS) */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ SuperAdmin Master Quick Actions
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowCreateSchoolModal(true)}
                style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Plus size={18} /> + Generate New School Platform
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={() => setShowGenerateKeysModal(true)}
                style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: 'var(--accent-amber)' }}
              >
                <Key size={18} /> 🔑 Generate Activation Keys
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={() => setTab('platforms')}
                style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Building2 size={18} /> Manage Platforms ({tenants.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SCHOOL PLATFORMS ─── */}
      {tab === 'platforms' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Bar with ACTION BUTTON (No open forms) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>🏫 Registered School Platforms</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Create platforms, view unique invite codes, assign school admins, and track trials.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowCreateSchoolModal(true)}>
              <Plus size={18} /> + Generate New School Platform
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>School Platform Name</th>
                  <th>Invite Code</th>
                  <th>Status</th>
                  <th>Trial Expiry</th>
                  <th>Revenue (UGX)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No school platforms registered yet. Click the button above to generate one.</td></tr>
                ) : (
                  tenants.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 700 }}>{t.name}</td>
                      <td>
                        <code style={{ background: 'rgba(99,102,241,0.15)', padding: '4px 10px', borderRadius: '6px', color: 'var(--primary)', fontWeight: 700 }}>
                          {t.inviteCode}
                        </code>
                      </td>
                      <td>
                        <span className={`badge ${t.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{t.trialEndDate ? new Date(t.trialEndDate).toLocaleDateString() : 'N/A'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                        {(t.revenueGenerated || 0).toLocaleString()}
                      </td>
                      <td>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setShowCreateAdminModal(t)}
                          style={{ padding: '6px 12px', background: 'rgba(155,89,182,0.15)', border: '1px solid rgba(155,89,182,0.4)', color: '#9b59b6' }}
                        >
                          + Add School Admin
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: STUDENTS CONTROL ─── */}
      {tab === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>🎓 Master Students Control</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>SuperAdmin override to edit, suspend, or delete students across all platforms.</p>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Username / Phone</th>
                  <th>School Platform</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No students registered in the system.</td></tr>
                ) : (
                  students.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td>@{s.username} <br/><small style={{ color: 'var(--text-muted)' }}>{s.phone}</small></td>
                      <td><span className="badge badge-secondary">{getTenantName(s.tenantId)}</span></td>
                      <td><span className="badge badge-primary">{s.level || 'Unassigned'}</span></td>
                      <td>
                        {s.isSuspended ? (
                          <span className="badge badge-danger">🚫 Suspended</span>
                        ) : s.isApproved ? (
                          <span className="badge badge-success">✅ Active</span>
                        ) : (
                          <span className="badge badge-warning">⏳ Pending</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditingUser(s); setUserEditForm({ name: s.name, phone: s.phone, profile: s.profile || '', level: s.level || '' }); }}>
                            <Edit2 size={14} /> Edit
                          </button>
                          <button 
                            className="btn btn-sm"
                            onClick={() => handleSuspendUser(s.id, s.isSuspended)}
                            style={{ background: s.isSuspended ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: s.isSuspended ? 'var(--accent-emerald)' : 'var(--accent-amber)', border: '1px solid var(--border)' }}
                          >
                            {s.isSuspended ? <Shield size={14} /> : <ShieldOff size={14} />} {s.isSuspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(s.id, 'student')}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 4: TEACHERS CONTROL ─── */}
      {tab === 'teachers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>👨‍🏫 Master Teachers & Facilitators Control</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>SuperAdmin override to manage, edit, suspend, or delete teachers across all platforms.</p>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Teacher Name</th>
                  <th>Username / Phone</th>
                  <th>School Platform</th>
                  <th>Profile / Subjects</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No teachers registered in the system.</td></tr>
                ) : (
                  teachers.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td>@{t.username} <br/><small style={{ color: 'var(--text-muted)' }}>{t.phone}</small></td>
                      <td><span className="badge badge-secondary">{getTenantName(t.tenantId)}</span></td>
                      <td>{t.profile || 'Facilitator'}</td>
                      <td>
                        {t.isSuspended ? (
                          <span className="badge badge-danger">🚫 Suspended</span>
                        ) : (
                          <span className="badge badge-success">✅ Active</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditingUser(t); setUserEditForm({ name: t.name, phone: t.phone, profile: t.profile || '', level: '' }); }}>
                            <Edit2 size={14} /> Edit
                          </button>
                          <button 
                            className="btn btn-sm"
                            onClick={() => handleSuspendUser(t.id, t.isSuspended)}
                            style={{ background: t.isSuspended ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: t.isSuspended ? 'var(--accent-emerald)' : 'var(--accent-amber)', border: '1px solid var(--border)' }}
                          >
                            {t.isSuspended ? <Shield size={14} /> : <ShieldOff size={14} />} {t.isSuspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(t.id, 'teacher')}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 5: CONTENT CONTROL (NOTES, ACTIVITIES, LESSONS) ─── */}
      {tab === 'content' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>📚 Master Content & Academic Resources Control</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>View, block/unblock, or delete study notes, activities, and live lesson links created by school admins and teachers.</p>
          </div>

          {/* Section A: Study Notes & Materials */}
          <div className="glass-card">
            <div className="card-title" style={{ marginBottom: '16px' }}>📄 Study Notes & Uploaded Materials ({materials.length})</div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Title</th><th>Class Level</th><th>School Platform</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No study notes uploaded yet.</td></tr>
                  ) : (
                    materials.map(m => (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.title}</td>
                        <td>{m.classLevel || 'General'}</td>
                        <td>{getTenantName(m.tenantId)}</td>
                        <td>
                          <span className={`badge ${m.isBlocked ? 'badge-danger' : 'badge-success'}`}>
                            {m.isBlocked ? '🚫 Blocked' : '✅ Active'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleBlockMaterial(m.id, m.isBlocked)}>
                              {m.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMaterial(m.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Activities */}
          <div className="glass-card">
            <div className="card-title" style={{ marginBottom: '16px' }}>📝 Student Activities & Assessments ({activities.length})</div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Title</th><th>Target Class</th><th>School Platform</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No activities created yet.</td></tr>
                  ) : (
                    activities.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.title}</td>
                        <td>{a.classLevel || 'General'}</td>
                        <td>{getTenantName(a.tenantId)}</td>
                        <td>
                          <span className={`badge ${a.isBlocked ? 'badge-danger' : 'badge-success'}`}>
                            {a.isBlocked ? '🚫 Blocked' : '✅ Active'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleBlockActivity(a.id)}>
                              {a.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteActivity(a.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section C: Live Lessons */}
          <div className="glass-card">
            <div className="card-title" style={{ marginBottom: '16px' }}>📹 Scheduled Live Lessons ({lessons.length})</div>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Title</th><th>Schedule Time</th><th>Class Level</th><th>Meet URL</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No live lessons scheduled yet.</td></tr>
                  ) : (
                    lessons.map(l => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600 }}>{l.title}</td>
                        <td>{l.scheduleTime}</td>
                        <td>{l.level}</td>
                        <td><a href={l.meetUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Join Link</a></td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteLesson(l.id)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5A: FEEDBACKS ─── */}
      {tab === 'feedbacks' && (
        <div className="table-container">
          <table className="custom-table">
            <thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Date</th></tr></thead>
            <tbody>
              {feedbacks.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No feedbacks submitted yet.</td></tr>}
              {feedbacks.map(f => (
                <tr key={f.id}>
                  <td style={{ fontWeight: 600 }}>{f.name}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{f.email}</td>
                  <td style={{ maxWidth: '300px', fontSize: '0.9rem' }}>{f.message}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 5B: CHATBOT ─── */}
      {tab === 'chatbot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ marginBottom: '8px' }}>
            <button
              className={`btn ${showChatbotForm ? 'btn-secondary' : 'btn-primary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => setShowChatbotForm(p => !p)}
            >
              {showChatbotForm ? <X size={16} /> : <Plus size={16} />}
              {showChatbotForm ? 'Cancel' : '+ Add Chatbot Rule'}
            </button>
          </div>

          {showChatbotForm && (
            <div className="glass-card" style={{ border: '1px solid rgba(99,102,241,0.3)', animation: 'slideUp 0.2s ease-out' }}>
              <div className="card-title" style={{ marginBottom: '20px' }}><Bot size={16} /> Add Chatbot Auto-Response Rule</div>
              <form onSubmit={handleAddChatRule} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Keyword (trigger phrase)</label>
                  <input className="input-field" placeholder="e.g. fees, scholarship, schedule" value={chatForm.keyword} onChange={e => setChatForm(p => ({ ...p, keyword: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label">Auto-Response Message</label>
                  <textarea className="textarea-field" rows={3} placeholder="Type the response students should receive..." value={chatForm.response} onChange={e => setChatForm(p => ({ ...p, response: e.target.value }))} required />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
                  <button className="btn btn-primary" type="submit" style={{ flex: 1 }}><Plus size={16} /> Save Rule</button>
                  <button className="btn btn-secondary" type="button" onClick={() => setShowChatbotForm(false)} style={{ flex: 1 }}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 6: REVENUE & ACTIVATION KEYS ─── */}
      {tab === 'revenue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem' }}>💰 Revenue & Subscription Keys</h2>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Generate term activation keys (UGX 500,000 / term default) and view financial history.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowGenerateKeysModal(true)}>
              <Key size={18} /> 🔑 Generate Activation Keys
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Key Code</th>
                  <th>Duration</th>
                  <th>Price (UGX)</th>
                  <th>Used By Platform</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>No activation keys generated yet. Click the button above to generate keys.</td></tr>
                ) : (
                  keys.map(k => (
                    <tr key={k.id}>
                      <td><code style={{ background: 'rgba(245,158,11,0.15)', padding: '4px 10px', borderRadius: '6px', color: 'var(--accent-amber)', fontWeight: 700 }}>{k.key}</code></td>
                      <td>{k.durationDays} Days (1 Term)</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>{(k.price || 0).toLocaleString()}</td>
                      <td>{k.tenantId ? getTenantName(k.tenantId) : 'Unassigned'}</td>
                      <td>
                        <span className={`badge ${k.isUsed ? 'badge-secondary' : 'badge-success'}`}>
                          {k.isUsed ? 'USED' : 'AVAILABLE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 7: SECURITY & CHANGE PASSWORD ─── */}
      {tab === 'security' && (
        <div style={{ maxWidth: '560px', margin: '0 auto', width: '100%' }}>
          <div className="glass-card" style={{ padding: '28px' }}>
            <div className="card-title" style={{ marginBottom: '12px' }}><Key size={20} /> SuperAdmin Security & Password</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
              Update your master administrator password. Keep this password safe and confidential.
            </p>
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Current Master Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={passForm.currentPassword}
                  onChange={e => setPassForm(p => ({ ...p, currentPassword: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={passForm.newPassword}
                  onChange={e => setPassForm(p => ({ ...p, newPassword: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={passForm.confirmPassword}
                  onChange={e => setPassForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  required
                />
              </div>

              <button className="btn btn-primary" type="submit" disabled={passLoading} style={{ marginTop: '8px', padding: '12px' }}>
                {passLoading ? 'Updating Password...' : 'Save New Master Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: CREATE SCHOOL PLATFORM (TRIGGERED BY BUTTON) ─── */}
      {showCreateSchoolModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '480px', padding: '28px', border: '1px solid var(--primary)', animation: 'slideUp 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>🏫 Generate New School Platform</div>
              <button onClick={() => setShowCreateSchoolModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateSchool} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">School Platform Name</label>
                <input className="input-field" placeholder="e.g. St. Mary's College Kisubi" value={schoolForm.name} onChange={e => setSchoolForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Trial Duration (Days)</label>
                <input type="number" className="input-field" value={schoolForm.trialDays} onChange={e => setSchoolForm(p => ({ ...p, trialDays: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>Generate Platform & Invite Code</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowCreateSchoolModal(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: GENERATE KEYS (TRIGGERED BY BUTTON) ─── */}
      {showGenerateKeysModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '480px', padding: '28px', border: '1px solid var(--accent-amber)', animation: 'slideUp 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>🔑 Generate Term Activation Keys</div>
              <button onClick={() => setShowGenerateKeysModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleGenerateKeys} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Number of Keys to Generate</label>
                <input type="number" className="input-field" value={keyForm.count} onChange={e => setKeyForm(p => ({ ...p, count: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Price per Key (UGX)</label>
                <input type="number" className="input-field" value={keyForm.price} onChange={e => setKeyForm(p => ({ ...p, price: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Duration (Days)</label>
                <input type="number" className="input-field" value={keyForm.durationDays} onChange={e => setKeyForm(p => ({ ...p, durationDays: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-primary" type="submit" style={{ flex: 1, background: 'var(--accent-amber)' }}>Generate Keys</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowGenerateKeysModal(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: CREATE ADMIN FOR TENANT ─── */}
      {showCreateAdminModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '480px', padding: '28px', border: '1px solid #9b59b6', animation: 'slideUp 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>👤 Create Admin for: {showCreateAdminModal.name}</div>
              <button onClick={() => setShowCreateAdminModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input className="input-field" placeholder="Full Name" value={adminForm.name} onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} required />
              <input className="input-field" placeholder="Phone Number" value={adminForm.phone} onChange={e => setAdminForm(p => ({ ...p, phone: e.target.value }))} required />
              <input className="input-field" placeholder="Username" value={adminForm.username} onChange={e => setAdminForm(p => ({ ...p, username: e.target.value }))} required />
              <input type="password" className="input-field" placeholder="Password" value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} required />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-primary" type="submit" style={{ flex: 1, background: '#9b59b6' }}>Create Platform Admin</button>
                <button className="btn btn-secondary" type="button" onClick={() => setShowCreateAdminModal(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: EDIT USER ─── */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '480px', padding: '28px', animation: 'slideUp 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>✏️ Edit {editingUser.role?.toUpperCase()}: {editingUser.name}</div>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveUserEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Full Name</label>
                <input className="input-field" value={userEditForm.name} onChange={e => setUserEditForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Phone Number</label>
                <input className="input-field" value={userEditForm.phone} onChange={e => setUserEditForm(p => ({ ...p, phone: e.target.value }))} required />
              </div>
              {editingUser.role === 'student' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Class Level</label>
                  <input className="input-field" value={userEditForm.level} onChange={e => setUserEditForm(p => ({ ...p, level: e.target.value }))} />
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Profile / Bio</label>
                <input className="input-field" value={userEditForm.profile} onChange={e => setUserEditForm(p => ({ ...p, profile: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button className="btn btn-primary" type="submit" style={{ flex: 1 }}>Save Changes</button>
                <button className="btn btn-secondary" type="button" onClick={() => setEditingUser(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

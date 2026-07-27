import React, { useState, useEffect } from 'react';
import { useAuth, API } from '../App';

export default function SuperAdminDashboard() {
  const { user, logout, token } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [keys, setKeys] = useState([]);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [trialDays, setTrialDays] = useState(14);
  const [selectedTenant, setSelectedTenant] = useState(null);
  
  // Admin form
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Key form
  const [keyCount, setKeyCount] = useState(1);
  const [keyPrice, setKeyPrice] = useState(500000);
  const [keyDuration, setKeyDuration] = useState(90);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTenants();
    fetchKeys();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await fetch(`${API}/superadmin/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setTenants(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${API}/superadmin/activation-keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setKeys(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      const res = await fetch(`${API}/superadmin/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newSchoolName, trialDays: Number(trialDays) })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`School created successfully! Invite Code: ${data.tenant.inviteCode}`);
        setNewSchoolName('');
        fetchTenants();
      } else {
        setError(data.message || 'Failed to create school');
      }
    } catch (err) {
      setError('Server error creating school');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return setError('Please select a school first.');
    setMessage(''); setError('');
    try {
      const res = await fetch(`${API}/superadmin/tenants/${selectedTenant.id}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: adminName,
          phone: adminPhone,
          username: adminUsername,
          password: adminPassword
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`School Admin created successfully for ${selectedTenant.name}`);
        setAdminName(''); setAdminPhone(''); setAdminUsername(''); setAdminPassword('');
        setSelectedTenant(null);
      } else {
        setError(data.message || 'Failed to create admin');
      }
    } catch (err) {
      setError('Server error creating admin');
    }
  };

  const handleGenerateKeys = async (e) => {
    e.preventDefault();
    setMessage(''); setError('');
    try {
      const res = await fetch(`${API}/superadmin/activation-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          count: Number(keyCount),
          price: Number(keyPrice),
          durationDays: Number(keyDuration)
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`${keyCount} activation keys generated successfully!`);
        fetchKeys();
      } else {
        setError(data.message || 'Failed to generate keys');
      }
    } catch (err) {
      setError('Server error generating keys');
    }
  };

  const totalRevenue = tenants.reduce((acc, t) => acc + (t.revenueGenerated || 0), 0);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#fff', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
        <div>
          <h2>⚡ Super Admin Master Portal</h2>
          <p style={{ color: '#aaa', margin: 0 }}>Welcome, {user.name} | Multi-tenant Control System</p>
        </div>
        <button onClick={logout} style={{ padding: '8px 16px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Logout
        </button>
      </header>

      {message && <div style={{ background: '#2ecc71', color: '#fff', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>{message}</div>}
      {error && <div style={{ background: '#e74c3c', color: '#fff', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>{error}</div>}

      {/* Analytics Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3498db' }}>
          <h3>Total Schools</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{tenants.length}</p>
        </div>
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #2ecc71' }}>
          <h3>Total Revenue</h3>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>UGX {totalRevenue.toLocaleString()}</p>
        </div>
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #f39c12' }}>
          <h3>Subscription Rate</h3>
          <p style={{ fontSize: '16px', margin: 0 }}>UGX 500,000 / Term (90 Days)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Create School Form */}
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '8px' }}>
          <h3>🏫 Create New School Platform</h3>
          <form onSubmit={handleCreateSchool}>
            <div style={{ marginBottom: '15px' }}>
              <label>School Name:</label>
              <input 
                type="text" 
                value={newSchoolName} 
                onChange={(e) => setNewSchoolName(e.target.value)} 
                required 
                placeholder="e.g. St. Mary's High School"
                style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Trial Duration (Days):</label>
              <input 
                type="number" 
                value={trialDays} 
                onChange={(e) => setTrialDays(e.target.value)} 
                required 
                style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
              />
            </div>
            <button type="submit" style={{ padding: '10px 20px', background: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Generate Platform & Invite Code
            </button>
          </form>
        </div>

        {/* Generate Activation Keys Form */}
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '8px' }}>
          <h3>🔑 Generate Activation Keys</h3>
          <form onSubmit={handleGenerateKeys}>
            <div style={{ marginBottom: '10px' }}>
              <label>Number of Keys:</label>
              <input 
                type="number" 
                value={keyCount} 
                onChange={(e) => setKeyCount(e.target.value)} 
                required 
                style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>Price (UGX):</label>
              <input 
                type="number" 
                value={keyPrice} 
                onChange={(e) => setKeyPrice(e.target.value)} 
                required 
                style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label>Duration (Days):</label>
              <input 
                type="number" 
                value={keyDuration} 
                onChange={(e) => setKeyDuration(e.target.value)} 
                required 
                style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
              />
            </div>
            <button type="submit" style={{ padding: '10px 20px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Generate Keys
            </button>
          </form>
        </div>
      </div>

      {/* School Admin Modal / Inline Form */}
      {selectedTenant && (
        <div style={{ background: '#2a2a2a', padding: '20px', borderRadius: '8px', marginTop: '30px', border: '1px solid #f39c12' }}>
          <h3>👤 Create Admin for: {selectedTenant.name}</h3>
          <form onSubmit={handleCreateAdmin} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <input type="text" placeholder="Full Name" value={adminName} onChange={e => setAdminName(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#1e1e1e', color: '#fff' }} />
            <input type="text" placeholder="Phone Number" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#1e1e1e', color: '#fff' }} />
            <input type="text" placeholder="Username" value={adminUsername} onChange={e => setAdminUsername(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#1e1e1e', color: '#fff' }} />
            <input type="password" placeholder="Password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', background: '#1e1e1e', color: '#fff' }} />
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ padding: '8px 16px', background: '#f39c12', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Create Admin</button>
              <button type="button" onClick={() => setSelectedTenant(null)} style={{ padding: '8px 16px', background: '#7f8c8d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* School Platforms List */}
      <div style={{ marginTop: '40px' }}>
        <h3>📋 Registered School Platforms</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', background: '#1e1e1e' }}>
          <thead>
            <tr style={{ background: '#333', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>School Name</th>
              <th style={{ padding: '12px' }}>Invite Code</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Trial Expires</th>
              <th style={{ padding: '12px' }}>Revenue (UGX)</th>
              <th style={{ padding: '12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '12px' }}>{t.name}</td>
                <td style={{ padding: '12px' }}><code style={{ background: '#000', padding: '4px 8px', borderRadius: '4px', color: '#2ecc71' }}>{t.inviteCode}</code></td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    background: t.status === 'active' ? '#2ecc71' : '#e74c3c',
                    color: '#fff',
                    fontSize: '12px'
                  }}>
                    {t.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{new Date(t.trialEndDate).toLocaleDateString()}</td>
                <td style={{ padding: '12px' }}>{(t.revenueGenerated || 0).toLocaleString()}</td>
                <td style={{ padding: '12px' }}>
                  <button onClick={() => setSelectedTenant(t)} style={{ padding: '6px 12px', background: '#9b59b6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    + Add School Admin
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generated Activation Keys */}
      <div style={{ marginTop: '40px' }}>
        <h3>🔑 Generated Activation Keys</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', background: '#1e1e1e' }}>
          <thead>
            <tr style={{ background: '#333', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Key Code</th>
              <th style={{ padding: '12px' }}>Duration</th>
              <th style={{ padding: '12px' }}>Price (UGX)</th>
              <th style={{ padding: '12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '12px' }}><code style={{ background: '#000', padding: '4px 8px', borderRadius: '4px', color: '#f39c12' }}>{k.key}</code></td>
                <td style={{ padding: '12px' }}>{k.durationDays} Days</td>
                <td style={{ padding: '12px' }}>{(k.price || 0).toLocaleString()}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    background: k.isUsed ? '#95a5a6' : '#2ecc71',
                    color: '#fff',
                    fontSize: '12px'
                  }}>
                    {k.isUsed ? 'USED' : 'AVAILABLE'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

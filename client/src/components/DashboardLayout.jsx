import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { LogOut, Sun, Moon, Menu, X } from 'lucide-react';
import Logo from './Logo';

export default function DashboardLayout({ title, navItems, activeTab, onTabChange, children }) {
  const { user, logout, theme, toggleTheme } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 768 : true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const roleColor = {
    admin: 'var(--accent-rose)',
    teacher: 'var(--accent-amber)',
    student: 'var(--accent-emerald)'
  };

  const renderAvatar = (size = 36) => {
    if (user?.photoData) {
      return (
        <img
          src={user.photoData}
          alt={user.name}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)', flexShrink: 0 }}
        />
      );
    }
    return (
      <div className="avatar" style={{ width: size, height: size, fontSize: size < 36 ? '0.75rem' : '1rem', background: roleColor[user?.role] || 'var(--primary)', flexShrink: 0 }}>
        {getInitials(user?.name)}
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="sidebar">
          {/* Brand */}
          <div className="brand-section" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px', marginBottom: '20px' }}>
            <Logo size={36} />
          </div>

          {/* Nav */}
          <ul className="nav-list">
            {navItems.map(item => (
              <li
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  onTabChange(item.id);
                  if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                    setSidebarOpen(false);
                  }
                }}
              >
                <span style={{ opacity: activeTab === item.id ? 1 : 0.6 }}>{item.icon}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="sidebar-footer">
            <div className="user-mini-profile">
              {renderAvatar(36)}
              <div className="user-info-text">
                <div className="user-name-small">{user?.name}</div>
                <div className="user-role-small" style={{ color: roleColor[user?.role] }}>
                  {user?.role?.toUpperCase()} {user?.level ? `• ${user.level}` : ''}
                </div>
              </div>
            </div>
            <button className="nav-item" onClick={logout} style={{ color: 'var(--accent-rose)', width: '100%' }}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main area */}
      <div className="main-wrapper">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
              onClick={() => setSidebarOpen(p => !p)}
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <h1 className="page-title">{title}</h1>
          </div>
          <div className="topbar-actions">
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
              onClick={toggleTheme}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {renderAvatar(32)}
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="content-body">
          {children}
        </main>
      </div>
    </div>
  );
}

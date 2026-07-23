import React from 'react';
import logoImg from '../assets/logo.png';

export default function Logo({ size = 40, iconOnly = false, className = '' }) {
  return (
    <div className={`brand-logo-container ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <img
        src={logoImg}
        alt="Alinda Digital School Logo"
        style={{
          height: `${size}px`,
          width: 'auto',
          objectFit: 'contain',
          flexShrink: 0,
          borderRadius: '4px'
        }}
      />
      {!iconOnly && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="brand-name" style={{ fontWeight: 800, fontSize: `${Math.max(14, size * 0.42)}px`, lineHeight: 1.1 }}>Alinda</div>
          <div className="brand-tagline" style={{ color: 'var(--accent-amber)', fontWeight: 600, fontSize: `${Math.max(9, size * 0.24)}px`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Digital School</div>
        </div>
      )}
    </div>
  );
}

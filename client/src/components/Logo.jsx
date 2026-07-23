import React from 'react';

export default function Logo({ size = 36, iconOnly = false, className = '' }) {
  return (
    <div className={`brand-logo-container ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="logoCapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent-emerald)" />
          </linearGradient>
          <linearGradient id="logoAccentGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-amber)" />
            <stop offset="100%" stopColor="var(--accent-rose)" />
          </linearGradient>
          <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* White background circle for visibility on dark backgrounds */}
        <circle cx="256" cy="256" r="252" fill="#ffffff" />

        {/* Orbits / Digital connections */}
        <circle cx="256" cy="256" r="220" stroke="var(--primary)" strokeWidth="8" strokeDasharray="16 24" opacity="0.3" />
        <circle cx="256" cy="256" r="180" stroke="var(--accent-emerald)" strokeWidth="6" strokeDasharray="8 12" opacity="0.5" />

        {/* Graduation cap top (diamond) with glow */}
        <path d="M256,90 L420,170 L256,250 L92,170 Z" fill="url(#logoCapGrad)" filter="url(#logoGlow)" />
        <path d="M256,105 L395,170 L256,235 L117,170 Z" fill="#ffffff" opacity="0.15" />

        {/* Cap under-structure */}
        <path d="M176,210 L176,280 C176,330 336,330 336,280 L336,210" fill="none" stroke="url(#logoCapGrad)" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />

        {/* Tassel connected to right side with golden node */}
        <path d="M256,170 L370,220 V310" fill="none" stroke="url(#logoAccentGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="370" cy="325" r="18" fill="url(#logoAccentGrad)" filter="url(#logoGlow)" />
        <circle cx="370" cy="325" r="8" fill="#ffffff" />

        {/* Bottom connection point */}
        <circle cx="256" cy="390" r="14" fill="var(--accent-emerald)" />
        <path d="M190,380 C 210,400 302,400 322,380" fill="none" stroke="var(--accent-emerald)" strokeWidth="4" strokeLinecap="round" />
      </svg>
      {!iconOnly && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="brand-name" style={{ fontWeight: 700, fontSize: `${size * 0.45}px`, lineHeight: 1.1 }}>Alinda</div>
          <div className="brand-tagline" style={{ color: 'var(--accent-emerald)', fontWeight: 500, fontSize: `${size * 0.25}px`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Digital Learners</div>
        </div>
      )}
    </div>
  );
}

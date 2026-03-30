const size = 24;
const stroke = 1.5;
const common = {
  width: size,
  height: size,
  viewBox: `0 0 ${size} ${size}`,
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: stroke,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconHome({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <path d="M3 9.5L12 4l9 5.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

export function IconUsers({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
      <circle cx="16" cy="7" r="3" />
      <path d="M21 21v-2a4 4 0 0 0-4-4h-4" />
    </svg>
  );
}

export function IconReferral({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <path d="M7 17L17 7" />
      <path d="M17 12V7h-5" />
      <path d="M17 7H12" />
    </svg>
  );
}

export function IconDocs({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
      <path d="M8 9h2" />
    </svg>
  );
}

export function IconServer({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <rect x="2" y="3" width="20" height="7" rx="1.5" />
      <rect x="2" y="14" width="20" height="7" rx="1.5" />
      <circle cx="6" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="6" cy="17.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M10 6v6M14 6v6" />
    </svg>
  );
}

export function IconRules({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 15h6" />
      <path d="M9 11h6" />
      <path d="M9 7h2" />
    </svg>
  );
}

export function IconStats({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 16v-5" />
      <path d="M12 16v-8" />
      <path d="M17 16v-11" />
    </svg>
  );
}

export function IconAdmin({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function IconReferralEntry({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M5.64 5.64l1.42 1.42" />
      <path d="M16.94 16.94l1.42 1.42" />
      <path d="M5.64 18.36l1.42-1.42" />
      <path d="M16.94 7.06l1.42-1.42" />
    </svg>
  );
}

export function IconLogout({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconSun({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" />
      <path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

export function IconMoon({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function IconLink({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function IconExternal({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
    </svg>
  );
}

export function IconSearch({ className }: { className?: string }) {
  return (
    <svg {...common} className={className} aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

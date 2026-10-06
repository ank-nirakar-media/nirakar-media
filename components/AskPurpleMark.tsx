import { useId } from "react";

// Ask Purple's icon: a friendly robot with a headset. Its right ear cup is the Nirakar
// "open ring" mark with the play button, and the antenna is the logo's orchid dot.
export function AskPurpleMark({ size = 28 }: { size?: number }) {
  const g = `ap${useId().replace(/:/g, "")}`;
  const grad = `url(#${g})`;
  return (
    <svg width={size} height={size} viewBox="2 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D08BFF" />
          <stop offset=".5" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#4F6BFF" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="7" r="5.5" fill="#D08BFF" />
      <path d="M20 64 V58 A40 40 0 0 1 100 58 V64" fill="none" stroke={grad} strokeWidth="7" strokeLinecap="round" />
      <rect x="28" y="32" width="64" height="62" rx="20" fill="#1A1D4A" stroke={grad} strokeWidth="4" />
      <rect x="36" y="44" width="48" height="38" rx="13" fill="#0B0C22" />
      <rect x="44" y="54" width="10" height="12" rx="5" fill="#C4B5FD" />
      <rect x="66" y="54" width="10" height="12" rx="5" fill="#C4B5FD" />
      <path d="M52 73 Q60 78 68 73" fill="none" stroke="#C4B5FD" strokeWidth="3" strokeLinecap="round" />
      <rect x="10" y="56" width="20" height="30" rx="9" fill={grad} />
      <circle cx="100" cy="71" r="17" fill="#0B0C22" />
      <circle cx="100" cy="71" r="13" fill="none" stroke={grad} strokeWidth="5" strokeLinecap="round" strokeDasharray="64 18" transform="rotate(-30 100 71)" />
      <path d="M96 64 Q96 62.5 97.5 63.3 L106 69.4 Q107.5 71 106 72.6 L97.5 78.7 Q96 79.5 96 78 Z" fill={grad} />
      <path d="M20 86 Q22 100 40 100" fill="none" stroke={grad} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="43" cy="100" r="4.5" fill="#D08BFF" />
    </svg>
  );
}

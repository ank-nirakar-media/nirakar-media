import { useId } from "react";

// "Open ring" mark: a play button inside an unfinished circle, the formless
// frame that gives Nirakar its name.
export function LogoMark({ size = 36 }: { size?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D08BFF" />
          <stop offset=".5" stopColor="#8B5CF6" />
          <stop offset="1" stopColor="#4F6BFF" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="42" fill="none" stroke={`url(#${id})`} strokeWidth="12" strokeLinecap="round" strokeDasharray="214 50" transform="rotate(-30 60 60)" />
      <path d="M50 40 Q50 36 54 38 L80 56 Q84 60 80 64 L54 82 Q50 84 50 80 Z" fill={`url(#${id})`} />
      <circle cx="97" cy="24" r="6" fill="#D08BFF" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="brand">
      <LogoMark />
      <span className="brand-word">
        NIRAKAR<small>MEDIA</small>
      </span>
    </span>
  );
}

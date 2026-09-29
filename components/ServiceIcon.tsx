// Simple line icons, one per engine phase.
const paths: Record<string, string> = {
  discover: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4",
  plan: "M5 5h14v15H5z M5 9h14 M9 3v4 M15 3v4 M8 13h3 M8 16h6",
  produce: "M4 7h16v10H4z M4 11h16 M8 7v4 M13 7v4 M9 14l3 1.5-3 1.5z",
  distribute: "M12 16V5 M7 10l5-5 5 5 M5 19h14",
  learn: "M4 18l5-6 4 3 7-9 M15 6h5v5",
  create: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M10 8.5l5 3.5-5 3.5z",
  repurpose: "M4 12a8 8 0 0 1 14-5.3 M20 12a8 8 0 0 1-14 5.3 M18 3v4h-4 M6 21v-4h4",
  publish: "M12 16V5 M7 10l5-5 5 5 M5 19h14",
  optimize: "M5 20V13 M12 20V7 M19 20V4",
  engine: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M4.9 4.9l2.1 2.1 M17 17l2.1 2.1 M4.9 19.1L7 17 M17 7l2.1-2.1",
  verticals: "M4 20V9l5-3v14 M9 20V4l6 3v13 M15 20v-9l5 2v7 M3 20h18",
  rupee: "M7 5h10 M7 9h10 M7 5h3a4 4 0 0 1 0 8H7l7 7",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3.5 3 14.5 0 18 M12 3c-3 3.5-3 14.5 0 18",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20a6.5 6.5 0 0 1 13 0 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14a6 6 0 0 1 3.5 6",
};

export function ServiceIcon({ slug }: { slug: string }) {
  return (
    <span className="service-icon" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={paths[slug] || paths.produce} />
      </svg>
    </span>
  );
}

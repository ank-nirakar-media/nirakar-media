export function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <section className="wrap page-hero" style={{ paddingBottom: 96 }}>
      <p className="eyebrow">Legal</p>
      <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>{title}</h1>
      <div className="prose">
        <p>Last updated {updated}.</p>
        {children}
      </div>
    </section>
  );
}

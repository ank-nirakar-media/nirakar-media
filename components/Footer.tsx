import Link from "next/link";
import { engine, nav, site } from "@/lib/content";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="stack">
            <Logo />
            <p className="muted" style={{ maxWidth: "36ch" }}>
              Nirakar means formless. You run your business; we run your content engine, and you keep every rupee it earns.
            </p>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              {nav.map((n) => (
                <li key={n.href}><Link href={n.href}>{n.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>The engine</h4>
            <ul>
              {engine.map((s) => (
                <li key={s.slug}><Link href={`/services#${s.slug}`}>{s.title}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><Link href="/legal/terms">Terms of service</Link></li>
              <li><Link href="/legal/privacy">Privacy policy</Link></li>
              <li><Link href="/legal/refunds">Cancellation and refunds</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-base">
          <span>© {new Date().getFullYear()} Nirakar Media. Prices in INR.</span>
          <span>{site.email}</span>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { nav } from "@/lib/content";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="header">
      <div className="wrap header-inner">
        <Link href="/" aria-label="Nirakar Media home" className="brand">
          <Logo />
        </Link>
        <nav className="nav" aria-label="Main">
          {nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/login" className="nav-login">Client login</Link>
          <Link href="/pricing" className="btn btn-primary">
            Start for ₹0 setup
          </Link>
        </nav>
        <details className="menu">
          <summary>Menu</summary>
          <div className="menu-panel">
            {nav.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/login">Client login</Link>
            <Link href="/pricing" className="btn btn-primary">
              See plans
            </Link>
          </div>
        </details>
      </div>
    </header>
  );
}

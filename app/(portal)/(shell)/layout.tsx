import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const own = user.client_id ? await one<{ slug: string; name: string }>("SELECT slug, name FROM clients WHERE id = $1", [user.client_id]) : undefined;
  return (
    <>
      <header className="header">
        <div className="wrap header-inner">
          <Link href="/portal" className="brand" aria-label="Dashboard home"><Logo /></Link>
          <nav className="portal-nav" aria-label="Portal">
            {own && <Link href={`/portal/c/${own.slug}`}>Dashboard</Link>}
            {own && <Link href={`/portal/c/${own.slug}/connections`}>Connected accounts</Link>}
            {user.role === "admin" && <Link href="/admin">Clients</Link>}
            <span className="portal-user">{user.email}</span>
            <form action={logout}><button className="btn btn-ghost btn-sm" type="submit">Log out</button></form>
          </nav>
        </div>
      </header>
      <main className="portal-main">{children}</main>
    </>
  );
}

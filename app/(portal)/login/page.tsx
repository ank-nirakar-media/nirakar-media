import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { currentUser } from "@/lib/auth";
import { login } from "../actions";

export const metadata: Metadata = { title: "Client login", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentUser()) redirect("/portal");
  const { error } = await searchParams;
  return (
    <main className="auth-wrap">
      <form action={login} className="auth-card form">
        <a href="/" className="brand"><Logo /></a>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="auth-title">Client login</h1>
          <p className="muted">See what your content engine delivered.</p>
        </div>
        {error && <p className="notice" role="alert">That email and password don&apos;t match. Try again or ask your growth manager for a new invite.</p>}
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div>
        <button className="btn btn-primary btn-block" type="submit">Log in</button>
      </form>
    </main>
  );
}

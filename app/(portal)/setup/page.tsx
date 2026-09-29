import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { one } from "@/lib/db";
import { createFirstAdmin } from "../actions";

export const metadata: Metadata = { title: "First-time setup", robots: { index: false } };
export const dynamic = "force-dynamic";

// One-time page to create the first admin login on a fresh database.
// Works only while no admin exists, and only with the CRON_SECRET as the setup key.
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const admin = await one("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  return (
    <main className="auth-wrap">
      <form action={createFirstAdmin} className="auth-card form">
        <a href="/" className="brand"><Logo /></a>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="auth-title">First-time setup</h1>
          <p className="muted">{admin ? "Setup is already done. Log in instead." : "Create the first admin login for your Nirakar Media portal."}</p>
        </div>
        {admin ? (
          <a className="btn btn-primary btn-block" href="/login">Go to login</a>
        ) : (
          <>
            {error === "key" && <p className="notice" role="alert">That setup key is wrong. Use the CRON_SECRET value from Vercel.</p>}
            {error === "input" && <p className="notice" role="alert">Enter a valid email and a password of at least 10 characters.</p>}
            {error === "config" && <p className="notice" role="alert">CRON_SECRET is not set in Vercel yet. Add it and redeploy.</p>}
            <div className="field"><label htmlFor="key">Setup key (your CRON_SECRET)</label><input id="key" name="key" type="password" required /></div>
            <div className="field"><label htmlFor="name">Your name</label><input id="name" name="name" /></div>
            <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
            <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" /></div>
            <button className="btn btn-primary btn-block" type="submit">Create admin and log in</button>
          </>
        )}
      </form>
    </main>
  );
}

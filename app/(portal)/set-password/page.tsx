import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { one } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { setPassword } from "../actions";

export const metadata: Metadata = { title: "Set your password", robots: { index: false } };

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token = "", error: err } = await searchParams;
  const valid = token && (await one("SELECT id FROM users WHERE invite_hash = $1 AND invite_expires > now()", [sha256(token)]));
  const error = valid ? err : "expired";
  return (
    <main className="auth-wrap">
      <form action={setPassword} className="auth-card form">
        <a href="/" className="brand"><Logo /></a>
        <div className="stack" style={{ gap: 6 }}>
          <h1 className="auth-title">Set your password</h1>
          <p className="muted">Choose a password for your Nirakar Media dashboard.</p>
        </div>
        {error === "short" && <p className="notice" role="alert">Use at least 10 characters.</p>}
        {error === "expired" && <p className="notice" role="alert">This invite link has expired or was already used. Ask your growth manager for a new one.</p>}
        <input type="hidden" name="token" value={token} />
        <div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" /></div>
        <button className="btn btn-primary btn-block" type="submit" disabled={!valid}>Save and open dashboard</button>
      </form>
    </main>
  );
}

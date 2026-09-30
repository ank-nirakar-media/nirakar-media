import type { Metadata } from "next";
import Link from "next/link";
import { BrandAnswer, BrandField } from "@/components/portal/BrandField";
import { requireClientAccess } from "@/lib/auth";
import { fields, loadBrand, steps } from "@/lib/brand";
import { query } from "@/lib/db";
import { metaConfigured } from "@/lib/connectors/instagram";
import { youtubeConfigured } from "@/lib/connectors/youtube";
import { formatInr, getPlan } from "@/lib/plans";
import { saveOnboardingStep } from "../../../../../brand-actions";

export const metadata: Metadata = { title: "Get started", robots: { index: false } };

export default async function Onboarding({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ step?: string; connected?: string; error?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { client } = await requireClientAccess(slug);
  const brand = await loadBrand(client.id, client.languages);
  const num = Math.max(1, Math.min(steps.length, Number(sp.step) || brand.onboarding_step || 1));
  const step = steps[num - 1];
  const plan = getPlan(client.plan)!;
  const includedLanguages = Number(plan.languages.match(/\d+/)?.[0] ?? 1);
  const chosenLanguages = (brand.data.languages as string[]).length;

  const conns = step.id === "channels"
    ? await query<{ platform: string; account_name: string }>("SELECT platform, account_name FROM connections WHERE client_id = $1 AND status <> 'disconnected'", [client.id])
    : [];
  const providers = [
    { id: "youtube", name: "YouTube", ready: youtubeConfigured() },
    { id: "instagram", name: "Instagram", ready: metaConfigured() },
  ];

  return (
    <section className="wrap section-tight stack" style={{ gap: 22, maxWidth: 820 }}>
      <div className="stack" style={{ gap: 6 }}>
        <p className="eyebrow">Get started · {client.name}</p>
        <h1 className="portal-title">{step.title}</h1>
        <p className="muted">{step.intro}</p>
      </div>

      <ol className="onboard-steps" aria-label="Setup steps">
        {steps.map((s, i) => (
          <li key={s.id} className={i + 1 === num ? "on" : i + 1 < num ? "done" : ""}>
            <Link href={`/portal/c/${slug}/onboarding?step=${i + 1}`} aria-current={i + 1 === num ? "step" : undefined}>
              <span>{i + 1}</span>{s.title}
            </Link>
          </li>
        ))}
      </ol>

      {sp.connected && <p className="notice" role="status">Connected {sp.connected}.</p>}
      {sp.error && <p className="notice" role="alert">{sp.error}</p>}

      <form action={saveOnboardingStep} className="card form">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="step" value={num} />

        {step.id === "channels" && (
          <div className="stack" style={{ gap: 10 }}>
            {providers.map((p) => {
              const mine = conns.filter((c) => c.platform === p.id);
              return (
                <div key={p.id} className="conn-row">
                  <div>
                    <b>{p.name}</b>{" "}
                    {mine.length ? <span className="conn-status active">Connected: {mine.map((c) => c.account_name).join(", ")}</span> : <span className="muted">Not connected</span>}
                  </div>
                  {p.ready ? (
                    <a className="btn btn-ghost btn-sm" href={`/api/connect/${p.id}/start?client=${slug}&back=onboarding`}>{mine.length ? "Reconnect" : "Connect"}</a>
                  ) : (
                    <span className="tier-tag">Available soon</span>
                  )}
                </div>
              );
            })}
            <p className="fine">Read-only: we can see statistics, but can&apos;t post or delete anything from these connections.</p>
          </div>
        )}

        {step.fields.map((k) => (
          <BrandField
            key={k}
            field={fields[k]}
            data={brand.data}
            note={k === "languages" ? `Your ${plan.name} plan includes ${includedLanguages} language${includedLanguages > 1 ? "s" : ""}. Extra languages are ${formatInr(plan.extraLanguageInr)} a month each.` : undefined}
          />
        ))}

        {step.id === "review" && (
          <div className="stack" style={{ gap: 16 }}>
            <div className="review-plan">
              <div>
                <span className="brand-q">Your plan</span>
                <b className="review-plan-name">{plan.name} · {formatInr(plan.priceInr)}/month</b>
                <span className="muted">{plan.volume} · {plan.languages}</span>
              </div>
              <Link href={`/contact?plan=${plan.id}`} className="btn btn-ghost btn-sm">Change plan</Link>
            </div>
            {chosenLanguages > includedLanguages && (
              <p className="notice" role="status">
                You picked {chosenLanguages} languages and your plan includes {includedLanguages}. We&apos;ll confirm the extra {chosenLanguages - includedLanguages} with you before adding them to your bill.
              </p>
            )}
            {steps.slice(0, -1).map((s, i) => (
              <div key={s.id} className="review-block">
                <div className="review-head"><h3>{s.title}</h3><Link href={`/portal/c/${slug}/onboarding?step=${i + 1}`}>Edit</Link></div>
                {s.fields.map((k) => <BrandAnswer key={k} field={fields[k]} data={brand.data} />)}
              </div>
            ))}
          </div>
        )}

        <div className="btn-row onboard-nav">
          {num > 1 && <button className="btn btn-ghost btn-sm" type="submit" name="nav" value="back" formNoValidate>Back</button>}
          {step.id === "review" ? (
            <button className="btn btn-primary" type="submit" name="nav" value="finish">Finish and open my dashboard</button>
          ) : (
            <>
              <button className="btn btn-primary" type="submit" name="nav" value="next">Save and continue</button>
              <button className="btn btn-link" type="submit" name="nav" value="skip" formNoValidate>Skip for now</button>
            </>
          )}
        </div>
      </form>
    </section>
  );
}

import Link from "next/link";
import { formatInr, plans } from "@/lib/plans";

export function Plans() {
  return (
    <>
      <div className="plans">
        {plans.map((plan) => (
          <article key={plan.id} className={`plan${plan.popular ? " popular" : ""}`}>
            {plan.popular && <span className="plan-badge">Most chosen</span>}
            <div className="stack" style={{ gap: 8 }}>
              <h3>{plan.name}</h3>
              <p className="muted">{plan.tagline}</p>
            </div>
            <div className="price">
              <strong>{formatInr(plan.priceInr)}</strong>
              <span>/ month</span>
            </div>
            <ul className="checks">
              {plan.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <form action="/api/checkout" method="post" data-checkout className="stack" style={{ gap: 12 }}>
              <input type="hidden" name="plan" value={plan.id} />
              <div className="field">
                <label htmlFor={`lang-${plan.id}`}>Extra languages (+{formatInr(plan.extraLanguageInr)}/mo each)</label>
                <select id={`lang-${plan.id}`} name="extraLanguages" defaultValue="0">
                  {[0, 1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? `None (${plan.languages} included)` : `${n} more: ${formatInr(plan.priceInr + n * plan.extraLanguageInr)}/mo total`}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className={`btn btn-block ${plan.popular ? "btn-primary" : "btn-ghost"}`}>
                Subscribe to {plan.name}
              </button>
            </form>
            <p className="fine">₹0 setup · billed monthly · cancel any time</p>
          </article>
        ))}
      </div>
      <div className="custom-plan">
        <div>
          <h3>Long-form, multi-channel and agency plans</h3>
          <p>More long-form, more channels, or a white-label engine for your agency clients. Priced to your volume.</p>
        </div>
        <Link href="/contact?plan=custom" className="btn btn-ghost">Get a custom quote</Link>
      </div>
    </>
  );
}

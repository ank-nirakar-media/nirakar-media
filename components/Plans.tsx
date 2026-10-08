import Link from "next/link";
import { offerForDisplay } from "@/lib/offer";
import { formatInr, launchOffer, plans, priceInr } from "@/lib/plans";

export async function Plans() {
  const offer = await offerForDisplay();
  return (
    <>
      {offer.open && (
        <div className="offer-banner" role="note">
          <span className="offer-tag">Exclusive {launchOffer.name.toLowerCase()} · limited time</span>
          <p>
            <b>The first {launchOffer.seats} customers keep these prices for as long as they stay subscribed.</b> The offer ends on{" "}
            {launchOffer.endsLabel} or when the {launchOffer.seats} spots are taken, whichever comes first.
          </p>
          <span className="offer-seats">{offer.seatsLeft} of {launchOffer.seats} spots left</span>
        </div>
      )}
      <div className="plans">
        {plans.map((plan) => {
          const price = priceInr(plan, offer.open);
          return (
          <article key={plan.id} className={`plan${plan.popular ? " popular" : ""}`}>
            {plan.popular && <span className="plan-badge">Most chosen</span>}
            <div className="stack" style={{ gap: 8 }}>
              <h3>{plan.name}</h3>
              <p className="muted">{plan.tagline}</p>
            </div>
            <div className="price">
              {offer.open && <s className="price-was" aria-label={`Was ${formatInr(plan.priceInr)}`}>{formatInr(plan.priceInr)}</s>}
              <strong>{formatInr(price)}</strong>
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
                      {n === 0 ? `None (${plan.languages} included)` : `${n} more: ${formatInr(price + n * plan.extraLanguageInr)}/mo total`}
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
          );
        })}
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

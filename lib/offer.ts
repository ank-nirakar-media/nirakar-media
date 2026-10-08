import { query } from "./db";
import { launchOffer, offerOpen } from "./plans";

export type OfferStatus = { open: boolean; seatsLeft: number };

// A founding seat is taken once a customer's first payment goes through, not when checkout starts.
export async function seatsTaken(): Promise<number> {
  const [row] = await query<{ n: number }>("SELECT count(*)::int AS n FROM subscriptions WHERE offer AND activated_at IS NOT NULL");
  return row?.n ?? 0;
}

// For checkout: throws if the database can't be read, so nobody is charged the wrong price.
export async function offerStatus(now = new Date()): Promise<OfferStatus> {
  const taken = await seatsTaken();
  return { open: offerOpen(taken, now), seatsLeft: Math.max(0, launchOffer.seats - taken) };
}

// For pages: if the count can't be read, show the offer by date alone. Checkout re-checks the seats.
export async function offerForDisplay(now = new Date()): Promise<OfferStatus> {
  try {
    return await offerStatus(now);
  } catch (err) {
    console.error("Could not count founding seats", err);
    return { open: offerOpen(0, now), seatsLeft: launchOffer.seats };
  }
}

export async function recordSubscription(id: string, plan: string, offer: boolean) {
  await query("INSERT INTO subscriptions (id, plan, offer) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [id, plan, offer]);
}

// Called from the verified checkout callback and the Razorpay webhook. activated_at is set once.
export async function setSubscriptionStatus(id: string, status: string, activated = false) {
  await query(
    `UPDATE subscriptions SET status = $2, updated_at = now(),
       activated_at = CASE WHEN $3 THEN COALESCE(activated_at, now()) ELSE activated_at END
     WHERE id = $1`,
    [id, status, activated],
  );
}

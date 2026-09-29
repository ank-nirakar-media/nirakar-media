import type { Metadata } from "next";
import { Legal } from "@/components/Legal";
import { site } from "@/lib/content";

export const metadata: Metadata = { title: "Cancellation and refunds" };

export default function RefundsPage() {
  return (
    <Legal title="Cancellation and refunds" updated="29 September 2026">
      <h2>Cancelling</h2>
      <p>Plans are month-to-month. Email {site.email} before your next billing date and your plan will not renew. You keep everything delivered up to then.</p>
      <h2>Refunds</h2>
      <ul>
        <li>If we have not started work on your month (no scripts delivered), you can ask for a full refund of that month within 7 days of payment.</li>
        <li>Once production has started, the month is non-refundable, but we will complete the videos your plan includes.</li>
        <li>If we miss a delivery we promised, we will credit the missing videos to your next month or refund them, whichever you prefer.</li>
      </ul>
      <p>Approved refunds go back to the original payment method within 5 to 10 working days.</p>
    </Legal>
  );
}

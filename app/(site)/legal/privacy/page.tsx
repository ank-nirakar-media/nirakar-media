import type { Metadata } from "next";
import { Legal } from "@/components/Legal";
import { site } from "@/lib/content";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <Legal title="Privacy policy" updated="29 September 2026">
      <p>This policy explains what personal data Nirakar Media collects and how we use it, in line with India&apos;s Digital Personal Data Protection Act, 2023.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Contact details you send us: name, email, phone and business links.</li>
        <li>Billing details handled by our payment provider. We never see or store your full card number.</li>
        <li>Access you grant to your social accounts for publishing, which you can revoke at any time.</li>
      </ul>
      <h2>Connected accounts and your dashboard</h2>
      <p>
        When you connect YouTube or Instagram to your Nirakar Media dashboard, you give us read-only access to your
        channel and account statistics: video titles, publish dates, views, likes, comments, shares, saves, followers and
        search traffic. We use this data only to show your results in your dashboard and reports and to plan your
        content. We cannot post, delete or send messages through these connections.
      </p>
      <p>
        Access tokens are stored encrypted. We do not sell this data, use it for advertising or share it with anyone
        except the hosting providers that run the dashboard. Our use of information received from Google APIs follows
        the Google API Services User Data Policy, including its Limited Use requirements.
      </p>
      <p>
        You can disconnect an account at any time from the Connected accounts page, or revoke access in your Google
        account settings or Facebook business integrations. To have the statistics we stored deleted, email {site.email}
        and we will delete them within 30 days.
      </p>
      <p>
        Your dashboard login uses a strictly necessary session cookie. Tracked links we create for you record a click
        count and an anonymised visitor fingerprint (a one-way hash), not names or contact details.
      </p>
      <h2>How we use it</h2>
      <p>To reply to you, deliver and publish your videos, bill your plan and meet legal obligations. We do not sell your data.</p>
      <h2>Who we share it with</h2>
      <p>Service providers who help us run the business, such as our payment processor, hosting and email tools, only as needed to provide the service.</p>
      <h2>Your rights</h2>
      <p>You can ask to see, correct or delete your data, or withdraw consent, by emailing {site.email}.</p>
    </Legal>
  );
}

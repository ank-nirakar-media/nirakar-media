import type { Metadata } from "next";
import { Legal } from "@/components/Legal";
import { site } from "@/lib/content";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <Legal title="Terms of service" updated="29 September 2026">
      <p>These terms apply when you buy a Nirakar Media plan. By subscribing you agree to them.</p>
      <h2>The service</h2>
      <p>We produce and, where your plan includes it, publish faceless videos as described on our pricing page. Volumes, turnaround times and revision counts are per calendar month and do not roll over.</p>
      <h2>Ownership</h2>
      <p>Once paid for, you own the finished videos, scripts and thumbnails we make for you. Your channels and accounts stay in your name, and all ad revenue, sponsorship and sales income belongs to you.</p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Give us accurate information about your brand, products and claims.</li>
        <li>Approve content before it is published, or tell us in writing that we may publish without approval.</li>
        <li>Only ask us to clone a voice when the speaker has given written consent.</li>
        <li>Follow each platform&apos;s own rules for your account.</li>
      </ul>
      <h2>Content rules</h2>
      <p>We do not make content that is unlawful, misleading, hateful, or that infringes someone else&apos;s rights. We may decline a topic that breaks these rules or platform policies.</p>
      <h2>Billing</h2>
      <p>Plans are billed monthly in advance in INR through our payment provider and renew until cancelled. Taxes such as GST are added where applicable.</p>
      <h2>Results</h2>
      <p>We work to grow your channel, but views, subscribers and revenue depend on many factors outside our control, so we do not guarantee specific results.</p>
      <h2>Contact</h2>
      <p>Questions about these terms: {site.email}.</p>
    </Legal>
  );
}

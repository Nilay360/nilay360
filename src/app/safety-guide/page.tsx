import { PageShell } from "../_components/SiteChrome";

export default function SafetyGuidePage() {
  return (
    <PageShell
      eyebrow="Stay Safe"
      title="Property Transaction"
      italic="Safety Guide"
      subtitle="How to recognise common scam patterns, protect yourself during a property transaction, and report something that doesn't feel right."
      badge="Guidance"
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {[
          {
            h: "1. Common Red Flags",
            b: "Be cautious if: (a) anyone asks you to pay any amount — token, advance, security deposit, or otherwise — before you've visited the property in person; (b) you're asked to pay into a personal bank account or personal UPI ID rather than a verified business channel; (c) you're pressured with urgency (\"the deal will be gone in an hour,\" \"someone else is about to pay\"); (d) someone asks to move the conversation entirely off Nilay 360 before you've verified their identity, and discourages using our Request Callback or messaging tools.",
          },
          {
            h: "2. Before You Pay Anything",
            b: "Always visit the property in person before making any payment. Verify that what you see matches what was advertised — location, area, amenities, and condition. Verify the identity of the seller or agent you're dealing with, and ask to see property documents and, where applicable, RERA registration directly. Use Nilay 360's Request Callback option where possible, so your enquiry is mediated and on record rather than conducted entirely through a private channel.",
          },
          {
            h: "3. How to Report Something",
            b: "If a listing or a person's conduct feels wrong, use the Report button available on any property listing page or agent profile page. This sends your report directly to our review team — you don't need to contact support separately first.",
          },
          {
            h: "4. What Nilay 360 Does — and Doesn't — Do",
            b: "Every listing goes through admin review before it appears live on the platform. That said, Nilay 360 does not process payments, is not a party to any transaction between buyers, sellers, or agents, and cannot guarantee the conduct of any specific seller or agent. Admin review checks that a listing meets our publishing standards — it is not a substitute for your own in-person verification before you commit any money.",
          },
        ].map(s => (
          <div key={s.h} style={{ marginBottom: 28 }}>
            <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: 22, fontWeight: 700, color: "#FFFFFF", marginBottom: 8 }}>{s.h}</h3>
            <p style={{ fontSize: 15, color: "#A9B4C2", lineHeight: 1.75 }}>{s.b}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

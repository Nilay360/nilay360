import { PageShell } from "../_components/SiteChrome";

export default function RefundPolicyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Refund &"
      italic="Cancellation Policy"
      subtitle="How refunds, cancellations and chargebacks work for Nilay 360's paid services — listing subscriptions, premium promotions and agent plans."
      badge="Policy"
    >
      <div style={{ maxWidth:820, margin:"0 auto" }}>
        {[
          { h:"1. Scope", b:"This policy applies to all paid services purchased on Nilay 360, including listing subscriptions, featured/premium promotions, and agent membership plans. It does not apply to property transactions between buyers and sellers." },
          { h:"2. Subscription Refunds", b:"Monthly and annual subscriptions may be cancelled at any time. Cancellation stops future renewals; the current billing period remains active until its end. We do not provide pro-rata refunds for partial periods unless required by law." },
          { h:"3. Featured Promotions", b:"Featured-listing and spotlight promotions are non-refundable once the promotion has gone live, as the placement is delivered immediately. If a promotion fails to display due to a verified technical fault on our side, we will re-run it or issue a credit." },
          { h:"4. Eligibility for Refund", b:"A full refund is available within 7 days of purchase if the service has not yet been activated or used. Requests after activation are assessed case-by-case by our support team." },
          { h:"5. How to Request", b:"Email billing@nilay360.com with your registered email, order ID and reason. Approved refunds are processed to the original payment method within 7–10 business days." },
          { h:"6. Contact", b:"For any billing question, write to billing@nilay360.com or reach us through the Contact page. We aim to respond within 2 business days." },
        ].map(s => (
          <div key={s.h} style={{ marginBottom:28 }}>
            <h3 style={{ fontFamily:"var(--font-heading-new)", fontSize:22, fontWeight:700, color:"#020C1C", marginBottom:8 }}>{s.h}</h3>
            <p style={{ fontSize:15, color:"#555", lineHeight:1.75 }}>{s.b}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

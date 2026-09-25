"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// ── FAQ accordion ─────────────────────────────────────────────
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(13,43,31,0.08)" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "22px 0", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-body-new)", textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: open ? "#020C1C" : "rgba(201,168,76,0.1)", border: `1px solid ${open ? "transparent" : "rgba(201,168,76,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#10C4C3", flexShrink: 0, transition: "background 0.2s" }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#020C1C", lineHeight: 1.4 }}>{q}</span>
        </div>
        <span style={{ fontSize: "20px", color: "#10C4C3", flexShrink: 0, transform: open ? "rotate(45deg)" : "none", transition: "transform 0.2s", lineHeight: 1 }}>+</span>
      </button>
      <div style={{ maxHeight: open ? "320px" : "0", overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <p style={{ fontSize: "14px", color: "#6B7C72", lineHeight: 1.8, padding: "0 0 22px 42px" }}>{a}</p>
      </div>
    </div>
  );
}

// ── Step card ─────────────────────────────────────────────────
function StepCard({ num, title, desc, icon, last }: { num: number; title: string; desc: string; icon: string; last?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", flex: 1, position: "relative" }}>
      {!last && (
        <div style={{ position: "absolute", top: "28px", left: "calc(50% + 28px)", right: "calc(-50% + 28px)", height: "1.5px", background: "rgba(201,168,76,0.2)", zIndex: 0 }} />
      )}
      <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "rgba(201,168,76,0.12)", border: "1.5px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", marginBottom: "14px", position: "relative", zIndex: 1, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#10C4C3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 800, color: "#020C1C", marginBottom: "10px" }}>{num}</div>
      <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "16px", fontWeight: 600, color: "#FFFFFF", marginBottom: "6px", lineHeight: 1.3 }}>{title}</h4>
      <p style={{ fontSize: "12px", color: "rgba(245,242,236,0.45)", lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}

// ── Feature card (hover) ──────────────────────────────────────
function ServiceCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: hover ? "rgba(245,242,236,0.06)" : "rgba(245,242,236,0.03)", border: `1px solid ${hover ? "rgba(201,168,76,0.3)" : "rgba(245,242,236,0.07)"}`, borderRadius: "16px", padding: "28px 24px", cursor: "default", transition: "all 0.22s", transform: hover ? "translateY(-3px)" : "none" }}>
      <div style={{ fontSize: "28px", marginBottom: "14px" }}>{icon}</div>
      <h4 style={{ fontFamily: "var(--font-heading-new)", fontSize: "18px", fontWeight: 600, color: "#FFFFFF", marginBottom: "8px" }}>{title}</h4>
      <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.45)", lineHeight: 1.75 }}>{desc}</p>
    </div>
  );
}

// ── Eyebrow component ─────────────────────────────────────────
function Eyebrow({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
      <div style={{ width: "28px", height: "1px", background: dark ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.6)" }} />
      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#10C4C3", textTransform: "uppercase" }}>{label}</span>
      <div style={{ width: "28px", height: "1px", background: dark ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.6)" }} />
    </div>
  );
}

const COUNTRIES = [
  "United States", "United Arab Emirates", "United Kingdom", "Canada", "Australia",
  "Singapore", "Qatar", "Kuwait", "Bahrain", "Oman", "Saudi Arabia",
  "Germany", "Netherlands", "New Zealand", "South Africa", "Other",
];

const FAQS = [
  {
    q: "Can NRIs buy property in India?",
    a: "Yes. NRIs (Non-Resident Indians), PIOs (Persons of Indian Origin), and OCI cardholders can freely purchase residential and commercial property in India under FEMA regulations. There is no limit on the number of properties an NRI can own. Agricultural land, plantation property, and farmhouses are the only exceptions.",
  },
  {
    q: "What documents are required to buy property as an NRI?",
    a: "Key documents include: valid Indian passport (or foreign passport with OCI/PIO card), PAN card (mandatory for transactions above ₹5 lakhs), overseas address proof, NRE/NRO bank account details, Form 60 if PAN is not available, and a POA if buying remotely. Our team provides a complete documentation checklist tailored to your country of residence.",
  },
  {
    q: "Can I get a home loan in India as an NRI?",
    a: "Yes. Most major Indian banks — including SBI, HDFC, ICICI, and Axis — offer dedicated NRI home loan products. Eligibility is based on your overseas income, credit history, and property value. Loan amounts range up to ₹10 crore with tenures of 5–25 years. EMI repayments must come from your NRE or NRO account.",
  },
  {
    q: "How is rental income from Indian property taxed for NRIs?",
    a: "Rental income earned in India is subject to TDS at 30% (deducted by the tenant). However, India has Double Taxation Avoidance Agreements (DTAA) with over 90 countries, which means you may be able to claim credit for the tax paid in India against your overseas tax liability. We work with tax advisors to help you optimise your tax position.",
  },
  {
    q: "What is Power of Attorney and do I need one?",
    a: "A Power of Attorney (POA) is a legal document authorising a trusted person in India to act on your behalf for property transactions. While not mandatory, it is highly recommended for NRIs who cannot travel to India for registration and documentation. We assist with POA drafting, attestation at your local Indian consulate, and apostille where applicable.",
  },
  {
    q: "Can NRIs buy agricultural land in India?",
    a: "No. FEMA regulations explicitly prohibit NRIs from purchasing agricultural land, plantation property, and farmhouses in India. This restriction applies regardless of how long you have been an NRI or your country of residence. If you inherit agricultural land, you may hold it but cannot purchase additional agricultural land.",
  },
];

const TESTIMONIALS = [
  { quote: "I bought a 4BHK villa in Jubilee Hills from Dubai without visiting India once. Nilay 360 handled the virtual tour, legal checks, POA, and even the interior designer referral. The process took 45 days from first call to registration. Truly remarkable.", name: "Rajiv Menon", role: "Dubai · Purchased villa in Jubilee Hills", flag: "🇦🇪", initials: "RM" },
  { quote: "As a US citizen with OCI status, I was worried about FEMA compliance and repatriation rules. Nilay 360's legal team walked me through every regulation, reviewed the title documents, and connected me with a CA who handled the tax implications. No surprises.", name: "Priya Krishnamurthy", role: "California, USA · Invested in Kokapet apartment", flag: "🇺🇸", initials: "PK" },
  { quote: "I'd been wanting to buy in Banjara Hills for years but found the process too opaque from London. Nilay 360 gave me a dedicated advisor who sent weekly updates, negotiated a 4% price reduction, and managed the complete registration remotely. I'd recommend them to every NRI.", name: "Suresh Nair", role: "London, UK · Purchased penthouse in Banjara Hills", flag: "🇬🇧", initials: "SN" },
];

export default function NriPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "", budget: "", city: "", propertyType: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // Prefill name/email/phone for a signed-in visitor — same "only if still
  // blank" rule as post-property.tsx's PREFILL_SELLER_EMAIL: never
  // overwrites something the visitor already typed into the form. This
  // page has no useAuth()/profile fetch of its own, so session + profile
  // are read directly, once, on mount.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      const sessionUser = data.session?.user;
      if (!sessionUser) return;
      if (sessionUser.email) setForm(f => ({ ...f, email: f.email || sessionUser.email! }));
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", sessionUser.id)
        .maybeSingle();
      if (profileRow?.full_name) setForm(f => ({ ...f, name: f.name || profileRow.full_name! }));
      if (profileRow?.phone) setForm(f => ({ ...f, phone: f.phone || profileRow.phone! }));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 900));
    setSubmitted(true);
    setSubmitting(false);
  }

  const INP: React.CSSProperties = {
    width: "100%", padding: "11px 14px", background: "#fff",
    border: "1.5px solid rgba(13,43,31,0.12)", borderRadius: "9px",
    fontSize: "14px", color: "#020C1C", fontFamily: "var(--font-body-new)", outline: "none",
  };
  const SEL: React.CSSProperties = {
    ...INP, appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7C72' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center",
  };
  const LBL: React.CSSProperties = { fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "#4B5563", textTransform: "uppercase", display: "block", marginBottom: "6px" };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: var(--font-body-new); background: #020C1C; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        select option { background: #fff; color: #020C1C; }
        @media (max-width: 768px) {
          .nri-nav { padding: 0 16px !important; }
          .nri-nav-links { display: none !important; }
          .nri-hero { padding: 56px 16px 64px !important; }
          .nri-why { padding: 56px 16px !important; }
          .nri-stats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .nri-reasons-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .nri-how { padding: 56px 16px !important; }
          .nri-steps { flex-direction: column !important; align-items: stretch !important; gap: 20px !important; }
          .nri-fema { padding: 56px 16px !important; }
          .nri-fema-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .nri-loans { padding: 56px 16px !important; }
          .nri-loans-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .nri-services { padding: 56px 16px !important; }
          .nri-services-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
          .nri-testimonials { padding: 56px 16px !important; }
          .nri-testimonials-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .nri-consult { padding: 56px 16px !important; }
          .nri-consult-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
          .nri-form-row { grid-template-columns: 1fr !important; }
          .nri-faq { padding: 56px 16px !important; }
          .nri-cta { padding: 56px 16px !important; }
        }
        @media (max-width: 480px) {
          .nri-stats-grid { grid-template-columns: 1fr !important; }
          .nri-services-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#020C1C" }}>

        {/* ── 1. HERO ─────────────────────────────────────────── */}
        <section style={{ paddingTop: "64px", background: "#020C1C", minHeight: "580px", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
          {/* Hero background photo */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80')", backgroundSize: "cover", backgroundPosition: "center" }} />
          {/* World-map dot pattern */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: `radial-gradient(circle, rgba(201,168,76,0.18) 1px, transparent 1px)`,
            backgroundSize: "28px 28px", opacity: 0.35 }} />
          {/* Grid overlay */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          {/* Radial glows + photo dim */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 65% at 90% 110%, rgba(201,168,76,0.1) 0%, transparent 55%), radial-gradient(ellipse 55% 60% at 5% -5%, rgba(45,106,79,0.28) 0%, transparent 50%), rgba(13,43,31,0.72)", pointerEvents: "none" }} />
          {/* Floating continent silhouettes (decorative) */}
          <div style={{ position: "absolute", top: "20%", right: "5%", width: "300px", height: "200px", background: "radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

          <div className="nri-hero" style={{ position: "relative", zIndex: 2, maxWidth: "860px", margin: "0 auto", padding: "80px 48px 90px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 16px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "100px", marginBottom: "26px", animation: "fadeUp 0.5s ease-out both" }}>
              <span style={{ fontSize: "14px" }}>🌍</span>
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#10C4C3", textTransform: "uppercase" }}>NRI Property Services</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(38px, 5.8vw, 68px)", fontWeight: 300, color: "#020C1C", lineHeight: 1.1, marginBottom: "18px", animation: "fadeUp 0.55s 0.05s ease-out both" }}>
              Invest in India<br />From Anywhere <em style={{ fontStyle: "italic", color: "#10C4C3" }}>in the World</em>
            </h1>
            <p style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(18px, 2.2vw, 24px)", fontStyle: "italic", color: "rgba(201,168,76,0.75)", marginBottom: "18px", animation: "fadeUp 0.55s 0.1s ease-out both" }}>
              Dedicated concierge for NRI buyers
            </p>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.5)", lineHeight: 1.8, maxWidth: "580px", margin: "0 auto 36px", animation: "fadeUp 0.55s 0.15s ease-out both" }}>
              From property search to possession — we handle everything while you stay abroad. FEMA compliant, fully remote, completely trusted.
            </p>
            {/* CTAs */}
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap", marginBottom: "36px", animation: "fadeUp 0.55s 0.2s ease-out both" }}>
              <a href="#consultation" style={{ padding: "14px 32px", background: "#10C4C3", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                Book NRI Consultation
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </a>
              <a href="#fema" style={{ padding: "14px 32px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.22)", borderRadius: "9px", color: "rgba(245,242,236,0.8)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                Download NRI Guide
              </a>
            </div>
            {/* Trust pills */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.55s 0.25s ease-out both" }}>
              {["✓ FEMA Compliant", "✓ RBI Approved Process", "✓ End-to-End Support"].map(p => (
                <span key={p} style={{ padding: "6px 16px", background: "rgba(245,242,236,0.05)", border: "1px solid rgba(245,242,236,0.12)", borderRadius: "100px", fontSize: "12px", fontWeight: 600, color: "rgba(245,242,236,0.55)", letterSpacing: "0.04em" }}>{p}</span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. WHY INVEST ───────────────────────────────────── */}
        <section className="nri-why" style={{ background: "#020C1C", padding: "96px 48px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "56px" }}>
              <Eyebrow label="The Opportunity" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 400, color: "#FFFFFF", lineHeight: 1.15 }}>
                Why Indian Real Estate<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>in 2025</em>
              </h2>
              <p style={{ fontSize: "15px", color: "#6B7C72", marginTop: "14px", maxWidth: "520px", margin: "14px auto 0", lineHeight: 1.75 }}>
                A decade of consistent growth, a rising rupee, and world-class infrastructure — India is the NRI investment story of this generation.
              </p>
            </div>

            {/* Stat pills */}
            <div className="nri-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px", marginBottom: "52px" }}>
              {[
                { num: "8.2%", label: "Avg Annual Appreciation", sub: "Premium city markets" },
                { num: "₹43K Cr", label: "NRI Investment in 2024", sub: "Record year" },
                { num: "14%", label: "Rental Yield Growth", sub: "Year on year" },
                { num: "1:1", label: "Personalized NRI Advisory", sub: "Dedicated relationship manager" },
              ].map(s => (
                <div key={s.label} style={{ background: "#020C1C", borderRadius: "16px", padding: "28px 22px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 50% 100%, rgba(201,168,76,0.1) 0%, transparent 60%)", pointerEvents: "none" }} />
                  <p style={{ fontFamily: "var(--font-support-new)", fontSize: "clamp(28px, 3.5vw, 40px)", fontWeight: 600, color: "#10C4C3", marginBottom: "6px", position: "relative", zIndex: 1 }}>{s.num}</p>
                  <p style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF", marginBottom: "3px", position: "relative", zIndex: 1 }}>{s.label}</p>
                  <p style={{ fontSize: "10px", color: "rgba(245,242,236,0.35)", position: "relative", zIndex: 1 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Reason cards */}
            <div className="nri-reasons-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {[
                { icon: "📈", title: "Strong Capital Appreciation", desc: "Premium residential markets in Hyderabad, Mumbai, and Bengaluru have delivered 8–14% annual appreciation over the past decade, outpacing most global asset classes. The infrastructure push — metro expansions, IT corridors, and airport developments — continues to drive micro-market premiums." },
                { icon: "🏠", title: "Rental Income Potential", desc: "Demand from India's rapidly expanding professional workforce means premium properties in technology corridors command rental yields of 3–5% — with occupancy rates above 95% in top localities. A Kokapet apartment rented to a GCC employee pays your EMI and then some." },
                { icon: "❤", title: "Emotional Connection to Home", desc: "For most NRIs, buying in India is more than an investment — it's a connection to roots, a retirement plan, and a legacy for children. Nilay 360 ensures that when you finally return, the home waiting for you is everything you imagined from thousands of miles away." },
              ].map(c => {
                const [hover, setHover] = useState(false);
                return (
                  <div key={c.title} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
                    style={{ background: hover ? "#020C1C" : "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "16px", padding: "32px 28px", transition: "all 0.22s", boxShadow: hover ? "0 20px 60px rgba(13,43,31,0.14)" : "0 1px 5px rgba(13,43,31,0.04)", transform: hover ? "translateY(-4px)" : "none" }}>
                    <div style={{ fontSize: "28px", marginBottom: "16px" }}>{c.icon}</div>
                    <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: hover ? "#020C1C" : "#020C1C", marginBottom: "10px", transition: "color 0.22s" }}>{c.title}</h3>
                    <p style={{ fontSize: "13px", color: hover ? "rgba(245,242,236,0.5)" : "#6B7C72", lineHeight: 1.8, transition: "color 0.22s" }}>{c.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 3. HOW IT WORKS ─────────────────────────────────── */}
        <section className="nri-how" style={{ background: "#020C1C", padding: "96px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 2 }}>
            <div style={{ textAlign: "center", marginBottom: "60px" }}>
              <Eyebrow label="Simple Process" dark />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 400, color: "#FFFFFF", lineHeight: 1.15 }}>
                Your NRI Property<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Journey</em>
              </h2>
              <p style={{ fontSize: "14px", color: "rgba(245,242,236,0.4)", marginTop: "12px" }}>Six steps. Zero stress. Complete from abroad.</p>
            </div>
            <div className="nri-steps" style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <StepCard num={1} icon="📞" title="Free Consultation"   desc="30-minute video call with a dedicated NRI advisor to understand your goals, budget, and timeline." />
              <StepCard num={2} icon="🔍" title="Property Shortlisting" desc="We curate 8–12 verified properties matching your criteria, complete with legal status and pricing data." />
              <StepCard num={3} icon="🎥" title="Virtual Site Tours"  desc="Live video tours conducted by our ground team. Walk through properties in real time from your living room." />
              <StepCard num={4} icon="⚖" title="Legal Due Diligence" desc="Full title search, RERA check, encumbrance certificate review and builder credential verification." />
              <StepCard num={5} icon="📝" title="Documentation & Registration" desc="POA drafting, consulate attestation, stamp duty and full registration managed end-to-end." />
              <StepCard num={6} icon="🏡" title="Possession & Management" desc="Handover inspection, snagging report, and optional property management or rental setup." last />
            </div>
          </div>
        </section>

        {/* ── 4. FEMA & LEGAL GUIDE ───────────────────────────── */}
        <section id="fema" className="nri-fema" style={{ background: "#020C1C", padding: "96px 48px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <Eyebrow label="Legal Framework" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 400, color: "#FFFFFF", lineHeight: 1.15 }}>
                FEMA Compliance<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Made Simple</em>
              </h2>
              <p style={{ fontSize: "14px", color: "#6B7C72", marginTop: "12px", maxWidth: "480px", margin: "12px auto 0", lineHeight: 1.7 }}>
                The Foreign Exchange Management Act governs NRI property ownership. Here's everything you need to know.
              </p>
            </div>
            <div className="nri-fema-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
              {[
                {
                  icon: "👤", title: "Who Can Buy",
                  points: ["NRIs with valid Indian passport and foreign residency", "PIOs (Person of Indian Origin) with foreign passport", "OCI (Overseas Citizen of India) cardholders", "No restrictions on number of properties owned"],
                  color: "#4A90D9",
                },
                {
                  icon: "🏗", title: "What You Can Buy",
                  points: ["Residential properties — flats, villas, plots", "Commercial properties — offices, shops, warehouses", "Under-construction and ready-to-move properties", "Agricultural land, farmhouses: NOT permitted"],
                  color: "#059669",
                },
                {
                  icon: "💸", title: "Repatriation Rules",
                  points: ["Proceeds from sale can be repatriated via NRE account", "Up to USD 1 million per financial year allowed", "Capital gains must be reinvested for full TDS exemption", "DTAA treaties reduce double taxation in 90+ countries"],
                  color: "#10C4C3",
                },
                {
                  icon: "🧾", title: "Tax Implications",
                  points: ["TDS at 30% deducted by buyer on property sale proceeds", "Capital gains tax: 20% LTCG with indexation after 2 years", "Section 54 exemption if reinvested in another property", "Annual rental income taxed; claim benefit under DTAA"],
                  color: "#7C3AED",
                },
              ].map(card => (
                <div key={card.title} style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "16px", padding: "32px 30px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: `${card.color}14`, border: `1.5px solid ${card.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{card.icon}</div>
                    <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "22px", fontWeight: 600, color: "#020C1C" }}>{card.title}</h3>
                  </div>
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {card.points.map((p, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: "#4B5563", lineHeight: 1.6 }}>
                        <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: `${card.color}18`, border: `1px solid ${card.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={card.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p style={{ textAlign: "center", marginTop: "24px", fontSize: "12px", color: "#9CA3AF" }}>
              This is a general guide. Always consult a qualified CA and legal advisor for your specific situation. Nilay 360 can connect you with trusted professionals.
            </p>
          </div>
        </section>

        {/* ── 5. NRI HOME LOAN ────────────────────────────────── */}
        <section className="nri-loans" style={{ background: "#fff", padding: "96px 48px", borderTop: "1px solid rgba(13,43,31,0.06)", borderBottom: "1px solid rgba(13,43,31,0.06)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <Eyebrow label="Financing" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 400, color: "#020C1C" }}>
                NRI Home Loan<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Options</em>
              </h2>
            </div>
            <div className="nri-loans-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "32px" }}>
              {[
                {
                  bank: "HDFC NRI Loans", logo: "HDFC", rate: "8.70% – 9.85%", maxLoan: "₹10 Crore", tenure: "Up to 25 years",
                  features: ["Up to 80% of property value", "Doorstep service abroad", "Balance transfer facility", "Pre-approved in 48 hours"],
                  highlight: true,
                },
                {
                  bank: "SBI NRI Home Loans", logo: "SBI", rate: "8.50% – 9.65%", maxLoan: "₹15 Crore", tenure: "Up to 30 years",
                  features: ["Lowest rates in market", "No prepayment penalty", "Joint loan with resident", "PMAY benefit eligible"],
                  highlight: false,
                },
                {
                  bank: "ICICI NRI Loans", logo: "ICICI", rate: "8.75% – 10.05%", maxLoan: "₹8 Crore", tenure: "Up to 20 years",
                  features: ["Fast online processing", "Video KYC available", "Forex lock-in option", "Dedicated NRI desk"],
                  highlight: false,
                },
              ].map(b => (
                <div key={b.bank} style={{ background: b.highlight ? "#020C1C" : "#F8F6F1", border: b.highlight ? "none" : "1px solid rgba(13,43,31,0.07)", borderRadius: "18px", padding: "32px 28px", position: "relative", overflow: "hidden" }}>
                  {b.highlight && <div style={{ position: "absolute", top: "16px", right: "16px", padding: "4px 12px", background: "#10C4C3", borderRadius: "100px", fontSize: "9px", fontWeight: 800, letterSpacing: "0.1em", color: "#020C1C" }}>POPULAR</div>}
                  {b.highlight && <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />}
                  <div style={{ position: "relative", zIndex: 2 }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: b.highlight ? "rgba(201,168,76,0.15)" : "rgba(13,43,31,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, color: b.highlight ? "#10C4C3" : "#020C1C", marginBottom: "16px", letterSpacing: "0.05em" }}>{b.logo}</div>
                    <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "20px", fontWeight: 600, color: b.highlight ? "#FFFFFF" : "#020C1C", marginBottom: "18px" }}>{b.bank}</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                      {[{ l: "Interest Rate", v: b.rate }, { l: "Max Loan", v: b.maxLoan }, { l: "Tenure", v: b.tenure }].map(item => (
                        <div key={item.l} style={{ background: b.highlight ? "rgba(245,242,236,0.05)" : "rgba(13,43,31,0.04)", borderRadius: "8px", padding: "10px 12px" }}>
                          <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: b.highlight ? "rgba(201,168,76,0.5)" : "#9CA3AF", textTransform: "uppercase", marginBottom: "3px" }}>{item.l}</p>
                          <p style={{ fontSize: "13px", fontWeight: 700, color: b.highlight ? "#10C4C3" : "#020C1C" }}>{item.v}</p>
                        </div>
                      ))}
                    </div>
                    <ul style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                      {b.features.map(f => (
                        <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: b.highlight ? "rgba(245,242,236,0.55)" : "#6B7C72" }}>
                          <span style={{ color: "#10C4C3", fontWeight: 700 }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center" }}>
              <a href="/calculator" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px", background: "transparent", border: "1.5px solid rgba(13,43,31,0.18)", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                Calculate Your NRI EMI
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </a>
            </div>
          </div>
        </section>

        {/* ── 6. SERVICES ─────────────────────────────────────── */}
        <section className="nri-services" style={{ background: "#020C1C", padding: "96px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ maxWidth: "1200px", margin: "0 auto", position: "relative", zIndex: 2 }}>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <Eyebrow label="What We Do" dark />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 400, color: "#FFFFFF", lineHeight: 1.15 }}>
                Services We<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Offer</em>
              </h2>
            </div>
            <div className="nri-services-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              <ServiceCard icon="🎥" title="Virtual Property Tours" desc="HD live video walkthroughs conducted by our ground team on WhatsApp or Zoom. See the actual property, neighbourhood streets, and building amenities — not just photos." />
              <ServiceCard icon="⚖" title="Legal Due Diligence" desc="Comprehensive title search, RERA verification, encumbrance certificate review, builder track record check, and legal clearance report before you commit a single rupee." />
              <ServiceCard icon="📋" title="Power of Attorney Assistance" desc="We draft your POA, guide you through consulate attestation or apostille (depending on your country), and ensure your representative is briefed for every step." />
              <ServiceCard icon="🏠" title="Property Management" desc="After possession, we manage your property — regular inspections, maintenance coordination, utility payments, and condition reports with photos, delivered to you remotely." />
              <ServiceCard icon="💰" title="Rental Management" desc="Tenant sourcing, police verification, lease agreement drafting, rent collection, and monthly remittance to your NRE account. Full rental management from abroad." />
              <ServiceCard icon="📦" title="Resale Assistance" desc="When it's time to sell, our resale team handles valuation, listing, buyer qualification, negotiation, and registration — ensuring you get the best price with zero hassle." />
            </div>
          </div>
        </section>

        {/* ── 7. TESTIMONIALS ─────────────────────────────────── */}
        <section className="nri-testimonials" style={{ background: "#020C1C", padding: "96px 48px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <Eyebrow label="NRI Stories" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 400, color: "#FFFFFF" }}>
                NRIs Who Trusted<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Nilay 360</em>
              </h2>
            </div>
            <div className="nri-testimonials-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {TESTIMONIALS.map((t, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid rgba(13,43,31,0.07)", borderRadius: "18px", padding: "36px 32px" }}>
                  <div style={{ fontSize: "36px", fontFamily: "Georgia, serif", color: "#10C4C3", lineHeight: 0.9, marginBottom: "18px", opacity: 0.7 }}>"</div>
                  <p style={{ fontSize: "14px", color: "#374151", lineHeight: 1.8, fontStyle: "italic", marginBottom: "24px" }}>{t.quote}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "18px", borderTop: "1px solid rgba(13,43,31,0.06)" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.4))", border: "1.5px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "#10C4C3", flexShrink: 0 }}>{t.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#020C1C" }}>{t.name}</p>
                      <p style={{ fontSize: "11px", color: "#9CA3AF" }}>{t.role}</p>
                    </div>
                    <span style={{ fontSize: "20px" }}>{t.flag}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. CONSULTATION FORM ────────────────────────────── */}
        <section id="consultation" className="nri-consult" style={{ background: "#F8F6F1", padding: "96px 48px", borderTop: "1px solid rgba(13,43,31,0.06)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <Eyebrow label="Free Consultation" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 400, color: "#020C1C" }}>
                Book Your NRI<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Consultation</em>
              </h2>
            </div>
            <div className="nri-consult-grid" style={{ display: "grid", gridTemplateColumns: "0.85fr 1fr", gap: "28px", alignItems: "stretch" }}>
              {/* Left panel */}
              <div style={{ background: "#020C1C", borderRadius: "20px", padding: "44px 36px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 2 }}>
                  <div style={{ fontSize: "32px", marginBottom: "18px" }}>🌏</div>
                  <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "26px", fontWeight: 500, color: "#FFFFFF", marginBottom: "10px", lineHeight: 1.25 }}>Free 30-Minute<br />NRI Advisory Call</h3>
                  <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.5)", lineHeight: 1.75, marginBottom: "32px" }}>Talk to a dedicated NRI property advisor. No obligation, no pressure — just expert guidance tailored to your goals, budget, and country of residence.</p>
                  <ul style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {[
                      "FEMA eligibility assessment",
                      "Personalised property shortlist",
                      "Home loan eligibility check",
                      "NRI tax impact briefing",
                      "POA and documentation roadmap",
                      "Repatriation planning",
                    ].map(b => (
                      <li key={b} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "rgba(245,242,236,0.65)" }}>
                        <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#10C4C3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(245,242,236,0.08)" }}>
                    <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(201,168,76,0.5)", textTransform: "uppercase", marginBottom: "6px" }}>We're available in your timezone</p>
                    <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.5)", lineHeight: 1.6 }}>IST, GST, EST, PST, BST, SGT — our NRI advisors are available 7 days a week via Zoom, Google Meet, or WhatsApp Video.</p>
                  </div>
                </div>
              </div>

              {/* Right form */}
              <div style={{ background: "#fff", borderRadius: "20px", padding: "44px 36px", border: "1px solid rgba(13,43,31,0.07)" }}>
                {submitted ? (
                  <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(5,150,105,0.1)", border: "2px solid rgba(5,150,105,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "30px" }}>✓</div>
                    <h3 style={{ fontFamily: "var(--font-heading-new)", fontSize: "28px", fontWeight: 500, color: "#020C1C", marginBottom: "10px" }}>Consultation Booked!</h3>
                    <p style={{ fontSize: "14px", color: "#6B7C72", lineHeight: 1.7, maxWidth: "340px", margin: "0 auto 24px" }}>Thank you! Your dedicated NRI advisor will contact you within 4 business hours to confirm your appointment.</p>
                    <button onClick={() => setSubmitted(false)} style={{ padding: "10px 24px", background: "#020C1C", border: "none", borderRadius: "8px", color: "#020C1C", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body-new)" }}>Submit Another</button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div className="nri-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div><label style={LBL}>Full Name *</label><input required type="text" placeholder="Rajiv Menon" value={form.name} onChange={set("name")} style={INP} /></div>
                      <div><label style={LBL}>Email *</label><input required type="email" placeholder="rajiv@email.com" value={form.email} onChange={set("email")} style={INP} /></div>
                    </div>
                    <div className="nri-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div><label style={LBL}>Phone / WhatsApp *</label><input required type="tel" placeholder="+971 50 000 0000" value={form.phone} onChange={set("phone")} style={INP} /></div>
                      <div>
                        <label style={LBL}>Country of Residence *</label>
                        <select required value={form.country} onChange={set("country")} style={SEL}>
                          <option value="" disabled>Select country…</option>
                          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="nri-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <div>
                        <label style={LBL}>Budget</label>
                        <select value={form.budget} onChange={set("budget")} style={SEL}>
                          <option value="">Select range</option>
                          {["Under ₹50L", "₹50L – ₹1Cr", "₹1Cr – ₹3Cr", "₹3Cr – ₹7Cr", "₹7Cr – ₹15Cr", "Above ₹15Cr"].map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={LBL}>Preferred City</label>
                        <select value={form.city} onChange={set("city")} style={SEL}>
                          <option value="">Any city</option>
                          {["Hyderabad", "Mumbai", "Bengaluru", "Chennai", "Pune", "Delhi NCR"].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={LBL}>Property Type</label>
                      <select value={form.propertyType} onChange={set("propertyType")} style={SEL}>
                        <option value="">Any type</option>
                        {["Apartment", "Villa", "Penthouse", "Plot", "Commercial"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={LBL}>Message</label>
                      <textarea placeholder="Tell us about your requirements, timeline, or any specific questions…" value={form.message} onChange={set("message")} rows={3} style={{ ...INP, resize: "vertical", minHeight: "80px", lineHeight: 1.65 }} />
                    </div>
                    <button type="submit" disabled={submitting} style={{ padding: "14px", background: submitting ? "rgba(13,43,31,0.4)" : "#10C4C3", border: "none", borderRadius: "10px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                      {submitting ? "Booking…" : "Book Free Consultation"}
                      {!submitting && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>}
                    </button>
                    <p style={{ fontSize: "11px", color: "#9CA3AF", textAlign: "center" }}>Free consultation · No obligation · Response within 4 hours</p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. FAQ ──────────────────────────────────────────── */}
        <section className="nri-faq" style={{ background: "#020C1C", padding: "96px 48px" }}>
          <div style={{ maxWidth: "820px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "52px" }}>
              <Eyebrow label="Common Questions" />
              <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 400, color: "#FFFFFF", lineHeight: 1.15 }}>
                NRI Property<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>FAQs</em>
              </h2>
            </div>
            <div style={{ background: "#fff", borderRadius: "18px", padding: "8px 36px", border: "1px solid rgba(13,43,31,0.07)", boxShadow: "0 2px 16px rgba(13,43,31,0.04)" }}>
              {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} index={i} />)}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ─────────────────────────────────────── */}
        <section className="nri-cta" style={{ background: "#020C1C", padding: "90px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 55% at 50% 110%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 300, color: "#FFFFFF", lineHeight: 1.15, marginBottom: "16px" }}>
              Your Dream Home in India<br /><em style={{ fontStyle: "italic", color: "#10C4C3" }}>Is One Call Away</em>
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.5)", lineHeight: 1.75, marginBottom: "36px" }}>
              Wherever you are — Dubai, California, London, or beyond — our NRI advisory team is ready to help you find, evaluate, and manage your Indian property. Let's talk.
            </p>
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="#consultation" style={{ padding: "14px 36px", background: "#10C4C3", borderRadius: "9px", color: "#020C1C", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                Book Free Consultation
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </a>
              <a href="/properties" style={{ padding: "14px 36px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.2)", borderRadius: "9px", color: "rgba(245,242,236,0.75)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>
                Browse Properties
              </a>
            </div>
          </div>
        </section>


      </div>
    </>
  );
}

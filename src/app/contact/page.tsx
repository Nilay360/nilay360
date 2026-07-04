"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────
type FormState = {
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  property_type: string;
  budget_range: string;
};

const EMPTY_FORM: FormState = {
  full_name: "", email: "", phone: "", subject: "", message: "", property_type: "", budget_range: "",
};

const SUBJECTS = [
  "General Inquiry", "Buy Property", "Sell Property", "Rent Property",
  "Agent Partnership", "NRI Services", "Media & Press",
];

const PROPERTY_TYPES = ["Apartment", "Villa", "Plot", "Commercial"];

const BUDGETS = [
  "Under ₹50 Lakhs", "₹50L – ₹1 Crore", "₹1Cr – ₹2Cr", "₹2Cr – ₹5Cr", "₹5Cr – ₹10Cr", "Above ₹10 Crore",
];

const FAQS = [
  {
    q: "How do I schedule a property viewing?",
    a: "You can schedule a viewing directly from any property listing page by clicking the 'Schedule Visit' button, or by contacting our team via the form above. We typically confirm viewings within 2 hours and offer both in-person and virtual tour options.",
  },
  {
    q: "Are all listings on Nilay 360 RERA verified?",
    a: "Yes — every listing on Nilay 360 is manually verified by our ground team before going live. We check RERA registration, title documentation, builder credentials, and pricing accuracy. No ghost listings, no outdated information.",
  },
  {
    q: "Do you assist NRI buyers?",
    a: "Absolutely. Our dedicated NRI Concierge team handles the complete process remotely — virtual property tours, FEMA compliance guidance, POA assistance, legal due diligence, and post-purchase property management. Select 'NRI Services' in the subject field above.",
  },
  {
    q: "What are your agent subscription plans?",
    a: "Nilay 360 offers flexible plans for individual agents and agencies. Our plans include verified listing slots, leads, CRM tools, and co-branding options. Select 'Agent Partnership' in the contact form and our partnerships team will reach out within 24 hours.",
  },
  {
    q: "How long does the buying process typically take?",
    a: "For ready-to-move properties, the process from offer to registration typically takes 30–45 days, depending on home loan processing and documentation. For under-construction properties, the timeline depends on the project's possession schedule. Our advisors will walk you through every step.",
  },
  {
    q: "Do you offer home loan assistance?",
    a: "Yes. Nilay 360 has partnerships with all major banks and NBFCs — including HDFC, ICICI, SBI, and Bajaj Finance. Our loan advisors can help you compare rates, check eligibility, and get pre-approval before you start your property search.",
  },
];

// ── Input component ───────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
      <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "#4B5563", textTransform: "uppercase" }}>
        {label}{required && <span style={{ color: "#2BA8E0", marginLeft: "3px" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "12px 16px", background: "#F8F6F1",
  border: "1.5px solid rgba(13,43,31,0.12)", borderRadius: "9px",
  fontSize: "14px", color: "#000000", fontFamily: "'DM Sans', sans-serif",
  outline: "none", transition: "border-color 0.15s",
};

// ── FAQ item ──────────────────────────────────────────────────
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(13,43,31,0.08)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "22px 0", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textAlign: "left" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ width: "28px", height: "28px", borderRadius: "8px", background: open ? "#000000" : "rgba(201,168,76,0.1)", border: `1px solid ${open ? "transparent" : "rgba(201,168,76,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: open ? "#2BA8E0" : "#2BA8E0", flexShrink: 0, transition: "background 0.2s" }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span style={{ fontSize: "15px", fontWeight: 600, color: "#000000", lineHeight: 1.4 }}>{q}</span>
        </div>
        <span style={{ fontSize: "20px", color: "#2BA8E0", flexShrink: 0, transform: open ? "rotate(45deg)" : "rotate(0)", transition: "transform 0.2s", lineHeight: 1 }}>+</span>
      </button>
      <div style={{ maxHeight: open ? "300px" : "0", overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <p style={{ fontSize: "14px", color: "#6B7C72", lineHeight: 1.8, padding: "0 0 22px 42px" }}>{a}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ContactPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.subject || !form.message) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: dbErr } = await supabase.from("contact_messages").insert({
        name: form.full_name,
        email: form.email,
        phone: form.phone ? `+91${form.phone}` : null,
        subject: form.subject,
        message: form.message,
      });
      if (dbErr) throw dbErr;
      // Fire-and-forget email notification to support inbox
      fetch("/api/send-support-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.full_name,
          email: form.email,
          phone: form.phone ? `+91${form.phone}` : undefined,
          subject: form.subject,
          message: form.message,
        }),
      }).catch(() => {/* non-fatal */});
      setSuccess(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error('Contact submit error:', err);
      setError(
        err instanceof Error
          ? `Sorry, we couldn't send your message: ${err.message}. Please try again or email us directly.`
          : "Sorry, we couldn't send your message. Please try again or email us directly."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = (name: string): React.CSSProperties => ({
    ...INPUT_STYLE,
    borderColor: focusedField === name ? "#2BA8E0" : "rgba(13,43,31,0.12)",
    boxShadow: focusedField === name ? "0 0 0 3px rgba(201,168,76,0.08)" : "none",
  });

  const focusHandlers = (name: string) => ({
    onFocus: () => setFocusedField(name),
    onBlur: () => setFocusedField(null),
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #000000; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.3); border-radius: 2px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
        select option { background: #fff; color: #000000; }
        @media (max-width: 768px) {
          .ct-hero-inner { padding: 48px 20px 56px !important; }
          .ct-hero-pills { flex-direction: column !important; align-items: stretch !important; }
          .ct-main { grid-template-columns: 1fr !important; padding: 40px 16px !important; }
          .ct-form-row { grid-template-columns: 1fr !important; }
          .ct-offices { padding: 56px 16px !important; }
          .ct-offices-grid { grid-template-columns: 1fr !important; }
          .ct-faq { padding: 64px 16px !important; }
          .ct-cta { padding: 64px 16px !important; }
          .ct-footer { padding: 56px 16px 0 !important; }
          .ct-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          .ct-footer-grid { grid-template-columns: 1fr !important; }
          .ct-hero-inner { padding: 36px 16px 40px !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#000000" }}>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section style={{ paddingTop: "64px", background: "#000000", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 70% at 85% 110%, rgba(201,168,76,0.09) 0%, transparent 55%), radial-gradient(ellipse 50% 55% at 5% -5%, rgba(45,106,79,0.25) 0%, transparent 50%)", pointerEvents: "none" }} />
          <div className="ct-hero-inner" style={{ position: "relative", zIndex: 2, maxWidth: "800px", margin: "0 auto", padding: "72px 48px 80px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "5px 16px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: "100px", marginBottom: "24px" }}>
              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#2BA8E0", boxShadow: "0 0 6px rgba(201,168,76,0.5)" }} />
              <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#2BA8E0", textTransform: "uppercase" }}>We're Here to Help</span>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(44px, 6.5vw, 72px)", fontWeight: 300, color: "#000000", lineHeight: 1.1, marginBottom: "18px", animation: "fadeUp 0.55s ease-out both" }}>
              Get In Touch
            </h1>
            <p style={{ fontSize: "16px", color: "rgba(245,242,236,0.5)", lineHeight: 1.75, marginBottom: "36px", animation: "fadeUp 0.55s 0.1s ease-out both" }}>
              Our team responds within 2 hours during business hours.<br />Premium service, every step of the way.
            </p>
            {/* Quick contact pills */}
            <div className="ct-hero-pills" style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", animation: "fadeUp 0.55s 0.2s ease-out both" }}>
              {[
                { icon: "📞", label: "Call Us", value: "+91 40 0000 0000", href: "tel:+914000000000" },
                { icon: "✉", label: "Email",   value: "hello@nilay360.com",  href: "mailto:hello@nilay360.com" },
                { icon: "💬", label: "WhatsApp",value: "+91 90000 00000",  href: "https://wa.me/919000000000" },
              ].map(p => (
                <a key={p.label} href={p.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 20px", background: "rgba(245,242,236,0.06)", border: "1px solid rgba(245,242,236,0.13)", borderRadius: "100px", textDecoration: "none", transition: "border-color 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.4)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(245,242,236,0.13)")}>
                  <span style={{ fontSize: "16px" }}>{p.icon}</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(245,242,236,0.4)", textTransform: "uppercase" }}>{p.label}</span>
                  <span style={{ fontSize: "13px", color: "#000000", fontWeight: 500 }}>{p.value}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ── MAIN CONTENT ───────────────────────────────────── */}
        <section className="ct-main" style={{ maxWidth: "1280px", margin: "0 auto", padding: "72px 48px", display: "grid", gridTemplateColumns: "1fr 0.65fr", gap: "40px", alignItems: "flex-start" }}>

          {/* ── LEFT: FORM ─────────────────────────────────── */}
          <div style={{ background: "#fff", borderRadius: "20px", padding: "48px 44px", border: "1px solid rgba(13,43,31,0.07)", boxShadow: "0 2px 20px rgba(13,43,31,0.05)" }}>
            <div style={{ marginBottom: "32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <div style={{ width: "28px", height: "1.5px", background: "#2BA8E0" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#2BA8E0", textTransform: "uppercase" }}>Send a Message</span>
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 500, color: "#000000", lineHeight: 1.2 }}>How Can We Help You?</h2>
              <p style={{ fontSize: "13px", color: "#6B7C72", marginTop: "8px", lineHeight: 1.6 }}>Fields marked with <span style={{ color: "#2BA8E0" }}>*</span> are required.</p>
            </div>

            {success ? (
              <div style={{ textAlign: "center", padding: "56px 24px", animation: "scaleIn 0.35s ease-out" }}>
                <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "rgba(5,150,105,0.1)", border: "2px solid rgba(5,150,105,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: "32px" }}>✓</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 500, color: "#000000", marginBottom: "10px" }}>Message Sent Successfully</h3>
                <p style={{ fontSize: "14px", color: "#6B7C72", lineHeight: 1.7, maxWidth: "380px", margin: "0 auto 28px" }}>Thank you for reaching out. A member of our team will respond to your enquiry within 2 business hours.</p>
                <button onClick={() => setSuccess(false)} style={{ padding: "11px 28px", background: "#000000", border: "none", borderRadius: "8px", color: "#000000", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em" }}>
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* Row 1 */}
                <div className="ct-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <Field label="Full Name" required>
                    <input type="text" placeholder="Arjun Mehta" value={form.full_name} onChange={set("full_name")} style={inputStyle("full_name")} {...focusHandlers("full_name")} />
                  </Field>
                  <Field label="Email Address" required>
                    <input type="email" placeholder="arjun@email.com" value={form.email} onChange={set("email")} style={inputStyle("email")} {...focusHandlers("email")} />
                  </Field>
                </div>
                {/* Row 2 */}
                <div className="ct-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <Field label="Phone Number">
                    <div style={{ position: "relative", display: "flex" }}>
                      <span style={{ display: "flex", alignItems: "center", padding: "0 12px", background: "#F0EDE7", border: "1.5px solid rgba(13,43,31,0.12)", borderRight: "none", borderRadius: "9px 0 0 9px", fontSize: "13px", fontWeight: 600, color: "#4B5563", whiteSpace: "nowrap" }}>+91</span>
                      <input type="tel" placeholder="98765 43210" value={form.phone} onChange={set("phone")} style={{ ...inputStyle("phone"), borderRadius: "0 9px 9px 0", borderLeft: "none" }} {...focusHandlers("phone")} />
                    </div>
                  </Field>
                  <Field label="Subject" required>
                    <select value={form.subject} onChange={set("subject")} style={{ ...inputStyle("subject"), appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7C72' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }} {...focusHandlers("subject")}>
                      <option value="" disabled>Select subject…</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                </div>
                {/* Message */}
                <Field label="Message" required>
                  <textarea
                    placeholder="Tell us about your requirements — property type, location, timeline, budget…"
                    value={form.message} onChange={set("message")} rows={5}
                    style={{ ...inputStyle("message"), resize: "vertical", minHeight: "120px", lineHeight: 1.65 }}
                    {...focusHandlers("message")}
                  />
                </Field>
                {/* Row 3 — optional */}
                <div style={{ borderTop: "1px dashed rgba(13,43,31,0.1)", paddingTop: "20px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "#9CA3AF", textTransform: "uppercase", marginBottom: "16px" }}>Optional — helps us serve you better</p>
                  <div className="ct-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <Field label="Property Type">
                      <select value={form.property_type} onChange={set("property_type")} style={{ ...inputStyle("property_type"), appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7C72' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }} {...focusHandlers("property_type")}>
                        <option value="">Any type</option>
                        {PROPERTY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </Field>
                    <Field label="Budget Range">
                      <select value={form.budget_range} onChange={set("budget_range")} style={{ ...inputStyle("budget_range"), appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7C72' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }} {...focusHandlers("budget_range")}>
                        <option value="">Any budget</option>
                        {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                {error && (
                  <div style={{ padding: "12px 16px", background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "8px", fontSize: "13px", color: "#DC2626" }}>{error}</div>
                )}

                <button
                  type="submit" disabled={submitting}
                  style={{ padding: "15px 32px", background: submitting ? "rgba(13,43,31,0.4)" : "#000000", border: "none", borderRadius: "10px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "background 0.2s", marginTop: "4px" }}
                  onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLButtonElement).style.background = "#2BA8E0"; (e.currentTarget as HTMLButtonElement).style.color = "#000000"; }}
                  onMouseLeave={e => { if (!submitting) { (e.currentTarget as HTMLButtonElement).style.background = "#000000"; (e.currentTarget as HTMLButtonElement).style.color = "#000000"; } }}
                >
                  {submitting ? (
                    <>
                      <span style={{ width: "14px", height: "14px", border: "2px solid rgba(245,242,236,0.3)", borderTopColor: "#000000", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send Message
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </>
                  )}
                </button>
                <p style={{ fontSize: "11px", color: "#9CA3AF", textAlign: "center" }}>
                  By submitting you agree to our <a href="/privacy" style={{ color: "#2BA8E0", textDecoration: "none" }}>Privacy Policy</a>. We never share your data with third parties.
                </p>
              </form>
            )}
          </div>

          {/* ── RIGHT: INFO + MAP + SOCIAL ─────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Contact info card */}
            <div style={{ background: "#000000", borderRadius: "20px", padding: "36px 32px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />
              <div style={{ position: "relative", zIndex: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#2BA8E0" }} />
                  <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#2BA8E0", textTransform: "uppercase" }}>Contact Details</span>
                </div>
                {[
                  { icon: "📍", label: "Address",  value: "Jubilee Hills, Hyderabad\nTelangana — 500 033" },
                  { icon: "📞", label: "Phone",    value: "+91 40 0000 0000", href: "tel:+914000000000" },
                  { icon: "✉",  label: "Email",    value: "hello@nilay360.com",  href: "mailto:hello@nilay360.com" },
                  { icon: "💬", label: "WhatsApp", value: "+91 90000 00000",   href: "https://wa.me/919000000000" },
                  { icon: "🕐", label: "Hours",    value: "Mon – Sat · 9 AM – 7 PM IST" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "14px 0", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
                    <span style={{ fontSize: "17px", flexShrink: 0, marginTop: "1px" }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(201,168,76,0.5)", textTransform: "uppercase", marginBottom: "3px" }}>{item.label}</div>
                      {item.href ? (
                        <a href={item.href} style={{ fontSize: "13px", color: "#000000", textDecoration: "none", fontWeight: 500 }}>{item.value}</a>
                      ) : (
                        <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.65)", lineHeight: 1.6, whiteSpace: "pre-line" }}>{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map placeholder */}
            <div style={{ background: "#000000", borderRadius: "16px", padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "200px", border: "1px solid rgba(201,168,76,0.12)", position: "relative", overflow: "hidden", cursor: "pointer" }}
              onClick={() => window.open("https://maps.google.com/?q=Jubilee+Hills+Hyderabad", "_blank")}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 50% 50%, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "rgba(201,168,76,0.15)", border: "1.5px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "14px" }}>📍</div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#000000", marginBottom: "4px" }}>Jubilee Hills, Hyderabad</p>
              <p style={{ fontSize: "12px", color: "rgba(245,242,236,0.35)" }}>Telangana — 500 033</p>
              <span style={{ marginTop: "14px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "#2BA8E0", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px" }}>
                Open in Maps
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
              </span>
            </div>

            {/* Social links */}
            <div style={{ background: "#fff", borderRadius: "16px", padding: "24px 28px", border: "1px solid rgba(13,43,31,0.07)" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "#9CA3AF", textTransform: "uppercase", marginBottom: "16px" }}>Follow Us</p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {[
                  { label: "Instagram", handle: "@nilay360.com",   icon: "IG", color: "#E1306C", href: "https://www.instagram.com/nilay360" },
                  { label: "LinkedIn",  handle: "Nilay 360",       icon: "IN", color: "#0A66C2", href: "https://www.linkedin.com/company/nilay360" },
                  { label: "Twitter",   handle: "@Nilay 360India", icon: "TW", color: "#1DA1F2", href: "https://twitter.com/Nilay 360India" },
                  { label: "YouTube",   handle: "Nilay 360 TV",    icon: "YT", color: "#FF0000", href: "https://www.youtube.com/@nilay360" },
                ].map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px", background: "#F8F6F1", borderRadius: "8px", textDecoration: "none", border: "1px solid rgba(13,43,31,0.06)", flex: "1 1 calc(50% - 5px)" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(13,43,31,0.06)")}>
                    <span style={{ width: "26px", height: "26px", borderRadius: "6px", background: s.color + "18", border: `1px solid ${s.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: 800, color: s.color }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#000000" }}>{s.label}</div>
                      <div style={{ fontSize: "10px", color: "#9CA3AF" }}>{s.handle}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── OFFICE LOCATIONS ───────────────────────────────── */}
        <section className="ct-offices" style={{ background: "#F8F6F1", padding: "80px 48px", borderTop: "1px solid rgba(13,43,31,0.06)" }}>
          <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#2BA8E0", textTransform: "uppercase" }}>Where We Operate</span>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(30px, 3.8vw, 46px)", fontWeight: 400, color: "#000000" }}>Our Office Locations</h2>
            </div>
            <div className="ct-offices-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              {[
                { city: "Hyderabad", sub: "Headquarters", address: "Road No. 12, Jubilee Hills\nHyderabad, Telangana 500 033", phone: "+91 40 0000 0000", status: "Open", statusColor: "#059669", statusBg: "rgba(5,150,105,0.08)", main: true },
                { city: "Mumbai",    sub: "Regional Office", address: "Bandra Kurla Complex\nMumbai, Maharashtra 400 051", phone: "Coming soon",       status: "Coming Soon", statusColor: "#D97706", statusBg: "rgba(217,119,6,0.08)", main: false },
                { city: "Bengaluru", sub: "Regional Office", address: "Koramangala, 5th Block\nBengaluru, Karnataka 560 095", phone: "Coming soon",    status: "Coming Soon", statusColor: "#D97706", statusBg: "rgba(217,119,6,0.08)", main: false },
              ].map(loc => (
                <div key={loc.city} style={{ background: loc.main ? "#000000" : "#fff", borderRadius: "18px", padding: "36px 32px", border: loc.main ? "none" : "1px solid rgba(13,43,31,0.07)", position: "relative", overflow: "hidden" }}>
                  {loc.main && <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "36px 36px", pointerEvents: "none" }} />}
                  <div style={{ position: "relative", zIndex: 2 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
                      <div>
                        <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "26px", fontWeight: 600, color: loc.main ? "#000000" : "#000000", marginBottom: "3px" }}>{loc.city}</h3>
                        <p style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", color: loc.main ? "rgba(201,168,76,0.6)" : "#9CA3AF", textTransform: "uppercase" }}>{loc.sub}</p>
                      </div>
                      <span style={{ padding: "4px 12px", borderRadius: "100px", fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", background: loc.main ? "rgba(5,150,105,0.15)" : loc.statusBg, color: loc.main ? "#86EFAC" : loc.statusColor, border: `1px solid ${loc.main ? "rgba(5,150,105,0.25)" : loc.statusColor + "33"}` }}>
                        {loc.status}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: loc.main ? "rgba(245,242,236,0.55)" : "#6B7C72", lineHeight: 1.7, marginBottom: "16px", whiteSpace: "pre-line" }}>{loc.address}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: loc.main ? "rgba(245,242,236,0.05)" : "#F8F6F1", borderRadius: "8px", border: `1px solid ${loc.main ? "rgba(245,242,236,0.07)" : "rgba(13,43,31,0.06)"}` }}>
                      <span style={{ fontSize: "14px" }}>📞</span>
                      <span style={{ fontSize: "13px", fontWeight: 500, color: loc.main ? "rgba(245,242,236,0.7)" : "#4B5563" }}>{loc.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <section className="ct-faq" style={{ background: "#000000", padding: "100px 48px" }}>
          <div style={{ maxWidth: "820px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "56px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.22em", color: "#2BA8E0", textTransform: "uppercase" }}>Common Questions</span>
                <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.5)" }} />
              </div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(32px, 4vw, 50px)", fontWeight: 400, color: "#000000", lineHeight: 1.15 }}>
                Frequently Asked<br /><em style={{ fontStyle: "italic", color: "#2BA8E0" }}>Questions</em>
              </h2>
              <p style={{ fontSize: "15px", color: "#6B7C72", marginTop: "14px", lineHeight: 1.7 }}>
                Can't find what you're looking for? <a href="mailto:hello@nilay360.com" style={{ color: "#2BA8E0", textDecoration: "none", fontWeight: 600 }}>Email us directly</a>.
              </p>
            </div>
            <div style={{ background: "#fff", borderRadius: "18px", padding: "8px 36px", border: "1px solid rgba(13,43,31,0.07)", boxShadow: "0 2px 16px rgba(13,43,31,0.04)" }}>
              {FAQS.map((faq, i) => <FaqItem key={i} q={faq.q} a={faq.a} index={i} />)}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────── */}
        <section className="ct-cta" style={{ background: "#000000", padding: "90px 48px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 55% at 50% 110%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "660px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "clamp(34px, 5vw, 56px)", fontWeight: 300, color: "#000000", lineHeight: 1.15, marginBottom: "16px" }}>
              Ready to Find Your<br /><em style={{ fontStyle: "italic", color: "#2BA8E0" }}>Perfect Property?</em>
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(245,242,236,0.5)", lineHeight: 1.75, marginBottom: "36px" }}>
              Browse our verified listings or speak to an advisor today. Premium real estate, done right.
            </p>
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/properties" style={{ padding: "14px 36px", background: "#2BA8E0", borderRadius: "9px", color: "#000000", fontSize: "13px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                Browse Properties
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </a>
              <a href="https://wa.me/919000000000" style={{ padding: "14px 36px", background: "transparent", border: "1.5px solid rgba(245,242,236,0.2)", borderRadius: "9px", color: "rgba(245,242,236,0.75)", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "16px" }}>💬</span> WhatsApp Us
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <footer className="ct-footer" style={{ background: "#05080C", padding: "72px 48px 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="ct-footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "48px", paddingBottom: "56px", borderBottom: "1px solid rgba(245,242,236,0.06)" }}>
              <div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 600, color: "#fff", letterSpacing: "0.16em", marginBottom: "14px" }}>Nilay 360 <span style={{ color: "#2BA8E0" }}>·</span></div>
                <p style={{ fontSize: "13px", color: "rgba(245,242,236,0.35)", lineHeight: 1.75, maxWidth: "280px", marginBottom: "22px" }}>India's most trusted premium real estate platform. Verified listings, certified agents, independent legal guidance.</p>
                <div style={{ display: "flex", gap: "10px" }}>
                  {["IG", "IN", "TW", "YT"].map(s => (
                    <div key={s} style={{ width: "34px", height: "34px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "rgba(255,255,255,0.35)", fontWeight: 700, cursor: "pointer" }}>{s}</div>
                  ))}
                </div>
              </div>
              {[
                { heading: "Properties", links: [["Buy","/buy"],["Rent","/rent"],["New Projects","/new-projects"],["Commercial","/commercial"],["Builders","/builders"],["Blog","/blog"]] },
                { heading: "Company",    links: [["About Us","/about"],["Our Agents","/agents"],["NRI Services","/nri"],["Careers","/careers"],["Contact","/contact"]] },
                { heading: "Tools",      links: [["EMI Calculator","/calculator"],["Compare","/compare"],["Search","/search"],["RERA Guide","/legal-guide"]] },
                { heading: "Legal",      links: [["Privacy Policy","/privacy"],["Terms of Service","/terms"],["Cookie Policy","/cookies"],["RERA Guide","/legal-guide"]] },
              ].map(col => (
                <div key={col.heading}>
                  <h4 style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.16em", color: "rgba(245,242,236,0.3)", textTransform: "uppercase", marginBottom: "18px" }}>{col.heading}</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
                    {col.links.map(([l,h]) => <a key={l} href={h} style={{ fontSize: "13px", color: "rgba(245,242,236,0.45)", textDecoration: "none" }}>{l}</a>)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 0", flexWrap: "wrap", gap: "12px" }}>
              <p style={{ fontSize: "12px", color: "rgba(245,242,236,0.2)" }}>© 2025 Nilay 360. All rights reserved. Registered in India.</p>
              <div style={{ display: "flex", gap: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", padding: "4px 10px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "4px", color: "rgba(201,168,76,0.5)" }}>RERA COMPLIANT</span>
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", padding: "4px 10px", background: "rgba(245,242,236,0.04)", border: "1px solid rgba(245,242,236,0.07)", borderRadius: "4px", color: "rgba(245,242,236,0.25)" }}>ISO 27001</span>
              </div>
            </div>
          </div>
        </footer>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
}

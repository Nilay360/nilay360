"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCompare } from "@/context/CompareContext";
import { createClient } from "@/lib/supabase/client";

const GENERIC_WHATSAPP_TEXT = "Hi, I'm interested in a property on Nilay 360";
const GENERIC_WHATSAPP_HREF = `https://wa.me/917075792497?text=${encodeURIComponent(GENERIC_WHATSAPP_TEXT)}`;

function IconPhone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.89 9.11a19.79 19.79 0 01-3.07-8.67A2 2 0 012.8 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.09 9.91a16 16 0 006 6l.96-.96a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function IconSMS() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.122 1.528 5.855L0 24l6.335-1.517A11.946 11.946 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 01-4.988-1.364l-.358-.214-3.716.89.927-3.63-.234-.372A9.797 9.797 0 012.182 12C2.182 6.564 6.564 2.182 12 2.182c5.436 0 9.818 4.382 9.818 9.818 0 5.436-4.382 9.818-9.818 9.818z" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconBot() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M12 2a2 2 0 100 4 2 2 0 000-4z" />
      <path d="M12 6v5" />
      <circle cx="8.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const MENU_ITEMS = [
  {
    id: "callback",
    label: "Request a Callback",
    icon: <IconPhone />,
    color: "#10C4C3",
    action: "modal" as const,
  },
  {
    id: "sms",
    label: "Chat via SMS",
    icon: <IconSMS />,
    color: "#6366F1",
    href: "sms:+917075792497?body=Hi%2C%20I%27m%20interested%20in%20a%20property%20on%20Nilay%20360",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: <IconWhatsApp />,
    color: "#25D366",
    href: GENERIC_WHATSAPP_HREF,
    external: true,
  },
  {
    id: "enquiry",
    label: "Enquiry",
    icon: <IconMail />,
    color: "#F59E0B",
    href: "/contact",
  },
  {
    id: "chatbot",
    label: "AI Chatbot",
    icon: <IconBot />,
    color: "#8B5CF6",
    comingSoon: true,
  },
] as const;

export default function FloatingContactMenu() {
  const [open, setOpen] = useState(false);
  const [showCallback, setShowCallback] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [callbackDone, setCallbackDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { count: compareCount } = useCompare();
  const pathname = usePathname();
  const isPropertyPage = pathname?.startsWith("/property/") ?? false;

  // Lift the FAB above CompareBar when it's visible (CompareBar is ~64px at bottom:0)
  const bottomOffset = compareCount > 0 ? 88 : 24;

  // On a property page, swap the generic WhatsApp message for one carrying the
  // actual listing title + link — read after mount since document.title/location
  // aren't available during SSR. Falls back to the generic message otherwise.
  const [whatsappHref, setWhatsappHref] = useState(GENERIC_WHATSAPP_HREF);
  useEffect(() => {
    if (!isPropertyPage) {
      setWhatsappHref(GENERIC_WHATSAPP_HREF);
      return;
    }
    const propertyTitle = document.title.split(" | ")[0] || document.title;
    const message = `Hi, I'm interested in this property on Nilay360: ${propertyTitle} - ${window.location.href}`;
    setWhatsappHref(`https://wa.me/917075792497?text=${encodeURIComponent(message)}`);
  }, [isPropertyPage, pathname]);

  // Prefill name/phone for a signed-in visitor — same "only if still blank"
  // rule as post-property.tsx's PREFILL_SELLER_EMAIL: never overwrites
  // something already typed into the form. This widget has no
  // useAuth()/profile fetch of its own, so session + profile are read
  // directly, once, on mount.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }: Awaited<ReturnType<typeof supabase.auth.getSession>>) => {
      const sessionUser = data.session?.user;
      if (!sessionUser) return;
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", sessionUser.id)
        .maybeSingle();
      if (profileRow?.full_name) setForm(f => ({ ...f, name: f.name || profileRow.full_name! }));
      if (profileRow?.phone) setForm(f => ({ ...f, phone: f.phone || profileRow.phone! }));
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCallback(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setShowCallback(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function submitCallback(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSubmitting(true);
    try {
      await fetch("/api/request-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setCallbackDone(true);
      setForm({ name: "", phone: "" });
      setTimeout(() => {
        setCallbackDone(false);
        setShowCallback(false);
        setOpen(false);
      }, 3000);
    } catch {
      // non-fatal
    } finally {
      setSubmitting(false);
    }
  }

  function toggleOpen() {
    if (open) {
      setOpen(false);
      setShowCallback(false);
    } else {
      setOpen(true);
    }
  }

  return (
    <>
      <style>{`
        .fcm-pill {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px 10px 10px;
          background: rgba(8,8,14,0.88);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 100px;
          cursor: pointer;
          font-family: var(--font-body-new); font-size: 13px; font-weight: 600; color: #fff;
          text-decoration: none; white-space: nowrap;
          transition: border-color 0.15s, background 0.15s;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .fcm-pill:hover { background: rgba(18,18,26,0.96); border-color: rgba(255,255,255,0.22); }
        .fcm-pill--disabled { opacity: 0.5 !important; cursor: not-allowed !important; pointer-events: none; }
        .fcm-icon-wrap { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .fcm-fab {
          width: 56px; height: 56px; border-radius: 50%; border: none;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          color: #fff; outline: none;
          transition: transform 0.2s, background 0.2s;
          box-shadow: 0 4px 20px rgba(16,196,195,0.45);
        }
        .fcm-fab:hover { transform: scale(1.08); }
        .fcm-fab:focus-visible { outline: 3px solid rgba(16,196,195,0.6); outline-offset: 3px; }
        .fcm-fab--closed { animation: fcmPulse 2.2s ease-out infinite; }
        @keyframes fcmPulse {
          0%   { box-shadow: 0 4px 20px rgba(16,196,195,0.45), 0 0 0 0 rgba(16,196,195,0.35); }
          70%  { box-shadow: 0 4px 20px rgba(16,196,195,0.45), 0 0 0 14px rgba(16,196,195,0); }
          100% { box-shadow: 0 4px 20px rgba(16,196,195,0.45), 0 0 0 0 rgba(16,196,195,0); }
        }
        .fcm-input {
          padding: 10px 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          font-size: 13px; color: #fff;
          font-family: var(--font-body-new);
          outline: none; width: 100%; box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .fcm-input:focus { border-color: rgba(16,196,195,0.5); }
        .fcm-input::placeholder { color: rgba(255,255,255,0.28); }
        @media (max-width: 480px) {
          .fcm-fab { width: 48px; height: 48px; }
          .fcm-pill { font-size: 12px; padding: 9px 14px 9px 9px; }
          .fcm-icon-wrap { width: 24px; height: 24px; }
        }
      `}</style>

      <div
        ref={containerRef}
        style={{
          position: "fixed",
          bottom: bottomOffset,
          right: 24,
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 10,
          transition: "bottom 0.3s ease",
        }}
      >
        {/* Menu items */}
        <AnimatePresence>
          {open && !showCallback && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}
            >
              {[...MENU_ITEMS].reverse().map((item, reverseI) => {
                const staggerIndex = MENU_ITEMS.length - 1 - reverseI;
                const inner = (
                  <>
                    <span
                      className="fcm-icon-wrap"
                      style={{ background: item.color + "22", color: item.color }}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {"comingSoon" in item && item.comingSoon && (
                      <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", padding: "2px 7px", background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: "100px", color: "#A78BFA", textTransform: "uppercase" }}>
                        Soon
                      </span>
                    )}
                  </>
                );

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 14, scale: 0.92 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 14, scale: 0.92 }}
                    transition={{ delay: staggerIndex * 0.045, duration: 0.18, ease: "easeOut" }}
                  >
                    {"comingSoon" in item && item.comingSoon ? (
                      <div
                        className="fcm-pill fcm-pill--disabled"
                        role="button"
                        aria-disabled="true"
                        aria-label={`${item.label} — Coming Soon`}
                      >
                        {inner}
                      </div>
                    ) : "action" in item && item.action === "modal" ? (
                      <button
                        className="fcm-pill"
                        onClick={() => setShowCallback(true)}
                        aria-label={item.label}
                        type="button"
                      >
                        {inner}
                      </button>
                    ) : "external" in item && item.external ? (
                      <a
                        href={item.id === "whatsapp" ? whatsappHref : (item as { href: string }).href}
                        className="fcm-pill"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={item.label}
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link
                        href={"href" in item ? (item.href ?? "/contact") : "/contact"}
                        className="fcm-pill"
                        aria-label={item.label}
                        onClick={() => setOpen(false)}
                      >
                        {inner}
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Callback form card */}
        <AnimatePresence>
          {open && showCallback && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                background: "rgba(8,8,14,0.92)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 18,
                padding: "20px 20px 16px",
                width: 272,
                fontFamily: "var(--font-body-new)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Request a Callback</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", margin: "3px 0 0" }}>We&apos;ll call you within 2 hours</p>
                </div>
                <button
                  onClick={() => setShowCallback(false)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "50%", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.45)", padding: 0, flexShrink: 0 }}
                  aria-label="Close callback form"
                  type="button"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              {callbackDone ? (
                <div style={{ textAlign: "center", padding: "14px 0" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 20 }}>✓</div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#4ADE80", margin: 0 }}>Callback requested!</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 4 }}>We&apos;ll reach you shortly.</p>
                </div>
              ) : (
                <form onSubmit={submitCallback} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    className="fcm-input"
                    type="text"
                    placeholder="Your Name"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                    aria-label="Your name"
                  />
                  <div style={{ display: "flex" }}>
                    <span style={{ display: "flex", alignItems: "center", padding: "0 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRight: "none", borderRadius: "10px 0 0 10px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>+91</span>
                    <input
                      className="fcm-input"
                      style={{ borderRadius: "0 10px 10px 0", borderLeft: "none" }}
                      type="tel"
                      placeholder="Phone Number"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      required
                      aria-label="Phone number"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: "11px 16px", background: submitting ? "rgba(16,196,195,0.45)" : "#10C4C3", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#000", letterSpacing: "0.05em", cursor: submitting ? "not-allowed" : "pointer", fontFamily: "var(--font-body-new)", marginTop: 2, transition: "background 0.15s" }}
                  >
                    {submitting ? "Sending…" : "Request Callback"}
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        <button
          className={`fcm-fab${open ? "" : " fcm-fab--closed"}`}
          onClick={toggleOpen}
          aria-label={open ? "Close contact menu" : "Open contact menu"}
          aria-expanded={open}
          aria-haspopup="true"
          style={{ background: open ? "rgba(20,20,34,0.95)" : "#10C4C3" }}
          type="button"
        >
          <motion.span
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {open ? <IconClose /> : <IconChat />}
          </motion.span>
        </button>
      </div>
    </>
  );
}

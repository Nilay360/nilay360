"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Reveal from "@/components/ui/Reveal";

/* ──────────────────────────────────────────────────────────────────────────
 * Nilay 360 — Unified Calculator Suite
 * Five client-side calculators (EMI · Affordability · Stamp Duty · Rent vs Buy
 * · Loan Eligibility). Every output is derived via useMemo, so results update
 * live as inputs change — no submit button.
 * Tokens: bg #0a0a0a · gold #10C4C3 · forest green #0A1526.
 * ────────────────────────────────────────────────────────────────────────── */

const GOLD = "#10C4C3";
const GREEN = "#0A1526";
const BG = "#0a0a0a";
const CREAM = "#F5F2EC";

// ── Formatting ───────────────────────────────────────────────────────────────
function fmtINR(val: number, compact = false): string {
  if (!isFinite(val) || isNaN(val)) return "₹0";
  const v = Math.max(0, val);
  if (compact) {
    if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
    if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(2)} L`;
    return `₹${Math.round(v).toLocaleString("en-IN")}`;
  }
  return "₹" + Math.round(v).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
const fmtEMI = (v: number) => "₹" + Math.round(Math.max(0, v) || 0).toLocaleString("en-IN");

// ── Core finance math ──────────────────────────────────────────────────────────
function calcEMI(principal: number, annualRate: number, tenureYears: number): number {
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  if (n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// Reverse EMI — maximum principal supportable by a given monthly payment.
function loanFromEMI(emi: number, annualRate: number, tenureYears: number): number {
  const r = annualRate / 100 / 12;
  const n = tenureYears * 12;
  if (emi <= 0 || n <= 0) return 0;
  if (r === 0) return emi * n;
  return (emi * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
}

interface YearRow {
  year: number; opening: number; principalPaid: number; interestPaid: number; closing: number;
}
function calcSchedule(principal: number, annualRate: number, tenureYears: number): YearRow[] {
  const r = annualRate / 100 / 12;
  const emi = calcEMI(principal, annualRate, tenureYears);
  const rows: YearRow[] = [];
  let balance = principal;
  for (let yr = 1; yr <= tenureYears; yr++) {
    const opening = balance;
    let yp = 0, yi = 0;
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = balance * r;
      const prin = Math.min(emi - interest, balance);
      yi += interest; yp += prin; balance -= prin;
    }
    rows.push({ year: yr, opening, principalPaid: yp, interestPaid: yi, closing: Math.max(balance, 0) });
  }
  return rows;
}

// ── Shared UI ────────────────────────────────────────────────────────────────
function Slider({ min, max, value, step = 1, onChange }: {
  min: number; max: number; value: number; step?: number; onChange: (v: number) => void;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="nv-range"
      style={{ background: `linear-gradient(to right, ${GOLD} ${pct}%, rgba(245,242,236,0.12) ${pct}%)` }}
    />
  );
}

function SliderField({
  label, value, onChange, min, max, step = 1, prefix, suffix, fmtHint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number;
  prefix?: string; suffix?: string; fmtHint?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, isNaN(v) ? min : v));
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: CREAM }}>{label}</label>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {prefix && <span style={{ fontSize: 13, color: "rgba(245,242,236,0.5)" }}>{prefix}</span>}
          <input
            type="number" value={value} min={min} max={max} step={step}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className="nv-num"
          />
          {suffix && <span style={{ fontSize: 13, color: "rgba(245,242,236,0.5)" }}>{suffix}</span>}
        </div>
      </div>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
        <span style={{ fontSize: 10, color: "rgba(245,242,236,0.3)" }}>{prefix}{min.toLocaleString("en-IN")}{suffix}</span>
        {fmtHint && <span style={{ fontSize: 11, fontWeight: 600, color: GOLD }}>{fmtHint}</span>}
        <span style={{ fontSize: 10, color: "rgba(245,242,236,0.3)" }}>{prefix}{max.toLocaleString("en-IN")}{suffix}</span>
      </div>
    </div>
  );
}

function Panel({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? GREEN : "rgba(245,242,236,0.03)",
      border: `1px solid ${accent ? "rgba(201,168,76,0.3)" : "rgba(245,242,236,0.08)"}`,
      borderRadius: 18, padding: "32px 28px", position: "relative", overflow: "hidden",
    }}>
      {accent && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 110%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />}
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 22 }}>
      <div style={{ width: 24, height: 1.5, background: GOLD }} />
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase" }}>{children}</span>
    </div>
  );
}

function Stat({ label, value, sub, hero }: { label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div style={{
      background: "rgba(245,242,236,0.04)",
      border: `1px solid ${hero ? "rgba(201,168,76,0.3)" : "rgba(245,242,236,0.06)"}`,
      borderRadius: 12, padding: "16px 18px", marginBottom: 12,
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: hero ? "rgba(201,168,76,0.65)" : "rgba(245,242,236,0.35)", textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-support-new)", fontSize: hero ? 34 : 22, fontWeight: 600, color: hero ? GOLD : CREAM, lineHeight: 1.05, marginBottom: sub ? 4 : 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: "rgba(245,242,236,0.35)" }}>{sub}</p>}
    </div>
  );
}

function Doughnut({ principalPct }: { principalPct: number }) {
  const p = Math.max(0, Math.min(100, principalPct));
  return (
    <div style={{ width: 150, height: 150, flexShrink: 0 }}>
      <div style={{
        width: 150, height: 150, borderRadius: "50%",
        background: `conic-gradient(${GOLD} 0% ${p}%, rgba(201,168,76,0.22) ${p}% 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 92, height: 92, borderRadius: "50%", background: GREEN, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: GOLD, fontFamily: "var(--font-support-new)" }}>{Math.round(p)}%</span>
          <span style={{ fontSize: 9, color: "rgba(245,242,236,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Principal</span>
        </div>
      </div>
    </div>
  );
}

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: "emi", label: "EMI" },
  { id: "affordability", label: "Affordability" },
  { id: "stamp-duty", label: "Stamp Duty" },
  { id: "rent-vs-buy", label: "Rent vs Buy" },
  { id: "eligibility", label: "Loan Eligibility" },
] as const;
type TabId = typeof TABS[number]["id"];

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — EMI
// ════════════════════════════════════════════════════════════════════════════
function EmiTab() {
  const [loan, setLoan] = useState(5_000_000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  const emi = useMemo(() => calcEMI(loan, rate, tenure), [loan, rate, tenure]);
  const totalPay = useMemo(() => emi * tenure * 12, [emi, tenure]);
  const totalInt = useMemo(() => totalPay - loan, [totalPay, loan]);
  const principalPct = useMemo(() => (totalPay > 0 ? (loan / totalPay) * 100 : 0), [loan, totalPay]);
  const schedule = useMemo(() => calcSchedule(loan, rate, tenure), [loan, rate, tenure]);

  const highlights = useMemo(() => {
    if (!schedule.length) return [];
    const first = schedule[0];
    const mid = schedule[Math.floor((schedule.length - 1) / 2)];
    const last = schedule[schedule.length - 1];
    return [
      { tag: "First Year", row: first },
      { tag: `Year ${mid.year}`, row: mid },
      { tag: "Final Year", row: last },
    ];
  }, [schedule]);

  return (
    <div className="nv-grid">
      <Reveal>
        <Panel>
          <SectionLabel>Loan Details</SectionLabel>
          <SliderField label="Loan Amount" value={loan} onChange={setLoan} min={100000} max={200_000_000} step={100000} prefix="₹" fmtHint={fmtINR(loan, true)} />
          <SliderField label="Interest Rate (p.a.)" value={rate} onChange={setRate} min={5} max={18} step={0.1} suffix="%" fmtHint={`${rate.toFixed(1)}% p.a.`} />
          <SliderField label="Loan Tenure" value={tenure} onChange={setTenure} min={1} max={30} suffix=" yr" fmtHint={`${tenure} years`} />
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel accent>
          <SectionLabel>Your Results</SectionLabel>
          <div style={{ textAlign: "center", padding: "12px 0 22px", borderBottom: "1px solid rgba(245,242,236,0.08)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", color: "rgba(245,242,236,0.4)", textTransform: "uppercase", marginBottom: 6 }}>Monthly EMI</p>
            <div style={{ fontFamily: "var(--font-support-new)", fontSize: "clamp(40px, 6vw, 54px)", fontWeight: 600, color: GOLD, lineHeight: 1 }}>{fmtEMI(emi)}</div>
            <p style={{ fontSize: 11, color: "rgba(245,242,236,0.35)", marginTop: 6 }}>for {tenure} years · {rate.toFixed(1)}% p.a.</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "24px 0", borderBottom: "1px solid rgba(245,242,236,0.08)", flexWrap: "wrap" }}>
            <Doughnut principalPct={principalPct} />
            <div style={{ flex: 1, minWidth: 160 }}>
              {[
                { label: "Principal", color: GOLD, value: fmtINR(loan, true), pct: Math.round(principalPct) },
                { label: "Total Interest", color: "rgba(201,168,76,0.28)", value: fmtINR(totalInt, true), pct: Math.round(100 - principalPct) },
              ].map((r) => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "rgba(245,242,236,0.6)", flex: 1 }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: CREAM }}>{r.value}</span>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid rgba(245,242,236,0.07)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "rgba(245,242,236,0.5)" }}>Total Payable</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>{fmtINR(totalPay, true)}</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 22 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(245,242,236,0.4)", textTransform: "uppercase", marginBottom: 14 }}>Amortization Summary</p>
            <table className="nv-table">
              <thead>
                <tr>{["", "Principal", "Interest", "Balance"].map((h) => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {highlights.map((h) => (
                  <tr key={h.tag}>
                    <td style={{ fontWeight: 700, color: CREAM }}>{h.tag}</td>
                    <td style={{ color: "#7FD1AE" }}>{fmtINR(h.row.principalPaid, true)}</td>
                    <td style={{ color: GOLD }}>{fmtINR(h.row.interestPaid, true)}</td>
                    <td style={{ color: "rgba(245,242,236,0.65)" }}>{fmtINR(h.row.closing, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — Affordability
// ════════════════════════════════════════════════════════════════════════════
function AffordabilityTab() {
  const [income, setIncome] = useState(150000);
  const [expenses, setExpenses] = useState(50000);
  const [downPayment, setDownPayment] = useState(2_000_000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  const disposable = useMemo(() => Math.max(0, income - expenses), [income, expenses]);
  // Banks cap EMI at ~45% of net disposable income.
  const maxEmi = useMemo(() => disposable * 0.45, [disposable]);
  const maxLoan = useMemo(() => loanFromEMI(maxEmi, rate, tenure), [maxEmi, rate, tenure]);
  const maxProperty = useMemo(() => maxLoan + downPayment, [maxLoan, downPayment]);
  const emiAtMax = useMemo(() => calcEMI(maxLoan, rate, tenure), [maxLoan, rate, tenure]);

  return (
    <div className="nv-grid">
      <Reveal>
        <Panel>
          <SectionLabel>Your Finances</SectionLabel>
          <SliderField label="Monthly Income" value={income} onChange={setIncome} min={25000} max={5_000_000} step={5000} prefix="₹" fmtHint={fmtINR(income, true) + "/mo"} />
          <SliderField label="Monthly Expenses" value={expenses} onChange={setExpenses} min={0} max={2_000_000} step={2500} prefix="₹" fmtHint={fmtINR(expenses, true) + "/mo"} />
          <SliderField label="Down Payment Available" value={downPayment} onChange={setDownPayment} min={0} max={50_000_000} step={100000} prefix="₹" fmtHint={fmtINR(downPayment, true)} />
          <SliderField label="Interest Rate (p.a.)" value={rate} onChange={setRate} min={5} max={18} step={0.1} suffix="%" fmtHint={`${rate.toFixed(1)}%`} />
          <SliderField label="Loan Tenure" value={tenure} onChange={setTenure} min={1} max={30} suffix=" yr" fmtHint={`${tenure} years`} />
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel accent>
          <SectionLabel>What You Can Afford</SectionLabel>
          {disposable <= 0 ? (
            <p style={{ fontSize: 14, color: "rgba(245,242,236,0.5)", lineHeight: 1.7, padding: "24px 0" }}>
              Your expenses meet or exceed your income. Reduce monthly expenses to qualify for a home loan.
            </p>
          ) : (
            <>
              <Stat hero label="Max Property Value" value={fmtINR(maxProperty, true)} sub="Maximum loan + your down payment" />
              <Stat label="Max Loan Eligible" value={fmtINR(maxLoan, true)} sub="At 45% EMI-to-disposable-income" />
              <Stat label="Monthly EMI at Max Loan" value={fmtEMI(emiAtMax)} sub={`for ${tenure} years at ${rate.toFixed(1)}%`} />
              <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 12, padding: "16px 18px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(201,168,76,0.6)", textTransform: "uppercase", marginBottom: 6 }}>Recommended Budget Range</p>
                <p style={{ fontFamily: "var(--font-support-new)", fontSize: 22, fontWeight: 600, color: CREAM }}>
                  {fmtINR(maxProperty * 0.85, true)} – {fmtINR(maxProperty, true)}
                </p>
                <p style={{ fontSize: 11, color: "rgba(245,242,236,0.35)", marginTop: 4 }}>Stay near the lower end for a comfortable margin.</p>
              </div>
            </>
          )}
        </Panel>
      </Reveal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — Stamp Duty
// ════════════════════════════════════════════════════════════════════════════
interface DutyRule { res: number; com: number; femaleRebate: number; regCap: boolean }
const DUTY_DEFAULT: DutyRule = { res: 5, com: 6, femaleRebate: 0, regCap: false };
const DUTY_RULES: Record<string, DutyRule> = {
  "Maharashtra": { res: 6, com: 6, femaleRebate: 1, regCap: true },
  "Karnataka": { res: 5, com: 5, femaleRebate: 0, regCap: false },
  "Delhi": { res: 6, com: 6, femaleRebate: 2, regCap: false },
  "Telangana": { res: 5, com: 5, femaleRebate: 0, regCap: false },
  "Tamil Nadu": { res: 7, com: 7, femaleRebate: 0, regCap: false },
  "Uttar Pradesh": { res: 7, com: 7, femaleRebate: 1, regCap: true },
  "Gujarat": { res: 4.9, com: 4.9, femaleRebate: 0, regCap: false },
  "Rajasthan": { res: 6, com: 6, femaleRebate: 1, regCap: false },
  "West Bengal": { res: 6, com: 7, femaleRebate: 0, regCap: false },
  "Haryana": { res: 7, com: 7, femaleRebate: 2, regCap: false },
  "Punjab": { res: 7, com: 7, femaleRebate: 1, regCap: false },
  "Madhya Pradesh": { res: 7.5, com: 7.5, femaleRebate: 1, regCap: false },
  "Kerala": { res: 8, com: 8, femaleRebate: 0, regCap: false },
  "Andhra Pradesh": { res: 5, com: 5, femaleRebate: 0, regCap: false },
  "Bihar": { res: 6, com: 6, femaleRebate: 1, regCap: false },
};
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

function StampDutyTab() {
  const [value, setValue] = useState(5_000_000);
  const [state, setState] = useState("Maharashtra");
  const [propType, setPropType] = useState<"residential" | "commercial">("residential");
  const [gender, setGender] = useState<"male" | "female" | "joint">("male");

  const result = useMemo(() => {
    const rule = DUTY_RULES[state] ?? DUTY_DEFAULT;
    const base = propType === "commercial" ? rule.com : rule.res;
    let rebate = 0;
    if (gender === "female") rebate = rule.femaleRebate;
    else if (gender === "joint") rebate = rule.femaleRebate / 2;
    const effectiveRate = Math.max(0, base - rebate);
    const stampDuty = (value * effectiveRate) / 100;
    const regRaw = value * 0.01;
    const registration = rule.regCap ? Math.min(regRaw, 30000) : regRaw;
    return { effectiveRate, stampDuty, registration, total: stampDuty + registration, grand: value + stampDuty + registration };
  }, [value, state, propType, gender]);

  const seg = (active: boolean) => ({
    flex: 1, padding: "10px 0", borderRadius: 8, cursor: "pointer", textAlign: "center" as const,
    fontSize: 13, fontWeight: 600, fontFamily: "var(--font-body-new)",
    border: active ? "none" : "1px solid rgba(245,242,236,0.14)",
    background: active ? GOLD : "transparent", color: active ? BG : "rgba(245,242,236,0.6)",
    transition: "all 0.15s",
  });

  return (
    <div className="nv-grid">
      <Reveal>
        <Panel>
          <SectionLabel>Property & Buyer</SectionLabel>
          <SliderField label="Property Value" value={value} onChange={setValue} min={100000} max={200_000_000} step={100000} prefix="₹" fmtHint={fmtINR(value, true)} />

          <label style={{ fontSize: 13, fontWeight: 600, color: CREAM, display: "block", marginBottom: 8 }}>State</label>
          <select value={state} onChange={(e) => setState(e.target.value)} className="nv-select" style={{ marginBottom: 22 }}>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <label style={{ fontSize: 13, fontWeight: 600, color: CREAM, display: "block", marginBottom: 8 }}>Property Type</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
            <button style={seg(propType === "residential")} onClick={() => setPropType("residential")}>Residential</button>
            <button style={seg(propType === "commercial")} onClick={() => setPropType("commercial")}>Commercial</button>
          </div>

          <label style={{ fontSize: 13, fontWeight: 600, color: CREAM, display: "block", marginBottom: 8 }}>Buyer / Ownership</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={seg(gender === "male")} onClick={() => setGender("male")}>Male</button>
            <button style={seg(gender === "female")} onClick={() => setGender("female")}>Female</button>
            <button style={seg(gender === "joint")} onClick={() => setGender("joint")}>Joint</button>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel accent>
          <SectionLabel>Cost Breakdown</SectionLabel>
          <Stat hero label="Stamp Duty" value={fmtINR(result.stampDuty, true)} sub={`${result.effectiveRate.toFixed(2)}% of property value`} />
          <Stat label="Registration Charges" value={fmtINR(result.registration, true)} sub={(DUTY_RULES[state] ?? DUTY_DEFAULT).regCap ? "1% (capped at ₹30,000)" : "1% of property value"} />
          <Stat label="Total Charges" value={fmtINR(result.total, true)} sub="Stamp duty + registration" />
          <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(201,168,76,0.6)", textTransform: "uppercase", marginBottom: 6 }}>Grand Total (incl. property)</p>
            <p style={{ fontFamily: "var(--font-support-new)", fontSize: 28, fontWeight: 600, color: GOLD }}>{fmtINR(result.grand, true)}</p>
          </div>
          <p style={{ fontSize: 11.5, color: "rgba(245,242,236,0.4)", lineHeight: 1.6, fontStyle: "italic" }}>
            Rates are approximate. Please verify with your state&apos;s registration office.
          </p>
        </Panel>
      </Reveal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 4 — Rent vs Buy
// ════════════════════════════════════════════════════════════════════════════
function RentVsBuyTab() {
  const [rent, setRent] = useState(35000);
  const [price, setPrice] = useState(8_000_000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);
  const [appreciation, setAppreciation] = useState(6);
  const [rentIncrease, setRentIncrease] = useState(7);

  const calc = useMemo(() => {
    const down = (price * downPct) / 100;
    const loan = price - down;
    const emi = calcEMI(loan, rate, tenure);
    const annualEmi = emi * 12;
    const MAINT_RATE = 0.004; // 0.4% of current value per year (assumption)

    let totalRent = 0, totalBuy = down;
    let cumRent = 0, cumBuyNet = 0;
    let breakEven = 0;
    let curRent = rent * 12;
    let value = price;
    const fullSched = calcSchedule(loan, rate, tenure);
    let principalPaid = 0;
    let cumMaint = 0;

    for (let yr = 1; yr <= tenure; yr++) {
      // Renting
      totalRent += curRent;
      cumRent += curRent;
      curRent *= 1 + rentIncrease / 100;

      // Buying: EMI + maintenance this year; asset appreciates
      const maintenance = value * MAINT_RATE;
      cumMaint += maintenance;
      totalBuy += annualEmi + maintenance;
      value *= 1 + appreciation / 100;

      // Net buying cost so far = outflow so far − equity (current value − remaining loan)
      principalPaid += fullSched[yr - 1]?.principalPaid ?? 0;
      const equity = value - (loan - principalPaid);
      cumBuyNet = (down + annualEmi * yr + cumMaint) - equity;
      if (breakEven === 0 && cumBuyNet <= cumRent) breakEven = yr;
    }

    const finalValue = price * Math.pow(1 + appreciation / 100, tenure);
    const appreciationGain = finalValue - price;
    const netBuy = totalBuy - finalValue; // you still own the (fully-paid) asset
    return { down, loan, emi, totalRent, totalBuy, appreciationGain, netBuy, breakEven, finalValue };
  }, [rent, price, downPct, rate, tenure, appreciation, rentIncrease]);

  const buyingWins = calc.netBuy < calc.totalRent;
  const diff = Math.abs(calc.totalRent - calc.netBuy);

  return (
    <div className="nv-grid">
      <Reveal>
        <Panel>
          <SectionLabel>Rent vs Buy Inputs</SectionLabel>
          <SliderField label="Monthly Rent" value={rent} onChange={setRent} min={5000} max={1_000_000} step={1000} prefix="₹" fmtHint={fmtINR(rent, true) + "/mo"} />
          <SliderField label="Property Price" value={price} onChange={setPrice} min={500000} max={200_000_000} step={100000} prefix="₹" fmtHint={fmtINR(price, true)} />
          <SliderField label="Down Payment" value={downPct} onChange={setDownPct} min={5} max={50} suffix="%" fmtHint={fmtINR((price * downPct) / 100, true)} />
          <SliderField label="Loan Interest Rate" value={rate} onChange={setRate} min={5} max={18} step={0.1} suffix="%" fmtHint={`${rate.toFixed(1)}%`} />
          <SliderField label="Tenure / Horizon" value={tenure} onChange={setTenure} min={1} max={30} suffix=" yr" fmtHint={`${tenure} years`} />
          <SliderField label="Property Appreciation" value={appreciation} onChange={setAppreciation} min={0} max={15} step={0.5} suffix="%" fmtHint={`${appreciation}%/yr`} />
          <SliderField label="Annual Rent Increase" value={rentIncrease} onChange={setRentIncrease} min={0} max={15} step={0.5} suffix="%" fmtHint={`${rentIncrease}%/yr`} />
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel accent>
          <SectionLabel>Verdict over {tenure} Years</SectionLabel>
          <div style={{ textAlign: "center", padding: "8px 0 20px", borderBottom: "1px solid rgba(245,242,236,0.08)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", color: "rgba(245,242,236,0.4)", textTransform: "uppercase", marginBottom: 8 }}>
              {buyingWins ? "Buying Wins" : "Renting Wins"}
            </p>
            <div style={{ fontFamily: "var(--font-support-new)", fontSize: "clamp(34px, 5vw, 46px)", fontWeight: 600, color: GOLD, lineHeight: 1 }}>
              {fmtINR(diff, true)}
            </div>
            <p style={{ fontSize: 12, color: "rgba(245,242,236,0.4)", marginTop: 6 }}>
              cheaper to {buyingWins ? "buy" : "rent"} over the period
            </p>
          </div>
          <div style={{ paddingTop: 20 }}>
            <Stat label="Total Cost of Renting" value={fmtINR(calc.totalRent, true)} sub={`Rent rising ${rentIncrease}%/yr`} />
            <Stat label="Net Cost of Buying" value={fmtINR(calc.netBuy, true)} sub="EMI + maintenance − asset value retained" />
            <Stat label="Property Appreciation Gain" value={fmtINR(calc.appreciationGain, true)} sub={`Value grows to ${fmtINR(calc.finalValue, true)}`} />
            <Stat hero label="Break-even Point" value={calc.breakEven > 0 ? `Year ${calc.breakEven}` : "Beyond horizon"} sub={calc.breakEven > 0 ? "When buying becomes cheaper than renting" : "Renting stays cheaper for this horizon"} />
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 5 — Loan Eligibility
// ════════════════════════════════════════════════════════════════════════════
function EligibilityTab() {
  const [income, setIncome] = useState(150000);
  const [age, setAge] = useState(32);
  const [existingEmi, setExistingEmi] = useState(0);
  const [tenure, setTenure] = useState(20);
  const [rate, setRate] = useState(8.5);

  const RETIRE_AGE = 65;
  const calc = useMemo(() => {
    const foirEmi = income * 0.5 - existingEmi; // 50% FOIR less existing obligations
    const maxEmi = Math.max(0, foirEmi);
    const ageCapTenure = Math.max(0, RETIRE_AGE - age);
    const effectiveTenure = Math.min(tenure, ageCapTenure);
    const maxLoan = loanFromEMI(maxEmi, rate, effectiveTenure);
    const maxProperty = maxLoan > 0 ? maxLoan / 0.8 : 0; // assuming 80% LTV
    const emiAtMax = calcEMI(maxLoan, rate, effectiveTenure);
    return { maxEmi, effectiveTenure, ageCapTenure, maxLoan, maxProperty, emiAtMax };
  }, [income, age, existingEmi, tenure, rate]);

  return (
    <div className="nv-grid">
      <Reveal>
        <Panel>
          <SectionLabel>Eligibility Inputs</SectionLabel>
          <SliderField label="Monthly Income" value={income} onChange={setIncome} min={25000} max={5_000_000} step={5000} prefix="₹" fmtHint={fmtINR(income, true) + "/mo"} />
          <SliderField label="Age" value={age} onChange={setAge} min={21} max={64} suffix=" yr" fmtHint={`${age} years`} />
          <SliderField label="Existing EMI Obligations" value={existingEmi} onChange={setExistingEmi} min={0} max={1_000_000} step={1000} prefix="₹" fmtHint={existingEmi === 0 ? "None" : fmtINR(existingEmi, true) + "/mo"} />
          <SliderField label="Desired Tenure" value={tenure} onChange={setTenure} min={1} max={30} suffix=" yr" fmtHint={`${tenure} years`} />
          <SliderField label="Interest Rate (p.a.)" value={rate} onChange={setRate} min={5} max={18} step={0.1} suffix="%" fmtHint={`${rate.toFixed(1)}%`} />
        </Panel>
      </Reveal>

      <Reveal delay={0.08}>
        <Panel accent>
          <SectionLabel>Your Eligibility</SectionLabel>
          {calc.maxEmi <= 0 ? (
            <p style={{ fontSize: 14, color: "rgba(245,242,236,0.5)", lineHeight: 1.7, padding: "24px 0" }}>
              Your existing EMIs exceed 50% of income. Clear some obligations to become eligible.
            </p>
          ) : (
            <>
              <Stat hero label="Max Eligible Loan" value={fmtINR(calc.maxLoan, true)} sub={`Repayable over ${calc.effectiveTenure} years`} />
              <Stat label="Max Property Value" value={fmtINR(calc.maxProperty, true)} sub="Assuming 80% loan-to-value" />
              <Stat label="Monthly EMI at Max Loan" value={fmtEMI(calc.emiAtMax)} sub={`at ${rate.toFixed(1)}% p.a.`} />
              <div style={{ background: "rgba(245,242,236,0.04)", border: "1px solid rgba(245,242,236,0.07)", borderRadius: 12, padding: "16px 18px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(245,242,236,0.4)", textTransform: "uppercase", marginBottom: 12 }}>Eligibility Factors</p>
                {[
                  { k: "FOIR applied", v: "50% of income" },
                  { k: "Available for EMI", v: fmtEMI(calc.maxEmi) + "/mo" },
                  { k: "Age-capped tenure", v: `${calc.ageCapTenure} yr (retire at ${RETIRE_AGE})` },
                  { k: "Effective tenure used", v: `${calc.effectiveTenure} years` },
                ].map((f) => (
                  <div key={f.k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(245,242,236,0.05)" }}>
                    <span style={{ fontSize: 12, color: "rgba(245,242,236,0.5)" }}>{f.k}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: CREAM }}>{f.v}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>
      </Reveal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Page shell
// ════════════════════════════════════════════════════════════════════════════
function CalculatorInner() {
  const params = useSearchParams();
  const initial = ((): TabId => {
    const t = params.get("tab");
    return TABS.some((x) => x.id === t) ? (t as TabId) : "emi";
  })();
  const [tab, setTab] = useState<TabId>(initial);

  return (
    <>
      <style>{`
        .nv-range { width: 100%; appearance: none; -webkit-appearance: none; height: 4px; border-radius: 2px; outline: none; cursor: pointer; }
        .nv-range::-webkit-slider-thumb { appearance: none; -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: ${GOLD}; border: 2.5px solid ${BG}; box-shadow: 0 0 0 1px rgba(201,168,76,0.5); cursor: pointer; }
        .nv-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: ${GOLD}; border: 2.5px solid ${BG}; box-shadow: 0 0 0 1px rgba(201,168,76,0.5); cursor: pointer; }
        .nv-num { width: 110px; padding: 6px 10px; background: rgba(245,242,236,0.05); border: 1.5px solid rgba(245,242,236,0.14); border-radius: 7px; font-size: 13px; font-weight: 600; color: ${CREAM}; font-family: var(--font-body-new); text-align: right; outline: none; }
        .nv-num:focus { border-color: ${GOLD}; }
        .nv-select { width: 100%; padding: 11px 14px; background: rgba(245,242,236,0.05); border: 1.5px solid rgba(245,242,236,0.14); border-radius: 9px; font-size: 14px; color: ${CREAM}; font-family: var(--font-body-new); outline: none; cursor: pointer; -webkit-appearance: none; appearance: none; }
        .nv-select:focus { border-color: ${GOLD}; }
        .nv-select option { background: ${BG}; color: ${CREAM}; }
        .nv-table { width: 100%; border-collapse: collapse; }
        .nv-table th { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(245,242,236,0.35); padding: 6px 8px; text-align: right; }
        .nv-table th:first-child, .nv-table td:first-child { text-align: left; }
        .nv-table td { font-size: 12.5px; padding: 9px 8px; text-align: right; border-top: 1px solid rgba(245,242,236,0.06); }
        .nv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        @media (max-width: 900px) { .nv-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ minHeight: "100vh", background: BG }}>
        {/* Hero (offset for fixed global navbar) */}
        <section style={{ paddingTop: 64, background: GREEN, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(201,168,76,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.04) 1px, transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 65% 70% at 85% 110%, rgba(201,168,76,0.1) 0%, transparent 55%)", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: 760, margin: "0 auto", padding: "64px 24px 72px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 16px", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 100, marginBottom: 22 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: GOLD, textTransform: "uppercase" }}>Financial Planning</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-heading-new)", fontSize: "clamp(40px, 6vw, 64px)", fontWeight: 300, color: CREAM, lineHeight: 1.1, marginBottom: 14 }}>
              Property <em style={{ fontStyle: "italic", color: GOLD }}>Calculators</em>
            </h1>
            <p style={{ fontSize: 15, color: "rgba(245,242,236,0.5)", lineHeight: 1.7 }}>
              Five tools to plan every number behind your property decision. All results update in real time.
            </p>
          </div>
        </section>

        {/* Tabs */}
        <div style={{ position: "sticky", top: 64, zIndex: 50, background: "rgba(10,10,10,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "9px 18px", borderRadius: 100, whiteSpace: "nowrap", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, fontFamily: "var(--font-body-new)",
                  border: tab === t.id ? "none" : "1px solid rgba(245,242,236,0.14)",
                  background: tab === t.id ? GOLD : "transparent",
                  color: tab === t.id ? BG : "rgba(245,242,236,0.6)",
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active calculator */}
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 16px 80px" }}>
          {tab === "emi" && <EmiTab />}
          {tab === "affordability" && <AffordabilityTab />}
          {tab === "stamp-duty" && <StampDutyTab />}
          {tab === "rent-vs-buy" && <RentVsBuyTab />}
          {tab === "eligibility" && <EligibilityTab />}

          <Reveal delay={0.12}>
            <p style={{ textAlign: "center", fontSize: 11.5, color: "rgba(245,242,236,0.3)", marginTop: 40, lineHeight: 1.7 }}>
              These calculators provide estimates for planning purposes only and do not constitute financial advice.
              Actual loan terms, charges, and eligibility are determined by your lender and local authorities.
            </p>
          </Reveal>
        </section>
      </div>
    </>
  );
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: BG }} />}>
      <CalculatorInner />
    </Suspense>
  );
}

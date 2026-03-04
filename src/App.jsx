/**
 * Coast FIRE Calculator
 * 
 * A mobile-first retirement planning tool that calculates when you can
 * stop contributing to retirement and let compound growth do the rest.
 * 
 * All calculations use REAL (inflation-adjusted) returns, so every
 * dollar amount shown represents today's purchasing power.
 * 
 * Built by @mariahakinbi
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";

/* ============================================================
   CONFIGURATION & CONSTANTS
   ============================================================ */

/** Default calculator input values */
const DEFAULTS = {
  currentAge: 30,
  balance: 50000,
  monthlyContrib: 1000,
  annualReturn: 10,
  inflation: 3,
  swr: 4,
  retireAge: 65,
  annualSpending: 50000,
  planAge: 90,
};

/** External links */
const AFFILIATE_URL = "https://app.facet.com/invited?utm_content=6637&utm_source=member-referral&utm_term=Mariah";
const INSTAGRAM_URL = "https://www.instagram.com/mariahakinbi/";

/** Recommended books with Amazon affiliate links and cover images */
const BOOKS = [
  { title: "The Total Money Makeover", author: "Dave Ramsey", who: "If you are in debt", link: "https://amzn.to/3OXs60W", emoji: "💸", coverColor: "#8B6914", cover: "/books/total_money_makeover.jpg" },
  { title: "Money for Couples", author: "Ramit Sethi", who: "If you need a money system", link: "https://amzn.to/4ssjXQS", emoji: "💑", coverColor: "#7c3aed", cover: "/books/money_for_couples.jpg" },
  { title: "I Will Teach You To Be Rich", author: "Ramit Sethi", who: "If you need a money system", link: "https://amzn.to/4l2D5SI", emoji: "💰", coverColor: "#1a1a2e", cover: "/books/i_will_teach.jpg" },
  { title: "The Psychology of Money", author: "Morgan Housel", who: "If you are struggling with money mindset", link: "https://amzn.to/4rOiUL1", emoji: "🧠", coverColor: "#f5f0e8", cover: "/books/psychology_of_money.jpg" },
];

/** Status display config for projection table rows */
const STATUS_CONFIG = {
  investing: { color: "#6366f1", label: "📈 Investing" },
  coast: { color: "#059669", label: "✅ Coasting" },
  retired: { color: "#d97706", label: "🏖️ Retired" },
  depleted: { color: "#dc2626", label: "💸 Depleted" },
};

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

/**
 * Fire a Google Analytics 4 event.
 * Safe to call even if GA isn't loaded — fails silently.
 */
function trackEvent(name, params) {
  try { if (window.gtag) window.gtag("event", name, params); } catch (e) {}
}

/** Format number as currency: $1,234 or ($1,234) for negatives */
function formatCurrency(value) {
  if (value == null) return "";
  const abs = Math.abs(Math.round(value));
  return value < 0 ? `($${abs.toLocaleString()})` : `$${abs.toLocaleString()}`;
}

/** Format number in compact form for chart axes: $1.2M, $500K */
function formatCompact(value) {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

/* ============================================================
   REUSABLE UI COMPONENTS
   ============================================================ */

/** Tooltip that appears on tap/click for input field explanations */
function InfoTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 6 }}>
      <button onClick={(e) => { e.preventDefault(); setOpen(!open); }} aria-label="Info"
        style={{
          width: 18, height: 18, borderRadius: "50%", border: "1.5px solid #c4b5fd",
          background: open ? "#7c3aed" : "transparent", color: open ? "#fff" : "#7c3aed",
          fontSize: 10, fontWeight: 800, cursor: "pointer", display: "inline-flex",
          alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1,
        }}>i</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99 }} />
          <div style={{
            position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
            background: "#1e1b4b", color: "#e0e7ff", fontSize: 12, lineHeight: 1.5,
            padding: "10px 14px", borderRadius: 10, width: 230, zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}>
            {text}
            <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
              borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
              borderTop: "6px solid #1e1b4b", width: 0, height: 0 }} />
          </div>
        </>
      )}
    </span>
  );
}

/** Styled number input with optional prefix ($), suffix (%), info tooltip, and note */
function InputField({ label, value, onChange, suffix, prefix, note, info }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 2, fontSize: 11,
        fontWeight: 600, color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 7 }}>
        {label}{info && <InfoTip text={info} />}
        {note && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "#a5b4fc", marginLeft: 6, fontSize: 11 }}>{note}</span>}
      </label>
      <div style={{
        display: "flex", alignItems: "center", border: "2px solid #e5e7eb", borderRadius: 14,
        padding: "0 16px", background: "#fff", transition: "border-color 0.2s, box-shadow 0.2s", minHeight: 52,
      }}
        onFocus={e => { e.currentTarget.style.borderColor = "#8b5cf6"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(139,92,246,0.1)"; }}
        onBlur={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "none"; }}
      >
        {prefix && <span style={{ color: "#9ca3af", fontSize: 16, fontWeight: 600, marginRight: 4 }}>{prefix}</span>}
        <input type="text" inputMode="decimal" value={value}
          onChange={e => {
            const raw = e.target.value;
            if (raw === "" || raw === "-") { onChange(0); return; }
            const num = parseFloat(raw);
            if (!isNaN(num)) onChange(num);
          }}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 17,
            fontWeight: 700, color: "#1f2937", padding: "14px 0", fontFamily: "'Inter',sans-serif", width: "100%", minWidth: 0 }}
        />
        {suffix && <span style={{ color: "#9ca3af", fontSize: 14, fontWeight: 600, marginLeft: 6 }}>{suffix}</span>}
      </div>
    </div>
  );
}

/** Color-coded result card for the Results tab grid */
function ResultCard({ label, value, sub, accent, large, info }) {
  const palette = {
    green: { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" },
    red: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
    orange: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
    purple: { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
    default: { bg: "#f9fafb", text: "#1f2937", border: "#e5e7eb" },
  };
  const colors = palette[accent] || palette.default;
  return (
    <div style={{ background: colors.bg, borderRadius: 14, padding: large ? "14px 16px" : "12px 14px", border: `1px solid ${colors.border}` }}>
      <div style={{ display: "flex", alignItems: "center", fontSize: 10, fontWeight: 600, color: "#6b7280",
        textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}{info && <InfoTip text={info} />}
      </div>
      <div style={{ fontSize: large ? 20 : 16, fontWeight: 800, color: colors.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/** Custom tooltip for the Recharts chart */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1e1b4b", borderRadius: 12, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
      <div style={{ fontSize: 11, color: "#a5b4fc", marginBottom: 5 }}>Age {label}</div>
      {payload.map((p, i) => p.value != null && (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "1px 0" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color }} />
          <span style={{ fontSize: 11, color: "#c7d2fe" }}>{p.name}:</span>
          <span style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Pill-style tab button for Results/Chart/Table navigation */
function TabButton({ active, label, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: "11px 0", border: "none", borderRadius: 10, cursor: "pointer",
      fontSize: 13, fontWeight: 700, fontFamily: "'Inter',sans-serif", transition: "all 0.2s",
      background: active ? "#1e1b4b" : "transparent", color: active ? "#fff" : "#6b7280",
      boxShadow: active ? "0 2px 8px rgba(30,27,75,0.18)" : "none",
    }}>{label}</button>
  );
}

/** Feedback widget: thumbs up/down → optional suggestion text → thank you */
function FeedbackWidget() {
  const [voted, setVoted] = useState(null);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  const handleVote = (rating) => { setVoted(rating); trackEvent("feedback_vote", { rating }); };
  const handleSubmit = () => { if (text.trim()) trackEvent("feedback_suggestion", { text: text.trim(), rating: voted }); setDone(true); };

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", marginTop: 16,
      border: "1px solid #f3f4f6", textAlign: "center" }}>
      {!voted ? (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 12 }}>Was this helpful?</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            {[["👍", "yes", "#a7f3d0", "#ecfdf5"], ["👎", "no", "#fecaca", "#fef2f2"]].map(([emoji, val, borderColor, bg]) => (
              <button key={val} onClick={() => handleVote(val)} style={{
                padding: "10px 28px", borderRadius: 12, border: `2px solid ${borderColor}`, background: bg,
                fontSize: 20, cursor: "pointer", transition: "transform 0.15s",
              }}
                onMouseEnter={e => e.target.style.transform = "scale(1.1)"}
                onMouseLeave={e => e.target.style.transform = "scale(1)"}
              >{emoji}</button>
            ))}
          </div>
        </>
      ) : !done ? (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#059669", marginBottom: 10 }}>Thanks! {voted === "yes" ? "🎉" : "🙏"}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>Any features you'd want?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="e.g., tax modeling, Roth vs 401k..."
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ flex: 1, border: "2px solid #e5e7eb", borderRadius: 10, padding: "10px 14px",
                fontSize: 13, outline: "none", fontFamily: "'Inter',sans-serif" }}
              onFocus={e => e.target.style.borderColor = "#8b5cf6"}
              onBlur={e => e.target.style.borderColor = "#e5e7eb"}
            />
            <button onClick={handleSubmit} style={{ background: "#1e1b4b", color: "#fff", border: "none", borderRadius: 10,
              padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Send</button>
          </div>
          <button onClick={() => setDone(true)} style={{ background: "none", border: "none", color: "#9ca3af",
            fontSize: 11, cursor: "pointer", marginTop: 8 }}>Skip</button>
        </>
      ) : (
        <div style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed" }}>Thanks! 💜</div>
      )}
    </div>
  );
}
/* ============================================================
   BOOKS PAGE
   Displays recommended personal finance books with affiliate links.
   Accessed via the "Recommended Reads" link on the calculator page.
   ============================================================ */
function BooksPage({ onBack }) {
  const [imgErrors, setImgErrors] = useState({});
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #ede9fe 0%, #f3e8ff 25%, #faf5ff 55%, #fff 100%)", fontFamily: "'Inter',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ padding: "40px 20px 32px", maxWidth: 500, margin: "0 auto" }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: "#7c3aed", fontSize: 13, fontWeight: 600,
          cursor: "pointer", padding: "0 0 20px", fontFamily: "'Inter',sans-serif",
        }}>← Back to calculator</button>

        <div style={{ fontSize: 38, marginBottom: 6, textAlign: "center" }}>📚</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e1b4b", textAlign: "center", margin: "0 0 24px", lineHeight: 1.2 }}>
          Recommended Reads
        </h1>

        {BOOKS.map((book, index) => (
          <a key={index} href={book.link} target="_blank" rel="noopener noreferrer"
            onClick={() => trackEvent("click_book", { title: book.title })}
            style={{ textDecoration: "none", display: "block", marginBottom: 14 }}>
            <div style={{
              background: "#fff", borderRadius: 16, padding: "16px 18px",
              border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.02)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.03)"; }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                {/* Book cover image with fallback to colored placeholder */}
                <div style={{
                  width: 60, height: 85, borderRadius: 6, overflow: "hidden", flexShrink: 0,
                  background: book.coverColor, display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}>
                  {!imgErrors[index] ? (
                    <img src={book.cover} alt={book.title}
                      onError={() => setImgErrors(prev => ({ ...prev, [index]: true }))}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 24 }}>{book.emoji}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    {book.who}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#1e1b4b", lineHeight: 1.3 }}>{book.title}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>by {book.author}</div>
                </div>
              </div>
            </div>
          </a>
        ))}

        <p style={{ fontSize: 11, color: "#b0b8c4", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>
          These are affiliate links. If you buy through them, I may earn a small commission at no extra cost to you.
        </p>

        <div style={{ textAlign: "center", padding: "20px 0 12px" }}>
          <span style={{ fontSize: 11, color: "#c4b5fd" }}>Built by </span>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, textDecoration: "none" }}>@mariahakinbi</a>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN APP COMPONENT
   Handles page routing (calculator vs books) and all calculator state.
   ============================================================ */
export default function CoastFIRECalculator() {
  // Page routing: "calculator" or "books"
  const [page, setPage] = useState("calculator");

  // Calculator input state
  const [inputs, setInputs] = useState(DEFAULTS);

  // UI state
  const [tab, setTab] = useState("results");
  const [showInfo, setShowInfo] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Analytics: track inputs after 5s idle (avoids tracking every keystroke)
  const idleTimer = useRef(null);
  const lastTrackedInputs = useRef(null);

  /** Update a single input field by key */
  const updateInput = (key) => (value) => setInputs(prev => ({ ...prev, [key]: value }));

  /** Track inputs to GA4 after 5 seconds of inactivity */
  useEffect(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      const signature = JSON.stringify(inputs);
      if (signature !== lastTrackedInputs.current) {
        lastTrackedInputs.current = signature;
        trackEvent("calc_inputs", {
          age: inputs.currentAge, balance: inputs.balance,
          balance_range: inputs.balance < 50000 ? "0-50K" : inputs.balance < 100000 ? "50-100K" : inputs.balance < 250000 ? "100-250K" : inputs.balance < 500000 ? "250-500K" : inputs.balance < 1000000 ? "500K-1M" : "1M+",
          monthly: inputs.monthlyContrib, retire_age: inputs.retireAge, spending: inputs.annualSpending,
          return_pct: inputs.annualReturn, inflation_pct: inputs.inflation, swr_pct: inputs.swr,
        });
      }
    }, 5000);
    return () => { if (idleTimer.current) clearTimeout(idleTimer.current); };
  }, [inputs]);

  /** Switch tab and track inputs + tab view */
  const switchTab = (newTab) => {
    setTab(newTab);
    const signature = JSON.stringify(inputs);
    if (signature !== lastTrackedInputs.current) {
      lastTrackedInputs.current = signature;
      trackEvent("calc_inputs_tab", { tab: newTab, age: inputs.currentAge, balance: inputs.balance, retire_age: inputs.retireAge, spending: inputs.annualSpending });
    }
    trackEvent("tab_view", { tab: newTab });
  };

  /* ── Core Calculation Engine ──
     All math uses REAL (inflation-adjusted) returns.
     Every dollar amount represents today's purchasing power. */
  const results = useMemo(() => {
    const { currentAge, balance, monthlyContrib, annualReturn, inflation, swr, retireAge, annualSpending, planAge } = inputs;

    const realReturn = (1 + annualReturn / 100) / (1 + inflation / 100) - 1;
    const yearsToRetire = Math.max(0, retireAge - currentAge);
    const annualContrib = monthlyContrib * 12;
    const retirementTarget = swr > 0 ? annualSpending / (swr / 100) : 0;
    const coastNumber = yearsToRetire > 0 && realReturn > 0
      ? retirementTarget / Math.pow(1 + realReturn, yearsToRetire) : retirementTarget;

    // Build year-by-year projection
    const rows = [];
    let keepBalance = balance;
    let coastBalance = balance;
    let coastReached = balance >= coastNumber;
    let coastAge = coastReached ? currentAge : null;
    let moneyLastsAge = null;

    for (let age = currentAge; age <= 100; age++) {
      const coastTarget = age <= retireAge
        ? retirementTarget / Math.pow(1 + realReturn, Math.max(0, retireAge - age)) : null;

      if (!coastReached && age <= retireAge && keepBalance >= coastTarget) {
        coastReached = true;
        coastAge = age;
      }

      const status = age > retireAge
        ? (coastBalance <= 0 ? "depleted" : "retired")
        : (coastReached ? "coast" : "investing");

      rows.push({
        age, keepInvesting: Math.max(0, keepBalance), coast: Math.max(0, coastBalance),
        target: coastTarget, withdrawal: age > retireAge ? annualSpending : null, status,
      });

      if (age > retireAge && coastBalance <= 0 && moneyLastsAge === null) moneyLastsAge = age - 1;

      if (age < 100) {
        if (age < retireAge) {
          keepBalance = keepBalance * (1 + realReturn) + annualContrib;
          coastBalance = coastReached ? coastBalance * (1 + realReturn) : coastBalance * (1 + realReturn) + annualContrib;
        } else {
          keepBalance = Math.max(0, keepBalance * (1 + realReturn) - annualSpending);
          coastBalance = Math.max(0, coastBalance * (1 + realReturn) - annualSpending);
        }
      }
    }

    const coastProjection = rows.find(r => r.age === retireAge)?.coast || 0;
    const keepProjection = rows.find(r => r.age === retireAge)?.keepInvesting || 0;
    const surplus = coastProjection - retirementTarget;
    const onTrack = surplus >= 0;

    let extraMonthly = 0;
    if (!onTrack && realReturn > 0 && yearsToRetire > 0) {
      const annuityFactor = (Math.pow(1 + realReturn, yearsToRetire) - 1) / realReturn;
      if (annuityFactor > 0) extraMonthly = Math.abs(surplus) / annuityFactor / 12;
    }

    let coastMessage;
    if (balance >= coastNumber) coastMessage = { text: "You can stop contributing now!", type: "success" };
    else if (coastAge !== null && coastAge > currentAge) coastMessage = { text: `You can stop contributing at age ${coastAge}`, type: "success" };
    else coastMessage = { text: `No coast period — keep investing until age ${retireAge}`, type: "warning" };

    return {
      realReturn, yearsToRetire, annualContrib, retirementTarget, coastNumber,
      alreadyCoast: balance >= coastNumber, coastAge, coastMessage,
      noCoast: coastAge === null, coastProjection, keepProjection,
      onTrack, surplus, extraMonthly,
      moneyLastsAge: moneyLastsAge === null ? "100+" : moneyLastsAge,
      hasShortfallButLasts: surplus < 0 && moneyLastsAge === null, rows,
    };
  }, [inputs]);

  /* ── Render books page if navigated there ── */
  if (page === "books") return <BooksPage onBack={() => setPage("calculator")} />;

  /* ── Main calculator UI ── */
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #ede9fe 0%, #f3e8ff 25%, #faf5ff 55%, #fff 100%)", fontFamily: "'Inter',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <div style={{ padding: "40px 20px 20px", textAlign: "center", maxWidth: 500, margin: "0 auto" }}>
        <div style={{ fontSize: 38, marginBottom: 6 }}>🔥</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1e1b4b", margin: "0 0 6px", lineHeight: 1.15 }}>Coast FIRE<br/>Calculator</h1>
        <p style={{ fontSize: 13, color: "#7c3aed", fontWeight: 600, margin: 0 }}>When can you stop saving for retirement?</p>
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>All values in today's dollars</p>
        <button onClick={() => { setShowInfo(!showInfo); trackEvent("toggle_whatis", { open: !showInfo }); }}
          style={{ marginTop: 10, background: showInfo ? "#7c3aed" : "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.2)", borderRadius: 20, padding: "7px 18px",
            color: showInfo ? "#fff" : "#7c3aed", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {showInfo ? "Got it ✓" : "What is Coast FIRE?"}
        </button>
        {showInfo && (
          <div style={{ marginTop: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
            padding: "18px 20px", textAlign: "left", boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.65, margin: 0 }}>
              <strong style={{ color: "#7c3aed" }}>Coast FIRE</strong> is the point where your investments are large enough
              that compound growth alone will carry you to your retirement goal — even if you never save another dollar.
            </p>
          </div>
        )}
      </div>

      {/* ── Hero Result Card ── */}
      <div style={{ padding: "0 20px", maxWidth: 500, margin: "0 auto" }}>
        <div style={{
          background: results.coastMessage.type === "success" ? "linear-gradient(135deg, #1e1b4b, #312e81)" : "linear-gradient(135deg, #7c2d12, #9a3412)",
          borderRadius: 20, padding: "22px 24px 18px", textAlign: "center",
          boxShadow: results.coastMessage.type === "success" ? "0 8px 32px rgba(30,27,75,0.3)" : "0 8px 32px rgba(124,45,18,0.25)",
        }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 3, marginBottom: 8, fontWeight: 700,
            color: results.coastMessage.type === "success" ? "#a5b4fc" : "#fdba74" }}>🔥 Coast FIRE</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>{results.coastMessage.text}</div>
          <div style={{ marginTop: 12, display: "inline-block",
            background: results.onTrack ? "rgba(52,211,153,0.15)" : "rgba(251,191,36,0.15)",
            borderRadius: 20, padding: "5px 16px" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: results.onTrack ? "#34d399" : "#fbbf24" }}>
              {results.onTrack ? "✅ On track for retirement" : `⚠️ ${formatCurrency(results.extraMonthly)}/mo more needed`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ padding: "20px 20px 32px", maxWidth: 500, margin: "0 auto" }}>

        {/* ── Input Card ── */}
        <div style={{ background: "#fff", borderRadius: 20, padding: "20px 20px 4px", marginBottom: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#1e1b4b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 18 }}>Your Inputs</div>
          <InputField label="Current Age" value={inputs.currentAge} onChange={updateInput("currentAge")} suffix="years" />
          <InputField label="Investment Balance" value={inputs.balance} onChange={updateInput("balance")} prefix="$" />
          <InputField label="Monthly Contributions" value={inputs.monthlyContrib} onChange={updateInput("monthlyContrib")} prefix="$" />
          <InputField label="Target Retirement Age" value={inputs.retireAge} onChange={updateInput("retireAge")} suffix="years" />
          <InputField label="Annual Spending in Retirement" value={inputs.annualSpending} onChange={updateInput("annualSpending")} prefix="$" note="pre-tax" />
          <button onClick={() => setShowAdvanced(!showAdvanced)} style={{
            background: "none", border: "none", color: "#7c3aed", fontSize: 12, fontWeight: 700,
            cursor: "pointer", padding: "10px 0 16px", width: "100%", textAlign: "center" }}>
            {showAdvanced ? "Hide advanced ↑" : "Advanced settings ↓"}
          </button>
          {showAdvanced && (
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 18 }}>
              <InputField label="Expected Annual Return" value={inputs.annualReturn} onChange={updateInput("annualReturn")} suffix="%"
                info="10% is the historical S&P 500 average. Use 7-8% for a more conservative estimate." />
              <InputField label="Expected Inflation" value={inputs.inflation} onChange={updateInput("inflation")} suffix="%"
                info="3% is the long-term US average. Used to calculate your real (after-inflation) return." />
              <InputField label="Safe Withdrawal Rate" value={inputs.swr} onChange={updateInput("swr")} suffix="%"
                info="The % of your portfolio you withdraw each year in retirement. 4% is the standard 'safe' rate from the Trinity Study." />
              <InputField label="Plan Through Age" value={inputs.planAge} onChange={updateInput("planAge")} suffix="years" />
            </div>
          )}
        </div>

        {/* ── Tab Navigation ── */}
        <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 16 }}>
          <TabButton active={tab === "results"} label="Results" onClick={() => switchTab("results")} />
          <TabButton active={tab === "chart"} label="Chart" onClick={() => switchTab("chart")} />
          <TabButton active={tab === "table"} label="Table" onClick={() => switchTab("table")} />
        </div>

        {/* ── Results Tab ── */}
        {tab === "results" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <ResultCard label="Coast FIRE Number" value={formatCurrency(results.coastNumber)} accent="purple" sub="Amount needed today"
              info="The balance you need today so growth alone (no more contributions) reaches your retirement target." />
            <ResultCard label="Already Coast?" value={results.alreadyCoast ? "YES! 🎉" : "Not yet"} accent={results.alreadyCoast ? "green" : "default"} />
            <div style={{ gridColumn: "1 / -1" }}>
              <ResultCard label={`Balance at Retirement Age (${inputs.retireAge})`} value={formatCurrency(results.coastProjection)}
                sub={results.coastAge !== null ? `If you stop contributing at Coast FIRE age (${results.coastAge})` : "If you keep investing until retirement"} />
            </div>
            <ResultCard label="Surplus / Shortfall" value={formatCurrency(results.surplus)} accent={results.surplus >= 0 ? "green" : "red"} large />
            <ResultCard label="Money Lasts Until" value={`Age ${results.moneyLastsAge}`}
              accent={results.moneyLastsAge === "100+" || results.moneyLastsAge >= inputs.planAge ? "green" : "red"} large />
            {results.hasShortfallButLasts && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ background: "#fffbeb", borderRadius: 12, padding: "12px 16px", border: "1px solid #fde68a",
                  fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
                  Good news — your money still lasts at these projected returns. But the 4% rule exists because markets have bad years too. Closing the gap gives you a bigger safety net for when that happens.
                </div>
              </div>
            )}
            {!results.onTrack && (
              <div style={{ gridColumn: "1 / -1" }}>
                <ResultCard label="Additional Monthly Needed" value={`${formatCurrency(results.extraMonthly)}/mo`} accent="orange"
                  sub="To reach your retirement target at current assumptions" />
              </div>
            )}
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ background: "#f9fafb", borderRadius: 14, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Key Calculations</div>
                {[
                  ["Real return (after inflation)", `${(results.realReturn * 100).toFixed(2)}%`],
                  ["Years until retirement", results.yearsToRetire],
                  ["Annual contributions", formatCurrency(results.annualContrib)],
                  ["Retirement target (today's $)", formatCurrency(results.retirementTarget)],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#374151", padding: "4px 0" }}>
                    <span>{label}</span><span style={{ fontWeight: 700 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Chart Tab ── */}
        {tab === "chart" && (
          <div style={{ background: "#fff", borderRadius: 20, padding: "20px 10px 12px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#1e1b4b", textTransform: "uppercase",
              letterSpacing: "0.08em", marginBottom: 16, paddingLeft: 8 }}>Portfolio Lifecycle</div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={results.rows} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradKeep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCoast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="age" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={{ stroke: "#e5e7eb" }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={formatCompact} width={50} />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine x={inputs.retireAge} stroke="#d1d5db" strokeDasharray="4 4"
                  label={{ value: `Retire (${inputs.retireAge})`, position: "top", fill: "#9ca3af", fontSize: 10 }} />
                <Area type="monotone" dataKey="keepInvesting" fill="url(#gradKeep)" stroke="none" />
                <Area type="monotone" dataKey="coast" fill="url(#gradCoast)" stroke="none" />
                <Line type="monotone" dataKey="keepInvesting" name="Keep Investing" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                <Line type="monotone" dataKey="coast" name="Coast" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="target" name="Coast Target" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 4" dot={false} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
            {/* Chart legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: "10px 0 4px", flexWrap: "wrap" }}>
              {[["#f59e0b", "Coast", false], ["#8b5cf6", "Keep Investing (if you don't stop)", true], ["#ef4444", "Coast Target", true]].map(([color, label, dashed]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 14, height: 3, borderRadius: 2,
                    background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 8px)` : color }} />
                  <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 500 }}>{label}</span>
                </div>
              ))}
            </div>
            {/* Explanatory note when coast is never reached */}
            {results.noCoast && (
              <div style={{ margin: "8px 8px 4px", padding: "10px 14px", background: "#fffbeb",
                borderRadius: 10, border: "1px solid #fde68a", fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                Your balance doesn't reach the coast target before retirement, but based on projected returns your money still lasts{results.moneyLastsAge === "100+" ? " past age 100" : ` until age ${results.moneyLastsAge}`}.
              </div>
            )}
          </div>
        )}

        {/* ── Table Tab ── */}
        {tab === "table" && (
          <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.03), 0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #f3f4f6" }}>
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#1e1b4b" }}>
                    {["Age", "Balance", "Target", "Withdrawal", "Status"].map(header => (
                      <th key={header} style={{ padding: "10px 8px", textAlign: header === "Status" || header === "Age" ? "center" : "right",
                        color: "#c7d2fe", fontWeight: 600, fontSize: 10, whiteSpace: "nowrap",
                        letterSpacing: "0.03em", textTransform: "uppercase" }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row, index) => {
                    const statusStyle = STATUS_CONFIG[row.status];
                    return (
                      <tr key={row.age} style={{ background: index % 2 === 0 ? "#fff" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 700, color: "#1e1b4b", fontSize: 12 }}>{row.age}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right", color: "#1f2937", fontWeight: 600, fontSize: 11 }}>{formatCurrency(row.coast)}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right", color: "#9ca3af", fontSize: 11 }}>{row.target != null ? formatCurrency(row.target) : ""}</td>
                        <td style={{ padding: "7px 8px", textAlign: "right", color: "#dc2626", fontSize: 11 }}>{row.withdrawal != null ? formatCurrency(row.withdrawal) : ""}</td>
                        <td style={{ padding: "7px 8px", textAlign: "center", color: statusStyle.color, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{statusStyle.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── How It Works (expandable) ── */}
        <button onClick={() => { setShowHowItWorks(!showHowItWorks); trackEvent("toggle_howitworks", { open: !showHowItWorks }); }}
          style={{ width: "100%", marginTop: 16, padding: "12px 0", background: "#fff", border: "1px solid #f3f4f6",
            borderRadius: 14, color: "#7c3aed", fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}>
          {showHowItWorks ? "Hide details ↑" : "ℹ️ How it works & assumptions"}
        </button>
        {showHowItWorks && (
          <div style={{ background: "#fff", borderRadius: 20, padding: "20px 20px 12px", marginTop: 10,
            border: "1px solid #f3f4f6", boxShadow: "0 1px 4px rgba(0,0,0,0.03)" }}>
            {[
              ["🧭 A Compass, Not a GPS", "This calculator tells you if you're heading in the right direction — when you can ease off the gas and roughly how long your money will last. For the full picture, work with a financial planner."],
              ["📊 Today's Dollars", "All values are in today's purchasing power. A 10% return with 3% inflation gives a real return of ~6.8%. Withdrawals are flat because they represent constant purchasing power — $75K always buys the same amount regardless of the year."],
              ["🔥 Coast FIRE Age", "This is when your balance crosses the 'Coast Target' — the amount that would grow on its own to your retirement goal. After this age, you could stop contributing and still reach your target through growth alone."],
              ["📈 What If I Keep Investing?", "The chart shows both paths — what happens if you coast (stop contributing) vs. keep investing. The gap between the lines is the trade-off: more freedom now vs. a bigger cushion later."],
              ["⚠️ Not Included", "Taxes: Withdrawals from traditional 401k/IRA are taxed as ordinary income. Roth withdrawals are tax-free. For a rough adjustment, increase your spending by 15-25% to account for taxes.\n\nThis calculator also doesn't include Social Security, pensions, rental income, or other income sources — these would extend how long your money lasts. It also doesn't model portfolio allocation changes over time or market volatility (returns are assumed constant).\n\nWant to see any of these features? Let me know in the feedback below."],
            ].map(([title, body], index) => (
              <div key={index} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.65 }}>
                  {body.split("\n\n").map((paragraph, pIndex) => (
                    <p key={pIndex} style={{ margin: pIndex === 0 ? 0 : "10px 0 0" }}>{paragraph}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Feedback Widget ── */}
        <FeedbackWidget />

        {/* ── Footer ── */}
        <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>🧭 This calculator is a compass, not a GPS.</p>
          <p style={{ fontSize: 11, color: "#b0b8c4", margin: "4px 0 0" }}>
            Want the full picture?{" "}
            <a href={AFFILIATE_URL} target="_blank" rel="noopener noreferrer"
              onClick={() => trackEvent("click_affiliate", { location: "footer" })}
              style={{ color: "#7c3aed", fontWeight: 600, textDecoration: "none" }}>Talk to a financial planner</a>.
          </p>
          <p style={{ fontSize: 11, color: "#b0b8c4", margin: "6px 0 0" }}>
            <button onClick={() => { setPage("books"); trackEvent("click_books_link"); }}
              style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 600, fontSize: 11, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
              📚 Recommended reads
            </button>
          </p>
        </div>

        {/* ── Built By ── */}
        <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
          <span style={{ fontSize: 11, color: "#c4b5fd" }}>Built by </span>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
            onClick={() => trackEvent("click_instagram")}
            style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, textDecoration: "none" }}>@mariahakinbi</a>
        </div>
      </div>
    </div>
  );
}

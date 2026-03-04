import { useState, useEffect, useMemo, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, ComposedChart, LabelList
} from "recharts";
import Papa from "papaparse";
import "./styles.css";

// ─── ICONS ──────────────────────────────────────────────────
const Ic = {
  Users: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Pct: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  Trend: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Globe: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Clock: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Upload: () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  ReUp: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Spark: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>,
  Download: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
};

// ─── OPTIMIZED DATA ENGINE ──────────────────────────────────
function mLabel(m) {
  const d = new Date(m + "T00:00:00");
  return d.toLocaleString("en", { month: "short" }) + " " + String(d.getFullYear()).slice(-2);
}

function processData(rows) {
  // Single-pass grouping
  const byMonth = {};
  const jlSet = new Set();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], m = r.AsOfDate;
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(r);
    jlSet.add(r.RoleMapping);
  }
  const months = Object.keys(byMonth).sort();
  const ml = {}; months.forEach(m => ml[m] = mLabel(m));
  const lm = months[months.length - 1];

  // Single-pass aggregation per month
  const mAgg = {};
  for (const m of months) {
    const mr = byMonth[m];
    let prod = 0, onTot = 0, onProd = 0, offTot = 0, offProd = 0, npSub = 0;
    const jlC = {}, empMap = {};
    const expB = { "0-3": 0, "3-6": 0, "6-10": 0, "10-15": 0, "15+": 0 };
    for (let i = 0; i < mr.length; i++) {
      const r = mr[i], isProd = r.ProjectType[0] === "P";
      if (isProd) prod++;
      if (r.Onsite_Offshore === "Onsite") { onTot++; if (isProd) onProd++; }
      else { offTot++; if (isProd) offProd++; }
      if (r.RoleMapping === "Subcon" && !isProd) npSub++;
      jlC[r.RoleMapping] = (jlC[r.RoleMapping] || 0) + 1;
      empMap[r.EmpNo] = r;
      const e = parseFloat(r.TotalExpInYears);
      if (e < 3) expB["0-3"]++; else if (e < 6) expB["3-6"]++; else if (e < 10) expB["6-10"]++; else if (e < 15) expB["10-15"]++; else expB["15+"]++;
    }
    mAgg[m] = { total: mr.length, prod, onTot, onProd, offTot, offProd, npSub, jlC, empMap, expB };
  }

  const la = mAgg[lm];
  const tot = la.total;
  const kpi = {
    tot, prod: la.prod, np: tot - la.prod,
    up: ((la.prod / tot) * 100).toFixed(1),
    eu: (((la.prod + la.npSub) / tot) * 100).toFixed(1),
    onU: ((la.onProd / la.onTot) * 100).toFixed(1),
    offU: ((la.offProd / la.offTot) * 100).toFixed(1),
    npSubcon: la.npSub,
  };

  const ut = months.map(m => {
    const a = mAgg[m];
    return { month: ml[m], actual: parseFloat(((a.prod / a.total) * 100).toFixed(1)) };
  });

  const ht = months.map(m => {
    const a = mAgg[m];
    return { month: ml[m], total: a.total, prod: a.prod, nonProd: a.total - a.prod };
  });

  function computeWalk(fm, tm) {
    const fa = mAgg[fm], ta = mAgg[tm];
    const fIds = new Set(Object.keys(fa.empMap)), tIds = new Set(Object.keys(ta.empMap));
    const baseU = fa.prod / fa.total * 100;

    let nhProd = 0, nhTot = 0;
    for (const id of tIds) { if (!fIds.has(id)) { nhTot++; if (ta.empMap[id].ProjectType[0] === "P") nhProd++; } }
    const nhUI = parseFloat((((fa.prod + nhProd) / (fa.total + nhTot) * 100) - baseU).toFixed(1));

    let atProd = 0, atTot = 0;
    for (const id of fIds) { if (!tIds.has(id)) { atTot++; if (fa.empMap[id].ProjectType[0] === "P") atProd++; } }
    const atUI = parseFloat((((fa.prod - atProd) / (fa.total - atTot) * 100) - baseU).toFixed(1));

    let relC = 0, addC = 0;
    for (const id of fIds) {
      if (!tIds.has(id)) continue;
      const fP = fa.empMap[id].ProjectType[0] === "P", tP = ta.empMap[id].ProjectType[0] === "P";
      if (fP && !tP) relC++;
      if (!fP && tP) addC++;
    }
    const relUI = parseFloat((((fa.prod - relC) / fa.total * 100) - baseU).toFixed(1));
    const addUI = parseFloat((((fa.prod + addC) / fa.total * 100) - baseU).toFixed(1));
    const tU = parseFloat(((ta.prod / ta.total) * 100).toFixed(1));

    return {
      utilzWalk: [
        { name: ml[fm], value: parseFloat(baseU.toFixed(1)), type: "total" },
        { name: "New Hires", value: nhUI, type: nhUI >= 0 ? "increase" : "decrease" },
        { name: "Attrition", value: atUI, type: atUI >= 0 ? "increase" : "decrease" },
        { name: "Releases", value: relUI, type: relUI >= 0 ? "increase" : "decrease" },
        { name: "Existing Addn.", value: addUI, type: addUI >= 0 ? "increase" : "decrease" },
        { name: ml[tm], value: tU, type: "total" },
      ],
      hcWalk: [
        { name: ml[fm], value: fa.prod, type: "total" },
        { name: "New Hires", value: nhProd, type: "increase" },
        { name: "Attrition", value: -atProd, type: "decrease" },
        { name: "Releases", value: -relC, type: "decrease" },
        { name: "Existing Addn.", value: addC, type: "increase" },
        { name: ml[tm], value: ta.prod, type: "total" },
      ],
    };
  }

  const jlCol = { "2": "#8b5cf6", "3": "#14b8a6", "4": "#eab308", "5": "#f97316", "6": "#0ea5e9", "7": "#f43f5e", Subcon: "#6366f1" };
  const jlD = Object.entries(la.jlC).sort((a, b) => b[1] - a[1]).map(([n, v]) => ({
    name: n === "Subcon" ? "Subcon" : `JL ${n}`, value: v, pct: parseFloat(((v / tot) * 100).toFixed(1)), color: jlCol[n] || "#94a3b8",
  }));

  const eCol = { "0-3": "#f97316", "3-6": "#eab308", "6-10": "#0ea5e9", "10-15": "#14b8a6", "15+": "#6366f1" };
  const eD = Object.entries(la.expB).map(([n, v]) => ({
    name: n + " yrs", value: v, pct: parseFloat(((v / tot) * 100).toFixed(1)), color: eCol[n],
  }));

  return { months, ml, lm, kpi, ut, ht, computeWalk, jlD, eD, allJLs: [...jlSet].sort() };
}

// ─── WATERFALL ──────────────────────────────────────────────
function WF({ data, isPct }) {
  let run = 0;
  const bars = data.map(d => {
    if (d.type === "total") { run = d.value; return { ...d, base: 0, h: d.value, dv: d.value }; }
    const b = run; run += d.value;
    return { ...d, base: d.value >= 0 ? b : b + d.value, h: Math.abs(d.value), dv: d.value };
  });
  const mx = Math.max(...bars.map(b => b.base + b.h)) * 1.08;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={bars} margin={{ top: 28, right: 8, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="wT" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={0.9} /><stop offset="100%" stopColor="#22d3ee" stopOpacity={0.7} /></linearGradient>
          <linearGradient id="wU" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} /><stop offset="100%" stopColor="#38bdf8" stopOpacity={0.6} /></linearGradient>
          <linearGradient id="wD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f87171" stopOpacity={0.9} /><stop offset="100%" stopColor="#fb923c" stopOpacity={0.6} /></linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,140,255,0.06)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#8893a7", fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
        <YAxis domain={[isPct ? 0 : "auto", mx]} hide />
        <Bar dataKey="base" stackId="s" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="h" stackId="s" radius={[4, 4, 0, 0]} animationDuration={800}>
          {bars.map((e, i) => <Cell key={i} fill={e.type === "total" ? "url(#wT)" : e.dv >= 0 ? "url(#wU)" : "url(#wD)"} />)}
          <LabelList dataKey="dv" position="top" formatter={v => { const p = v > 0 ? "+" : ""; return isPct ? `${p}${v}%` : `${p}${v.toLocaleString()}`; }} style={{ fill: "#e8edf5", fontSize: 10, fontWeight: 600, fontFamily: "Space Mono" }} />
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── SHARED COMPONENTS ──────────────────────────────────────
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="tooltip-box">
      <div className="tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tooltip-row">
          <span className="tooltip-dot" style={{ background: p.color }} />
          <span className="tooltip-val">{p.name}: {typeof p.value === "number" && p.value < 200 ? `${p.value}%` : p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function DL({ cx, cy, midAngle, outerRadius, name, pct }) {
  const R = Math.PI / 180, r = outerRadius + 28;
  const x = cx + r * Math.cos(-midAngle * R), y = cy + r * Math.sin(-midAngle * R);
  return <text x={x} y={y} fill="#8893a7" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11} fontFamily="DM Sans"><tspan fontWeight="600" fill="#e8edf5">{name}</tspan><tspan dx={4}>{pct}%</tspan></text>;
}

// ─── MAIN APP ───────────────────────────────────────────────
export default function App() {
  const [raw, setRaw] = useState(null);
  const [ldg, setLdg] = useState(true); // Start loading — auto-fetch sample
  const [jl, setJl] = useState("All");
  const [wFrom, setWFrom] = useState(null);
  const [wTo, setWTo] = useState(null);
  const [dv, setDv] = useState("jl");
  const [pt, setPt] = useState("both");

  // Auto-load sample data on mount
  useEffect(() => {
    fetch(import.meta.env.BASE_URL + "sample-data.csv")
      .then(res => res.text())
      .then(text => {
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        setRaw(result.data);
        setLdg(false);
      })
      .catch(() => setLdg(false));
  }, []);

  const handleFile = useCallback((f) => {
    setLdg(true);
    Papa.parse(f, { header: true, skipEmptyLines: true, complete: r => { setRaw(r.data); setLdg(false); }, error: () => setLdg(false) });
  }, []);

  const data = useMemo(() => {
    if (!raw) return null;
    const f = jl === "All" ? raw : raw.filter(r => r.RoleMapping === jl);
    return processData(f);
  }, [raw, jl]);

  useEffect(() => {
    if (data && !wFrom) {
      setWFrom(data.months[data.months.length - 2] || data.months[0]);
      setWTo(data.months[data.months.length - 1]);
    }
  }, [data, wFrom]);

  const walk = useMemo(() => data && wFrom && wTo ? data.computeWalk(wFrom, wTo) : null, [data, wFrom, wTo]);

  // Loading
  if (ldg) return (
    <div className="dw"><div className="orb o1" /><div className="orb o2" />
      <div className="ld-c"><div className="sp" /><p style={{ color: "#8893a7" }}>Loading workforce data...</p></div>
    </div>
  );

  // Upload screen (only if sample failed to load)
  if (!raw) return (
    <div className="dw"><div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
      <div className="dc upload-screen">
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <h1 className="grad-title">Manpower Utilization</h1>
          <p style={{ color: "#8893a7" }}>Real-time workforce analytics and insights</p>
        </div>
        <div className="uz" onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }} onDragOver={e => e.preventDefault()} onClick={() => document.getElementById("fi").click()}>
          <Ic.Upload /><h2 style={{ color: "#e8edf5", marginTop: 16, fontSize: "1.4rem" }}>Upload Workforce Data</h2>
          <p style={{ color: "#8893a7", fontSize: "0.9rem", marginTop: 8 }}>Drop your CSV file here or click to browse</p>
          <p style={{ fontSize: "0.75rem", color: "#556178", marginTop: 4 }}>Columns: EmpNo, ProjectType, Onsite_Offshore, RoleMapping, TotalExpInYears, AsOfDate</p>
          <input id="fi" type="file" accept=".csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          <button className="ub">Select CSV File</button>
        </div>
      </div>
    </div>
  );

  if (!data) return null;
  const { kpi, ut, ht, jlD, eD, months, ml } = data;
  const dd = dv === "jl" ? jlD : eD;

  return (
    <div className="dw"><div className="orb o1" /><div className="orb o2" /><div className="orb o3" />
      <div className="dc">
        {/* HEADER */}
        <div className="hdr fu" style={{ animationDelay: "0.05s" }}>
          <div>
            <h1 className="grad-title">Manpower Utilization</h1>
            <p style={{ color: "var(--t2)", fontSize: "0.9rem", marginTop: 4 }}>Real-time workforce analytics and insights</p>
          </div>
          <div className="ha">
            <label className="btn" style={{ cursor: "pointer" }}>
              <Ic.ReUp /> Upload Data
              <input type="file" accept=".csv" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            </label>
            <button className="btn pr"><Ic.Spark /> AI Summary</button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="fl fu" style={{ animationDelay: "0.1s" }}>
          <span className="fl-l">Filters</span>
          <select className="fl-s" value={jl} onChange={e => setJl(e.target.value)}>
            <option value="All">All JL</option>
            {data.allJLs.map(j => <option key={j} value={j}>{j === "Subcon" ? "Subcon" : `JL ${j}`}</option>)}
          </select>
          <div className="fl-d" />
          <span style={{ fontSize: "0.72rem", color: "#556178" }}>{ml[months[0]]} — {ml[months[months.length - 1]]} · {raw.length.toLocaleString()} records</span>
        </div>

        {/* KPI ROW 1 */}
        <div className="kg k5 fu" style={{ animationDelay: "0.15s" }}>
          {[
            { t: "Total Headcount", v: kpi.tot.toLocaleString(), i: <Ic.Users /> },
            { t: "Production Headcount", v: kpi.prod.toLocaleString(), i: <Ic.Users /> },
            { t: "Non Production", v: kpi.np.toLocaleString(), i: <Ic.Users /> },
            { t: "Utilization %", v: `${kpi.up}%`, i: <Ic.Pct />, h: true },
            { t: "Expected Utilization %", v: `${kpi.eu}%`, i: <Ic.Trend />, h: true },
          ].map((k, idx) => (
            <div className="kc" key={idx}><div className="kt"><span className="kn">{k.t}</span><span className="ki">{k.i}</span></div><div className={`kv ${k.h ? "hl" : ""}`}>{k.v}</div></div>
          ))}
        </div>

        {/* KPI ROW 2 */}
        <div className="kg k3 fu" style={{ animationDelay: "0.2s" }}>
          {[
            { t: "Offshore Utilization %", v: `${kpi.offU}%`, i: <Ic.Globe /> },
            { t: "Onsite Utilization %", v: `${kpi.onU}%`, i: <Ic.Pct /> },
            { t: "Pending Subcon", v: kpi.npSubcon.toLocaleString(), i: <Ic.Clock /> },
          ].map((k, idx) => (
            <div className="kc" key={idx}><div className="kt"><span className="kn">{k.t}</span><span className="ki">{k.i}</span></div><div className="kv">{k.v}</div></div>
          ))}
        </div>

        {/* MIDDLE CHARTS */}
        <div className="cr fu" style={{ animationDelay: "0.25s" }}>
          <div className="cc">
            <div className="ct">Utilization Trend</div><div className="cs">Monthly actual utilization</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ut} margin={{ top: 10, right: 20, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,140,255,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#8893a7", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "#556178", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="actual" stroke="#34d399" strokeWidth={2.5} dot={{ fill: "#34d399", r: 5 }} name="Utilization" activeDot={{ r: 7, fill: "#34d399", stroke: "#fff", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="cc">
            <div className="ct g">Utilz Walk</div>
            <div className="wf">
              <span className="wl">From:</span>
              <select className="ws" value={wFrom || ""} onChange={e => setWFrom(e.target.value)}>{months.map(m => <option key={m} value={m}>{ml[m]}</option>)}</select>
              <span className="wl">To:</span>
              <select className="ws" value={wTo || ""} onChange={e => setWTo(e.target.value)}>{months.map(m => <option key={m} value={m}>{ml[m]}</option>)}</select>
            </div>
            {walk && <WF data={walk.utilzWalk} isPct={true} />}
            <div className="lg"><div className="li"><span className="ld" style={{ background: "#34d399" }} /> Total</div><div className="li"><span className="ld" style={{ background: "#60a5fa" }} /> Increase</div><div className="li"><span className="ld" style={{ background: "#f87171" }} /> Decrease</div></div>
          </div>

          <div className="cc">
            <div className="ct">Prod HC Walk</div>
            <div className="wf">
              <span className="wl">From:</span>
              <select className="ws" value={wFrom || ""} onChange={e => setWFrom(e.target.value)}>{months.map(m => <option key={m} value={m}>{ml[m]}</option>)}</select>
              <span className="wl">To:</span>
              <select className="ws" value={wTo || ""} onChange={e => setWTo(e.target.value)}>{months.map(m => <option key={m} value={m}>{ml[m]}</option>)}</select>
            </div>
            {walk && <WF data={walk.hcWalk} isPct={false} />}
            <div className="lg"><div className="li"><span className="ld" style={{ background: "#34d399" }} /> Total</div><div className="li"><span className="ld" style={{ background: "#60a5fa" }} /> Increase</div><div className="li"><span className="ld" style={{ background: "#f87171" }} /> Decrease</div></div>
          </div>
        </div>

        {/* BOTTOM CHARTS */}
        <div className="cr fu" style={{ animationDelay: "0.3s" }}>
          <div className="cc">
            <div className="ct">Total HC Trend</div><div className="cs">Monthly headcount overview</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ht} margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
                <defs><linearGradient id="bC" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.95} /><stop offset="100%" stopColor="#0891b2" stopOpacity={0.7} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,140,255,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#8893a7", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "#556178", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="total" fill="url(#bC)" radius={[6, 6, 0, 0]} barSize={36} name="Total HC">
                  <LabelList dataKey="total" position="top" style={{ fill: "#8893a7", fontSize: 10, fontFamily: "Space Mono" }} formatter={v => v.toLocaleString()} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="cc">
            <div className="ch">
              <div className="ct g">Prod & Non Prod HC</div>
              <div className="tg">
                <button className={`tb ${pt !== "np" ? "on" : ""}`} onClick={() => setPt(pt === "p" ? "both" : "p")}>Prod</button>
                <button className={`tb ${pt !== "p" ? "on" : ""}`} onClick={() => setPt(pt === "np" ? "both" : "np")}>Non-Prod</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ht} margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
                <defs>
                  <linearGradient id="bP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity={0.95} /><stop offset="100%" stopColor="#0891b2" stopOpacity={0.7} /></linearGradient>
                  <linearGradient id="bN" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb923c" stopOpacity={0.9} /><stop offset="100%" stopColor="#ea580c" stopOpacity={0.6} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,140,255,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#8893a7", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#556178", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                {pt !== "np" && <Bar dataKey="prod" fill="url(#bP)" radius={[6, 6, 0, 0]} barSize={28} name="Production" />}
                {pt !== "p" && <Bar dataKey="nonProd" fill="url(#bN)" radius={[6, 6, 0, 0]} barSize={28} name="Non-Production" />}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="cc">
            <div className="ch">
              <div><div className="ct">Employee Distribution</div><div className="cs">Latest · <strong style={{ color: "#e8edf5" }}>{kpi.tot.toLocaleString()}</strong> employees</div></div>
              <div className="tg">
                <button className={`tb ${dv === "jl" ? "on" : ""}`} onClick={() => setDv("jl")}>Job Level</button>
                <button className={`tb ${dv === "exp" ? "on" : ""}`} onClick={() => setDv("exp")}>Experience</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart><Pie data={dd} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" label={DL} labelLine={{ stroke: "#556178", strokeWidth: 1 }} animationDuration={800}>
                {dd.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
              </Pie><Tooltip content={<Tip />} /></PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ textAlign: "center", marginTop: 24, color: "#556178", fontSize: "0.75rem" }}>
          Built as a portfolio prototype · Synthetic data · Not affiliated with any organization
        </div>
      </div>
    </div>
  );
}

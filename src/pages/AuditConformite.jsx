import React from 'react';
import { useState, useEffect, useMemo, useCallback } from "react";
import { logActivityDB, saveLead as dbSaveLead, cacheSaveCRM } from "../lib/data-service.js";
import { sendEmail } from "../lib/email-service.js";

// ══════════════════════════════════════════════════════════════
// LAB LEARNING — Audit de Conformité
// 3 phases: Questionnaire → Script commercial → Rapport PDF
// ══════════════════════════════════════════════════════════════

const WEIGHTS = { haccp: 40, duerp: 20, sst: 20, incendie: 20 };
const LABELS = { haccp: "HACCP", duerp: "DUERP", sst: "SST", incendie: "Incendie" };
const COLORS = { haccp: "#EF4444", duerp: "#F59E0B", sst: "#10B981", incendie: "#DC2626" };
const LEGAL = {
  haccp: { level: "OBLIGATION LÉGALE (ERP)", color: "#EF4444", text: "Au moins 1 personne formée HACCP obligatoire. Risques : amende jusqu'à 1 500€, fermeture administrative, intoxication alimentaire avec responsabilité pénale." },
  duerp: { level: "OBLIGATION LÉGALE", color: "#F59E0B", text: "DUERP obligatoire dès 1 salarié, mise à jour annuelle. Risques : amende jusqu'à 3 000€ en récidive, responsabilité en cas d'accident." },
  sst: { level: "RECOMMANDÉ / OBLIGATOIRE", color: "#10B981", text: "Recommandé pour tous, obligatoire dès 20 salariés ou activités à risque. Limiter les conséquences d'un accident." },
  incendie: { level: "OBLIGATION ERP", color: "#DC2626", text: "Formation évacuation et manipulation extincteurs obligatoire en ERP. Risques : fermeture par commission de sécurité, responsabilité pénale." }
};
const SUBTITLES = { haccp: "Au moins 1 personne formée obligatoire", duerp: "Obligatoire dès 1 salarié", sst: "Recommandé / obligatoire selon taille", incendie: "Obligatoire en ERP" };

const fmt = n => new Intl.NumberFormat('fr-FR').format(n);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const S = "\\n@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap');\\n*{margin:0;padding:0;box-sizing:border-box}\\n:root{--p:#195144;--pl:#1E6B5A;--a:#59D597;--ag:rgba(89,213,151,.15);--bg:#0B0F1A;--c:#111827;--sf:#0F172A;--inp:#1E293B;--t1:#F1F5F9;--t2:#94A3B8;--tm:#64748B;--bd:rgba(148,163,184,.08);--fb:'Plus Jakarta Sans',sans-serif;--fd:'Outfit',sans-serif}\\nbody{font-family:var(--fb);background:var(--bg);color:var(--t1)}\\n::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(148,163,184,.15);border-radius:3px}\\n@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}\\n.anim{animation:fadeUp .35s ease forwards}\\n.inp{width:100%;padding:10px 14px;background:var(--inp);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-family:var(--fb);font-size:14px;outline:none;transition:.2s}\\n.inp:focus{border-color:var(--a);box-shadow:0 0 0 3px var(--ag)}\\n.inp::placeholder{color:var(--tm)}\\nselect.inp{cursor:pointer;appearance:auto}\\ntextarea.inp{resize:vertical;min-height:80px}\\n.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;font-family:var(--fb);font-weight:600;font-size:13px;cursor:pointer;border:none;transition:.15s}\\n.btn:hover{transform:translateY(-1px)}.btn:active{transform:translateY(0)}\\n.btn-p{background:linear-gradient(135deg,var(--p),var(--pl));color:#fff}\\n.btn-a{background:linear-gradient(135deg,var(--a),#3ECB82);color:var(--p);font-weight:700}\\n.btn-s{background:var(--inp);color:var(--t1);border:1px solid var(--bd)}\\n.btn-d{background:rgba(220,38,38,.1);color:#F87171;border:1px solid rgba(220,38,38,.2)}\\n.btn-sm{padding:6px 12px;font-size:12px}\\n.card{background:var(--c);border:1px solid var(--bd);border-radius:16px;padding:24px;margin-bottom:16px}\\n.lbl{display:block;font-size:11px;font-weight:700;color:var(--tm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}\\n";

export default function AuditConformite(props) {
  var onNav = props && props.onNav ? props.onNav : function() {};
  const [phase, setPhase] = useState("questionnaire"); // questionnaire | script | rapport
  const [toast, setToast] = useState(null);

  // ─── Questionnaire state ───
  const [etabNom, setEtabNom] = useState("");
  const [etabType, setEtabType] = useState("");
  const [convention, setConvention] = useState("");
  const [effectif, setEffectif] = useState("");
  const [commercialNom, setCommercialNom] = useState("");

  const [formations, setFormations] = useState({
    haccp: { total: "", formed: "", linked: true },
    duerp: { total: "", formed: "", linked: true },
    sst: { total: "", formed: "", linked: true },
    incendie: { total: "", formed: "", linked: true },
  });
  const [duerpState, setDuerpState] = useState("");

  // ─── Script state ───
  const [step, setStep] = useState(1);
  const [stepHistory, setStepHistory] = useState([1]);
  const [opcoKnown, setOpcoKnown] = useState(null);
  const [compteActif, setCompteActif] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [contactNom, setContactNom] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTel, setContactTel] = useState("");
  const [contactFonction, setContactFonction] = useState("");
  const [projectionDate, setProjectionDate] = useState("");
  const [projectionPeriode, setProjectionPeriode] = useState("");
  const [projectionComment, setProjectionComment] = useState("");
  const [rdvDate, setRdvDate] = useState("");
  const [rdvHeure, setRdvHeure] = useState("");
  const [rdvMode, setRdvMode] = useState("visio");
  const [quickNotes, setQuickNotes] = useState("");
  const [hesitantAction, setHesitantAction] = useState("");
  const [hesitantDate, setHesitantDate] = useState("");
  const [refusRaison, setRefusRaison] = useState("");
  const [refusDetails, setRefusDetails] = useState("");
  const [refusRelance, setRefusRelance] = useState("non");
  const [emailCC, setEmailCC] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    if (!document.getElementById('audit-s')) { const s = document.createElement('style'); s.id = 'audit-s'; s.textContent = S; document.head.appendChild(s); }
    try {
      var pf = localStorage.getItem("ll_prefill_audit");
      if (pf) {
        var d = JSON.parse(pf);
        if (d.etabNom) setEtabNom(d.etabNom);
        if (d.etabType) setEtabType(d.etabType);
        if (d.convention) setConvention(d.convention);
        if (d.effectif) setEffectif(String(d.effectif));
        if (d.contactNom) setContactNom(d.contactNom);
        if (d.contactEmail) setContactEmail(d.contactEmail);
        if (d.contactTel) setContactTel(d.contactTel);
        localStorage.removeItem("ll_prefill_audit");
      }
    } catch (e) {}
  }, []);

  // Sync effectif to linked formations
  useEffect(() => {
    const eff = parseInt(effectif) || 0;
    if (eff > 0) {
      setFormations(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (next[k].linked) next[k] = { ...next[k], total: String(eff) };
        });
        return next;
      });
    }
  }, [effectif]);

  const updateFormation = (key, field, value) => {
    setFormations(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const toggleLink = (key) => {
    setFormations(prev => {
      const linked = !prev[key].linked;
      const eff = parseInt(effectif) || 0;
      return { ...prev, [key]: { ...prev[key], linked, total: linked && eff ? String(eff) : prev[key].total } };
    });
  };

  const setAllFormed = (key) => {
    setFormations(prev => ({
      ...prev,
      [key]: { ...prev[key], formed: prev[key].total }
    }));
  };

  // ─── SCORE CALCULATION ───
  const scoreData = useMemo(() => {
    let sectionsWithTotal = 0, sumWeighted = 0;
    const pcts = {};
    const criticals = [];
    const keys = ["haccp", "duerp", "sst", "incendie"];

    keys.forEach(k => {
      const t = parseInt(formations[k].total) || 0;
      const f = parseInt(formations[k].formed) || 0;
      if (t > 0) {
        sectionsWithTotal++;
        let pct = clamp(Math.round((f / t) * 100), 0, 100);
        if (k === "duerp") {
          if (duerpState === "non") pct = 0;
          else if (duerpState === "partiel") pct = Math.round(pct / 2);
        }
        pcts[k] = pct;
        sumWeighted += (pct / 100) * WEIGHTS[k];
        if (k === "haccp" && f < 1) criticals.push({ k, pct, msg: "Au moins 1 personne formée HACCP obligatoire", priority: "high" });
        if (pct < 40) criticals.push({ k, pct, msg: ("Couverture " + (LABELS[k]) + " très faible (" + (pct) + "%)"), priority: "high" });
        else if (pct < 70) criticals.push({ k, pct, msg: ("Couverture " + (LABELS[k]) + " moyenne (" + (pct) + "%)"), priority: "medium" });
      } else { pcts[k] = null; }
    });

    const score = sectionsWithTotal > 0 ? Math.round((sumWeighted / 100) * 5 * 10) / 10 : 0;
    const coverage = sectionsWithTotal > 0 ? Math.round(sumWeighted) : 0;
    let desc = "";
    if (score >= 4) desc = "🟢 Bon niveau de conformité";
    else if (score >= 3) desc = "🟡 Niveau correct, améliorations possibles";
    else if (score >= 2) desc = "🟠 À améliorer rapidement";
    else if (sectionsWithTotal > 0) desc = "🔴 Critique - Actions urgentes";
    criticals.sort((a, b) => (b.priority === "high" ? 1 : 0) - (a.priority === "high" ? 1 : 0));
    return { score, coverage, pcts, criticals, desc };
  }, [formations, duerpState]);

  const getScoreColor = (s) => s >= 4 ? "#10B981" : s >= 3 ? "#F59E0B" : s >= 2 ? "#F97316" : "#EF4444";
  const getCovColor = (p) => p === null ? "var(--tm)" : p >= 80 ? "#10B981" : p >= 50 ? "#F59E0B" : "#EF4444";

  // ─── SCRIPT NAVIGATION ───
  const goToStep = (s) => {
    setStepHistory(prev => [...prev, s]);
    setStep(s);
  };
  const goBack = () => {
    if (stepHistory.length > 1) {
      const newH = [...stepHistory];
      newH.pop();
      setStep(newH[newH.length - 1]);
      setStepHistory(newH);
    }
  };
  const selectOpcoAnswer = (val) => { setOpcoKnown(val); goToStep(val === "oui" ? "3a" : "3b"); };
  const selectCompteAnswer = (val) => { setCompteActif(val); goToStep(4); };
  const selectEngagementAnswer = (val) => { setEngagement(val); goToStep(val === "positif" ? "6a" : val === "hesitant" ? "6b" : "6c"); };

  // ─── PHASE NAVIGATION ───
  const goToPhase = (p) => {
    setPhase(p);
    showToast(("Phase: " + (p.charAt(0).toUpperCase() + p.slice(1))));
  };

  // ════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--t1)" }}>
      <style>{S}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg,#0e2f27,#195144,#1a6b52)", padding: "16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>📋</span>
            <div>
              <h1 style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800 }}>Audit de Conformité</h1>
              <p style={{ fontSize: 12, opacity: .7 }}>Outil commercial Lab Learning</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ id: "questionnaire", n: "1", label: "Questionnaire" }, { id: "script", n: "2", label: "Accompagnement" }, { id: "rapport", n: "3", label: "Rapport" }].map(p => (
              <button key={p.id} onClick={() => goToPhase(p.id)} style={{
                padding: "8px 16px", borderRadius: 8, border: phase === p.id ? "1px solid var(--a)" : "1px solid rgba(255,255,255,.2)",
                background: phase === p.id ? "var(--ag)" : "rgba(255,255,255,.05)", color: phase === p.id ? "var(--a)" : "rgba(255,255,255,.7)",
                fontFamily: "var(--fb)", fontWeight: 600, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
              }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: phase === p.id ? "var(--a)" : "rgba(255,255,255,.1)", color: phase === p.id ? "var(--p)" : "rgba(255,255,255,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{p.n}</span>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ PHASE 1: QUESTIONNAIRE ═══ */}
      {phase === "questionnaire" && (
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: 24, display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
          <div>
            {/* Infos établissement */}
            <div className="card">
              <h3 style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🏢 Informations de l'établissement</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
                <div><label className="lbl">Commercial</label><input className="inp" value={commercialNom} onChange={e => setCommercialNom(e.target.value)} placeholder="Votre nom" /></div>
                <div><label className="lbl">Établissement</label><input className="inp" value={etabNom} onChange={e => setEtabNom(e.target.value)} placeholder="Nom de l'établissement" /></div>
                <div><label className="lbl">Type</label>
                  <select className="inp" value={etabType} onChange={e => setEtabType(e.target.value)}>
                    <option value="">-- Sélectionner --</option>
                    {["Restaurant traditionnel", "Restauration rapide", "Boulangerie", "Pâtisserie", "Boucherie", "Salon de thé / Café", "Hôtel", "Traiteur"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><label className="lbl">Convention collective</label>
                  <select className="inp" value={convention} onChange={e => setConvention(e.target.value)}>
                    <option value="">-- Sélectionner --</option>
                    {[["HCR", "HCR (Hôtels, Cafés, Restaurants)"], ["RAPIDE", "Restauration rapide"], ["BOULANGERIE", "Boulangerie-Pâtisserie"], ["BOUCHERIE", "Boucherie"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select></div>
                <div><label className="lbl">Effectif total</label><input className="inp" type="number" min="1" value={effectif} onChange={e => setEffectif(e.target.value)} placeholder="Ex: 8" /></div>
              </div>
            </div>

            {/* 4 Formation cards */}
            {["haccp", "duerp", "sst", "incendie"].map(k => (
              <div key={k} className="card" style={{ borderLeft: ("3px solid " + (COLORS[k])) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--bd)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ padding: "6px 12px", borderRadius: 20, background: COLORS[k], color: "#fff", fontSize: 11, fontWeight: 700 }}>{LABELS[k]}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{k === "haccp" ? "Hygiène alimentaire (HACCP)" : k === "duerp" ? "Document Unique (DUERP)" : k === "sst" ? "Sauveteur Secouriste du Travail" : "Sécurité Incendie"}</div>
                      <div style={{ fontSize: 12, color: "var(--tm)" }}>{SUBTITLES[k]}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--a)", fontWeight: 700 }}>Poids: {WEIGHTS[k]}%</span>
                    <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "var(--sf)", border: "1px solid var(--bd)", color: "var(--tm)" }}>{formations[k].linked ? "lié" : "libre"}</span>
                  </div>
                </div>

                {/* DUERP state */}
                {k === "duerp" && <div style={{ marginBottom: 16 }}>
                  <label className="lbl">État du DUERP</label>
                  <select className="inp" value={duerpState} onChange={e => setDuerpState(e.target.value)}>
                    <option value="">-- Sélectionner --</option>
                    <option value="ok">Oui, à jour</option>
                    <option value="partiel">Partiel / Non à jour</option>
                    <option value="non">Non établi</option>
                  </select>
                </div>}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="lbl">Effectif concerné</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input className="inp" type="number" min="0" style={{ width: 100, textAlign: "center" }} value={formations[k].total} onChange={e => { updateFormation(k, "total", e.target.value); if (formations[k].linked) { setFormations(p => ({ ...p, [k]: { ...p[k], linked: false } })); } }} />
                      <button onClick={() => toggleLink(k)} style={{
                        width: 36, height: 36, borderRadius: 8, border: "1px solid var(--bd)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                        background: formations[k].linked ? "linear-gradient(135deg,var(--p),var(--a))" : "var(--sf)", color: formations[k].linked ? "#fff" : "var(--tm)"
                      }}>🔗</button>
                    </div>
                  </div>
                  <div>
                    <label className="lbl">Nombre formés</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input className="inp" type="number" min="0" style={{ width: 100, textAlign: "center" }} value={formations[k].formed} onChange={e => updateFormation(k, "formed", e.target.value)} />
                      <button onClick={() => setAllFormed(k)} style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--bd)", background: "var(--sf)", cursor: "pointer", color: "var(--tm)", fontSize: 14 }} title="Tous formés">👥</button>
                    </div>
                  </div>
                </div>

                {/* Coverage badge */}
                {scoreData.pcts[k] !== null && scoreData.pcts[k] !== undefined && (
                  <div style={{ marginTop: 12, padding: "8px 14px", borderRadius: 8, background: getCovColor(scoreData.pcts[k]) + "15", border: ("1px solid " + (getCovColor(scoreData.pcts[k])) + "30"), display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: getCovColor(scoreData.pcts[k]) }}>Taux : {scoreData.pcts[k]}%</span>
                  </div>
                )}

                {/* Legal ribbon */}
                <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", display: "flex", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(255,255,255,.03)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>⚠️</div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: LEGAL[k].color, marginBottom: 4 }}>{LEGAL[k].level}</div>
                    <div style={{ fontSize: 12, color: "var(--t2)", lineHeight: 1.5 }}>{LEGAL[k].text}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-a" onClick={() => goToPhase("script")}>Passer à l'accompagnement →</button>
              <button className="btn btn-s btn-sm" onClick={() => {
                let csv = "AUDIT CONFORMITÉ - QUESTIONNAIRE\n";
                csv += ("Établissement," + (etabNom) + "\\nType," + (etabType) + "\\nConvention," + (convention) + "\\nEffectif," + (effectif) + "\\nScore," + (scoreData.score.toFixed(1)) + "/5\\n\\n");
                csv += "Formation,Effectif,Formés,Couverture\n";
                ["haccp","duerp","sst","incendie"].forEach(k => { const t = parseInt(formations[k].total)||0; const f = parseInt(formations[k].formed)||0; const p = scoreData.pcts[k]; csv += ((LABELS[k]) + "," + (t) + "," + (f) + "," + (p!==null&&p!==undefined?p+"%":"—") + "\\n"); });
                const blob = new Blob([csv], { type: "text/csv" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                a.download = ("audit_" + ((etabNom||"etab").replace(/\s+/g,"_")) + "_" + (new Date().toISOString().split("T")[0]) + ".csv"); a.click();
                showToast("📊 CSV exporté");
              }}>📊 Export CSV</button>
            </div>
          </div>

          {/* SIDEBAR - Score */}
          <aside style={{ position: "sticky", top: 24 }}>
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: ("linear-gradient(135deg, var(--p), " + (getScoreColor(scoreData.score)) + ")"), display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", boxShadow: ("0 0 30px " + (getScoreColor(scoreData.score)) + "30") }}>
                  <span style={{ fontSize: 24, fontWeight: 800 }}>{scoreData.score > 0 ? scoreData.score.toFixed(1) : "—"}</span>
                  <span style={{ fontSize: 10, opacity: .7 }}>/5</span>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Score global</div>
                  <div style={{ fontSize: 12, color: "var(--t2)" }}>{scoreData.desc || "Saisissez les effectifs"}</div>
                </div>
              </div>

              {/* Coverage bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--tm)" }}>Couverture globale</span>
                  <span style={{ fontWeight: 700, color: "var(--a)" }}>{scoreData.coverage}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "rgba(148,163,184,.1)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, width: ((scoreData.coverage) + "%"), background: getScoreColor(scoreData.score), transition: "width .4s" }} />
                </div>
              </div>

              {/* Per-formation scores */}
              {["haccp", "duerp", "sst", "incendie"].map(k => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--bd)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[k] }} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{LABELS[k]} ({WEIGHTS[k]}%)</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: getCovColor(scoreData.pcts[k]) }}>
                    {scoreData.pcts[k] !== null && scoreData.pcts[k] !== undefined ? scoreData.pcts[k] + "%" : "—"}
                  </span>
                </div>
              ))}

              {/* Priority */}
              <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: "rgba(255,255,255,.02)", border: "1px solid var(--bd)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tm)", marginBottom: 6 }}>⚡ PRIORITÉ</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: scoreData.criticals.length ? "#F87171" : "var(--a)" }}>
                  {scoreData.criticals.length ? scoreData.criticals[0].msg : "✅ Conformité satisfaisante"}
                </div>
              </div>

              {/* Recommendations */}
              {scoreData.criticals.length > 0 && <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--tm)", marginBottom: 8 }}>📋 RECOMMANDATIONS</div>
                {scoreData.criticals.slice(0, 4).map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, marginBottom: 4, background: c.priority === "high" ? "rgba(239,68,68,.06)" : "rgba(245,158,11,.06)" }}>
                    <span style={{ fontSize: 14 }}>{c.priority === "high" ? "🔴" : "🟠"}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{c.msg}</span>
                  </div>
                ))}
              </div>}
            </div>
          </aside>
        </div>
      )}

      {/* ═══ PHASE 2: SCRIPT COMMERCIAL ═══ */}
      {phase === "script" && (
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: 24, display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, alignItems: "start" }}>
          {/* ─── SIDEBAR SCRIPT ─── */}
          <aside style={{ position: "sticky", top: 24 }}>
            <div className="card" style={{ padding: 18 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📋 Informations prospect</h4>
              {[["Établissement", etabNom || "—"], ["Type", etabType || "—"], ["Score", scoreData.score > 0 ? scoreData.score.toFixed(1) + "/5" : "—"], ["Effectif", effectif || "—"]].map(([l, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--bd)", fontSize: 13 }}>
                  <span style={{ color: "var(--tm)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 18 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Progression</h4>
              {[{ id: 1, label: "Introduction" }, { id: 2, label: "Budget OPCO" }, { id: 3, label: "Vérification" }, { id: 4, label: "Accompagnement" }, { id: 5, label: "Projection" }, { id: 6, label: "Suivi" }].map(s => {
                const curNum = typeof step === "number" ? step : parseInt(String(step));
                const isActive = s.id === curNum || String(step).startsWith(String(s.id));
                const isDone = stepHistory.some(h => (typeof h === "number" ? h : parseInt(String(h))) > s.id);
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, marginBottom: 4, cursor: "pointer", background: isActive ? "var(--ag)" : "transparent", border: isActive ? "1px solid rgba(89,213,151,.3)" : "1px solid transparent" }}
                    onClick={() => { if (isDone || s.id === 1) goToStep(s.id); }}>
                    <div style={{ width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: isActive ? "linear-gradient(135deg,var(--p),var(--a))" : isDone ? "rgba(16,185,129,.15)" : "var(--sf)", color: isActive ? "#fff" : isDone ? "#10B981" : "var(--tm)", border: isActive ? "none" : "1px solid var(--bd)" }}>{isDone ? "✓" : s.id}</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? "var(--a)" : isDone ? "var(--t2)" : "var(--tm)" }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="card" style={{ padding: 18 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>📝 Notes rapides</h4>
              <textarea className="inp" value={quickNotes} onChange={e => setQuickNotes(e.target.value)} placeholder="Notez vos observations..." style={{ minHeight: 100, fontSize: 13 }} />
            </div>
          </aside>

          {/* ─── SCRIPT AREA ─── */}
          <div>
            {/* Progress bar */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5, 6].map(i => {
                const curNum = typeof step === "number" ? step : parseInt(String(step));
                const isActive = i === curNum || String(step).startsWith(String(i));
                const isDone = stepHistory.some(s => (typeof s === "number" ? s : parseInt(String(s))) >= i) && !isActive;
                return <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: isActive ? "var(--a)" : isDone ? "rgba(89,213,151,.3)" : "rgba(148,163,184,.1)", transition: ".3s" }} />;
              })}
            </div>

            {/* ─── STEP 1: Rich Recap + Introduction ─── */}
            {step === 1 && <div className="anim">
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "var(--a)", fontWeight: 700, marginBottom: 12 }}>ÉTAPE 1/6 — ANALYSE DU QUESTIONNAIRE</div>
                {/* Rich recap */}
                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
                  <div style={{ width: 90, height: 90, borderRadius: "50%", background: ("linear-gradient(135deg, var(--p), " + (getScoreColor(scoreData.score)) + ")"), display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", boxShadow: ("0 0 30px " + (getScoreColor(scoreData.score)) + "25") }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>{scoreData.score > 0 ? scoreData.score.toFixed(1) : "—"}</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>/5</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{etabNom || "—"}</div>
                    <div style={{ fontSize: 13, color: "var(--t2)" }}>{etabType || "—"} • {effectif || "—"} personnes</div>
                    <div style={{ height: 10, background: "var(--sf)", borderRadius: 999, overflow: "hidden", marginTop: 10 }}>
                      <div style={{ height: "100%", background: "linear-gradient(90deg, var(--p), var(--a))", width: (((scoreData.score / 5) * 100) + "%"), transition: "width .8s" }} />
                    </div>
                  </div>
                </div>
                {/* 4 formation cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                  {["haccp", "duerp", "sst", "incendie"].map(k => (
                    <div key={k} style={{ background: "var(--sf)", padding: 14, borderRadius: 10, textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: "var(--tm)", textTransform: "uppercase", marginBottom: 4 }}>{LABELS[k]}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: getCovColor(scoreData.pcts[k]) }}>{scoreData.pcts[k] !== null && scoreData.pcts[k] !== undefined ? scoreData.pcts[k] + "%" : "—"}</div>
                    </div>
                  ))}
                </div>
                {/* Préconisations */}
                {scoreData.criticals.length > 0 && <div style={{ padding: 14, borderRadius: 10, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#EF4444", marginBottom: 8 }}>⚠️ PRÉCONISATIONS PRIORITAIRES</div>
                  {scoreData.criticals.slice(0, 4).map((c, i) => (
                    <div key={i} style={{ fontSize: 13, lineHeight: 1.7, color: "var(--t2)" }}>{c.priority === "high" ? "🔴" : "🟠"} <strong style={{ color: "var(--t1)" }}>{LABELS[c.k]}</strong> — {c.msg}</div>
                  ))}
                </div>}
                {/* Actions */}
                <div style={{ padding: 14, borderRadius: 10, background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.15)" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#3B82F6", marginBottom: 8 }}>✅ ACTIONS À EFFECTUER</div>
                  {["haccp", "duerp", "sst", "incendie"].map(k => {
                    const t = parseInt(formations[k].total) || 0;
                    const f = parseInt(formations[k].formed) || 0;
                    const p = scoreData.pcts[k];
                    if (p === null || p === undefined || p >= 80) return null;
                    const manquants = Math.max(0, t - f);
                    return <div key={k} style={{ fontSize: 13, lineHeight: 1.7, color: "var(--t2)" }}>→ <strong style={{ color: "var(--t1)" }}>Former {manquants} personne(s)</strong> en {LABELS[k]}</div>;
                  })}
                  {duerpState === "non" && <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--t2)" }}>→ <strong style={{ color: "var(--t1)" }}>Établir le DUERP</strong> (Document Unique obligatoire)</div>}
                  {duerpState === "partiel" && <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--t2)" }}>→ <strong style={{ color: "var(--t1)" }}>Mettre à jour le DUERP</strong></div>}
                </div>
              </div>
              {/* Speech */}
              <div className="card">
                <div style={{ padding: 16, borderRadius: 10, background: "rgba(89,213,151,.06)", border: "1px solid rgba(89,213,151,.15)", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "var(--a)", fontWeight: 700, marginBottom: 8 }}>📢 À DIRE</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--t2)" }}>
                    « Suite à vos réponses, on voit qu'il y a quelques <strong style={{ color: "var(--t1)" }}>préconisations à apporter</strong>, notamment sur <strong style={{ color: "var(--t1)" }}>{(()=>{const m=["haccp","duerp","sst","incendie"].filter(k=>scoreData.pcts[k]!==null&&scoreData.pcts[k]!==undefined&&scoreData.pcts[k]<80).map(k=>LABELS[k]);return m.length?m.join(", "):"les formations obligatoires";})()}</strong>. »
                    <br /><br />
                    « L'idée, c'est aussi de <strong style={{ color: "var(--t1)" }}>former votre équipe</strong> et d'utiliser votre <strong style={{ color: "var(--t1)" }}>budget de formation annuel</strong> pour rester conforme. »
                    <br /><br />
                    « Justement, on peut vous accompagner grâce à votre <strong style={{ color: "var(--t1)" }}>budget OPCO</strong>. C'est une prise en charge à 100%, donc <strong style={{ color: "var(--t1)" }}>sans avance de frais</strong>. »
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button className="btn btn-s btn-sm" onClick={() => goToPhase("questionnaire")}>← Retour questionnaire</button>
                  <button className="btn btn-a" onClick={() => goToStep(2)}>Continuer →</button>
                </div>
              </div>
            </div>}

          {/* ─── STEP 2: OPCO Question ─── */}
          {step === 2 && <div className="card anim">
            <div style={{ fontSize: 11, color: "var(--a)", fontWeight: 700, marginBottom: 8 }}>ÉTAPE 2/6 — COMPTE OPCO</div>
            <h3 style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Budget OPCO</h3>
            <div style={{ padding: 16, borderRadius: 10, background: "rgba(89,213,151,.06)", border: "1px solid rgba(89,213,151,.15)", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--a)", fontWeight: 700, marginBottom: 8 }}>❓ QUESTION CLÉ</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>« D'ailleurs, le compte OPCO, ça vous parle ? »</div>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {[{ v: "oui", icon: "✓", label: "OUI — Connaît les budgets OPCO", bg: "rgba(16,185,129,.08)", bc: "rgba(16,185,129,.2)" },
                { v: "non", icon: "✗", label: "NON — Ne connaît pas", bg: "rgba(239,68,68,.08)", bc: "rgba(239,68,68,.2)" }].map(o => (
                <button key={o.v} onClick={() => selectOpcoAnswer(o.v)} style={{ flex: 1, padding: 16, borderRadius: 12, border: ("1px solid " + (opcoKnown === o.v ? "var(--a)" : o.bc)), background: opcoKnown === o.v ? "var(--ag)" : o.bg, cursor: "pointer", textAlign: "left", fontFamily: "var(--fb)" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{o.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--t1)" }}>{o.label}</div>
                </button>
              ))}
            </div>
            <button className="btn btn-s btn-sm" onClick={goBack}>← Retour</button>
          </div>}

          {/* ─── STEP 3A: Connaît OPCO ─── */}
          {step === "3a" && <div className="card anim">
            <div style={{ fontSize: 11, color: "var(--a)", fontWeight: 700, marginBottom: 8 }}>ÉTAPE 3/6 — VÉRIFICATION OPCO</div>
            <h3 style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Vérification du compte</h3>
            <div style={{ padding: 16, borderRadius: 10, background: "rgba(89,213,151,.06)", border: "1px solid rgba(89,213,151,.15)", marginBottom: 16 }}>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--t2)" }}>« Parfait. <strong style={{ color: "var(--t1)" }}>Est-ce que vous savez si votre compte OPCO est actif</strong> aujourd'hui ? »</div>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {[{ v: "actif", label: "OUI - Actif", icon: "✓" }, { v: "inactif", label: "NON - Inactif / Ne sait pas", icon: "⚠" }].map(o => (
                <button key={o.v} onClick={() => selectCompteAnswer(o.v)} style={{ flex: 1, padding: 14, borderRadius: 12, border: ("1px solid " + (compteActif === o.v ? "var(--a)" : "var(--bd)")), background: compteActif === o.v ? "var(--ag)" : "var(--sf)", cursor: "pointer", fontFamily: "var(--fb)", textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--t1)" }}>{o.icon} {o.label}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-s btn-sm" onClick={goBack}>← Retour</button>
              <button className="btn btn-p btn-sm" onClick={() => goToStep(4)}>Continuer →</button>
            </div>
          </div>}

          {/* ─── STEP 3B: Ne connaît pas OPCO ─── */}
          {step === "3b" && <div className="card anim">
            <div style={{ fontSize: 11, color: "var(--a)", fontWeight: 700, marginBottom: 8 }}>ÉTAPE 3/6 — EXPLICATION OPCO</div>
            <h3 style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Explication OPCO</h3>
            <div style={{ padding: 16, borderRadius: 10, background: "rgba(89,213,151,.06)", border: "1px solid rgba(89,213,151,.15)", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--a)", fontWeight: 700, marginBottom: 8 }}>📢 À DIRE</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--t2)" }}>
                « L'<strong style={{ color: "var(--t1)" }}>OPCO</strong>, c'est un organisme qui attribue chaque année des <strong style={{ color: "var(--t1)" }}>budgets de formation</strong> aux professionnels. »
                <br /><br />
                « Ces budgets permettent de <strong style={{ color: "var(--t1)" }}>mettre à jour la conformité réglementaire</strong> et de former les équipes, <strong style={{ color: "var(--t1)" }}>sans aucune avance de frais</strong>. »
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-s btn-sm" onClick={goBack}>← Retour</button>
              <button className="btn btn-p btn-sm" onClick={() => goToStep(4)}>Continuer →</button>
            </div>
          </div>}

          {/* ─── STEP 4: Accompagnement ─── */}
          {step === 4 && <div className="card anim">
            <div style={{ fontSize: 11, color: "var(--a)", fontWeight: 700, marginBottom: 8 }}>ÉTAPE 4/6 — ACCOMPAGNEMENT</div>
            <h3 style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Notre accompagnement</h3>
            <div style={{ padding: 16, borderRadius: 10, background: "rgba(89,213,151,.06)", border: "1px solid rgba(89,213,151,.15)", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--a)", fontWeight: 700, marginBottom: 8 }}>📢 À DIRE</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--t2)" }}>
                « Lab Learning est un <strong style={{ color: "var(--t1)" }}>organisme certifié Qualiopi</strong> spécialisé dans votre secteur. Nous nous occupons de <strong style={{ color: "var(--t1)" }}>tout</strong> : montage administratif OPCO, organisation des formations, suivi post-formation. »
              </div>
            </div>
            <div style={{ padding: 14, borderRadius: 10, background: "var(--sf)", border: "1px solid var(--bd)", marginBottom: 16 }}>
              {["Sécuriser votre entreprise face aux contrôles", "Optimiser le rendement de vos équipes", "Améliorer l'efficacité opérationnelle", "Diminuer les risques hygiène et sécurité", "Prise en charge à 100% via budget OPCO"].map((t, i) =>
                <div key={i} style={{ padding: "6px 0", fontSize: 13, color: "var(--t2)" }}>✓ <strong style={{ color: "var(--t1)" }}>{t}</strong></div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-s btn-sm" onClick={goBack}>← Retour</button>
              <button className="btn btn-a" onClick={() => goToStep(5)}>Continuer →</button>
            </div>
          </div>}

          {/* ─── STEP 5: Projection ─── */}
          {step === 5 && <div className="card anim">
            <div style={{ fontSize: 11, color: "var(--a)", fontWeight: 700, marginBottom: 8 }}>ÉTAPE 5/6 — PROJECTION</div>
            <h3 style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Projection</h3>
            <div style={{ padding: 16, borderRadius: 10, background: "rgba(89,213,151,.06)", border: "1px solid rgba(89,213,151,.15)", marginBottom: 16 }}>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--t2)" }}>
                « Nos délais sont d'environ <strong style={{ color: "var(--t1)" }}>un à deux mois</strong>. Vous vous situez plutôt sur <strong style={{ color: "var(--t1)" }}>quel horizon</strong> pour la mise en conformité ? »
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><label className="lbl">Date souhaitée</label><input className="inp" type="date" value={projectionDate} onChange={e => setProjectionDate(e.target.value)} /></div>
              <div><label className="lbl">Période estimée</label>
                <select className="inp" value={projectionPeriode} onChange={e => setProjectionPeriode(e.target.value)}>
                  <option value="">-- Sélectionner --</option>
                  <option value="1-2mois">1 à 2 mois</option>
                  <option value="3-6mois">3 à 6 mois</option>
                  <option value="6mois+">Plus de 6 mois</option>
                  <option value="indefini">Non défini</option>
                </select></div>
            </div>
            <div style={{ marginBottom: 16 }}><label className="lbl">Commentaire</label><input className="inp" value={projectionComment} onChange={e => setProjectionComment(e.target.value)} placeholder="Ex: Après la saison estivale..." /></div>

            {/* Engagement */}
            <div style={{ padding: 16, borderRadius: 10, background: "var(--sf)", border: "1px solid var(--bd)", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--a)", marginBottom: 10 }}>❓ RÉACTION DU PROSPECT</div>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ v: "positif", icon: "✓", label: "POSITIF", sub: "Veut avancer", c: "#10B981" },
                  { v: "hesitant", icon: "⚠", label: "HÉSITANT", sub: "Veut réfléchir", c: "#F59E0B" },
                  { v: "negatif", icon: "✗", label: "NÉGATIF", sub: "Pas intéressé", c: "#EF4444" }].map(o => (
                  <button key={o.v} onClick={() => selectEngagementAnswer(o.v)} style={{ flex: 1, padding: 14, borderRadius: 10, border: engagement === o.v ? ("2px solid " + (o.c)) : "1px solid var(--bd)", background: engagement === o.v ? ((o.c) + "15") : "var(--c)", cursor: "pointer", fontFamily: "var(--fb)", textAlign: "center" }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{o.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: o.c }}>{o.label}</div>
                    <div style={{ fontSize: 11, color: "var(--tm)" }}>{o.sub}</div>
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-s btn-sm" onClick={goBack}>← Retour</button>
          </div>}

          {/* ─── STEP 6A: Positif ─── */}
          {step === "6a" && <div className="card anim">
            <div style={{ fontSize: 11, color: "var(--a)", fontWeight: 700, marginBottom: 8 }}>ÉTAPE 6/6 — PLANIFICATION RDV</div>
            <div style={{ padding: 14, borderRadius: 10, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 24 }}>🎉</span>
              <div><div style={{ fontWeight: 700, color: "#10B981" }}>Excellent !</div><div style={{ fontSize: 13, color: "var(--t2)" }}>Le prospect est intéressé. Planifions un RDV.</div></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><label className="lbl">Date RDV</label><input className="inp" type="date" value={rdvDate} onChange={e => setRdvDate(e.target.value)} /></div>
              <div><label className="lbl">Heure</label><input className="inp" type="time" value={rdvHeure} onChange={e => setRdvHeure(e.target.value)} /></div>
              <div><label className="lbl">Mode</label><select className="inp" value={rdvMode} onChange={e => setRdvMode(e.target.value)}><option value="visio">Visio</option><option value="tel">Téléphone</option><option value="presentiel">Présentiel</option></select></div>
            </div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--a)", marginBottom: 10 }}>📋 Coordonnées</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label className="lbl">Nom</label><input className="inp" value={contactNom} onChange={e => setContactNom(e.target.value)} placeholder="Prénom Nom" /></div>
              <div><label className="lbl">Email</label><input className="inp" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="email@exemple.fr" /></div>
              <div><label className="lbl">Téléphone</label><input className="inp" value={contactTel} onChange={e => setContactTel(e.target.value)} placeholder="06 XX XX XX XX" /></div>
              <div><label className="lbl">Fonction</label><input className="inp" value={contactFonction} onChange={e => setContactFonction(e.target.value)} placeholder="Gérant, Directeur..." /></div>
            </div>
            <div style={{ marginBottom: 16 }}><label className="lbl">Notes</label><textarea className="inp" value={quickNotes} onChange={e => setQuickNotes(e.target.value)} placeholder="Notes sur l'échange..." /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-s btn-sm" onClick={goBack}>← Retour</button>
              <button className="btn btn-a" onClick={() => goToStep("recap")}>Terminer l'entretien →</button>
            </div>
          </div>}

          {/* ─── STEP 6B: Hésitant ─── */}
          {step === "6b" && <div className="card anim">
            <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, marginBottom: 8 }}>ÉTAPE 6/6 — SUIVI HÉSITANT</div>
            <div style={{ padding: 14, borderRadius: 10, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "#F59E0B" }}>⚠ Le prospect hésite</div>
              <div style={{ fontSize: 13, color: "var(--t2)" }}>Définissez une action de suivi.</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label className="lbl">Action de suivi</label><input className="inp" value={hesitantAction} onChange={e => setHesitantAction(e.target.value)} placeholder="Ex: Relancer dans 2 semaines" /></div>
              <div><label className="lbl">Date relance</label><input className="inp" type="date" value={hesitantDate} onChange={e => setHesitantDate(e.target.value)} /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label className="lbl">Nom contact</label><input className="inp" value={contactNom} onChange={e => setContactNom(e.target.value)} /></div>
              <div><label className="lbl">Email</label><input className="inp" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
              <div><label className="lbl">Téléphone</label><input className="inp" value={contactTel} onChange={e => setContactTel(e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: 16 }}><label className="lbl">Notes</label><textarea className="inp" value={quickNotes} onChange={e => setQuickNotes(e.target.value)} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-s btn-sm" onClick={goBack}>← Retour</button>
              <button className="btn btn-p" onClick={() => goToStep("recap")}>Terminer l'entretien →</button>
            </div>
          </div>}

          {/* ─── STEP 6C: Négatif (enriched) ─── */}
          {step === "6c" && <div className="card anim">
            <div style={{ fontSize: 11, color: "#EF4444", fontWeight: 700, marginBottom: 8 }}>ÉTAPE 6/6 — MAINTENIR LE LIEN</div>
            <div style={{ padding: 14, borderRadius: 10, background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.2)", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>ℹ️</span>
              <div><div style={{ fontWeight: 700, color: "#3B82F6" }}>Pas de fermeture définitive</div><div style={{ fontSize: 13, color: "var(--t2)" }}>Même en cas de refus, maintenez une relation positive pour l'avenir.</div></div>
            </div>
            <div style={{ padding: 16, borderRadius: 10, background: "rgba(89,213,151,.06)", border: "1px solid rgba(89,213,151,.15)", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--a)", fontWeight: 700, marginBottom: 8 }}>📢 À DIRE</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--t2)" }}>
                « Je comprends tout à fait. Si vous changez d'avis ou si votre situation évolue, <strong style={{ color: "var(--t1)" }}>n'hésitez pas à me recontacter</strong>. »
                <br /><br />
                « Je vous envoie quand même <strong style={{ color: "var(--t1)" }}>votre diagnostic de conformité par email</strong> — ça peut toujours servir. »
              </div>
            </div>
            <div style={{ marginBottom: 12 }}><label className="lbl">Motif principal du refus</label>
              <select className="inp" value={refusRaison} onChange={e => setRefusRaison(e.target.value)}>
                <option value="">-- Sélectionner --</option>
                <option value="budget">Budget insuffisant</option>
                <option value="priorite">Pas prioritaire actuellement</option>
                <option value="concurrent">Déjà engagé avec un concurrent</option>
                <option value="interne">Gère en interne</option>
                <option value="autre">Autre</option>
              </select></div>
            <div style={{ marginBottom: 12 }}><label className="lbl">Détails / Commentaires</label>
              <textarea className="inp" value={refusDetails} onChange={e => setRefusDetails(e.target.value)} placeholder="Précisions sur le refus..." /></div>
            <div style={{ marginBottom: 12 }}><label className="lbl">Relance future ?</label>
              <select className="inp" value={refusRelance} onChange={e => setRefusRelance(e.target.value)}>
                <option value="non">Non - Ne pas relancer</option>
                <option value="3mois">Oui - Dans 3 mois</option>
                <option value="6mois">Oui - Dans 6 mois</option>
                <option value="1an">Oui - Dans 1 an</option>
              </select></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div><label className="lbl">Nom contact</label><input className="inp" value={contactNom} onChange={e => setContactNom(e.target.value)} /></div>
              <div><label className="lbl">Email</label><input className="inp" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
            </div>
            <div style={{ marginBottom: 16 }}><label className="lbl">Notes</label><textarea className="inp" value={quickNotes} onChange={e => setQuickNotes(e.target.value)} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-s btn-sm" onClick={goBack}>← Retour</button>
              <button className="btn btn-d" onClick={() => goToStep("recap")}>Terminer l'entretien →</button>
            </div>
          </div>}

          {/* ─── RECAP STEP ─── */}
          {step === "recap" && <div className="anim">
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ padding: 14, borderRadius: 10, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 24 }}>✓</span>
                <div><div style={{ fontWeight: 700, color: "#10B981" }}>Entretien terminé !</div><div style={{ fontSize: 13, color: "var(--t2)" }}>Voici le résumé complet de votre échange.</div></div>
              </div>

              {/* Summary */}
              <div style={{ padding: 16, background: "var(--sf)", borderRadius: 10, marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📊 Informations collectées</h4>
                {[["Établissement", etabNom || "—"], ["Score conformité", scoreData.score > 0 ? scoreData.score.toFixed(1) + "/5" : "—"], ["Connaît OPCO", opcoKnown === "oui" ? "Oui" : "Non"],
                  ["Compte OPCO", compteActif === "actif" ? "✅ Actif" : compteActif === "inactif" ? "⚠ Inactif" : "—"],
                  ["Contact", contactNom || "—"], ["Email", contactEmail || "—"], ["Téléphone", contactTel || "—"],
                  ["Engagement", engagement === "positif" ? "✅ Positif" : engagement === "hesitant" ? "⚠ Hésitant" : engagement === "negatif" ? "❌ Négatif" : "—"]
                ].map(([l, v], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--bd)", fontSize: 13 }}>
                    <span style={{ color: "var(--tm)" }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Next actions */}
              <div style={{ padding: 16, background: "var(--sf)", borderRadius: 10, marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📝 Prochaines actions</h4>
                {(projectionDate || projectionPeriode) && <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "2px solid rgba(89,213,151,.3)", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: "var(--tm)" }}>📅 Horizon</span><span style={{ fontWeight: 600, color: "var(--a)" }}>{projectionDate || ""} {projectionPeriode ? ("(" + (projectionPeriode) + ")") : ""}</span>
                </div>}
                {engagement === "positif" && <>
                  <div style={{ fontSize: 13, padding: "5px 0" }}>RDV : <strong>{rdvDate || "—"}</strong> à <strong>{rdvHeure || "—"}</strong> ({rdvMode})</div>
                </>}
                {engagement === "hesitant" && <>
                  <div style={{ fontSize: 13, padding: "5px 0" }}>Action : <strong>{hesitantAction || "—"}</strong></div>
                  <div style={{ fontSize: 13, padding: "5px 0" }}>Relance : <strong>{hesitantDate || "—"}</strong></div>
                </>}
                {engagement === "negatif" && <>
                  <div style={{ fontSize: 13, padding: "5px 0" }}>Raison : <strong>{refusRaison || "—"}</strong></div>
                  <div style={{ fontSize: 13, padding: "5px 0" }}>Relance : <strong>{refusRelance === "non" ? "Non" : refusRelance}</strong></div>
                </>}
              </div>

              {/* Risques */}
              <div style={{ padding: 16, background: "rgba(239,68,68,.04)", border: "1px solid rgba(239,68,68,.12)", borderRadius: 10, marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#EF4444", marginBottom: 12 }}>⚠️ Risques en cas de non-action</h4>
                {scoreData.score >= 4 ? (
                  <div style={{ padding: 12, background: "rgba(16,185,129,.08)", borderRadius: 8, color: "#10B981", fontWeight: 600 }}>✓ Bon niveau de conformité — Risques limités.</div>
                ) : <>
                  {scoreData.pcts.haccp !== null && scoreData.pcts.haccp < 80 && <div style={{ padding: 10, background: "rgba(239,68,68,.06)", borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
                    <strong style={{ color: "#EF4444" }}>🔴 HACCP</strong> <span style={{ color: "var(--tm)", fontSize: 11 }}>— DDPP</span><br />
                    <span style={{ color: "var(--t2)" }}>• Amende jusqu'à 1 500€ (3 000€ récidive) • Fermeture administrative • Responsabilité pénale (TIAC)</span>
                  </div>}
                  {((scoreData.pcts.duerp !== null && scoreData.pcts.duerp < 80) || duerpState === "non" || duerpState === "partiel") && <div style={{ padding: 10, background: "rgba(245,158,11,.06)", borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
                    <strong style={{ color: "#F59E0B" }}>🟠 DUERP</strong> <span style={{ color: "var(--tm)", fontSize: 11 }}>— Inspection du Travail</span><br />
                    <span style={{ color: "var(--t2)" }}>• Amende jusqu'à 1 500€ • Responsabilité civile/pénale (AT) • Majoration cotisations AT/MP</span>
                  </div>}
                  {scoreData.pcts.sst !== null && scoreData.pcts.sst < 50 && <div style={{ padding: 10, background: "rgba(245,158,11,.06)", borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
                    <strong style={{ color: "#F59E0B" }}>🟠 SST</strong> <span style={{ color: "var(--tm)", fontSize: 11 }}>— Inspection du Travail</span><br />
                    <span style={{ color: "var(--t2)" }}>• Absence de secouriste • Obligation 20+ salariés • Aggravation conséquences accident</span>
                  </div>}
                  {scoreData.pcts.incendie !== null && scoreData.pcts.incendie < 80 && <div style={{ padding: 10, background: "rgba(239,68,68,.06)", borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
                    <strong style={{ color: "#EF4444" }}>🔴 INCENDIE (ERP)</strong> <span style={{ color: "var(--tm)", fontSize: 11 }}>— Commission de Sécurité / SDIS</span><br />
                    <span style={{ color: "var(--t2)" }}>• Fermeture administrative • Responsabilité pénale • Non-couverture assurance</span>
                  </div>}
                </>}
              </div>

              {/* Notes */}
              <div style={{ padding: 16, background: "var(--sf)", borderRadius: 10 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>💬 Notes</h4>
                <div style={{ fontSize: 13, color: "var(--t2)", whiteSpace: "pre-wrap" }}>{quickNotes || "Aucune note"}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-s btn-sm" onClick={goBack}>← Modifier</button>
              <button className="btn btn-s btn-sm" onClick={() => {
                const txt = ("=== COMPTE-RENDU ENTRETIEN ===\\n\\nDate: " + (new Date().toLocaleDateString('fr-FR')) + "\\nCommercial: " + (commercialNom || "—") + "\\n\\nÉtablissement: " + (etabNom || "—") + "\\nType: " + (etabType || "—") + "\\nEffectif: " + (effectif || "—") + "\\nScore: " + (scoreData.score.toFixed(1)) + "/5\\n\\nOPCO connu: " + (opcoKnown || "—") + "\\nCompte actif: " + (compteActif || "—") + "\\nEngagement: " + (engagement || "—") + "\\n\\nContact: " + (contactNom || "—") + "\\nEmail: " + (contactEmail || "—") + "\\nTél: " + (contactTel || "—") + "\\n\\nNotes:\\n" + (quickNotes || "Aucune"));
                const blob = new Blob([txt], { type: "text/plain" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = ("CR_" + ((etabNom || "entretien").replace(/\s+/g, "_")) + "_" + (new Date().toISOString().split("T")[0]) + ".txt");
                a.click();
                showToast("📄 Compte-rendu exporté");
              }}>📥 Exporter TXT</button>
              <button className="btn btn-s btn-sm" onClick={() => {
                const txt = ("Établissement: " + (etabNom) + "\\nScore: " + (scoreData.score.toFixed(1)) + "/5\\nOPCO: " + (opcoKnown) + "\\nEngagement: " + (engagement) + "\\nContact: " + (contactNom) + " / " + (contactEmail) + "\\nNotes: " + (quickNotes));
                navigator.clipboard.writeText(txt).then(() => showToast("📋 Copié !")).catch(() => showToast("Erreur copie"));
              }}>📋 Copier</button>
              <div style={{ flex: 1 }} />
              <button className="btn btn-a" onClick={() => goToPhase("rapport")}>Générer le rapport →</button>
            </div>
          </div>}
          </div>
        </div>
      )}

      {/* ═══ PHASE 3: RAPPORT ═══ */}
      {phase === "rapport" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
            {[{ l: "Score", v: scoreData.score > 0 ? scoreData.score.toFixed(1) + "/5" : "—", c: getScoreColor(scoreData.score) },
              { l: "Couverture", v: scoreData.coverage + "%", c: "var(--a)" },
              { l: "Engagement", v: engagement === "positif" ? "Positif" : engagement === "hesitant" ? "Hésitant" : engagement === "negatif" ? "Négatif" : "—", c: engagement === "positif" ? "#10B981" : engagement === "hesitant" ? "#F59E0B" : "#EF4444" },
              { l: "Effectif", v: effectif || "—", c: "var(--t1)" }].map((s, i) => (
              <div key={i} style={{ background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--fd)", color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tm)", marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Rapport détaillé */}
          <div className="card">
            <h3 style={{ fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📄 Rapport d'audit</h3>

            <div style={{ background: "#fff", color: "#111", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#195144" }}>RAPPORT D'AUDIT DE CONFORMITÉ</h2>
                <p style={{ fontSize: 12, color: "#6b7280" }}>{etabNom || "Établissement"} — {new Date().toLocaleDateString('fr-FR')}</p>
              </div>

              {/* Score badge */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", border: ("4px solid " + (getScoreColor(scoreData.score))), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: getScoreColor(scoreData.score) }}>{scoreData.score > 0 ? scoreData.score.toFixed(1) : "—"}</span>
                  <span style={{ fontSize: 10, color: "#6b7280" }}>/5</span>
                </div>
              </div>

              {/* Tableau */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
                <thead><tr style={{ background: "#195144", color: "#fff" }}>
                  <th style={{ padding: 10, textAlign: "left" }}>Formation</th>
                  <th style={{ padding: 10 }}>Poids</th>
                  <th style={{ padding: 10 }}>Formés</th>
                  <th style={{ padding: 10 }}>Couverture</th>
                  <th style={{ padding: 10 }}>Statut</th>
                </tr></thead>
                <tbody>
                  {["haccp", "duerp", "sst", "incendie"].map((k, i) => {
                    const t = parseInt(formations[k].total) || 0;
                    const f = parseInt(formations[k].formed) || 0;
                    const p = scoreData.pcts[k];
                    return (
                      <tr key={k} style={{ background: i % 2 === 0 ? "#fff" : "#f9fafb" }}>
                        <td style={{ padding: 8 }}>{LABELS[k]}</td>
                        <td style={{ padding: 8, textAlign: "center" }}>{WEIGHTS[k]}%</td>
                        <td style={{ padding: 8, textAlign: "center" }}>{f}/{t}</td>
                        <td style={{ padding: 8, textAlign: "center", fontWeight: 700, color: getCovColor(p) }}>{p !== null && p !== undefined ? p + "%" : "—"}</td>
                        <td style={{ padding: 8, textAlign: "center", fontWeight: 600, color: getCovColor(p) }}>{p >= 80 ? "Conforme" : p >= 50 ? "À améliorer" : p !== null ? "Non conforme" : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Préconisations */}
              {scoreData.criticals.length > 0 && <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#195144", marginBottom: 8 }}>Préconisations</h4>
                {scoreData.criticals.map((c, i) => (
                  <div key={i} style={{ padding: "8px 12px", borderRadius: 6, marginBottom: 4, background: c.priority === "high" ? "#fef2f2" : "#fffbeb", fontSize: 12, color: c.priority === "high" ? "#991b1b" : "#92400e" }}>
                    {c.priority === "high" ? "🔴" : "🟠"} <strong>{LABELS[c.k]}</strong> — {c.msg}
                  </div>
                ))}
              </div>}

              <div style={{ padding: 16, background: "#f0f9f4", borderRadius: 8, borderLeft: "4px solid #195144", fontSize: 12, color: "#333", marginBottom: 16 }}>
                <strong style={{ color: "#195144", fontSize: 14 }}>Notre mission : vous aider \u00e0 s\u00e9curiser votre \u00e9tablissement et optimiser votre rendement</strong><br /><br />
                \u2705 Prise en charge jusqu'\u00e0 100% par votre OPCO<br />
                \u2705 Gestion administrative compl\u00e8te<br />
                \u2705 Certifi\u00e9 Qualiopi<br /><br />
                <a href="https://kofkfqfvdlt.typeform.com/to/ICiOa8tE" target="_blank" style={{ display: "inline-block", padding: "8px 20px", background: "#FFD700", color: "#1a1a1a", fontWeight: 700, borderRadius: 20, textDecoration: "none", fontSize: 12 }}>{"\u{1F4C5}"} Planifier un \u00e9change</a>
              </div>
              <div style={{ textAlign: "center", padding: "12px 0", borderTop: "1px solid #e5e7eb", fontSize: 11, color: "#9ca3af" }}>
                Lab Learning | Organisme certifi\u00e9 Qualiopi | 04 51 330 330 | www.lab-learning.fr
              </div>
            </div>
          </div>

          {/* Contact pour envoi */}
          <div className="card">
            <h3 style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📬 Coordonnées pour l'envoi</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label className="lbl">Nom</label><input className="inp" value={contactNom} onChange={e => setContactNom(e.target.value)} /></div>
              <div><label className="lbl">Email</label><input className="inp" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
              <div><label className="lbl">Email CC (optionnel)</label><input className="inp" type="email" value={emailCC} onChange={e => setEmailCC(e.target.value)} placeholder="copie@exemple.fr" /></div>
              <div><label className="lbl">Téléphone</label><input className="inp" value={contactTel} onChange={e => setContactTel(e.target.value)} /></div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-s" onClick={() => goToPhase("script")}>← Retour accompagnement</button>
            <button className="btn btn-s btn-sm" onClick={() => {
              const keys = ["haccp", "duerp", "sst", "incendie"];
              let csv = "AUDIT DE CONFORMITÉ\n";
              csv += ("Date," + (new Date().toISOString()) + "\\n");
              csv += ("Commercial," + (commercialNom || "") + "\\n");
              csv += ("Établissement," + (etabNom || "") + "\\n");
              csv += ("Type," + (etabType || "") + "\\n");
              csv += ("Convention," + (convention || "") + "\\n");
              csv += ("Effectif," + (effectif || "") + "\\n");
              csv += ("Score," + (scoreData.score.toFixed(1)) + "/5\\n");
              csv += ("Couverture," + (scoreData.coverage) + "%\\n\\n");
              csv += "FORMATIONS\n";
              csv += "Formation,Effectif,Formés,Couverture\n";
              keys.forEach(k => { const t = parseInt(formations[k].total) || 0; const f = parseInt(formations[k].formed) || 0; const p = scoreData.pcts[k]; csv += ((LABELS[k]) + "," + (t) + "," + (f) + "," + (p !== null && p !== undefined ? p + "%" : "—") + "\\n"); });
              csv += "\\nENTRETIEN\\n";
              csv += ("OPCO connu," + (opcoKnown || "—") + "\\n");
              csv += ("Compte actif," + (compteActif || "—") + "\\n");
              csv += ("Engagement," + (engagement || "—") + "\\n");
              csv += ("Contact," + (contactNom || "—") + "\\n");
              csv += ("Email," + (contactEmail || "—") + "\\n");
              csv += ("Téléphone," + (contactTel || "—") + "\\n");
              csv += ("Notes," + (quickNotes || "") + "\\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = ("audit_" + ((etabNom || "etablissement").replace(/\s+/g, "_")) + "_" + (new Date().toISOString().split("T")[0]) + ".csv");
              a.click();
              showToast("📊 CSV téléchargé");
            }}>📊 Export CSV</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-p" onClick={() => {
              const sc = scoreData.score;
              const scColor = sc >= 4 ? "#10B981" : sc >= 2.5 ? "#F59E0B" : "#EF4444";
              const scLabel = sc >= 4 ? "CONFORME" : sc >= 2.5 ? "\u00c0 AM\u00c9LIORER" : "CRITIQUE";
              const keys = ["haccp", "duerp", "sst", "incendie"];
              const fRows = keys.map(function(k) {
                var t = parseInt(formations[k].total) || 0;
                var f = parseInt(formations[k].formed) || 0;
                var p = scoreData.pcts[k];
                var pColor = p >= 80 ? "#10B981" : p >= 50 ? "#F59E0B" : "#EF4444";
                var pLabel = p >= 80 ? "Conforme" : p >= 50 ? "\u00c0 am\u00e9liorer" : p !== null ? "Non conforme" : "\u2014";
                return "<tr><td style='padding:12px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#1f2937'>" + LABELS[k] + "</td><td style='padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center;color:#4b5563'>" + f + "/" + t + "</td><td style='padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center;color:" + pColor + ";font-weight:700;font-size:15px'>" + (p !== null && p !== undefined ? p + "%" : "\u2014") + "</td><td style='padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:center'><span style='display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;background:" + pColor + "15;color:" + pColor + "'>" + pLabel + "</span></td></tr>";
              }).join("");
              var precos = scoreData.criticals.map(function(c) {
                var borderCol = c.priority === "high" ? "#EF4444" : "#F59E0B";
                var bgCol = c.priority === "high" ? "#fef2f2" : "#fffbeb";
                return "<div style='padding:12px 16px;margin-bottom:8px;border-radius:8px;border-left:4px solid " + borderCol + ";background:" + bgCol + ";font-size:13px;color:#1f2937'><strong style='color:" + borderCol + "'>" + LABELS[c.k] + "</strong> \u2014 " + c.msg + "</div>";
              }).join("");
              var html = "<!DOCTYPE html><html lang='fr'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f0f8f6'>" +
                "<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#f0f8f6'><tr><td align='center' style='padding:20px'>" +
                "<table width='600' cellpadding='0' cellspacing='0' border='0' style='max-width:600px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.08)'>" +
                "<tr><td align='center' bgcolor='#195144' style='padding:36px 24px;border-radius:16px 16px 0 0'>" +
                "<img src='https://image2url.com/r2/default/images/1769773980533-eefb09b4-6364-4787-a446-f57abf702834.png' width='200' alt='Lab Learning' style='display:block;max-width:200px;height:auto'>" +
                "<p style='margin:14px 0 0;font-size:12px;font-weight:bold;color:#59d597;text-transform:uppercase;letter-spacing:3px'>AUDIT DE CONFORMIT\u00c9 R\u00c9GLEMENTAIRE</p>" +
                "</td></tr>" +
                "<tr><td style='background:#59d597;height:3px'></td></tr>" +
                "<tr><td bgcolor='#ffffff' style='padding:32px'>" +
                "<p style='margin:0 0 20px;font-size:15px;line-height:1.7;color:#4b5563'>Suite \u00e0 notre \u00e9change, veuillez trouver ci-dessous le rapport d'audit de conformit\u00e9 r\u00e9glementaire de votre \u00e9tablissement.</p>" +
                "<table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:24px'><tr><td style='border-left:5px solid #195144;border-radius:8px;padding:18px 22px;background:#f8fafb'>" +
                "<p style='margin:0 0 2px;font-size:18px;font-weight:800;color:#195144'>" + (etabNom || "\u00c9tablissement") + "</p>" +
                "<p style='margin:0;font-size:13px;color:#6b7280'>" + [etabType, convention, effectif ? effectif + " salari\u00e9s" : ""].filter(Boolean).join(" \u2022 ") + " \u2022 " + new Date().toLocaleDateString("fr-FR") + "</p>" +
                "</td></tr></table>" +
                "<table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin-bottom:28px'><tr><td align='center' style='padding:24px;background:#f8fafb;border-radius:12px'>" +
                "<div style='display:inline-block;width:90px;height:90px;border-radius:50%;border:5px solid " + scColor + ";text-align:center;line-height:80px'>" +
                "<span style='font-size:32px;font-weight:800;color:" + scColor + "'>" + sc.toFixed(1) + "</span></div>" +
                "<p style='margin:10px 0 0;font-size:16px;font-weight:700;color:" + scColor + "'>" + scLabel + "</p>" +
                "<p style='margin:4px 0 0;font-size:12px;color:#6b7280'>Couverture globale : " + scoreData.coverage + "%</p>" +
                "</td></tr></table>" +
                "<table width='100%' cellpadding='0' cellspacing='0' border='0' style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px'>" +
                "<thead><tr style='background:#195144'><th style='padding:12px 16px;color:#fff;text-align:left;font-size:12px;font-weight:600'>Formation</th><th style='padding:12px 16px;color:#fff;text-align:center;font-size:12px;font-weight:600'>Form\u00e9s</th><th style='padding:12px 16px;color:#fff;text-align:center;font-size:12px;font-weight:600'>Taux</th><th style='padding:12px 16px;color:#fff;text-align:center;font-size:12px;font-weight:600'>Statut</th></tr></thead>" +
                "<tbody>" + fRows + "</tbody></table>" +
                (precos ? "<h3 style='color:#195144;font-size:15px;font-weight:700;margin:0 0 12px'>Pr\u00e9conisations</h3>" + precos : "") +
                "<table width='100%' cellpadding='0' cellspacing='0' border='0' style='margin:28px 0 20px'><tr><td style='border-left:5px solid #195144;border-radius:8px;padding:18px 22px;background:#f0f9f4'>" +
                "<p style='margin:0 0 8px;font-size:15px;font-weight:700;color:#195144'>Notre mission : vous aider \u00e0 s\u00e9curiser votre \u00e9tablissement et optimiser votre rendement</p>" +
                "<p style='margin:0;font-size:13px;color:#4b5563;line-height:1.6'>\u2705 Prise en charge jusqu'\u00e0 100% par votre OPCO<br>\u2705 Gestion administrative compl\u00e8te<br>\u2705 Certifi\u00e9 Qualiopi</p>" +
                "</td></tr></table>" +
                "<table width='100%' cellpadding='0' cellspacing='0' border='0'><tr><td align='center'>" +
                "<a href='https://kofkfqfvdlt.typeform.com/to/ICiOa8tE' target='_blank' style='display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#1a1a1a;background:#FFD700;text-decoration:none;border-radius:30px;box-shadow:0 2px 8px rgba(0,0,0,.15)'>\u{1F4C5} Planifier un \u00e9change</a>" +
                "</td></tr></table>" +
                (commercialNom ? "<p style='margin:20px 0 0;font-size:13px;color:#4b5563'>Bien cordialement,<br><strong style='color:#195144'>" + commercialNom + "</strong></p>" : "") +
                "</td></tr>" +
                "<tr><td align='center' bgcolor='#1a1a1a' style='border-radius:0 0 16px 16px;padding:28px 20px'>" +
                "<a href='https://www.lab-learning.fr' style='font-size:13px;color:#c5e1a5;text-decoration:none'>\u{1F310} www.lab-learning.fr</a><br>" +
                "<p style='margin:6px 0 0;font-size:11px;color:#777'>04 51 330 330 \u2022 contact@lab-learning.fr</p>" +
                "<p style='margin:12px 0 0;font-size:11px;color:#555'>\u00a9 2026 Lab Learning \u2014 Organisme certifi\u00e9 Qualiopi</p>" +
                "</td></tr></table></td></tr></table></body></html>";
              var w = window.open("", "_blank", "width=650,height=900");
              w.document.write(html);
              w.document.close();
              showToast("\u{1F4C4} Rapport ouvert !");
              logActivityDB({ module: "audit", action: "audit_done", type: "audit_done", leadName: etabNom || "", details: "Score " + sc.toFixed(1) + "/5" });
            }}>{"\u{1F4C4}"} Voir le rapport</button>
            <button className="btn btn-a" onClick={() => {
              if (!contactEmail) { showToast("\u26a0\ufe0f Renseignez l'email du contact"); return; }
              showToast("\u23f3 Envoi en cours...");
              var sc2 = scoreData.score;
              var scC2 = sc2 >= 4 ? "#10B981" : sc2 >= 2.5 ? "#F59E0B" : "#EF4444";
              var subj = "Rapport audit conformite - " + (etabNom || "Etablissement");
              var precos = scoreData.criticals.map(function(cr) { return LABELS[cr.k] + " - " + cr.msg; }).join(". ");
              var body = "<html><body style='margin:0;font-family:Arial,sans-serif;background:#f0f8f6'><table width='100%'><tr><td align='center' style='padding:20px'><table width='600' style='max-width:600px'><tr><td bgcolor='#195144' style='padding:28px;text-align:center;border-radius:16px 16px 0 0'><p style='margin:0;font-size:18px;font-weight:bold;color:#fff'>LAB LEARNING</p><p style='margin:6px 0 0;font-size:12px;color:#59d597'>AUDIT DE CONFORMITE</p></td></tr><tr><td bgcolor='#fff' style='padding:28px'><p style='font-size:14px;color:#4b5563'>Rapport audit de <strong>" + etabNom + "</strong></p><p style='font-size:14px;color:#4b5563'>Score : <strong style='color:" + scC2 + "'>" + sc2.toFixed(1) + "/5</strong> | Couverture : " + scoreData.coverage + "%</p>" + (precos ? "<p style='font-size:13px;color:#195144;font-weight:700'>Preconisations :</p><p style='font-size:13px;color:#4b5563'>" + precos + "</p>" : "") + "<p style='font-size:13px;color:#4b5563;margin-top:16px'>Cordialement,<br><strong style='color:#195144'>" + (commercialNom || "Lab Learning") + "</strong></p></td></tr><tr><td bgcolor='#1a1a1a' style='padding:16px;text-align:center;border-radius:0 0 16px 16px'><p style='font-size:11px;color:#777'>Lab Learning | www.lab-learning.fr</p></td></tr></table></td></tr></table></body></html>";
              sendEmail({ to: contactEmail, toName: contactNom || "", subject: subj, html: body }).then(function() {
                showToast("Rapport envoye a " + contactEmail);
              }).catch(function(err) {
                showToast("Erreur : " + (err.message || "Envoi echoue"));
              });
            }}>{"\u{1F4E7}"} Envoyer par email</button>
            <button className="btn btn-p btn-sm" onClick={() => {
              var lead = { civilite: "", nom: contactNom || etabNom || "", prenom: "", raison_sociale: "", etablissement: etabNom || "", email: contactEmail || "", telephone: contactTel || "", ville: "", adresse: "", siret: "", type_etablissement: etabType === "Restaurant" ? "restaurant" : etabType === "Boulangerie" ? "boulangerie" : "restaurant", convention: convention || "", effectif: parseInt(effectif) || 0, notes: "Audit r\u00e9alis\u00e9 le " + new Date().toLocaleDateString("fr-FR") + ". Score: " + scoreData.score.toFixed(1) + "/5. " + scoreData.criticals.map(function(c) { return LABELS[c.k] + ": " + c.msg; }).join(". "), tags: ["audit"], statut: "nouveau", groupe: "", source: "audit", score: 0, created_at: new Date().toISOString(), last_activity: new Date().toISOString().split("T")[0], id: "id_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6) };
              dbSaveLead(lead);
              var saved = localStorage.getItem("crm_pro_v2");
              var data = saved ? JSON.parse(saved) : { leads: [], tasks: [], comments: [], calls: [], groups: [] };
              data.leads = [lead].concat(data.leads || []);
              cacheSaveCRM(data);
              showToast("\u{1F465} Prospect cr\u00e9\u00e9 dans le CRM !");
            }}>{"\u{1F465}"} Cr\u00e9er le prospect</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 300, boxShadow: "0 10px 40px rgba(0,0,0,.5)", animation: "fadeUp .3s ease", background: "rgba(89,213,151,.15)", color: "#59D597", border: "1px solid rgba(89,213,151,.3)", backdropFilter: "blur(10px)" }}>{toast}</div>}
    </div>
  );
}

import React from 'react';
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase.js";
import { logActivityDB, loadAdmin, saveAdminLead, deleteAdminLead, saveFormateur as dbSaveFormateur, deleteFormateur as dbDeleteFormateur, isOnline } from "../lib/data-service.js";
import { ORG, AKT, PTAGS, oK, aK, gP, pC, needsFormateur, formateurUrgent, datesOverlap, getAlerts, fmtD, relanceDiff, DEFAULT_LEADS, ADM_CSS } from "../lib/crm-admin-helpers.js";

export default function CRMAdmin(props) {
  var onNav = props && props.onNav ? props.onNav : function() {};
  var _ld = useState([]); var leads = _ld[0], setLeads = _ld[1];
  var _fmt = useState([]); var formateurs = _fmt[0], setFormateurs = _fmt[1];
  var _vw = useState("cards"); var view = _vw[0], setView = _vw[1];
  var _fl = useState("all"); var filter = _fl[0], setFilter = _fl[1];
  var _sr = useState(""); var search = _sr[0], setSearch = _sr[1];
  var _km = useState("org"); var kMode = _km[0], setKMode = _km[1];
  var _ed = useState(null); var editLead = _ed[0], setEditLead = _ed[1];
  var _sh = useState(false); var showModal = _sh[0], setShowModal = _sh[1];
  var _sf = useState(false); var showSettings = _sf[0], setShowSettings = _sf[1];
  var _ts = useState(null); var toast = _ts[0], setToast = _ts[1];
  var _fm = useState({ client: "", formation: "", dateDebut: "", dateFin: "", participants: "", statutOrg: "proposition", statutAkto: "relance", statutProspect: "prospect", emailAkto: "", mdpAkto: "", notes: "", relance: "", formateurNom: "", formateurTel: "" });
  var form = _fm[0], setForm = _fm[1];
  var _fn = useState(""); var fmtNom = _fn[0], setFmtNom = _fn[1];
  var _ft = useState(""); var fmtTel = _ft[0], setFmtTel = _ft[1];
  var _sync = useState("offline"); var syncSt = _sync[0], setSyncSt = _sync[1];

  var showToast = function(m) { setToast(m); setTimeout(function() { setToast(null); }, 2500); };

  useEffect(function() {
    if (!document.getElementById("adm-css")) { var s = document.createElement("style"); s.id = "adm-css"; s.textContent = ADM_CSS; document.head.appendChild(s); }
    var saved = localStorage.getItem("crm_admin_v3");
    if (saved) { try { var d = JSON.parse(saved); if (d.leads) setLeads(d.leads); if (d.formateurs) setFormateurs(d.formateurs); } catch (e) {} }
    loadFromSupabase();
  }, []);

  useEffect(function() {
    localStorage.setItem("crm_admin_v3", JSON.stringify({ leads: leads, formateurs: formateurs }));
  }, [leads, formateurs]);

  async function loadFromSupabase() {
    setSyncSt("syncing");
    var result = await loadAdmin();
    var d = result.data;
    if (d.leads && d.leads.length) setLeads(d.leads); else setLeads(DEFAULT_LEADS);
    if (d.formateurs && d.formateurs.length) setFormateurs(d.formateurs);
    setSyncSt(result.source === "supabase" ? "online" : "offline");
  }

  async function saveLead() {
    if (!form.client.trim()) { showToast("Nom client requis"); return; }
    var data = Object.assign({}, form);
    if (editLead) {
      data.id = editLead.id;
      setLeads(leads.map(function(l) { return l.id === editLead.id ? data : l; }));
    } else {
      var mx = leads.reduce(function(m, l) { var n = parseInt(l.id); return isNaN(n) ? m : Math.max(m, n); }, 0);
      data.id = String(mx + 1).padStart(3, "0");
      setLeads([data].concat(leads));
    }
    setShowModal(false); setEditLead(null);
    showToast("Dossier sauvegard\u00e9");
    saveAdminLead(data);
  }

  async function deleteLead() {
    if (!editLead || !confirm("Supprimer ce dossier ?")) return;
    setLeads(leads.filter(function(l) { return l.id !== editLead.id; }));
    setShowModal(false); setEditLead(null); showToast("Dossier supprim\u00e9");
    deleteAdminLead(editLead.id);
  }

  function openModal(lead) {
    if (lead) {
      setEditLead(lead);
      setForm({ client: lead.client, formation: lead.formation || "", dateDebut: lead.dateDebut || "", dateFin: lead.dateFin || "", participants: lead.participants || "", statutOrg: lead.statutOrg || "proposition", statutAkto: lead.statutAkto || "relance", statutProspect: lead.statutProspect || "prospect", emailAkto: lead.emailAkto || "", mdpAkto: lead.mdpAkto || "", notes: lead.notes || "", relance: lead.relance || "", formateurNom: lead.formateurNom || "", formateurTel: lead.formateurTel || "" });
    } else {
      setEditLead(null);
      setForm({ client: "", formation: "", dateDebut: "", dateFin: "", participants: "", statutOrg: "proposition", statutAkto: "relance", statutProspect: "prospect", emailAkto: "", mdpAkto: "", notes: "", relance: "", formateurNom: "", formateurTel: "" });
    }
    setShowModal(true);
  }

  async function addFormateur() {
    if (!fmtNom.trim()) return;
    var f = { id: "fmt_" + Date.now(), nom: fmtNom.trim(), tel: fmtTel.trim() };
    setFormateurs(formateurs.concat([f])); setFmtNom(""); setFmtTel("");
    showToast(f.nom + " ajout\u00e9");
    try { dbSaveFormateur(f); } catch (e) {}
  }

  async function removeFormateur(id) {
    setFormateurs(formateurs.filter(function(f) { return f.id !== id; }));
    try { dbDeleteFormateur(id); } catch (e) {}
  }

  var filtered = useMemo(function() {
    var f = leads.slice();
    if (search) { var q = search.toLowerCase(); f = f.filter(function(l) { return l.client.toLowerCase().indexOf(q) !== -1 || l.id.toLowerCase().indexOf(q) !== -1 || (l.formation || "").toLowerCase().indexOf(q) !== -1 || (l.formateurNom || "").toLowerCase().indexOf(q) !== -1; }); }
    if (filter === "en_cours") f = f.filter(function(l) { return l.statutProspect === "en_cours"; });
    else if (filter === "alert") f = f.filter(function(l) { return getAlerts(l).length > 0; });
    else if (filter === "prospect") f = f.filter(function(l) { return l.statutProspect === "prospect"; });
    else if (filter === "standby") f = f.filter(function(l) { return l.statutProspect === "standby"; });
    else if (filter === "no_formateur") f = f.filter(function(l) { return formateurUrgent(l) || (!l.formateurNom && l.statutOrg === "conv_signee"); });
    f.sort(function(a, b) { var ua = formateurUrgent(a) ? 0 : 1, ub = formateurUrgent(b) ? 0 : 1; if (ua !== ub) return ua - ub; return gP(b) - gP(a); });
    return f;
  }, [leads, search, filter]);

  var stats = useMemo(function() {
    var t = leads.length;
    var enc = leads.filter(function(l) { return l.statutProspect === "en_cours"; }).length;
    var sig = leads.filter(function(l) { return l.statutProspect === "signe"; }).length;
    var al = leads.filter(function(l) { return getAlerts(l).length > 0; }).length;
    var nf = leads.filter(function(l) { return formateurUrgent(l); }).length;
    var avg = t ? Math.round(leads.reduce(function(s, l) { return s + gP(l); }, 0) / t) : 0;
    return { total: t, enCours: enc, signes: sig, alertes: al, sansFormateur: nf, avg: avg };
  }, [leads]);

  function relanceTag(r) {
    var diff = relanceDiff(r);
    if (diff === null) return null;
    var col = diff < 0 ? "#EF4444" : diff === 0 ? "#F59E0B" : diff <= 3 ? "#F59E0B" : "#3B82F6";
    var bg = diff < 0 ? "rgba(239,68,68,.1)" : diff <= 3 ? "rgba(245,158,11,.1)" : "rgba(59,130,246,.1)";
    var label = diff < 0 ? "\u{1F514} " + fmtD(r) : diff === 0 ? "\u{1F514} Auj." : "\u{1F4C5} " + fmtD(r);
    return React.createElement("span", { style: { padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: bg, color: col } }, label);
  }

  function StatusTag(props) {
    var cfg = props.cfg;
    var colors = { "adm-tag-red": { bg: "#fdecea", c: "#c0392b" }, "adm-tag-orange": { bg: "#fef3e2", c: "#d35400" }, "adm-tag-yellow": { bg: "#fef9e7", c: "#b7950b" }, "adm-tag-green": { bg: "#e8f8f0", c: "#1e8449" }, "adm-tag-blue": { bg: "#e8f4fd", c: "#2471a3" }, "adm-tag-gray": { bg: "#f0f3f2", c: "#717d7a" }, "adm-tag-brand": { bg: "#e0f0ec", c: "#195144" } };
    var s = colors[cfg.tc] || colors["adm-tag-gray"];
    return React.createElement("span", { style: { display: "inline-flex", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: s.bg, color: s.c, whiteSpace: "nowrap" } }, cfg.label || cfg.l);
  }

  // ═══ RENDER ═══
  return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg)", color: "var(--t1)", padding: "24px 28px" } },
    // Header
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 } },
      React.createElement("div", null,
        React.createElement("h1", { style: { fontFamily: "var(--fd)", fontSize: 26, fontWeight: 800 } }, "\u{1F4C2} Suivi Administratif"),
        React.createElement("p", { style: { color: "var(--t2)", fontSize: 13, marginTop: 4 } }, filtered.length + " dossier(s) \u2022 " + (syncSt === "online" ? "\u{1F7E2} Connect\u00e9" : syncSt === "syncing" ? "\u{1F7E1} Sync..." : "\u{1F534} Local"))
      ),
      React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        React.createElement("input", { className: "crm-inp", placeholder: "\u{1F50D} Rechercher...", value: search, onChange: function(e) { setSearch(e.target.value); }, style: { width: 200 } }),
        React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setShowSettings(true); } }, "\u2699\uFE0F Param\u00e8tres"),
        React.createElement("button", { className: "crm-btn crm-btn-a crm-btn-sm", onClick: function() { openModal(null); } }, "+ Dossier")
      )
    ),
    // Stats
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 16 } },
      [{ l: "Dossiers", v: stats.total, c: "var(--a)" }, { l: "En cours", v: stats.enCours, c: "#F59E0B" }, { l: "Sign\u00e9s", v: stats.signes, c: "#10B981" }, { l: "Alertes", v: stats.alertes, c: "#EF4444" }, { l: "Sans formateur", v: stats.sansFormateur, c: stats.sansFormateur > 0 ? "#EF4444" : "var(--tm)" }, { l: "Progression", v: stats.avg + "%", c: "var(--a)" }].map(function(s, i) {
        return React.createElement("div", { key: i, className: "adm-stat" },
          React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--tm)", marginBottom: 4 } }, s.l),
          React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 24, fontWeight: 700, color: s.c } }, s.v)
        );
      })
    ),
    // Filters
    React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" } },
      [{ id: "all", l: "Tous" }, { id: "en_cours", l: "\u{1F525} En cours" }, { id: "alert", l: "\u26A0 Alertes" }, { id: "no_formateur", l: "\u{1F468}\u200D\u{1F3EB} Sans formateur" }, { id: "prospect", l: "\u{1F3AF} Prospects" }, { id: "standby", l: "\u23F8 Stand-by" }].map(function(f) {
        var active = filter === f.id;
        return React.createElement("button", { key: f.id, onClick: function() { setFilter(f.id); }, style: { padding: "6px 14px", borderRadius: 20, border: active ? "1px solid var(--a)" : "1px solid var(--bd)", background: active ? "var(--ag)" : "var(--c)", color: active ? "var(--a)" : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600 } }, f.l);
      })
    ),
    // View tabs
    React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 16 } },
      ["cards", "table", "kanban", "pipeline"].map(function(v) {
        var labels = { cards: "\u{1F0CF} Cartes", table: "\u{1F4CB} Tableau", kanban: "\u{1F4CA} Kanban", pipeline: "\u{1F4C8} Pipeline" };
        return React.createElement("button", { key: v, onClick: function() { setView(v); }, style: { padding: "8px 14px", borderRadius: 8, border: view === v ? "1px solid var(--a)" : "1px solid var(--bd)", background: view === v ? "var(--ag)" : "var(--c)", color: view === v ? "var(--a)" : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: view === v ? 600 : 500 } }, labels[v]);
      }),
      view === "kanban" && React.createElement("div", { style: { marginLeft: 12, display: "flex", gap: 4 } },
        React.createElement("button", { onClick: function() { setKMode("org"); }, style: { padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", background: kMode === "org" ? "var(--ag)" : "var(--sf)", color: kMode === "org" ? "var(--a)" : "var(--tm)", border: "1px solid var(--bd)" } }, "Organisation"),
        React.createElement("button", { onClick: function() { setKMode("akto"); }, style: { padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", background: kMode === "akto" ? "var(--ag)" : "var(--sf)", color: kMode === "akto" ? "var(--a)" : "var(--tm)", border: "1px solid var(--bd)" } }, "AKTO")
      )
    ),
    // Content
    view === "cards" ? renderCards() : view === "table" ? renderTable() : view === "kanban" ? renderKanban() : renderPipeline(),
    // Modal
    showModal && renderModal(),
    // Settings
    showSettings && renderSettings(),
    // Toast
    toast && React.createElement("div", { style: { position: "fixed", bottom: 24, right: 24, padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 300, background: "rgba(89,213,151,.15)", color: "#59D597", border: "1px solid rgba(89,213,151,.3)" } }, toast)
  );

  // ─── CARDS VIEW ───
  function renderCards() {
    if (!filtered.length) return React.createElement("div", { style: { textAlign: "center", padding: 48, color: "var(--tm)" } }, "Aucun dossier");
    return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(370px,1fr))", gap: 12 } },
      filtered.map(function(l) {
        var p = gP(l), o = oK(l.statutOrg), ak = aK(l.statutAkto), al = getAlerts(l), fu = formateurUrgent(l);
        var pt = PTAGS[l.statutProspect] || PTAGS.prospect;
        return React.createElement("div", { key: l.id, className: "adm-card", onClick: function() { openModal(l); }, style: { borderLeft: "4px solid " + pC(p), borderColor: fu ? "#e74c3c" : undefined, boxShadow: fu ? "0 0 0 2px rgba(231,76,60,.15)" : undefined } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 10, color: "var(--tm)" } }, "#" + l.id),
              React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--a)" } }, l.client),
              l.formation && React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginTop: 2 } }, l.formation)
            ),
            React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 20, fontWeight: 700, color: pC(p) } }, p + "%")
          ),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, React.createElement("span", { style: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--tm)", minWidth: 32 } }, "ORG"), React.createElement(StatusTag, { cfg: o })),
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, React.createElement("span", { style: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--tm)", minWidth: 32 } }, "AKTO"), React.createElement(StatusTag, { cfg: ak }))
          ),
          React.createElement("div", { className: "adm-bar" }, React.createElement("div", { className: "adm-bar-fill", style: { width: p + "%", background: pC(p) } })),
          l.formateurNom ? React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#e8f8f0", color: "#1e8449", border: "1px solid #a9dfbf", marginBottom: 8 } }, "\u{1F468}\u200D\u{1F3EB} " + l.formateurNom) : fu ? React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#fdecea", color: "#c0392b", border: "1px solid #f5c6cb", marginBottom: 8 } }, "\u26A0 FORMATEUR NON POSITIONN\u00c9") : null,
          React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 } },
            React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } },
              l.dateDebut && React.createElement("span", { style: { fontSize: 11, color: "var(--tm)" } }, "\u{1F4C5} " + fmtD(l.dateDebut) + (l.dateFin ? " \u2192 " + fmtD(l.dateFin) : "")),
              l.participants && React.createElement("span", { style: { fontSize: 11, color: "var(--tm)" } }, "\u{1F465} " + l.participants)
            ),
            React.createElement("div", { style: { display: "flex", gap: 4, alignItems: "center" } }, relanceTag(l.relance), React.createElement(StatusTag, { cfg: pt }))
          ),
          al.length > 0 && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 } },
            al.map(function(a, i) { return React.createElement("span", { key: i, style: { padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: a.t === "danger" ? "#fdecea" : "#fef9e7", color: a.t === "danger" ? "#c0392b" : "#b7950b" } }, a.m.length > 35 ? a.m.substring(0, 32) + "\u2026" : a.m); }),
            p === 100 && !fu && React.createElement("span", { style: { padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "#e0f0ec", color: "#195144" } }, "\u2705 Complet")
          )
        );
      })
    );
  }

  // ─── TABLE VIEW ───
  function renderTable() {
    return React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, overflow: "auto" } },
      React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", minWidth: 1100 } },
        React.createElement("thead", null, React.createElement("tr", { style: { background: "rgba(148,163,184,.03)" } },
          ["ID", "Client", "Formation", "Organisation", "AKTO", "Formateur", "%", "Relance"].map(function(h) { return React.createElement("th", { key: h, style: { padding: "12px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--tm)", textAlign: "left", borderBottom: "1px solid var(--bd)" } }, h); })
        )),
        React.createElement("tbody", null, filtered.map(function(l) {
          var p = gP(l), o = oK(l.statutOrg), ak = aK(l.statutAkto), fu = formateurUrgent(l);
          return React.createElement("tr", { key: l.id, onClick: function() { openModal(l); }, style: { cursor: "pointer", background: fu ? "rgba(231,76,60,.05)" : "transparent" } },
            React.createElement("td", { style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)", fontFamily: "var(--fm)", fontSize: 11, color: "var(--tm)" } }, "#" + l.id),
            React.createElement("td", { style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)", fontWeight: 600, color: "var(--a)" } }, l.client),
            React.createElement("td", { style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)", fontSize: 12, color: "var(--t2)" } }, l.formation || "\u2014"),
            React.createElement("td", { style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)" } }, React.createElement(StatusTag, { cfg: o })),
            React.createElement("td", { style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)" } }, React.createElement(StatusTag, { cfg: ak })),
            React.createElement("td", { style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)" } }, l.formateurNom ? React.createElement("span", { style: { padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#e8f8f0", color: "#1e8449" } }, "\u{1F468}\u200D\u{1F3EB} " + l.formateurNom) : fu ? React.createElement("span", { style: { padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#fdecea", color: "#c0392b" } }, "\u26A0 MANQUANT") : React.createElement("span", { style: { color: "var(--tm)" } }, "\u2014")),
            React.createElement("td", { style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)" } }, React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, React.createElement("div", { style: { width: 70, height: 4, background: "var(--bd)", borderRadius: 2, overflow: "hidden" } }, React.createElement("div", { style: { height: "100%", width: p + "%", background: pC(p), borderRadius: 2 } })), React.createElement("span", { style: { fontFamily: "var(--fm)", fontSize: 12, fontWeight: 600, color: pC(p) } }, p + "%"))),
            React.createElement("td", { style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)" } }, relanceTag(l.relance) || React.createElement("span", { style: { color: "var(--tm)" } }, "\u2014"))
          );
        }))
      )
    );
  }

  // ─── KANBAN VIEW ───
  function renderKanban() {
    var statuses = kMode === "org" ? ORG : AKT;
    var getKey = kMode === "org" ? function(l) { return l.statutOrg; } : function(l) { return l.statutAkto; };
    return React.createElement("div", { style: { display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 } },
      statuses.map(function(s) {
        var items = filtered.filter(function(l) { return getKey(l) === s.key; });
        return React.createElement("div", { key: s.key, className: "adm-k-col" },
          React.createElement("div", { className: "adm-k-head", style: { borderBottom: "2px solid " + pC(s.pct) } },
            React.createElement("span", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: pC(s.pct) } }, s.label),
            React.createElement("span", { style: { fontFamily: "var(--fm)", fontSize: 11, background: "var(--sf)", padding: "2px 8px", borderRadius: 10, color: "var(--tm)" } }, items.length)
          ),
          React.createElement("div", { className: "adm-k-body" },
            items.map(function(l) {
              return React.createElement("div", { key: l.id, className: "adm-k-card", onClick: function() { openModal(l); } },
                React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 10, color: "var(--tm)", marginBottom: 3 } }, "#" + l.id),
                React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--a)", marginBottom: 6 } }, l.client),
                React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } },
                  kMode === "org" ? React.createElement(StatusTag, { cfg: aK(l.statutAkto) }) : React.createElement(StatusTag, { cfg: oK(l.statutOrg) }),
                  l.formateurNom ? React.createElement("span", { style: { padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "#e8f8f0", color: "#1e8449" } }, "\u{1F468}\u200D\u{1F3EB} " + l.formateurNom) : formateurUrgent(l) ? React.createElement("span", { style: { padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#fdecea", color: "#c0392b" } }, "\u26A0 FORMATEUR !") : null
                )
              );
            }),
            !items.length && React.createElement("div", { style: { padding: 16, textAlign: "center", fontSize: 11, color: "var(--tm)" } }, "Vide")
          )
        );
      })
    );
  }

  // ─── PIPELINE VIEW ───
  function renderPipeline() {
    var groups = [
      { title: "Prospects & Stand-by", color: "#95a5a6", fn: function(l) { return l.statutProspect === "prospect" || l.statutProspect === "standby"; } },
      { title: "En cours \u2014 Convention", color: "#e67e22", fn: function(l) { return l.statutProspect === "en_cours" && l.statutOrg !== "conv_signee"; } },
      { title: "Sign\u00e9s \u2014 AKTO en cours", color: "#27ae60", fn: function(l) { return l.statutOrg === "conv_signee" && l.statutAkto !== "transmis"; } },
      { title: "Dossiers complets", color: "#195144", fn: function(l) { return l.statutOrg === "conv_signee" && l.statutAkto === "transmis"; } }
    ];
    return React.createElement("div", null, groups.map(function(g, gi) {
      var items = filtered.filter(g.fn);
      if (!items.length) return null;
      return React.createElement("div", { key: gi, style: { marginBottom: 28 } },
        React.createElement("div", { style: { fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: g.color, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 } }, React.createElement("span", { style: { width: 8, height: 8, borderRadius: "50%", background: g.color } }), g.title + " (" + items.length + ")"),
        React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 } }, items.map(function(l) {
          return React.createElement("div", { key: l.id, onClick: function() { openModal(l); }, style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 8, cursor: "pointer", transition: ".15s" } },
            React.createElement("div", null, React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--t1)" } }, l.client), React.createElement("div", { style: { fontSize: 10, color: "var(--tm)" } }, aK(l.statutAkto).label + (l.formateurNom ? " \u00b7 \u{1F468}\u200D\u{1F3EB} " + l.formateurNom : ""))),
            React.createElement("span", { style: { fontFamily: "var(--fm)", fontSize: 11, fontWeight: 600, color: pC(gP(l)) } }, gP(l) + "%")
          );
        }))
      );
    }));
  }

  // ─── MODAL ───
  function renderModal() {
    var p = Math.round((oK(form.statutOrg).pct + aK(form.statutAkto).pct) / 2);
    var al = getAlerts(form);
    return React.createElement("div", { onClick: function() { setShowModal(false); setEditLead(null); }, className: "adm-modal" },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, className: "adm-modal-inner" },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 20 } },
          React.createElement("div", null, editLead && React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 10, color: "var(--tm)" } }, "#" + editLead.id), React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, color: "var(--a)" } }, editLead ? form.client || "Dossier" : "Nouveau dossier")),
          React.createElement("button", { onClick: function() { setShowModal(false); setEditLead(null); }, style: { background: "none", border: "none", cursor: "pointer", color: "var(--tm)", fontSize: 20 } }, "\u2715")
        ),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Client *"), React.createElement("input", { className: "crm-inp", value: form.client, onChange: function(e) { setForm(Object.assign({}, form, { client: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Formation"), React.createElement("input", { className: "crm-inp", value: form.formation, onChange: function(e) { setForm(Object.assign({}, form, { formation: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Date d\u00e9but"), React.createElement("input", { className: "crm-inp", type: "date", value: form.dateDebut, onChange: function(e) { setForm(Object.assign({}, form, { dateDebut: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Date fin"), React.createElement("input", { className: "crm-inp", type: "date", value: form.dateFin, onChange: function(e) { setForm(Object.assign({}, form, { dateFin: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Participants"), React.createElement("input", { className: "crm-inp", value: form.participants, onChange: function(e) { setForm(Object.assign({}, form, { participants: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Statut prospect"), React.createElement("select", { className: "crm-inp", value: form.statutProspect, onChange: function(e) { setForm(Object.assign({}, form, { statutProspect: e.target.value })); } }, Object.entries(PTAGS).map(function(entry) { return React.createElement("option", { key: entry[0], value: entry[0] }, entry[1].l); }))),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Organisation"), React.createElement("select", { className: "crm-inp", value: form.statutOrg, onChange: function(e) { setForm(Object.assign({}, form, { statutOrg: e.target.value })); } }, ORG.map(function(s) { return React.createElement("option", { key: s.key, value: s.key }, s.label); }))),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "AKTO"), React.createElement("select", { className: "crm-inp", value: form.statutAkto, onChange: function(e) { setForm(Object.assign({}, form, { statutAkto: e.target.value })); } }, AKT.map(function(s) { return React.createElement("option", { key: s.key, value: s.key }, s.label); })))
        ),
        React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--tm)", margin: "20px 0 12px", paddingBottom: 6, borderBottom: "1px solid var(--bd)" } }, "\u{1F468}\u200D\u{1F3EB} Formateur"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Formateur assign\u00e9"), React.createElement("select", { className: "crm-inp", value: form.formateurNom, onChange: function(e) { var sel = e.target; var opt = sel.options[sel.selectedIndex]; setForm(Object.assign({}, form, { formateurNom: sel.value, formateurTel: opt && opt.dataset && opt.dataset.tel ? opt.dataset.tel : "" })); } }, React.createElement("option", { value: "" }, "\u2014 Aucun \u2014"), formateurs.map(function(f) { return React.createElement("option", { key: f.id, value: f.nom, "data-tel": f.tel || "" }, f.nom); }))),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "T\u00e9l. formateur"), React.createElement("input", { className: "crm-inp", value: form.formateurTel, readOnly: true, style: { background: "var(--sf)", color: "var(--tm)" } }))
        ),
        React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--tm)", margin: "20px 0 12px", paddingBottom: 6, borderBottom: "1px solid var(--bd)" } }, "\u{1F512} AKTO"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Email AKTO"), React.createElement("input", { className: "crm-inp", value: form.emailAkto, onChange: function(e) { setForm(Object.assign({}, form, { emailAkto: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "MDP AKTO"), React.createElement("input", { className: "crm-inp", value: form.mdpAkto, onChange: function(e) { setForm(Object.assign({}, form, { mdpAkto: e.target.value })); } }))
        ),
        // Progress bar
        React.createElement("div", { style: { margin: "16px 0", padding: 14, background: "var(--sf)", borderRadius: 8, border: "1px solid var(--bd)" } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 } }, React.createElement("span", { style: { color: "var(--t2)" } }, "Progression globale"), React.createElement("span", { style: { fontFamily: "var(--fm)", fontWeight: 700, color: pC(p) } }, p + "%")),
          React.createElement("div", { style: { height: 8, background: "var(--bd)", borderRadius: 4, overflow: "hidden" } }, React.createElement("div", { style: { height: "100%", width: p + "%", background: "linear-gradient(90deg,var(--p),var(--a))", borderRadius: 4 } }))
        ),
        // Alerts
        al.length > 0 && React.createElement("div", { style: { marginBottom: 12 } }, al.map(function(a, i) { return React.createElement("div", { key: i, className: a.t === "danger" ? "adm-alert-danger" : "adm-alert-warn" }, "\u26A0\uFE0F " + a.m); })),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Notes"), React.createElement("textarea", { className: "crm-inp", value: form.notes, onChange: function(e) { setForm(Object.assign({}, form, { notes: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Date de relance"), React.createElement("input", { className: "crm-inp", type: "date", value: form.relance, onChange: function(e) { setForm(Object.assign({}, form, { relance: e.target.value })); } }))
        ),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--bd)" } },
          editLead && React.createElement("button", { className: "crm-btn crm-btn-d crm-btn-sm", onClick: deleteLead, style: { marginRight: "auto" } }, "Supprimer"),
          React.createElement("button", { className: "crm-btn crm-btn-s", onClick: function() { setShowModal(false); setEditLead(null); } }, "Annuler"),
          React.createElement("button", { className: "crm-btn crm-btn-a", onClick: saveLead }, "Enregistrer")
        )
      )
    );
  }

  // ─── SETTINGS PANEL ───
  function renderSettings() {
    return React.createElement("div", { onClick: function() { setShowSettings(false); }, className: "adm-modal" },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, className: "adm-modal-inner", style: { maxWidth: 520 } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 20 } },
          React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700 } }, "\u2699\uFE0F Param\u00e8tres"),
          React.createElement("button", { onClick: function() { setShowSettings(false); }, style: { background: "none", border: "none", cursor: "pointer", color: "var(--tm)", fontSize: 20 } }, "\u2715")
        ),
        React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--tm)", marginBottom: 12, paddingBottom: 6, borderBottom: "1px solid var(--bd)" } }, "\u{1F468}\u200D\u{1F3EB} Gestion des formateurs"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 12 } },
          React.createElement("input", { className: "crm-inp", placeholder: "Nom Pr\u00e9nom", value: fmtNom, onChange: function(e) { setFmtNom(e.target.value); } }),
          React.createElement("input", { className: "crm-inp", placeholder: "06 12 34 56 78", value: fmtTel, onChange: function(e) { setFmtTel(e.target.value); } }),
          React.createElement("button", { className: "crm-btn crm-btn-a crm-btn-sm", onClick: addFormateur }, "+")
        ),
        formateurs.length ? formateurs.map(function(f) {
          return React.createElement("div", { key: f.id, className: "adm-fmt-item" },
            React.createElement("div", { style: { flex: 1 } }, React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, f.nom), React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", fontFamily: "var(--fm)" } }, f.tel || "\u2014")),
            React.createElement("button", { onClick: function() { removeFormateur(f.id); }, style: { width: 28, height: 28, borderRadius: "50%", background: "rgba(220,38,38,.1)", border: "1px solid rgba(220,38,38,.2)", color: "#F87171", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" } }, "\u2715")
          );
        }) : React.createElement("div", { style: { padding: 12, textAlign: "center", color: "var(--tm)", fontSize: 12 } }, "Aucun formateur"),
        React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--tm)", margin: "20px 0 12px", paddingBottom: 6, borderBottom: "1px solid var(--bd)" } }, "\u{1F4E6} Actions"),
        React.createElement("button", { className: "crm-btn crm-btn-s", onClick: loadFromSupabase, style: { width: "100%", justifyContent: "center", marginBottom: 8 } }, "\u{1F504} Synchroniser Supabase"),
        React.createElement("button", { className: "crm-btn crm-btn-s", onClick: function() { setShowSettings(false); }, style: { width: "100%", justifyContent: "center" } }, "Fermer")
      )
    );
  }
}

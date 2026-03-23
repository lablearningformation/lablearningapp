import React from 'react';
import { useState, useEffect, useMemo } from "react";
import { MODULE_ICONS, ACTION_COLORS } from "../lib/activity-log.js";
import { loadActivityLog } from "../lib/data-service.js";

export default function ManagerDashboard(props) {
  var onNav = props && props.onNav ? props.onNav : function() {};
  var _ld = useState([]); var leads = _ld[0], setLeads = _ld[1];
  var _tk = useState([]); var tasks = _tk[0], setTasks = _tk[1];
  var _cm = useState([]); var comments = _cm[0], setComments = _cm[1];
  var _adm = useState([]); var admLeads = _adm[0], setAdmLeads = _adm[1];
  var _al = useState([]); var actLogs = _al[0], setActLogs = _al[1];
  var _tab = useState("overview"); var tab = _tab[0], setTab = _tab[1];
  var _days = useState(30); var days = _days[0], setDays = _days[1];

  useEffect(function() {
    try { var d = JSON.parse(localStorage.getItem("crm_pro_v2") || "{}"); setLeads((d.leads || []).filter(function(l) { return !l.trashed; })); setTasks(d.tasks || []); setComments(d.comments || []); } catch (e) {}
    try { var a = JSON.parse(localStorage.getItem("crm_admin_v3") || "{}"); setAdmLeads(a.leads || []); } catch (e) {}
    loadActivityLog(500).then(function(logs) { setActLogs(logs || []); });
  }, []);

  var today = new Date().toISOString().split("T")[0];
  function isRecent(dateStr, d) { if (!dateStr) return false; return (Date.now() - new Date(dateStr).getTime()) / 864e5 <= d; }

  var actStats = useMemo(function() {
    var cutoff = Date.now() - days * 864e5;
    var logs = actLogs.filter(function(l) { return new Date(l.timestamp).getTime() >= cutoff; });
    var byModule = {}; var byType = {}; var byDay = {};
    logs.forEach(function(l) {
      byModule[l.module] = (byModule[l.module] || 0) + 1;
      byType[l.type] = (byType[l.type] || 0) + 1;
      var day = l.timestamp.split("T")[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return { total: logs.length, byModule: byModule, byType: byType, byDay: byDay };
  }, [actLogs, days]);

  // ─── KPIs ───
  var kpis = useMemo(function() {
    var tl = leads.length;
    var nw = leads.filter(function(l) { return isRecent(l.created_at, 7); }).length;
    var nm = leads.filter(function(l) { return isRecent(l.created_at, 30); }).length;
    var g = leads.filter(function(l) { return l.statut === "gagne"; }).length;
    var p = leads.filter(function(l) { return l.statut === "perdu"; }).length;
    var neg = leads.filter(function(l) { return l.statut === "negociation"; }).length;
    var prop = leads.filter(function(l) { return l.statut === "proposition"; }).length;
    var at = tasks.filter(function(t) { return !t.done; }).length;
    var od = tasks.filter(function(t) { return !t.done && t.date && t.date < today; }).length;
    var ct = tasks.filter(function(t) { return t.done; }).length;
    var tt = tasks.filter(function(t) { return !t.done && t.date === today; }).length;
    var conv = tl > 0 ? Math.round((g / tl) * 100) : 0;
    var admT = admLeads.length; var admS = admLeads.filter(function(l) { return l.statutProspect === "signe"; }).length;
    var admC = admLeads.filter(function(l) { return l.statutOrg === "conv_signee" && l.statutAkto === "transmis"; }).length;
    var admNoF = admLeads.filter(function(l) { return l.statutOrg === "conv_signee" && !l.formateurNom; }).length;
    var calls = tasks.filter(function(t) { return t.type === "appel"; }).length;
    var emails = (actStats.byModule || {}).email || 0;
    var rdvs = tasks.filter(function(t) { return t.type === "rdv"; }).length;
    var devis = tasks.filter(function(t) { return t.type === "devis"; }).length;
    var simus = (actStats.byModule || {}).simulateur || 0;
    var audits = (actStats.byModule || {}).audit || 0;
    return { totalLeads: tl, newWeek: nw, newMonth: nm, gagnes: g, perdus: p, negociation: neg, proposition: prop, activeTasks: at, overdue: od, completed: ct, todayTasks: tt, conversion: conv, admTotal: admT, admSignes: admS, admComplets: admC, admNoFormateur: admNoF, calls: calls, emails: emails, rdvs: rdvs, devis: devis, simus: simus, audits: audits, totalActions: actStats.total || 0 };
  }, [leads, tasks, admLeads, actStats]);

  var statusDist = useMemo(function() { var m = {}; leads.forEach(function(l) { m[l.statut] = (m[l.statut] || 0) + 1; }); return m; }, [leads]);
  var statColors = { nouveau: "#6366F1", contacte: "#0891B2", qualifie: "#D97706", proposition: "#7C3AED", negociation: "#EA580C", gagne: "#059669", perdu: "#DC2626", refus_qualif: "#9CA3AF" };
  var statLabels = { nouveau: "Nouveau", contacte: "Contact\u00e9", qualifie: "Qualifi\u00e9", proposition: "Proposition", negociation: "N\u00e9gociation", gagne: "Gagn\u00e9", perdu: "Perdu", refus_qualif: "Refus Qualif" };
  var typeIcons = { appel: "\u{1F4DE}", email: "\u2709\uFE0F", rdv: "\u{1F4C5}", relance: "\u{1F514}", devis: "\u{1F4C4}", admin: "\u{1F4CB}" };

  // ─── FUNNEL DATA ───
  var funnel = useMemo(function() {
    var stages = ["nouveau", "contacte", "qualifie", "proposition", "negociation", "gagne"];
    var maxV = Math.max.apply(null, stages.map(function(s) { return statusDist[s] || 0; }).concat([1]));
    return stages.map(function(s) { return { key: s, label: statLabels[s], count: statusDist[s] || 0, color: statColors[s], pct: Math.max(8, Math.round(((statusDist[s] || 0) / maxV) * 100)) }; });
  }, [statusDist]);

  // ─── ACTIVITY TIMELINE ───
  var timeline = useMemo(function() { return actLogs.slice(0, 30); }, [actLogs]);

  // ─── OVERDUE TASKS ───
  var overdue = useMemo(function() {
    return tasks.filter(function(t) { return !t.done && t.date && t.date < today; }).sort(function(a, b) { return (a.date || "").localeCompare(b.date || ""); }).map(function(t) { var l = leads.find(function(x) { return x.id === t.lead_id; }); return Object.assign({}, t, { leadName: l ? l.nom + (l.prenom ? " " + l.prenom : "") : "?" }); });
  }, [tasks, leads]);

  // ─── DAILY ACTIVITY (last 7 days) ───
  var dailyChart = useMemo(function() {
    var data = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var key = d.toISOString().split("T")[0];
      var label = d.toLocaleDateString("fr-FR", { weekday: "short" });
      data.push({ label: label, value: (actStats.byDay || {})[key] || 0, color: "var(--a)" });
    }
    return data;
  }, [actStats]);

  // ─── COMPONENTS ───
  function KPI(p) {
    return React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 12, padding: "16px 18px", borderLeft: "4px solid " + (p.color || "var(--a)"), cursor: p.onClick ? "pointer" : "default" }, onClick: p.onClick },
      React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "var(--tm)", marginBottom: 4 } }, p.label),
      React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 26, fontWeight: 800, color: p.color || "var(--a)" } }, p.value),
      p.sub && React.createElement("div", { style: { fontSize: 11, color: "var(--t2)", marginTop: 3 } }, p.sub)
    );
  }

  function BarChart(p) {
    var max = Math.max.apply(null, p.data.map(function(d) { return d.value; }).concat([1]));
    return React.createElement("div", { style: { display: "flex", alignItems: "flex-end", gap: 6, height: p.height || 100, padding: "0 2px" } },
      p.data.map(function(d, i) {
        var h = Math.max(4, (d.value / max) * 100);
        return React.createElement("div", { key: i, style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 } },
          React.createElement("span", { style: { fontFamily: "var(--fm)", fontSize: 9, fontWeight: 700, color: d.color || "var(--a)" } }, d.value),
          React.createElement("div", { style: { width: "100%", height: h + "%", minHeight: 4, background: d.color || "var(--a)", borderRadius: "3px 3px 0 0", opacity: .85 } }),
          React.createElement("span", { style: { fontSize: 8, color: "var(--tm)", textAlign: "center", lineHeight: 1.2 } }, d.label)
        );
      })
    );
  }

  function Section(p) {
    return React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 20, marginBottom: p.mb || 0 } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 } },
        React.createElement("div", { style: { fontSize: 14, fontWeight: 700, fontFamily: "var(--fd)" } }, p.title),
        p.action
      ),
      p.children
    );
  }

  // ═══ RENDER ═══
  return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg)", color: "var(--t1)", padding: "24px 28px" } },
    // Header
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 } },
      React.createElement("div", null,
        React.createElement("h1", { style: { fontFamily: "var(--fd)", fontSize: 26, fontWeight: 800 } }, "\u{1F4CA} Tableau de bord Manager"),
        React.createElement("p", { style: { color: "var(--t2)", fontSize: 13, marginTop: 4 } }, kpis.totalActions + " actions enregistr\u00e9es \u2022 " + kpis.totalLeads + " leads")
      ),
      React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
        ["overview", "performance", "pipeline", "activity", "admin"].map(function(t) {
          var labels = { overview: "\u{1F4CA} Vue g\u00e9n\u00e9rale", performance: "\u{1F3AF} Performance", pipeline: "\u{1F4C8} Pipeline", activity: "\u{1F550} Activit\u00e9", admin: "\u{1F4C2} Dossiers" };
          return React.createElement("button", { key: t, onClick: function() { setTab(t); }, style: { padding: "8px 14px", borderRadius: 8, border: tab === t ? "1px solid var(--a)" : "1px solid var(--bd)", background: tab === t ? "var(--ag)" : "var(--c)", color: tab === t ? "var(--a)" : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600 } }, labels[t]);
        })
      )
    ),

    // ─── OVERVIEW ───
    tab === "overview" && React.createElement("div", null,
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 10, marginBottom: 20 } },
        React.createElement(KPI, { label: "Total leads", value: kpis.totalLeads, color: "var(--a)" }),
        React.createElement(KPI, { label: "Nouveaux (7j)", value: kpis.newWeek, color: "#3B82F6", sub: kpis.newMonth + " ce mois" }),
        React.createElement(KPI, { label: "Gagn\u00e9s", value: kpis.gagnes, color: "#10B981", sub: "Taux : " + kpis.conversion + "%" }),
        React.createElement(KPI, { label: "En n\u00e9gociation", value: kpis.negociation, color: "#EA580C" }),
        React.createElement(KPI, { label: "T\u00e2ches en retard", value: kpis.overdue, color: kpis.overdue > 0 ? "#EF4444" : "var(--tm)", onClick: function() { onNav("prospects"); } }),
        React.createElement(KPI, { label: "Actions (30j)", value: kpis.totalActions, color: "#8B5CF6" })
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 } },
        React.createElement(Section, { title: "\u{1F4C8} Funnel commercial" },
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
            funnel.map(function(f) {
              return React.createElement("div", { key: f.key, style: { display: "flex", alignItems: "center", gap: 10 } },
                React.createElement("span", { style: { fontSize: 11, fontWeight: 600, color: "var(--tm)", minWidth: 80, textAlign: "right" } }, f.label),
                React.createElement("div", { style: { flex: 1, height: 24, background: "var(--sf)", borderRadius: 6, overflow: "hidden", position: "relative" } },
                  React.createElement("div", { style: { height: "100%", width: f.pct + "%", background: f.color, borderRadius: 6, transition: "width .6s ease" } }),
                  React.createElement("span", { style: { position: "absolute", right: 8, top: 4, fontFamily: "var(--fm)", fontSize: 11, fontWeight: 700, color: f.count > 0 ? "#fff" : "var(--tm)" } }, f.count)
                )
              );
            })
          )
        ),
        React.createElement(Section, { title: "\u{1F4C5} Activit\u00e9 (7 derniers jours)" },
          React.createElement(BarChart, { data: dailyChart, height: 110 })
        )
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 } },
        React.createElement(Section, { title: "\u{1F4DE} Actions commerciales" },
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
            [{ l: "Appels", v: kpis.calls, c: "#3B82F6", i: "\u{1F4DE}" }, { l: "Emails", v: kpis.emails, c: "#8B5CF6", i: "\u2709\uFE0F" }, { l: "RDV", v: kpis.rdvs, c: "#10B981", i: "\u{1F4C5}" }, { l: "Devis", v: kpis.devis, c: "#EC4899", i: "\u{1F4C4}" }].map(function(s, i) {
              return React.createElement("div", { key: i, style: { background: "var(--sf)", borderRadius: 8, padding: "10px 12px", textAlign: "center" } },
                React.createElement("span", { style: { fontSize: 16 } }, s.i),
                React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 18, fontWeight: 700, color: s.c } }, s.v),
                React.createElement("div", { style: { fontSize: 9, color: "var(--tm)" } }, s.l)
              );
            })
          )
        ),
        React.createElement(Section, { title: "\u{1F6E0} Outils utilis\u00e9s" },
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
            [{ l: "Simulations", v: kpis.simus, c: "#14B8A6", i: "\u{1F4B0}" }, { l: "Audits", v: kpis.audits, c: "#EC4899", i: "\u{1F4CB}" }, { l: "T\u00e2ches OK", v: kpis.completed, c: "#10B981", i: "\u2705" }, { l: "Aujourd'hui", v: kpis.todayTasks, c: "#3B82F6", i: "\u{1F4C5}" }].map(function(s, i) {
              return React.createElement("div", { key: i, style: { background: "var(--sf)", borderRadius: 8, padding: "10px 12px", textAlign: "center" } },
                React.createElement("span", { style: { fontSize: 16 } }, s.i),
                React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 18, fontWeight: 700, color: s.c } }, s.v),
                React.createElement("div", { style: { fontSize: 9, color: "var(--tm)" } }, s.l)
              );
            })
          )
        ),
        React.createElement(Section, { title: "\u{1F4C2} Dossiers admin" },
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 } },
            [{ l: "Total", v: kpis.admTotal, c: "#195144" }, { l: "Sign\u00e9s", v: kpis.admSignes, c: "#10B981" }, { l: "Complets", v: kpis.admComplets, c: "#195144" }, { l: "Sans format.", v: kpis.admNoFormateur, c: kpis.admNoFormateur > 0 ? "#EF4444" : "var(--tm)" }].map(function(s, i) {
              return React.createElement("div", { key: i, style: { background: "var(--sf)", borderRadius: 8, padding: "10px 12px", textAlign: "center" } },
                React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 18, fontWeight: 700, color: s.c } }, s.v),
                React.createElement("div", { style: { fontSize: 9, color: "var(--tm)" } }, s.l)
              );
            })
          )
        )
      )
    ),

    // ─── PERFORMANCE ───
    tab === "performance" && React.createElement("div", null,
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 20 } },
        React.createElement(KPI, { label: "Taux conversion", value: kpis.conversion + "%", color: kpis.conversion >= 20 ? "#10B981" : kpis.conversion >= 10 ? "#F59E0B" : "#EF4444", sub: kpis.gagnes + " gagn\u00e9s / " + kpis.totalLeads + " leads" }),
        React.createElement(KPI, { label: "Ratio gagn\u00e9s/perdus", value: kpis.perdus > 0 ? (kpis.gagnes / kpis.perdus).toFixed(1) + ":1" : kpis.gagnes + ":0", color: "#10B981" }),
        React.createElement(KPI, { label: "T\u00e2ches compl\u00e9t\u00e9es", value: kpis.completed, color: "#8B5CF6", sub: (kpis.completed + kpis.activeTasks) > 0 ? Math.round(kpis.completed / (kpis.completed + kpis.activeTasks) * 100) + "% de compl\u00e9tion" : "" }),
        React.createElement(KPI, { label: "T\u00e2ches en retard", value: kpis.overdue, color: kpis.overdue > 0 ? "#EF4444" : "#10B981", sub: kpis.overdue > 0 ? "Action requise !" : "Tout \u00e0 jour" })
      ),
      React.createElement(Section, { title: "\u{1F534} T\u00e2ches en retard (" + overdue.length + ")", mb: 16 },
        overdue.length ? overdue.slice(0, 15).map(function(t) {
          return React.createElement("div", { key: t.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--bd)", fontSize: 13 } },
            React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
              React.createElement("span", { style: { fontSize: 14 } }, typeIcons[t.type] || "\u{1F4CB}"),
              React.createElement("div", null,
                React.createElement("span", { style: { fontWeight: 600 } }, t.title),
                React.createElement("span", { style: { color: "var(--tm)", marginLeft: 8, fontSize: 12 } }, t.leadName)
              )
            ),
            React.createElement("span", { style: { fontFamily: "var(--fm)", fontSize: 11, color: "#EF4444" } }, t.date)
          );
        }) : React.createElement("div", { style: { textAlign: "center", padding: 24, color: "var(--tm)" } }, "\u2705 Aucune t\u00e2che en retard")
      ),
      React.createElement(Section, { title: "\u{1F4CA} Pipeline par statut" },
        React.createElement(BarChart, { data: Object.entries(statLabels).map(function(e) { return { label: e[1], value: statusDist[e[0]] || 0, color: statColors[e[0]] }; }), height: 130 })
      )
    ),

    // ─── PIPELINE ───
    tab === "pipeline" && React.createElement("div", null,
      React.createElement("div", { style: { fontSize: 16, fontWeight: 700, fontFamily: "var(--fd)", marginBottom: 16 } }, "\u{1F4C8} Pipeline commercial d\u00e9taill\u00e9"),
      Object.entries(statLabels).map(function(entry) {
        var key = entry[0], label = entry[1], color = statColors[key];
        var items = leads.filter(function(l) { return l.statut === key; });
        if (!items.length) return null;
        return React.createElement("div", { key: key, style: { marginBottom: 20 } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 } },
            React.createElement("span", { style: { width: 10, height: 10, borderRadius: "50%", background: color } }),
            React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: color } }, label + " (" + items.length + ")")
          ),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 8 } },
            items.map(function(l) {
              var nt = tasks.filter(function(t) { return t.lead_id === l.id && !t.done; }).sort(function(a, b) { return (a.date || "").localeCompare(b.date || ""); })[0];
              return React.createElement("div", { key: l.id, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 10, padding: "12px 16px", borderLeft: "3px solid " + color } },
                React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: "var(--a)" } }, l.nom + (l.prenom ? " " + l.prenom : "")),
                l.etablissement && React.createElement("div", { style: { fontSize: 11, color: "var(--tm)" } }, l.etablissement),
                nt && React.createElement("div", { style: { fontSize: 11, color: nt.date < today ? "#EF4444" : "#3B82F6", marginTop: 4 } }, (typeIcons[nt.type] || "") + " " + nt.title + " \u2022 " + (nt.date || "")),
                l.groupe && React.createElement("div", { style: { fontSize: 10, color: "var(--tm)", marginTop: 2 } }, l.groupe)
              );
            })
          )
        );
      })
    ),

    // ─── ACTIVITY ───
    tab === "activity" && React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } },
        React.createElement("div", { style: { fontSize: 16, fontWeight: 700, fontFamily: "var(--fd)" } }, "\u{1F550} Journal d'activit\u00e9"),
        React.createElement("div", { style: { display: "flex", gap: 4 } },
          [7, 14, 30].map(function(d) {
            return React.createElement("button", { key: d, onClick: function() { setDays(d); }, style: { padding: "4px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: days === d ? "1px solid var(--a)" : "1px solid var(--bd)", background: days === d ? "var(--ag)" : "var(--c)", color: days === d ? "var(--a)" : "var(--tm)" } }, d + "j");
          })
        )
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 } },
        [{ l: "Emails", v: (actStats.byModule || {}).email || 0, c: "#8B5CF6" }, { l: "CRM", v: (actStats.byModule || {}).crm || 0, c: "var(--a)" }, { l: "Simulations", v: (actStats.byModule || {}).simulateur || 0, c: "#14B8A6" }, { l: "Audits", v: (actStats.byModule || {}).audit || 0, c: "#EC4899" }].map(function(s, i) {
          return React.createElement(KPI, { key: i, label: s.l + " (" + days + "j)", value: s.v, color: s.c });
        })
      ),
      React.createElement(Section, { title: "\u{1F4DD} Derni\u00e8res actions" },
        timeline.length ? timeline.map(function(a, i) {
          var icon = MODULE_ICONS[a.module] || "\u{1F4CB}";
          var col = ACTION_COLORS[a.type] || "var(--tm)";
          return React.createElement("div", { key: a.id || i, style: { display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--bd)" } },
            React.createElement("div", { style: { width: 32, height: 32, borderRadius: 8, background: col + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 } }, icon),
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, a.action.replace(/_/g, " ")),
              React.createElement("div", { style: { fontSize: 11, color: "var(--tm)" } }, [a.leadName, a.details, a.commercial].filter(Boolean).join(" \u2022 ")),
              React.createElement("div", { style: { fontSize: 10, color: "var(--tm)", marginTop: 2 } }, new Date(a.timestamp).toLocaleString("fr-FR"))
            )
          );
        }) : React.createElement("div", { style: { textAlign: "center", padding: 32, color: "var(--tm)" } }, "Aucune activit\u00e9 enregistr\u00e9e. Les actions dans les diff\u00e9rents modules seront logu\u00e9es ici automatiquement.")
      )
    ),

    // ─── ADMIN DOSSIERS ───
    tab === "admin" && React.createElement("div", null,
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 } },
        React.createElement(KPI, { label: "Dossiers", value: kpis.admTotal, color: "#195144" }),
        React.createElement(KPI, { label: "Sign\u00e9s", value: kpis.admSignes, color: "#10B981" }),
        React.createElement(KPI, { label: "Complets", value: kpis.admComplets, color: "#195144", sub: kpis.admTotal > 0 ? Math.round(kpis.admComplets / kpis.admTotal * 100) + "% compl\u00e9tion" : "" }),
        React.createElement(KPI, { label: "Sans formateur", value: kpis.admNoFormateur, color: kpis.admNoFormateur > 0 ? "#EF4444" : "var(--tm)", onClick: function() { onNav("suivi"); } })
      ),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 10 } },
        admLeads.map(function(l) {
          var pOrg = 0, pAkt = 0;
          var orgMap = { standby: 0, proposition: 10, att_client: 15, att_liste: 25, conv_faire: 40, conv_modifier: 50, conv_envoyee: 70, conv_signee: 100 };
          var aktMap = { relance: 0, creer: 15, courrier: 30, remplir: 50, verifier: 65, client: 80, transmis: 100 };
          pOrg = orgMap[l.statutOrg] || 0; pAkt = aktMap[l.statutAkto] || 0;
          var pct = Math.round((pOrg + pAkt) / 2);
          var col = pct >= 80 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";
          return React.createElement("div", { key: l.id, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 10, padding: "14px 16px", borderLeft: "3px solid " + col } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 6 } },
              React.createElement("span", { style: { fontSize: 14, fontWeight: 600, color: "var(--a)" } }, l.client),
              React.createElement("span", { style: { fontFamily: "var(--fm)", fontSize: 13, fontWeight: 700, color: col } }, pct + "%")
            ),
            React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginBottom: 6 } }, [l.formation, l.formateurNom ? "\u{1F468}\u200D\u{1F3EB} " + l.formateurNom : ""].filter(Boolean).join(" \u2022 ")),
            React.createElement("div", { style: { height: 4, background: "var(--bd)", borderRadius: 2, overflow: "hidden" } },
              React.createElement("div", { style: { height: "100%", width: pct + "%", background: col, borderRadius: 2, transition: "width .4s" } })
            ),
            (!l.formateurNom && l.statutOrg === "conv_signee") && React.createElement("div", { style: { marginTop: 6, fontSize: 10, fontWeight: 700, color: "#EF4444" } }, "\u26A0 Formateur \u00e0 positionner")
          );
        })
      )
    )
  );
}

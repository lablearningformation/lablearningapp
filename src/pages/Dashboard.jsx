import React from 'react';
import { useState, useEffect, useMemo } from "react";

export default function Dashboard(props) {
  var user = props.user, supabase = props.supabase, onNav = props.onNav;
  var _ld = useState([]); var leads = _ld[0], setLeads = _ld[1];
  var _tk = useState([]); var tasks = _tk[0], setTasks = _tk[1];
  var _adm = useState([]); var admLeads = _adm[0], setAdmLeads = _adm[1];

  useEffect(function() {
    try { var d = JSON.parse(localStorage.getItem("crm_pro_v2") || "{}"); setLeads((d.leads || []).filter(function(l) { return !l.trashed; })); setTasks(d.tasks || []); } catch (e) {}
    try { var a = JSON.parse(localStorage.getItem("crm_admin_v3") || "{}"); setAdmLeads(a.leads || []); } catch (e) {}
  }, []);

  var today = new Date().toISOString().split("T")[0];
  var stats = useMemo(function() {
    var totalLeads = leads.length;
    var nouveau = leads.filter(function(l) { return l.statut === "nouveau"; }).length;
    var enCours = leads.filter(function(l) { return ["contacte", "qualifie", "proposition", "negociation"].indexOf(l.statut) !== -1; }).length;
    var gagnes = leads.filter(function(l) { return l.statut === "gagne"; }).length;
    var activeTasks = tasks.filter(function(t) { return !t.done; }).length;
    var overdueTasks = tasks.filter(function(t) { return !t.done && t.date && t.date < today; }).length;
    var todayTasks = tasks.filter(function(t) { return !t.done && t.date === today; }).length;
    var admTotal = admLeads.length;
    var admSignes = admLeads.filter(function(l) { return l.statutProspect === "signe"; }).length;
    var admAlertes = admLeads.filter(function(l) { return l.statutOrg === "conv_signee" && !l.formateurNom; }).length;
    return { totalLeads: totalLeads, nouveau: nouveau, enCours: enCours, gagnes: gagnes, activeTasks: activeTasks, overdueTasks: overdueTasks, todayTasks: todayTasks, admTotal: admTotal, admSignes: admSignes, admAlertes: admAlertes };
  }, [leads, tasks, admLeads]);

  var recentLeads = useMemo(function() {
    return leads.slice().sort(function(a, b) { return (b.created_at || "").localeCompare(a.created_at || ""); }).slice(0, 5);
  }, [leads]);

  var urgentTasks = useMemo(function() {
    return tasks.filter(function(t) { return !t.done && t.date && t.date <= today; }).sort(function(a, b) { return (a.date || "").localeCompare(b.date || ""); }).slice(0, 5).map(function(t) {
      var lead = leads.find(function(l) { return l.id === t.lead_id; });
      return Object.assign({}, t, { leadName: lead ? (lead.nom || "") + (lead.prenom ? " " + lead.prenom : "") : "" });
    });
  }, [tasks, leads]);

  var STATUTS = { nouveau: { label: "Nouveau", color: "#6366F1", bg: "#EEF2FF" }, contacte: { label: "Contact\u00e9", color: "#0891B2", bg: "#ECFEFF" }, qualifie: { label: "Qualifi\u00e9", color: "#D97706", bg: "#FFFBEB" }, proposition: { label: "Proposition", color: "#7C3AED", bg: "#F5F3FF" }, negociation: { label: "N\u00e9gociation", color: "#EA580C", bg: "#FFF7ED" }, gagne: { label: "Gagn\u00e9", color: "#059669", bg: "#ECFDF5" }, perdu: { label: "Perdu", color: "#DC2626", bg: "#FEF2F2" } };
  var typeIcons = { appel: "\u{1F4DE}", email: "\u2709\uFE0F", rdv: "\u{1F4C5}", relance: "\u{1F514}", devis: "\u{1F4C4}", admin: "\u{1F4CB}" };

  return React.createElement("div", { style: { padding: "32px 36px", maxWidth: 1200 } },
    React.createElement("div", { className: "fade-up", style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 } },
      React.createElement("div", null,
        React.createElement("h1", { style: { fontFamily: "var(--fd)", fontSize: 32, fontWeight: 800 } }, "Bonjour \u{1F44B}"),
        React.createElement("p", { style: { color: "var(--t2)", fontSize: 15, marginTop: 6 } }, user && user.email ? user.email : "")
      ),
      React.createElement("div", { style: { textAlign: "right", padding: "8px 16px", background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 12 } },
        React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })),
        React.createElement("div", { style: { fontSize: 11, color: "var(--tm)" } }, new Date().getFullYear())
      )
    ),

    // Alert banner
    (stats.overdueTasks > 0 || stats.admAlertes > 0) && React.createElement("div", { className: "fade-up", style: { background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" } },
      React.createElement("div", { style: { display: "flex", gap: 16, fontSize: 13, fontWeight: 600 } },
        stats.overdueTasks > 0 && React.createElement("span", { style: { color: "#F87171" } }, "\u{1F534} " + stats.overdueTasks + " t\u00e2che(s) en retard"),
        stats.admAlertes > 0 && React.createElement("span", { style: { color: "#F59E0B" } }, "\u26A0 " + stats.admAlertes + " dossier(s) sans formateur")
      ),
      React.createElement("div", { style: { display: "flex", gap: 8 } },
        stats.overdueTasks > 0 && React.createElement("button", { className: "btn btn-sm", style: { background: "rgba(239,68,68,.15)", color: "#F87171", border: "1px solid rgba(239,68,68,.3)" }, onClick: function() { onNav("prospects"); } }, "Voir les t\u00e2ches"),
        stats.admAlertes > 0 && React.createElement("button", { className: "btn btn-sm", style: { background: "rgba(245,158,11,.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,.3)" }, onClick: function() { onNav("suivi"); } }, "Voir les dossiers")
      )
    ),

    // KPIs
    React.createElement("div", { className: "fade-up", style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginBottom: 24 } },
      [{ l: "Leads", v: stats.totalLeads, c: "var(--a)", i: "\u{1F465}" },
       { l: "En cours", v: stats.enCours, c: "#F59E0B", i: "\u{1F525}" },
       { l: "Gagn\u00e9s", v: stats.gagnes, c: "#10B981", i: "\u{1F3C6}" },
       { l: "T\u00e2ches", v: stats.activeTasks, c: "#8B5CF6", i: "\u{1F4CB}" },
       { l: "Aujourd'hui", v: stats.todayTasks, c: "#3B82F6", i: "\u{1F4C5}" },
       { l: "Dossiers", v: stats.admTotal, c: "#195144", i: "\u{1F4C2}" }
      ].map(function(s, i) {
        return React.createElement("div", { key: i, className: "card", style: { padding: 18, textAlign: "center" } },
          React.createElement("span", { style: { fontSize: 22 } }, s.i),
          React.createElement("div", { style: { fontFamily: "var(--fd)", fontSize: 28, fontWeight: 800, color: s.c, marginTop: 6 } }, s.v),
          React.createElement("div", { style: { fontSize: 12, color: "var(--t2)", marginTop: 4 } }, s.l)
        );
      })
    ),

    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 } },
      // Left column
      React.createElement("div", null,
        // Quick tools
        React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, marginBottom: 16 } }, "Outils rapides"),
        [{ id: "prospects", i: "\u{1F465}", t: "CRM Leads", d: "G\u00e9rer vos prospects" },
         { id: "suivi", i: "\u{1F4C2}", t: "Suivi Administratif", d: "Dossiers & AKTO" },
         { id: "prospection", i: "\u2709\uFE0F", t: "Prospection Email", d: "Emails personnalis\u00e9s" },
         { id: "mailing", i: "\u{1F4E8}", t: "Mailing", d: "Envoyer des emails" },
         { id: "simulateur", i: "\u{1F4B0}", t: "Simulateur Budget", d: "Budgets OPCO" },
         { id: "audit", i: "\u{1F4CB}", t: "Audit Conformit\u00e9", d: "Diagnostic terrain" },
         { id: "manager", i: "\u{1F4CA}", t: "Vue Manager", d: "KPIs & performance" }
        ].map(function(tool) {
          return React.createElement("div", { key: tool.id, className: "card", onClick: function() { onNav(tool.id); }, style: { marginBottom: 8, padding: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 } },
            React.createElement("div", { style: { width: 42, height: 42, borderRadius: 10, background: "var(--ag)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 } }, tool.i),
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("div", { style: { fontWeight: 700, fontSize: 14 } }, tool.t),
              React.createElement("div", { style: { fontSize: 12, color: "var(--tm)" } }, tool.d)
            ),
            React.createElement("span", { style: { color: "var(--tm)", fontSize: 14 } }, "\u2192")
          );
        })
      ),

      // Right column
      React.createElement("div", null,
        // Urgent tasks
        urgentTasks.length > 0 && React.createElement("div", { style: { marginBottom: 20 } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 12 } },
            React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700 } }, "\u{1F534} T\u00e2ches urgentes"),
            React.createElement("button", { className: "btn btn-s btn-sm", onClick: function() { onNav("prospects"); } }, "Voir tout")
          ),
          React.createElement("div", { className: "card", style: { padding: 0, overflow: "hidden" } },
            urgentTasks.map(function(t, i) {
              var isOd = t.date < today;
              return React.createElement("div", { key: t.id, style: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: i < urgentTasks.length - 1 ? "1px solid var(--bd)" : "none", borderLeft: "3px solid " + (isOd ? "#EF4444" : "#F59E0B") } },
                React.createElement("span", { style: { fontSize: 16, width: 24, textAlign: "center" } }, typeIcons[t.type] || "\u{1F4CB}"),
                React.createElement("div", { style: { flex: 1 } },
                  React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, t.title),
                  React.createElement("div", { style: { fontSize: 11, color: isOd ? "#EF4444" : "var(--tm)" } }, t.leadName + " \u2022 " + (t.date || ""))
                )
              );
            })
          )
        ),

        // Recent leads
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 12 } },
          React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700 } }, "Derniers leads"),
          React.createElement("button", { className: "btn btn-s btn-sm", onClick: function() { onNav("prospects"); } }, "Voir tous")
        ),
        React.createElement("div", { className: "card", style: { padding: 0, overflow: "hidden" } },
          recentLeads.length ? recentLeads.map(function(l, i) {
            var scfg = STATUTS[l.statut] || STATUTS.nouveau;
            return React.createElement("div", { key: l.id || i, style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < recentLeads.length - 1 ? "1px solid var(--bd)" : "none" } },
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
                React.createElement("div", { style: { width: 32, height: 32, borderRadius: 8, background: "var(--inp)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--t2)" } }, (l.nom || "?")[0]),
                React.createElement("div", null,
                  React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, (l.nom || "") + (l.prenom ? " " + l.prenom : "")),
                  React.createElement("div", { style: { fontSize: 11, color: "var(--tm)" } }, l.etablissement || "")
                )
              ),
              React.createElement("span", { className: "badge", style: { background: scfg.bg, color: scfg.color } }, scfg.label)
            );
          }) : React.createElement("div", { style: { padding: 32, textAlign: "center", color: "var(--tm)" } }, "Aucun lead")
        ),

        // Admin dossiers summary
        admLeads.length > 0 && React.createElement("div", { style: { marginTop: 20 } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 12 } },
            React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700 } }, "\u{1F4C2} Dossiers formation"),
            React.createElement("button", { className: "btn btn-s btn-sm", onClick: function() { onNav("suivi"); } }, "Voir tous")
          ),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 } },
            [{ l: "Total", v: stats.admTotal, c: "#195144" }, { l: "Sign\u00e9s", v: stats.admSignes, c: "#10B981" }, { l: "Alertes", v: stats.admAlertes, c: stats.admAlertes > 0 ? "#EF4444" : "var(--tm)" }].map(function(s, i) {
              return React.createElement("div", { key: i, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 10, padding: "12px 14px", textAlign: "center" } },
                React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 22, fontWeight: 700, color: s.c } }, s.v),
                React.createElement("div", { style: { fontSize: 10, color: "var(--tm)", marginTop: 2 } }, s.l)
              );
            })
          )
        )
      )
    )
  );
}

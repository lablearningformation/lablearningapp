import React from 'react';
import { useState, useEffect, useMemo } from "react";
import { saveFormateur as dbSaveFormateur, deleteFormateur as dbDeleteFormateur, logActivityDB } from "../lib/data-service.js";

var DOC_TYPES = [
  { id: "convention", label: "Convention", icon: "\u{1F4DD}" },
  { id: "feuille_presence", label: "Feuille de pr\u00e9sence", icon: "\u{1F4CB}" },
  { id: "attestation", label: "Attestation", icon: "\u{1F4C4}" },
  { id: "facture", label: "Facture", icon: "\u{1F4B0}" },
  { id: "autre", label: "Autre", icon: "\u{1F4C2}" }
];

export default function FormateursAdmin(props) {
  var onNav = props && props.onNav ? props.onNav : function() {};
  var _fmt = useState([]); var formateurs = _fmt[0], setFormateurs = _fmt[1];
  var _missions = useState([]); var missions = _missions[0], setMissions = _missions[1];
  var _docs = useState([]); var docs = _docs[0], setDocs = _docs[1];
  var _sel = useState(null); var selectedFmt = _sel[0], setSelectedFmt = _sel[1];
  var _tab = useState("liste"); var tab = _tab[0], setTab = _tab[1];
  var _showNew = useState(false); var showNew = _showNew[0], setShowNew = _showNew[1];
  var _toast = useState(null); var toast = _toast[0], setToast = _toast[1];
  var _newF = useState({ nom: "", tel: "", email: "", specialites: "", notes: "" });
  var newF = _newF[0], setNewF = _newF[1];

  var showToast = function(m) { setToast(m); setTimeout(function() { setToast(null); }, 2500); };

  useEffect(function() {
    try { var adm = JSON.parse(localStorage.getItem("crm_admin_v3") || "{}"); setFormateurs(adm.formateurs || []); var admLeads = adm.leads || []; var m = []; admLeads.forEach(function(l) { if (l.formateurNom) { m.push({ formateurNom: l.formateurNom, client: l.client, formation: l.formation || "", dateDebut: l.dateDebut || "", dateFin: l.dateFin || "", statutOrg: l.statutOrg || "", statutAkto: l.statutAkto || "", id: l.id }); } }); setMissions(m); } catch (e) {}
    try { setDocs(JSON.parse(localStorage.getItem("ll_fmt_docs") || "[]")); } catch (e) {}
  }, []);

  useEffect(function() {
    localStorage.setItem("ll_fmt_docs", JSON.stringify(docs));
  }, [docs]);

  function saveFmt() {
    if (!newF.nom.trim()) { showToast("Nom requis"); return; }
    var f;
    if (selectedFmt) {
      f = Object.assign({}, selectedFmt, newF);
      setFormateurs(formateurs.map(function(x) { return x.id === f.id ? f : x; }));
    } else {
      f = Object.assign({}, newF, { id: "fmt_" + Date.now(), created_at: new Date().toISOString() });
      setFormateurs(formateurs.concat([f]));
    }
    var adm = JSON.parse(localStorage.getItem("crm_admin_v3") || "{}");
    adm.formateurs = selectedFmt ? (adm.formateurs || []).map(function(x) { return x.id === f.id ? f : x; }) : (adm.formateurs || []).concat([f]);
    localStorage.setItem("crm_admin_v3", JSON.stringify(adm));
    dbSaveFormateur(f);
    logActivityDB({ module: "admin", action: selectedFmt ? "formateur_updated" : "formateur_created", type: "dossier_updated", leadName: f.nom });
    setShowNew(false); setSelectedFmt(null); setNewF({ nom: "", tel: "", email: "", specialites: "", notes: "" });
    showToast(selectedFmt ? "Formateur mis \u00e0 jour" : "Formateur ajout\u00e9");
  }

  function deleteFmt(id) {
    if (!confirm("Supprimer ce formateur ?")) return;
    setFormateurs(formateurs.filter(function(f) { return f.id !== id; }));
    var adm = JSON.parse(localStorage.getItem("crm_admin_v3") || "{}");
    adm.formateurs = (adm.formateurs || []).filter(function(f) { return f.id !== id; });
    localStorage.setItem("crm_admin_v3", JSON.stringify(adm));
    dbDeleteFormateur(id);
    if (selectedFmt && selectedFmt.id === id) setSelectedFmt(null);
    showToast("Formateur supprim\u00e9");
  }

  function openEdit(f) {
    setSelectedFmt(f); setNewF({ nom: f.nom || "", tel: f.tel || "", email: f.email || "", specialites: f.specialites || "", notes: f.notes || "" }); setShowNew(true);
  }

  function getFmtMissions(nom) {
    return missions.filter(function(m) { return m.formateurNom === nom; });
  }

  function getFmtDocs(fmtId) {
    return docs.filter(function(d) { return d.formateur_id === fmtId; });
  }

  var stats = useMemo(function() {
    var total = formateurs.length;
    var enMission = formateurs.filter(function(f) { return missions.some(function(m) { return m.formateurNom === f.nom; }); }).length;
    var docsCount = docs.length;
    return { total: total, enMission: enMission, docs: docsCount };
  }, [formateurs, missions, docs]);

  // ═══ RENDER ═══
  return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg)", color: "var(--t1)", padding: "24px 28px" } },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 } },
      React.createElement("div", null,
        React.createElement("h1", { style: { fontFamily: "var(--fd)", fontSize: 26, fontWeight: 800 } }, "\u{1F468}\u200D\u{1F3EB} Formateurs"),
        React.createElement("p", { style: { color: "var(--t2)", fontSize: 13, marginTop: 4 } }, stats.total + " formateur(s) \u2022 " + stats.enMission + " en mission")
      ),
      React.createElement("div", { style: { display: "flex", gap: 8 } },
        React.createElement("button", { onClick: function() { setSelectedFmt(null); setNewF({ nom: "", tel: "", email: "", specialites: "", notes: "" }); setShowNew(true); }, style: { padding: "10px 18px", borderRadius: 8, background: "linear-gradient(135deg,var(--a),#3ECB82)", color: "var(--p)", fontFamily: "var(--fb)", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" } }, "+ Ajouter un formateur")
      )
    ),
    // Stats
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 } },
      [{ l: "Formateurs", v: stats.total, c: "var(--a)", i: "\u{1F468}\u200D\u{1F3EB}" }, { l: "En mission", v: stats.enMission, c: "#3B82F6", i: "\u{1F4CB}" }, { l: "Documents", v: stats.docs, c: "#8B5CF6", i: "\u{1F4C4}" }].map(function(s, i) {
        return React.createElement("div", { key: i, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 12, padding: "16px 20px", textAlign: "center" } },
          React.createElement("span", { style: { fontSize: 22 } }, s.i),
          React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 28, fontWeight: 800, color: s.c, marginTop: 4 } }, s.v),
          React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginTop: 2 } }, s.l)
        );
      })
    ),
    // Formateurs list
    !selectedFmt || showNew ? React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 12 } },
      formateurs.map(function(f) {
        var fMissions = getFmtMissions(f.nom);
        var fDocs = getFmtDocs(f.id);
        return React.createElement("div", { key: f.id, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 20, cursor: "pointer", transition: ".15s", borderLeft: "4px solid " + (fMissions.length > 0 ? "#10B981" : "var(--bd)") }, onClick: function() { setSelectedFmt(f); setShowNew(false); } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "var(--a)" } }, f.nom),
              f.tel && React.createElement("div", { style: { fontSize: 12, color: "var(--tm)", fontFamily: "var(--fm)", marginTop: 2 } }, f.tel),
              f.email && React.createElement("div", { style: { fontSize: 12, color: "var(--tm)", marginTop: 2 } }, f.email)
            ),
            React.createElement("div", { style: { display: "flex", gap: 4 } },
              React.createElement("button", { onClick: function(e) { e.stopPropagation(); openEdit(f); }, style: { background: "none", border: "none", cursor: "pointer", fontSize: 14 } }, "\u270F\uFE0F"),
              React.createElement("button", { onClick: function(e) { e.stopPropagation(); deleteFmt(f.id); }, style: { background: "none", border: "none", cursor: "pointer", fontSize: 14 } }, "\u{1F5D1}")
            )
          ),
          f.specialites && React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 } },
            f.specialites.split(",").map(function(s, i) { return React.createElement("span", { key: i, style: { padding: "2px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: "rgba(89,213,151,.1)", color: "var(--a)" } }, s.trim()); })
          ),
          React.createElement("div", { style: { display: "flex", gap: 8 } },
            React.createElement("span", { style: { fontSize: 11, color: fMissions.length > 0 ? "#10B981" : "var(--tm)" } }, "\u{1F4CB} " + fMissions.length + " mission(s)"),
            React.createElement("span", { style: { fontSize: 11, color: "var(--tm)" } }, "\u{1F4C4} " + fDocs.length + " doc(s)")
          )
        );
      }),
      !formateurs.length && React.createElement("div", { style: { textAlign: "center", padding: 48, color: "var(--tm)", gridColumn: "1/-1" } }, React.createElement("div", { style: { fontSize: 48, marginBottom: 12 } }, "\u{1F468}\u200D\u{1F3EB}"), React.createElement("div", { style: { fontSize: 16, fontWeight: 600 } }, "Aucun formateur"))
    ) : null,

    // ─── FORMATEUR DETAIL ───
    selectedFmt && !showNew ? React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", gap: 12, marginBottom: 16 } },
        React.createElement("button", { onClick: function() { setSelectedFmt(null); }, style: { padding: "8px 16px", borderRadius: 8, background: "var(--inp)", color: "var(--t1)", border: "1px solid var(--bd)", fontFamily: "var(--fb)", fontSize: 13, fontWeight: 600, cursor: "pointer" } }, "\u2190 Retour"),
        React.createElement("button", { onClick: function() { openEdit(selectedFmt); }, style: { padding: "8px 16px", borderRadius: 8, background: "var(--inp)", color: "var(--t1)", border: "1px solid var(--bd)", fontFamily: "var(--fb)", fontSize: 13, fontWeight: 600, cursor: "pointer" } }, "\u270F\uFE0F Modifier")
      ),
      React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 24, marginBottom: 16 } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
          React.createElement("div", null,
            React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800, color: "var(--a)" } }, selectedFmt.nom),
            React.createElement("div", { style: { display: "flex", gap: 16, marginTop: 8, fontSize: 13, color: "var(--t2)" } },
              selectedFmt.tel && React.createElement("span", null, "\u{1F4DE} " + selectedFmt.tel),
              selectedFmt.email && React.createElement("span", null, "\u2709\uFE0F " + selectedFmt.email)
            ),
            selectedFmt.specialites && React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 } }, selectedFmt.specialites.split(",").map(function(s, i) { return React.createElement("span", { key: i, style: { padding: "3px 12px", borderRadius: 14, fontSize: 11, fontWeight: 600, background: "rgba(89,213,151,.1)", color: "var(--a)" } }, s.trim()); }))
          ),
          React.createElement("div", { style: { width: 56, height: 56, borderRadius: 14, background: "var(--ag)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 } }, "\u{1F468}\u200D\u{1F3EB}")
        )
      ),
      // Missions
      React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 20, marginBottom: 16 } },
        React.createElement("h3", { style: { fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 14 } }, "\u{1F4CB} Missions (" + getFmtMissions(selectedFmt.nom).length + ")"),
        getFmtMissions(selectedFmt.nom).length ? getFmtMissions(selectedFmt.nom).map(function(m) {
          var pct = 0;
          var orgMap = { conv_signee: 100, conv_envoyee: 70, conv_modifier: 50, conv_faire: 40 };
          var aktMap = { transmis: 100, client: 80, verifier: 65, remplir: 50, courrier: 30 };
          pct = Math.round(((orgMap[m.statutOrg] || 10) + (aktMap[m.statutAkto] || 10)) / 2);
          var col = pct >= 80 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";
          return React.createElement("div", { key: m.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--sf)", borderRadius: 8, marginBottom: 6, borderLeft: "3px solid " + col } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 14, fontWeight: 600 } }, m.client),
              React.createElement("div", { style: { fontSize: 12, color: "var(--tm)" } }, m.formation + (m.dateDebut ? " \u2022 " + m.dateDebut.split("-").reverse().slice(0, 2).join("/") : ""))
            ),
            React.createElement("span", { style: { fontFamily: "var(--fm)", fontSize: 13, fontWeight: 700, color: col } }, pct + "%")
          );
        }) : React.createElement("div", { style: { textAlign: "center", padding: 20, color: "var(--tm)" } }, "Aucune mission assign\u00e9e")
      ),
      // Documents
      React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 20 } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 } },
          React.createElement("h3", { style: { fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700 } }, "\u{1F4C4} Documents (" + getFmtDocs(selectedFmt.id).length + ")"),
          React.createElement("button", { onClick: function() {
            var name = prompt("Nom du document :");
            if (!name) return;
            var d = { id: "doc_" + Date.now(), formateur_id: selectedFmt.id, formateur_nom: selectedFmt.nom, name: name, type: "autre", status: "en_attente", uploaded_at: new Date().toISOString(), signed: false };
            setDocs(docs.concat([d]));
            showToast("Document ajout\u00e9");
          }, style: { padding: "6px 14px", borderRadius: 8, background: "var(--inp)", color: "var(--t1)", border: "1px solid var(--bd)", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "+ Document")
        ),
        getFmtDocs(selectedFmt.id).length ? getFmtDocs(selectedFmt.id).map(function(d) {
          return React.createElement("div", { key: d.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--sf)", borderRadius: 8, marginBottom: 4 } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
              React.createElement("span", { style: { fontSize: 16 } }, d.signed ? "\u2705" : "\u{1F4C4}"),
              React.createElement("div", null,
                React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, d.name),
                React.createElement("div", { style: { fontSize: 11, color: "var(--tm)" } }, d.signed ? "Sign\u00e9" : d.status === "depose" ? "D\u00e9pos\u00e9 par le formateur" : "En attente")
              )
            ),
            React.createElement("div", { style: { display: "flex", gap: 4 } },
              !d.signed && React.createElement("button", { onClick: function() { setDocs(docs.map(function(x) { return x.id === d.id ? Object.assign({}, x, { signed: true }) : x; })); showToast("Document marqu\u00e9 comme sign\u00e9"); }, style: { padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(16,185,129,.1)", color: "#10B981", border: "1px solid rgba(16,185,129,.2)", cursor: "pointer" } }, "\u2713 Signer"),
              React.createElement("button", { onClick: function() { setDocs(docs.filter(function(x) { return x.id !== d.id; })); }, style: { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--tm)" } }, "\u{1F5D1}")
            )
          );
        }) : React.createElement("div", { style: { textAlign: "center", padding: 20, color: "var(--tm)" } }, "Aucun document"),
        selectedFmt.notes && React.createElement("div", { style: { marginTop: 12, padding: 12, background: "var(--sf)", borderRadius: 8, fontSize: 13, color: "var(--t2)" } }, React.createElement("strong", null, "Notes : "), selectedFmt.notes)
      )
    ) : null,

    // ─── ADD/EDIT MODAL ───
    showNew && React.createElement("div", { onClick: function() { setShowNew(false); setSelectedFmt(null); }, style: { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" } },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 20, padding: "28px 32px", width: "90%", maxWidth: 520 } },
        React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, marginBottom: 20 } }, selectedFmt ? "Modifier le formateur" : "Nouveau formateur"),
        React.createElement("div", { style: { display: "grid", gap: 14 } },
          React.createElement("div", null, React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Nom complet *"), React.createElement("input", { className: "crm-inp", value: newF.nom, onChange: function(e) { setNewF(Object.assign({}, newF, { nom: e.target.value })); }, placeholder: "Jean Dupont" })),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
            React.createElement("div", null, React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "T\u00e9l\u00e9phone"), React.createElement("input", { className: "crm-inp", value: newF.tel, onChange: function(e) { setNewF(Object.assign({}, newF, { tel: e.target.value })); }, placeholder: "06 12 34 56 78" })),
            React.createElement("div", null, React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Email"), React.createElement("input", { className: "crm-inp", type: "email", value: newF.email, onChange: function(e) { setNewF(Object.assign({}, newF, { email: e.target.value })); }, placeholder: "formateur@email.fr" }))
          ),
          React.createElement("div", null, React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Sp\u00e9cialit\u00e9s (s\u00e9par\u00e9es par des virgules)"), React.createElement("input", { className: "crm-inp", value: newF.specialites, onChange: function(e) { setNewF(Object.assign({}, newF, { specialites: e.target.value })); }, placeholder: "HACCP, SST, Hygi\u00e8ne" })),
          React.createElement("div", null, React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Notes"), React.createElement("textarea", { className: "crm-inp", value: newF.notes, onChange: function(e) { setNewF(Object.assign({}, newF, { notes: e.target.value })); } }))
        ),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--bd)" } },
          React.createElement("button", { onClick: function() { setShowNew(false); setSelectedFmt(null); }, style: { padding: "10px 20px", borderRadius: 8, background: "var(--inp)", color: "var(--t1)", border: "1px solid var(--bd)", fontFamily: "var(--fb)", fontSize: 13, fontWeight: 600, cursor: "pointer" } }, "Annuler"),
          React.createElement("button", { onClick: saveFmt, style: { padding: "10px 20px", borderRadius: 8, background: "linear-gradient(135deg,var(--a),#3ECB82)", color: "var(--p)", fontFamily: "var(--fb)", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" } }, "Sauvegarder")
        )
      )
    ),
    toast && React.createElement("div", { style: { position: "fixed", bottom: 24, right: 24, padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 300, background: "rgba(89,213,151,.15)", color: "#59D597", border: "1px solid rgba(89,213,151,.3)" } }, toast)
  );
}

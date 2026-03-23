import React from 'react';
import { useState, useRef } from "react";
import { STATUTS, TASK_TYPES, TIME_SLOTS, DEFAULT_GROUPS, uid, today, now, fmtDate, fmtTime, isPast, isToday, getGroupLabel, getGroupParents } from "../lib/crm-helpers.js";

export default function CRMModals(props) {
  var leads = props.leads, tasks = props.tasks, groups = props.groups;
  var setGroups = props.setGroups, showToast = props.showToast, addComment = props.addComment;
  var completeTask = props.completeTask, moveTask = props.moveTask, deleteTask = props.deleteTask;
  var importLeads = props.importLeads, updateLead = props.updateLead, getOccupiedSlots = props.getOccupiedSlots;
  var setSelectedId = props.setSelectedId, setDetailTab = props.setDetailTab, setPage = props.setPage;
  var showCompleteTask = props.showCompleteTask, setShowCompleteTask = props.setShowCompleteTask;
  var showMoveTask = props.showMoveTask, setShowMoveTask = props.setShowMoveTask;
  var showTaskPopup = props.showTaskPopup, setShowTaskPopup = props.setShowTaskPopup;
  var showImport = props.showImport, setShowImport = props.setShowImport;
  var showMassEmail = props.showMassEmail, setShowMassEmail = props.setShowMassEmail;
  var showGroupMgr = props.showGroupMgr, setShowGroupMgr = props.setShowGroupMgr;
  var selectedLeads = props.selectedLeads;

  return React.createElement("div", null,
    showCompleteTask ? renderCompleteModal() : null,
    showMoveTask ? renderMoveModal() : null,
    showTaskPopup ? renderTaskPopup() : null,
    showImport ? renderImportModal() : null,
    showMassEmail ? renderMassEmailModal() : null,
    showGroupMgr ? renderGroupManager() : null
  );

  // ─── COMPLETE TASK MODAL ───
  function renderCompleteModal() {
    var _cm = useState(""); var comment = _cm[0], setComment = _cm[1];
    var t = showCompleteTask;
    var tt = TASK_TYPES.find(function(x) { return x.id === t.type; });
    var lead = leads.find(function(l) { return l.id === t.lead_id; });
    return React.createElement("div", { onClick: function() { setShowCompleteTask(null); }, className: "crm-modal-bg" },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, className: "crm-modal", style: { maxWidth: 480 } },
        React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, marginBottom: 16 } }, "\u2713 Terminer la t\u00e2che"),
        React.createElement("div", { style: { background: "var(--sf)", borderRadius: 10, padding: 16, marginBottom: 16 } },
          React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: tt ? tt.color : "var(--t1)", marginBottom: 6 } }, (tt ? tt.icon + " " : "") + t.title),
          React.createElement("div", { style: { fontSize: 12, color: "var(--tm)" } }, fmtDate(t.date) + " " + fmtTime(t.heure)),
          lead ? React.createElement("div", { style: { fontSize: 12, color: "var(--a)", marginTop: 4 } }, lead.nom + (lead.prenom ? " " + lead.prenom : "")) : null,
          t.notes ? React.createElement("div", { style: { fontSize: 12, color: "var(--t2)", marginTop: 4 } }, t.notes) : null
        ),
        React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Compte-rendu (optionnel)"), React.createElement("textarea", { className: "crm-inp", value: comment, onChange: function(e) { setComment(e.target.value); }, placeholder: "R\u00e9sum\u00e9 de la t\u00e2che effectu\u00e9e..." })),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 } },
          React.createElement("button", { className: "crm-btn crm-btn-s", onClick: function() { setShowCompleteTask(null); } }, "Annuler"),
          React.createElement("button", { className: "crm-btn crm-btn-a", onClick: function() { completeTask(t.id, comment); setShowCompleteTask(null); } }, "Terminer")
        )
      )
    );
  }

  // ─── MOVE TASK MODAL ───
  function renderMoveModal() {
    var _md = useState(showMoveTask.date || today()); var moveDate = _md[0], setMoveDate = _md[1];
    var _mh = useState(showMoveTask.heure || "09:00"); var moveHeure = _mh[0], setMoveHeure = _mh[1];
    var t = showMoveTask;
    var tt = TASK_TYPES.find(function(x) { return x.id === t.type; });
    var occupied = getOccupiedSlots ? getOccupiedSlots(moveDate) : [];
    return React.createElement("div", { onClick: function() { setShowMoveTask(null); }, className: "crm-modal-bg" },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, className: "crm-modal", style: { maxWidth: 420 } },
        React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, marginBottom: 16 } }, "\u{1F4C5} D\u00e9placer la t\u00e2che"),
        React.createElement("div", { style: { background: "var(--sf)", borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 13 } },
          React.createElement("strong", { style: { color: tt ? tt.color : "var(--t1)" } }, (tt ? tt.icon + " " : "") + t.title),
          React.createElement("div", { style: { color: "var(--tm)", marginTop: 4, fontSize: 12 } }, "Actuellement : " + fmtDate(t.date) + " " + fmtTime(t.heure))
        ),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 } },
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Nouvelle date"), React.createElement("input", { className: "crm-inp", type: "date", value: moveDate, onChange: function(e) { setMoveDate(e.target.value); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Nouvelle heure"), React.createElement("select", { className: "crm-inp", value: moveHeure, onChange: function(e) { setMoveHeure(e.target.value); } }, TIME_SLOTS.map(function(h) { var busy = occupied.includes(h); return React.createElement("option", { key: h, value: h, style: busy ? { color: "red" } : {} }, h + (busy ? " \u26d4" : "")); })))
        ),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "crm-btn crm-btn-s", onClick: function() { setShowMoveTask(null); } }, "Annuler"),
          React.createElement("button", { className: "crm-btn crm-btn-a", onClick: function() { moveTask(t.id, moveDate, moveHeure); setShowMoveTask(null); } }, "D\u00e9placer")
        )
      )
    );
  }

  // ─── TASK POPUP (agenda click) ───
  function renderTaskPopup() {
    var t = showTaskPopup;
    var tt = TASK_TYPES.find(function(x) { return x.id === t.type; });
    var lead = leads.find(function(l) { return l.id === t.lead_id; });
    var od = isPast(t.date) && !t.done;
    return React.createElement("div", { onClick: function() { setShowTaskPopup(null); }, className: "crm-modal-bg" },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, className: "crm-modal", style: { maxWidth: 420 } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 18, fontWeight: 700, color: tt ? tt.color : "var(--t1)" } }, (tt ? tt.icon + " " : "") + t.title),
            React.createElement("div", { style: { fontSize: 12, color: od ? "#EF4444" : "var(--tm)", marginTop: 4 } }, fmtDate(t.date) + " " + fmtTime(t.heure) + (od ? " \u2022 EN RETARD" : ""))
          ),
          React.createElement("button", { onClick: function() { setShowTaskPopup(null); }, style: { background: "none", border: "none", cursor: "pointer", color: "var(--tm)", fontSize: 18 } }, "\u2715")
        ),
        lead ? React.createElement("div", { style: { background: "var(--sf)", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 } }, "Lead associ\u00e9"),
            React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: "var(--a)" } }, lead.nom + (lead.prenom ? " " + lead.prenom : ""))
          ),
          React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setShowTaskPopup(null); setSelectedId(lead.id); setDetailTab("info"); setPage("dashboard"); } }, "Voir fiche")
        ) : null,
        t.notes ? React.createElement("div", { style: { background: "var(--sf)", borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13, color: "var(--t2)" } }, t.notes) : null,
        React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          React.createElement("button", { className: "crm-btn crm-btn-a crm-btn-sm", onClick: function() { setShowTaskPopup(null); setShowCompleteTask(t); } }, "\u2713 Terminer"),
          React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setShowTaskPopup(null); setShowMoveTask(t); } }, "\u{1F4C5} D\u00e9placer"),
          React.createElement("button", { className: "crm-btn crm-btn-d crm-btn-sm", onClick: function() { deleteTask(t.id); setShowTaskPopup(null); } }, "\u{1F5D1} Supprimer")
        )
      )
    );
  }

  // ─── IMPORT CSV MODAL ───
  function renderImportModal() {
    var _parsed = useState(null); var parsed = _parsed[0], setParsed = _parsed[1];
    var _dupes = useState([]); var dupes = _dupes[0], setDupes = _dupes[1];
    var _newOnes = useState([]); var newOnes = _newOnes[0], setNewOnes = _newOnes[1];
    var fileRef = useRef(null);

    function parseCSV(text) {
      var lines = text.split("\n").filter(function(l) { return l.trim(); });
      if (lines.length < 2) { showToast("Fichier vide"); return; }
      var headers = lines[0].split(";").map(function(h) { return h.trim().toLowerCase(); });
      var rows = [];
      for (var i = 1; i < lines.length; i++) {
        var cols = lines[i].split(";");
        var obj = {};
        headers.forEach(function(h, idx) { obj[h] = (cols[idx] || "").trim(); });
        rows.push(obj);
      }
      var newL = []; var dupL = [];
      rows.forEach(function(r) {
        var isDupe = leads.some(function(l) {
          return (r.nom && r.nom.toLowerCase() === (l.nom || "").toLowerCase()) || (r.email && r.email.toLowerCase() === (l.email || "").toLowerCase()) || (r.telephone && r.telephone === l.telephone);
        });
        var lead = { id: uid(), civilite: r.civilite || "", nom: r.nom || "", prenom: r.prenom || "", raison_sociale: r.raison_sociale || "", etablissement: r.etablissement || "", email: r.email || "", telephone: r.telephone || "", adresse: r.adresse || "", ville: r.ville || "", siret: r.siret || "", type_etablissement: "restaurant", convention: "", effectif: 0, notes: r.notes || "", tags: [], groupe: r.groupe || "", statut: r.statut || "nouveau", source: "csv", score: 0, created_at: now(), last_activity: today() };
        if (isDupe) dupL.push(lead); else newL.push(lead);
      });
      setNewOnes(newL); setDupes(dupL); setParsed(true);
    }

    function handleFile(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) { parseCSV(ev.target.result); };
      reader.readAsText(file, "UTF-8");
    }

    return React.createElement("div", { onClick: function() { setShowImport(false); setParsed(null); }, className: "crm-modal-bg" },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, className: "crm-modal", style: { maxWidth: 520 } },
        React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, marginBottom: 16 } }, "\u{1F4E5} Importer des leads (CSV)"),
        !parsed ? React.createElement("div", null,
          React.createElement("p", { style: { fontSize: 13, color: "var(--t2)", marginBottom: 12 } }, "Format attendu (s\u00e9parateur ;) :"),
          React.createElement("div", { style: { background: "var(--sf)", borderRadius: 8, padding: 12, fontSize: 11, fontFamily: "var(--fm)", color: "var(--tm)", marginBottom: 16, overflowX: "auto" } }, "nom;prenom;email;telephone;etablissement;ville;groupe;statut;notes"),
          React.createElement("input", { type: "file", accept: ".csv,.txt", ref: fileRef, onChange: handleFile, style: { display: "none" } }),
          React.createElement("button", { className: "crm-btn crm-btn-a", onClick: function() { fileRef.current && fileRef.current.click(); }, style: { width: "100%" } }, "\u{1F4C2} Choisir un fichier CSV")
        ) : React.createElement("div", null,
          React.createElement("div", { style: { display: "flex", gap: 16, marginBottom: 16 } },
            React.createElement("div", { style: { flex: 1, background: "rgba(89,213,151,.1)", borderRadius: 10, padding: 16, textAlign: "center" } }, React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 28, fontWeight: 800, color: "var(--a)" } }, newOnes.length), React.createElement("div", { style: { fontSize: 11, color: "var(--tm)" } }, "Nouveaux leads")),
            React.createElement("div", { style: { flex: 1, background: "rgba(239,68,68,.1)", borderRadius: 10, padding: 16, textAlign: "center" } }, React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 28, fontWeight: 800, color: "#F87171" } }, dupes.length), React.createElement("div", { style: { fontSize: 11, color: "var(--tm)" } }, "Doublons d\u00e9tect\u00e9s"))
          ),
          React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 } },
            React.createElement("button", { className: "crm-btn crm-btn-s", onClick: function() { setShowImport(false); setParsed(null); } }, "Annuler"),
            React.createElement("button", { className: "crm-btn crm-btn-a", disabled: !newOnes.length, onClick: function() { importLeads(newOnes); setShowImport(false); setParsed(null); } }, "Importer " + newOnes.length + " lead(s)")
          )
        )
      )
    );
  }

  // ─── MASS EMAIL MODAL ───
  function renderMassEmailModal() {
    var _tpl = useState("chaud"); var tpl = _tpl[0], setTpl = _tpl[1];
    var selectedL = leads.filter(function(l) { return selectedLeads && selectedLeads.indexOf(l.id) !== -1; });
    var templates = [
      { id: "chaud", name: "\u{1F525} Chaud", desc: "Suite \u00e0 mon passage" },
      { id: "moyen", name: "\u23F0 Moyen", desc: "S\u00e9curiser + optimiser" },
      { id: "froid", name: "\u2744\uFE0F Froid", desc: "D\u00e9couverte catalogue" },
      { id: "relance", name: "\u{1F514} Relance", desc: "Relance apr\u00e8s rencontre" }
    ];
    return React.createElement("div", { onClick: function() { setShowMassEmail(false); }, className: "crm-modal-bg" },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, className: "crm-modal", style: { maxWidth: 540 } },
        React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, marginBottom: 16 } }, "\u2709\uFE0F Email en masse"),
        React.createElement("div", { style: { background: "var(--sf)", borderRadius: 10, padding: 14, marginBottom: 16 } },
          React.createElement("div", { style: { fontSize: 13, fontWeight: 600, marginBottom: 8 } }, selectedL.length + " destinataire(s) s\u00e9lectionn\u00e9(s)"),
          React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 } }, selectedL.slice(0, 10).map(function(l) { return React.createElement("span", { key: l.id, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 12, padding: "2px 8px", fontSize: 11, color: "var(--a)" } }, l.nom + (l.prenom ? " " + l.prenom : "")); }), selectedL.length > 10 ? React.createElement("span", { style: { fontSize: 11, color: "var(--tm)" } }, "+" + (selectedL.length - 10) + " autres") : null)
        ),
        React.createElement("div", { className: "crm-lbl", style: { marginBottom: 8 } }, "Choisir le template"),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 } },
          templates.map(function(t) {
            var active = tpl === t.id;
            return React.createElement("button", { key: t.id, onClick: function() { setTpl(t.id); }, style: { padding: 14, borderRadius: 10, border: active ? "2px solid var(--a)" : "1px solid var(--bd)", background: active ? "var(--ag)" : "var(--sf)", cursor: "pointer", textAlign: "left" } },
              React.createElement("div", { style: { fontSize: 14, fontWeight: 700, color: active ? "var(--a)" : "var(--t1)" } }, t.name),
              React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginTop: 4 } }, t.desc)
            );
          })
        ),
        React.createElement("div", { style: { background: "var(--sf)", borderRadius: 10, padding: 14, marginBottom: 16 } },
          React.createElement("div", { className: "crm-lbl", style: { marginBottom: 6 } }, "Variables personnalis\u00e9es"),
          React.createElement("div", { style: { fontSize: 12, color: "var(--t2)" } }, "{{civilite}} \u2192 Monsieur/Madame"),
          React.createElement("div", { style: { fontSize: 12, color: "var(--t2)" } }, "{{contact}} \u2192 Nom du lead"),
          React.createElement("div", { style: { fontSize: 12, color: "var(--t2)" } }, "{{etablissement}} \u2192 Nom de l'\u00e9tablissement")
        ),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 } },
          React.createElement("button", { className: "crm-btn crm-btn-s", onClick: function() { setShowMassEmail(false); } }, "Annuler"),
          React.createElement("button", { className: "crm-btn crm-btn-a", onClick: function() {
            showToast(selectedL.length + " email(s) pr\u00e9par\u00e9(s) (template " + tpl + ")");
            selectedL.forEach(function(l) { addComment(l.id, "\u2709\uFE0F Email envoy\u00e9 (template " + tpl + ")"); });
            setShowMassEmail(false);
          } }, "Envoyer " + selectedL.length + " email(s)")
        )
      )
    );
  }

  // ─── GROUP MANAGER ───
  function renderGroupManager() {
    var _np = useState(""); var newParent = _np[0], setNewParent = _np[1];
    var _nl = useState(""); var newLabel = _nl[0], setNewLabel = _nl[1];
    var parents = getGroupParents(groups);

    function addGroup() {
      if (!newParent.trim() || !newLabel.trim()) return;
      var id = (newParent + "_" + newLabel).toLowerCase().replace(/[^a-z0-9]/g, "_");
      if (groups.some(function(g) { return g.id === id; })) { showToast("Ce groupe existe d\u00e9j\u00e0"); return; }
      setGroups(groups.concat([{ id: id, parent: newParent.trim(), label: newLabel.trim() }]));
      setNewParent(""); setNewLabel("");
      showToast("Groupe ajout\u00e9");
    }

    function removeGroup(gid) {
      setGroups(groups.filter(function(g) { return g.id !== gid; }));
      showToast("Groupe supprim\u00e9");
    }

    return React.createElement("div", { onClick: function() { setShowGroupMgr(false); }, className: "crm-modal-bg" },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, className: "crm-modal", style: { maxWidth: 520 } },
        React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, marginBottom: 16 } }, "\u{1F4C1} Gestion des groupes"),
        React.createElement("div", { style: { maxHeight: 300, overflowY: "auto", marginBottom: 16 } },
          parents.map(function(parent) {
            var children = groups.filter(function(g) { return g.parent === parent; });
            return React.createElement("div", { key: parent, style: { marginBottom: 12 } },
              React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "var(--a)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, parent),
              children.map(function(g) {
                var count = leads.filter(function(l) { return l.groupe === g.id; }).length;
                return React.createElement("div", { key: g.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--sf)", borderRadius: 8, marginBottom: 4 } },
                  React.createElement("span", { style: { fontSize: 13 } }, g.label + " (" + count + " leads)"),
                  React.createElement("button", { onClick: function() { removeGroup(g.id); }, style: { background: "none", border: "none", cursor: "pointer", color: "var(--tm)", fontSize: 14 } }, "\u{1F5D1}")
                );
              })
            );
          })
        ),
        React.createElement("div", { style: { borderTop: "1px solid var(--bd)", paddingTop: 16 } },
          React.createElement("div", { className: "crm-lbl" }, "Ajouter un groupe"),
          React.createElement("div", { style: { display: "flex", gap: 8 } },
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("input", { className: "crm-inp", placeholder: "Cat\u00e9gorie (ex: Partenariat)", value: newParent, onChange: function(e) { setNewParent(e.target.value); }, list: "group-parents" }),
              React.createElement("datalist", { id: "group-parents" }, parents.map(function(p) { return React.createElement("option", { key: p, value: p }); }))
            ),
            React.createElement("div", { style: { flex: 1 } }, React.createElement("input", { className: "crm-inp", placeholder: "Sous-groupe (ex: Salon XYZ)", value: newLabel, onChange: function(e) { setNewLabel(e.target.value); } })),
            React.createElement("button", { className: "crm-btn crm-btn-a crm-btn-sm", onClick: addGroup }, "+")
          )
        ),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", marginTop: 16 } },
          React.createElement("button", { className: "crm-btn crm-btn-s", onClick: function() { setShowGroupMgr(false); } }, "Fermer")
        )
      )
    );
  }
}

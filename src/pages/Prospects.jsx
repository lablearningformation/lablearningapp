import React from 'react';
import { useState, useEffect, useMemo } from "react";
import { STATUTS, TASK_TYPES, CALL_TYPES, CALL_DURATIONS, TYPE_LABELS, TAG_COLORS, DEFAULT_GROUPS, TIME_SLOTS, CRM_CSS, uid, today, now, fmtDate, fmtTime, daysDiff, isToday, isPast, calcScore, getGroupLabel } from "../lib/crm-helpers.js";
import { logActivityDB } from "../lib/data-service.js";
import { loadCRM, saveLead as dbSaveLead, saveTask as dbSaveTask, deleteTaskDB, saveComment as dbSaveComment, saveCall as dbSaveCall, bulkImportLeads as dbBulkImport, saveGroup as dbSaveGroup, deleteGroup as dbDeleteGroup, cacheSaveCRM, isOnline } from "../lib/data-service.js";
import { supabase } from "../lib/supabase.js";
import CRMAgenda from "./CRMAgenda.jsx";
import CRMModals from "./CRMModals.jsx";

export default function CRMPro(props) {
  var _ld = useState([]); var leads = _ld[0], setLeads = _ld[1];
  var _tk = useState([]); var tasks = _tk[0], setTasks = _tk[1];
  var _cm = useState([]); var comments = _cm[0], setComments = _cm[1];
  var _cl = useState([]); var calls = _cl[0], setCalls = _cl[1];
  var _gr = useState(DEFAULT_GROUPS); var groups = _gr[0], setGroups = _gr[1];
  var _vw = useState("cards"); var view = _vw[0], setView = _vw[1];
  var _pg = useState("dashboard"); var page = _pg[0], setPage = _pg[1];
  var _sr = useState(""); var search = _sr[0], setSearch = _sr[1];
  var _fs = useState("all"); var filterStatut = _fs[0], setFilterStatut = _fs[1];
  var _fc = useState("all"); var filterChip = _fc[0], setFilterChip = _fc[1];
  var _fg = useState("all"); var filterGroup = _fg[0], setFilterGroup = _fg[1];
  var _sel = useState(null); var selectedId = _sel[0], setSelectedId = _sel[1];
  var _sn = useState(false); var showNew = _sn[0], setShowNew = _sn[1];
  var _st = useState(false); var showTask = _st[0], setShowTask = _st[1];
  var _sc = useState(false); var showCall = _sc[0], setShowCall = _sc[1];
  var _si = useState(false); var showImport = _si[0], setShowImport = _si[1];
  var _sm = useState(false); var showMassEmail = _sm[0], setShowMassEmail = _sm[1];
  var _sg = useState(false); var showGroupMgr = _sg[0], setShowGroupMgr = _sg[1];
  var _sct = useState(null); var showCompleteTask = _sct[0], setShowCompleteTask = _sct[1];
  var _smt = useState(null); var showMoveTask = _smt[0], setShowMoveTask = _smt[1];
  var _stp = useState(null); var showTaskPopup = _stp[0], setShowTaskPopup = _stp[1];
  var _ts = useState(null); var toast = _ts[0], setToast = _ts[1];
  var _di = useState(null); var dragId = _di[0], setDragId = _di[1];
  var _tab = useState("info"); var detailTab = _tab[0], setDetailTab = _tab[1];
  var _sel2 = useState([]); var selectedLeads = _sel2[0], setSelectedLeads = _sel2[1];
  var _bn = useState(true); var showBanner = _bn[0], setShowBanner = _bn[1];
  var _tr = useState(false); var showTrash = _tr[0], setShowTrash = _tr[1];
  var _np = useState({ civilite: "", nom: "", prenom: "", raison_sociale: "", etablissement: "", email: "", telephone: "", ville: "", adresse: "", siret: "", type_etablissement: "restaurant", convention: "", effectif: 0, notes: "", tags: [], groupe: "" });
  var np = _np[0], setNp = _np[1];
  var _nt = useState({ lead_id: "", type: "appel", title: "", date: today(), heure: "09:00", notes: "" });
  var newTask = _nt[0], setNewTask = _nt[1];
  var _nc = useState({ lead_id: "", type: "D\u00e9couverte", duree: 15, resume: "", new_statut: "", followup: "", followup_date: "" });
  var newCall = _nc[0], setNewCall = _nc[1];

  var _sync = useState("loading"); var syncStatus = _sync[0], setSyncStatus = _sync[1];

  var showToast = function(m) { setToast(m); setTimeout(function() { setToast(null); }, 2500); };

  useEffect(function() {
    if (!document.getElementById("crm-pro-css")) { var s = document.createElement("style"); s.id = "crm-pro-css"; s.textContent = CRM_CSS; document.head.appendChild(s); }
    loadCRM().then(function(result) {
      var d = result.data;
      if (d.leads) setLeads(d.leads);
      if (d.tasks) setTasks(d.tasks);
      if (d.comments) setComments(d.comments);
      if (d.calls) setCalls(d.calls);
      if (d.groups && d.groups.length) setGroups(d.groups);
      setSyncStatus(result.source === "supabase" ? "online" : "offline");
    });
  }, []);

  useEffect(function() {
    if (leads.length || tasks.length) {
      cacheSaveCRM({ leads: leads, tasks: tasks, comments: comments, calls: calls, groups: groups });
    }
  }, [leads, tasks, comments, calls, groups]);

  var addLead = function() {
    var l = Object.assign({}, np, { id: uid(), statut: "nouveau", source: "manuel", score: 0, created_at: now(), last_activity: today(), tags: np.tags || [] });
    setLeads(function(p) { return [l].concat(p); }); setNp({ civilite: "", nom: "", prenom: "", raison_sociale: "", etablissement: "", email: "", telephone: "", ville: "", adresse: "", siret: "", type_etablissement: "restaurant", convention: "", effectif: 0, notes: "", tags: [], groupe: "" }); setShowNew(false); showToast("Lead ajout\u00e9");
    dbSaveLead(l);
    logActivityDB({ module: "crm", action: "lead_created", type: "lead_created", leadId: l.id, leadName: l.nom + " " + (l.prenom || ""), details: l.etablissement || "" });
  };
  var updateLead = function(id, updates) {
    var lead = leads.find(function(l) { return l.id === id; });
    var updated = lead ? Object.assign({}, lead, updates, { last_activity: today() }) : null;
    setLeads(function(p) { return p.map(function(l) { return l.id === id ? Object.assign({}, l, updates, { last_activity: today() }) : l; }); });
    if (updated) dbSaveLead(updated);
    if (updates.statut) {
      var lName = lead ? (lead.nom || "") + " " + (lead.prenom || "") : "";
      var lDetail = lead ? lead.etablissement || "" : "";
      if (updates.statut === "perdu") { logActivityDB({ module: "crm", action: "lead_lost", type: "lead_lost", leadId: id, leadName: lName, details: lDetail }); }
      else if (updates.statut === "gagne") { logActivityDB({ module: "crm", action: "lead_won", type: "lead_won", leadId: id, leadName: lName, details: lDetail }); }
      else { logActivityDB({ module: "crm", action: "status_change", type: "status_change", leadId: id, leadName: lName, details: (STATUTS[updates.statut] || {}).label || updates.statut }); }
    }
    if (updates.statut === "gagne") {
      if (lead) {
        var admData = JSON.parse(localStorage.getItem("crm_admin_v3") || '{"leads":[],"formateurs":[]}');
        var exists = admData.leads.some(function(d) { return d.client === (lead.etablissement || lead.nom); });
        if (!exists) {
          var mx = admData.leads.reduce(function(m, l) { var n = parseInt(l.id); return isNaN(n) ? m : Math.max(m, n); }, 0);
          var admLead = { id: String(mx + 1).padStart(3, "0"), client: lead.etablissement || lead.nom || "", formation: "", dateDebut: "", dateFin: "", participants: lead.effectif ? String(lead.effectif) : "", statutOrg: "proposition", statutAkto: "relance", statutProspect: "signe", emailAkto: "", mdpAkto: "", notes: "Cr\u00e9\u00e9 depuis CRM Leads. Contact: " + (lead.nom || "") + " " + (lead.prenom || "") + " " + (lead.telephone || ""), relance: "", formateurNom: "", formateurTel: "" };
          admData.leads.push(admLead);
          localStorage.setItem("crm_admin_v3", JSON.stringify(admData));
          try { var toAdm = { id: admLead.id, client: admLead.client, formation: "", date_debut: "", date_fin: "", participants: admLead.participants, statut_org: "proposition", statut_akto: "relance", statut_prospect: "signe", email_akto: "", mdp_akto: "", notes: admLead.notes, relance: "", formateur_nom: "", formateur_tel: "" }; supabase.from("leads").upsert(toAdm); } catch (e) {}
          showToast("\u{1F4C2} Dossier admin cr\u00e9\u00e9 pour " + (lead.etablissement || lead.nom));
        }
      }
    }
  };
  var trashLead = function(id) { setLeads(function(p) { return p.map(function(l) { return l.id === id ? Object.assign({}, l, { trashed: true, trashed_at: now() }) : l; }); }); setSelectedId(null); showToast("\u{1F5D1} Lead mis \u00e0 la corbeille");
    var tl = leads.find(function(x) { return x.id === id; }); if (tl) dbSaveLead(Object.assign({}, tl, { trashed: true, trashed_at: new Date().toISOString() }));
  };
  var restoreLead = function(id) { setLeads(function(p) { return p.map(function(l) { return l.id === id ? Object.assign({}, l, { trashed: false, trashed_at: null }) : l; }); }); showToast("\u2705 Lead restaur\u00e9");
    var rl = leads.find(function(x) { return x.id === id; }); if (rl) dbSaveLead(Object.assign({}, rl, { trashed: false, trashed_at: null }));
  };
  var deletePermanent = function(id) { setLeads(function(p) { return p.filter(function(l) { return l.id !== id; }); }); setTasks(function(p) { return p.filter(function(t) { return t.lead_id !== id; }); }); setComments(function(p) { return p.filter(function(c) { return c.lead_id !== id; }); }); setCalls(function(p) { return p.filter(function(c) { return c.lead_id !== id; }); }); showToast("Lead supprim\u00e9 d\u00e9finitivement"); };
  var emptyTrash = function() { if (!confirm("Vider la corbeille ? Cette action est irr\u00e9versible.")) return; var trIds = leads.filter(function(l) { return l.trashed; }).map(function(l) { return l.id; }); setLeads(function(p) { return p.filter(function(l) { return !l.trashed; }); }); setTasks(function(p) { return p.filter(function(t) { return trIds.indexOf(t.lead_id) === -1; }); }); setComments(function(p) { return p.filter(function(c) { return trIds.indexOf(c.lead_id) === -1; }); }); setCalls(function(p) { return p.filter(function(c) { return trIds.indexOf(c.lead_id) === -1; }); }); showToast("Corbeille vid\u00e9e"); };
  var trashedLeads = leads.filter(function(l) { return l.trashed; });
  var activeLeads = leads.filter(function(l) { return !l.trashed; });

  var addTask = function() {
    if (!newTask.title || !newTask.lead_id) { showToast("Titre et lead requis"); return; }
    var t = Object.assign({}, newTask, { id: uid(), done: false, created_at: now() });
    setTasks(function(p) { return [t].concat(p); }); addComment(newTask.lead_id, "T\u00e2che cr\u00e9\u00e9e : " + newTask.title + " (" + fmtDate(newTask.date) + " " + newTask.heure + ")"); setShowTask(false); setNewTask({ lead_id: "", type: "appel", title: "", date: today(), heure: "09:00", notes: "" }); showToast("T\u00e2che ajout\u00e9e");
    dbSaveTask(t);
  };
  var completeTask = function(taskId, comment) { setTasks(function(p) { return p.map(function(t) { return t.id === taskId ? Object.assign({}, t, { done: true, completed_at: now(), completion_comment: comment || "" }) : t; }); }); var task = tasks.find(function(t) { return t.id === taskId; }); if (task) { addComment(task.lead_id, "T\u00e2che termin\u00e9e : " + task.title + (comment ? " \u2014 " + comment : "")); logActivityDB({ module: "crm", action: "task_completed", type: "task_completed", leadId: task.lead_id, details: task.title }); } showToast("T\u00e2che termin\u00e9e");
    dbSaveTask(Object.assign({}, task || {}, { done: true, completed_at: new Date().toISOString(), completion_comment: comment || "" }));
  };
  var deleteTask = function(taskId) { setTasks(function(p) { return p.filter(function(t) { return t.id !== taskId; }); }); deleteTaskDB(taskId); };
  var moveTask = function(taskId, newDate, newHeure) { var task = tasks.find(function(t) { return t.id === taskId; }); if (!task) return; var oldInfo = fmtDate(task.date) + " " + fmtTime(task.heure); setTasks(function(p) { return p.map(function(t) { return t.id === taskId ? Object.assign({}, t, { date: newDate, heure: newHeure }) : t; }); }); if (task.lead_id) { addComment(task.lead_id, "T\u00e2che d\u00e9plac\u00e9e du " + oldInfo + " au " + fmtDate(newDate) + " " + newHeure); } showToast("T\u00e2che d\u00e9plac\u00e9e");
    dbSaveTask(Object.assign({}, task || {}, { date: newDate, heure: newHeure }));
  };
  var addComment = function(leadId, text) { var cm = { id: uid(), lead_id: leadId, text: text, date: now() }; setComments(function(p) { return [cm].concat(p); }); dbSaveComment(cm); };

  var logCall = function() {
    if (!newCall.resume || !newCall.lead_id) { showToast("R\u00e9sum\u00e9 requis"); return; }
    var c = Object.assign({}, newCall, { id: uid(), date: now() }); setCalls(function(p) { return [c].concat(p); }); dbSaveCall(c); addComment(newCall.lead_id, "\u{1F4DE} Appel " + newCall.type + " (" + newCall.duree + " min) \u2014 " + newCall.resume);
    logActivityDB({ module: "crm", action: "call_logged", type: "call_logged", leadId: newCall.lead_id, details: newCall.type + " " + newCall.duree + "min" }); if (newCall.new_statut) updateLead(newCall.lead_id, { statut: newCall.new_statut }); if (newCall.followup && newCall.followup_date) { var ft = { id: uid(), lead_id: newCall.lead_id, type: "relance", title: newCall.followup, date: newCall.followup_date, heure: "09:00", done: false, created_at: now(), notes: "" }; setTasks(function(p) { return [ft].concat(p); }); } updateLead(newCall.lead_id, { last_call: today() }); setShowCall(false); setNewCall({ lead_id: "", type: "D\u00e9couverte", duree: 15, resume: "", new_statut: "", followup: "", followup_date: "" }); showToast("Appel enregistr\u00e9");
  };

  var importLeads = function(newLeads) { setLeads(function(p) { return newLeads.concat(p); }); showToast(newLeads.length + " lead(s) import\u00e9(s)"); dbBulkImport(newLeads); };

  var selected = leads.find(function(l) { return l.id === selectedId; });
  var filtered = useMemo(function() {
    var f = activeLeads.slice();
    if (search) { var q = search.toLowerCase(); f = f.filter(function(l) { return (l.nom || "").toLowerCase().includes(q) || (l.prenom || "").toLowerCase().includes(q) || (l.etablissement || "").toLowerCase().includes(q) || (l.email || "").toLowerCase().includes(q) || (l.telephone || "").includes(q) || (l.ville || "").toLowerCase().includes(q) || (l.tags || []).join(" ").toLowerCase().includes(q); }); }
    if (filterStatut !== "all") f = f.filter(function(l) { return l.statut === filterStatut; });
    if (filterGroup !== "all") f = f.filter(function(l) { return l.groupe === filterGroup; });
    if (filterChip === "retard") f = f.filter(function(l) { return tasks.some(function(t) { return t.lead_id === l.id && !t.done && isPast(t.date); }); });
    else if (filterChip === "inactif") f = f.filter(function(l) { return daysDiff(l.last_activity) < -7; });
    else if (filterChip === "today") f = f.filter(function(l) { return tasks.some(function(t) { return t.lead_id === l.id && !t.done && isToday(t.date); }); });
    else if (filterChip === "gagne") f = f.filter(function(l) { return l.statut === "gagne"; });
    else if (filterChip === "refus") f = f.filter(function(l) { return l.statut === "refus_qualif"; });
    f.sort(function(a, b) { return calcScore(b, tasks) - calcScore(a, tasks); }); return f;
  }, [activeLeads, search, filterStatut, filterGroup, filterChip, tasks]);

  var stats = useMemo(function() { var retard = activeLeads.filter(function(l) { return tasks.some(function(t) { return t.lead_id === l.id && !t.done && isPast(t.date); }); }).length; var inactif = activeLeads.filter(function(l) { return daysDiff(l.last_activity) < -7; }).length; var todayCount = activeLeads.filter(function(l) { return tasks.some(function(t) { return t.lead_id === l.id && !t.done && isToday(t.date); }); }).length; var gagnes = activeLeads.filter(function(l) { return l.statut === "gagne"; }).length; var refus = activeLeads.filter(function(l) { return l.statut === "refus_qualif"; }).length; return { total: activeLeads.length, retard: retard, inactif: inactif, today: todayCount, gagnes: gagnes, refus: refus, trashed: trashedLeads.length }; }, [activeLeads, trashedLeads, tasks]);

  var taskStats = useMemo(function() { var allActive = tasks.filter(function(t) { return !t.done; }); return { overdue: allActive.filter(function(t) { return isPast(t.date); }).length, today: allActive.filter(function(t) { return isToday(t.date); }).length, total: allActive.length }; }, [tasks]);

  var getLeadTasks = function(id) { return tasks.filter(function(t) { return t.lead_id === id; }).sort(function(a, b) { return (a.done ? 1 : 0) - (b.done ? 1 : 0) || (a.date || "").localeCompare(b.date || ""); }); };
  var getLeadComments = function(id) { return comments.filter(function(c) { return c.lead_id === id; }); };
  var getLeadCalls = function(id) { return calls.filter(function(c) { return c.lead_id === id; }); };
  var getNextTask = function(id) { return tasks.filter(function(t) { return t.lead_id === id && !t.done; }).sort(function(a, b) { return (a.date || "").localeCompare(b.date || ""); })[0]; };
  var getOccupiedSlots = function(date) { return tasks.filter(function(t) { return t.date === date && !t.done; }).map(function(t) { return t.heure; }); };
  var onDrop = function(statut) { if (dragId) { updateLead(dragId, { statut: statut }); addComment(dragId, "Statut chang\u00e9 \u2192 " + (STATUTS[statut] || {}).label); setDragId(null); } };

  var exportCSV = function() {
    var headers = "civilite;nom;prenom;raison_sociale;etablissement;email;telephone;adresse;ville;siret;effectif;type;convention;statut;groupe;tags;notes;score;created_at";
    var rows = activeLeads.map(function(l) { var s = calcScore(l, tasks); var gl = getGroupLabel(groups, l.groupe); return [l.civilite, l.nom, l.prenom, l.raison_sociale, l.etablissement, l.email, l.telephone, l.adresse, l.ville, l.siret, l.effectif, l.type_etablissement, l.convention, l.statut, gl, (l.tags || []).join(","), (l.notes || "").replace(/;/g, ","), s, l.created_at].join(";"); });
    var csv = "\uFEFF" + headers + "\n" + rows.join("\n"); var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" }); var url = URL.createObjectURL(blob); var a = document.createElement("a"); a.href = url; a.download = "leads_lab_learning_" + today() + ".csv"; a.click(); URL.revokeObjectURL(url); showToast("Export CSV t\u00e9l\u00e9charg\u00e9");
  };

  var Tag = function(props) { var idx = (props.text || "").length % TAG_COLORS.length; var col = props.color || TAG_COLORS[idx]; return React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: col + "18", color: col, whiteSpace: "nowrap" } }, props.text); };
  var ScoreBadge = function(props) { var s = props.score || 0; var col = s >= 70 ? "#10B981" : s >= 40 ? "#F59E0B" : "#94A3B8"; return React.createElement("div", { style: { width: 36, height: 36, borderRadius: "50%", border: "3px solid " + col, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fm)", fontSize: 11, fontWeight: 700, color: col, flexShrink: 0 } }, s); };
  var TaskBadge = function(props) { var t = props.task; if (!t) return null; var overdue = isPast(t.date); var isT = isToday(t.date); var col = overdue ? "#EF4444" : isT ? "#F59E0B" : "#3B82F6"; var bg = overdue ? "#FEF2F2" : isT ? "#FFFBEB" : "#EFF6FF"; var tt = TASK_TYPES.find(function(x) { return x.id === t.type; }); return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 8, background: bg, border: "1px solid " + col + "30", fontSize: 11, fontWeight: 600, color: col } }, (tt ? tt.icon + " " : "") + t.title + " \u00b7 " + fmtDate(t.date)); };

  var crmProps = { leads: activeLeads, tasks: tasks, comments: comments, calls: calls, groups: groups, setLeads: setLeads, setTasks: setTasks, setComments: setComments, setCalls: setCalls, setGroups: setGroups, showToast: showToast, addComment: addComment, completeTask: completeTask, moveTask: moveTask, deleteTask: deleteTask, importLeads: importLeads, updateLead: updateLead, getOccupiedSlots: getOccupiedSlots, setSelectedId: setSelectedId, setDetailTab: setDetailTab, setPage: setPage, setNewTask: setNewTask, setShowTask: setShowTask, newTask: newTask, showCompleteTask: showCompleteTask, setShowCompleteTask: setShowCompleteTask, showMoveTask: showMoveTask, setShowMoveTask: setShowMoveTask, showTaskPopup: showTaskPopup, setShowTaskPopup: setShowTaskPopup, showImport: showImport, setShowImport: setShowImport, showMassEmail: showMassEmail, setShowMassEmail: setShowMassEmail, showGroupMgr: showGroupMgr, setShowGroupMgr: setShowGroupMgr, selectedLeads: selectedLeads, Tag: Tag, ScoreBadge: ScoreBadge, TaskBadge: TaskBadge };

  if (page === "agenda") return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg)", color: "var(--t1)" } }, React.createElement(CRMAgenda, crmProps), React.createElement(CRMModals, crmProps), renderToast());
  if (showTrash) return renderTrashView();
  if (selectedId && selected) return renderDetail();
  return renderDashboard();

  function renderTrashView() {
    return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg)", color: "var(--t1)", padding: "24px 28px" } },
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16 } },
          React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setShowTrash(false); } }, "\u2190 Retour"),
          React.createElement("div", null,
            React.createElement("h1", { style: { fontFamily: "var(--fd)", fontSize: 24, fontWeight: 800 } }, "\u{1F5D1} Corbeille"),
            React.createElement("p", { style: { color: "var(--t2)", fontSize: 13, marginTop: 4 } }, trashedLeads.length + " lead(s) dans la corbeille")
          )
        ),
        trashedLeads.length > 0 ? React.createElement("button", { className: "crm-btn crm-btn-d crm-btn-sm", onClick: emptyTrash }, "\u{1F5D1} Vider la corbeille") : null
      ),
      trashedLeads.length === 0 ? React.createElement("div", { style: { textAlign: "center", padding: 64, color: "var(--tm)" } }, React.createElement("div", { style: { fontSize: 56, marginBottom: 16 } }, "\u2705"), React.createElement("div", { style: { fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, color: "var(--t1)" } }, "Corbeille vide")) :
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 12 } },
        trashedLeads.map(function(l) {
          var scfg = STATUTS[l.statut] || STATUTS.nouveau;
          return React.createElement("div", { key: l.id, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 18, opacity: .7, borderLeft: "4px solid #9CA3AF" } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 } },
              React.createElement("div", null,
                React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--t2)" } }, (l.nom || "") + (l.prenom ? " " + l.prenom : "")),
                l.etablissement && React.createElement("div", { style: { fontSize: 12, color: "var(--tm)", marginTop: 2 } }, l.etablissement),
                React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginTop: 2 } }, [l.telephone, l.ville].filter(Boolean).join(" \u00b7 "))
              ),
              React.createElement("span", { style: { padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: scfg.bg, color: scfg.color } }, scfg.label)
            ),
            l.trashed_at && React.createElement("div", { style: { fontSize: 10, color: "var(--tm)", marginBottom: 8 } }, "Supprim\u00e9 le " + new Date(l.trashed_at).toLocaleDateString("fr-FR")),
            React.createElement("div", { style: { display: "flex", gap: 8 } },
              React.createElement("button", { className: "crm-btn crm-btn-a crm-btn-sm", onClick: function() { restoreLead(l.id); } }, "\u2705 Restaurer"),
              React.createElement("button", { className: "crm-btn crm-btn-d crm-btn-sm", onClick: function() { if (confirm("Supprimer d\u00e9finitivement ?")) deletePermanent(l.id); } }, "\u{1F5D1} Supprimer")
            )
          );
        })
      ),
      renderToast()
    );
  }

  function renderToast() { if (!toast) return null; return React.createElement("div", { style: { position: "fixed", bottom: 24, right: 24, padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 300, background: "rgba(89,213,151,.15)", color: "#59D597", border: "1px solid rgba(89,213,151,.3)", backdropFilter: "blur(10px)", animation: "fadeUp .3s ease" } }, toast); }

  function renderBanner() {
    if (!showBanner || (taskStats.overdue === 0 && taskStats.today === 0)) return null;
    return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 } },
      taskStats.overdue > 0 ? React.createElement("div", { className: "crm-banner", style: { background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)" } },
        React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: "#F87171" } }, "\u{1F534} " + taskStats.overdue + " t\u00e2che(s) en retard"),
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
          React.createElement("button", { className: "crm-btn crm-btn-sm", style: { background: "rgba(239,68,68,.15)", color: "#F87171", border: "1px solid rgba(239,68,68,.3)" }, onClick: function() { setPage("agenda"); } }, "Voir l'agenda"),
          React.createElement("button", { style: { background: "none", border: "none", color: "#F87171", cursor: "pointer", fontSize: 16 }, onClick: function() { setShowBanner(false); } }, "\u2715")
        )
      ) : null,
      taskStats.today > 0 ? React.createElement("div", { className: "crm-banner", style: { background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.25)" } },
        React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: "#60A5FA" } }, "\u{1F4CB} " + taskStats.today + " t\u00e2che(s) pr\u00e9vues aujourd'hui"),
        React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
          React.createElement("button", { className: "crm-btn crm-btn-sm", style: { background: "rgba(59,130,246,.15)", color: "#60A5FA", border: "1px solid rgba(59,130,246,.3)" }, onClick: function() { setPage("agenda"); } }, "Voir l'agenda"),
          React.createElement("button", { style: { background: "none", border: "none", color: "#60A5FA", cursor: "pointer", fontSize: 16 }, onClick: function() { setShowBanner(false); } }, "\u2715")
        )
      ) : null
    );
  }

  function renderDashboard() {
    return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg)", color: "var(--t1)", padding: "24px 28px" } },
      renderBanner(),
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 } },
        React.createElement("div", null, React.createElement("h1", { style: { fontFamily: "var(--fd)", fontSize: 26, fontWeight: 800 } }, "Leads"), React.createElement("p", { style: { color: "var(--t2)", fontSize: 13, marginTop: 4 } }, filtered.length + " r\u00e9sultat" + (filtered.length > 1 ? "s" : ""))),
        React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setPage("agenda"); } }, "\u{1F4C5} Agenda"),
          React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setShowImport(true); } }, "\u{1F4E5} Importer"),
          React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: exportCSV }, "\u{1F4CA} Exporter"),
          React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setShowGroupMgr(true); } }, "\u{1F4C1} Groupes"),
          React.createElement("button", { className: "crm-btn crm-btn-a crm-btn-sm", onClick: function() { setShowNew(true); } }, "+ Lead"),
          stats.trashed > 0 ? React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setShowTrash(true); }, style: { color: "#9CA3AF" } }, "\u{1F5D1} Corbeille (" + stats.trashed + ")") : null
        )
      ),
      React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" } },
        [{ id: "all", l: "Total " + stats.total, c: "var(--a)" }, { id: "today", l: "\u{1F4CB} Aujourd'hui " + stats.today, c: "#3B82F6" }, { id: "retard", l: "\u{1F534} Retard " + stats.retard, c: "#EF4444" }, { id: "inactif", l: "\u{1F4A4} Inactifs " + stats.inactif, c: "#F59E0B" }, { id: "gagne", l: "\u{1F3C6} Gagn\u00e9s " + stats.gagnes, c: "#10B981" }, { id: "refus", l: "\u{1F6AB} Refus " + stats.refus, c: "#9CA3AF" }].map(function(chip) { var active = filterChip === chip.id; return React.createElement("button", { key: chip.id, onClick: function() { setFilterChip(active ? "all" : chip.id); }, style: { padding: "6px 14px", borderRadius: 20, border: active ? "1px solid " + chip.c : "1px solid var(--bd)", background: active ? chip.c + "18" : "var(--c)", color: active ? chip.c : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600 } }, chip.l); })
      ),
      React.createElement("div", { style: { display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" } },
        React.createElement("input", { className: "crm-inp", placeholder: "\u{1F50D} Rechercher...", value: search, onChange: function(e) { setSearch(e.target.value); }, style: { flex: 1, minWidth: 200, maxWidth: 350 } }),
        React.createElement("select", { className: "crm-inp", value: filterGroup, onChange: function(e) { setFilterGroup(e.target.value); }, style: { width: 200 } }, React.createElement("option", { value: "all" }, "Tous les groupes"), groups.map(function(g) { return React.createElement("option", { key: g.id, value: g.id }, g.parent + " > " + g.label); })),
        React.createElement("div", { style: { display: "flex", background: "var(--c)", borderRadius: 8, border: "1px solid var(--bd)", overflow: "hidden" } },
          ["cards", "kanban", "table"].map(function(v) { var labels = { cards: "\u{1F0CF} Cartes", kanban: "\u{1F4CA} Kanban", table: "\u{1F4CB} Tableau" }; return React.createElement("button", { key: v, onClick: function() { setView(v); }, style: { padding: "8px 14px", border: "none", borderRight: "1px solid var(--bd)", background: view === v ? "var(--ag)" : "transparent", color: view === v ? "var(--a)" : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: view === v ? 600 : 500 } }, labels[v]); })
        )
      ),
      React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" } },
        React.createElement("button", { onClick: function() { setFilterStatut("all"); }, style: { padding: "5px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: filterStatut === "all" ? "2px solid var(--a)" : "1px solid var(--bd)", background: filterStatut === "all" ? "var(--ag)" : "var(--sf)", color: filterStatut === "all" ? "var(--a)" : "var(--tm)", fontFamily: "var(--fb)" } }, "Tous"),
        Object.entries(STATUTS).map(function(entry) { var k = entry[0], cfg = entry[1]; var count = activeLeads.filter(function(l) { return l.statut === k; }).length; return React.createElement("button", { key: k, onClick: function() { setFilterStatut(filterStatut === k ? "all" : k); }, style: { padding: "5px 12px", borderRadius: 16, fontSize: 11, fontWeight: 600, cursor: "pointer", border: filterStatut === k ? "2px solid " + cfg.color : "1px solid var(--bd)", background: filterStatut === k ? cfg.bg : "var(--sf)", color: filterStatut === k ? cfg.color : "var(--tm)", fontFamily: "var(--fb)" } }, cfg.label + " " + count); })
      ),
      selectedLeads.length > 0 && view === "table" ? React.createElement("div", { style: { marginBottom: 12 } }, React.createElement("button", { className: "crm-btn crm-btn-p crm-btn-sm", onClick: function() { setShowMassEmail(true); } }, "\u2709\uFE0F Email en masse (" + selectedLeads.length + ")")) : null,
      view === "cards" ? renderCards() : view === "kanban" ? renderKanban() : renderTable(),
      showNew ? renderNewModal() : null,
      showTask ? renderTaskModal() : null,
      showCall ? renderCallModal() : null,
      React.createElement(CRMModals, crmProps),
      renderToast()
    );
  }

  function renderCards() {
    if (!filtered.length) return React.createElement("div", { style: { textAlign: "center", padding: 64, color: "var(--tm)" } }, React.createElement("div", { style: { fontSize: 56, marginBottom: 16 } }, "\u{1F50D}"), React.createElement("div", { style: { fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, color: "var(--t1)", marginBottom: 8 } }, "Aucun lead"), React.createElement("button", { className: "crm-btn crm-btn-a crm-btn-sm", onClick: function() { setShowNew(true); } }, "+ Ajouter"));
    return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 12 } },
      filtered.map(function(l) { var score = calcScore(l, tasks); var next = getNextTask(l.id); var overdueTasks = tasks.filter(function(t) { return t.lead_id === l.id && !t.done && isPast(t.date); }); var scfg = STATUTS[l.statut] || STATUTS.nouveau; var gl = getGroupLabel(groups, l.groupe);
        return React.createElement("div", { key: l.id, onClick: function() { setSelectedId(l.id); setDetailTab("info"); }, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 18, cursor: "pointer", transition: ".15s", borderLeft: "4px solid " + scfg.color } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 } },
            React.createElement("div", null, React.createElement("div", { style: { fontSize: 15, fontWeight: 700, color: "var(--a)" } }, (l.civilite ? l.civilite + " " : "") + (l.nom || "") + (l.prenom ? " " + l.prenom : "")), l.etablissement && React.createElement("div", { style: { fontSize: 12, color: "var(--tm)", marginTop: 2 } }, l.etablissement), React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginTop: 2 } }, [l.telephone, l.ville].filter(Boolean).join(" \u00b7 "))),
            React.createElement(ScoreBadge, { score: score })
          ),
          next ? React.createElement(TaskBadge, { task: next }) : null,
          overdueTasks.length > 0 && !next ? React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: "#EF4444", marginTop: 6 } }, "\u26A0 " + overdueTasks.length + " t\u00e2che(s) en retard") : null,
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" } },
            React.createElement("span", { style: { padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: scfg.bg, color: scfg.color } }, scfg.label),
            gl ? React.createElement("span", { style: { padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: "rgba(89,213,151,.1)", color: "var(--a)" } }, gl) : null,
            (l.tags || []).map(function(tag, i) { return React.createElement(Tag, { key: i, text: tag }); })
          )
        );
      })
    );
  }

  function renderKanban() {
    return React.createElement("div", { style: { display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 } },
      Object.entries(STATUTS).map(function(entry) { var key = entry[0], cfg = entry[1]; var items = filtered.filter(function(l) { return l.statut === key; });
        return React.createElement("div", { key: key, style: { minWidth: 260, maxWidth: 290, flexShrink: 0 }, onDragOver: function(e) { e.preventDefault(); }, onDrop: function() { onDrop(key); } },
          React.createElement("div", { style: { padding: "10px 14px", borderRadius: "12px 12px 0 0", background: "var(--c)", border: "1px solid var(--bd)", borderBottom: "2px solid " + cfg.color, display: "flex", justifyContent: "space-between" } }, React.createElement("span", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: cfg.color } }, cfg.label), React.createElement("span", { style: { fontFamily: "var(--fm)", fontSize: 11, background: "var(--sf)", padding: "2px 8px", borderRadius: 10, color: "var(--tm)" } }, items.length)),
          React.createElement("div", { style: { background: "var(--sf)", border: "1px solid var(--bd)", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 8, display: "flex", flexDirection: "column", gap: 6, minHeight: 80 } },
            items.map(function(l) { return React.createElement("div", { key: l.id, draggable: true, onDragStart: function() { setDragId(l.id); }, onClick: function() { setSelectedId(l.id); setDetailTab("info"); }, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 8, padding: 12, cursor: "grab" } }, React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--a)", marginBottom: 4 } }, l.nom + (l.prenom ? " " + l.prenom : "")), l.etablissement && React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginBottom: 4 } }, l.etablissement), React.createElement(TaskBadge, { task: getNextTask(l.id) })); }),
            !items.length && React.createElement("div", { style: { padding: 16, textAlign: "center", fontSize: 11, color: "var(--tm)", fontStyle: "italic" } }, "Glissez ici")
          )
        );
      })
    );
  }

  function renderTable() {
    var allSelected = filtered.length > 0 && selectedLeads.length === filtered.length;
    return React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, overflow: "auto" } },
      React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", minWidth: 1000 } },
        React.createElement("thead", null, React.createElement("tr", { style: { background: "rgba(148,163,184,.03)" } },
          React.createElement("th", { style: { padding: "12px 10px", borderBottom: "1px solid var(--bd)", width: 40 } }, React.createElement("input", { type: "checkbox", className: "crm-checkbox", checked: allSelected, onChange: function() { setSelectedLeads(allSelected ? [] : filtered.map(function(l) { return l.id; })); } })),
          ["Contact", "\u00c9tablissement", "Ville", "T\u00e9l", "Groupe", "Statut", "T\u00e2che", "Score"].map(function(h) { return React.createElement("th", { key: h, style: { padding: "12px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--tm)", textAlign: "left", borderBottom: "1px solid var(--bd)" } }, h); })
        )),
        React.createElement("tbody", null, filtered.map(function(l) { var scfg = STATUTS[l.statut] || STATUTS.nouveau; var next = getNextTask(l.id); var score = calcScore(l, tasks); var gl = getGroupLabel(groups, l.groupe); var isChecked = selectedLeads.indexOf(l.id) !== -1;
          return React.createElement("tr", { key: l.id, style: { cursor: "pointer" } },
            React.createElement("td", { style: { padding: "12px 10px", borderBottom: "1px solid var(--bd)" }, onClick: function(e) { e.stopPropagation(); } }, React.createElement("input", { type: "checkbox", className: "crm-checkbox", checked: isChecked, onChange: function() { setSelectedLeads(isChecked ? selectedLeads.filter(function(x) { return x !== l.id; }) : selectedLeads.concat([l.id])); } })),
            React.createElement("td", { onClick: function() { setSelectedId(l.id); setDetailTab("info"); }, style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)", fontWeight: 600, color: "var(--a)" } }, l.nom + (l.prenom ? " " + l.prenom : "")),
            React.createElement("td", { onClick: function() { setSelectedId(l.id); }, style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)", fontSize: 13 } }, l.etablissement || "\u2014"),
            React.createElement("td", { onClick: function() { setSelectedId(l.id); }, style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)", fontSize: 13, color: "var(--t2)" } }, l.ville || "\u2014"),
            React.createElement("td", { onClick: function() { setSelectedId(l.id); }, style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)", fontSize: 12, fontFamily: "var(--fm)" } }, l.telephone || "\u2014"),
            React.createElement("td", { onClick: function() { setSelectedId(l.id); }, style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)", fontSize: 11, color: "var(--tm)" } }, gl || "\u2014"),
            React.createElement("td", { onClick: function() { setSelectedId(l.id); }, style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)" } }, React.createElement("span", { style: { padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: scfg.bg, color: scfg.color } }, scfg.label)),
            React.createElement("td", { onClick: function() { setSelectedId(l.id); }, style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)" } }, next ? React.createElement(TaskBadge, { task: next }) : React.createElement("span", { style: { fontSize: 11, color: "var(--tm)" } }, "\u2014")),
            React.createElement("td", { onClick: function() { setSelectedId(l.id); }, style: { padding: "12px 14px", borderBottom: "1px solid var(--bd)", textAlign: "center" } }, React.createElement(ScoreBadge, { score: score }))
          );
        }))
      )
    );
  }

  function renderDetail() {
    var l = selected; var lt = getLeadTasks(l.id); var lc = getLeadComments(l.id); var lcalls = getLeadCalls(l.id); var score = calcScore(l, tasks); var scfg = STATUTS[l.statut] || STATUTS.nouveau; var gl = getGroupLabel(groups, l.groupe);
    return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg)", color: "var(--t1)" } },
      React.createElement("div", { style: { padding: "20px 28px", borderBottom: "1px solid var(--bd)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16 } }, React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setSelectedId(null); } }, "\u2190 Retour"), React.createElement("div", null, React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800 } }, (l.civilite ? l.civilite + " " : "") + l.nom + (l.prenom ? " " + l.prenom : "")), React.createElement("p", { style: { fontSize: 13, color: "var(--tm)" } }, [l.etablissement, l.ville, gl].filter(Boolean).join(" \u00b7 ")))),
        React.createElement("div", { style: { display: "flex", gap: 8 } }, React.createElement("button", { className: "crm-btn crm-btn-p crm-btn-sm", onClick: function() { setNewCall(Object.assign({}, newCall, { lead_id: l.id })); setShowCall(true); } }, "\u{1F4DE} Appel"), React.createElement("button", { className: "crm-btn crm-btn-a crm-btn-sm", onClick: function() { setNewTask(Object.assign({}, newTask, { lead_id: l.id })); setShowTask(true); } }, "+ T\u00e2che"), React.createElement("button", { className: "crm-btn crm-btn-d crm-btn-sm", onClick: function() { trashLead(l.id); } }, "\u{1F5D1} Corbeille"))
      ),
      React.createElement("div", { style: { display: "flex", gap: 0, minHeight: "calc(100vh - 80px)" } },
        React.createElement("div", { style: { flex: 1, padding: "24px 28px", overflowY: "auto" } },
          React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 20 } }, ["info", "historique", "appels"].map(function(tab) { var labels = { info: "\u{1F4CB} Infos", historique: "\u{1F550} Historique", appels: "\u{1F4DE} Appels" }; return React.createElement("button", { key: tab, onClick: function() { setDetailTab(tab); }, style: { padding: "6px 14px", borderRadius: 20, border: detailTab === tab ? "1px solid var(--a)" : "1px solid var(--bd)", background: detailTab === tab ? "var(--ag)" : "var(--c)", color: detailTab === tab ? "var(--a)" : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600 } }, labels[tab]); })),
          detailTab === "info" ? React.createElement("div", null,
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 } }, [["Civilit\u00e9", l.civilite], ["Nom", l.nom], ["Pr\u00e9nom", l.prenom], ["Raison sociale", l.raison_sociale], ["\u00c9tablissement", l.etablissement], ["Email", l.email], ["T\u00e9l\u00e9phone", l.telephone], ["Ville", l.ville], ["Adresse", l.adresse], ["SIRET", l.siret], ["Type", TYPE_LABELS[l.type_etablissement]], ["Effectif", l.effectif ? l.effectif + " sal." : ""], ["Convention", l.convention], ["Groupe", gl]].map(function(pair) { return React.createElement("div", { key: pair[0], style: { background: "var(--sf)", borderRadius: 8, padding: "10px 14px" } }, React.createElement("div", { className: "crm-lbl", style: { marginBottom: 4 } }, pair[0]), React.createElement("div", { style: { fontSize: 14, fontWeight: 500 } }, pair[1] || "\u2014")); })),
            React.createElement("div", { style: { marginBottom: 20 } }, React.createElement("div", { className: "crm-lbl" }, "Groupe / Provenance"), React.createElement("select", { className: "crm-inp", value: l.groupe || "", onChange: function(e) { updateLead(l.id, { groupe: e.target.value }); addComment(l.id, "Groupe chang\u00e9 \u2192 " + getGroupLabel(groups, e.target.value)); }, style: { maxWidth: 300 } }, React.createElement("option", { value: "" }, "Aucun groupe"), groups.map(function(g) { return React.createElement("option", { key: g.id, value: g.id }, g.parent + " > " + g.label); }))),
            React.createElement("div", { style: { marginBottom: 20 } }, React.createElement("div", { className: "crm-lbl" }, "Tags"), React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, (l.tags || []).map(function(tag, i) { return React.createElement(Tag, { key: i, text: tag }); }), React.createElement("button", { onClick: function() { var t = prompt("Nouveau tag :"); if (t && t.trim()) updateLead(l.id, { tags: (l.tags || []).concat([t.trim()]) }); }, style: { fontSize: 11, color: "var(--tm)", cursor: "pointer", background: "none", border: "1px dashed var(--bd)", borderRadius: 12, padding: "2px 10px" } }, "+ Ajouter"))),
            l.notes ? React.createElement("div", { style: { background: "var(--sf)", borderRadius: 8, padding: 14 } }, React.createElement("div", { className: "crm-lbl" }, "Notes"), React.createElement("div", { style: { fontSize: 13, color: "var(--t2)", whiteSpace: "pre-wrap" } }, l.notes)) : null
          ) : null,
          detailTab === "historique" ? React.createElement("div", null, lc.length ? lc.map(function(c) { return React.createElement("div", { key: c.id, style: { display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--bd)" } }, React.createElement("div", { style: { width: 8, height: 8, borderRadius: "50%", background: "var(--a)", marginTop: 6, flexShrink: 0 } }), React.createElement("div", null, React.createElement("div", { style: { fontSize: 13 } }, c.text), React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginTop: 4 } }, new Date(c.date).toLocaleString("fr-FR")))); }) : React.createElement("div", { style: { textAlign: "center", padding: 32, color: "var(--tm)" } }, "Aucun historique")) : null,
          detailTab === "appels" ? React.createElement("div", null, lcalls.length ? lcalls.map(function(c) { return React.createElement("div", { key: c.id, style: { background: "var(--sf)", borderRadius: 10, padding: 16, marginBottom: 10 } }, React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 } }, React.createElement("span", { style: { fontWeight: 700, color: "var(--a)" } }, "\u{1F4DE} " + c.type), React.createElement("span", { style: { fontSize: 12, color: "var(--tm)" } }, c.duree + " min \u00b7 " + new Date(c.date).toLocaleDateString("fr-FR"))), React.createElement("div", { style: { fontSize: 13, color: "var(--t2)" } }, c.resume)); }) : React.createElement("div", { style: { textAlign: "center", padding: 32, color: "var(--tm)" } }, "Aucun appel")) : null,
          React.createElement("div", { style: { marginTop: 20, display: "flex", gap: 8 } }, React.createElement("input", { className: "crm-inp", placeholder: "Ajouter un commentaire...", id: "comment-input", onKeyDown: function(e) { if (e.key === "Enter" && e.target.value.trim()) { addComment(l.id, e.target.value.trim()); e.target.value = ""; } }, style: { flex: 1 } }), React.createElement("button", { className: "crm-btn crm-btn-p crm-btn-sm", onClick: function() { var inp = document.getElementById("comment-input"); if (inp && inp.value.trim()) { addComment(l.id, inp.value.trim()); inp.value = ""; } } }, "Envoyer"))
        ),
        React.createElement("div", { style: { width: 320, borderLeft: "1px solid var(--bd)", padding: "24px 20px", overflowY: "auto", background: "var(--sf)" } },
          React.createElement("div", { style: { textAlign: "center", marginBottom: 20 } }, React.createElement("div", { style: { width: 64, height: 64, borderRadius: "50%", border: "4px solid " + (score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#94A3B8"), display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--fm)", fontSize: 22, fontWeight: 800, color: score >= 70 ? "#10B981" : score >= 40 ? "#F59E0B" : "#94A3B8" } }, score), React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginTop: 6 } }, "Score priorit\u00e9")),
          React.createElement("div", { className: "crm-lbl", style: { marginBottom: 8 } }, "Statut"),
          React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 20 } }, Object.entries(STATUTS).map(function(entry) { var k = entry[0], cfg = entry[1]; return React.createElement("button", { key: k, onClick: function() { updateLead(l.id, { statut: k }); addComment(l.id, "Statut \u2192 " + cfg.label); }, style: { padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600, cursor: "pointer", border: l.statut === k ? "2px solid " + cfg.color : "1px solid var(--bd)", background: l.statut === k ? cfg.bg : "transparent", color: l.statut === k ? cfg.color : "var(--tm)", fontFamily: "var(--fb)" } }, cfg.label); })),
          React.createElement("div", { className: "crm-lbl", style: { marginBottom: 8 } }, "T\u00e2ches (" + lt.filter(function(t) { return !t.done; }).length + ")"),
          lt.filter(function(t) { return !t.done; }).map(function(t) { var tt = TASK_TYPES.find(function(x) { return x.id === t.type; }); var overdue = isPast(t.date); return React.createElement("div", { key: t.id, style: { background: "var(--c)", borderRadius: 8, padding: "10px 12px", marginBottom: 6, borderLeft: "3px solid " + (overdue ? "#EF4444" : (tt ? tt.color : "var(--a)")) } }, React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, React.createElement("span", { style: { fontSize: 12, fontWeight: 600 } }, (tt ? tt.icon + " " : "") + t.title), React.createElement("div", { style: { display: "flex", gap: 4 } }, React.createElement("button", { onClick: function() { setShowCompleteTask(t); }, style: { background: "none", border: "none", cursor: "pointer", fontSize: 14 }, title: "Terminer" }, "\u2713"), React.createElement("button", { onClick: function() { setShowMoveTask(t); }, style: { background: "none", border: "none", cursor: "pointer", fontSize: 14 }, title: "D\u00e9placer" }, "\u{1F4C5}"), React.createElement("button", { onClick: function() { deleteTask(t.id); }, style: { background: "none", border: "none", cursor: "pointer", fontSize: 14 }, title: "Supprimer" }, "\u{1F5D1}"))), React.createElement("div", { style: { fontSize: 11, color: overdue ? "#EF4444" : "var(--tm)", marginTop: 4 } }, fmtDate(t.date) + " " + fmtTime(t.heure) + (overdue ? " \u00b7 EN RETARD" : ""))); }),
          React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setNewTask(Object.assign({}, newTask, { lead_id: l.id })); setShowTask(true); }, style: { width: "100%", justifyContent: "center", marginTop: 8 } }, "+ Nouvelle t\u00e2che"),
          React.createElement("div", { className: "crm-lbl", style: { marginTop: 20, marginBottom: 8 } }, "\u{26A1} Actions rapides"),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
            React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { localStorage.setItem("ll_prefill_email", JSON.stringify({ nom: l.nom, prenom: l.prenom, civilite: l.civilite, etablissement: l.etablissement, email: l.email, telephone: l.telephone, ville: l.ville })); if (typeof props === "object" && props && props.onNav) props.onNav("prospection"); else { showToast("\u2709\uFE0F Donn\u00e9es pr\u00e9-remplies pour Prospection Email"); } }, style: { width: "100%", justifyContent: "center" } }, "\u2709\uFE0F Envoyer un email"),
            React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { localStorage.setItem("ll_prefill_simu", JSON.stringify({ client: l.nom + " " + (l.prenom || ""), etab: l.etablissement, effectif: l.effectif })); if (typeof props === "object" && props && props.onNav) props.onNav("simulateur"); else { showToast("\u{1F4B0} Donn\u00e9es pr\u00e9-remplies pour Simulateur"); } }, style: { width: "100%", justifyContent: "center" } }, "\u{1F4B0} Simuler un budget"),
            React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { localStorage.setItem("ll_prefill_audit", JSON.stringify({ etabNom: l.etablissement, etabType: l.type_etablissement, convention: l.convention, effectif: l.effectif, contactNom: l.nom + " " + (l.prenom || ""), contactEmail: l.email, contactTel: l.telephone })); if (typeof props === "object" && props && props.onNav) props.onNav("audit"); else { showToast("\u{1F4CB} Donn\u00e9es pr\u00e9-remplies pour Audit"); } }, style: { width: "100%", justifyContent: "center" } }, "\u{1F4CB} Lancer un audit"),
            React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { localStorage.setItem("ll_prefill_mailing", JSON.stringify({ email: l.email, name: (l.civilite ? l.civilite + " " : "") + l.nom + (l.prenom ? " " + l.prenom : "") })); if (typeof props === "object" && props && props.onNav) props.onNav("mailing"); }, style: { width: "100%", justifyContent: "center" } }, "\u{1F4E8} Mailing rapide")
          )
        )
      ),
      showTask ? renderTaskModal() : null,
      showCall ? renderCallModal() : null,
      React.createElement(CRMModals, crmProps),
      renderToast()
    );
  }

  function renderNewModal() {
    return React.createElement("div", { onClick: function() { setShowNew(false); }, className: "crm-modal-bg" },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, className: "crm-modal", style: { maxWidth: 700 } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 24 } }, React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 22, fontWeight: 700 } }, "Nouveau lead"), React.createElement("button", { onClick: function() { setShowNew(false); }, style: { background: "none", border: "none", cursor: "pointer", color: "var(--tm)", fontSize: 20 } }, "\u2715")),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 } },
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Civilit\u00e9"), React.createElement("select", { className: "crm-inp", value: np.civilite, onChange: function(e) { setNp(Object.assign({}, np, { civilite: e.target.value })); } }, React.createElement("option", { value: "" }, "--"), React.createElement("option", null, "Monsieur"), React.createElement("option", null, "Madame"))),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Nom *"), React.createElement("input", { className: "crm-inp", value: np.nom, onChange: function(e) { setNp(Object.assign({}, np, { nom: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Pr\u00e9nom"), React.createElement("input", { className: "crm-inp", value: np.prenom, onChange: function(e) { setNp(Object.assign({}, np, { prenom: e.target.value })); } }))
        ),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 } },
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Raison sociale"), React.createElement("input", { className: "crm-inp", value: np.raison_sociale, onChange: function(e) { setNp(Object.assign({}, np, { raison_sociale: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Nom commercial"), React.createElement("input", { className: "crm-inp", value: np.etablissement, onChange: function(e) { setNp(Object.assign({}, np, { etablissement: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Email *"), React.createElement("input", { className: "crm-inp", type: "email", value: np.email, onChange: function(e) { setNp(Object.assign({}, np, { email: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "T\u00e9l\u00e9phone"), React.createElement("input", { className: "crm-inp", value: np.telephone, onChange: function(e) { setNp(Object.assign({}, np, { telephone: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Adresse"), React.createElement("input", { className: "crm-inp", value: np.adresse, onChange: function(e) { setNp(Object.assign({}, np, { adresse: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Ville"), React.createElement("input", { className: "crm-inp", value: np.ville, onChange: function(e) { setNp(Object.assign({}, np, { ville: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "SIRET"), React.createElement("input", { className: "crm-inp", value: np.siret, onChange: function(e) { setNp(Object.assign({}, np, { siret: e.target.value })); }, placeholder: "XXX XXX XXX XXXXX" })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Effectif"), React.createElement("input", { className: "crm-inp", type: "number", value: np.effectif || "", onChange: function(e) { setNp(Object.assign({}, np, { effectif: parseInt(e.target.value) || 0 })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Type"), React.createElement("select", { className: "crm-inp", value: np.type_etablissement, onChange: function(e) { setNp(Object.assign({}, np, { type_etablissement: e.target.value })); } }, Object.entries(TYPE_LABELS).map(function(entry) { return React.createElement("option", { key: entry[0], value: entry[0] }, entry[1]); }))),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Convention"), React.createElement("select", { className: "crm-inp", value: np.convention || "", onChange: function(e) { setNp(Object.assign({}, np, { convention: e.target.value })); } }, React.createElement("option", { value: "" }, "--"), React.createElement("option", null, "HCR"), React.createElement("option", null, "Restauration rapide"), React.createElement("option", null, "Boulangerie"), React.createElement("option", null, "Boucherie"))),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Groupe"), React.createElement("select", { className: "crm-inp", value: np.groupe || "", onChange: function(e) { setNp(Object.assign({}, np, { groupe: e.target.value })); } }, React.createElement("option", { value: "" }, "Aucun"), groups.map(function(g) { return React.createElement("option", { key: g.id, value: g.id }, g.parent + " > " + g.label); })))
        ),
        React.createElement("div", { style: { marginTop: 14 } }, React.createElement("label", { className: "crm-lbl" }, "Notes"), React.createElement("textarea", { className: "crm-inp", value: np.notes, onChange: function(e) { setNp(Object.assign({}, np, { notes: e.target.value })); } })),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--bd)" } }, React.createElement("button", { className: "crm-btn crm-btn-s", onClick: function() { setShowNew(false); } }, "Annuler"), React.createElement("button", { className: "crm-btn crm-btn-a", onClick: addLead, disabled: !np.nom || !np.email }, "Cr\u00e9er le lead"))
      )
    );
  }

  function renderTaskModal() {
    var occupied = getOccupiedSlots(newTask.date);
    return React.createElement("div", { onClick: function() { setShowTask(false); }, className: "crm-modal-bg" },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, className: "crm-modal", style: { maxWidth: 480 } },
        React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, marginBottom: 20 } }, "Nouvelle t\u00e2che"),
        React.createElement("div", { style: { display: "grid", gap: 14 } },
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Lead"), React.createElement("select", { className: "crm-inp", value: newTask.lead_id, onChange: function(e) { setNewTask(Object.assign({}, newTask, { lead_id: e.target.value })); } }, React.createElement("option", { value: "" }, "S\u00e9lectionner..."), activeLeads.map(function(l) { return React.createElement("option", { key: l.id, value: l.id }, l.nom + (l.prenom ? " " + l.prenom : "") + (l.etablissement ? " (" + l.etablissement + ")" : "")); }))),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Type"), React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, TASK_TYPES.map(function(tt) { return React.createElement("button", { key: tt.id, onClick: function() { setNewTask(Object.assign({}, newTask, { type: tt.id })); }, style: { padding: "6px 12px", borderRadius: 8, fontSize: 12, border: newTask.type === tt.id ? "2px solid " + tt.color : "1px solid var(--bd)", background: newTask.type === tt.id ? tt.color + "18" : "var(--sf)", color: newTask.type === tt.id ? tt.color : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontWeight: 600 } }, tt.icon + " " + tt.label); }))),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Titre *"), React.createElement("input", { className: "crm-inp", value: newTask.title, onChange: function(e) { setNewTask(Object.assign({}, newTask, { title: e.target.value })); } })),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
            React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Date"), React.createElement("input", { className: "crm-inp", type: "date", value: newTask.date, onChange: function(e) { setNewTask(Object.assign({}, newTask, { date: e.target.value })); } })),
            React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Heure"), React.createElement("select", { className: "crm-inp", value: newTask.heure, onChange: function(e) { setNewTask(Object.assign({}, newTask, { heure: e.target.value })); } }, TIME_SLOTS.map(function(h) { var busy = occupied.includes(h); return React.createElement("option", { key: h, value: h, style: busy ? { color: "red" } : {} }, h + (busy ? " \u26d4" : "")); })))
          ),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Notes"), React.createElement("textarea", { className: "crm-inp", value: newTask.notes, onChange: function(e) { setNewTask(Object.assign({}, newTask, { notes: e.target.value })); }, style: { minHeight: 60 } }))
        ),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 } }, React.createElement("button", { className: "crm-btn crm-btn-s", onClick: function() { setShowTask(false); } }, "Annuler"), React.createElement("button", { className: "crm-btn crm-btn-a", onClick: addTask }, "Cr\u00e9er"))
      )
    );
  }

  function renderCallModal() {
    return React.createElement("div", { onClick: function() { setShowCall(false); }, className: "crm-modal-bg" },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, className: "crm-modal", style: { maxWidth: 500 } },
        React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, marginBottom: 20 } }, "\u{1F4DE} Enregistrer un appel"),
        React.createElement("div", { style: { display: "grid", gap: 14 } },
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
            React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Type"), React.createElement("select", { className: "crm-inp", value: newCall.type, onChange: function(e) { setNewCall(Object.assign({}, newCall, { type: e.target.value })); } }, CALL_TYPES.map(function(t) { return React.createElement("option", { key: t, value: t }, t); }))),
            React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Dur\u00e9e"), React.createElement("select", { className: "crm-inp", value: newCall.duree, onChange: function(e) { setNewCall(Object.assign({}, newCall, { duree: parseInt(e.target.value) })); } }, CALL_DURATIONS.map(function(d) { return React.createElement("option", { key: d, value: d }, d + " min"); })))
          ),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "R\u00e9sum\u00e9 *"), React.createElement("textarea", { className: "crm-inp", value: newCall.resume, onChange: function(e) { setNewCall(Object.assign({}, newCall, { resume: e.target.value })); } })),
          React.createElement("div", null, React.createElement("label", { className: "crm-lbl" }, "Changer le statut (optionnel)"), React.createElement("select", { className: "crm-inp", value: newCall.new_statut, onChange: function(e) { setNewCall(Object.assign({}, newCall, { new_statut: e.target.value })); } }, React.createElement("option", { value: "" }, "Ne pas changer"), Object.entries(STATUTS).map(function(entry) { return React.createElement("option", { key: entry[0], value: entry[0] }, entry[1].label); }))),
          React.createElement("div", { style: { background: "var(--sf)", borderRadius: 10, padding: 14 } }, React.createElement("div", { className: "crm-lbl" }, "Planifier un suivi"), React.createElement("input", { className: "crm-inp", placeholder: "Action \u00e0 faire...", value: newCall.followup, onChange: function(e) { setNewCall(Object.assign({}, newCall, { followup: e.target.value })); }, style: { marginBottom: 8 } }), React.createElement("input", { className: "crm-inp", type: "date", value: newCall.followup_date, onChange: function(e) { setNewCall(Object.assign({}, newCall, { followup_date: e.target.value })); } }))
        ),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 } }, React.createElement("button", { className: "crm-btn crm-btn-s", onClick: function() { setShowCall(false); } }, "Annuler"), React.createElement("button", { className: "crm-btn crm-btn-a", onClick: logCall }, "Enregistrer"))
      )
    );
  }
}

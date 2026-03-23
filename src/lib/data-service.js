// ══════════════════════════════════════════════════════════
// LAB LEARNING — Data Service
// Supabase primary + localStorage cache/fallback
// ══════════════════════════════════════════════════════════
import { supabase } from "./supabase.js";

var CACHE_KEY_CRM = "crm_pro_v2";
var CACHE_KEY_ADM = "crm_admin_v3";
var CACHE_KEY_LOG = "ll_activity_log";
var _online = false;

function setOnline(v) { _online = v; }
export function isOnline() { return _online; }

// ─── CACHE HELPERS ───
function cacheGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; }
}
function cacheSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
}

// ─── GENERIC SUPABASE CRUD ───
async function sbSelect(table, orderCol) {
  var res = await supabase.from(table).select("*").order(orderCol || "created_at", { ascending: false });
  if (res.error) throw res.error;
  return res.data || [];
}

async function sbUpsert(table, data) {
  var res = await supabase.from(table).upsert(data, { onConflict: "id" });
  if (res.error) throw res.error;
  return res.data;
}

async function sbDelete(table, id) {
  var res = await supabase.from(table).delete().eq("id", id);
  if (res.error) throw res.error;
}

async function sbBulkUpsert(table, arr) {
  if (!arr.length) return;
  var res = await supabase.from(table).upsert(arr, { onConflict: "id" });
  if (res.error) throw res.error;
}

// ══════════════════════════════════════════════════════════
// CRM PROSPECTS
// ══════════════════════════════════════════════════════════

export async function loadCRM() {
  try {
    var prospects = await sbSelect("crm_prospects", "created_at");
    var tasks = await sbSelect("crm_tasks", "created_at");
    var comments = await sbSelect("crm_comments", "date");
    var calls = await sbSelect("crm_calls", "date");
    var groups = await sbSelect("crm_groups", "parent");
    setOnline(true);
    var data = { leads: prospects, tasks: tasks, comments: comments, calls: calls, groups: groups };
    cacheSet(CACHE_KEY_CRM, data);
    return { data: data, source: "supabase" };
  } catch (e) {
    setOnline(false);
    var cached = cacheGet(CACHE_KEY_CRM);
    if (cached) return { data: cached, source: "cache" };
    return { data: { leads: [], tasks: [], comments: [], calls: [], groups: [] }, source: "empty" };
  }
}

export async function saveLead(lead) {
  cacheUpdateLead(lead);
  try { await sbUpsert("crm_prospects", lead); setOnline(true); } catch (e) { setOnline(false); }
}

export async function deleteLead(id) {
  cacheRemoveLead(id);
  try { await sbDelete("crm_prospects", id); } catch (e) {}
}

export async function saveTask(task) {
  cacheUpdateTask(task);
  try { await sbUpsert("crm_tasks", task); setOnline(true); } catch (e) { setOnline(false); }
}

export async function deleteTaskDB(id) {
  cacheRemoveTask(id);
  try { await sbDelete("crm_tasks", id); } catch (e) {}
}

export async function saveComment(comment) {
  cacheAddComment(comment);
  try { await sbUpsert("crm_comments", comment); } catch (e) {}
}

export async function saveCall(call) {
  cacheAddCall(call);
  try { await sbUpsert("crm_calls", call); } catch (e) {}
}

export async function saveGroup(group) {
  cacheUpdateGroup(group);
  try { await sbUpsert("crm_groups", group); } catch (e) {}
}

export async function deleteGroup(id) {
  cacheRemoveGroup(id);
  try { await sbDelete("crm_groups", id); } catch (e) {}
}

export async function bulkImportLeads(leads) {
  var cached = cacheGet(CACHE_KEY_CRM) || { leads: [], tasks: [], comments: [], calls: [], groups: [] };
  cached.leads = leads.concat(cached.leads);
  cacheSet(CACHE_KEY_CRM, cached);
  try { await sbBulkUpsert("crm_prospects", leads); setOnline(true); } catch (e) { setOnline(false); }
}

// ─── CACHE MUTATIONS (keep localStorage in sync) ───
function cacheUpdateLead(lead) {
  var d = cacheGet(CACHE_KEY_CRM) || { leads: [], tasks: [], comments: [], calls: [], groups: [] };
  var idx = d.leads.findIndex(function(l) { return l.id === lead.id; });
  if (idx >= 0) d.leads[idx] = lead; else d.leads.unshift(lead);
  cacheSet(CACHE_KEY_CRM, d);
}
function cacheRemoveLead(id) {
  var d = cacheGet(CACHE_KEY_CRM) || { leads: [], tasks: [], comments: [], calls: [], groups: [] };
  d.leads = d.leads.filter(function(l) { return l.id !== id; });
  d.tasks = d.tasks.filter(function(t) { return t.lead_id !== id; });
  d.comments = d.comments.filter(function(c) { return c.lead_id !== id; });
  d.calls = d.calls.filter(function(c) { return c.lead_id !== id; });
  cacheSet(CACHE_KEY_CRM, d);
}
function cacheUpdateTask(task) {
  var d = cacheGet(CACHE_KEY_CRM) || { leads: [], tasks: [], comments: [], calls: [], groups: [] };
  var idx = d.tasks.findIndex(function(t) { return t.id === task.id; });
  if (idx >= 0) d.tasks[idx] = task; else d.tasks.unshift(task);
  cacheSet(CACHE_KEY_CRM, d);
}
function cacheRemoveTask(id) {
  var d = cacheGet(CACHE_KEY_CRM) || { leads: [], tasks: [], comments: [], calls: [], groups: [] };
  d.tasks = d.tasks.filter(function(t) { return t.id !== id; });
  cacheSet(CACHE_KEY_CRM, d);
}
function cacheAddComment(comment) {
  var d = cacheGet(CACHE_KEY_CRM) || { leads: [], tasks: [], comments: [], calls: [], groups: [] };
  d.comments.unshift(comment);
  cacheSet(CACHE_KEY_CRM, d);
}
function cacheAddCall(call) {
  var d = cacheGet(CACHE_KEY_CRM) || { leads: [], tasks: [], comments: [], calls: [], groups: [] };
  d.calls.unshift(call);
  cacheSet(CACHE_KEY_CRM, d);
}
function cacheUpdateGroup(group) {
  var d = cacheGet(CACHE_KEY_CRM) || { leads: [], tasks: [], comments: [], calls: [], groups: [] };
  var idx = d.groups.findIndex(function(g) { return g.id === group.id; });
  if (idx >= 0) d.groups[idx] = group; else d.groups.push(group);
  cacheSet(CACHE_KEY_CRM, d);
}
function cacheRemoveGroup(id) {
  var d = cacheGet(CACHE_KEY_CRM) || { leads: [], tasks: [], comments: [], calls: [], groups: [] };
  d.groups = d.groups.filter(function(g) { return g.id !== id; });
  cacheSet(CACHE_KEY_CRM, d);
}

// Batch save all CRM state (called on each state change for cache)
export function cacheSaveCRM(data) {
  cacheSet(CACHE_KEY_CRM, data);
}

// ══════════════════════════════════════════════════════════
// SUIVI ADMIN (uses existing tables "leads" + "formateurs")
// ══════════════════════════════════════════════════════════

function fromAdmDB(r) {
  return { id: r.id, client: r.client || "", formation: r.formation || "", dateDebut: r.date_debut || "", dateFin: r.date_fin || "", participants: r.participants || "", statutOrg: r.statut_org || "proposition", statutAkto: r.statut_akto || "relance", statutProspect: r.statut_prospect || "prospect", emailAkto: r.email_akto || "", mdpAkto: r.mdp_akto || "", notes: r.notes || "", relance: r.relance || "", formateurNom: r.formateur_nom || "", formateurTel: r.formateur_tel || "" };
}

function toAdmDB(l) {
  return { id: l.id, client: l.client, formation: l.formation || "", date_debut: l.dateDebut || "", date_fin: l.dateFin || "", participants: l.participants || "", statut_org: l.statutOrg || "proposition", statut_akto: l.statutAkto || "relance", statut_prospect: l.statutProspect || "prospect", email_akto: l.emailAkto || "", mdp_akto: l.mdpAkto || "", notes: l.notes || "", relance: l.relance || "", formateur_nom: l.formateurNom || "", formateur_tel: l.formateurTel || "" };
}

export async function loadAdmin() {
  try {
    var res = await supabase.from("leads").select("*").order("id");
    if (res.error) throw res.error;
    var mapped = (res.data || []).map(fromAdmDB);
    var fRes = await supabase.from("formateurs").select("*").order("nom");
    var fmts = (fRes.data && !fRes.error) ? fRes.data : [];
    setOnline(true);
    var data = { leads: mapped, formateurs: fmts };
    cacheSet(CACHE_KEY_ADM, data);
    return { data: data, source: "supabase" };
  } catch (e) {
    setOnline(false);
    var cached = cacheGet(CACHE_KEY_ADM);
    if (cached) return { data: cached, source: "cache" };
    return { data: { leads: [], formateurs: [] }, source: "empty" };
  }
}

export async function saveAdminLead(lead) {
  var d = cacheGet(CACHE_KEY_ADM) || { leads: [], formateurs: [] };
  var idx = d.leads.findIndex(function(l) { return l.id === lead.id; });
  if (idx >= 0) d.leads[idx] = lead; else d.leads.unshift(lead);
  cacheSet(CACHE_KEY_ADM, d);
  try { await supabase.from("leads").upsert(toAdmDB(lead)); setOnline(true); } catch (e) { setOnline(false); }
}

export async function deleteAdminLead(id) {
  var d = cacheGet(CACHE_KEY_ADM) || { leads: [], formateurs: [] };
  d.leads = d.leads.filter(function(l) { return l.id !== id; });
  cacheSet(CACHE_KEY_ADM, d);
  try { await supabase.from("leads").delete().eq("id", id); } catch (e) {}
}

export async function saveFormateur(f) {
  var d = cacheGet(CACHE_KEY_ADM) || { leads: [], formateurs: [] };
  var idx = d.formateurs.findIndex(function(x) { return x.id === f.id; });
  if (idx >= 0) d.formateurs[idx] = f; else d.formateurs.push(f);
  cacheSet(CACHE_KEY_ADM, d);
  try { await supabase.from("formateurs").upsert(f); } catch (e) {}
}

export async function deleteFormateur(id) {
  var d = cacheGet(CACHE_KEY_ADM) || { leads: [], formateurs: [] };
  d.formateurs = d.formateurs.filter(function(f) { return f.id !== id; });
  cacheSet(CACHE_KEY_ADM, d);
  try { await supabase.from("formateurs").delete().eq("id", id); } catch (e) {}
}

// ══════════════════════════════════════════════════════════
// ACTIVITY LOG
// ══════════════════════════════════════════════════════════

export async function logActivityDB(entry) {
  var record = {
    id: "act_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toISOString(),
    module: entry.module || "unknown",
    action: entry.action || "",
    type: entry.type || "info",
    lead_id: entry.leadId || null,
    lead_name: entry.leadName || "",
    details: entry.details || "",
    commercial: entry.commercial || localStorage.getItem("ll_brevo_name") || ""
  };
  // Cache locally
  var logs = cacheGet(CACHE_KEY_LOG) || [];
  logs.unshift(record);
  if (logs.length > 500) logs = logs.slice(0, 500);
  cacheSet(CACHE_KEY_LOG, logs);
  // Save to Supabase
  try { await supabase.from("crm_activity_log").insert(record); } catch (e) {}
  return record;
}

export async function loadActivityLog(limit) {
  try {
    var res = await supabase.from("crm_activity_log").select("*").order("timestamp", { ascending: false }).limit(limit || 200);
    if (res.error) throw res.error;
    var logs = res.data || [];
    cacheSet(CACHE_KEY_LOG, logs);
    return logs;
  } catch (e) {
    return cacheGet(CACHE_KEY_LOG) || [];
  }
}

// ══════════════════════════════════════════════════════════
// SYNC STATUS
// ══════════════════════════════════════════════════════════

export async function checkConnection() {
  try {
    var res = await supabase.from("crm_prospects").select("id", { count: "exact", head: true });
    if (res.error) throw res.error;
    setOnline(true);
    return true;
  } catch (e) {
    setOnline(false);
    return false;
  }
}

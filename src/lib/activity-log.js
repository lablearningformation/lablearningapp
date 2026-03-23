// ══════════════════════════════════════════════════════════
// LAB LEARNING — Activity Log (shared across all modules)
// ══════════════════════════════════════════════════════════

var LOG_KEY = "ll_activity_log";
var MAX_ENTRIES = 500;

export function logActivity(entry) {
  try {
    var logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    var record = {
      id: "act_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      module: entry.module || "unknown",
      action: entry.action || "",
      type: entry.type || "info",
      leadId: entry.leadId || null,
      leadName: entry.leadName || "",
      details: entry.details || "",
      commercial: entry.commercial || localStorage.getItem("ll_brevo_name") || ""
    };
    logs.unshift(record);
    if (logs.length > MAX_ENTRIES) logs = logs.slice(0, MAX_ENTRIES);
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    return record;
  } catch (e) { return null; }
}

export function getActivities(filter) {
  try {
    var logs = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    if (!filter) return logs;
    if (filter.module) logs = logs.filter(function(l) { return l.module === filter.module; });
    if (filter.leadId) logs = logs.filter(function(l) { return l.leadId === filter.leadId; });
    if (filter.type) logs = logs.filter(function(l) { return l.type === filter.type; });
    if (filter.since) {
      var since = new Date(filter.since).getTime();
      logs = logs.filter(function(l) { return new Date(l.timestamp).getTime() >= since; });
    }
    if (filter.days) {
      var cutoff = Date.now() - filter.days * 864e5;
      logs = logs.filter(function(l) { return new Date(l.timestamp).getTime() >= cutoff; });
    }
    if (filter.limit) logs = logs.slice(0, filter.limit);
    return logs;
  } catch (e) { return []; }
}

export function getActivityStats(days) {
  var logs = getActivities({ days: days || 30 });
  var byModule = {};
  var byType = {};
  var byDay = {};
  var byCommercial = {};
  logs.forEach(function(l) {
    byModule[l.module] = (byModule[l.module] || 0) + 1;
    byType[l.type] = (byType[l.type] || 0) + 1;
    var day = l.timestamp.split("T")[0];
    byDay[day] = (byDay[day] || 0) + 1;
    if (l.commercial) byCommercial[l.commercial] = (byCommercial[l.commercial] || 0) + 1;
  });
  return { total: logs.length, byModule: byModule, byType: byType, byDay: byDay, byCommercial: byCommercial, logs: logs };
}

export var MODULE_ICONS = {
  crm: "\u{1F465}",
  email: "\u2709\uFE0F",
  audit: "\u{1F4CB}",
  simulateur: "\u{1F4B0}",
  admin: "\u{1F4C2}",
  agenda: "\u{1F4C5}"
};

export var ACTION_COLORS = {
  lead_created: "#6366F1",
  lead_won: "#10B981",
  lead_lost: "#EF4444",
  status_change: "#0891B2",
  email_sent: "#8B5CF6",
  task_created: "#3B82F6",
  task_completed: "#10B981",
  call_logged: "#F59E0B",
  audit_done: "#EC4899",
  simulation_done: "#14B8A6",
  dossier_created: "#195144",
  dossier_updated: "#1E6B5A"
};

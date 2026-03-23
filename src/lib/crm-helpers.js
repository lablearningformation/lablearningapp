// ══════════════════════════════════════════════════════════
// LAB LEARNING — CRM PRO V2 — Shared Helpers
// ══════════════════════════════════════════════════════════

export var STATUTS = {
  nouveau: { label: "Nouveau", color: "#6366F1", bg: "#EEF2FF", order: 0 },
  contacte: { label: "Contact\u00e9", color: "#0891B2", bg: "#ECFEFF", order: 1 },
  qualifie: { label: "Qualifi\u00e9", color: "#D97706", bg: "#FFFBEB", order: 2 },
  proposition: { label: "Proposition", color: "#7C3AED", bg: "#F5F3FF", order: 3 },
  negociation: { label: "N\u00e9gociation", color: "#EA580C", bg: "#FFF7ED", order: 4 },
  gagne: { label: "Gagn\u00e9", color: "#059669", bg: "#ECFDF5", order: 5 },
  perdu: { label: "Perdu", color: "#DC2626", bg: "#FEF2F2", order: 6 },
  refus_qualif: { label: "Refus Qualif", color: "#9CA3AF", bg: "#F3F4F6", order: 7 }
};

export var TASK_TYPES = [
  { id: "appel", label: "Appel", icon: "\u{1F4DE}", color: "#3B82F6" },
  { id: "email", label: "Email", icon: "\u2709\uFE0F", color: "#8B5CF6" },
  { id: "rdv", label: "Rendez-vous", icon: "\u{1F4C5}", color: "#10B981" },
  { id: "relance", label: "Relance", icon: "\u{1F514}", color: "#F59E0B" },
  { id: "devis", label: "Devis", icon: "\u{1F4C4}", color: "#EC4899" },
  { id: "admin", label: "Admin", icon: "\u{1F4CB}", color: "#6B7280" }
];

export var CALL_TYPES = ["D\u00e9couverte", "Relance", "N\u00e9gociation", "Onboarding", "Suivi"];
export var CALL_DURATIONS = [5, 10, 15, 30, 45, 60];

export var TYPE_LABELS = {
  restaurant: "Restaurant",
  rapide: "Restauration rapide",
  boulangerie: "Boulangerie",
  patisserie: "P\u00e2tisserie",
  boucherie: "Boucherie",
  hotel: "H\u00f4tel",
  traiteur: "Traiteur"
};

export var TAG_COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6366F1", "#14B8A6"];

export var DEFAULT_GROUPS = [
  { id: "prospection_terrain", parent: "Prospection", label: "Terrain" },
  { id: "partenariat_axe_direct_simple", parent: "Partenariat", label: "Axe Direct Simple" },
  { id: "partenariat_axe_direct_hygiene", parent: "Partenariat", label: "Axe Direct Hygi\u00e8ne" },
  { id: "partenariat_federation_boulangers", parent: "Partenariat", label: "F\u00e9d\u00e9ration des Boulangers" },
  { id: "evenement_salon_sirha", parent: "\u00c9v\u00e9nement", label: "Salon Sirha" },
  { id: "evenement_salon_siprho", parent: "\u00c9v\u00e9nement", label: "Salon Siprho" }
];

export var TIME_SLOTS = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00"
];

export var DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export var MONTH_NAMES = ["Janvier", "F\u00e9vrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Ao\u00fbt", "Septembre", "Octobre", "Novembre", "D\u00e9cembre"];

export function uid() { return "id_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6); }
export function today() { return new Date().toISOString().split("T")[0]; }
export function now() { return new Date().toISOString(); }

export function fmtDate(d) {
  if (!d) return "";
  var p = d.split("-");
  return p.length >= 3 ? p[2] + "/" + p[1] + "/" + p[0] : d;
}

export function fmtTime(t) { return t || ""; }

export function daysDiff(d) {
  if (!d) return 999;
  var t = new Date(d);
  var n = new Date();
  n.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.round((t - n) / 864e5);
}

export function isToday(d) { return d === today(); }
export function isPast(d) { return d && d < today(); }

export function calcScore(lead, tasks) {
  var score = 0;
  if (lead.email) score += 15;
  if (lead.telephone) score += 15;
  if (lead.etablissement) score += 10;
  if (lead.ville) score += 5;
  if (lead.siret) score += 10;
  if (lead.effectif) score += 5;
  var leadTasks = tasks.filter(function(t) { return t.lead_id === lead.id; });
  var overdue = leadTasks.filter(function(t) { return !t.done && isPast(t.date); });
  if (overdue.length > 0) score += 20;
  var recent = lead.last_activity;
  if (recent) {
    var d = daysDiff(recent);
    if (d <= 2) score += 20;
    else if (d <= 7) score += 10;
  }
  if (lead.statut === "negociation") score += 15;
  else if (lead.statut === "proposition") score += 10;
  else if (lead.statut === "qualifie") score += 5;
  return Math.min(100, score);
}

export function getGroupLabel(groups, groupId) {
  if (!groupId) return "";
  var g = groups.find(function(x) { return x.id === groupId; });
  if (!g) return groupId;
  return g.parent + " > " + g.label;
}

export function getGroupParents(groups) {
  var parents = [];
  groups.forEach(function(g) {
    if (parents.indexOf(g.parent) === -1) parents.push(g.parent);
  });
  return parents;
}

export function getWeekDates(refDate) {
  var d = new Date(refDate);
  var day = d.getDay();
  var diff = day === 0 ? -6 : 1 - day;
  var mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  var dates = [];
  for (var i = 0; i < 7; i++) {
    var dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    dates.push(dd.toISOString().split("T")[0]);
  }
  return dates;
}

export function getMonthDates(year, month) {
  var first = new Date(year, month, 1);
  var startDay = first.getDay();
  var offset = startDay === 0 ? -6 : 1 - startDay;
  var dates = [];
  for (var i = 0; i < 42; i++) {
    var d = new Date(year, month, 1 + offset + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export function padZero(n) { return n < 10 ? "0" + n : "" + n; }

export var CRM_CSS = "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');" +
  ".crm-inp{width:100%;padding:10px 14px;background:var(--inp);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-family:var(--fb);font-size:14px;outline:none;transition:.2s}" +
  ".crm-inp:focus{border-color:var(--a);box-shadow:0 0 0 3px var(--ag)}" +
  ".crm-inp::placeholder{color:var(--tm)}" +
  "select.crm-inp{cursor:pointer;appearance:auto}textarea.crm-inp{resize:vertical;min-height:70px}" +
  ".crm-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;font-family:var(--fb);font-weight:600;font-size:13px;cursor:pointer;border:none;transition:.15s}" +
  ".crm-btn:hover{transform:translateY(-1px)}" +
  ".crm-btn-p{background:linear-gradient(135deg,var(--p),#1E6B5A);color:#fff}" +
  ".crm-btn-a{background:linear-gradient(135deg,var(--a),#3ECB82);color:var(--p);font-weight:700}" +
  ".crm-btn-s{background:var(--inp);color:var(--t1);border:1px solid var(--bd)}" +
  ".crm-btn-d{background:rgba(220,38,38,.1);color:#F87171;border:1px solid rgba(220,38,38,.2)}" +
  ".crm-btn-sm{padding:6px 12px;font-size:12px}" +
  ".crm-lbl{display:block;font-size:11px;font-weight:700;color:var(--tm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}" +
  ".crm-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center}" +
  ".crm-modal{background:var(--c);border:1px solid var(--bd);border-radius:20px;padding:28px 32px;width:90%;max-height:85vh;overflow-y:auto}" +
  ".crm-week-cell{border:1px solid var(--bd);padding:2px;min-height:48px;cursor:pointer;transition:background .1s}" +
  ".crm-week-cell:hover{background:rgba(89,213,151,.05)}" +
  ".crm-month-cell{border:1px solid var(--bd);padding:4px;min-height:90px;cursor:pointer;transition:background .1s;vertical-align:top}" +
  ".crm-month-cell:hover{background:rgba(89,213,151,.05)}" +
  ".crm-banner{padding:12px 20px;border-radius:10px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;animation:fadeUp .3s ease}" +
  ".crm-checkbox{width:16px;height:16px;accent-color:var(--a);cursor:pointer}";

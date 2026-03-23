// ══════════════════════════════════════════════════════════
// LAB LEARNING — CRM Admin Helpers (Suivi Administratif)
// ══════════════════════════════════════════════════════════
import { supabase } from "./supabase.js";

export var ORG = [
  { key: "standby", label: "Stand-by", pct: 0, tc: "adm-tag-gray" },
  { key: "proposition", label: "Proposition envoy\u00e9e", pct: 10, tc: "adm-tag-blue" },
  { key: "att_client", label: "En attente du client", pct: 15, tc: "adm-tag-orange" },
  { key: "att_liste", label: "Att. liste participants", pct: 25, tc: "adm-tag-yellow" },
  { key: "conv_faire", label: "Convention \u00e0 faire", pct: 40, tc: "adm-tag-red" },
  { key: "conv_modifier", label: "Convention \u00e0 modifier", pct: 50, tc: "adm-tag-orange" },
  { key: "conv_envoyee", label: "Conv. envoy\u00e9e \u2013 att. signature", pct: 70, tc: "adm-tag-yellow" },
  { key: "conv_signee", label: "Convention sign\u00e9e", pct: 100, tc: "adm-tag-green" }
];

export var AKT = [
  { key: "relance", label: "Relance cr\u00e9ation AKTO", pct: 0, tc: "adm-tag-gray" },
  { key: "creer", label: "Compte AKTO \u00e0 cr\u00e9er", pct: 15, tc: "adm-tag-red" },
  { key: "courrier", label: "Att. courrier AKTO", pct: 30, tc: "adm-tag-orange" },
  { key: "remplir", label: "DPC \u00e0 remplir", pct: 50, tc: "adm-tag-orange" },
  { key: "verifier", label: "DPC \u00e0 v\u00e9rifier", pct: 65, tc: "adm-tag-yellow" },
  { key: "client", label: "DPC au client", pct: 80, tc: "adm-tag-blue" },
  { key: "transmis", label: "DPC transmis AKTO", pct: 100, tc: "adm-tag-green" }
];

export var PTAGS = {
  prospect: { l: "\u{1F3AF} Prospect", tc: "adm-tag-blue" },
  en_cours: { l: "\u{1F525} En cours", tc: "adm-tag-orange" },
  signe: { l: "\u2705 Sign\u00e9", tc: "adm-tag-green" },
  standby: { l: "\u23F8 Stand-by", tc: "adm-tag-gray" }
};

export function oK(k) { return ORG.find(function(s) { return s.key === k; }) || ORG[0]; }
export function aK(k) { return AKT.find(function(s) { return s.key === k; }) || AKT[0]; }
export function gP(l) { return Math.round((oK(l.statutOrg).pct + aK(l.statutAkto).pct) / 2); }

export function pC(p) {
  if (p >= 90) return "#195144";
  if (p >= 65) return "#27ae60";
  if (p >= 40) return "#2980b9";
  if (p >= 20) return "#f39c12";
  return "#e74c3c";
}

export function needsFormateur(l) {
  return l.statutOrg === "conv_signee" && ["remplir", "verifier", "client", "transmis"].indexOf(l.statutAkto) !== -1;
}
export function formateurUrgent(l) { return needsFormateur(l) && !l.formateurNom; }

export function datesOverlap(a1, a2, b1, b2) {
  if (!a1 || !b1) return false;
  var ae = a2 || a1, be = b2 || b1;
  return a1 <= be && b1 <= ae;
}

export function getAlerts(l) {
  var a = [];
  if (l.statutOrg === "conv_envoyee") a.push({ t: "warn", m: "\u{1F4DD} Convention envoy\u00e9e \u2014 relancer pour signature" });
  if (l.statutOrg === "conv_signee") {
    var ak = l.statutAkto;
    if (ak === "relance" || ak === "creer") a.push({ t: "warn", m: "\u{1F3E6} Cr\u00e9er le compte AKTO" });
    else if (ak === "courrier") a.push({ t: "warn", m: "\u{1F4EC} Surveiller courrier AKTO" });
    else if (ak === "remplir") a.push({ t: "warn", m: "\u{1F4CB} DPC \u00e0 remplir" });
    else if (ak === "verifier") a.push({ t: "warn", m: "\u{1F50D} DPC \u00e0 v\u00e9rifier" });
    else if (ak === "client") a.push({ t: "warn", m: "\u{1F4E4} DPC chez client \u2014 att. retour" });
  }
  if (formateurUrgent(l)) a.push({ t: "danger", m: "\u{1F6A8} FORMATEUR NON POSITIONN\u00c9 \u2014 action requise !" });
  if (l.relance) {
    var d = new Date(l.relance), n = new Date();
    n.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
    if (d < n) a.push({ t: "warn", m: "\u{1F514} Relance \u00e9chue" });
    else if (d.getTime() === n.getTime()) a.push({ t: "warn", m: "\u{1F514} Relance aujourd'hui" });
  }
  return a;
}

export function fmtD(d) { if (!d) return ""; var p = d.split("-"); return p.length === 3 ? p[2] + "/" + p[1] : ""; }

export function relanceDiff(r) {
  if (!r) return null;
  var d = new Date(r), n = new Date();
  n.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return Math.round((d - n) / 864e5);
}

export var DEFAULT_LEADS = [
  { id: "003", client: "KVB FOOD", formation: "Hygi\u00e8ne alimentaire", dateDebut: "2026-03-25", dateFin: "2026-03-26", participants: "2", statutOrg: "conv_signee", statutAkto: "transmis", statutProspect: "signe", relance: "", notes: "Convention sign\u00e9e + DPC envoy\u00e9e \u00e0 AKTO.", emailAkto: "kvbfood@gmail.com", mdpAkto: "Lablearningkvb34", formateurNom: "", formateurTel: "" },
  { id: "001", client: "HALL CAF\u00c9 (GLRS)", formation: "Hygi\u00e8ne alimentaire", dateDebut: "2026-03-19", dateFin: "2026-03-20", participants: "", statutOrg: "conv_envoyee", statutAkto: "remplir", statutProspect: "en_cours", relance: "2026-03-09", notes: "Convention envoy\u00e9e, att. signature.", emailAkto: "", mdpAkto: "PAS ACC\u00c8S", formateurNom: "", formateurTel: "" },
  { id: "002", client: "POKE AVENUE (POUMPAO)", formation: "Hygi\u00e8ne alimentaire", dateDebut: "2026-03-23", dateFin: "2026-03-25", participants: "3", statutOrg: "conv_signee", statutAkto: "transmis", statutProspect: "signe", relance: "", notes: "Convention sign\u00e9e. DPC transmise.", emailAkto: "laosdomi31@gmail.com", mdpAkto: "PokeAvenue34", formateurNom: "", formateurTel: "" },
  { id: "004", client: "CROUSTY SMASH", formation: "Hygi\u00e8ne alimentaire", dateDebut: "2026-03-30", dateFin: "2026-04-01", participants: "3", statutOrg: "att_liste", statutAkto: "courrier", statutProspect: "en_cours", relance: "2026-03-11", notes: "Att. courrier AKTO + att. liste.", emailAkto: "croustysmash34@gmail.com", mdpAkto: "Crousty34", formateurNom: "", formateurTel: "" },
  { id: "005", client: "LES GABIANS", formation: "Hygi\u00e8ne alimentaire", dateDebut: "2026-04-14", dateFin: "2026-04-15", participants: "6", statutOrg: "conv_signee", statutAkto: "courrier", statutProspect: "signe", relance: "2026-03-09", notes: "Convention sign\u00e9e. Att. courrier.", emailAkto: "Zinaphil34@orange.fr", mdpAkto: "Zinaphil34", formateurNom: "", formateurTel: "" },
  { id: "006", client: "L'ENCAS TROIS RIVI\u00c8RES", formation: "BARISTA", dateDebut: "2026-01-30", dateFin: "2026-04-01", participants: "", statutOrg: "conv_signee", statutAkto: "client", statutProspect: "signe", relance: "2026-03-12", notes: "Convention sign\u00e9e + DPC au client.", emailAkto: "", mdpAkto: "", formateurNom: "", formateurTel: "" },
  { id: "007", client: "TAJ MAHAL (B\u00c9ZIERS)", formation: "Hygi\u00e8ne alimentaire", dateDebut: "2026-04-14", dateFin: "2026-04-16", participants: "5", statutOrg: "conv_signee", statutAkto: "client", statutProspect: "signe", relance: "2026-03-12", notes: "Convention sign\u00e9e + DPC au client.", emailAkto: "", mdpAkto: "", formateurNom: "", formateurTel: "" },
  { id: "006b", client: "BREAK FOOD (PURE BREAK)", formation: "Hygi\u00e8ne alimentaire", dateDebut: "2026-03-30", dateFin: "2026-04-01", participants: "3", statutOrg: "conv_signee", statutAkto: "courrier", statutProspect: "signe", relance: "", notes: "Convention sign\u00e9e. Att. courrier.", emailAkto: "", mdpAkto: "", formateurNom: "", formateurTel: "" },
  { id: "010", client: "LA GUINGUETTE DU PONANT", formation: "HACCP", dateDebut: "", dateFin: "", participants: "", statutOrg: "proposition", statutAkto: "relance", statutProspect: "prospect", relance: "2026-03-15", notes: "Proposition envoy\u00e9e.", emailAkto: "", mdpAkto: "", formateurNom: "", formateurTel: "" },
  { id: "012", client: "LE GRAU BURGER (AMIRI)", formation: "Hygi\u00e8ne alimentaire", dateDebut: "", dateFin: "", participants: "", statutOrg: "att_liste", statutAkto: "creer", statutProspect: "en_cours", relance: "2026-03-20", notes: "Att. liste + cr\u00e9ation AKTO.", emailAkto: "legrauburger@outlook.fr", mdpAkto: "Legrauburger30", formateurNom: "", formateurTel: "" },
  { id: "013", client: "\u00c0 LA MOULE (AMIRI)", formation: "Hygi\u00e8ne alimentaire", dateDebut: "", dateFin: "", participants: "", statutOrg: "att_liste", statutAkto: "creer", statutProspect: "en_cours", relance: "2026-03-20", notes: "Att. liste + cr\u00e9ation AKTO.", emailAkto: "alamoulerestaurant@outlook.fr", mdpAkto: "Alamoule30", formateurNom: "", formateurTel: "" },
  { id: "014", client: "CHEZ LOLA (AMIRI)", formation: "HACCP", dateDebut: "", dateFin: "", participants: "", statutOrg: "att_liste", statutAkto: "creer", statutProspect: "en_cours", relance: "2026-03-20", notes: "Att. liste + cr\u00e9ation AKTO.", emailAkto: "ChezLolarestaurant@outlook.fr", mdpAkto: "Chezlola30", formateurNom: "", formateurTel: "" }
];

export var ADM_CSS = ".adm-tag{display:inline-flex;align-items:center;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;white-space:nowrap}" +
  ".adm-tag-red{background:#fdecea;color:#c0392b}" +
  ".adm-tag-orange{background:#fef3e2;color:#d35400}" +
  ".adm-tag-yellow{background:#fef9e7;color:#b7950b}" +
  ".adm-tag-green{background:#e8f8f0;color:#1e8449}" +
  ".adm-tag-blue{background:#e8f4fd;color:#2471a3}" +
  ".adm-tag-gray{background:#f0f3f2;color:#717d7a}" +
  ".adm-tag-brand{background:#e0f0ec;color:#195144}" +
  ".adm-tag-danger{background:#fdecea;color:#c0392b;font-weight:700}" +
  ".adm-card{background:var(--c);border:1px solid var(--bd);border-radius:14px;padding:18px;cursor:pointer;transition:.15s;position:relative}" +
  ".adm-card:hover{border-color:var(--a);transform:translateY(-1px)}" +
  ".adm-bar{height:4px;background:var(--bd);border-radius:2px;overflow:hidden;margin:10px 0}" +
  ".adm-bar-fill{height:100%;border-radius:2px;transition:width .6s ease}" +
  ".adm-stat{background:var(--c);border:1px solid var(--bd);border-radius:12px;padding:14px 18px}" +
  ".adm-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center}" +
  ".adm-modal-inner{background:var(--c);border:1px solid var(--bd);border-radius:20px;padding:28px 32px;width:90%;max-width:640px;max-height:85vh;overflow-y:auto}" +
  ".adm-alert-warn{background:rgba(243,156,18,.1);border:1px solid rgba(243,156,18,.25);border-radius:8px;padding:8px 12px;font-size:12px;color:#F59E0B;margin-bottom:6px}" +
  ".adm-alert-danger{background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.25);border-radius:8px;padding:8px 12px;font-size:12px;color:#EF4444;font-weight:600;margin-bottom:6px}" +
  ".adm-fmt-item{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--sf);border:1px solid var(--bd);border-radius:8px;margin-bottom:4px}" +
  ".adm-k-col{min-width:250px;max-width:280px;flex-shrink:0}" +
  ".adm-k-head{padding:10px 14px;border-radius:12px 12px 0 0;background:var(--c);border:1px solid var(--bd);display:flex;justify-content:space-between;align-items:center}" +
  ".adm-k-body{background:var(--sf);border:1px solid var(--bd);border-top:none;border-radius:0 0 12px 12px;padding:8px;display:flex;flex-direction:column;gap:6px;min-height:60px}" +
  ".adm-k-card{background:var(--c);border:1px solid var(--bd);border-radius:8px;padding:12px;cursor:pointer;transition:.15s}" +
  ".adm-k-card:hover{border-color:var(--a)}";

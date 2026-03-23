import React from 'react';
import { useState, useEffect, useRef, useMemo } from "react";
import { logActivityDB, saveComment as dbSaveComment } from "../lib/data-service.js";
import { sendEmail } from "../lib/email-service.js";

// ══════════════════════════════════════════════════════════════
// LAB LEARNING — Prospection Email
// Formulaire + 3 types + Templates éditables + Historique + Stats
// ══════════════════════════════════════════════════════════════

const DEFAULT_TEMPLATES = [
  { id: "chaud", name: "🔥 Chaud", subject: "Suite à mon passage dans votre établissement", html: "<!DOCTYPE html><html lang=\\\"fr\\\"><head><meta charset=\\\"utf-8\\\"><meta name=\\\"viewport\\\" content=\\\"width=device-width,initial-scale=1\\\"><title>Lab Learning</title></head><body style=\\\"margin:0;padding:0;background:#f0f8f6;font-family:Arial,sans-serif\\\"><table width=\\\"100%\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" border=\\\"0\\\" style=\\\"background:#f0f8f6\\\"><tr><td align=\\\"center\\\" style=\\\"padding:20px\\\"><table width=\\\"600\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" border=\\\"0\\\" style=\\\"max-width:600px;width:100%\\\"><tr><td align=\\\"center\\\" bgcolor=\\\"#195144\\\" style=\\\"padding:40px 20px;border-radius:16px 16px 0 0\\\"><img src=\\\"https://image2url.com/r2/default/images/1769773980533-eefb09b4-6364-4787-a446-f57abf702834.png\\\" width=\\\"220\\\" alt=\\\"Lab Learning\\\" style=\\\"display:block;max-width:220px;height:auto\\\"><p style=\\\"margin:15px 0 0;font-size:13px;font-weight:bold;color:#fff;text-transform:uppercase;letter-spacing:2px\\\">SUITE À NOTRE ÉCHANGE</p></td></tr><tr><td bgcolor=\\\"#ffffff\\\" style=\\\"padding:40px 30px\\\"><p style=\\\"margin:0 0 20px;font-size:16px;line-height:1.7;color:#2d3748\\\">{{SALUTATION}},</p><p style=\\\"margin:0 0 20px;font-size:16px;line-height:1.7;color:#2d3748\\\">Je vous transmets notre catalogue de formations. Lab Learning accompagne les professionnels sur trois axes :</p><table width=\\\"100%\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" border=\\\"0\\\" style=\\\"margin-bottom:15px\\\"><tr><td bgcolor=\\\"#f0f8f6\\\" style=\\\"border-left:5px solid #195144;border-radius:8px;padding:18px 20px\\\"><p style=\\\"margin:0;font-size:16px;color:#2d3748\\\"><strong style=\\\"color:#195144\\\">🎯 Expertise sur site</strong><br><span style=\\\"color:#4a5568\\\">Nos formateurs interviennent directement dans votre établissement</span></p></td></tr></table><table width=\\\"100%\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" border=\\\"0\\\" style=\\\"margin-bottom:15px\\\"><tr><td bgcolor=\\\"#f0f8f6\\\" style=\\\"border-left:5px solid #195144;border-radius:8px;padding:18px 20px\\\"><p style=\\\"margin:0;font-size:16px;color:#2d3748\\\"><strong style=\\\"color:#195144\\\">📈 Sécurité & Rendement</strong><br><span style=\\\"color:#4a5568\\\">Des modules pour sécuriser votre activité et optimiser votre rendement</span></p></td></tr></table><table width=\\\"100%\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" border=\\\"0\\\" style=\\\"margin-bottom:25px\\\"><tr><td bgcolor=\\\"#f0f8f6\\\" style=\\\"border-left:5px solid #195144;border-radius:8px;padding:18px 20px\\\"><p style=\\\"margin:0;font-size:16px;color:#2d3748\\\"><strong style=\\\"color:#195144\\\">💼 Gestion administrative</strong><br><span style=\\\"color:#4a5568\\\">Financement jusqu'à 100% par votre OPCO</span></p></td></tr></table><table width=\\\"100%\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" border=\\\"0\\\" style=\\\"margin-bottom:25px\\\"><tr><td align=\\\"center\\\" bgcolor=\\\"#FFD700\\\" style=\\\"border-radius:50px;box-shadow:0 4px 15px rgba(0,0,0,.2)\\\"><a href=\\\"https://kofkfqfvdlt.typeform.com/to/ICiOa8tE\\\" target=\\\"_blank\\\" style=\\\"display:inline-block;padding:18px 42px;font-size:18px;font-weight:900;color:#1a1a1a;text-decoration:none\\\">📅 Planifier un échange</a></td></tr></table><p style=\\\"margin:0;font-size:16px;line-height:1.7;color:#2d3748\\\">Bien cordialement,<br><strong style=\\\"color:#195144\\\">{{COMMERCIAL}}</strong></p></td></tr><tr><td align=\\\"center\\\" bgcolor=\\\"#1a1a1a\\\" style=\\\"border-radius:0 0 16px 16px;padding:30px 20px\\\"><a href=\\\"https://www.lab-learning.fr\\\" style=\\\"font-size:14px;color:#c5e1a5;text-decoration:none\\\">🌐 www.lab-learning.fr</a><br><a href=\\\"mailto:{{EMAIL_COMMERCIAL}}\\\" style=\\\"font-size:14px;color:#c5e1a5;text-decoration:none\\\">📧 {{EMAIL_COMMERCIAL}}</a><br><p style=\\\"margin:15px 0 0;font-size:12px;color:#999\\\">© 2026 Lab Learning</p></td></tr></table></td></tr></table></body></html>" },
  { id: "moyen", name: "\u23F0 Moyen", subject: "Suite \u00e0 notre rencontre dans votre \u00e9tablissement", html: "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"utf-8\"><title>Lab Learning</title></head><body style=\"margin:0;padding:0;background:#f0f8f6;font-family:Arial,sans-serif\"><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:#f0f8f6\"><tr><td align=\"center\" style=\"padding:20px\"><table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width:600px;width:100%\"><tr><td align=\"center\" bgcolor=\"#195144\" style=\"padding:40px 20px;border-radius:16px 16px 0 0\"><img src=\"https://image2url.com/r2/default/images/1769773980533-eefb09b4-6364-4787-a446-f57abf702834.png\" width=\"220\" alt=\"Lab Learning\" style=\"display:block;max-width:220px;height:auto\"><p style=\"margin:15px 0 0;font-size:13px;font-weight:bold;color:#fff;text-transform:uppercase;letter-spacing:2px\">SUITE \u00c0 NOTRE \u00c9CHANGE</p></td></tr><tr><td bgcolor=\"#ffffff\" style=\"padding:40px 30px\"><p style=\"margin:0 0 20px;font-size:16px;line-height:1.7;color:#2d3748\">{{SALUTATION}},</p><p style=\"margin:0 0 20px;font-size:16px;line-height:1.7;color:#2d3748\">Ravi d'avoir pu \u00e9changer avec vous lors de mon passage dans votre \u00e9tablissement. Comme \u00e9voqu\u00e9, notre solution est con\u00e7ue pour s\u00e9curiser vos pratiques tout en optimisant le rendement global de vos \u00e9quipes. L'id\u00e9e est de gagner en efficacit\u00e9 imm\u00e9diate, directement sur le terrain, sans d\u00e9sorganiser votre service.</p><p style=\"margin:0 0 20px;font-size:16px;line-height:1.7;color:#2d3748\">Voici comment nous simplifions la d\u00e9marche pour vous :</p><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin-bottom:15px\"><tr><td bgcolor=\"#f0f8f6\" style=\"border-left:5px solid #195144;border-radius:8px;padding:18px 20px\"><p style=\"margin:0;font-size:16px;color:#2d3748\"><strong style=\"color:#195144\">\uD83D\uDCB0 Sans avance de frais</strong><br><span style=\"color:#4a5568\">Nous s\u00e9curisons la prise en charge int\u00e9grale par votre OPCO</span></p></td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin-bottom:15px\"><tr><td bgcolor=\"#f0f8f6\" style=\"border-left:5px solid #195144;border-radius:8px;padding:18px 20px\"><p style=\"margin:0;font-size:16px;color:#2d3748\"><strong style=\"color:#195144\">\uD83C\uDFAF Formation sur site</strong><br><span style=\"color:#4a5568\">Nos formateurs interviennent chez vous, en s'adaptant \u00e0 vos contraintes</span></p></td></tr></table><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin-bottom:25px\"><tr><td bgcolor=\"#f0f8f6\" style=\"border-left:5px solid #195144;border-radius:8px;padding:18px 20px\"><p style=\"margin:0;font-size:16px;color:#2d3748\"><strong style=\"color:#195144\">\uD83D\uDCCB Gestion compl\u00e8te</strong><br><span style=\"color:#4a5568\">Nous pilotons tout le montage administratif pour vous lib\u00e9rer de la paperasse</span></p></td></tr></table><p style=\"margin:0 0 20px;font-size:16px;line-height:1.7;color:#2d3748\">Je reste \u00e0 votre enti\u00e8re disposition si vous souhaitez faire le point sur votre budget disponible et voir comment nous pouvons vous accompagner.</p><p style=\"margin:0;font-size:16px;line-height:1.7;color:#2d3748\">Bien cordialement,<br><strong style=\"color:#195144\">{{COMMERCIAL}}</strong></p></td></tr><tr><td align=\"center\" bgcolor=\"#1a1a1a\" style=\"border-radius:0 0 16px 16px;padding:30px 20px\"><a href=\"https://www.lab-learning.fr\" style=\"font-size:14px;color:#c5e1a5;text-decoration:none\">\uD83C\uDF10 www.lab-learning.fr</a><br><a href=\"mailto:{{EMAIL_COMMERCIAL}}\" style=\"font-size:14px;color:#c5e1a5;text-decoration:none\">\uD83D\uDCE7 {{EMAIL_COMMERCIAL}}</a><br><p style=\"margin:15px 0 0;font-size:12px;color:#999\">\u00a9 2026 Lab Learning</p></td></tr></table></td></tr></table></body></html>" },
  { id: "froid", name: "\u2744\uFE0F Froid", subject: "Notre catalogue de formations", html: "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"utf-8\"><title>Lab Learning</title></head><body style=\"margin:0;padding:0;background:#f0f8f6;font-family:Arial,sans-serif\"><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background:#f0f8f6\"><tr><td align=\"center\" style=\"padding:20px\"><table width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width:600px;width:100%\"><tr><td align=\"center\" bgcolor=\"#195144\" style=\"padding:40px 20px;border-radius:16px 16px 0 0\"><img src=\"https://image2url.com/r2/default/images/1769773980533-eefb09b4-6364-4787-a446-f57abf702834.png\" width=\"220\" alt=\"Lab Learning\" style=\"display:block;max-width:220px;height:auto\"><p style=\"margin:15px 0 0;font-size:13px;font-weight:bold;color:#fff;text-transform:uppercase;letter-spacing:2px\">CATALOGUE DE FORMATIONS</p></td></tr><tr><td bgcolor=\"#ffffff\" style=\"padding:40px 30px\"><p style=\"margin:0 0 20px;font-size:16px;line-height:1.7;color:#2d3748\">{{SALUTATION}},</p><p style=\"margin:0 0 20px;font-size:16px;line-height:1.7;color:#2d3748\">Lab Learning accompagne les professionnels de votre secteur pour s\u00e9curiser leurs pratiques et optimiser le rendement de leurs \u00e9quipes, directement sur site.</p><table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin-bottom:25px\"><tr><td bgcolor=\"#f0f8f6\" style=\"border-left:5px solid #195144;border-radius:8px;padding:18px 20px\"><p style=\"margin:0;font-size:16px;color:#2d3748;line-height:1.8\"><strong style=\"color:#195144\">\uD83D\uDCB0</strong> Prise en charge jusqu'\u00e0 100% par votre OPCO, sans avance de frais<br><strong style=\"color:#195144\">\uD83C\uDFAF</strong> Formations dispens\u00e9es sur site, adapt\u00e9es \u00e0 vos contraintes<br><strong style=\"color:#195144\">\uD83D\uDCCB</strong> Gestion administrative compl\u00e8te de votre dossier</p></td></tr></table><p style=\"margin:0 0 20px;font-size:16px;line-height:1.7;color:#2d3748\">Je reste \u00e0 votre disposition si vous souhaitez en savoir plus.</p><p style=\"margin:0;font-size:16px;line-height:1.7;color:#2d3748\">Bien cordialement,<br><strong style=\"color:#195144\">{{COMMERCIAL}}</strong></p></td></tr><tr><td align=\"center\" bgcolor=\"#1a1a1a\" style=\"border-radius:0 0 16px 16px;padding:30px 20px\"><a href=\"https://www.lab-learning.fr\" style=\"font-size:14px;color:#c5e1a5;text-decoration:none\">\uD83C\uDF10 www.lab-learning.fr</a><br><a href=\"mailto:{{EMAIL_COMMERCIAL}}\" style=\"font-size:14px;color:#c5e1a5;text-decoration:none\">\uD83D\uDCE7 {{EMAIL_COMMERCIAL}}</a><br><p style=\"margin:15px 0 0;font-size:12px;color:#999\">\u00a9 2026 Lab Learning</p></td></tr></table></td></tr></table></body></html>" },
];

const S = "\\n@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap');\\n*{margin:0;padding:0;box-sizing:border-box}\\n:root{--p:#195144;--pl:#1E6B5A;--a:#59D597;--ag:rgba(89,213,151,.15);--bg:#0B0F1A;--c:#111827;--sf:#0F172A;--inp:#1E293B;--t1:#F1F5F9;--t2:#94A3B8;--tm:#64748B;--bd:rgba(148,163,184,.08);--fb:'Plus Jakarta Sans',sans-serif;--fd:'Outfit',sans-serif}\\nbody{font-family:var(--fb);background:var(--bg);color:var(--t1)}\\n::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(148,163,184,.15);border-radius:3px}\\n@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}\\n.anim{animation:fadeUp .35s ease forwards}\\n.inp{width:100%;padding:10px 14px;background:var(--inp);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-family:var(--fb);font-size:14px;outline:none;transition:.2s}\\n.inp:focus{border-color:var(--a);box-shadow:0 0 0 3px var(--ag)}\\n.inp::placeholder{color:var(--tm)}\\nselect.inp{cursor:pointer;appearance:auto}\\ntextarea.inp{resize:vertical;min-height:80px;font-family:var(--fb)}\\n.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;font-family:var(--fb);font-weight:600;font-size:13px;cursor:pointer;border:none;transition:.15s}\\n.btn:hover{transform:translateY(-1px)}.btn:active{transform:translateY(0)}\\n.btn-p{background:linear-gradient(135deg,var(--p),var(--pl));color:#fff}\\n.btn-a{background:linear-gradient(135deg,var(--a),#3ECB82);color:var(--p);font-weight:700}\\n.btn-s{background:var(--inp);color:var(--t1);border:1px solid var(--bd)}\\n.btn-d{background:rgba(220,38,38,.1);color:#F87171;border:1px solid rgba(220,38,38,.2)}\\n.btn-sm{padding:6px 12px;font-size:12px}\\n.card{background:var(--c);border:1px solid var(--bd);border-radius:16px;padding:24px;margin-bottom:16px}\\n.lbl{display:block;font-size:11px;font-weight:700;color:var(--tm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}\\n.code-editor{width:100%;min-height:300px;padding:14px;background:#0D1117;border:1px solid #30363D;border-radius:10px;color:#C9D1D9;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;resize:vertical;outline:none;tab-size:2}\\n.code-editor:focus{border-color:var(--a);box-shadow:0 0 0 3px var(--ag)}\\n";

export default function ProspectionEmail(props) {
  var onNav = props && props.onNav ? props.onNav : function() {};
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("compose"); // compose | templates | history

  // ─── Form state ───
  const [civilite, setCivilite] = useState("");
  const [nom, setNom] = useState("");
  const [ville, setVille] = useState("");
  const [etablissement, setEtablissement] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [siret, setSiret] = useState("");
  const [selectedType, setSelectedType] = useState(null);
  const [notes, setNotes] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // ─── Templates state ───
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editHtml, setEditHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  // ─── History state ───
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, total: 0, chaud: 0, moyen: 0, froid: 0, errors: 0 });

  // ─── Voice ───
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    if (!document.getElementById('prosp-s')) { const s = document.createElement('style'); s.id = 'prosp-s'; s.textContent = S; document.head.appendChild(s); }
    try {
      var pf = localStorage.getItem("ll_prefill_email");
      if (pf) {
        var d = JSON.parse(pf);
        if (d.nom) setNom(d.nom + (d.prenom ? " " + d.prenom : ""));
        if (d.civilite) setCivilite(d.civilite);
        if (d.etablissement) setEtablissement(d.etablissement);
        if (d.email) setEmail(d.email);
        if (d.telephone) setTelephone(d.telephone);
        if (d.ville) setVille(d.ville);
        localStorage.removeItem("ll_prefill_email");
      }
    } catch (e) {}
  }, []);

  // Voice setup
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = true; r.interimResults = true; r.lang = 'fr-FR';
      r.onresult = (e) => {
        let final = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
        }
        if (final) setNotes(prev => prev + final);
      };
      r.onend = () => setIsRecording(false);
      recognitionRef.current = r;
    }
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) { showToast("⚠️ Dictée vocale non supportée"); return; }
    if (isRecording) { recognitionRef.current.stop(); setIsRecording(false); }
    else { recognitionRef.current.start(); setIsRecording(true); }
  };

  // ─── SEND EMAIL (via Brevo API) ───
  const handleSend = async () => {
    if (!civilite) { showToast("⚠️ Sélectionnez une civilité"); return; }
    if (!etablissement || !email) { showToast("⚠️ Établissement et email requis"); return; }
    if (!email.includes("@")) { showToast("⚠️ Email invalide"); return; }
    if (!selectedType) { showToast("⚠️ Sélectionnez un type"); return; }

    // Build salutation dynamically
    let salutation = "Bonjour";
    if (civilite && nom) salutation = ("Bonjour " + (civilite) + " " + (nom));
    else if (civilite) salutation = ("Bonjour " + (civilite));
    else if (nom) salutation = ("Bonjour " + (nom));

    var tpl = templates.find(function(t) { return t.id === selectedType; });
    if (!tpl) { showToast("⚠️ Template introuvable"); return; }
    var commercialName = localStorage.getItem("ll_brevo_name") || "Lab Learning";
    var commercialEmail = localStorage.getItem("ll_brevo_email") || "contact@lab-learning.fr";
    var htmlContent = tpl.html.replace(/\{\{SALUTATION\}\}/g, salutation).replace(/\{\{COMMERCIAL\}\}/g, commercialName).replace(/\{\{EMAIL_COMMERCIAL\}\}/g, commercialEmail);

    setSending(true);
    try {
      await sendEmail({ to: email, toName: (civilite ? civilite + " " : "") + (nom || ""), subject: tpl.subject, html: htmlContent });
      const entry = {
        id: Date.now(), date: new Date().toLocaleDateString('fr-FR'), heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        email: email, etablissement: etablissement, type: selectedType, nom: nom || "—", ville: ville || "—", civilite: civilite, salutation: salutation, status: "envoyé"
      };
      setHistory(prev => [entry, ...prev].slice(0, 100));
      setStats(prev => ({ ...prev, total: prev.total + 1, today: prev.today + 1, week: prev.week + 1, month: prev.month + 1, [selectedType]: (prev[selectedType] || 0) + 1 }));
      setSending(false);
      setSent(true);
      showToast("✅ Email envoyé à " + email);
      logActivityDB({ module: "email", action: "email_sent", type: "email_sent", leadName: nom || "", details: "Template " + selectedType + " a " + email });
      try {
        var crmData = JSON.parse(localStorage.getItem('crm_pro_v2') || '{"leads":[],"tasks":[],"comments":[],"calls":[],"groups":[]}');
        var matchLead = crmData.leads.find(function(l) { return (l.email || '').toLowerCase() === email.toLowerCase() || (l.etablissement || '').toLowerCase() === etablissement.toLowerCase(); });
        if (matchLead) {
          crmData.comments = [{ id: 'id_' + Date.now(), lead_id: matchLead.id, text: '✉️ Email envoyé (template ' + selectedType + ') via Prospection', date: new Date().toISOString() }].concat(crmData.comments || []);
          localStorage.setItem('crm_pro_v2', JSON.stringify(crmData));
        }
      } catch (err) {}
    } catch (sendErr) {
      setSending(false);
      showToast("❌ Erreur : " + (sendErr.message || "Envoi échoué"));
    }
  };

  const resetForm = () => {
    setCivilite(""); setNom(""); setVille(""); setEtablissement(""); setEmail(""); setTelephone(""); setSiret("");
    setSelectedType(null); setNotes(""); setPdfName(""); setSent(false);
  };

  const saveAndNew = () => { showToast("💾 Enregistré !"); resetForm(); };

  // ─── TEMPLATE MANAGEMENT ───
  const startEditTemplate = (t) => { setEditingTemplate(t.id); setEditName(t.name); setEditSubject(t.subject); setEditHtml(t.html); setShowPreview(false); };
  const saveTemplate = () => {
    setTemplates(prev => prev.map(t => t.id === editingTemplate ? { ...t, name: editName, subject: editSubject, html: editHtml } : t));
    setEditingTemplate(null); showToast("✅ Template sauvegardé");
  };
  const addNewTemplate = () => {
    if (!newTemplateName.trim()) { showToast("⚠️ Donnez un nom au template"); return; }
    const id = "custom_" + Date.now();
    setTemplates(prev => [...prev, { id, name: newTemplateName, subject: "Objet du mail", html: "<!DOCTYPE html><html><head><meta charset=\\\"utf-8\\\"></head><body style=\\\"margin:0;padding:20px;font-family:Arial,sans-serif\\\"><h1>{{SALUTATION}}</h1><p>Votre contenu ici...</p><p>{{COMMERCIAL}}</p></body></html>" }]);
    setNewTemplateName("");
    showToast("✅ Template créé");
  };
  const deleteTemplate = (id) => {
    if (DEFAULT_TEMPLATES.find(t => t.id === id)) { showToast("⚠️ Les templates par défaut ne peuvent pas être supprimés"); return; }
    setTemplates(prev => prev.filter(t => t.id !== id));
    showToast("🗑️ Template supprimé");
  };

  const currentTemplate = templates.find(t => t.id === selectedType);

  // ─── RENDER ───
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--t1)" }}>
      <style>{S}</style>

      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg,#0e2f27,#195144,#1a6b52)", padding: "16px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>✉️</span>
            <div>
              <h1 style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800 }}>Prospection Email</h1>
              <p style={{ fontSize: 12, opacity: .7 }}>Envoi de mails personnalisés aux prospects</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ id: "compose", label: "📝 Composer", icon: "1" }, { id: "templates", label: "🎨 Templates", icon: "2" }, { id: "history", label: ("📬 Historique (" + (history.length) + ")"), icon: "3" }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "8px 16px", borderRadius: 8, border: tab === t.id ? "1px solid var(--a)" : "1px solid rgba(255,255,255,.2)",
                background: tab === t.id ? "var(--ag)" : "rgba(255,255,255,.05)", color: tab === t.id ? "var(--a)" : "rgba(255,255,255,.7)",
                fontFamily: "var(--fb)", fontWeight: 600, fontSize: 12, cursor: "pointer"
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TAB: COMPOSE ═══ */}
      {tab === "compose" && (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
          {!sent ? <>
            {/* Steps */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "linear-gradient(135deg,var(--p),var(--a))", borderRadius: 10, padding: 12 }}>
              {[{ n: 1, l: "Infos", done: !!etablissement && !!civilite }, { n: 2, l: "Type", done: !!selectedType }, { n: 3, l: "PDF", done: !!pdfName }, { n: 4, l: "Envoi", done: sent }, { n: 5, l: "Notes", done: false }].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, opacity: s.done ? 1 : 0.4 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#fff", color: "var(--p)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11 }}>{s.done ? "✓" : s.n}</div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{s.l}</span>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="card">
              <h3 style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📋 Informations Prospect</h3>
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div><label className="lbl">Civilité <span style={{color:"#EF4444"}}>*</span></label>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["Monsieur", "Madame"].map(c => (
                      <button key={c} onClick={() => setCivilite(c)} style={{
                        flex: 1, padding: "8px 6px", borderRadius: 6, border: civilite === c ? "2px solid var(--a)" : !civilite ? "1px solid rgba(239,68,68,.3)" : "1px solid var(--bd)",
                        background: civilite === c ? "var(--ag)" : "var(--sf)", color: civilite === c ? "var(--a)" : "var(--tm)",
                        cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "var(--fb)"
                      }}>{c === "Monsieur" ? "👨" : "👩"} {c}</button>
                    ))}
                  </div>
                  {!civilite && <div style={{fontSize:10,color:"#EF4444",marginTop:3}}>Obligatoire</div>}
                </div>
                <div><label className="lbl">Nom</label><input className="inp" value={nom} onChange={e => setNom(e.target.value)} placeholder="Martin" /></div>
                <div><label className="lbl">Établissement *</label><input className="inp" value={etablissement} onChange={e => setEtablissement(e.target.value)} placeholder="Restaurant Le Gourmet" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div><label className="lbl">Email *</label><input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@restaurant.fr" /></div>
                <div><label className="lbl">Téléphone</label><input className="inp" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 12 34 56 78" /></div>
                <div><label className="lbl">Ville</label><input className="inp" value={ville} onChange={e => setVille(e.target.value)} placeholder="Lyon" /></div>
              </div>
            </div>

            {/* Type selection */}
            <div className="card">
              <h3 style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>🎯 Type de Prospect *</h3>
              <div style={{ display: "grid", gridTemplateColumns: ("repeat(" + (templates.length > 4 ? 4 : templates.length) + ", 1fr)"), gap: 12 }}>
                {templates.map(t => (
                  <div key={t.id} onClick={() => setSelectedType(t.id)} style={{
                    padding: 20, borderRadius: 12, textAlign: "center", cursor: "pointer", transition: "all .2s",
                    border: selectedType === t.id ? "2px solid var(--a)" : "1px solid var(--bd)",
                    background: selectedType === t.id ? "var(--ag)" : "var(--sf)",
                    transform: selectedType === t.id ? "translateY(-2px)" : "none"
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>{t.name.split(" ")[0]}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: selectedType === t.id ? "var(--a)" : "var(--t1)" }}>{t.name.split(" ").slice(1).join(" ") || t.name}</div>
                  </div>
                ))}
              </div>
              {currentTemplate && <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--sf)", borderRadius: 8, fontSize: 12 }}>
                <span style={{ color: "var(--tm)" }}>Objet : </span>
                <span style={{ color: "var(--t1)", fontWeight: 600 }}>{currentTemplate.subject}</span>
              </div>}
            </div>

            {/* PDF upload with drag & drop */}
            <div className="card">
              <h3 style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>📁 Catalogue PDF</h3>
              <div onClick={() => document.getElementById("pdfInput").click()}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = "var(--a)"; e.currentTarget.style.background = "var(--ag)"; }}
                onDragLeave={e => { e.currentTarget.style.borderColor = pdfName ? "var(--a)" : "var(--bd)"; e.currentTarget.style.background = pdfName ? "var(--ag)" : "var(--sf)"; }}
                onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = pdfName ? "var(--a)" : "var(--bd)"; const f = e.dataTransfer.files[0]; if (f && f.type === "application/pdf") { setPdfName(f.name); } else { showToast("⚠️ PDF requis"); } }}
                style={{
                  border: pdfName ? "2px solid var(--a)" : "3px dashed var(--bd)", borderRadius: 12, padding: 32,
                  textAlign: "center", cursor: "pointer", background: pdfName ? "var(--ag)" : "var(--sf)", transition: "all .2s"
                }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>{pdfName ? "✅" : "📄"}</div>
                <div style={{ fontWeight: 600, color: "var(--t1)" }}>{pdfName ? ("✅ " + (pdfName)) : "Cliquez pour sélectionner un PDF"}</div>
                {!pdfName && <div style={{ fontSize: 12, color: "var(--tm)", marginTop: 4 }}>ou glissez-déposez</div>}
                {pdfName && <button onClick={e => { e.stopPropagation(); setPdfName(""); }} style={{ marginTop: 8, background: "none", border: "1px solid rgba(239,68,68,.3)", borderRadius: 6, padding: "4px 12px", color: "#F87171", fontSize: 11, cursor: "pointer", fontFamily: "var(--fb)" }}>✕ Retirer</button>}
              </div>
              <input id="pdfInput" type="file" accept=".pdf" style={{ display: "none" }} onChange={e => { if (e.target.files[0]?.type === "application/pdf") setPdfName(e.target.files[0].name); else if (e.target.files[0]) showToast("⚠️ PDF requis"); }} />
            </div>

            {/* Send */}
            <button className="btn btn-a" onClick={handleSend} disabled={sending} style={{ width: "100%", padding: "16px 24px", fontSize: 16, opacity: sending ? .6 : 1 }}>
              {sending ? <><span style={{ width: 18, height: 18, border: "2px solid rgba(25,81,68,.3)", borderTopColor: "var(--p)", borderRadius: "50%", display: "inline-block", animation: "spin .6s linear infinite" }} /> Envoi en cours...</> : "📧 ENVOYER LE MAIL"}
            </button>
            <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
          </> : <>
            {/* Post-send: Notes */}
            <div className="card anim">
              <div style={{ padding: 14, borderRadius: 10, background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)", marginBottom: 16 }}>
                <strong style={{ color: "#10B981" }}>✅ Email envoyé à : {email}</strong><br />
                <span style={{ fontSize: 13, color: "var(--t2)" }}>🏢 {etablissement} | {civilite} {nom} | {templates.find(t => t.id === selectedType)?.name || selectedType}</span>
              </div>
              <h3 style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📝 Notes</h3>
              <div style={{ position: "relative", marginBottom: 16 }}>
                <textarea className="inp" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Intéressé par formations hygiène. Budget mars..." style={{ minHeight: 100, paddingRight: 50 }} />
                <button onClick={toggleVoice} style={{
                  position: "absolute", right: 8, top: 8, width: 36, height: 36, borderRadius: 8, border: "none", cursor: "pointer",
                  background: isRecording ? "linear-gradient(135deg,#EF4444,#DC2626)" : "var(--sf)", color: isRecording ? "#fff" : "var(--tm)", fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }} title="Dictée vocale">🎤</button>
              </div>
              {isRecording && <div style={{ fontSize: 12, color: "#EF4444", fontWeight: 600, marginBottom: 12 }}>🔴 Dictée en cours...</div>}
              <button className="btn btn-a" onClick={saveAndNew} style={{ width: "100%", padding: "14px 24px", fontSize: 15 }}>💾 ENREGISTRER ET NOUVEAU PROSPECT</button>
            </div>
          </>}
        </div>
      )}

      {/* ═══ TAB: TEMPLATES ═══ */}
      {tab === "templates" && (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
          {!editingTemplate ? <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800 }}>🎨 Gestion des Templates Email</h2>
                <p style={{ fontSize: 13, color: "var(--t2)", marginTop: 4 }}>Modifiez ou créez vos templates HTML. Variables disponibles : <code style={{ background: "var(--sf)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>{"{{SALUTATION}} {{COMMERCIAL}} {{EMAIL_COMMERCIAL}}"}</code></p>
              </div>
            </div>

            {/* Templates list */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 24 }}>
              {templates.map(t => (
                <div key={t.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--bd)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                      {!DEFAULT_TEMPLATES.find(d => d.id === t.id) && <button className="btn btn-d btn-sm" onClick={() => deleteTemplate(t.id)}>🗑️</button>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--tm)", marginTop: 4 }}>Objet : {t.subject}</div>
                  </div>
                  {/* Mini preview */}
                  <div style={{ height: 120, overflow: "hidden", position: "relative", background: "#fff" }}>
                    <iframe srcDoc={t.html.replace("{{SALUTATION}}", "Bonjour").replace("{{COMMERCIAL}}", "Nom Commercial").replace("{{EMAIL_COMMERCIAL}}", "email@lab-learning.fr")}
                      style={{ width: "200%", height: "240px", border: "none", transform: "scale(0.5)", transformOrigin: "top left", pointerEvents: "none" }} title={t.name} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 60%, var(--c) 100%)" }} />
                  </div>
                  <div style={{ padding: "12px 20px" }}>
                    <button className="btn btn-p btn-sm" onClick={() => startEditTemplate(t)} style={{ width: "100%" }}>✏️ Modifier le template</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new template */}
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>➕</span>
              <input className="inp" value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="Nom du nouveau template (ex: 🎯 Relance)" style={{ flex: 1 }} />
              <button className="btn btn-a btn-sm" onClick={addNewTemplate}>Créer</button>
            </div>
          </> : <>
            {/* Template editor */}
            <div className="anim">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <button className="btn btn-s btn-sm" onClick={() => setEditingTemplate(null)} style={{ marginBottom: 8 }}>← Retour aux templates</button>
                  <h2 style={{ fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800 }}>✏️ Modifier : {editName}</h2>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-s btn-sm" onClick={() => setShowPreview(!showPreview)}>{showPreview ? "📝 Code" : "👁️ Prévisualiser"}</button>
                  <button className="btn btn-a" onClick={saveTemplate}>💾 Enregistrer</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div><label className="lbl">Nom du template</label><input className="inp" value={editName} onChange={e => setEditName(e.target.value)} /></div>
                <div><label className="lbl">Objet de l'email</label><input className="inp" value={editSubject} onChange={e => setEditSubject(e.target.value)} /></div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="lbl">Variables disponibles</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["{{SALUTATION}}", "{{COMMERCIAL}}", "{{EMAIL_COMMERCIAL}}", "{{ETABLISSEMENT}}", "{{NOM}}"].map(v => (
                    <span key={v} onClick={() => { setEditHtml(prev => prev + v); showToast(((v) + " ajouté")); }}
                      style={{ padding: "4px 10px", borderRadius: 6, background: "var(--sf)", border: "1px solid var(--bd)", fontSize: 11, fontFamily: "monospace", color: "var(--a)", cursor: "pointer" }}>{v}</span>
                  ))}
                </div>
              </div>

              {!showPreview ? (
                <textarea className="code-editor" value={editHtml} onChange={e => setEditHtml(e.target.value)} spellCheck={false} />
              ) : (
                <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid var(--bd)" }}>
                  <div style={{ padding: "8px 14px", background: "var(--sf)", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--bd)" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
                    <span style={{ fontSize: 11, color: "var(--tm)", marginLeft: 8 }}>Aperçu email</span>
                  </div>
                  <iframe srcDoc={editHtml.replace(/\{\{SALUTATION\}\}/g, "Bonjour M. Martin").replace(/\{\{COMMERCIAL\}\}/g, "Laoussine Tatah").replace(/\{\{EMAIL_COMMERCIAL\}\}/g, "laoussine.tatah@lab-learning.fr").replace(/\{\{ETABLISSEMENT\}\}/g, "Restaurant Le Gourmet").replace(/\{\{NOM\}\}/g, "Martin")}
                    style={{ width: "100%", height: 500, border: "none" }} title="Preview" />
                </div>
              )}
            </div>
          </>}
        </div>
      )}

      {/* ═══ TAB: HISTORY ═══ */}
      {tab === "history" && (
        <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
          {/* Stats - 8 counters in 2 rows */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700 }}>📊 Statistiques</h2>
            <button className="btn btn-s btn-sm" onClick={() => { setStats({ today: 0, week: 0, month: 0, total: 0, chaud: 0, moyen: 0, froid: 0, errors: 0 }); showToast("🔄 Stats réinitialisées"); }}>🔄 Reset</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 10 }}>
            {[{ l: "Aujourd'hui", v: stats.today, c: "var(--p)" }, { l: "Semaine", v: stats.week, c: "var(--a)" }, { l: "Mois", v: stats.month, c: "#3ECB82" }, { l: "Total", v: stats.total, c: "var(--pl)" }].map((s, i) => (
              <div key={i} style={{ background: "var(--c)", border: "1px solid var(--bd)", borderLeft: ("3px solid " + (s.c)), borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase" }}>{s.l}</div>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--fd)", color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
            {[{ l: "🔥 Chauds", v: stats.chaud, c: "#EF4444" }, { l: "⏰ Moyens", v: stats.moyen, c: "#F59E0B" }, { l: "❄️ Froids", v: stats.froid, c: "#3B82F6" }, { l: "⚠️ Erreurs", v: stats.errors, c: "#DC2626" }].map((s, i) => (
              <div key={i} style={{ background: "var(--c)", border: "1px solid var(--bd)", borderLeft: ("3px solid " + (s.c)), borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase" }}>{s.l}</div>
                <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--fd)", color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>📬 Historique des envois</h2>
          {!history.length ? (
            <div className="card" style={{ textAlign: "center", padding: 48 }}><div style={{ fontSize: 48, marginBottom: 12 }}>📭</div><p style={{ color: "var(--tm)" }}>Aucun email envoyé</p></div>
          ) : <>
            {history.map(h => (
              <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 12, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>📧 {h.email}</div>
                  <div style={{ fontSize: 12, color: "var(--tm)" }}>🏢 {h.etablissement} • {h.civilite ? ((h.civilite) + " " + (h.nom)) : h.nom} • {h.date} à {h.heure}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: h.type === "chaud" ? "rgba(239,68,68,.1)" : h.type === "moyen" ? "rgba(245,158,11,.1)" : "rgba(59,130,246,.1)", color: h.type === "chaud" ? "#EF4444" : h.type === "moyen" ? "#F59E0B" : "#3B82F6" }}>
                    {templates.find(t => t.id === h.type)?.name || h.type}
                  </span>
                  <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600 }}>✅</span>
                </div>
              </div>
            ))}
            <button className="btn btn-d btn-sm" onClick={() => { setHistory([]); setStats({ total: 0, chaud: 0, moyen: 0, froid: 0 }); showToast("🗑️ Historique effacé"); }} style={{ marginTop: 12 }}>🗑️ Effacer l'historique</button>
          </>}
        </div>
      )}

      {/* TOAST */}
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 300, boxShadow: "0 10px 40px rgba(0,0,0,.5)", animation: "fadeUp .3s ease", background: "rgba(89,213,151,.15)", color: "#59D597", border: "1px solid rgba(89,213,151,.3)", backdropFilter: "blur(10px)" }}>{toast}</div>}
    </div>
  );
}

import React from 'react';
import { useState, useEffect, useRef } from "react";
import { sendEmail } from "../lib/email-service.js";
import { logActivityDB, saveComment as dbSaveComment } from "../lib/data-service.js";

var STORAGE_KEY = "ll_mail_templates";
var HISTORY_KEY = "ll_mail_history";

export default function Mailing(props) {
  var onNav = props && props.onNav ? props.onNav : function() {};
  var _tpls = useState([]); var templates = _tpls[0], setTemplates = _tpls[1];
  var _hist = useState([]); var history = _hist[0], setHistory = _hist[1];
  var _leads = useState([]); var leads = _leads[0], setLeads = _leads[1];
  var _tab = useState("envoyer"); var tab = _tab[0], setTab = _tab[1];
  var _toast = useState(null); var toast = _toast[0], setToast = _toast[1];
  var _sending = useState(false); var sending = _sending[0], setSending = _sending[1];

  // Send form state
  var _dest = useState(""); var dest = _dest[0], setDest = _dest[1];
  var _destName = useState(""); var destName = _destName[0], setDestName = _destName[1];
  var _selTpl = useState(null); var selTpl = _selTpl[0], setSelTpl = _selTpl[1];
  var _customSubject = useState(""); var customSubject = _customSubject[0], setCustomSubject = _customSubject[1];
  var _customBody = useState(""); var customBody = _customBody[0], setCustomBody = _customBody[1];

  // Template editor state
  var _editId = useState(null); var editId = _editId[0], setEditId = _editId[1];
  var _eName = useState(""); var eName = _eName[0], setEName = _eName[1];
  var _eSubject = useState(""); var eSubject = _eSubject[0], setESubject = _eSubject[1];
  var _eBody = useState(""); var eBody = _eBody[0], setEBody = _eBody[1];
  var _showEditor = useState(false); var showEditor = _showEditor[0], setShowEditor = _showEditor[1];

  var showToast = function(m) { setToast(m); setTimeout(function() { setToast(null); }, 3000); };

  useEffect(function() {
    try { var t = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); if (t.length) setTemplates(t); } catch (e) {}
    try { var h = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); setHistory(h); } catch (e) {}
    try { var d = JSON.parse(localStorage.getItem("crm_pro_v2") || "{}"); setLeads((d.leads || []).filter(function(l) { return !l.trashed && l.email; })); } catch (e) {}
    try { var pf = localStorage.getItem("ll_prefill_mailing"); if (pf) { var pd = JSON.parse(pf); if (pd.email) setDest(pd.email); if (pd.name) setDestName(pd.name); localStorage.removeItem("ll_prefill_mailing"); } } catch (e) {}
  }, []);

  useEffect(function() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  }, [templates]);

  useEffect(function() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  // ─── TEMPLATE CRUD ───
  function saveTemplate() {
    if (!eName.trim() || !eSubject.trim()) { showToast("Nom et objet requis"); return; }
    if (editId) {
      setTemplates(templates.map(function(t) { return t.id === editId ? { id: editId, name: eName.trim(), subject: eSubject.trim(), body: eBody } : t; }));
    } else {
      setTemplates(templates.concat([{ id: "tpl_" + Date.now(), name: eName.trim(), subject: eSubject.trim(), body: eBody }]));
    }
    setShowEditor(false); setEditId(null); setEName(""); setESubject(""); setEBody("");
    showToast("Template sauvegard\u00e9");
  }

  function editTemplate(t) {
    setEditId(t.id); setEName(t.name); setESubject(t.subject); setEBody(t.body || ""); setShowEditor(true);
  }

  function deleteTemplate(id) {
    if (!confirm("Supprimer ce template ?")) return;
    setTemplates(templates.filter(function(t) { return t.id !== id; }));
    if (selTpl && selTpl.id === id) setSelTpl(null);
  }

  // ─── SELECT LEAD ───
  function selectLead(l) {
    setDest(l.email);
    setDestName((l.civilite ? l.civilite + " " : "") + (l.nom || "") + (l.prenom ? " " + l.prenom : ""));
  }

  // ─── BUILD HTML ───
  function buildHTML(body) {
    var commercialName = localStorage.getItem("ll_brevo_name") || "Lab Learning";
    var commercialEmail = localStorage.getItem("ll_brevo_email") || "contact@lab-learning.fr";
    if (body && body.indexOf("<") !== -1) return body;
    var text = (body || "").replace(/\n/g, "<br>");
    return "<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;font-family:Arial,sans-serif;background:#f0f8f6'><table width='100%'><tr><td align='center' style='padding:20px'><table width='600' style='max-width:600px'><tr><td bgcolor='#195144' style='padding:24px;text-align:center;border-radius:16px 16px 0 0'><p style='margin:0;font-size:18px;font-weight:bold;color:#fff'>LAB LEARNING</p></td></tr><tr><td bgcolor='#ffffff' style='padding:28px'><p style='font-size:15px;line-height:1.7;color:#2d3748'>" + text + "</p><p style='font-size:14px;color:#4b5563;margin-top:20px'>Bien cordialement,<br><strong style='color:#195144'>" + commercialName + "</strong></p></td></tr><tr><td bgcolor='#1a1a1a' style='padding:20px;text-align:center;border-radius:0 0 16px 16px'><a href='https://www.lab-learning.fr' style='font-size:12px;color:#c5e1a5;text-decoration:none'>www.lab-learning.fr</a><br><p style='margin:6px 0 0;font-size:11px;color:#777'>" + commercialEmail + "</p></td></tr></table></td></tr></table></body></html>";
  }

  // ─── SEND ───
  async function handleSend() {
    if (!dest || dest.indexOf("@") === -1) { showToast("Email destinataire requis"); return; }
    var subject = selTpl ? selTpl.subject : customSubject;
    var body = selTpl ? selTpl.body : customBody;
    if (!subject) { showToast("Objet requis"); return; }
    if (!body) { showToast("Contenu requis"); return; }
    var htmlContent = buildHTML(body);
    setSending(true);
    try {
      await sendEmail({ to: dest, toName: destName || "", subject: subject, html: htmlContent });
      var entry = { id: "m_" + Date.now(), date: new Date().toISOString(), to: dest, toName: destName, subject: subject, template: selTpl ? selTpl.name : "Personnalis\u00e9" };
      setHistory([entry].concat(history).slice(0, 200));
      logActivityDB({ module: "email", action: "email_sent", type: "email_sent", leadName: destName || dest, details: subject });
      // Log to CRM comment if lead found
      try {
        var crmData = JSON.parse(localStorage.getItem("crm_pro_v2") || "{}");
        var matchLead = (crmData.leads || []).find(function(l) { return (l.email || "").toLowerCase() === dest.toLowerCase(); });
        if (matchLead) {
          var cm = { id: "id_" + Date.now(), lead_id: matchLead.id, text: "\u2709\uFE0F Email envoy\u00e9 : " + subject, date: new Date().toISOString() };
          dbSaveComment(cm);
          crmData.comments = [cm].concat(crmData.comments || []);
          localStorage.setItem("crm_pro_v2", JSON.stringify(crmData));
        }
      } catch (e) {}
      setSending(false);
      showToast("\u2705 Email envoy\u00e9 \u00e0 " + dest);
    } catch (err) {
      setSending(false);
      showToast("\u274C " + (err.message || "Erreur d'envoi"));
    }
  }

  // ═══ RENDER ═══
  return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg)", color: "var(--t1)", padding: "24px 28px" } },
    // Header
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 } },
      React.createElement("div", null,
        React.createElement("h1", { style: { fontFamily: "var(--fd)", fontSize: 26, fontWeight: 800 } }, "\u2709\uFE0F Mailing"),
        React.createElement("p", { style: { color: "var(--t2)", fontSize: 13, marginTop: 4 } }, templates.length + " template(s) \u2022 " + history.length + " email(s) envoy\u00e9(s)")
      ),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ["envoyer", "templates", "historique"].map(function(t) {
          var labels = { envoyer: "\u{1F4E8} Envoyer", templates: "\u{1F4DD} Templates", historique: "\u{1F4CB} Historique" };
          return React.createElement("button", { key: t, onClick: function() { setTab(t); }, style: { padding: "8px 14px", borderRadius: 8, border: tab === t ? "1px solid var(--a)" : "1px solid var(--bd)", background: tab === t ? "var(--ag)" : "var(--c)", color: tab === t ? "var(--a)" : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600 } }, labels[t]);
        })
      )
    ),

    // ─── TAB: ENVOYER ───
    tab === "envoyer" && React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 } },
      // Left: Compose
      React.createElement("div", null,
        React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 20 } },
          React.createElement("h3", { style: { fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 16 } }, "\u{1F4E8} Composer"),
          // Destinataire
          React.createElement("div", { style: { marginBottom: 14 } },
            React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Destinataire *"),
            React.createElement("input", { className: "crm-inp", type: "email", value: dest, onChange: function(e) { setDest(e.target.value); }, placeholder: "email@exemple.fr" })
          ),
          React.createElement("div", { style: { marginBottom: 14 } },
            React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Nom (optionnel)"),
            React.createElement("input", { className: "crm-inp", value: destName, onChange: function(e) { setDestName(e.target.value); }, placeholder: "Nom du destinataire" })
          ),
          // Template ou libre
          React.createElement("div", { style: { marginBottom: 14 } },
            React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Template"),
            React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
              React.createElement("button", { onClick: function() { setSelTpl(null); }, style: { padding: "6px 14px", borderRadius: 20, border: !selTpl ? "2px solid var(--a)" : "1px solid var(--bd)", background: !selTpl ? "var(--ag)" : "var(--sf)", color: !selTpl ? "var(--a)" : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600 } }, "\u270D\uFE0F Libre"),
              templates.map(function(t) {
                var active = selTpl && selTpl.id === t.id;
                return React.createElement("button", { key: t.id, onClick: function() { setSelTpl(t); setCustomSubject(t.subject); }, style: { padding: "6px 14px", borderRadius: 20, border: active ? "2px solid var(--a)" : "1px solid var(--bd)", background: active ? "var(--ag)" : "var(--sf)", color: active ? "var(--a)" : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600 } }, t.name);
              })
            )
          ),
          // Objet
          !selTpl && React.createElement("div", { style: { marginBottom: 14 } },
            React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Objet *"),
            React.createElement("input", { className: "crm-inp", value: customSubject, onChange: function(e) { setCustomSubject(e.target.value); }, placeholder: "Objet de l'email" })
          ),
          selTpl && React.createElement("div", { style: { marginBottom: 14, padding: 12, background: "var(--sf)", borderRadius: 8 } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", marginBottom: 4 } }, "Objet"),
            React.createElement("div", { style: { fontSize: 14, fontWeight: 600, color: "var(--t1)" } }, selTpl.subject)
          ),
          // Contenu
          !selTpl && React.createElement("div", { style: { marginBottom: 14 } },
            React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Contenu *"),
            React.createElement("textarea", { className: "crm-inp", value: customBody, onChange: function(e) { setCustomBody(e.target.value); }, placeholder: "Votre message...\n\nLe texte sera automatiquement mis en page avec le design Lab Learning.", style: { minHeight: 200 } })
          ),
          selTpl && React.createElement("div", { style: { marginBottom: 14, padding: 12, background: "var(--sf)", borderRadius: 8, maxHeight: 200, overflowY: "auto" } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", marginBottom: 4 } }, "Contenu du template"),
            React.createElement("div", { style: { fontSize: 13, color: "var(--t2)", whiteSpace: "pre-wrap" } }, (selTpl.body || "").substring(0, 500) + ((selTpl.body || "").length > 500 ? "..." : ""))
          ),
          // Send button
          React.createElement("button", { onClick: handleSend, disabled: sending || !dest, style: { width: "100%", padding: "14px 20px", borderRadius: 10, background: sending ? "var(--inp)" : "linear-gradient(135deg,var(--a),#3ECB82)", color: sending ? "var(--tm)" : "var(--p)", fontFamily: "var(--fb)", fontSize: 15, fontWeight: 700, border: "none", cursor: sending ? "not-allowed" : "pointer", transition: ".15s" } }, sending ? "\u23F3 Envoi en cours..." : "\u{1F4E8} ENVOYER")
        )
      ),
      // Right: Contact picker
      React.createElement("div", null,
        React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 20 } },
          React.createElement("h3", { style: { fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 16 } }, "\u{1F465} S\u00e9lectionner un contact"),
          React.createElement("p", { style: { fontSize: 12, color: "var(--tm)", marginBottom: 12 } }, "Cliquez sur un lead pour pr\u00e9-remplir le destinataire"),
          leads.length ? React.createElement("div", { style: { maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 } },
            leads.map(function(l) {
              var isActive = dest === l.email;
              return React.createElement("div", { key: l.id, onClick: function() { selectLead(l); }, style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: isActive ? "var(--ag)" : "var(--sf)", border: isActive ? "1px solid var(--a)" : "1px solid var(--bd)", borderRadius: 8, cursor: "pointer", transition: ".15s" } },
                React.createElement("div", { style: { width: 32, height: 32, borderRadius: 8, background: isActive ? "var(--a)" : "var(--inp)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: isActive ? "var(--p)" : "var(--t2)", flexShrink: 0 } }, (l.nom || "?")[0]),
                React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                  React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: isActive ? "var(--a)" : "var(--t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (l.nom || "") + (l.prenom ? " " + l.prenom : "")),
                  React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, l.email)
                ),
                l.etablissement && React.createElement("div", { style: { fontSize: 10, color: "var(--tm)", flexShrink: 0 } }, l.etablissement)
              );
            })
          ) : React.createElement("div", { style: { textAlign: "center", padding: 24, color: "var(--tm)" } }, "Aucun lead avec email")
        )
      )
    ),

    // ─── TAB: TEMPLATES ───
    tab === "templates" && React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } },
        React.createElement("h3", { style: { fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700 } }, "\u{1F4DD} Mes templates"),
        React.createElement("button", { onClick: function() { setEditId(null); setEName(""); setESubject(""); setEBody(""); setShowEditor(true); }, style: { padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg,var(--a),#3ECB82)", color: "var(--p)", fontFamily: "var(--fb)", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" } }, "+ Nouveau template")
      ),
      templates.length === 0 && React.createElement("div", { style: { textAlign: "center", padding: 48, color: "var(--tm)" } }, React.createElement("div", { style: { fontSize: 48, marginBottom: 12 } }, "\u{1F4DD}"), React.createElement("div", { style: { fontSize: 16, fontWeight: 600, color: "var(--t1)", marginBottom: 8 } }, "Aucun template"), React.createElement("p", { style: { fontSize: 13, color: "var(--tm)" } }, "Cr\u00e9ez vos mod\u00e8les d'email pour les r\u00e9utiliser facilement")),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 } },
        templates.map(function(t) {
          return React.createElement("div", { key: t.id, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 20 } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 } },
              React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "var(--a)" } }, t.name),
              React.createElement("div", { style: { display: "flex", gap: 4 } },
                React.createElement("button", { onClick: function() { editTemplate(t); }, style: { background: "none", border: "none", cursor: "pointer", fontSize: 14 } }, "\u270F\uFE0F"),
                React.createElement("button", { onClick: function() { deleteTemplate(t.id); }, style: { background: "none", border: "none", cursor: "pointer", fontSize: 14 } }, "\u{1F5D1}")
              )
            ),
            React.createElement("div", { style: { fontSize: 13, color: "var(--t2)", marginBottom: 8 } }, "\u{1F4E7} " + t.subject),
            React.createElement("div", { style: { fontSize: 12, color: "var(--tm)", maxHeight: 60, overflow: "hidden" } }, (t.body || "").substring(0, 150) + ((t.body || "").length > 150 ? "..." : "")),
            React.createElement("button", { onClick: function() { setSelTpl(t); setTab("envoyer"); }, style: { marginTop: 12, width: "100%", padding: "8px 14px", borderRadius: 8, background: "var(--sf)", border: "1px solid var(--bd)", color: "var(--a)", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "Utiliser ce template \u2192")
          );
        })
      )
    ),

    // ─── TAB: HISTORIQUE ───
    tab === "historique" && React.createElement("div", null,
      React.createElement("h3", { style: { fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, marginBottom: 16 } }, "\u{1F4CB} Historique des envois"),
      history.length === 0 && React.createElement("div", { style: { textAlign: "center", padding: 48, color: "var(--tm)" } }, "Aucun email envoy\u00e9"),
      React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, overflow: "hidden" } },
        history.map(function(h, i) {
          return React.createElement("div", { key: h.id || i, style: { display: "flex", gap: 12, padding: "14px 18px", borderBottom: i < history.length - 1 ? "1px solid var(--bd)" : "none", alignItems: "center" } },
            React.createElement("div", { style: { width: 36, height: 36, borderRadius: 10, background: "var(--ag)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 } }, "\u2709\uFE0F"),
            React.createElement("div", { style: { flex: 1 } },
              React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, h.subject),
              React.createElement("div", { style: { fontSize: 12, color: "var(--tm)" } }, h.to + (h.toName ? " (" + h.toName + ")" : "")),
              React.createElement("div", { style: { fontSize: 10, color: "var(--tm)", marginTop: 2 } }, h.date ? new Date(h.date).toLocaleString("fr-FR") : "")
            ),
            React.createElement("span", { style: { padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: "rgba(89,213,151,.1)", color: "var(--a)" } }, h.template || "")
          );
        })
      )
    ),

    // ─── TEMPLATE EDITOR MODAL ───
    showEditor && React.createElement("div", { onClick: function() { setShowEditor(false); }, style: { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" } },
      React.createElement("div", { onClick: function(e) { e.stopPropagation(); }, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 20, padding: "28px 32px", width: "90%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto" } },
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 20 } },
          React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 20, fontWeight: 700 } }, editId ? "Modifier le template" : "Nouveau template"),
          React.createElement("button", { onClick: function() { setShowEditor(false); }, style: { background: "none", border: "none", cursor: "pointer", color: "var(--tm)", fontSize: 20 } }, "\u2715")
        ),
        React.createElement("div", { style: { marginBottom: 14 } },
          React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Nom du template *"),
          React.createElement("input", { className: "crm-inp", value: eName, onChange: function(e) { setEName(e.target.value); }, placeholder: "Ex: Relance apr\u00e8s RDV" })
        ),
        React.createElement("div", { style: { marginBottom: 14 } },
          React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Objet de l'email *"),
          React.createElement("input", { className: "crm-inp", value: eSubject, onChange: function(e) { setESubject(e.target.value); }, placeholder: "Ex: Suite \u00e0 notre \u00e9change" })
        ),
        React.createElement("div", { style: { marginBottom: 14 } },
          React.createElement("label", { style: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 } }, "Contenu"),
          React.createElement("p", { style: { fontSize: 11, color: "var(--tm)", marginBottom: 6 } }, "Texte simple ou HTML. Le texte simple sera automatiquement mis en page avec le design Lab Learning."),
          React.createElement("textarea", { className: "crm-inp", value: eBody, onChange: function(e) { setEBody(e.target.value); }, style: { minHeight: 250, fontFamily: "monospace", fontSize: 12 }, placeholder: "Bonjour,\n\nSuite \u00e0 notre \u00e9change...\n\nBien cordialement" })
        ),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid var(--bd)" } },
          React.createElement("button", { onClick: function() { setShowEditor(false); }, style: { padding: "10px 20px", borderRadius: 8, background: "var(--inp)", color: "var(--t1)", border: "1px solid var(--bd)", fontFamily: "var(--fb)", fontSize: 13, fontWeight: 600, cursor: "pointer" } }, "Annuler"),
          React.createElement("button", { onClick: saveTemplate, style: { padding: "10px 20px", borderRadius: 8, background: "linear-gradient(135deg,var(--a),#3ECB82)", color: "var(--p)", fontFamily: "var(--fb)", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" } }, "Sauvegarder")
        )
      )
    ),

    // Toast
    toast && React.createElement("div", { style: { position: "fixed", bottom: 24, right: 24, padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 300, background: "rgba(89,213,151,.15)", color: "#59D597", border: "1px solid rgba(89,213,151,.3)", backdropFilter: "blur(10px)" } }, toast)
  );
}

import React from 'react';
import { useState, useEffect, useMemo } from "react";

var DOC_STATUS = { en_attente: { label: "En attente", color: "#F59E0B", bg: "#FFFBEB" }, depose: { label: "D\u00e9pos\u00e9", color: "#3B82F6", bg: "#EFF6FF" }, signe: { label: "Sign\u00e9", color: "#10B981", bg: "#ECFDF5" } };

export default function FormateurPortal(props) {
  var onNav = props && props.onNav ? props.onNav : function() {};
  var _fmt = useState(null); var formateur = _fmt[0], setFormateur = _fmt[1];
  var _missions = useState([]); var missions = _missions[0], setMissions = _missions[1];
  var _docs = useState([]); var docs = _docs[0], setDocs = _docs[1];
  var _tab = useState("missions"); var tab = _tab[0], setTab = _tab[1];
  var _toast = useState(null); var toast = _toast[0], setToast = _toast[1];
  var _loginEmail = useState(""); var loginEmail = _loginEmail[0], setLoginEmail = _loginEmail[1];

  var showToast = function(m) { setToast(m); setTimeout(function() { setToast(null); }, 3000); };

  // Try auto-login from localStorage
  useEffect(function() {
    try {
      var saved = localStorage.getItem("ll_fmt_session");
      if (saved) {
        var sess = JSON.parse(saved);
        loadFormateurData(sess.email);
      }
    } catch (e) {}
  }, []);

  function loadFormateurData(email) {
    try {
      var adm = JSON.parse(localStorage.getItem("crm_admin_v3") || "{}");
      var fmts = adm.formateurs || [];
      var found = fmts.find(function(f) { return (f.email || "").toLowerCase() === email.toLowerCase(); });
      if (!found) { showToast("\u274C Aucun formateur avec cet email"); return false; }
      setFormateur(found);
      localStorage.setItem("ll_fmt_session", JSON.stringify({ email: email, id: found.id, nom: found.nom }));
      // Load missions
      var admLeads = adm.leads || [];
      var m = admLeads.filter(function(l) { return l.formateurNom === found.nom; }).map(function(l) {
        return { id: l.id, client: l.client, formation: l.formation || "", dateDebut: l.dateDebut || "", dateFin: l.dateFin || "", statutOrg: l.statutOrg || "", statutAkto: l.statutAkto || "", participants: l.participants || "", notes: l.notes || "" };
      });
      setMissions(m);
      // Load docs
      var allDocs = JSON.parse(localStorage.getItem("ll_fmt_docs") || "[]");
      setDocs(allDocs.filter(function(d) { return d.formateur_id === found.id; }));
      return true;
    } catch (e) { return false; }
  }

  function handleLogin() {
    if (!loginEmail || loginEmail.indexOf("@") === -1) { showToast("Email invalide"); return; }
    if (!loadFormateurData(loginEmail)) { showToast("\u274C Aucun formateur avec cet email"); }
  }

  function handleLogout() {
    localStorage.removeItem("ll_fmt_session");
    setFormateur(null); setMissions([]); setDocs([]);
  }

  function depositDoc(docId) {
    var allDocs = JSON.parse(localStorage.getItem("ll_fmt_docs") || "[]");
    allDocs = allDocs.map(function(d) { return d.id === docId ? Object.assign({}, d, { status: "depose", deposited_at: new Date().toISOString() }) : d; });
    localStorage.setItem("ll_fmt_docs", JSON.stringify(allDocs));
    setDocs(allDocs.filter(function(d) { return d.formateur_id === formateur.id; }));
    showToast("\u2705 Document d\u00e9pos\u00e9");
  }

  function signDoc(docId) {
    var allDocs = JSON.parse(localStorage.getItem("ll_fmt_docs") || "[]");
    allDocs = allDocs.map(function(d) { return d.id === docId ? Object.assign({}, d, { signed: true, signed_at: new Date().toISOString(), status: "signe" }) : d; });
    localStorage.setItem("ll_fmt_docs", JSON.stringify(allDocs));
    setDocs(allDocs.filter(function(d) { return d.formateur_id === formateur.id; }));
    showToast("\u2705 Document sign\u00e9");
  }

  var docsByStatus = useMemo(function() {
    var attente = docs.filter(function(d) { return !d.signed && d.status !== "depose"; });
    var deposes = docs.filter(function(d) { return d.status === "depose" && !d.signed; });
    var signes = docs.filter(function(d) { return d.signed; });
    return { attente: attente, deposes: deposes, signes: signes };
  }, [docs]);

  // ─── LOGIN SCREEN ───
  if (!formateur) {
    return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" } },
      React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 24, padding: "40px 48px", maxWidth: 420, width: "100%", textAlign: "center" } },
        React.createElement("div", { style: { width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,var(--p),var(--a))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 28 } }, "\u{1F468}\u200D\u{1F3EB}"),
        React.createElement("h1", { style: { fontFamily: "var(--fd)", fontSize: 24, fontWeight: 800, marginBottom: 8, color: "var(--t1)" } }, "Espace Formateur"),
        React.createElement("p", { style: { color: "var(--tm)", fontSize: 14, marginBottom: 24 } }, "Lab Learning"),
        React.createElement("input", { type: "email", value: loginEmail, onChange: function(e) { setLoginEmail(e.target.value); }, onKeyDown: function(e) { if (e.key === "Enter") handleLogin(); }, placeholder: "Votre email", style: { width: "100%", padding: "14px 18px", background: "var(--inp)", border: "1px solid var(--bd)", borderRadius: 10, color: "var(--t1)", fontFamily: "var(--fb)", fontSize: 15, outline: "none", marginBottom: 14, boxSizing: "border-box" } }),
        React.createElement("button", { onClick: handleLogin, style: { width: "100%", padding: "14px 20px", borderRadius: 10, background: "linear-gradient(135deg,var(--a),#3ECB82)", color: "var(--p)", fontFamily: "var(--fb)", fontSize: 16, fontWeight: 700, border: "none", cursor: "pointer" } }, "Se connecter"),
        React.createElement("button", { onClick: function() { onNav("dashboard"); }, style: { marginTop: 16, background: "none", border: "none", color: "var(--tm)", fontFamily: "var(--fb)", fontSize: 12, cursor: "pointer" } }, "\u2190 Retour au CRM"),
        toast && React.createElement("div", { style: { marginTop: 16, padding: "10px 16px", borderRadius: 8, fontSize: 13, background: "rgba(239,68,68,.1)", color: "#F87171" } }, toast)
      )
    );
  }

  // ─── FORMATEUR PORTAL ───
  return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg)", color: "var(--t1)", padding: "24px 28px" } },
    // Header
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14 } },
        React.createElement("div", { style: { width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,var(--p),var(--a))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 } }, "\u{1F468}\u200D\u{1F3EB}"),
        React.createElement("div", null,
          React.createElement("h1", { style: { fontFamily: "var(--fd)", fontSize: 22, fontWeight: 800 } }, "Bonjour " + formateur.nom),
          React.createElement("p", { style: { color: "var(--t2)", fontSize: 13, marginTop: 2 } }, missions.length + " mission(s) \u2022 " + docs.length + " document(s)")
        )
      ),
      React.createElement("div", { style: { display: "flex", gap: 8 } },
        ["missions", "documents", "profil"].map(function(t) {
          var labels = { missions: "\u{1F4CB} Missions", documents: "\u{1F4C4} Documents", profil: "\u{1F464} Profil" };
          return React.createElement("button", { key: t, onClick: function() { setTab(t); }, style: { padding: "8px 14px", borderRadius: 8, border: tab === t ? "1px solid var(--a)" : "1px solid var(--bd)", background: tab === t ? "var(--ag)" : "var(--c)", color: tab === t ? "var(--a)" : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600 } }, labels[t]);
        }),
        React.createElement("button", { onClick: handleLogout, style: { padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.05)", color: "#F87171", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600 } }, "\u{1F6AA} D\u00e9connexion")
      )
    ),

    // Stats
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 } },
      [{ l: "Missions", v: missions.length, c: "#3B82F6", i: "\u{1F4CB}" }, { l: "\u00c0 signer", v: docsByStatus.attente.length, c: docsByStatus.attente.length > 0 ? "#F59E0B" : "var(--tm)", i: "\u270D\uFE0F" }, { l: "D\u00e9pos\u00e9s", v: docsByStatus.deposes.length, c: "#3B82F6", i: "\u{1F4E5}" }, { l: "Sign\u00e9s", v: docsByStatus.signes.length, c: "#10B981", i: "\u2705" }].map(function(s, i) {
        return React.createElement("div", { key: i, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 12, padding: "14px 16px", textAlign: "center" } },
          React.createElement("span", { style: { fontSize: 18 } }, s.i),
          React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 24, fontWeight: 800, color: s.c, marginTop: 2 } }, s.v),
          React.createElement("div", { style: { fontSize: 10, color: "var(--tm)" } }, s.l)
        );
      })
    ),

    // ─── MISSIONS ───
    tab === "missions" && React.createElement("div", null,
      React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, marginBottom: 14 } }, "\u{1F4CB} Mes missions"),
      missions.length === 0 && React.createElement("div", { style: { textAlign: "center", padding: 48, background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, color: "var(--tm)" } }, React.createElement("div", { style: { fontSize: 40, marginBottom: 10 } }, "\u{1F4CB}"), "Aucune mission assign\u00e9e pour le moment"),
      React.createElement("div", { style: { display: "grid", gap: 10 } },
        missions.map(function(m) {
          var pct = 0;
          var orgMap = { conv_signee: 100, conv_envoyee: 70, conv_modifier: 50, conv_faire: 40, att_liste: 25, att_client: 15, proposition: 10, standby: 0 };
          var aktMap = { transmis: 100, client: 80, verifier: 65, remplir: 50, courrier: 30, creer: 15, relance: 0 };
          pct = Math.round(((orgMap[m.statutOrg] || 0) + (aktMap[m.statutAkto] || 0)) / 2);
          var col = pct >= 80 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";
          var lbl = pct >= 80 ? "Pr\u00eat" : pct >= 40 ? "En cours" : "D\u00e9marrage";
          return React.createElement("div", { key: m.id, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 20, borderLeft: "4px solid " + col } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 } },
              React.createElement("div", null,
                React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: "var(--a)" } }, m.client),
                React.createElement("div", { style: { fontSize: 14, color: "var(--t2)", marginTop: 4 } }, m.formation || "Formation non pr\u00e9cis\u00e9e")
              ),
              React.createElement("span", { style: { padding: "4px 12px", borderRadius: 14, fontSize: 12, fontWeight: 700, background: col + "15", color: col } }, lbl)
            ),
            React.createElement("div", { style: { display: "flex", gap: 16, fontSize: 13, color: "var(--tm)", marginBottom: 10 } },
              m.dateDebut && React.createElement("span", null, "\u{1F4C5} " + m.dateDebut.split("-").reverse().join("/")),
              m.dateFin && React.createElement("span", null, "\u2192 " + m.dateFin.split("-").reverse().join("/")),
              m.participants && React.createElement("span", null, "\u{1F465} " + m.participants + " participants")
            ),
            React.createElement("div", { style: { height: 5, background: "var(--bd)", borderRadius: 3, overflow: "hidden" } },
              React.createElement("div", { style: { height: "100%", width: pct + "%", background: col, borderRadius: 3, transition: "width .4s" } })
            )
          );
        })
      )
    ),

    // ─── DOCUMENTS ───
    tab === "documents" && React.createElement("div", null,
      React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, marginBottom: 14 } }, "\u{1F4C4} Mes documents"),
      docs.length === 0 && React.createElement("div", { style: { textAlign: "center", padding: 48, background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, color: "var(--tm)" } }, "Aucun document"),
      // En attente
      docsByStatus.attente.length > 0 && React.createElement("div", { style: { marginBottom: 20 } },
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: "#F59E0B", marginBottom: 10 } }, "\u270D\uFE0F \u00c0 signer / d\u00e9poser (" + docsByStatus.attente.length + ")"),
        docsByStatus.attente.map(function(d) {
          return React.createElement("div", { key: d.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "var(--c)", border: "1px solid #F59E0B33", borderRadius: 10, marginBottom: 6, borderLeft: "4px solid #F59E0B" } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: 14, fontWeight: 600 } }, d.name),
              React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginTop: 2 } }, "Ajout\u00e9 le " + new Date(d.uploaded_at).toLocaleDateString("fr-FR"))
            ),
            React.createElement("div", { style: { display: "flex", gap: 6 } },
              React.createElement("button", { onClick: function() { depositDoc(d.id); }, style: { padding: "8px 14px", borderRadius: 8, background: "rgba(59,130,246,.1)", color: "#3B82F6", border: "1px solid rgba(59,130,246,.2)", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "\u{1F4E5} D\u00e9poser"),
              React.createElement("button", { onClick: function() { signDoc(d.id); }, style: { padding: "8px 14px", borderRadius: 8, background: "rgba(16,185,129,.1)", color: "#10B981", border: "1px solid rgba(16,185,129,.2)", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600, cursor: "pointer" } }, "\u2713 Signer")
            )
          );
        })
      ),
      // Deposes
      docsByStatus.deposes.length > 0 && React.createElement("div", { style: { marginBottom: 20 } },
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: "#3B82F6", marginBottom: 10 } }, "\u{1F4E5} D\u00e9pos\u00e9s (" + docsByStatus.deposes.length + ")"),
        docsByStatus.deposes.map(function(d) {
          return React.createElement("div", { key: d.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 10, marginBottom: 4 } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, React.createElement("span", { style: { fontSize: 16 } }, "\u{1F4E5}"), React.createElement("div", null, React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, d.name), React.createElement("div", { style: { fontSize: 11, color: "var(--tm)" } }, "D\u00e9pos\u00e9 le " + new Date(d.deposited_at || d.uploaded_at).toLocaleDateString("fr-FR")))),
            React.createElement("button", { onClick: function() { signDoc(d.id); }, style: { padding: "6px 12px", borderRadius: 8, background: "rgba(16,185,129,.1)", color: "#10B981", border: "1px solid rgba(16,185,129,.2)", fontFamily: "var(--fb)", fontSize: 11, fontWeight: 600, cursor: "pointer" } }, "\u2713 Signer")
          );
        })
      ),
      // Signes
      docsByStatus.signes.length > 0 && React.createElement("div", null,
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: "#10B981", marginBottom: 10 } }, "\u2705 Sign\u00e9s (" + docsByStatus.signes.length + ")"),
        docsByStatus.signes.map(function(d) {
          return React.createElement("div", { key: d.id, style: { display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 10, marginBottom: 4 } },
            React.createElement("span", { style: { fontSize: 16 } }, "\u2705"),
            React.createElement("div", null, React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, d.name), React.createElement("div", { style: { fontSize: 11, color: "#10B981" } }, "Sign\u00e9 le " + new Date(d.signed_at || d.uploaded_at).toLocaleDateString("fr-FR")))
          );
        })
      )
    ),

    // ─── PROFIL ───
    tab === "profil" && React.createElement("div", null,
      React.createElement("div", { style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 14, padding: 24, maxWidth: 500 } },
        React.createElement("h2", { style: { fontFamily: "var(--fd)", fontSize: 18, fontWeight: 700, marginBottom: 16 } }, "\u{1F464} Mon profil"),
        React.createElement("div", { style: { display: "grid", gap: 14 } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--bd)" } }, React.createElement("span", { style: { fontSize: 13, color: "var(--tm)" } }, "Nom"), React.createElement("span", { style: { fontSize: 14, fontWeight: 600 } }, formateur.nom)),
          formateur.email && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--bd)" } }, React.createElement("span", { style: { fontSize: 13, color: "var(--tm)" } }, "Email"), React.createElement("span", { style: { fontSize: 14, fontWeight: 600 } }, formateur.email)),
          formateur.tel && React.createElement("div", { style: { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--bd)" } }, React.createElement("span", { style: { fontSize: 13, color: "var(--tm)" } }, "T\u00e9l\u00e9phone"), React.createElement("span", { style: { fontSize: 14, fontWeight: 600 } }, formateur.tel)),
          formateur.specialites && React.createElement("div", { style: { padding: "10px 0" } }, React.createElement("span", { style: { fontSize: 13, color: "var(--tm)" } }, "Sp\u00e9cialit\u00e9s"), React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 } }, formateur.specialites.split(",").map(function(s, i) { return React.createElement("span", { key: i, style: { padding: "3px 12px", borderRadius: 14, fontSize: 11, fontWeight: 600, background: "rgba(89,213,151,.1)", color: "var(--a)" } }, s.trim()); })))
        )
      )
    ),

    toast && React.createElement("div", { style: { position: "fixed", bottom: 24, right: 24, padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 300, background: "rgba(89,213,151,.15)", color: "#59D597", border: "1px solid rgba(89,213,151,.3)" } }, toast)
  );
}

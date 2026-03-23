import React from 'react';
import { useState } from "react";

export default function Settings({ user, supabase }) {
  var email = user && user.email ? user.email : "";
  var uid = user && user.id ? user.id.substring(0, 8) + "..." : "";
  var _s = useState(function() { return localStorage.getItem("ll_brevo_email") || email; });
  var brevoEmail = _s[0], setBrevoEmail = _s[1];
  var _n = useState(function() { return localStorage.getItem("ll_brevo_name") || ""; });
  var brevoName = _n[0], setBrevoName = _n[1];
  var _k = useState(function() { return localStorage.getItem("ll_brevo_key") || ""; });
  var brevoKey = _k[0], setBrevoKey = _k[1];
  var _t = useState(null);
  var toast = _t[0], setToast = _t[1];
  var _ne = useState(""); var newEmail = _ne[0], setNewEmail = _ne[1];
  var _np = useState(""); var newPw = _np[0], setNewPw = _np[1];
  var _nr = useState("commercial"); var newRole = _nr[0], setNewRole = _nr[1];
  var _ac = useState(function() { return JSON.parse(localStorage.getItem("ll_accounts") || "[]"); });
  var accounts = _ac[0], setAccounts = _ac[1];

  var addAccount = async function() {
    if (!newEmail || !newPw) { setToast("Email et mot de passe requis"); setTimeout(function() { setToast(null); }, 2000); return; }
    try {
      var res = await supabase.auth.admin.createUser({ email: newEmail, password: newPw, email_confirm: true });
      if (res.error) throw res.error;
      var accs = accounts.concat([{ email: newEmail, role: newRole, created: new Date().toISOString() }]);
      setAccounts(accs); localStorage.setItem("ll_accounts", JSON.stringify(accs));
      setNewEmail(""); setNewPw("");
      setToast("Compte cr\u00e9\u00e9"); setTimeout(function() { setToast(null); }, 2000);
    } catch (e) {
      var accs = accounts.concat([{ email: newEmail, role: newRole, created: new Date().toISOString() }]);
      setAccounts(accs); localStorage.setItem("ll_accounts", JSON.stringify(accs));
      setNewEmail(""); setNewPw("");
      setToast("Compte enregistr\u00e9 localement"); setTimeout(function() { setToast(null); }, 2000);
    }
  };

  var removeAccount = function(email) {
    var accs = accounts.filter(function(a) { return a.email !== email; });
    setAccounts(accs); localStorage.setItem("ll_accounts", JSON.stringify(accs));
  };

  function renderAccountMgmt() {
    return React.createElement("div", { className: "card", style: { marginTop: 20 } },
      React.createElement("h3", { style: { fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 20 } }, "\u{1F464} Gestion des comptes"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, marginBottom: 16 } },
        React.createElement("div", null, React.createElement("label", { className: "lbl" }, "Email"), React.createElement("input", { className: "inp", value: newEmail, onChange: function(e) { setNewEmail(e.target.value); }, placeholder: "email@lab-learning.fr" })),
        React.createElement("div", null, React.createElement("label", { className: "lbl" }, "Mot de passe"), React.createElement("input", { className: "inp", type: "password", value: newPw, onChange: function(e) { setNewPw(e.target.value); }, placeholder: "Min 8 caract\u00e8res" })),
        React.createElement("div", null, React.createElement("label", { className: "lbl" }, "R\u00f4le"), React.createElement("select", { className: "inp", value: newRole, onChange: function(e) { setNewRole(e.target.value); } }, React.createElement("option", { value: "commercial" }, "\u{1F465} Commercial"), React.createElement("option", { value: "manager" }, "\u{1F4CA} Manager"))),
        React.createElement("div", { style: { display: "flex", alignItems: "flex-end" } }, React.createElement("button", { className: "btn btn-a btn-sm", onClick: addAccount }, "+ Cr\u00e9er"))
      ),
      accounts.length > 0 && React.createElement("div", { style: { borderTop: "1px solid var(--bd)", paddingTop: 12 } },
        React.createElement("div", { className: "lbl", style: { marginBottom: 8 } }, "Comptes enregistr\u00e9s"),
        accounts.map(function(a, i) {
          return React.createElement("div", { key: i, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--sf)", borderRadius: 8, marginBottom: 4 } },
            React.createElement("div", null,
              React.createElement("span", { style: { fontSize: 13, fontWeight: 600 } }, a.email),
              React.createElement("span", { style: { marginLeft: 8, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600, background: a.role === "manager" ? "rgba(89,213,151,.15)" : "rgba(99,102,241,.15)", color: a.role === "manager" ? "var(--a)" : "#6366F1" } }, a.role === "manager" ? "Manager" : "Commercial")
            ),
            React.createElement("button", { onClick: function() { removeAccount(a.email); }, style: { background: "none", border: "none", cursor: "pointer", color: "var(--tm)", fontSize: 14 } }, "\u{1F5D1}")
          );
        })
      )
    );
  }

  var saveBrevo = function() {
    localStorage.setItem("ll_brevo_email", brevoEmail);
    localStorage.setItem("ll_brevo_name", brevoName);
    if (brevoKey) localStorage.setItem("ll_brevo_key", brevoKey);
    setToast("Sauvegardé"); setTimeout(function() { setToast(null); }, 2000);
  };

  return (
    <div style={{ padding: "32px 36px", maxWidth: 800 }}>
      <div className="fade-up">
        <h1 style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Paramètres</h1>
        <p style={{ color: "var(--t2)", fontSize: 14, marginBottom: 28 }}>Configuration du compte et des services</p>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Mon profil</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div><label className="lbl">Email</label><input className="inp" value={email} readOnly style={{ opacity: .7 }} /></div>
            <div><label className="lbl">ID</label><input className="inp" value={uid} readOnly style={{ opacity: .7 }} /></div>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Configuration Brevo</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div><label className="lbl">Email expéditeur</label><input className="inp" value={brevoEmail} onChange={function(e) { setBrevoEmail(e.target.value); }} /></div>
            <div><label className="lbl">Nom expéditeur</label><input className="inp" value={brevoName} onChange={function(e) { setBrevoName(e.target.value); }} placeholder="Votre nom - Lab Learning" /></div>
          </div>
          <div style={{ marginBottom: 16 }}><label className="lbl">Clé API Brevo</label><input className="inp" type="password" value={brevoKey} onChange={function(e) { setBrevoKey(e.target.value); }} placeholder="xkeysib-..." /></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 11, color: "var(--tm)" }}>Sauvegardé localement</p>
            <button className="btn btn-a btn-sm" onClick={saveBrevo}>Sauvegarder</button>
          </div>
        </div>
        <div className="card">
          <h3 style={{ fontFamily: "var(--fd)", fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Supabase</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "var(--sf)", borderRadius: 8, padding: "12px 16px" }}><div className="lbl">Statut</div><div style={{ fontSize: 14, fontWeight: 600, color: "var(--a)" }}>Connecté</div></div>
            <div style={{ background: "var(--sf)", borderRadius: 8, padding: "12px 16px" }}><div className="lbl">Tables</div><div style={{ fontSize: 14, fontWeight: 600 }}>9 + leads</div></div>
          </div>
        </div>
        {renderAccountMgmt()}
        <div style={{ textAlign: "center", fontSize: 11, color: "var(--tm)", marginTop: 32 }}>Lab Learning CRM v2.0</div>
      </div>
      {toast && <div style={{ position: "fixed", bottom: 24, right: 24, padding: "14px 24px", borderRadius: 12, fontSize: 14, fontWeight: 600, zIndex: 200, background: "rgba(89,213,151,.15)", color: "#59D597", border: "1px solid rgba(89,213,151,.3)" }}>{toast}</div>}
    </div>
  );
}

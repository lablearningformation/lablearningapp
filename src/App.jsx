import React from 'react';
import { useState, useEffect, Suspense, lazy } from 'react'
import { supabase } from './lib/supabase.js'

const Dashboard = lazy(function() { return import('./pages/Dashboard.jsx') })
const Prospects = lazy(function() { return import('./pages/Prospects.jsx') })
const CRMAdmin = lazy(function() { return import('./pages/CRMAdmin.jsx') })
const ProspectionEmail = lazy(function() { return import('./pages/ProspectionEmail.jsx') })
const SimulateurBudget = lazy(function() { return import('./pages/SimulateurBudget.jsx') })
const AuditConformite = lazy(function() { return import('./pages/AuditConformite.jsx') })
const Settings = lazy(function() { return import('./pages/Settings.jsx') })
const ManagerDashboard = lazy(function() { return import('./pages/ManagerDashboard.jsx') })
const Mailing = lazy(function() { return import('./pages/Mailing.jsx') })
const FormateursAdmin = lazy(function() { return import('./pages/FormateursAdmin.jsx') })
const FormateurPortal = lazy(function() { return import('./pages/FormateurPortal.jsx') })

var STYLES = "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');" +
"*{margin:0;padding:0;box-sizing:border-box}" +
":root{--p:#195144;--pl:#1E6B5A;--pd:#0F3830;--a:#59D597;--al:#7BDEAE;--ag:rgba(89,213,151,.15);--bg:#0B0F1A;--c:#111827;--ch:#1A2332;--sf:#0F172A;--inp:#1E293B;--t1:#F1F5F9;--t2:#94A3B8;--tm:#64748B;--bd:rgba(148,163,184,.08);--bdh:rgba(148,163,184,.15);--r:12px;--fb:'Plus Jakarta Sans',sans-serif;--fd:'Outfit',sans-serif}" +
"body{font-family:var(--fb);background:var(--bg);color:var(--t1);-webkit-font-smoothing:antialiased}" +
"::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(148,163,184,.12);border-radius:3px}" +
"@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}" +
"@keyframes fadeIn{from{opacity:0}to{opacity:1}}" +
"@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}" +
"@keyframes spin{to{transform:rotate(360deg)}}" +
".fade-up{animation:fadeUp .4s ease forwards}.fade-in{animation:fadeIn .3s ease}.scale-in{animation:scaleIn .3s ease forwards}" +
".inp{width:100%;padding:10px 14px;background:var(--inp);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-family:var(--fb);font-size:14px;outline:none;transition:.2s}" +
".inp:focus{border-color:var(--a);box-shadow:0 0 0 3px var(--ag)}.inp::placeholder{color:var(--tm)}" +
"select.inp{cursor:pointer;appearance:auto}textarea.inp{resize:vertical;min-height:80px}" +
".btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;font-family:var(--fb);font-weight:600;font-size:13px;cursor:pointer;border:none;transition:all .15s}" +
".btn:hover{transform:translateY(-1px)}.btn:disabled{opacity:.5;cursor:not-allowed;transform:none}" +
".btn-p{background:linear-gradient(135deg,var(--p),var(--pl));color:#fff}" +
".btn-a{background:linear-gradient(135deg,var(--a),#3ECB82);color:var(--pd);font-weight:700}" +
".btn-s{background:var(--inp);color:var(--t1);border:1px solid var(--bd)}" +
".btn-d{background:rgba(220,38,38,.1);color:#F87171;border:1px solid rgba(220,38,38,.2)}" +
".btn-sm{padding:6px 12px;font-size:12px}" +
".card{background:var(--c);border:1px solid var(--bd);border-radius:16px;padding:24px;transition:all .2s}" +
".lbl{display:block;font-size:11px;font-weight:700;color:var(--tm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}" +
".badge{display:inline-flex;align-items:center;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}";

var NAV_SUIVI = [
  { id: "dashboard", icon: "\u{1F4CA}", label: "Tableau de bord" },
  { id: "prospects", icon: "\u{1F465}", label: "Prospects" },
  { id: "mailing", icon: "\u{1F4E8}", label: "Mailing" }
];
var NAV_OUTILS = [
  { id: "prospection", icon: "\u2709\uFE0F", label: "Prospection Mail" },
  { id: "simulateur", icon: "\u{1F4B0}", label: "Simulateur Budget" },
  { id: "audit", icon: "\u{1F4CB}", label: "Audit Conformit\u00e9" }
];
var NAV_ADMIN = [
  { id: "suivi", icon: "\u{1F4C2}", label: "Suivi Administratif" },
  { id: "formateurs", icon: "\u{1F468}\u200D\u{1F3EB}", label: "Formateurs" }
];
var NAV_MANAGER = [
  { id: "manager", icon: "\u{1F4CA}", label: "Vue Manager" }
];

function Login(props) {
  var onLogin = props.onLogin;
  var _s1 = useState(""); var email = _s1[0]; var setEmail = _s1[1];
  var _s2 = useState(""); var pw = _s2[0]; var setPw = _s2[1];
  var _s3 = useState(false); var loading = _s3[0]; var setLoading = _s3[1];
  var _s4 = useState(""); var err = _s4[0]; var setErr = _s4[1];

  var submit = async function() {
    setLoading(true); setErr("");
    var res = await supabase.auth.signInWithPassword({ email: email, password: pw });
    if (res.error) { setErr(res.error.message); setLoading(false); }
    else onLogin(res.data.user);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)", padding: 20 }}>
      <div className="scale-in" style={{ background: "rgba(17,24,39,.7)", backdropFilter: "blur(20px)", border: "1px solid var(--bd)", borderRadius: 24, padding: "48px 44px", width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, margin: "0 auto 20px", background: "linear-gradient(135deg,var(--p),var(--a))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: "#fff", fontFamily: "var(--fd)" }}>L</span>
          </div>
          <h1 style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 800 }}>Lab Learning</h1>
          <p style={{ color: "var(--tm)", fontSize: 14, marginTop: 6 }}>Application commerciale</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><label className="lbl">Email</label><input className="inp" type="email" placeholder="votre.email@lab-learning.fr" value={email} onChange={function(e) { setEmail(e.target.value); }} /></div>
          <div><label className="lbl">Mot de passe</label><input className="inp" type="password" placeholder="........" value={pw} onChange={function(e) { setPw(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") submit(); }} /></div>
          {err && <div style={{ background: "rgba(220,38,38,.1)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#F87171" }}>{err}</div>}
          <button className="btn btn-p" onClick={submit} disabled={loading || !email || !pw} style={{ padding: "14px 24px", fontSize: 15, width: "100%", justifyContent: "center" }}>
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem(props) {
  var n = props.n; var active = props.active; var onNav = props.onNav; var collapsed = props.collapsed;
  var isActive = active === n.id;
  return (
    <button onClick={function() { onNav(n.id); }} title={collapsed ? n.label : ""} style={{
      display: "flex", alignItems: "center", gap: 12, padding: collapsed ? "11px 0" : "11px 20px", margin: collapsed ? "2px 8px" : "2px 12px",
      borderRadius: 8, cursor: "pointer", border: "none", width: collapsed ? "calc(100% - 16px)" : "calc(100% - 24px)",
      background: isActive ? "var(--ag)" : "none", color: isActive ? "var(--a)" : "var(--t2)",
      fontFamily: "var(--fb)", fontSize: 14, fontWeight: isActive ? 600 : 500, textAlign: "left", justifyContent: collapsed ? "center" : "flex-start", transition: "all .15s"
    }}>
      <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{n.icon}</span>
      {!collapsed && n.label}
    </button>
  );
}

function SidebarComp(props) {
  var active = props.active; var onNav = props.onNav; var user = props.user; var onLogout = props.onLogout; var collapsed = props.collapsed; var onToggle = props.onToggle;
  var initial = user && user.email ? user.email[0].toUpperCase() : "U";
  var displayName = user && user.email ? user.email.split("@")[0] : "User";
  return (
    <div style={{ width: collapsed ? 68 : 260, minHeight: "100vh", background: "var(--sf)", borderRight: "1px solid var(--bd)", display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 50, transition: "width .3s", overflow: "hidden" }}>
      <div style={{ padding: collapsed ? "24px 14px 20px" : "24px 24px 20px", borderBottom: "1px solid var(--bd)", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,var(--p),var(--a))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", fontFamily: "var(--fd)" }}>L</span>
          </div>
          {!collapsed && <div><div style={{ fontFamily: "var(--fd)", fontWeight: 700, fontSize: 16 }}>Lab Learning</div><div style={{ fontSize: 11, color: "var(--tm)" }}>CRM Commercial</div></div>}
        </div>
        {!collapsed && <button onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tm)", fontSize: 14 }}>{"\u25C0"}</button>}
      </div>
      <div style={{ flex: 1, padding: "16px 0", overflowY: "auto" }}>
        {!collapsed && <div style={{ padding: "0 24px", marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".08em" }}>Suivi & Prospection</span></div>}
        {NAV_SUIVI.map(function(n) { return <NavItem key={n.id} n={n} active={active} onNav={onNav} collapsed={collapsed} />; })}
        {!collapsed && <div style={{ padding: "16px 24px 8px", marginTop: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".08em" }}>Outils Lab Learning</span></div>}
        {collapsed && <div style={{ borderTop: "1px solid var(--bd)", margin: "8px 14px" }} />}
        {NAV_OUTILS.map(function(n) { return <NavItem key={n.id} n={n} active={active} onNav={onNav} collapsed={collapsed} />; })}
        {!collapsed && <div style={{ padding: "16px 24px 8px", marginTop: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".08em" }}>Admin & Formateur</span></div>}
        {collapsed && <div style={{ borderTop: "1px solid var(--bd)", margin: "8px 14px" }} />}
        {NAV_ADMIN.map(function(n) { return <NavItem key={n.id} n={n} active={active} onNav={onNav} collapsed={collapsed} />; })}
        {!collapsed && <div style={{ padding: "16px 24px 8px", marginTop: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".08em" }}>Management</span></div>}
        {collapsed && <div style={{ borderTop: "1px solid var(--bd)", margin: "8px 14px" }} />}
        {NAV_MANAGER.map(function(n) { return <NavItem key={n.id} n={n} active={active} onNav={onNav} collapsed={collapsed} />; })}
        {!collapsed && <div style={{ padding: "16px 24px 8px", marginTop: 8 }}><span style={{ fontSize: 10, fontWeight: 700, color: "var(--tm)", textTransform: "uppercase", letterSpacing: ".08em" }}>Syst\u00e8me</span></div>}
        {collapsed && <div style={{ borderTop: "1px solid var(--bd)", margin: "8px 14px" }} />}
        <NavItem n={{ id: "settings", icon: "\u2699\uFE0F", label: "Param\u00e8tres" }} active={active} onNav={onNav} collapsed={collapsed} />
      </div>
      <div style={{ padding: collapsed ? "16px 10px" : "16px 20px", borderTop: "1px solid var(--bd)" }}>
        {collapsed ? <button onClick={onToggle} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", color: "var(--tm)", fontSize: 16, padding: 8 }}>{"\u25B6"}</button> :
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,var(--p),var(--pl))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--a)", flexShrink: 0 }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div><div style={{ fontSize: 11, color: "var(--tm)" }}>Commercial</div></div>
          <button onClick={onLogout} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tm)" }}>{"\u{1F6AA}"}</button>
        </div>}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--bd)", borderTopColor: "var(--a)", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "var(--tm)", fontSize: 14 }}>Chargement...</p>
      </div>
    </div>
  );
}

export default function App() {
  var _s1 = useState(null); var user = _s1[0]; var setUser = _s1[1];
  var _s2 = useState(true); var loading = _s2[0]; var setLoading = _s2[1];
  var _s3 = useState("dashboard"); var view = _s3[0]; var setView = _s3[1];
  var _s4 = useState(false); var collapsed = _s4[0]; var setCollapsed = _s4[1];

  useEffect(function() {
    var style = document.createElement("style");
    style.textContent = STYLES;
    document.head.appendChild(style);
    supabase.auth.getSession().then(function(res) {
      setUser(res.data.session ? res.data.session.user : null);
      setLoading(false);
    });
    var sub = supabase.auth.onAuthStateChange(function(_event, session) {
      setUser(session ? session.user : null);
    });
    return function() { sub.data.subscription.unsubscribe(); };
  }, []);

  var logout = async function() {
    await supabase.auth.signOut();
    setUser(null);
    setView("dashboard");
  };

  if (loading) return <LoadingScreen />;
  if (!user) return <Login onLogin={function(u) { setUser(u); }} />;

  var sideW = collapsed ? 68 : 260;

  var viewLabels = { dashboard: "Tableau de bord", prospects: "Prospects", suivi: "Suivi Administratif", prospection: "Prospection Mail", mailing: "Mailing", simulateur: "Simulateur Budget", audit: "Audit Conformit\u00e9", settings: "Param\u00e8tres", manager: "Vue Manager", formateurs: "Formateurs", formateurPortal: "Espace Formateur" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <SidebarComp active={view} onNav={setView} user={user} onLogout={logout} collapsed={collapsed} onToggle={function() { setCollapsed(!collapsed); }} />
      <div style={{ marginLeft: sideW, flex: 1, minHeight: "100vh", transition: "margin-left .3s" }}>
        {view !== "dashboard" && <div style={{ padding: "12px 36px 0", display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={function() { setView("dashboard"); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tm)", fontSize: 12, fontFamily: "var(--fb)" }}>Tableau de bord</button>
          <span style={{ color: "var(--tm)", fontSize: 11 }}>{"\u203A"}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--a)" }}>{viewLabels[view]}</span>
        </div>}
        <Suspense fallback={<LoadingScreen />}>
          {view === "dashboard" && <Dashboard user={user} supabase={supabase} onNav={setView} />}
          {view === "prospects" && <Prospects user={user} supabase={supabase} onNav={setView} />}
          {view === "suivi" && <CRMAdmin onNav={setView} />}
          {view === "prospection" && <ProspectionEmail onNav={setView} />}
          {view === "mailing" && <Mailing onNav={setView} />}
          {view === "simulateur" && <SimulateurBudget onNav={setView} />}
          {view === "audit" && <AuditConformite onNav={setView} />}
          {view === "settings" && <Settings user={user} supabase={supabase} />}
          {view === "manager" && <ManagerDashboard onNav={setView} />}
          {view === "formateurs" && <FormateursAdmin onNav={setView} />}
          {view === "formateurPortal" && <FormateurPortal onNav={setView} />}
        </Suspense>
      </div>
    </div>
  );
}

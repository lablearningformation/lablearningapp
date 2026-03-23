import React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { logActivityDB, saveLead as dbSaveLead, cacheSaveCRM } from "../lib/data-service.js";
import { sendEmail } from "../lib/email-service.js";

// ══════════════════════════════════════════════════════════════
// LAB LEARNING — Simulateur de Budget Formation
// Module complet avec calcul OPCO/AGEFICE/FAFCEA
// ══════════════════════════════════════════════════════════════

// ─── CONFIG ───
const CFG={
  boucherie:{label:"Boucherie / Charcuterie",opco:"OPCO EP",idcc:992,plafond:{"<11":5000,"11-49":5000},
    cats:[{id:"bc-tech",n:"Stages techniques métier",r:60,t:"Métier"},{id:"bc-trac",n:"Traçabilité / Étiquetage",r:50,t:"Métier"},{id:"bc-hyg",n:"Hygiène bonnes pratiques",r:50,t:"Métier"},{id:"bc-pms",n:"PMS / Sécurité alimentaire",r:50,t:"Métier"},{id:"bc-mgt",n:"Management",r:25,t:"Transverse"},{id:"bc-ges",n:"Gestion",r:25,t:"Transverse"},{id:"bc-du",n:"Document unique",r:20,t:"Transverse"}],
    cst:["Pas de distanciel","Durée mini 4h"],dirDefault:"fafcea"},
  boulangerie:{label:"Boulangerie artisanale",opco:"OPCO EP",idcc:843,plafond:{default:3500},
    cats:[{id:"bl-fab",n:"Techniques fabrication",r:50,t:"Métier"},{id:"bl-ven",n:"Vente / Communication",r:40,t:"Métier"},{id:"bl-ges",n:"Gestion boulangerie",r:40,t:"Métier"},{id:"bl-hyg",n:"Hygiène & sécurité",r:30,t:"Métier"},{id:"bl-eco",n:"Transition écologique",r:40,t:"Métier"},{id:"bl-soc",n:"Formations socle",r:25,t:"Transverse"}],
    cst:[],dirDefault:"fafcea"},
  patisserie:{label:"Pâtisserie artisanale",opco:"OPCO EP",idcc:1267,plafond:{"<11":2000,"11-49":3000},
    cats:[{id:"pt-fab",n:"Techniques fabrication",r:50,t:"Métier"},{id:"pt-hyg",n:"Hygiène / sécurité",r:30,t:"Métier"},{id:"pt-eti",n:"Étiquetage / traçabilité",r:50,t:"Métier"},{id:"pt-dec",n:"Décoration / magasinage",r:50,t:"Métier"},{id:"pt-ven",n:"Techniques de vente",r:50,t:"Métier"},{id:"pt-acc",n:"Accueil / Communication",r:30,t:"Métier"},{id:"pt-ges",n:"Gestion / pilotage",r:30,t:"Transverse"},{id:"pt-mgt",n:"Management",r:30,t:"Transverse"},{id:"pt-info",n:"Informatique / bureautique",r:30,t:"Transverse"}],
    cst:["Durée mini 4h","Aucun frais annexe"],dirDefault:"fafcea"},
  hcr:{label:"HCR (Hôtellerie-Restauration)",opco:"AKTO",idcc:1979,plafond:{"<11":2000,"11-49":3000},dayRate:1000,cats:[],
    cst:["Forfait 1 000€/jour","<11 = max 2j (2 000€)","11-49 = max 3j (3 000€)"],dirDefault:"agefice"},
  restauration_rapide:{label:"Restauration rapide",opco:"AKTO",idcc:1501,plafond:{"<11":4000,"11-49":9000},rdef:35,cats:[],
    cst:["Budget 2026","25€/h par personne"],dirDefault:"agefice"},
  agefice:{label:"AGEFICE",plafondHigh:3000,plafondLow:600,rate:42},
  fafcea:{label:"FAFCEA",maxH:54,rTech:60,rTrans:25}
};

// ─── CATALOGUE FORMATIONS ───
const CATA={
restauration_rapide:[
  {id:"rr-1",nm:"Hygiène alimentaire & bonnes pratiques professionnelles",h:7,cat:"hygiene",grp:"conformite",pri:2,isHyg7:true},
  {id:"rr-2",nm:"Méthode HACCP & Plan de Maîtrise Sanitaire (PMS)",hOpt:[14,21],cat:"hygiene",grp:"conformite",pri:1,isHygLong:true},
  {id:"rr-3",nm:"SST – Sauveteur Secouriste du Travail (initiale)",h:14,cat:"reglementaire",grp:"conformite",pri:2},
  {id:"rr-4",nm:"Techniques culinaires en restauration rapide",h:7,cat:"metier",grp:"competence",pri:1,hasOpt:true,optNm:"Option spécialité (+3h30)",optH:3.5},
  {id:"rr-5",nm:"Élaboration et mise à jour du DUERP",h:7,cat:"reglementaire",grp:"conformite",pri:2},
  {id:"rr-6",nm:"IA simplifiée pour les équipes de fast-food",h:14,cat:"performance",grp:"competence",pri:3},
  {id:"rr-7",nm:"Gestes & postures – Prévention des TMS",h:7,cat:"reglementaire",grp:"conformite",pri:2},
  {id:"rr-8",nm:"Organisation & management en service",h:14,cat:"management",grp:"competence",pri:3},
  {id:"rr-9",nm:"Gestion des stocks & rentabilité",h:14,cat:"performance",grp:"competence",pri:3},
  {id:"rr-10",nm:"Qualité de service, vente additionnelle & réclamations",h:7,cat:"performance",grp:"competence",pri:3},
  {id:"rr-11",nm:"Outils digitaux & IA pour optimiser la restauration rapide",h:7,cat:"performance",grp:"competence",pri:4},
  {id:"rr-12",nm:"Respecter le cadre légal d'une activité de restauration rapide",h:7,cat:"reglementaire",grp:"conformite",pri:2},
  {id:"rr-13",nm:"Sécurité incendie et évacuation",h:4,cat:"reglementaire",grp:"conformite",pri:2}
],
hcr:[
  {id:"hcr-1",nm:"Hygiène alimentaire et bonnes pratiques professionnelles",h:7,cat:"hygiene",grp:"conformite",pri:2,isHyg7:true},
  {id:"hcr-2",nm:"Hygiène alimentaire – HACCP et PMS",hOpt:[14,21],cat:"hygiene",grp:"conformite",pri:1,isHygLong:true},
  {id:"hcr-3",nm:"DUERP – Élaboration et mise à jour",h:7,cat:"reglementaire",grp:"conformite",pri:2},
  {id:"hcr-4",nm:"Sécurité incendie et évacuation",h:3.5,cat:"reglementaire",grp:"conformite",pri:2},
  {id:"hcr-5",nm:"Gestes et postures – Prévention des TMS",h:7,cat:"reglementaire",grp:"conformite",pri:2},
  {id:"hcr-6",nm:"SST – Sauveteur Secouriste du Travail (initiale)",h:14,cat:"reglementaire",grp:"conformite",pri:2},
  {id:"hcr-7",nm:"Management de proximité en restauration",h:14,cat:"management",grp:"competence",pri:3},
  {id:"hcr-8",nm:"Organisation du service et gestion du rush",h:7,cat:"metier",grp:"competence",pri:1},
  {id:"hcr-9",nm:"Gestion des stocks et rentabilité",h:14,cat:"performance",grp:"competence",pri:3},
  {id:"hcr-10",nm:"Excellence du service client en restauration",h:21,cat:"performance",grp:"competence",pri:1},
  {id:"hcr-11",nm:"Gestion du stress et des conflits",h:14,cat:"transverse",grp:"competence",pri:4},
  {id:"hcr-12",nm:"Anglais professionnel en restauration",h:14,cat:"transverse",grp:"competence",pri:4},
  {id:"hcr-13",nm:"Respecter le cadre légal d'une activité de restauration",h:7,cat:"reglementaire",grp:"conformite",pri:2},
  {id:"hcr-14",nm:"IA simplifiée pour la restauration",h:14,cat:"performance",grp:"competence",pri:3},
  {id:"hcr-15",nm:"Techniques culinaires (Restauration classique)",h:14,cat:"metier",grp:"competence",pri:1,hasOpt:true,optNm:"Option spécialité (+3h30)",optH:3.5}
],
boucherie:[
  {id:"bo-1",nm:"Découpe, désossage & parage",hOpt:[7,14,21],cat:"metier",fc:"bc-tech",grp:"competence",pri:1},
  {id:"bo-2",nm:"Préparations bouchères & traiteur",hOpt:[7,14,21],cat:"metier",fc:"bc-tech",grp:"competence",pri:1},
  {id:"bo-3",nm:"Organisation du laboratoire & flux",hOpt:[7,14,21],cat:"metier",fc:"bc-tech",grp:"competence",pri:1},
  {id:"bo-4",nm:"Techniques de charcuterie artisanale",hOpt:[7,14,21],cat:"metier",fc:"bc-tech",grp:"competence",pri:1},
  {id:"bo-5",nm:"Hygiène alimentaire en boucherie (HACCP & PMS)",hOpt:[7,14,21],cat:"hygiene",fc:"bc-pms",grp:"conformite",pri:2,isHygLong:true},
  {id:"bo-6",nm:"Plan de nettoyage-désinfection (PND)",hOpt:[7,14,21],cat:"hygiene",fc:"bc-hyg",grp:"conformite",pri:2},
  {id:"bo-7",nm:"Chaîne du froid & maîtrise des risques",hOpt:[7,14,21],cat:"hygiene",fc:"bc-hyg",grp:"conformite",pri:2},
  {id:"bo-8",nm:"Traçabilité, lots, DLC & retrait/rappel",hOpt:[7,14,21],cat:"reglementaire",fc:"bc-trac",grp:"conformite",pri:2},
  {id:"bo-9",nm:"Étiquetage, allergènes & INCO",hOpt:[7,14,21],cat:"reglementaire",fc:"bc-trac",grp:"conformite",pri:2},
  {id:"bo-10",nm:"Sécurité au poste : couteaux, scie, hachoir",hOpt:[7,14,21],cat:"reglementaire",fc:"bc-tech",grp:"conformite",pri:2},
  {id:"bo-11",nm:"Gestes et postures – TMS en boucherie",hOpt:[7,14,21],cat:"reglementaire",fc:"bc-hyg",grp:"conformite",pri:2},
  {id:"bo-12",nm:"DUERP – Risques professionnels",hOpt:[7,14,21],cat:"reglementaire",fc:"bc-du",grp:"conformite",pri:2},
  {id:"bo-13",nm:"Vente-conseil au comptoir",hOpt:[7,14,21],cat:"performance",fc:"bc-ges",grp:"competence",pri:3},
  {id:"bo-14",nm:"Merchandising vitrine & animation commerciale",hOpt:[7,14,21],cat:"performance",fc:"bc-ges",grp:"competence",pri:3},
  {id:"bo-15",nm:"Gestion des stocks & inventaires",hOpt:[7,14,21],cat:"performance",fc:"bc-ges",grp:"competence",pri:3},
  {id:"bo-16",nm:"Pilotage d'activité : marge, rendement, pricing",hOpt:[7,14,21],cat:"performance",fc:"bc-ges",grp:"competence",pri:3},
  {id:"bo-17",nm:"Management d'équipe & intégration",hOpt:[7,14,21],cat:"management",fc:"bc-mgt",grp:"competence",pri:3},
  {id:"bo-18",nm:"SST + MAC SST",hOpt:[14,7],cat:"reglementaire",fc:"bc-hyg",grp:"conformite",pri:2}
],
boulangerie:[
  {id:"bl-1",nm:"Hygiène et Bonnes Pratiques Professionnelles",h:7,cat:"hygiene",fc:"bl-hyg",grp:"conformite",pri:2,isHyg7:true},
  {id:"bl-2",nm:"Traçabilité et Gestion des Produits",h:7,cat:"reglementaire",fc:"bl-hyg",grp:"conformite",pri:2},
  {id:"bl-3",nm:"Prévention des Risques Professionnels",h:7,cat:"reglementaire",fc:"bl-hyg",grp:"competence",pri:2},
  {id:"bl-4",nm:"Techniques de Vente en Boulangerie",h:7,cat:"performance",fc:"bl-ven",grp:"competence",pri:3},
  {id:"bl-5",nm:"Présentation des Produits & Merchandising",h:7,cat:"performance",fc:"bl-ven",grp:"competence",pri:3},
  {id:"bl-6",nm:"Connaissance des Produits en Boulangerie",h:7,cat:"metier",fc:"bl-fab",grp:"competence",pri:1},
  {id:"bl-7",nm:"Transition Écologique en Boulangerie",h:14,cat:"transverse",fc:"bl-eco",grp:"competence",pri:4},
  {id:"bl-8",nm:"Management d'équipe en Boulangerie",h:14,cat:"management",fc:"bl-soc",grp:"competence",pri:3},
  {id:"bl-9",nm:"Comptabilité, Gestion et Rentabilité",h:14,cat:"performance",fc:"bl-ges",grp:"competence",pri:3}
],
patisserie:[
  {id:"pa-1",nm:"Techniques de fabrication / préparation / transformation",hOpt:[7,14,21],cat:"metier",fc:"pt-fab",grp:"competence",pri:1},
  {id:"pa-2",nm:"Hygiène & Sécurité alimentaire",hOpt:[7,14,21],cat:"hygiene",fc:"pt-hyg",grp:"conformite",pri:2,isHygLong:true},
  {id:"pa-3",nm:"Traçabilité & étiquetage",h:7,cat:"reglementaire",fc:"pt-eti",grp:"conformite",pri:2},
  {id:"pa-4",nm:"Magasinage / décoration vitrine",h:7,cat:"performance",fc:"pt-dec",grp:"competence",pri:3},
  {id:"pa-5",nm:"Label qualité / innovation",h:7,cat:"metier",fc:"pt-fab",grp:"competence",pri:3},
  {id:"pa-6",nm:"Techniques de vente",h:7,cat:"performance",fc:"pt-ven",grp:"competence",pri:3},
  {id:"pa-7",nm:"Pilotage d'entreprise",h:7,cat:"performance",fc:"pt-ges",grp:"competence",pri:3},
  {id:"pa-8",nm:"Management",h:7,cat:"management",fc:"pt-mgt",grp:"competence",pri:3},
  {id:"pa-9",nm:"Accueil / Communication",h:7,cat:"performance",fc:"pt-acc",grp:"competence",pri:3},
  {id:"pa-10",nm:"Informatique / Réseaux sociaux",h:7,cat:"transverse",fc:"pt-info",grp:"competence",pri:4},
  {id:"pa-11",nm:"Bureautique / Comptabilité",h:7,cat:"transverse",fc:"pt-info",grp:"competence",pri:4},
  {id:"pa-12",nm:"Secourisme",h:7,cat:"reglementaire",fc:"pt-hyg",grp:"conformite",pri:2}
]};

// ─── CONFORMITE COMBOS ───
function getConformiteCombos(act,tr){
  const cat=CATA[act]||[],nm=id=>{const f=cat.find(x=>x.id===id);return f?f.nm:id;};
  if(act==='hcr'){
    if(tr==='<11') return [
      {ids:["hcr-2"],hrs:{"hcr-2":14},label:((nm("hcr-2")) + " – 14h"),total:14,note:"Socle certifiant HACCP — 2 jours"},
      {ids:["hcr-1","hcr-3"],hrs:{"hcr-1":7,"hcr-3":7},label:((nm("hcr-1")) + " (7h) + " + (nm("hcr-3")) + " (7h)"),total:14,note:"Hygiène rappel + DUERP — 2 jours"},
    ];
    return [
      {ids:["hcr-2"],hrs:{"hcr-2":14},label:((nm("hcr-2")) + " – 14h"),total:14,note:"Socle certifiant — 2 jours"},
      {ids:["hcr-2"],hrs:{"hcr-2":21},label:((nm("hcr-2")) + " – 21h"),total:21,note:"HACCP complet — 3 jours"},
      {ids:["hcr-2","hcr-3"],hrs:{"hcr-2":14,"hcr-3":7},label:((nm("hcr-2")) + " (14h) + " + (nm("hcr-3")) + " (7h)"),total:21,note:"HACCP + DUERP — 3 jours"},
    ];
  }
  if(act==='restauration_rapide') return [
    {ids:["rr-2"],hrs:{"rr-2":14},label:((nm("rr-2")) + " – 14h"),total:14,note:"Socle certifiant HACCP"},
    {ids:["rr-2"],hrs:{"rr-2":21},label:((nm("rr-2")) + " – 21h"),total:21,note:"HACCP complet"},
    {ids:["rr-2","rr-5"],hrs:{"rr-2":14,"rr-5":7},label:((nm("rr-2")) + " (14h) + " + (nm("rr-5")) + " (7h)"),total:21,note:"HACCP + DUERP"},
    {ids:["rr-2","rr-3"],hrs:{"rr-2":14,"rr-3":14},label:((nm("rr-2")) + " (14h) + " + (nm("rr-3")) + " (14h)"),total:28,note:"HACCP + SST"},
    {ids:["rr-3","rr-5"],hrs:{"rr-3":14,"rr-5":7},label:((nm("rr-3")) + " (14h) + " + (nm("rr-5")) + " (7h)"),total:21,note:"SST + DUERP"},
  ];
  if(act==='boulangerie') return [{ids:["bl-1","bl-2"],hrs:{"bl-1":7,"bl-2":7},label:((nm("bl-1")) + " (7h) + " + (nm("bl-2")) + " (7h)"),total:14,note:"Attestation HACCP complète"}];
  if(act==='patisserie') return [{ids:["pa-2","pa-3"],hrs:{"pa-2":7,"pa-3":7},label:((nm("pa-2")) + " (7h) + " + (nm("pa-3")) + " (7h)"),total:14,note:"Attestation HACCP complète"}];
  if(act==='boucherie') return [
    {ids:["bo-5","bo-6","bo-8"],hrs:{"bo-5":7,"bo-6":7,"bo-8":7},label:((nm("bo-5")) + " (7h) + " + (nm("bo-6")) + " (7h) + " + (nm("bo-8")) + " (7h)"),total:21,note:"HACCP complet 21h — à favoriser"},
    {ids:["bo-5","bo-6"],hrs:{"bo-5":7,"bo-6":7},label:((nm("bo-5")) + " (7h) + " + (nm("bo-6")) + " (7h)"),total:14,note:"HACCP 14h — attestation"},
    {ids:["bo-18","bo-12"],hrs:{"bo-18":14,"bo-12":7},label:((nm("bo-18")) + " (14h) + " + (nm("bo-12")) + " (7h)"),total:21,note:"SST + DUERP"},
  ];
  return [];
}

// ─── COMPETENCE GROUPS ───
function getCompetenceGroups(act){
  if(act==='hcr') return [{title:"Organisation & Rentabilité",ids:["hcr-9","hcr-8"]},{title:"Management",ids:["hcr-7","hcr-11"]},{title:"Service client",ids:["hcr-10"]},{title:"Cuisine",ids:["hcr-15","hcr-12"]},{title:"Innovation & digital",ids:["hcr-14"]}];
  if(act==='restauration_rapide') return [{title:"Organisation & Rentabilité",ids:["rr-9"]},{title:"Management",ids:["rr-8"]},{title:"Service client",ids:["rr-10"]},{title:"Cuisine",ids:["rr-4"]},{title:"Innovation & digital",ids:["rr-6","rr-11"]}];
  if(act==='boulangerie') return [{title:"Organisation & Rentabilité",ids:["bl-9"]},{title:"Management",ids:["bl-8"]},{title:"Service client",ids:["bl-4","bl-5"]},{title:"Production & Innovation",ids:["bl-3","bl-6","bl-7"]}];
  if(act==='patisserie') return [{title:"Métier / Fabrication",ids:["pa-1"]},{title:"Service & Commerce",ids:["pa-4","pa-6","pa-9"]},{title:"Gestion & Management",ids:["pa-7","pa-8"]},{title:"Digital & Innovation",ids:["pa-5","pa-10","pa-11"]}];
  if(act==='boucherie') return [{title:"Métier / Technique",ids:["bo-1","bo-2","bo-3","bo-4"]},{title:"Service & Commercial",ids:["bo-13","bo-14"]},{title:"Gestion & Pilotage",ids:["bo-15","bo-16"]},{title:"Management",ids:["bo-17"]}];
  return [];
}

// ─── HELPERS ───
const fmt=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:0}).format(n);
const getH=f=>f.hOpt?f.hOpt[0]:f.h||7;
const getDays=h=>h/7;
const getPlaf=(act,tr)=>{const c=CFG[act];if(!c)return 0;if(c.plafond)return c.plafond.default||c.plafond[tr]||c.plafond["<11"]||0;return 0;};
const getAgeficeBudget=(level)=>level==='high'?CFG.agefice.plafondHigh:CFG.agefice.plafondLow;

function getRate(f,act){
  if(act==='hcr') return CFG.hcr.dayRate||1000;
  if(act==='restauration_rapide') return CFG.restauration_rapide.rdef||35;
  const c=CFG[act];if(!c)return 0;
  if(f.fc){const cat=c.cats?.find(x=>x.id===f.fc);if(cat)return cat.r;}
  return 0;
}
function getFafceaRate(f,act){
  const c=CFG[act];
  if(c&&c.cats&&f.fc){const cat=c.cats.find(x=>x.id===f.fc);if(cat)return cat.t==='Métier'?CFG.fafcea.rTech:CFG.fafcea.rTrans;}
  if(['metier','hygiene','reglementaire'].includes(f.cat)) return CFG.fafcea.rTech;
  return CFG.fafcea.rTrans;
}
function getCostForLine(h,opcoRate,act,b,fund,f,dirBudget){
  if(fund==='dirigeant'){
    if(dirBudget==='agefice') return h*CFG.agefice.rate*b;
    return h*getFafceaRate(f||{},act)*b;
  }
  if(act==='hcr') return Math.ceil(h/7)*(CFG.hcr.dayRate||1000);
  return h*opcoRate*b;
}
function getCost(h,rate,act,b){
  if(act==='hcr') return Math.ceil(h/7)*(CFG.hcr.dayRate||1000);
  return h*rate*b;
}

const CAT_COLORS={metier:"#195144",hygiene:"#047857",reglementaire:"#92400e",performance:"#9a3412",management:"#5b21b6",transverse:"#6b7280"};
const CAT_LABELS={metier:"Métier",hygiene:"Hygiène",reglementaire:"Réglementaire",performance:"Performance",management:"Management",transverse:"Transverse"};
const ACT_ICONS={boucherie:"🥩",boulangerie:"🥖",patisserie:"🍰",hcr:"🍽️",restauration_rapide:"🍔"};

// ─── STYLES ───
const S="\\n@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap');\\n*{margin:0;padding:0;box-sizing:border-box}\\n:root{--p:#195144;--pl:#1E6B5A;--a:#59D597;--ag:rgba(89,213,151,.15);--bg:#0B0F1A;--c:#111827;--ch:#1A2332;--sf:#0F172A;--inp:#1E293B;--t1:#F1F5F9;--t2:#94A3B8;--tm:#64748B;--bd:rgba(148,163,184,.08);--r:12px;--fb:'Plus Jakarta Sans',sans-serif;--fd:'Outfit',sans-serif}\\nbody{font-family:var(--fb);background:var(--bg);color:var(--t1)}\\n::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:rgba(148,163,184,.15);border-radius:3px}\\n@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}\\n.anim{animation:fadeUp .35s ease forwards}\\n.tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;color:#fff;letter-spacing:.3px}\\n.inp{width:100%;padding:10px 14px;background:var(--inp);border:1px solid var(--bd);border-radius:8px;color:var(--t1);font-family:var(--fb);font-size:14px;outline:none;transition:.2s}\\n.inp:focus{border-color:var(--a);box-shadow:0 0 0 3px var(--ag)}\\n.inp::placeholder{color:var(--tm)}\\nselect.inp{cursor:pointer;appearance:auto}\\n.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;font-family:var(--fb);font-weight:600;font-size:13px;cursor:pointer;border:none;transition:.15s}\\n.btn:hover{transform:translateY(-1px)}.btn:active{transform:translateY(0)}\\n.btn-p{background:linear-gradient(135deg,var(--p),var(--pl));color:#fff}\\n.btn-a{background:linear-gradient(135deg,var(--a),#3ECB82);color:var(--p);font-weight:700}\\n.btn-s{background:var(--inp);color:var(--t1);border:1px solid var(--bd)}\\n.btn-d{background:rgba(220,38,38,.1);color:#F87171;border:1px solid rgba(220,38,38,.2)}\\n.btn-sm{padding:6px 12px;font-size:12px}\\n.card{background:var(--c);border:1px solid var(--bd);border-radius:16px;padding:24px}\\n.lbl{display:block;font-size:11px;font-weight:700;color:var(--tm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}\\n.gauge-wrap{margin-bottom:14px}\\n.gauge-bar{height:8px;border-radius:4px;background:rgba(148,163,184,.1);overflow:hidden;margin:6px 0}\\n.gauge-fill{height:100%;border-radius:4px;transition:width .4s}\\n";

// ══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Simulateur(props){
  var onNav = props && props.onNav ? props.onNav : function() {};
  const [act,setAct]=useState("");
  const [etab,setEtab]=useState("");
  const [clientName,setClientName]=useState("");
  const [clientEmail,setClientEmail]=useState("");
  const [civilite,setCivilite]=useState("");
  const [effectif,setEffectif]=useState("");
  const [tranche,setTranche]=useState("<11");
  const [nbSalaries,setNbSalaries]=useState(1);
  const [hasDirigeant,setHasDirigeant]=useState(false);
  const [nbDirigeants,setNbDirigeants]=useState(1);
  const [dirBudget,setDirBudget]=useState("fafcea");
  const [cfpLevel,setCfpLevel]=useState("high");
  const [agMode,setAgMode]=useState("combine");
  const [hasUsedBudget,setHasUsedBudget]=useState(false);
  const [usedOpco,setUsedOpco]=useState(0);
  const [usedDir,setUsedDir]=useState(0);
  const [sel,setSel]=useState([]);
  const [lineCounter,setLineCounter]=useState(0);
  const [showDevis,setShowDevis]=useState(false);
  const [previewF,setPreviewF]=useState(null);
  const [pvH,setPvH]=useState(0);
  const [pvB,setPvB]=useState(1);
  const [pvOpt,setPvOpt]=useState(false);
  const [maxJours,setMaxJours]=useState("");
  const [saved,setSaved]=useState([]);
  const [tab,setTab]=useState("proposal");
  const [toast,setToast]=useState(null);
  const [showAdmin,setShowAdmin]=useState(false);

  const showToast=(msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);};

  useEffect(()=>{
    if(!document.getElementById('sim-styles')){
      const s=document.createElement('style');s.id='sim-styles';s.textContent=S;document.head.appendChild(s);
    }
    try{var pf=localStorage.getItem("ll_prefill_simu");if(pf){var d=JSON.parse(pf);if(d.client)setClientName(d.client);if(d.etab)setEtab(d.etab);if(d.effectif)setEffectif(String(d.effectif));localStorage.removeItem("ll_prefill_simu");}}catch(e){}
  },[]);

  // Auto tranche
  useEffect(()=>{
    const e=parseInt(effectif);
    if(e>0) setTranche(e<11?"<11":"11-49");
  },[effectif]);

  // Auto dir budget default
  useEffect(()=>{
    if(act&&CFG[act]?.dirDefault) setDirBudget(CFG[act].dirDefault);
  },[act]);

  // Reset when activity changes
  useEffect(()=>{
    setSel([]);setLineCounter(0);setPreviewF(null);
  },[act]);

  // ─── BUDGET CALC ───
  const budget=useMemo(()=>{
    if(!act) return {opco:0,opcoTotal:0,usedOpco:0,dMax:0,dTotal:0,usedDir:0,dLbl:""};
    const nd=nbDirigeants||1;
    const uo=hasUsedBudget?usedOpco:0;
    const ud=hasDirigeant?usedDir:0;
    let opcoTotal=getPlaf(act,tranche);
    let opco=Math.max(0,opcoTotal-uo);
    let dMax=0,dLbl="",dTotal=0;
    if(hasDirigeant){
      if(dirBudget==='agefice'){
        dTotal=getAgeficeBudget(cfpLevel)*nd;
        dMax=Math.max(0,dTotal-ud);
        dLbl=("AGEFICE : " + (CFG.agefice.rate) + "€/h, max " + (fmt(getAgeficeBudget(cfpLevel))) + "/dir.");
      } else {
        dTotal=CFG.fafcea.maxH*CFG.fafcea.rTech*nd;
        dMax=Math.max(0,dTotal-ud);
        dLbl=("FAFCEA : " + (CFG.fafcea.maxH) + "h max/an, Tech " + (CFG.fafcea.rTech) + "€/h, Trans " + (CFG.fafcea.rTrans) + "€/h");
      }
    }
    return {opco,opcoTotal,usedOpco:uo,dMax,dTotal,usedDir:ud,dLbl};
  },[act,tranche,hasDirigeant,nbDirigeants,dirBudget,cfpLevel,hasUsedBudget,usedOpco,usedDir]);

  const sumFund=useCallback(t=>sel.filter(f=>f.fund===t).reduce((s,f)=>s+f.cost,0),[sel]);
  const opU=sumFund('opco'), dU=sumFund('dirigeant');
  const tC=sel.reduce((s,f)=>s+f.cost,0);
  const tH=sel.reduce((s,f)=>s+f.h,0);
  const tD=sel.reduce((s,f)=>s+f.d,0);
  const opRem=Math.max(0,budget.opco-opU);
  const isHCR=act==='hcr';

  const shouldHideHyg7=sel.some(s=>{const f=(CATA[act]||[]).find(x=>x.id===s.id);return f&&f.isHygLong&&s.h>=14;});

  // ─── ADD/REMOVE ───
  const doAdd=(f,h,b,rate,withOpt)=>{
    const lc=lineCounter+1;setLineCounter(lc);
    const cost=getCostForLine(h,rate,act,b,'opco',f,dirBudget);
    setSel(p=>[...p,{lineId:lc,id:f.id,nm:f.nm+(withOpt?(" + " + (f.optNm)):''),h,d:getDays(h),b,rate,cost,cat:f.cat,fc:f.fc,fund:"opco",grp:f.grp,pri:f.pri,hOpt:f.hOpt,isHyg7:f.isHyg7,isHygLong:f.isHygLong}]);
  };
  const addFromPreview=()=>{
    if(!previewF) return;
    const f=previewF, rate=getRate(f,act);
    let h=pvH||getH(f); const b=pvB||nbSalaries||1;
    if(pvOpt&&f.optH) h+=f.optH;
    doAdd(f,h,b,rate,pvOpt);
    setPreviewF(null);setPvOpt(false);
  };
  const quickAdd=(fid,forceH)=>{
    const f=(CATA[act]||[]).find(x=>x.id===fid);if(!f) return;
    doAdd(f,forceH||getH(f),nbSalaries||1,getRate(f,act),false);
  };
  const addCombo=(ids,hrs)=>{
    const catalog=CATA[act]||[];
    ids.forEach(id=>{
      if(sel.some(s=>s.id===id)) return;
      const f=catalog.find(x=>x.id===id);if(!f) return;
      doAdd(f,hrs[id]||getH(f),nbSalaries||1,getRate(f,act),false);
    });
  };
  const rmF=lid=>setSel(p=>p.filter(s=>s.lineId!==lid));
  const updF=(lid,field,val)=>{
    setSel(p=>p.map(s=>{
      if(s.lineId!==lid) return s;
      const ns={...s};
      if(field==='h'){ns.h=parseFloat(val);ns.d=getDays(ns.h);}
      if(field==='b') ns.b=parseInt(val)||1;
      if(field==='fund'){
        ns.fund=val;
        if(val==='dirigeant') ns.b=nbDirigeants||1;
        else ns.b=nbSalaries||1;
      }
      const orig=(CATA[act]||[]).find(x=>x.id===ns.id);
      ns.cost=getCostForLine(ns.h,ns.rate,act,ns.b,ns.fund,orig||ns,dirBudget);
      return ns;
    }));
  };

  // ─── PREVIEW ───
  const selectFormation=(fid)=>{
    const f=(CATA[act]||[]).find(x=>x.id===fid);
    if(!f){setPreviewF(null);return;}
    setPreviewF(f);setPvH(getH(f));setPvB(nbSalaries||1);setPvOpt(false);
  };

  const pvCost=previewF?getCost(pvH+(pvOpt&&previewF.optH?previewF.optH:0),getRate(previewF,act),act,pvB):0;

  // ─── CATALOG GROUPED ───
  const catalog=CATA[act]||[];
  const groupedCatalog=useMemo(()=>{
    const g={};catalog.forEach(f=>{const k=CAT_LABELS[f.cat]||"Autre";if(!g[k])g[k]=[];g[k].push(f);});
    return ["Métier","Hygiène","Réglementaire","Performance","Management","Transverse","Autre"].filter(k=>g[k]).map(k=>({label:k,items:g[k]}));
  },[catalog]);

  // ─── SAVE ───
  const saveProposal=()=>{
    if(!sel.length) return;
    setSaved(p=>[...p,{id:Date.now(),date:new Date().toLocaleDateString('fr-FR'),etab:etab||'—',client:clientName||'Client',act,actL:CFG[act]?.label,forms:JSON.parse(JSON.stringify(sel)),tC,tH,tD,bO:budget.opco,opL:CFG[act]?.opco,rac:Math.max(0,tC-Math.min(opU,budget.opco)-Math.min(dU,budget.dMax))}]);
    showToast("✅ Proposition enregistrée !");
    logActivityDB({ module: "simulateur", action: "simulation_done", type: "simulation_done", leadName: clientName || etab || "", details: sel.length + " formation(s)" });
  };

  // ─── EXPORT EXCEL (generates in memory, downloads via blob) ───
  const exportExcel=async()=>{
    const XLSX=await import('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js').catch(()=>null);
    if(!XLSX&&!window.XLSX){alert("Chargement de la librairie Excel...");return;}
    const X=window.XLSX||XLSX;
    const finOpco=Math.min(opU,budget.opco),finDir=Math.min(dU,budget.dMax),rac=Math.max(0,tC-finOpco-finDir);
    const dirLabel=dirBudget==='fafcea'?'FAFCEA':'AGEFICE';
    const d=[];
    d.push([""]);d.push(["","DEVIS INFORMATIF — LAB LEARNING"]);d.push(["","Formation professionnelle continue"]);d.push([""]);
    d.push(["","Établissement :",etab||"—","","Date :",new Date().toLocaleDateString('fr-FR')]);
    d.push(["","Client :",clientName||"—","","Activité :",CFG[act]?.label||""]);
    d.push(["","IDCC :",CFG[act]?.idcc||""]);d.push([""]);
    d.push(["","FORMATIONS SÉLECTIONNÉES"]);
    d.push(["","Formation","Durée","Jours","Bénéficiaires",isHCR?"Forfait/jour":"Taux horaire","Source","Montant TTC"]);
    sel.forEach(f=>{
      const src=f.fund==='dirigeant'?dirLabel:CFG[act]?.opco;
      let rd;if(f.fund==='dirigeant'){rd=dirBudget==='agefice'?CFG.agefice.rate+'€/h':getFafceaRate(f,act)+'€/h';}else{rd=isHCR?'1000€/j':f.rate+'€/h';}
      d.push(["",f.nm,f.h+"h",f.d.toFixed(1)+"j",f.b+" pers.",rd,src,f.cost]);
    });
    d.push([""]);d.push(["","TOTAL TTC","","","","","",tC]);d.push([""]);
    d.push(["","Financement "+CFG[act]?.opco,"","","","","",finOpco]);
    if(hasDirigeant&&finDir>0) d.push(["","Financement "+dirLabel,"","","","","",finDir]);
    d.push([""]);d.push(["","RESTE À CHARGE ESTIMÉ","","","","","",rac]);
    const wb=X.utils.book_new();const ws=X.utils.aoa_to_sheet(d);
    ws['!cols']=[{wch:3},{wch:45},{wch:10},{wch:10},{wch:14},{wch:14},{wch:18},{wch:16}];
    X.utils.book_append_sheet(wb,ws,'Devis');
    X.writeFile(wb,("Devis_" + ((etab||'client').replace(/\s+/g,'_')) + "_" + (new Date().toISOString().slice(0,10)) + ".xlsx"));
  };

  // ─── RECOMMENDATIONS ENGINE (3-tier faithful to original) ───
  const recommendations=useMemo(()=>{
    if(!sel.length||!act) return [];
    const sIds=sel.map(s=>s.id);
    const firstGrp=sel[0].grp;
    const recs=[];
    const nb=nbSalaries||1;

    if(firstGrp==='conformite'){
      // Tier 1a: Combos conformité
      const combos=getConformiteCombos(act,tranche);
      const relevant=combos.filter(c=>c.ids.some(id=>!sIds.includes(id)));
      if(relevant.length) recs.push({type:"combos",title:"🛡️ Parcours Conformité recommandés",items:relevant.map(c=>{
        const totalCost=c.ids.reduce((s,id)=>{const f=catalog.find(x=>x.id===id);if(!f)return s;return s+getCost(c.hrs[id]||getH(f),getRate(f,act),act,nb);},0);
        return {...c,totalCost,fits:totalCost<=opRem+10,missing:c.ids.filter(id=>!sIds.includes(id))};
      })});
      // Tier 1b: Individual conformité formations
      const confF=catalog.filter(f=>f.grp==='conformite'&&!sIds.includes(f.id));
      const filtered=confF.filter(f=>{if(shouldHideHyg7&&f.isHyg7)return false;const cost=getCost(getH(f),getRate(f,act),act,nb);return cost<=opRem||isHCR;});
      if(filtered.length) recs.push({type:"other",title:"🛡️ Autres formations conformité",
        items:filtered.map(f=>({f,h:getH(f),cost:getCost(getH(f),getRate(f,act),act,nb)}))});
    } else {
      // Competence groups
      const groups=getCompetenceGroups(act);
      const relevant=groups.filter(g=>g.ids.some(id=>!sIds.includes(id)));
      if(relevant.length) recs.push({type:"groups",title:"🚀 Développement des compétences",groups:relevant.map(g=>({
        ...g,items:g.ids.filter(id=>!sIds.includes(id)).map(id=>{
          const f=catalog.find(x=>x.id===id);if(!f) return null;
          const h=getH(f),cost=getCost(h,getRate(f,act),act,nb);
          return {f,h,cost,fits:cost<=opRem||isHCR};
        }).filter(Boolean)
      }))});
    }

    // Tier 2: Opposite category with remaining budget
    if(opRem>100){
      const otherGrp=firstGrp==='conformite'?'competence':'conformite';
      const otherLabel=otherGrp==='conformite'?"🛡️ Conformité (budget restant)":"🚀 Compétences (budget restant)";
      const affordable=catalog.filter(f=>f.grp===otherGrp&&!sIds.includes(f.id)&&!(shouldHideHyg7&&f.isHyg7))
        .filter(f=>getCost(getH(f),getRate(f,act),act,nb)<=opRem||isHCR).slice(0,5);
      if(affordable.length) recs.push({type:"other",title:otherLabel,
        items:affordable.map(f=>({f,h:getH(f),cost:getCost(getH(f),getRate(f,act),act,nb)}))});
    }

    // Tier 3: Maximize budget — remaining formations sorted by cost desc
    if(opRem>50){
      const alreadyShown=new Set();recs.forEach(r=>{
        if(r.items) r.items.forEach(it=>{if(it.f)alreadyShown.add(it.f.id);if(it.ids)it.ids.forEach(id=>alreadyShown.add(id));});
        if(r.groups) r.groups.forEach(g=>g.items?.forEach(it=>{if(it.f)alreadyShown.add(it.f.id);}));
      });
      const canAfford=catalog.filter(f=>!sIds.includes(f.id)&&!alreadyShown.has(f.id)&&!(shouldHideHyg7&&f.isHyg7))
        .filter(f=>getCost(getH(f),getRate(f,act),act,nb)<=opRem)
        .sort((a,b)=>getCost(getH(b),getRate(b,act),act,nb)-getCost(getH(a),getRate(a,act),act,nb)).slice(0,4);
      if(canAfford.length) recs.push({type:"maximize",title:"🎯 Maximiser le budget",subtitle:("Formations supplémentaires pour récupérer le budget (" + (fmt(opRem)) + " restant) :"),
        items:canAfford.map(f=>({f,h:getH(f),cost:getCost(getH(f),getRate(f,act),act,nb)}))});
    }

    // Hint: dirigeant unused
    if(hasDirigeant&&dU===0&&sel.length>0){
      recs.push({type:"hint",title:("👤 Budget " + (dirBudget==='fafcea'?'FAFCEA':'AGEFICE') + " non utilisé"),text:("Basculez certaines formations sur \\\"" + (dirBudget==='fafcea'?'FAFCEA':'AGEFICE') + "\\\" pour libérer du budget " + (CFG[act]?.opco) + ".")});
    }
    return recs;
  },[sel,act,tranche,opRem,nbSalaries,hasDirigeant,dU,dirBudget,catalog,shouldHideHyg7,isHCR]);

  if(!act) return (
    <div style={{minHeight:"100vh",background:"var(--bg)",padding:32}}>
      <style>{S}</style>
      <div className="anim" style={{maxWidth:900,margin:"0 auto"}}>
        <h1 style={{fontFamily:"var(--fd)",fontSize:32,fontWeight:800,letterSpacing:"-.02em",marginBottom:8}}>💰 Simulateur Budget Formation</h1>
        <p style={{color:"var(--t2)",fontSize:15,marginBottom:32}}>Sélectionnez une activité pour commencer</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
          {Object.entries(CFG).filter(([k])=>CATA[k]).map(([key,c])=>(
            <div key={key} onClick={()=>setAct(key)} style={{background:"var(--c)",border:"1px solid var(--bd)",borderRadius:16,padding:24,cursor:"pointer",transition:"all .2s",textAlign:"center"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--a)';e.currentTarget.style.transform='translateY(-3px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--bd)';e.currentTarget.style.transform='none';}}>
              <div style={{fontSize:40,marginBottom:12}}>{ACT_ICONS[key]}</div>
              <div style={{fontWeight:700,fontSize:15}}>{c.label}</div>
              <div style={{fontSize:12,color:"var(--tm)",marginTop:4}}>{c.opco} — IDCC {c.idcc}</div>
              <div style={{fontSize:12,color:"var(--a)",marginTop:8,fontWeight:600}}>{(CATA[key]||[]).length} formations</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── MAIN RENDER ───
  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",color:"var(--t1)"}}>
      <style>{S}</style>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0e2f27,#195144,#1a6b52)",padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:28}}>{ACT_ICONS[act]}</span>
          <div>
            <h1 style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:800}}>{CFG[act]?.label}</h1>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
              <span style={{fontSize:12,opacity:.7}}>{CFG[act]?.opco}</span>
              <span style={{padding:"2px 8px",borderRadius:4,background:"rgba(255,255,255,.15)",fontSize:11,fontWeight:700}}>📋 IDCC {CFG[act]?.idcc}</span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-s btn-sm" onClick={()=>setAct("")}>← Changer d'activité</button>
          <button className="btn btn-s btn-sm" onClick={()=>setShowAdmin(!showAdmin)}>⚙️ Barèmes</button>
          {sel.length>0&&<button className="btn btn-a btn-sm" onClick={()=>setShowDevis(true)}>📄 Voir le devis</button>}
        </div>
      </div>

      {/* TABS */}
      <div style={{background:"var(--c)",borderBottom:"1px solid var(--bd)",display:"flex",position:"sticky",top:0,zIndex:50}}>
        {[{id:"proposal",label:"📝 Proposition"},{id:"saved",label:("💾 Sauvegardées (" + (saved.length) + ")")}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"12px 24px",border:"none",background:"none",fontFamily:"var(--fb)",fontWeight:600,fontSize:14,cursor:"pointer",borderBottom:tab===t.id?"3px solid var(--a)":"3px solid transparent",color:tab===t.id?"var(--a)":"var(--tm)",transition:".2s"}}>{t.label}</button>
        ))}
      </div>

      {tab==="saved"?(
        <div style={{maxWidth:900,margin:"0 auto",padding:24}}>
          <h2 style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700,marginBottom:20}}>💾 Propositions sauvegardées</h2>
          {!saved.length?<div className="card" style={{textAlign:"center",padding:48}}><div style={{fontSize:48,marginBottom:12}}>📋</div><p style={{color:"var(--tm)"}}>Aucune proposition sauvegardée</p></div>:
          saved.map((p,i)=>(
            <div key={p.id} className="card" style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div><h3 style={{fontSize:16,fontWeight:700}}>{p.etab}</h3><p style={{fontSize:12,color:"var(--tm)"}}>{p.actL} — {p.date}</p></div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  {p.rac===0?<span style={{background:"rgba(5,150,105,.15)",color:"#10B981",padding:"4px 12px",borderRadius:12,fontSize:11,fontWeight:700}}>✅ 100%</span>:
                  <span style={{background:"rgba(245,158,11,.15)",color:"#F59E0B",padding:"4px 12px",borderRadius:12,fontSize:11,fontWeight:700}}>RAC: {fmt(p.rac)}</span>}
                  <button className="btn btn-d btn-sm" onClick={()=>setSaved(s=>s.filter((_,j)=>j!==i))}>🗑️</button>
                </div>
              </div>
              {p.forms.map(f=><div key={f.lineId} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--bd)",fontSize:13}}>
                <span>{f.nm}</span><span style={{fontWeight:700}}>{fmt(f.cost)}</span></div>)}
              <div style={{marginTop:12,textAlign:"center",fontWeight:700,fontSize:15,color:p.rac===0?"#10B981":"#F59E0B"}}>{p.rac===0?"✅ 100% pris en charge":("⚠️ RAC: " + (fmt(p.rac)))}</div>
            </div>
          ))}
        </div>
      ):(
        <div style={{maxWidth:1300,margin:"0 auto",padding:24,display:"grid",gridTemplateColumns:"400px 1fr",gap:24,alignItems:"start"}}>
          {/* LEFT: Config */}
          <div>
            <div className="card" style={{marginBottom:16}}>
              <h3 style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,marginBottom:16}}>🏢 Informations client</h3>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div><label className="lbl">Établissement</label><input className="inp" value={etab} onChange={e=>setEtab(e.target.value)} placeholder="Nom de l'établissement"/></div>
                <div style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:8}}>
                  <div><label className="lbl">Civilité</label><select className="inp" value={civilite} onChange={e=>setCivilite(e.target.value)}><option value="">—</option><option value="M.">M.</option><option value="Mme">Mme</option></select></div>
                  <div><label className="lbl">Nom *</label><input className="inp" value={clientName} onChange={e=>setClientName(e.target.value)} placeholder="Dupont"/></div>
                  <div><label className="lbl">Email *</label><input className="inp" type="email" value={clientEmail} onChange={e=>setClientEmail(e.target.value)} placeholder="email@exemple.fr"/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><label className="lbl">Effectif</label><input className="inp" type="number" min="1" value={effectif} onChange={e=>setEffectif(e.target.value)} placeholder="8"/></div>
                  <div><label className="lbl">Tranche</label><select className="inp" value={tranche} onChange={e=>setTranche(e.target.value)}><option value="<11">Moins de 11</option><option value="11-49">11 à 49</option></select></div>
                </div>
                <div><label className="lbl">Salariés à former</label><input className="inp" type="number" min="1" value={nbSalaries} onChange={e=>setNbSalaries(parseInt(e.target.value)||1)}/></div>
                <div><label className="lbl">Jours max <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(optionnel)</span></label><input className="inp" type="number" min="1" value={maxJours} onChange={e=>setMaxJours(e.target.value)} placeholder="Pas de limite"/><p style={{fontSize:11,color:"var(--tm)",marginTop:4,fontStyle:"italic"}}>Laisser vide = maximiser le budget</p></div>

                {/* Budget utilisé */}
                <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"var(--sf)",borderRadius:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={hasUsedBudget} onChange={e=>setHasUsedBudget(e.target.checked)} style={{width:18,height:18,accentColor:"var(--p)"}}/>
                  <span style={{fontWeight:600,fontSize:13}}>Formation(s) déjà réalisée(s)</span>
                </label>
                {hasUsedBudget&&<div><label className="lbl">Montant OPCO déjà utilisé (€)</label><input className="inp" type="number" min="0" value={usedOpco} onChange={e=>setUsedOpco(parseInt(e.target.value)||0)}/></div>}

                {/* Dirigeant */}
                <label style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"var(--sf)",borderRadius:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={hasDirigeant} onChange={e=>setHasDirigeant(e.target.checked)} style={{width:18,height:18,accentColor:"var(--p)"}}/>
                  <span style={{fontWeight:600,fontSize:13}}>Dirigeant non salarié à former</span>
                </label>
                {hasDirigeant&&<>
                  <div><label className="lbl">Nombre de dirigeants</label><input className="inp" type="number" min="1" max="5" value={nbDirigeants} onChange={e=>setNbDirigeants(parseInt(e.target.value)||1)}/></div>
                  <div><label className="lbl">Budget dirigeant</label><select className="inp" value={dirBudget} onChange={e=>setDirBudget(e.target.value)}><option value="fafcea">FAFCEA</option><option value="agefice">AGEFICE</option></select>
                  {(()=>{const def=CFG[act]?.dirDefault;if(!def)return null;
                    if(dirBudget!==def){
                      if(dirBudget==='fafcea'&&(act==='hcr'||act==='restauration_rapide')) return <p style={{fontSize:11,color:"#F59E0B",marginTop:4}}>⚠️ FAFCEA est rare pour {CFG[act]?.label}.</p>;
                      if(dirBudget==='agefice'&&(act==='boucherie'||act==='boulangerie'||act==='patisserie')) return <p style={{fontSize:11,color:"var(--tm)",marginTop:4}}>ℹ️ Par défaut, les artisans sont rattachés à FAFCEA. AGEFICE possible si activité commerciale.</p>;
                    } else {
                      if(dirBudget==='fafcea') return <p style={{fontSize:11,color:"var(--tm)",marginTop:4}}>ℹ️ Activité artisanale → FAFCEA par défaut.</p>;
                      return <p style={{fontSize:11,color:"var(--tm)",marginTop:4}}>ℹ️ Activité commerciale → AGEFICE par défaut.</p>;
                    }
                    return null;
                  })()}</div>
                  {dirBudget==='agefice'&&<div>
                    <label className="lbl">Cotisation CFP annuelle</label>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {[{v:"high",l:("CA > 7 000€ → " + (fmt(3000)))},{v:"low",l:("CA < 7 000€ → " + (fmt(600)))}].map(o=>(
                        <label key={o.v} onClick={()=>setCfpLevel(o.v)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,cursor:"pointer",background:cfpLevel===o.v?"var(--ag)":"var(--sf)",border:cfpLevel===o.v?"1px solid var(--a)":"1px solid var(--bd)",fontSize:13,fontWeight:600}}>
                          <input type="radio" checked={cfpLevel===o.v} readOnly style={{accentColor:"var(--a)"}}/>{o.l}
                        </label>
                      ))}
                    </div>
                  </div>}
                  <div><label className="lbl">Montant dirigeant déjà utilisé (€)</label><input className="inp" type="number" min="0" value={usedDir} onChange={e=>setUsedDir(parseInt(e.target.value)||0)}/></div>
                </>}
              </div>
            </div>

            {/* BUDGET GAUGES */}
            <div className="card" style={{borderTop:"3px solid var(--p)"}}>
              <h3 style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,marginBottom:16,color:"var(--a)"}}>💰 Budgets disponibles</h3>
              <Gauge label={((CFG[act]?.opco) + (isHCR?' (forfait jour)':''))} total={budget.opco} used={opU}/>
              {budget.usedOpco>0&&<p style={{fontSize:11,color:"#F59E0B",fontWeight:600,marginTop:-8,marginBottom:8}}>⚠️ {fmt(budget.usedOpco)} déjà utilisé cette année</p>}
              {isHCR&&<div style={{padding:"8px 12px",background:"var(--ag)",borderRadius:8,marginBottom:12,fontSize:12,color:"var(--a)",fontWeight:600}}>💡 Forfait : 1 000€/jour — Max {tranche==='<11'?'2j (2 000€)':'3j (3 000€)'}</div>}
              {hasDirigeant&&budget.dLbl&&<><Gauge label={dirBudget==='fafcea'?'FAFCEA':'AGEFICE'} total={budget.dMax+budget.usedDir} used={dU+budget.usedDir}/><p style={{fontSize:11,color:"var(--tm)",marginBottom:8}}>{budget.dLbl}</p></>}
              {CFG[act]?.cst?.length>0&&<div style={{padding:"10px 14px",background:"var(--sf)",borderRadius:8,marginTop:8}}><p style={{fontSize:11,fontWeight:700,color:"var(--a)",marginBottom:4}}>⚠ CONTRAINTES</p>{CFG[act].cst.map((c,i)=><p key={i} style={{fontSize:12,color:"var(--t2)"}}>• {c}</p>)}</div>}
            </div>
          </div>

          {/* RIGHT: Formations */}
          <div>
            {/* Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              {[{v:sel.length,l:"Formations",c:"var(--a)",bg:"var(--ag)"},{v:tH+"h",l:"Heures",c:"#10B981",bg:"rgba(16,185,129,.1)"},{v:tD.toFixed(1)+"j",l:"Jours",c:"var(--a)",bg:"var(--ag)"},{v:fmt(tC),l:"Budget consommé",c:opU<=budget.opco?"#10B981":"#EF4444",bg:opU<=budget.opco?"rgba(16,185,129,.1)":"rgba(239,68,68,.1)"}].map((s,i)=>(
                <div key={i} style={{background:s.bg,borderRadius:14,padding:16,textAlign:"center"}}>
                  <div style={{fontSize:24,fontWeight:800,fontFamily:"var(--fd)",color:s.c}}>{s.v}</div>
                  <div style={{fontSize:10,fontWeight:700,color:"var(--tm)",textTransform:"uppercase",marginTop:4}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* ADD FORMATION */}
            <div className="card" style={{marginBottom:16}}>
              <h3 style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,marginBottom:12}}>➕ Ajouter une formation</h3>
              <select className="inp" value="" onChange={e=>{if(e.target.value) selectFormation(e.target.value);}}>
                <option value="">— Choisir une formation —</option>
                {groupedCatalog.map(g=><optgroup key={g.label} label={("━━ " + (g.label.toUpperCase()) + " ━━")}>{g.items.map(f=><option key={f.id} value={f.id}>{f.nm} ({f.hOpt?f.hOpt.join('/')+'h':(f.h||7)+'h'})</option>)}</optgroup>)}
              </select>

              {/* Preview */}
              {previewF&&<div style={{marginTop:12,padding:16,background:"var(--sf)",borderRadius:12,border:"1px solid var(--bd)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <span className="tag" style={{background:CAT_COLORS[previewF.cat]}}>{CAT_LABELS[previewF.cat]}</span>
                    <div style={{fontWeight:700,fontSize:15,marginTop:6}}>{previewF.nm}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:22,fontWeight:800,color:"var(--a)"}}>{fmt(pvCost)}</div>
                    <div style={{fontSize:11,color:"var(--tm)"}}>{isHCR?'Forfait 1 000€/jour':getRate(previewF,act)+'€/h'}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:12,marginTop:12,alignItems:"end",flexWrap:"wrap"}}>
                  {previewF.hOpt?
                    <div><label className="lbl">Durée</label><select className="inp" style={{width:120}} value={pvH} onChange={e=>setPvH(parseFloat(e.target.value))}>{previewF.hOpt.map(h=><option key={h} value={h}>{h}h ({getDays(h).toFixed(1)}j)</option>)}</select></div>:
                    <div><label className="lbl">Durée</label><span style={{fontWeight:600,fontSize:14}}>{previewF.h}h ({getDays(previewF.h).toFixed(1)}j)</span></div>}
                  {!isHCR&&<div><label className="lbl">Bénéficiaires</label><input className="inp" type="number" style={{width:70,textAlign:"center"}} min="1" value={pvB} onChange={e=>setPvB(parseInt(e.target.value)||1)}/></div>}
                  {previewF.hasOpt&&<label style={{display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={pvOpt} onChange={e=>setPvOpt(e.target.checked)} style={{accentColor:"var(--a)"}}/>{previewF.optNm}</label>}
                </div>
                <div style={{display:"flex",gap:8,marginTop:12}}>
                  <button className="btn btn-a" onClick={addFromPreview}>Ajouter</button>
                  <button className="btn btn-s btn-sm" onClick={()=>setPreviewF(null)}>Annuler</button>
                </div>
              </div>}
            </div>

            {/* ALERTS */}
            {sel.length>0&&isHCR&&tD>0&&tD<2&&<div style={{padding:"14px 18px",background:"rgba(245,158,11,.1)",border:"2px solid #F59E0B",borderRadius:12,marginBottom:12,display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:22}}>⚠️</span>
              <div><div style={{fontWeight:800,fontSize:14,color:"#F59E0B"}}>Intervention minimum : 2 jours</div>
              <div style={{fontSize:13,color:"#FCD34D"}}>Actuellement : {tD.toFixed(1)}j. Les formations 7h doivent être combinées pour atteindre 2 jours.</div></div>
            </div>}
            {sel.length>0&&opU>budget.opco&&<div style={{padding:"14px 18px",background:"rgba(239,68,68,.1)",border:"2px solid #EF4444",borderRadius:12,marginBottom:12,display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:22}}>🚨</span>
              <div><div style={{fontWeight:800,fontSize:14,color:"#F87171"}}>Dépassement budget {CFG[act]?.opco} : {fmt(opU-budget.opco)}</div>
              <div style={{fontSize:13,color:"#FCA5A5"}}>Budget couvre {fmt(budget.opco)}. Dépassement = reste à charge entreprise.</div></div>
            </div>}
            {sel.length>0&&maxJours&&tD>parseInt(maxJours)&&<div style={{padding:"14px 18px",background:"rgba(245,158,11,.1)",border:"2px solid #F59E0B",borderRadius:12,marginBottom:12,display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontSize:22}}>📅</span>
              <div><div style={{fontWeight:800,fontSize:14,color:"#F59E0B"}}>Limite client : {maxJours}j dépassée</div>
              <div style={{fontSize:13,color:"#FCD34D"}}>Sélection : {tD.toFixed(1)}j / limite : {maxJours}j.</div></div>
            </div>}

            {/* RECOMMENDATIONS */}
            {recommendations.map((rec,ri)=>{
              const bgMap={combos:"rgba(89,213,151,.05)",groups:"rgba(16,185,129,.05)",other:"rgba(245,158,11,.05)",maximize:"rgba(139,92,246,.08)",hint:"rgba(245,158,11,.08)"};
              const borderMap={combos:"var(--a)",groups:"#10B981",other:"#F59E0B",maximize:"#8B5CF6",hint:"#F59E0B"};
              return(
              <div key={ri} style={{padding:16,borderRadius:12,marginBottom:12,border:("1px solid " + (borderMap[rec.type]||"var(--bd)")),background:bgMap[rec.type]||"var(--c)"}}>
                <h4 style={{fontFamily:"var(--fd)",fontSize:14,fontWeight:700,marginBottom:8}}>{rec.title}</h4>
                {rec.text&&<p style={{fontSize:13,color:"var(--t2)",marginBottom:8}}>{rec.text}</p>}
                {rec.type==="combos"&&<div style={{fontSize:12,color:"var(--tm)",marginBottom:8}}>Budget restant : {fmt(opRem)}</div>}
                {rec.type==="combos"&&rec.items?.map((c,ci)=>(
                  <div key={ci} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"var(--sf)",borderRadius:8,marginBottom:6,opacity:(!c.fits&&!isHCR)?.4:1}}>
                    <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{c.label}</div>{c.note&&<div style={{fontSize:11,color:"var(--tm)"}}>{c.note}</div>}</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:"var(--a)"}}>{fmt(c.totalCost)}</span>
                      {c.missing.length>0&&(c.fits||isHCR)&&<button className="btn btn-a btn-sm" onClick={()=>addCombo(c.ids,c.hrs)}>+</button>}
                    </div>
                  </div>
                ))}
                {rec.type==="groups"&&rec.groups?.map((g,gi)=>(
                  <div key={gi}><div style={{fontSize:11,fontWeight:700,color:"var(--a)",textTransform:"uppercase",marginTop:8,marginBottom:4,borderBottom:"1px solid var(--bd)",paddingBottom:4}}>{g.title}</div>
                  {g.items?.map((it,ii)=>(
                    <div key={ii} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"var(--sf)",borderRadius:8,marginBottom:4,opacity:(!it.fits&&!isHCR)?.4:1}}>
                      <div style={{flex:1,fontSize:13}}><span className="tag" style={{background:CAT_COLORS[it.f.cat],marginRight:6}}>{CAT_LABELS[it.f.cat]}</span>{it.f.nm} ({it.h}h)</div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:12,fontWeight:700,color:"var(--a)"}}>{fmt(it.cost)}</span>
                        {(it.fits||isHCR)&&<button className="btn btn-a btn-sm" onClick={()=>quickAdd(it.f.id)}>+</button>}
                      </div>
                    </div>
                  ))}</div>
                ))}
                {rec.type==="other"&&rec.items?.map((it,ii)=>(
                  <div key={ii} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"var(--sf)",borderRadius:8,marginBottom:4}}>
                    <div style={{flex:1,fontSize:13}}><span className="tag" style={{background:CAT_COLORS[it.f.cat],marginRight:6}}>{CAT_LABELS[it.f.cat]}</span>{it.f.nm} ({it.h}h)</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:"var(--a)"}}>{fmt(it.cost)}</span>
                      <button className="btn btn-a btn-sm" onClick={()=>quickAdd(it.f.id)}>+</button>
                    </div>
                  </div>
                ))}
                {rec.type==="maximize"&&<>
                  {rec.subtitle&&<p style={{fontSize:12,color:"var(--tm)",marginBottom:8}}>{rec.subtitle}</p>}
                  {rec.items?.map((it,ii)=>(
                  <div key={ii} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 12px",background:"var(--sf)",borderRadius:8,marginBottom:4}}>
                    <div style={{flex:1,fontSize:13}}><span className="tag" style={{background:CAT_COLORS[it.f.cat],marginRight:6}}>{CAT_LABELS[it.f.cat]}</span>{it.f.nm} ({it.h}h)</div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:12,fontWeight:700,color:"var(--a)"}}>{fmt(it.cost)}</span>
                      <button className="btn btn-a btn-sm" onClick={()=>quickAdd(it.f.id)}>+</button>
                    </div>
                  </div>
                ))}</>}
              </div>
              );})}

            {/* SELECTED FORMATIONS */}
            {sel.length>0&&<div className="card" style={{marginBottom:16}}>
              <h3 style={{fontFamily:"var(--fd)",fontSize:16,fontWeight:700,marginBottom:12}}>✅ Formations sélectionnées</h3>
              {sel.map(s=>{
                const orig=(CATA[act]||[]).find(f=>f.id===s.id);
                const dirLabel=dirBudget==='fafcea'?'FAFCEA':'AGEFICE';
                let costLabel;
                if(s.fund==='dirigeant'){costLabel=dirBudget==='agefice'?((CFG.agefice.rate) + "€/h × " + (s.h) + "h × " + (s.b) + "dir."):((getFafceaRate(orig||s,act)) + "€/h × " + (s.h) + "h × " + (s.b) + "dir.");}
                else{costLabel=isHCR?((Math.ceil(s.h/7)) + "j × 1 000€"):((s.rate) + "€/h × " + (s.h) + "h × " + (s.b) + "pers");}
                return (
                  <div key={s.lineId} style={{padding:14,border:"1px solid var(--bd)",borderRadius:10,marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1}}>
                        <span className="tag" style={{background:CAT_COLORS[s.cat],fontSize:9}}>{CAT_LABELS[s.cat]}</span>
                        <div style={{fontWeight:700,fontSize:14,marginTop:4}}>{s.nm}</div>
                        <div style={{display:"flex",gap:10,alignItems:"center",marginTop:8,flexWrap:"wrap"}}>
                          {orig?.hOpt?<select className="inp" style={{width:100,padding:"4px 8px",fontSize:12}} value={s.h} onChange={e=>updF(s.lineId,'h',e.target.value)}>
                            {orig.hOpt.map(h=><option key={h} value={h}>{h}h ({getDays(h).toFixed(1)}j)</option>)}
                          </select>:<span style={{fontSize:13,fontWeight:600}}>{s.h}h</span>}
                          <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:11,color:"var(--tm)"}}>Bénéf.</span>
                            <input className="inp" type="number" min="1" max="30" value={s.b} onChange={e=>updF(s.lineId,'b',e.target.value)} style={{width:55,padding:"4px 6px",fontSize:12,textAlign:"center"}}/></div>
                          {hasDirigeant&&<select className="inp" style={{width:"auto",padding:"4px 8px",fontSize:12}} value={s.fund} onChange={e=>updF(s.lineId,'fund',e.target.value)}>
                            <option value="opco">{CFG[act]?.opco}</option>
                            {!(dirBudget==='fafcea'&&(act==='hcr'||act==='restauration_rapide'))&&<option value="dirigeant">{dirLabel}</option>}
                          </select>}
                        </div>
                      </div>
                      <div style={{textAlign:"right",display:"flex",alignItems:"center",gap:12}}>
                        <div>
                          <div style={{fontSize:18,fontWeight:800,color:"var(--a)"}}>{fmt(s.cost)}</div>
                          <div style={{fontSize:11,color:"var(--tm)"}}>{costLabel}</div>
                        </div>
                        <button onClick={()=>rmF(s.lineId)} style={{background:"none",border:"none",color:"#F87171",cursor:"pointer",fontSize:18,fontWeight:700}}>✕</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>}

            {/* PEC BANNER */}
            {sel.length>0&&(()=>{
              const finOpco=Math.min(opU,budget.opco),finDir=Math.min(dU,budget.dMax);
              const rac=Math.max(0,tC-finOpco-finDir);
              const sources=[]; if(finOpco>0) sources.push(CFG[act]?.opco); if(finDir>0) sources.push(dirBudget==='fafcea'?'FAFCEA':'AGEFICE');
              return rac===0?(
                <div style={{background:"rgba(16,185,129,.1)",border:"2px solid #10B981",borderRadius:14,padding:20,textAlign:"center",marginBottom:16}}>
                  <div style={{fontSize:16,fontWeight:800,color:"#10B981"}}>✅ PRISE EN CHARGE POTENTIELLE À 100%</div>
                  <div style={{fontSize:13,color:"#6EE7B7",marginTop:4}}>Total : {fmt(tC)} — Financé par : {sources.join(' + ')}</div>
                  <div style={{fontSize:20,fontWeight:800,color:"#10B981",marginTop:8}}>0 € DE RESTE À CHARGE ESTIMÉ</div>
                </div>
              ):(
                <div style={{background:"rgba(245,158,11,.1)",border:"2px solid #F59E0B",borderRadius:14,padding:20,textAlign:"center",marginBottom:16}}>
                  <div style={{fontSize:16,fontWeight:800,color:"#F59E0B"}}>⚠️ DÉPASSEMENT DE BUDGET</div>
                  <div style={{fontSize:13,color:"#FCD34D",marginTop:4}}>Total : {fmt(tC)} — Budget {CFG[act]?.opco} : {fmt(budget.opco)}</div>
                  <div style={{fontSize:20,fontWeight:800,color:"#EF4444",marginTop:8}}>Reste à charge : {fmt(rac)}</div>
                </div>
              );
            })()}

            {/* ACTION BUTTONS */}
            {sel.length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button className="btn btn-p" onClick={saveProposal}>💾 Enregistrer</button>
              <button className="btn btn-a" onClick={()=>setShowDevis(true)}>📄 Générer le devis</button>
              <button className="btn btn-s" onClick={exportExcel}>{"\u{1F4CA}"} Export Excel</button>
              <button className="btn btn-p btn-sm" onClick={function(){
                var lead={civilite:"",nom:clientName||"",prenom:"",raison_sociale:"",etablissement:etab||"",email:"",telephone:"",ville:"",adresse:"",siret:"",type_etablissement:act==="hcr"?"restaurant":act==="restauration_rapide"?"rapide":act==="boulangerie"?"boulangerie":act==="boucherie"?"boucherie":"restaurant",convention:CFG[act]?CFG[act].label:"",effectif:parseInt(effectif)||0,notes:"Simulation budget r\u00e9alis\u00e9e le "+new Date().toLocaleDateString("fr-FR")+". "+sel.length+" formation(s) s\u00e9lectionn\u00e9e(s). Total: "+tC+"\u20ac. Budget OPCO dispo: "+budget.opco+"\u20ac.",tags:["simulation"],statut:"nouveau",groupe:"",source:"simulateur",score:0,created_at:new Date().toISOString(),last_activity:new Date().toISOString().split("T")[0],id:"id_"+Date.now()+"_"+Math.random().toString(36).substr(2,6)};
                dbSaveLead(lead);var saved=localStorage.getItem("crm_pro_v2");var data=saved?JSON.parse(saved):{leads:[],tasks:[],comments:[],calls:[],groups:[]};data.leads=[lead].concat(data.leads||[]);cacheSaveCRM(data);
                showToast("\u{1F465} Prospect cr\u00e9\u00e9 dans le CRM !");
              }}>{"\u{1F465}"} Cr\u00e9er le prospect</button>
              <button className="btn btn-d btn-sm" onClick={()=>{setSel([]);setLineCounter(0);}}>🗑️ Réinitialiser</button>
            </div>}
          </div>
        </div>
      )}

      {/* DEVIS MODAL */}
      {showDevis&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setShowDevis(false)}>
        <div style={{background:"#fff",color:"#111",borderRadius:16,maxWidth:700,width:"100%",maxHeight:"90vh",overflow:"auto",padding:32}} onClick={e=>e.stopPropagation()}>
          <div style={{textAlign:"center",marginBottom:20}}>
            <h2 style={{fontSize:22,fontWeight:800,color:"#195144"}}>DEVIS INFORMATIF</h2>
            <p style={{fontSize:12,color:"#6b7280"}}>Lab Learning — Formation professionnelle continue</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16,fontSize:13}}>
            <div><strong>Établissement :</strong> {etab||"—"}<br/><strong>Client :</strong> {clientName||"—"}<br/><strong>Activité :</strong> {CFG[act]?.label}</div>
            <div style={{textAlign:"right"}}><strong>Date :</strong> {new Date().toLocaleDateString('fr-FR')}<br/><strong>IDCC :</strong> {CFG[act]?.idcc}<br/><strong>Effectif :</strong> {effectif||"—"}</div>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:16}}>
            <thead><tr style={{background:"#195144",color:"#fff"}}><th style={{padding:10,textAlign:"left"}}>Formation</th><th style={{padding:10}}>Durée</th><th style={{padding:10}}>Bénéf.</th><th style={{padding:10}}>Source</th><th style={{padding:10,textAlign:"right"}}>Montant</th></tr></thead>
            <tbody>{sel.map((s,i)=>{
              const src=s.fund==='dirigeant'?(dirBudget==='fafcea'?'FAFCEA':'AGEFICE'):CFG[act]?.opco;
              return <tr key={s.lineId} style={{background:i%2===0?"#fff":"#f9fafb"}}><td style={{padding:8}}>{s.nm}</td><td style={{padding:8,textAlign:"center"}}>{s.h}h</td><td style={{padding:8,textAlign:"center"}}>{s.b}</td><td style={{padding:8,textAlign:"center"}}><span style={{background:"#d1fae5",color:"#059669",padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700}}>{src}</span></td><td style={{padding:8,textAlign:"right",fontWeight:700}}>{fmt(s.cost)}</td></tr>;
            })}</tbody>
          </table>
          {(()=>{
            const finOpco=Math.min(opU,budget.opco),finDir=Math.min(dU,budget.dMax),rac=Math.max(0,tC-finOpco-finDir);
            return <div style={{background:"#f8faf9",borderRadius:12,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #e5e7eb",fontSize:15,fontWeight:800}}><span>TOTAL TTC</span><span>{fmt(tC)}</span></div>
              <div style={{fontSize:11,color:"#6b7280",padding:"4px 0 8px"}}>Formation professionnelle continue exonérée de TVA</div>
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13,marginTop:4}}><span>Financement {CFG[act]?.opco}</span><strong style={{color:"#059669"}}>{fmt(finOpco)}</strong></div>
              {hasDirigeant&&finDir>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13}}><span>Financement {dirBudget==='fafcea'?'FAFCEA':'AGEFICE'}</span><strong style={{color:"#059669"}}>{fmt(finDir)}</strong></div>}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontSize:15,fontWeight:800,color:rac===0?"#059669":"#dc2626",borderTop:"2px solid "+(rac===0?"#059669":"#dc2626"),marginTop:8}}><span>RESTE À CHARGE ESTIMÉ</span><span>{fmt(rac)}</span></div>
              {rac===0&&<div style={{background:"#d1fae5",border:"1.5px solid #059669",borderRadius:8,padding:"10px 16px",textAlign:"center",marginTop:12}}><span style={{fontSize:13,fontWeight:700,color:"#059669"}}>✅ Prise en charge potentielle à 100%</span></div>}
            </div>;
          })()}
          <div style={{padding:"10px 14px",background:"#fffbeb",border:"1.5px solid #f59e0b",borderRadius:8,marginTop:16,fontSize:12,color:"#92400e"}}>
            <strong>⚠️ En cas d'annulation, frais de 10% du montant pour gestion administrative.</strong>
          </div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:12}}>Ce devis est communiqué à titre informatif. Les documents officiels seront envoyés pour signature via Dendreo.</div>
          <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"center",flexWrap:"wrap",alignItems:"center"}}>
            <button className="btn btn-p" onClick={exportExcel}>📊 Export Excel</button>
            <button className="btn btn-a" onClick={async function(){
              var destEmail=prompt("Email du destinataire :");
              if(!destEmail||destEmail.indexOf("@")===-1)return;
              var cName=localStorage.getItem("ll_brevo_name")||"Lab Learning";
              var rows2=sel.map(function(s2){var src2=s2.fund==="dirigeant"?(dirBudget==="fafcea"?"FAFCEA":"AGEFICE"):CFG[act]&&CFG[act].opco?CFG[act].opco:"OPCO";return "<tr><td style='padding:8px 12px;border-bottom:1px solid #eee;font-size:13px'>"+s2.nm+"</td><td style='padding:8px 12px;text-align:center'>"+s2.h+"h</td><td style='padding:8px 12px;text-align:center'>"+s2.b+"</td><td style='padding:8px 12px;text-align:center'>"+src2+"</td><td style='padding:8px 12px;text-align:right;font-weight:700'>"+s2.cost+"€</td></tr>"}).join("");
              var finO2=Math.min(opU,budget.opco),rac2=Math.max(0,tC-finO2);
              var html2="<!DOCTYPE html><html><head><meta charset='UTF-8'></head><body style='margin:0;font-family:Arial,sans-serif;background:#f0f8f6'><table width='100%'><tr><td align='center' style='padding:20px'><table width='600' style='max-width:600px'><tr><td bgcolor='#195144' style='padding:28px;text-align:center;border-radius:16px 16px 0 0'><p style='margin:0;font-size:18px;font-weight:bold;color:#fff'>LAB LEARNING</p><p style='margin:6px 0 0;font-size:12px;color:#59d597'>DEVIS INFORMATIF</p></td></tr><tr><td bgcolor='#fff' style='padding:28px'><p style='font-size:14px;color:#4b5563'>Veuillez trouver le devis pour <strong>"+(etab||"votre établissement")+"</strong>.</p><table width='100%' style='border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:16px 0'><thead><tr style='background:#195144'><th style='padding:8px;color:#fff;text-align:left;font-size:11px'>Formation</th><th style='padding:8px;color:#fff;text-align:center;font-size:11px'>Durée</th><th style='padding:8px;color:#fff;text-align:center;font-size:11px'>Bénéf.</th><th style='padding:8px;color:#fff;text-align:center;font-size:11px'>Source</th><th style='padding:8px;color:#fff;text-align:right;font-size:11px'>Montant</th></tr></thead><tbody>"+rows2+"</tbody></table><div style='background:#f8faf9;border-radius:10px;padding:14px'><p style='font-size:15px;font-weight:800;margin:0'>TOTAL : "+tC+"€</p><p style='font-size:13px;color:#059669;margin:6px 0 0'>Financement OPCO : "+finO2+"€</p><p style='font-size:15px;font-weight:800;color:"+(rac2===0?"#059669":"#dc2626")+";margin:8px 0 0'>Reste à charge : "+rac2+"€</p></div><p style='font-size:13px;color:#4b5563;margin-top:16px'>Cordialement,<br><strong style='color:#195144'>"+cName+"</strong></p></td></tr><tr><td bgcolor='#1a1a1a' style='padding:16px;text-align:center;border-radius:0 0 16px 16px'><p style='font-size:11px;color:#777'>Lab Learning | www.lab-learning.fr</p></td></tr></table></td></tr></table></body></html>";
              try{await sendEmail({to:destEmail,toName:clientName||"",subject:"Devis informatif — "+(etab||"Formation"),html:html2});showToast("✅ Devis envoyé à "+destEmail);logActivityDB({module:"simulateur",action:"devis_sent",type:"email_sent",leadName:clientName||etab||"",details:"Devis "+tC+"€"});}catch(err){showToast("❌ "+err.message);}
            }}>✉️ Envoyer par email</button>
            <button className="btn btn-s" onClick={()=>setShowDevis(false)}>Fermer</button>
          </div>
        </div>
      </div>}

      {/* ADMIN PANEL */}
      {showAdmin&&<AdminPanel act={act} onClose={()=>setShowAdmin(false)} showToast={showToast}/>}

      {/* TOAST */}
      {toast&&<div style={{position:"fixed",bottom:24,right:24,padding:"14px 24px",borderRadius:12,fontSize:14,fontWeight:600,zIndex:300,boxShadow:"0 10px 40px rgba(0,0,0,.5)",animation:"fadeUp .3s ease",background:toast.type==="success"?"rgba(16,185,129,.15)":"rgba(239,68,68,.15)",color:toast.type==="success"?"#10B981":"#EF4444",border:("1px solid " + (toast.type==="success"?"#10B981":"#EF4444")),backdropFilter:"blur(10px)"}}>{toast.msg}</div>}
    </div>
  );
}

// ─── GAUGE COMPONENT ───
function Gauge({label,total,used}){
  const rem=Math.max(0,total-used);
  const pct=total>0?Math.min(100,(used/total)*100):0;
  const col=used>total?'#EF4444':pct>80?'#F59E0B':'var(--a)';
  return(
    <div className="gauge-wrap">
      <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{fontWeight:600}}>{label}</span><span style={{fontWeight:700}}>{fmt(total)}</span></div>
      <div className="gauge-bar"><div className="gauge-fill" style={{width:((pct) + "%"),background:col}}/></div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--tm)"}}><span>Consommé : {fmt(used)}</span><span>Restant : {fmt(rem)}</span></div>
    </div>
  );
}

// ─── ADMIN PANEL (complet, tous les taux modifiables) ───
function AdminPanel({act,onClose,showToast}){
  const [cur,setCur]=useState(act||'boucherie');
  const [,forceUpdate]=useState(0);
  const refresh=()=>forceUpdate(n=>n+1);
  const acts=[{k:'boucherie',e:'🥩'},{k:'boulangerie',e:'🥖'},{k:'patisserie',e:'🍰'},{k:'hcr',e:'🍽️'},{k:'restauration_rapide',e:'🍔'},{k:'agefice',e:'📘'},{k:'fafcea',e:'🔨'}];
  const c=CFG[cur];

  const SectionTitle=({children})=><h4 style={{fontSize:13,fontWeight:700,color:"var(--a)",textTransform:"uppercase",letterSpacing:".5px",marginTop:20,marginBottom:10,paddingBottom:6,borderBottom:"1px solid var(--bd)"}}>{children}</h4>;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div style={{background:"var(--c)",border:"1px solid var(--bd)",borderRadius:20,maxWidth:850,width:"100%",maxHeight:"85vh",overflow:"auto",padding:0}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"20px 28px",borderBottom:"1px solid var(--bd)",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:"var(--c)",zIndex:10,borderRadius:"20px 20px 0 0"}}>
          <h2 style={{fontFamily:"var(--fd)",fontSize:20,fontWeight:700}}>⚙️ Paramètres & Barèmes</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--tm)",cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        {/* Tabs */}
        <div style={{display:"flex",gap:4,padding:"12px 28px",borderBottom:"1px solid var(--bd)",overflowX:"auto",flexWrap:"nowrap"}}>
          {acts.map(a=>(
            <button key={a.k} onClick={()=>setCur(a.k)} style={{padding:"6px 14px",borderRadius:8,border:cur===a.k?"1px solid var(--a)":"1px solid var(--bd)",background:cur===a.k?"var(--ag)":"transparent",color:cur===a.k?"var(--a)":"var(--t2)",fontFamily:"var(--fb)",fontWeight:600,fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>{a.e} {CFG[a.k]?.label||a.k}</button>
          ))}
        </div>
        <div style={{padding:"20px 28px"}}>
          {/* ═══ AGEFICE ═══ */}
          {cur==='agefice'&&<div>
            <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>AGEFICE — Dirigeants commerçants</h3>
            <p style={{fontSize:12,color:"var(--tm)",marginBottom:16}}>Budget formation des dirigeants non salariés (activités commerciales)</p>
            <SectionTitle>Plafonds annuels</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label className="lbl">Plafond High (CFP &gt; 7€)</label><input className="inp" type="number" defaultValue={c.plafondHigh} onChange={e=>{CFG.agefice.plafondHigh=+e.target.value;refresh();}}/></div>
              <div><label className="lbl">Plafond Low (CFP &lt; 7€)</label><input className="inp" type="number" defaultValue={c.plafondLow} onChange={e=>{CFG.agefice.plafondLow=+e.target.value;refresh();}}/></div>
            </div>
            <SectionTitle>Taux horaire</SectionTitle>
            <div style={{maxWidth:200}}>
              <label className="lbl">Taux max (€/h)</label>
              <input className="inp" type="number" defaultValue={c.rate} onChange={e=>{CFG.agefice.rate=+e.target.value;refresh();}}/>
            </div>
            <div style={{marginTop:12,padding:"10px 14px",background:"var(--ag)",borderRadius:8,fontSize:12}}>
              <strong style={{color:"var(--a)"}}>Résumé :</strong><br/>
              <span style={{color:"var(--t2)"}}>CFP &gt; 7€ → {fmt(CFG.agefice.plafondHigh)} (≈{Math.floor(CFG.agefice.plafondHigh/CFG.agefice.rate)}h) | CFP &lt; 7€ → {fmt(CFG.agefice.plafondLow)} (≈{Math.floor(CFG.agefice.plafondLow/CFG.agefice.rate)}h)</span>
            </div>
          </div>}

          {/* ═══ FAFCEA ═══ */}
          {cur==='fafcea'&&<div>
            <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>FAFCEA — Artisans</h3>
            <p style={{fontSize:12,color:"var(--tm)",marginBottom:16}}>Budget formation des dirigeants artisans (boucherie, boulangerie, pâtisserie)</p>
            <SectionTitle>Limites annuelles</SectionTitle>
            <div style={{maxWidth:250}}>
              <label className="lbl">Heures max / an / dirigeant</label>
              <input className="inp" type="number" defaultValue={c.maxH} onChange={e=>{CFG.fafcea.maxH=+e.target.value;refresh();}}/>
            </div>
            <SectionTitle>Taux horaires</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label className="lbl">Taux technique / métier (€/h)</label><input className="inp" type="number" defaultValue={c.rTech} onChange={e=>{CFG.fafcea.rTech=+e.target.value;refresh();}}/><p style={{fontSize:11,color:"var(--tm)",marginTop:4}}>Appliqué aux formations Métier, Hygiène, Réglementaire</p></div>
              <div><label className="lbl">Taux transverse (€/h)</label><input className="inp" type="number" defaultValue={c.rTrans} onChange={e=>{CFG.fafcea.rTrans=+e.target.value;refresh();}}/><p style={{fontSize:11,color:"var(--tm)",marginTop:4}}>Appliqué aux formations Management, Gestion, Transverse</p></div>
            </div>
            <div style={{marginTop:12,padding:"10px 14px",background:"var(--ag)",borderRadius:8,fontSize:12}}>
              <strong style={{color:"var(--a)"}}>Résumé :</strong><br/>
              <span style={{color:"var(--t2)"}}>Budget max/dir = {CFG.fafcea.maxH}h × {CFG.fafcea.rTech}€ = {fmt(CFG.fafcea.maxH*CFG.fafcea.rTech)}</span>
            </div>
          </div>}

          {/* ═══ ACTIVITÉS ═══ */}
          {cur!=='agefice'&&cur!=='fafcea'&&<div>
            <h3 style={{fontSize:16,fontWeight:700,marginBottom:4}}>{c.label}</h3>
            <p style={{fontSize:12,color:"var(--tm)",marginBottom:16}}>{c.opco} — IDCC {c.idcc} — Budget dirigeant par défaut : {c.dirDefault==='fafcea'?'FAFCEA':'AGEFICE'}</p>

            {/* Plafonds */}
            <SectionTitle>Plafonds OPCO par tranche d'effectif</SectionTitle>
            {c.plafond&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
              {Object.keys(c.plafond).map(k=>(
                <div key={k}>
                  <label className="lbl">{k==='default'?'Plafond unique (toutes tranches)':k==='<11'?'Tranche < 11 salariés':'Tranche 11-49 salariés'}</label>
                  <input className="inp" type="number" defaultValue={c.plafond[k]} onChange={e=>{CFG[cur].plafond[k]=+e.target.value;refresh();}}/>
                </div>
              ))}
            </div>}

            {/* Taux spécifiques HCR */}
            {cur==='hcr'&&<>
              <SectionTitle>Tarification HCR (forfait journalier)</SectionTitle>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div><label className="lbl">Forfait par jour (€)</label><input className="inp" type="number" defaultValue={c.dayRate||1000} onChange={e=>{CFG.hcr.dayRate=+e.target.value;refresh();}}/></div>
                <div><label className="lbl">Taux horaire équivalent (€/h)</label>
                  <div style={{padding:"10px 14px",background:"var(--sf)",borderRadius:8,fontSize:14,fontWeight:600,color:"var(--t2)"}}>{((c.dayRate||1000)/7).toFixed(0)}€/h <span style={{fontSize:11,fontWeight:400}}>(forfait ÷ 7h)</span></div>
                </div>
              </div>
              <p style={{fontSize:11,color:"var(--tm)",marginTop:6}}>En HCR, le financement est au forfait jour (pas au taux horaire). Max {c.plafond?.["<11"]?Math.floor(c.plafond["<11"]/(c.dayRate||1000)):2}j pour &lt;11 sal., {c.plafond?.["11-49"]?Math.floor(c.plafond["11-49"]/(c.dayRate||1000)):3}j pour 11-49.</p>
            </>}

            {/* Taux spécifiques Restauration rapide */}
            {cur==='restauration_rapide'&&<>
              <SectionTitle>Tarification Restauration rapide (taux horaire)</SectionTitle>
              <div style={{maxWidth:250}}>
                <label className="lbl">Taux horaire par personne (€/h)</label>
                <input className="inp" type="number" defaultValue={c.rdef||35} onChange={e=>{CFG.restauration_rapide.rdef=+e.target.value;refresh();}}/>
              </div>
              <p style={{fontSize:11,color:"var(--tm)",marginTop:6}}>Appliqué à toutes les formations. Coût = taux × heures × nb bénéficiaires.</p>
            </>}

            {/* Barèmes par catégorie (boucherie, boulangerie, patisserie) */}
            {c.cats&&c.cats.length>0&&<>
              <SectionTitle>Barèmes par catégorie de financement</SectionTitle>
              <div style={{borderRadius:10,overflow:"hidden",border:"1px solid var(--bd)"}}>
                <div style={{display:"grid",gridTemplateColumns:"2.5fr 1fr 100px",padding:"8px 14px",background:"var(--sf)",fontSize:11,fontWeight:700,color:"var(--tm)"}}>
                  <span>CATÉGORIE</span><span>TYPE</span><span style={{textAlign:"center"}}>TAUX (€/h)</span>
                </div>
                {c.cats.map((cat,ci)=>(
                  <div key={ci} style={{display:"grid",gridTemplateColumns:"2.5fr 1fr 100px",padding:"8px 14px",borderTop:"1px solid var(--bd)",alignItems:"center",fontSize:13}}>
                    <span style={{color:"var(--t1)"}}>{cat.n}</span>
                    <span><span className="tag" style={{background:cat.t==='Métier'?"#195144":"#6b7280"}}>{cat.t}</span></span>
                    <input className="inp" type="number" style={{padding:"4px 8px",fontSize:12,textAlign:"center"}} defaultValue={cat.r} onChange={e=>{CFG[cur].cats[ci].r=+e.target.value;refresh();}}/>
                  </div>
                ))}
              </div>
              <p style={{fontSize:11,color:"var(--tm)",marginTop:6}}>Le taux horaire est multiplié par le nombre d'heures et le nombre de bénéficiaires. Coût = taux × heures × personnes.</p>
            </>}

            {/* Pour HCR et RR qui n'ont pas de cats, afficher un message explicatif */}
            {(!c.cats||c.cats.length===0)&&cur!=='hcr'&&cur!=='restauration_rapide'&&<>
              <SectionTitle>Taux horaire par défaut</SectionTitle>
              <p style={{fontSize:12,color:"var(--tm)"}}>Cette activité n'a pas de catégories de financement définies. Ajoutez-en si nécessaire.</p>
            </>}

            {/* Contraintes */}
            <SectionTitle>Contraintes de financement</SectionTitle>
            {c.cst&&c.cst.length>0?
              <div style={{padding:"10px 14px",background:"var(--sf)",borderRadius:8}}>
                {c.cst.map((x,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:i<c.cst.length-1?"1px solid var(--bd)":"none"}}>
                  <span style={{fontSize:12,color:"var(--t2)"}}>• {x}</span>
                </div>)}
              </div>:
              <p style={{fontSize:12,color:"var(--tm)",fontStyle:"italic"}}>Aucune contrainte définie pour cette activité.</p>
            }

            {/* Résumé */}
            <div style={{marginTop:16,padding:"14px 18px",background:"var(--ag)",borderRadius:10,fontSize:12}}>
              <strong style={{color:"var(--a)",fontSize:13}}>📊 Résumé pour {c.label}</strong>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
                <div style={{color:"var(--t2)"}}>OPCO : <strong style={{color:"var(--t1)"}}>{c.opco}</strong></div>
                <div style={{color:"var(--t2)"}}>IDCC : <strong style={{color:"var(--t1)"}}>{c.idcc}</strong></div>
                {c.plafond&&Object.entries(c.plafond).map(([k,v])=>
                  <div key={k} style={{color:"var(--t2)"}}>Plafond {k==='default'?'':k} : <strong style={{color:"var(--t1)"}}>{fmt(v)}</strong></div>
                )}
                {cur==='hcr'&&<div style={{color:"var(--t2)"}}>Forfait/jour : <strong style={{color:"var(--t1)"}}>{fmt(c.dayRate||1000)}</strong></div>}
                {cur==='restauration_rapide'&&<div style={{color:"var(--t2)"}}>Taux horaire : <strong style={{color:"var(--t1)"}}>{c.rdef||35}€/h</strong></div>}
                <div style={{color:"var(--t2)"}}>Budget dirigeant : <strong style={{color:"var(--t1)"}}>{c.dirDefault==='fafcea'?'FAFCEA':'AGEFICE'}</strong></div>
                <div style={{color:"var(--t2)"}}>Formations : <strong style={{color:"var(--t1)"}}>{(CATA[cur]||[]).length}</strong></div>
              </div>
            </div>
          </div>}

          <div style={{marginTop:24,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{fontSize:11,color:"var(--tm)"}}> Les modifications sont appliquées en temps réel à la session en cours.</p>
            <button className="btn btn-a" onClick={()=>{showToast("✅ Barèmes mis à jour");onClose();}}>Appliquer et fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

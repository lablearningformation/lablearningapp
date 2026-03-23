import React from 'react';
import { useState, useMemo } from "react";
import { TASK_TYPES, TIME_SLOTS, DAY_NAMES, MONTH_NAMES, today, fmtDate, fmtTime, isToday, isPast, getWeekDates, getMonthDates, padZero } from "../lib/crm-helpers.js";

export default function CRMAgenda(props) {
  var leads = props.leads, tasks = props.tasks, setPage = props.setPage, setSelectedId = props.setSelectedId, setDetailTab = props.setDetailTab;
  var setNewTask = props.setNewTask, setShowTask = props.setShowTask, newTask = props.newTask;
  var completeTask = props.completeTask, deleteTask = props.deleteTask;
  var setShowCompleteTask = props.setShowCompleteTask, setShowMoveTask = props.setShowMoveTask, setShowTaskPopup = props.setShowTaskPopup;

  var _av = useState("list"); var agendaView = _av[0], setAgendaView = _av[1];
  var _wd = useState(today()); var weekRef = _wd[0], setWeekRef = _wd[1];
  var _md = useState(new Date().getMonth()); var monthIdx = _md[0], setMonthIdx = _md[1];
  var _my = useState(new Date().getFullYear()); var yearIdx = _my[0], setYearIdx = _my[1];

  var allActive = useMemo(function() { return tasks.filter(function(t) { return !t.done; }).sort(function(a, b) { return (a.date || "").localeCompare(b.date || "") || (a.heure || "").localeCompare(b.heure || ""); }); }, [tasks]);
  var overdue = allActive.filter(function(t) { return isPast(t.date); });
  var todayTasks = allActive.filter(function(t) { return isToday(t.date); });
  var upcoming = allActive.filter(function(t) { return !isPast(t.date) && !isToday(t.date); });

  var weekDates = useMemo(function() { return getWeekDates(weekRef); }, [weekRef]);
  var monthDates = useMemo(function() { return getMonthDates(yearIdx, monthIdx); }, [yearIdx, monthIdx]);

  function shiftWeek(dir) {
    var d = new Date(weekRef);
    d.setDate(d.getDate() + dir * 7);
    setWeekRef(d.toISOString().split("T")[0]);
  }
  function goToday() { setWeekRef(today()); setMonthIdx(new Date().getMonth()); setYearIdx(new Date().getFullYear()); }
  function shiftMonth(dir) {
    var m = monthIdx + dir;
    if (m < 0) { setMonthIdx(11); setYearIdx(yearIdx - 1); }
    else if (m > 11) { setMonthIdx(0); setYearIdx(yearIdx + 1); }
    else setMonthIdx(m);
  }

  function openNewTask(date, heure) {
    setNewTask(Object.assign({}, newTask, { date: date || today(), heure: heure || "09:00", lead_id: newTask.lead_id || "" }));
    setShowTask(true);
  }

  function getTaskColor(t) {
    var tt = TASK_TYPES.find(function(x) { return x.id === t.type; });
    return tt ? tt.color : "#6B7280";
  }

  function getTaskIcon(t) {
    var tt = TASK_TYPES.find(function(x) { return x.id === t.type; });
    return tt ? tt.icon : "\u{1F4CB}";
  }

  function getLeadName(leadId) {
    var l = leads.find(function(x) { return x.id === leadId; });
    return l ? l.nom + (l.prenom ? " " + l.prenom : "") : "";
  }

  // ─── AGENDA TASK ROW (for list view) ───
  function renderAgendaTask(t) {
    var lead = leads.find(function(l) { return l.id === t.lead_id; });
    var tt = TASK_TYPES.find(function(x) { return x.id === t.type; });
    var od = isPast(t.date);
    return React.createElement("div", { key: t.id, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 10, padding: "12px 16px", marginBottom: 8, borderLeft: "4px solid " + (od ? "#EF4444" : (tt ? tt.color : "var(--a)")), display: "flex", justifyContent: "space-between", alignItems: "center" } },
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("div", { style: { fontSize: 13, fontWeight: 600 } }, (tt ? tt.icon + " " : "") + t.title),
        React.createElement("div", { style: { fontSize: 12, color: "var(--tm)", marginTop: 4 } },
          (lead ? React.createElement("span", { onClick: function() { setSelectedId(lead.id); setDetailTab("info"); setPage("dashboard"); }, style: { color: "var(--a)", cursor: "pointer", textDecoration: "underline" } }, lead.nom + (lead.prenom ? " " + lead.prenom : "")) : ""),
          " \u00b7 " + fmtDate(t.date) + " " + fmtTime(t.heure)
        ),
        t.notes ? React.createElement("div", { style: { fontSize: 11, color: "var(--t2)", marginTop: 4 } }, t.notes) : null
      ),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        React.createElement("button", { className: "crm-btn crm-btn-a crm-btn-sm", onClick: function() { setShowCompleteTask(t); } }, "\u2713"),
        React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setShowMoveTask(t); } }, "\u{1F4C5}"),
        React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { deleteTask(t.id); } }, "\u{1F5D1}")
      )
    );
  }

  // ─── TASK DASHBOARD (shown below all views) ───
  function renderTaskDashboard() {
    return React.createElement("div", { style: { display: "flex", gap: 12, marginTop: 20, marginBottom: 20 } },
      React.createElement("div", { style: { flex: 1, background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 12, padding: 16 } },
        React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#3B82F6", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".5px" } }, "\u{1F4CB} Aujourd'hui (" + todayTasks.length + ")"),
        todayTasks.length ? todayTasks.slice(0, 5).map(function(t) {
          return React.createElement("div", { key: t.id, style: { fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--bd)", display: "flex", justifyContent: "space-between" } },
            React.createElement("span", null, getTaskIcon(t) + " " + fmtTime(t.heure) + " " + t.title),
            React.createElement("span", { style: { color: "var(--tm)", fontSize: 11 } }, getLeadName(t.lead_id))
          );
        }) : React.createElement("div", { style: { fontSize: 12, color: "var(--tm)", fontStyle: "italic" } }, "Aucune t\u00e2che")
      ),
      React.createElement("div", { style: { flex: 1, background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 12, padding: 16 } },
        React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#EF4444", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".5px" } }, "\u{1F534} En retard (" + overdue.length + ")"),
        overdue.length ? overdue.slice(0, 5).map(function(t) {
          return React.createElement("div", { key: t.id, style: { fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--bd)", display: "flex", justifyContent: "space-between", color: "#F87171" } },
            React.createElement("span", null, getTaskIcon(t) + " " + t.title),
            React.createElement("span", { style: { fontSize: 11 } }, fmtDate(t.date))
          );
        }) : React.createElement("div", { style: { fontSize: 12, color: "var(--tm)", fontStyle: "italic" } }, "Aucun retard")
      ),
      React.createElement("div", { style: { width: 140, background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" } },
        React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 36, fontWeight: 800, color: "var(--a)" } }, allActive.length),
        React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginTop: 4 } }, "Total \u00e0 faire")
      )
    );
  }

  // ─── WEEK VIEW ───
  function renderWeekView() {
    var hours = TIME_SLOTS;
    return React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 } },
        React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { shiftWeek(-1); } }, "\u2190"),
        React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: goToday }, "Aujourd'hui"),
        React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { shiftWeek(1); } }, "\u2192"),
        React.createElement("span", { style: { fontSize: 14, fontWeight: 600, color: "var(--t1)" } }, "Semaine du " + fmtDate(weekDates[0]) + " au " + fmtDate(weekDates[6]))
      ),
      React.createElement("div", { style: { overflowX: "auto", overflowY: "auto", maxHeight: "60vh", border: "1px solid var(--bd)", borderRadius: 12, background: "var(--c)" } },
        React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", minWidth: 800 } },
          React.createElement("thead", null,
            React.createElement("tr", null,
              React.createElement("th", { style: { width: 60, padding: "10px 4px", fontSize: 10, color: "var(--tm)", borderBottom: "1px solid var(--bd)", position: "sticky", top: 0, background: "var(--c)", zIndex: 2 } }, "Heure"),
              weekDates.map(function(d, i) {
                var isTd = d === today();
                var dt = new Date(d);
                return React.createElement("th", { key: d, style: { padding: "10px 4px", fontSize: 12, fontWeight: 700, borderBottom: "1px solid var(--bd)", background: isTd ? "rgba(89,213,151,.08)" : "var(--c)", color: isTd ? "var(--a)" : "var(--t1)", position: "sticky", top: 0, zIndex: 2 } }, DAY_NAMES[i] + " " + dt.getDate() + "/" + padZero(dt.getMonth() + 1));
              })
            )
          ),
          React.createElement("tbody", null,
            hours.map(function(h) {
              return React.createElement("tr", { key: h },
                React.createElement("td", { style: { padding: "2px 6px", fontSize: 10, color: "var(--tm)", borderRight: "1px solid var(--bd)", fontFamily: "var(--fm)", verticalAlign: "top", width: 60 } }, h),
                weekDates.map(function(d) {
                  var isTd = d === today();
                  var cellTasks = allActive.filter(function(t) { return t.date === d && t.heure === h; });
                  return React.createElement("td", { key: d + h, className: "crm-week-cell", onClick: function() { if (!cellTasks.length) openNewTask(d, h); }, style: { background: isTd ? "rgba(89,213,151,.03)" : "transparent", verticalAlign: "top" } },
                    cellTasks.map(function(t) {
                      var col = getTaskColor(t);
                      return React.createElement("div", { key: t.id, onClick: function(e) { e.stopPropagation(); setShowTaskPopup(t); }, style: { background: col + "18", border: "1px solid " + col + "40", borderLeft: "3px solid " + col, borderRadius: 4, padding: "2px 4px", marginBottom: 2, fontSize: 10, fontWeight: 600, color: col, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, getTaskIcon(t) + " " + t.title);
                    })
                  );
                })
              );
            })
          )
        )
      )
    );
  }

  // ─── MONTH VIEW ───
  function renderMonthView() {
    return React.createElement("div", null,
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 } },
        React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { shiftMonth(-1); } }, "\u2190"),
        React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: goToday }, "Aujourd'hui"),
        React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { shiftMonth(1); } }, "\u2192"),
        React.createElement("span", { style: { fontSize: 16, fontWeight: 700, color: "var(--t1)" } }, MONTH_NAMES[monthIdx] + " " + yearIdx)
      ),
      React.createElement("div", { style: { border: "1px solid var(--bd)", borderRadius: 12, overflow: "hidden", background: "var(--c)" } },
        React.createElement("table", { style: { width: "100%", borderCollapse: "collapse" } },
          React.createElement("thead", null,
            React.createElement("tr", null, DAY_NAMES.map(function(d) {
              return React.createElement("th", { key: d, style: { padding: "10px 4px", fontSize: 11, fontWeight: 700, color: "var(--tm)", borderBottom: "1px solid var(--bd)", width: "14.28%" } }, d);
            }))
          ),
          React.createElement("tbody", null,
            [0, 1, 2, 3, 4, 5].map(function(row) {
              var rowDates = monthDates.slice(row * 7, row * 7 + 7);
              if (row === 5 && rowDates[0]) {
                var firstOfRow = new Date(rowDates[0]);
                if (firstOfRow.getMonth() !== monthIdx) return null;
              }
              return React.createElement("tr", { key: row },
                rowDates.map(function(d) {
                  var dt = new Date(d);
                  var isCurrentMonth = dt.getMonth() === monthIdx;
                  var isTd = d === today();
                  var dayTasks = allActive.filter(function(t) { return t.date === d; });
                  var maxShow = 3;
                  return React.createElement("td", { key: d, className: "crm-month-cell", onClick: function() { openNewTask(d, "09:00"); }, style: { background: isTd ? "rgba(89,213,151,.08)" : "transparent", opacity: isCurrentMonth ? 1 : 0.35 } },
                    React.createElement("div", { style: { fontSize: 12, fontWeight: isTd ? 800 : 500, color: isTd ? "var(--a)" : "var(--t1)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 } },
                      isTd ? React.createElement("span", { style: { width: 22, height: 22, borderRadius: "50%", background: "var(--a)", color: "#0B0F1A", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 } }, dt.getDate()) : dt.getDate()
                    ),
                    dayTasks.slice(0, maxShow).map(function(t) {
                      var col = getTaskColor(t);
                      return React.createElement("div", { key: t.id, onClick: function(e) { e.stopPropagation(); setShowTaskPopup(t); }, style: { background: col + "18", borderLeft: "2px solid " + col, borderRadius: 3, padding: "1px 4px", marginBottom: 2, fontSize: 9, fontWeight: 600, color: col, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, getTaskIcon(t) + " " + t.title);
                    }),
                    dayTasks.length > maxShow ? React.createElement("div", { style: { fontSize: 9, color: "var(--tm)", fontWeight: 600 } }, "+" + (dayTasks.length - maxShow) + " autres") : null
                  );
                })
              );
            })
          )
        )
      )
    );
  }

  // ─── LIST VIEW ───
  function renderListView() {
    return React.createElement("div", null,
      overdue.length > 0 ? React.createElement("div", { style: { marginBottom: 24 } },
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: "#EF4444", marginBottom: 10 } }, "\u{1F534} En retard (" + overdue.length + ")"),
        overdue.map(function(t) { return renderAgendaTask(t); })
      ) : null,
      todayTasks.length > 0 ? React.createElement("div", { style: { marginBottom: 24 } },
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: "#3B82F6", marginBottom: 10 } }, "\u{1F4CB} Aujourd'hui (" + todayTasks.length + ")"),
        todayTasks.map(function(t) { return renderAgendaTask(t); })
      ) : null,
      upcoming.length > 0 ? React.createElement("div", null,
        React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: "var(--a)", marginBottom: 10 } }, "\u{1F4C5} \u00c0 venir (" + upcoming.length + ")"),
        upcoming.map(function(t) { return renderAgendaTask(t); })
      ) : null,
      !allActive.length ? React.createElement("div", { style: { textAlign: "center", padding: 48, color: "var(--tm)" } }, "Aucune t\u00e2che planifi\u00e9e") : null
    );
  }

  // ─── MAIN RENDER ───
  return React.createElement("div", { style: { padding: "24px 28px" } },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16 } },
        React.createElement("button", { className: "crm-btn crm-btn-s crm-btn-sm", onClick: function() { setPage("dashboard"); } }, "\u2190 Leads"),
        React.createElement("h1", { style: { fontFamily: "var(--fd)", fontSize: 26, fontWeight: 800 } }, "\u{1F4C5} Agenda")
      ),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        ["list", "semaine", "mois"].map(function(v) {
          var labels = { list: "\u{1F4CB} Liste", semaine: "\u{1F4C5} Semaine", mois: "\u{1F5D3}\uFE0F Mois" };
          return React.createElement("button", { key: v, onClick: function() { setAgendaView(v); }, style: { padding: "6px 14px", borderRadius: 20, border: agendaView === v ? "1px solid var(--a)" : "1px solid var(--bd)", background: agendaView === v ? "var(--ag)" : "var(--c)", color: agendaView === v ? "var(--a)" : "var(--tm)", cursor: "pointer", fontFamily: "var(--fb)", fontSize: 12, fontWeight: 600 } }, labels[v]);
        }),
        React.createElement("button", { className: "crm-btn crm-btn-a crm-btn-sm", onClick: function() { openNewTask(today(), "09:00"); } }, "+ T\u00e2che")
      )
    ),
    React.createElement("div", { style: { display: "flex", gap: 12, marginBottom: 20 } },
      [{ l: "Aujourd'hui", v: todayTasks.length, c: "#3B82F6" }, { l: "En retard", v: overdue.length, c: "#EF4444" }, { l: "Total \u00e0 faire", v: allActive.length, c: "var(--a)" }].map(function(s, i) {
        return React.createElement("div", { key: i, style: { background: "var(--c)", border: "1px solid var(--bd)", borderRadius: 12, padding: "12px 18px", flex: 1 } },
          React.createElement("div", { style: { fontFamily: "var(--fm)", fontSize: 24, fontWeight: 700, color: s.c } }, s.v),
          React.createElement("div", { style: { fontSize: 11, color: "var(--tm)", marginTop: 2 } }, s.l)
        );
      })
    ),
    agendaView === "list" ? renderListView() : agendaView === "semaine" ? renderWeekView() : renderMonthView(),
    renderTaskDashboard()
  );
}

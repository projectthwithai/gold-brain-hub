// FORCE UPDATE: 2026-07-18-22:15
// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import LiquidTimerCard from "../components/LiquidTimerCard";
import RoutineRow from "../components/RoutineRow";
import RoutineStepPlayer from "../components/RoutineStepPlayer";
import PartnerPanel from "../components/PartnerPanel";
import {
  DEFAULT_MAX_WORK_MIN,
  DEFAULT_LONG_BREAK_MIN,
  DEFAULT_WORK_REST_RATIO,
} from "../lib/liquidTimer";
import {
  applyStepCompletion,
  completeAllSteps,
  deriveRoutineDone,
  resetSteps,
  syncAllRoutinesToDb,
  toggleStep,
} from "../lib/routineSteps";
import {
  acceptInviteCode,
  createInviteCode,
  fetchActivePartnership,
  fetchPartnerActivities,
  fetchPartnerSnapshot,
  fetchPendingInviteCode,
  getPartnerUserId,
  logPartnerActivity,
  subscribePartnerActivities,
  upsertPartnerSnapshot,
} from "../lib/partnerships";
import type { GoalItem, PartnerActivity, PartnerSnapshot, Partnership, RoutineItem, RoutineStep } from "../lib/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUPABASE LAYER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import {
  getSupabase,
  isSupabaseConfigured,
  onAuthStateChange,
  fetchAllData,
  upsertData,
  signInWithGoogle,
} from "../lib/supabase";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// THEME
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabase, isSupabaseConfigured, onAuthStateChange, fetchAllData, upsertData, signInWithGoogle } from "../lib/supabase";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CONSTANTS & THEMES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const THEMES: any = {
  dark: { bg:"#050505", bg2:"#0A0A0A", surface:"#0d0d0d", surfaceHover:"#131313", border:"#2a2a2a", borderGold:"#8A683066", text:"#F0EAD8", textDim:"#C8C0B0", textMuted:"#888", gold:"#C9A84C", goldLight:"#F0D878", goldDark:"#8A6830", inputBg:"#0f0f0f" },
  light: { bg:"#F5F0E8", bg2:"#FFFFFF", surface:"#FFFFFF", surfaceHover:"#F8F4ED", border:"#E0D8C8", borderGold:"#C9A84C55", text:"#1A1208", textDim:"#6B5A30", textMuted:"#B0A080", gold:"#B8922A", goldLight:"#D4A83A", goldDark:"#8A6820", inputBg:"#F8F4ED" },
};
const DICT: any = {
  ja: { tagline:"規律 · 集中 · 卓越", routine_title:"ルーティン", routine_sub:"計画的に遂行せよ", events_title:"カレンダー", add_routine:"＋ 追加", add_task:"＋ タスク追加", progress:"進捗", completed:"完了", settings:"設定", focus_mode:"集中", mob_routine:"日課", mob_partner:"相棒", mob_tasks:"タスク", mob_links:"リンク", mob_events:"予定" },
};
const DEF_TASKS = [{ id: "1", text: "17歳の野望を刻む", done: false, category: "Vision", memo: "ビリオネアへの第一歩" }];
const DEF_SCHEDULE = [{ id: "s1", time: "05:00", endTime: "09:00", task: "Deep Work", done: false, freq: "daily", options: ["数学", "英語", "ビジネス"] }];
const DEF_LINKS = [{ id: "l1", name: "Math Lab", url: "#", icon: "📐", color: "#C9A84C", cat: "Study" }];

const LS = {
  get: (k: string, fb: any) => { if (typeof window === "undefined") return fb; const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; },
  set: (k: string, v: any) => { if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v)); }
};

const isActiveToday = (item: any, dow: number) => true; // 簡易版

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SUB-COMPONENTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Panel({ children, TH, style = {} }: any) {
  return (
    <div style={{ background: TH.surface, border: `1px solid ${TH.borderGold}`, borderRadius: 4, overflow: "hidden", position: "relative", ...style }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${TH.gold}44,transparent)` }} />
      {children}
    </div>
  );
}

function PanelHeader({ title, sub, right, TH }: any) {
  return (
    <div style={{ padding: "12px 15px", borderBottom: `1px solid ${TH.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div><h2 style={{ fontSize: 12, letterSpacing: 4, color: TH.gold, textTransform: "uppercase" }}>{title}</h2>{sub && <p style={{ fontSize: 9, color: TH.textMuted }}>{sub}</p>}</div>
      {right}
    </div>
  );
}

function RoutineRow({ routine, onToggleDone, onEdit, TH }: any) {
  const handleToggle = () => { if (routine.done) routine.selectedOption = null; onToggleDone(); };
  return (
    <div className="row" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '12px 15px', borderBottom: `1px solid ${TH.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {(routine.done || !routine.options?.length) && (
          <div onClick={handleToggle} style={{ width: 22, height: 22, border: `1px solid ${routine.done ? TH.gold : TH.border}`, background: routine.done ? `${TH.gold}1a` : "transparent", borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{routine.done && "✓"}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: routine.done ? TH.textMuted : TH.text, textDecoration: routine.done ? 'line-through' : 'none' }}>
              {routine.task} {routine.selectedOption && <span style={{ color: TH.gold }}>( {routine.selectedOption} )</span>}
            </span>
          </div>
          <div style={{ fontSize: 10, color: TH.textMuted }}>{routine.time} {routine.endTime ? `〜 ${routine.endTime}` : ""}</div>
        </div>
        <button onClick={onEdit} style={{ background: 'none', border: 'none', color: TH.textMuted, cursor: 'pointer' }}>✏️</button>
      </div>
      {!routine.done && routine.options?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', paddingLeft: 34 }}>
          {routine.options.map((opt: string) => (
            <button key={opt} onClick={() => { routine.selectedOption = opt; onToggleDone(); }} style={{ background: 'transparent', border: `1px solid ${TH.goldDark}`, color: TH.gold, fontSize: 9, padding: '3px 8px', borderRadius: 10, cursor: 'pointer' }}>+ {opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventCalendar({ events, TH, tasks, sched, onAddEvent }: any) {
  const today = new Date();
  const [vy, vm] = [today.getFullYear(), today.getMonth()];
  const cells = []; 
  const fd = new Date(vy, vm, 1).getDay();
  for (let i = 0; i < fd; i++) cells.push(null); for (let d = 1; d <= 31; d++) cells.push(d);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
      {cells.map((d, i) => {
        if (!d) return <div key={i} />;
        const dstr = `${vy}-${String(vm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        return (
          <div key={i} style={{ minHeight: 45, border: `1px solid ${TH.border}`, padding: 4 }} onClick={() => onAddEvent(dstr)}>
            <div style={{ fontSize: 9, color: TH.textDim }}>{d}</div>
            {tasks?.filter((tk: any) => tk.deadline === dstr).map((tk: any) => <div key={tk.id} style={{ fontSize: 7, color: TH.textMuted }}>□</div>)}
            {sched?.filter((rc: any) => rc.done).map((rc: any) => <div key={rc.id} style={{ fontSize: 7, color: TH.gold }}>•</div>)}
          </div>
        );
      })}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. MAIN DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const user = session?.user ?? null;
  const isOnline = !!user && isSupabaseConfigured();

  const [lang] = useState("ja");
  const [themeName] = useState("dark");
  const [activeMode, setActiveMode] = useState(() => LS.get("apx7_mode", "monk"));
  const [tasks, setTasks] = useState<any[]>(() => LS.get("apx7_tasks", DEF_TASKS));
  const [sched, setSched] = useState<any[]>(() => LS.get("apx7_sched", DEF_SCHEDULE));
  const [links] = useState(DEF_LINKS);
  const [events] = useState([]);
  const [mobSec, setMob] = useState("schedule");
  const [isMobile, setMobile] = useState(false);
  const [modal, setModal] = useState<any>(null);

  const TH = THEMES[themeName] || THEMES.dark;
  const t = DICT[lang];

  useEffect(() => {
    onAuthStateChange((sess) => setSession(sess));
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn); fn();
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    (async () => {
      const data = await fetchAllData(user.id);
      if (data.tasks) setTasks(data.tasks);
      if (data.sched) setSched(data.sched);
    })();
  }, [isOnline, user?.id]);

  const cloudSave = useCallback(async (key: string, value: any) => {
    if (isOnline && user) await upsertData(user.id, key, value);
  }, [isOnline, user]);

  useEffect(() => { LS.set("apx7_tasks", tasks); cloudSave("tasks", tasks); }, [tasks, cloudSave]);
  useEffect(() => { LS.set("apx7_sched", sched); cloudSave("sched", sched); }, [sched, cloudSave]);

  const toggleTask = (id: string) => setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk));
  const toggleSched = (id: string) => setSched(prev => prev.map(rc => rc.id === id ? { ...rc, done: !rc.done } : rc));

  const currentDayStr = new Date().toISOString().split('T')[0];
  const displayTasks = tasks.filter(tk => !tk.done || (tk.updated_at || "").split('T')[0] === currentDayStr);

  return (
    <div style={{ minHeight: "100vh", background: TH.bg, color: TH.text, fontFamily: "serif", padding: isMobile ? "15px" : "30px" }}>
      <style>{`.row:hover{background:${TH.surfaceHover};}`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 28, letterSpacing: 6, color: TH.gold }}>APEX HUB</h1>
            <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
              {["weekday", "holiday", "monk"].map(m => (
                <button key={m} onClick={() => setActiveMode(m)} style={{ padding: '3px 8px', background: activeMode === m ? TH.gold : 'transparent', color: activeMode === m ? TH.bg : TH.textDim, border: `1px solid ${TH.goldDark}`, borderRadius: 4, fontSize: 8 }}>{m.toUpperCase()}</button>
              ))}
            </div>
          </div>
          {!user && <button onClick={signInWithGoogle} style={{ padding: "8px 15px", background: TH.gold, border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>LOGIN</button>}
        </div>

        {/* CONTENT */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {(!isMobile || mobSec === "schedule") && (
              <Panel TH={TH}>
                <PanelHeader title={t.routine_title} TH={TH} />
                {sched.map(rc => <RoutineRow key={rc.id} routine={rc} onToggleDone={() => toggleSched(rc.id)} onEdit={() => {}} TH={TH} t={t} />)}
              </Panel>
            )}
            {(!isMobile || mobSec === "tasks") && (
              <Panel TH={TH}>
                <PanelHeader title={t.mob_tasks} TH={TH} />
                {displayTasks.map(tk => (
                  <div key={tk.id} className="row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 15px", borderBottom: `1px solid ${TH.border}` }}>
                    <div onClick={() => toggleTask(tk.id)} style={{ width: 20, height: 20, border: `1px solid ${tk.done ? TH.gold : TH.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{tk.done && "✓"}</div>
                    <span style={{ flex: 1, fontSize: 13, textDecoration: tk.done ? "line-through" : "none", opacity: tk.done ? 0.5 : 1 }}>{tk.text}</span>
                    {tk.memo && <button style={{ fontSize: 8, color: TH.goldDark, background: "none", border: "none" }}>📄</button>}
                  </div>
                ))}
              </Panel>
            )}
          </div>
          {(!isMobile || mobSec === "events") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Panel TH={TH}><PanelHeader title={t.events_title} TH={TH} /><div style={{ padding: 15 }}><EventCalendar tasks={tasks} sched={sched} TH={TH} onAddEvent={() => {}} /></div></Panel>
            </div>
          )}
        </div>
      </div>

      {/* NAV */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: isMobile ? "flex" : "none", background: TH.bg2, borderTop: `1px solid ${TH.border}`, justifyContent: "space-around", padding: 10, zIndex: 1000 }}>
        {["schedule", "tasks", "events"].map(k => <button key={k} onClick={() => setMob(k)} style={{ background: "none", border: "none", color: mobSec === k ? TH.gold : "#555", fontSize: 10 }}>{k.toUpperCase()}</button>)}
      </nav>
    </div>
  );
}
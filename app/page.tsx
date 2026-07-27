// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabase, isSupabaseConfigured, onAuthStateChange, fetchAllData, upsertData, signInWithGoogle } from "../lib/supabase";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CONSTANTS & HELPER (LSの定義を最上部へ)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const THEMES: any = {
  dark: { bg:"#050505", bg2:"#0A0A0A", surface:"#0d0d0d", surfaceHover:"#131313", border:"#2a2a2a", borderGold:"#8A683066", text:"#F0EAD8", textDim:"#C8C0B0", textMuted:"#888", gold:"#C9A84C", goldLight:"#F0D878", goldDark:"#8A6830", inputBg:"#0f0f0f" },
};

const DICT: any = {
  ja: { tagline:"規律 · 集中 · 卓越", routine_title:"ルーティン", events_title:"カレンダー", progress:"進捗", completed:"完了", settings:"設定", mob_routine:"日課", mob_partner:"相棒", mob_tasks:"タスク", mob_links:"リンク", mob_events:"予定", url_hub:"帝国の門" },
};

const LS = {
  get: (k: string, fb: any) => {
    if (typeof window === "undefined") return fb;
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fb;
    } catch { return fb; }
  },
  set: (k: string, v: any) => {
    if (typeof window !== "undefined") {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
    }
  }
};

const DEF_TASKS = [{ id: "1", text: "17歳の野望を開始せよ", done: false, category: "Vision", memo: "クリックして編集" }];
const DEF_SCHEDULE = [{ id: "s1", time: "05:00", endTime: "09:00", task: "Deep Work", done: false, freq: "daily", options: ["数学", "英語", "ビジネス"] }];
const DEF_LINKS = [{ id: "l1", name: "Math Lab", url: "#", icon: "📐", color: "#C9A84C", cat: "Lab" }];

const isActiveToday = (item: any, dow: number) => true;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SUB-COMPONENTS (Dashboardの外に配置：初期化エラーを防止)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Panel = ({ children, TH, style = {} }: any) => (
  <div style={{ background: TH.surface, border: `1px solid ${TH.borderGold}`, borderRadius: 4, overflow: "hidden", position: "relative", ...style }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${TH.gold}44,transparent)` }} />
    {children}
  </div>
);

const PanelHeader = ({ title, sub, right, TH }: any) => (
  <div style={{ padding: "12px 15px", borderBottom: `1px solid ${TH.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div><h2 style={{ fontSize: 12, letterSpacing: 4, color: TH.gold, textTransform: "uppercase" }}>{title}</h2>{sub && <p style={{ fontSize: 9, color: TH.textMuted }}>{sub}</p>}</div>
    {right}
  </div>
);

const AddRow = ({ onClick, label }: any) => (
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px", background: "transparent", border: `1px dashed #333`, color: "#888", cursor: "pointer", fontSize: 11, letterSpacing: 4, textTransform: "uppercase", fontFamily: "inherit" }}>{label}</button>
);

const RoutineRow = ({ routine, onToggleDone, onEdit, TH }: any) => {
  const handleToggle = () => { if (routine.done) routine.selectedOption = null; onToggleDone(); };
  return (
    <div className="row" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '14px 18px', borderBottom: `1px solid ${TH.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {(routine.done || !routine.options?.length) && (
          <div onClick={handleToggle} style={{ width: 22, height: 22, border: `1px solid ${routine.done ? TH.gold : TH.border}`, background: routine.done ? `${TH.gold}1a` : "transparent", borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{routine.done && "✓"}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{routine.icon || "📌"}</span>
            <span style={{ fontSize: 13, color: routine.done ? TH.textMuted : TH.text, textDecoration: routine.done ? 'line-through' : 'none', opacity: routine.done ? 0.6 : 1 }}>
              {routine.task} {routine.selectedOption && <span style={{ color: TH.gold }}>( {routine.selectedOption} )</span>}
            </span>
          </div>
          <div style={{ fontSize: 10, color: TH.textMuted }}>{routine.time} {routine.endTime ? `〜 ${routine.endTime}` : ""}</div>
        </div>
        <button onClick={onEdit} style={{background:"none", border:"none", cursor:"pointer"}}>✏️</button>
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
};

const EventCalendar = ({ TH, tasks, sched, onAddEvent }: any) => {
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
        const isToday = today.getDate() === d;
        return (
          <div key={i} style={{ minHeight: 45, border: `1px solid ${isToday ? TH.gold : TH.border}`, padding: 4 }} onClick={() => onAddEvent(dstr)}>
            <div style={{ fontSize: 9, color: isToday ? TH.gold : TH.textDim }}>{d}</div>
            <div style={{ display: 'flex', gap: 1, marginTop: 2 }}>
              {tasks?.filter((tk: any) => tk.deadline === dstr).map((tk: any) => <div key={tk.id} style={{ width: 4, height: 4, background: TH.textMuted }}></div>)}
              {sched?.filter((rc: any) => rc.done).length > 0 && isToday && <div style={{ width: 4, height: 4, background: TH.gold }}></div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. MAIN DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const user = session?.user ?? null;
  const isOnline = !!user && isSupabaseConfigured();

  const [time, setTime] = useState(new Date());
  const todayDow = time.getDay();
  const currentDayStr = new Date().toISOString().split('T')[0];

  const [activeMode, setActiveMode] = useState(() => LS.get("apx7_mode", "monk"));
  const [tasks, setTasks] = useState<any[]>(() => LS.get("apx7_tasks", DEF_TASKS));
  const [sched, setSched] = useState<any[]>(() => LS.get("apx7_sched", DEF_SCHEDULE));
  const [links] = useState(DEF_LINKS);
  const [activeTab, setTab] = useState("today");
  const [mobSec, setMob] = useState("schedule");
  const [isMobile, setMobile] = useState(false);
  const [settingsOpen, setSettings] = useState(false);
  const [modal, setModal] = useState<any>(null);

  const TH = THEMES.dark;
  const t = DICT.ja;

  useEffect(() => {
    onAuthStateChange((sess) => setSession(sess));
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn); fn();
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    const ti = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(ti);
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
  useEffect(() => { LS.set("apx7_mode", activeMode); }, [activeMode]);

  const toggleTask = (id: string) => setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, done: !tk.done, updated_at: new Date().toISOString() } : tk));
  const saveTask = (item: any, d: any) => { 
    if (!item) setTasks(prev => [...prev, { id: String(Date.now()), done: false, ...d }]);
    else setTasks(prev => prev.map(tk => tk.id === item.id ? { ...tk, ...d } : tk)); 
  };
  const toggleSched = (id: string) => setSched(prev => prev.map(rc => rc.id === id ? { ...rc, done: !rc.done } : rc));

  const displayTasks = tasks.filter(tk => !tk.done || (tk.updated_at || "").split('T')[0] === currentDayStr);

  const css = `
    .stat-card { background: ${TH.surface}; border: 1px solid ${TH.borderGold}; padding: 16px; border-radius: 4px; position: relative; }
    .tab-btn { flex: 1; padding: 12px; background: none; border: none; color: #555; cursor: pointer; font-size: 10px; border-bottom: 2px solid transparent; }
    .tab-btn.active { color: ${TH.gold}; border-bottom-color: ${TH.gold}; }
    .row:hover { background: ${TH.surfaceHover}; }
  `;

  return (
    <div style={{ minHeight: "100vh", background: TH.bg, color: TH.text, fontFamily: "serif" }}>
      <style>{css}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px" : "40px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 28, letterSpacing: 8, color: TH.gold }}>APEX HUB</h1>
            <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
              {["weekday", "holiday", "monk"].map(m => (
                <button key={m} onClick={() => setActiveMode(m)} style={{ padding: '3px 8px', background: activeMode === m ? TH.gold : 'transparent', color: activeMode === m ? TH.bg : TH.textDim, border: `1px solid ${TH.goldDark}`, borderRadius: 4, fontSize: 8 }}>{m.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:20, color:TH.goldLight, fontFamily:"monospace"}}>{time.toLocaleTimeString()}</div>
            <button onClick={() => setSettings(true)} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, padding: "5px 10px", marginTop: 10, cursor:"pointer", fontSize:10 }}>SETTINGS</button>
          </div>
        </div>

        {/* MAIN AREA */}
        <div style={{ marginTop: 10 }}>
          {!isMobile ? (
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 25 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>
                {activeTab === "today" && (
                  <Panel TH={TH}>
                    <PanelHeader title="ROUTINES" TH={TH} />
                    {sched.filter(rc => !rc.mode || rc.mode === "all" || rc.mode === activeMode).map(rc => (
                      <RoutineRow key={rc.id} routine={rc} onToggleDone={() => toggleSched(rc.id)} onEdit={() => setModal({type:"sched", item:rc})} TH={TH} />
                    ))}
                    <AddRow onClick={() => setModal({ type: "sched", item: null })} label="+ Add Routine" TH={TH} />
                  </Panel>
                )}
                {activeTab === "partner" && <Panel TH={TH}><PanelHeader title="PARTNER" TH={TH} /><div style={{padding:20}}>同期中...</div></Panel>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>
                <Panel TH={TH}>
                  <PanelHeader title="TASKS" TH={TH} />
                  {displayTasks.map(tk => (
                    <div key={tk.id} className="row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 15px", borderBottom: `1px solid ${TH.border}` }}>
                      <div onClick={() => toggleTask(tk.id)} style={{ width: 20, height: 20, border: `1px solid ${tk.done ? TH.gold : TH.border}`, background: tk.done ? `${TH.gold}1a` : "transparent", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{tk.done && "✓"}</div>
                      <span style={{ flex: 1, fontSize: 13, textDecoration: tk.done ? "line-through" : "none", opacity: tk.done ? 0.6 : 1 }} onClick={()=>setModal({type:"task", item:tk})}>{tk.text}</span>
                      {tk.memo && <span style={{ fontSize: 9, color: TH.goldDark }}>📄</span>}
                    </div>
                  ))}
                  <AddRow onClick={() => setModal({ type: "task", item: null })} label="+ Add Task" TH={TH} />
                </Panel>
                <Panel TH={TH}><PanelHeader title="CALENDAR" TH={TH} /><div style={{ padding: 15 }}><EventCalendar tasks={tasks} sched={sched} TH={TH} onAddEvent={() => {}} /></div></Panel>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 80 }}>
              {mobSec === "schedule" && <Panel TH={TH}><PanelHeader title="ROUTINES" TH={TH} />{sched.filter(rc => !rc.mode || rc.mode === "all" || rc.mode === activeMode).map(rc => <RoutineRow key={rc.id} routine={rc} onToggleDone={() => toggleSched(rc.id)} onEdit={() => setModal({type:"sched", item:rc})} TH={TH} />)}</Panel>}
              {mobSec === "tasks" && <Panel TH={TH}><PanelHeader title="TASKS" TH={TH} />{displayTasks.map(tk => <div key={tk.id} className="row"><span>{tk.text}</span></div>)}</Panel>}
              {mobSec === "partner" && <Panel TH={TH}><PanelHeader title="PARTNER" TH={TH} /><div style={{padding:20}}>同期中...</div></Panel>}
            </div>
          )}
        </div>
      </div>

      {/* MODALS (Simplified for Build) */}
      {settingsOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 1500, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "300px", background: "#111", padding: 20 }}>
            <button onClick={() => setSettings(false)}>CLOSE</button>
            <button onClick={() => signInWithGoogle()}>LOGIN</button>
          </div>
        </div>
      )}
      
      {modal?.type === "task" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#111", padding: 20, borderRadius: 8, width: "300px" }}>
            <input value={modal.item.text} onChange={e => saveTask(modal.item, { text: e.target.value })} style={{width:"100%", marginBottom:10}} />
            <button onClick={() => setModal(null)}>SAVE</button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <nav className="mob-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: isMobile ? "flex" : "none", background: TH.bg2, borderTop: `1px solid ${TH.border}`, justifyContent: "space-around", padding: 10, zIndex: 1000 }}>
        {["schedule", "partner", "tasks", "links"].map(k => (
          <button key={k} onClick={() => isMobile ? setMob(k) : setTab(k)} style={{ background: "none", border: "none", color: (isMobile ? mobSec : activeTab) === k ? TH.gold : "#555", fontSize: 9 }}>{k.toUpperCase()}</button>
        ))}
      </nav>
    </div>
  );
}
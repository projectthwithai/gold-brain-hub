// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabase, isSupabaseConfigured, onAuthStateChange, fetchAllData, upsertData, signInWithGoogle } from "../lib/supabase";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CONSTANTS & HELPER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const THEMES: any = {
  dark: { bg:"#050505", bg2:"#0A0A0A", surface:"#0d0d0d", surfaceHover:"#131313", border:"#2a2a2a", borderGold:"#8A683066", text:"#F0EAD8", textDim:"#C8C0B0", textMuted:"#888", gold:"#C9A84C", goldLight:"#F0D878", goldDark:"#8A6830", inputBg:"#0f0f0f" },
};
const DICT: any = {
  ja: { tagline:"規律 · 集中 · 卓越", routine_title:"ルーティン", events_title:"カレンダー", progress:"進捗", completed:"完了", settings:"設定", mob_routine:"日課", mob_partner:"相棒", mob_tasks:"タスク", mob_links:"リンク", mob_events:"記録" },
};
const LS = {
  get: (k: string, fb: any) => { if (typeof window === "undefined") return fb; try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k: string, v: any) => { if (typeof window !== "undefined") { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } }
};
const DEF_TASKS = [{ id: "1", text: "17歳の野望を開始せよ", done: false, category: "Vision", memo: "クリックして編集" }];
const DEF_SCHEDULE = [{ id: "s1", time: "05:00", endTime: "09:00", task: "Deep Work", done: false, freq: "daily", options: ["数学", "英語", "ビジネス"] }];
const DEF_LINKS = [{ id: "l1", name: "Math Lab", url: "#", icon: "📐", color: "#C9A84C", cat: "Lab" }];

const isActiveToday = (item: any, dow: number) => true;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SUB-COMPONENTS (外部定義：エラー防止)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Panel = ({ children, TH, style = {} }: any) => (
  <div style={{ background: TH.surface, border: `1px solid ${TH.borderGold}`, borderRadius: 4, overflow: "hidden", position: "relative", ...style }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${TH.gold}44,transparent)` }} />
    {children}
  </div>
);

const PanelHeader = ({ title, sub, right, TH }: any) => (
  <div style={{ padding: "12px 15px", borderBottom: `1px solid ${TH.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div><h2 style={{ fontSize: 11, letterSpacing: 3, color: TH.gold, textTransform: "uppercase" }}>{title}</h2>{sub && <p style={{ fontSize: 8, color: TH.textMuted }}>{sub}</p>}</div>
    {right}
  </div>
);

const AddRow = ({ onClick, label }: any) => (
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px", background: "transparent", border: `1px dashed #333`, color: "#888", cursor: "pointer", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>{label}</button>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SUB-COMPONENTS (Dashboardの外に配置：エラー防止)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SUB-COMPONENTS (外部定義：エラー防止の要)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Panel = ({ children, TH, style = {} }: any) => (
  <div style={{ background: TH.surface, border: `1px solid ${TH.borderGold}`, borderRadius: 4, overflow: "hidden", position: "relative", ...style }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${TH.gold}44,transparent)` }} />
    {children}
  </div>
);

const PanelHeader = ({ title, sub, right, TH }: any) => (
  <div style={{ padding: "12px 15px", borderBottom: `1px solid ${TH.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    <div><h2 style={{ fontSize: 11, letterSpacing: 3, color: TH.gold, textTransform: "uppercase" }}>{title}</h2>{sub && <p style={{ fontSize: 8, color: TH.textMuted }}>{sub}</p>}</div>
    {right}
  </div>
);

const AddRow = ({ onClick, label }: any) => (
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", padding: "10px", background: "transparent", border: `1px dashed #333`, color: "#888", cursor: "pointer", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>{label}</button>
);

const RoutineRow = ({ routine, onToggleDone, onEdit, TH }: any) => {
  const handleToggle = () => { if (routine.done) routine.selectedOption = null; onToggleDone(); };
  
  // サイクル表示ロジック
  const displayTaskName = (routine.cycle && routine.cycle.length > 0)
    ? routine.cycle[routine.currentCycleIndex || 0]
    : routine.task;

  return (
    <div className="row" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '12px 15px', borderBottom: `1px solid ${TH.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {(routine.done || !routine.options?.length) && (
          <div onClick={handleToggle} style={{ width: 20, height: 20, border: `1px solid ${routine.done ? TH.gold : TH.border}`, background: routine.done ? `${TH.gold}1a` : "transparent", borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {routine.done && "✓"}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{routine.icon || "📌"}</span>
            <span style={{ fontSize: 13, color: routine.done ? TH.textMuted : TH.text, textDecoration: routine.done ? 'line-through' : 'none', opacity: routine.done ? 0.6 : 1 }}>
              {displayTaskName}
              {routine.cycle?.length > 0 && <span style={{fontSize:8, color:TH.goldDark, border:`1px solid ${TH.goldDark}`, padding:'0 3px', marginLeft:8}}>CYCLE</span>}
            </span>
          </div>
          <div style={{ fontSize: 10, color: TH.textMuted }}>
            {routine.time}{routine.endTime ? ` 〜 ${routine.endTime}` : ""}
          </div>
        </div>
        
        {!routine.done && routine.cycle?.length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); onToggleDone(); onToggleDone(); }} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, fontSize: 8, padding: "2px 6px", borderRadius: 2, cursor: "pointer", marginRight: 10 }}>NEXT ⏭️</button>
        )}
        <button onClick={onEdit} className="edit-btn">✏️</button>
      </div>
      {!routine.done && routine.options?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', paddingLeft: 32 }}>
          {routine.options.map((opt: string) => (
            <button key={opt} onClick={() => { routine.selectedOption = opt; onToggleDone(); }} style={{ background: 'transparent', border: `1px solid ${TH.goldDark}`, color: TH.gold, fontSize: 8, padding: '2px 8px', borderRadius: 10, cursor: 'pointer' }}>+ {opt}</button>
          ))}
        </div>
      )}
    </div>
  );
};

// 【重要】今回足りなかったカレンダーの定義
const EventCalendar = ({ TH, tasks, sched, vy, vm, setVY, setVM, onAddEvent }: any) => {
  const today = new Date();
  const cells = []; 
  const fd = new Date(vy, vm, 1).getDay();
  const dim = new Date(vy, vm + 1, 0).getDate();
  for (let i = 0; i < fd; i++) cells.push(null); for (let d = 1; d <= dim; d++) cells.push(d);
  const prev = () => { if (vm === 0) { setVY(vy - 1); setVM(11); } else setVM(vm - 1); };
  const next = () => { if (vm === 11) { setVY(vy + 1); setVM(0); } else setVM(vm + 1); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={prev} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, cursor:"pointer" }}>‹</button>
        <span style={{ fontSize: 11, color: TH.gold }}>{vy} / {vm + 1}</span>
        <button onClick={next} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, cursor:"pointer" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dstr = `${vy}-${String(vm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isToday = today.getFullYear()===vy && today.getMonth()===vm && today.getDate()===d;
          return (
            <div key={dstr} style={{ minHeight: 45, border: `1px solid ${isToday ? TH.gold : TH.border}`, padding: 4, background: isToday ? `${TH.gold}05` : "none" }}>
              <div style={{ fontSize: 9, color: isToday ? TH.gold : TH.textDim }}>{d}</div>
              <div style={{ display: 'flex', gap: 1, marginTop: 2, flexWrap: 'wrap' }}>
                {tasks?.filter((tk: any) => tk.deadline === dstr).map((tk: any) => <div key={tk.id} style={{ width: 4, height: 4, background: TH.textMuted, borderRadius: '50%' }}></div>)}
                {sched?.filter((rc: any) => rc.done && isToday).map((rc: any) => <div key={rc.id} style={{ width: 4, height: 4, background: TH.gold, borderRadius: '50%' }}></div>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default function Dashboard() {
  const [shouldRecord, setShouldRecord] = useState(true);
  const [session, setSession] = useState<any>(null);
  const user = session?.user ?? null;
  const isOnline = !!user && isSupabaseConfigured();

  const [time, setTime] = useState(new Date());
  const todayDow = time.getDay();
  const currentDayStr = new Date().toISOString().split('T')[0];

  const [activeMode, setActiveMode] = useState(() => LS.get("apx7_mode", "monk"));
  const [tasks, setTasks] = useState<any[]>(() => LS.get("apx7_tasks", DEF_TASKS));
  const [sched, setSched] = useState<any[]>(() => LS.get("apx7_sched", DEF_SCHEDULE));
  const [links, setLinks] = useState<any[]>(() => LS.get("apx7_links", DEF_LINKS));
  const [streakPct] = useState(80);

  const [activeTab, setTab] = useState("today");
  const [mobSec, setMob] = useState("schedule");
  const [isMobile, setMobile] = useState(false);
  const [settingsOpen, setSettings] = useState(false);
  const [modal, setModal] = useState<any>(null);
  const [calYear, setCalYear] = useState(time.getFullYear());
  const [calMonth, setCalMonth] = useState(time.getMonth());

  // 【第2, 5, 10項目】タイマー武装
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState("");
  const wakeLock = useRef<any>(null);

  const TH = THEMES.dark;
  const t = DICT.ja;

  const toggleWakeLock = async (on: boolean) => {
    if (!('wakeLock' in navigator)) return;
    try {
      if (on) wakeLock.current = await navigator.wakeLock.request('screen');
      else { wakeLock.current?.release(); wakeLock.current = null; }
    } catch (e) {}
  };

  // タイマー完了時の自動記録ロジック
  const completeTimerSession = useCallback(async () => {
    if (!selectedTask) return;
    
    // 【第12項目】記録が有効な設定（今は簡易的に常に記録）
    if (isOnline && user) {
      await upsertData(user.id, `log_${Date.now()}`, {
        type: "work_log",
        task: selectedTask,
        duration: 50, // 50分として記録（設定に合わせて変更可）
        at: new Date().toISOString()
      });
    }
    setIsRunning(false);
    toggleWakeLock(false);
    setSelectedTask("");
    setActiveTimerId(null);
  }, [selectedTask, isOnline, user]);

  useEffect(() => {
    let int: any;
    if (isRunning && timeLeft > 0) {
      int = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      // 【第5項目】残り5分(300秒)でビープ音（簡易版）
      if (timeLeft === 300) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 1);
      }
    } else if (timeLeft === 0 && isRunning) {
      completeTimerSession();
    }
    return () => clearInterval(int);
  }, [isRunning, timeLeft, completeTimerSession]);

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
      if (data.links) setLinks(data.links);
    })();
  }, [isOnline, user?.id]);

  const cloudSave = useCallback(async (key: string, value: any) => {
    if (isOnline && user) await upsertData(user.id, key, value);
  }, [isOnline, user]);

  useEffect(() => { LS.set("apx7_tasks", tasks); cloudSave("tasks", tasks); }, [tasks, cloudSave]);
  useEffect(() => { LS.set("apx7_sched", sched); cloudSave("sched", sched); }, [sched, cloudSave]);

  const toggleTask = (id: string) => setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, done: !tk.done, updated_at: new Date().toISOString() } : tk));
  const saveTask = (item: any, d: any) => { 
    if (!item) setTasks(prev => [...prev, { id: String(Date.now()), done: false, ...d }]);
    else setTasks(prev => prev.map(tk => tk.id === item.id ? { ...tk, ...d } : tk)); 
  };
  // --- 【新設】ルーティンの完了とサイクル進行ロジック ---
  const toggleSched = (id: string) => {
    setSched(prev => prev.map(rc => {
      if (rc.id !== id) return rc;
      const nextDone = !rc.done;
      // 完了した瞬間にインデックスを1つ進める（サイクル機能）
      let nextIdx = rc.currentCycleIndex || 0;
      if (nextDone && rc.cycle && rc.cycle.length > 0) {
        nextIdx = (nextIdx + 1) % rc.cycle.length;
      }
      return { ...rc, done: nextDone, currentCycleIndex: nextIdx };
    }));
  };
  const saveSched = (item: any, d: any) => {
    if (!item) setSched(prev => [...prev, { id: String(Date.now()), done: false, ...d }]);
    else setSched(prev => prev.map(rc => rc.id === item.id ? { ...rc, ...d } : rc));
    setModal(null);
  };

  const displayTasks = tasks.filter(tk => !tk.done || (tk.updated_at || "").split('T')[0] === currentDayStr);

  const TimerPanel = () => (
    <Panel TH={TH} style={{ marginBottom: 20, textAlign: 'center', padding: 20 }}>
      <PanelHeader title="TACTICAL TIMER" sub={isRunning ? `MISSION: ${selectedTask}` : "READY"} TH={TH} />
      {!selectedTask ? (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 15 }}>
          {["数学", "英語", "ビジネス"].map(tk => (
            <button key={tk} onClick={() => { setSelectedTask(tk); setTimeLeft(3000); }} style={{ padding: '10px 20px', background: 'none', border: `1px solid ${TH.gold}`, color: TH.gold, borderRadius: 4, cursor: "pointer" }}>{tk}</button>
          ))}
          {/* 画像の289行目（</div>の手前）に挿入 */}
          <div style={{ marginTop: 15 }}>
            <label style={{ fontSize: 10, color: TH.textDim, cursor: "pointer", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <input type="checkbox" checked={shouldRecord} onChange={e => setShouldRecord(e.target.checked)} />
              このセッションを記録タブに残す
            </label>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 48, fontFamily: 'monospace', color: TH.text }}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
            <button onClick={() => { setIsRunning(!isRunning); toggleWakeLock(!isRunning); }} style={{ flex: 1, padding: 12, background: TH.gold, border: "none", fontWeight: "bold", cursor: "pointer" }}>{isRunning ? "PAUSE" : "START"}</button>
            <button onClick={() => { setIsRunning(false); setSelectedTask(""); toggleWakeLock(false); }} style={{ flex: 1, padding: 12, background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, cursor: "pointer" }}>RESET</button>
          </div>
        </div>
      )}
    </Panel>
  );

  return (
    <div style={{ minHeight: "100vh", background: TH.bg, color: TH.text, fontFamily: "serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "20px" : "40px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 28, letterSpacing: 8, color: TH.gold }}>APEX HUB</h1>
            <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
              {["weekday", "holiday", "monk"].map(m => (
                <button key={m} onClick={() => setActiveMode(m)} style={{ padding: '3px 8px', background: activeMode === m ? TH.gold : 'transparent', color: activeMode === m ? TH.bg : TH.textDim, border: `1px solid ${TH.goldDark}`, borderRadius: 4, fontSize: 8, cursor: "pointer" }}>{m.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:20, color:TH.goldLight, fontFamily:"monospace"}}>{time.toLocaleTimeString()}</div>
            <button onClick={() => setSettings(true)} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, padding: "5px 10px", marginTop: 10, cursor: "pointer", fontSize: 10 }}>SETTINGS</button>
          </div>
        </div>

        {/* MAIN AREA */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 25 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>
            {(!isMobile || mobSec === "schedule") && (
              <>
                <TimerPanel />
                <Panel TH={TH}>
                  <PanelHeader title="ROUTINES" TH={TH} />
                  {sched.filter(rc => !rc.mode || rc.mode === "all" || rc.mode === activeMode).map(rc => (
                    <RoutineRow key={rc.id} routine={rc} onToggleDone={() => toggleSched(rc.id)} onEdit={() => setModal({type:"sched", item:rc})} TH={TH} t={t} />
                  ))}
                  <AddRow onClick={() => setModal({ type: "sched", item: null })} label="+ Add Routine" TH={TH} />
                </Panel>
              </>
            )}

            {(!isMobile || mobSec === "tasks") && (
              <Panel TH={TH}>
                <PanelHeader title="TASKS" TH={TH} />
                {displayTasks.map(tk => (
                  <div key={tk.id} className="row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 15px", borderBottom: `1px solid ${TH.border}` }}>
                    <div onClick={() => toggleTask(tk.id)} style={{ width: 20, height: 20, border: `1px solid ${tk.done ? TH.gold : TH.border}`, background: tk.done ? `${TH.gold}1a` : "transparent", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{tk.done && "✓"}</div>
                    <span style={{ flex: 1, fontSize: 13, textDecoration: tk.done ? "line-through" : "none", opacity: tk.done ? 0.5 : 1 }} onClick={()=>setModal({type:"task", item:tk})}>{tk.text}</span>
                    {tk.memo && <span onClick={()=>setModal({type:"task", item:tk})} style={{ fontSize: 9, color: TH.goldDark, cursor:"pointer", border:"1px solid", padding:"2px 4px" }}>MEMO</span>}
                  </div>
                ))}
                <AddRow onClick={() => setModal({ type: "task", item: null })} label="+ Add Task" TH={TH} />
              </Panel>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>
            {(!isMobile || mobSec === "links") && (
              <Panel TH={TH}>
                <PanelHeader title="URL HUB" TH={TH} />
                {links.map(l => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", padding: "12px 15px", borderBottom: `1px solid ${TH.border}` }}>
                    <span style={{marginRight:10}}>{l.icon}</span>
                    <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, color: TH.text, textDecoration: "none", fontSize: 13 }}>{l.name}</a>
                    <span style={{fontSize:10, color:TH.gold}}>↗</span>
                  </div>
                ))}
              </Panel>
            )}
            <Panel TH={TH}>
              <PanelHeader title="CALENDAR" TH={TH} />
              <div style={{ padding: 15 }}>
                <EventCalendar tasks={tasks} sched={sched} TH={TH} vy={calYear} vm={calMonth} setVY={setCalYear} setVM={setCalMonth} streakPct={streakPct} onAddEvent={() => {}} />
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {/* OVERLAYS */}
      {settingsOpen && <SettingsPanel open={settingsOpen} onClose={() => setSettings(false)} userName={userName} setUserName={setUserName} t={t} TH={TH} user={user} />}
      {modal?.type === "task" && <TaskModal task={modal.item} onSave={(d: any) => saveTask(modal.item, d)} onDelete={(id: string) => setTasks(prev => prev.filter(tk => tk.id !== id))} onClose={() => setModal(null)} TH={TH} />}
      {modal?.type === "sched" && <ScheduleModal item={modal.item} onSave={(d: any) => saveSched(modal.item, d)} onDelete={(id: string) => setSched(prev => prev.filter(rc => rc.id !== id))} onClose={() => setModal(null)} TH={TH} />}

      {/* BOTTOM NAV */}
      <nav className="mob-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: isMobile ? "flex" : "none", background: TH.bg2, borderTop: `1px solid ${TH.border}`, justifyContent: "space-around", padding: 10, zIndex: 1000 }}>
        {["schedule", "tasks", "links", "events"].map(k => (
          <button key={k} onClick={() => setMob(k)} style={{ background: "none", border: "none", color: mobSec === k ? TH.gold : "#555", fontSize: 9 }}>{k.toUpperCase()}</button>
        ))}
      </nav>
    </div>
  );
}

// ModalBackdrop 等の基本部品を Dashboard の外に定義
function ModalBackdrop({ onClose, children, TH }: any) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: TH.surface, padding: 25, borderRadius: 8, width: "100%", maxWidth: 450, border: `1px solid ${TH.gold}` }}>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }: any) {
  return <div style={{ marginBottom: 15 }}><label style={{ fontSize: 10, color: "#888", display: "block", marginBottom: 5 }}>{label}</label>{children}</div>;
}
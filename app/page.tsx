// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabase, isSupabaseConfigured, onAuthStateChange, fetchAllData, upsertData, signInWithGoogle, supabase } from "../lib/supabase";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CONSTANTS & INITIAL DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const THEMES: any = {
  dark: { bg:"#050505", bg2:"#0A0A0A", surface:"#0d0d0d", surfaceHover:"#131313", border:"#2a2a2a", borderGold:"#8A683066", text:"#F0EAD8", textDim:"#C8C0B0", textMuted:"#888", gold:"#C9A84C", goldLight:"#F0D878", goldDark:"#8A6830", inputBg:"#0f0f0f" },
};
const DICT: any = {
  ja: { tagline:"規律 · 集中 · 卓越", routine_title:"ルーティン", events_title:"カレンダー", progress:"進捗", completed:"完了", settings:"設定", mob_routine:"日課", mob_partner:"相棒", mob_tasks:"タスク", mob_links:"リンク", mob_events:"記録", url_hub:"帝国の門" },
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
// 2. REUSABLE COMPONENTS (Dashboardの外に配置：初期化エラーを防止)
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

const RoutineRow = ({ routine, onToggleDone, onEdit, onStartTimer, TH }: any) => {
  const handleToggle = () => { if (routine.done) routine.selectedOption = null; onToggleDone(); };
  const taskName = (routine.cycle && routine.cycle.length > 0) ? routine.cycle[routine.currentCycleIndex || 0] : routine.task;
  return (
    <div className="row" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '12px 15px', borderBottom: `1px solid ${TH.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {(routine.done || !routine.options?.length) && (
          <div onClick={handleToggle} style={{ width: 20, height: 20, border: `1px solid ${routine.done ? TH.gold : TH.border}`, background: routine.done ? `${TH.gold}1a` : "transparent", borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{routine.done && "✓"}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{routine.icon || "📌"}</span>
            <span style={{ fontSize: 13, color: routine.done ? TH.textMuted : TH.text, textDecoration: routine.done ? 'line-through' : 'none', opacity: routine.done ? 0.6 : 1 }}>
              {taskName} {routine.selectedOption && <span style={{ color: TH.gold }}>({routine.selectedOption})</span>}
            </span>
          </div>
          <div style={{ fontSize: 10, color: TH.textMuted }}>{routine.time} {routine.endTime ? `〜 ${routine.endTime}` : ""}</div>
        </div>
        <div style={{display:'flex', gap:5}}>
            {!routine.done && routine.cycle?.length > 0 && <button onClick={(e)=>{e.stopPropagation(); onToggleDone(); onToggleDone();}} style={{fontSize:9, background:"none", border:`1px solid ${TH.border}`, color:TH.textDim, padding:"2px 5px", borderRadius:4, cursor:"pointer"}}>NEXT</button>}
            <button onClick={(e) => { e.stopPropagation(); onStartTimer(taskName); }} style={{ background: 'none', border: `1px solid ${TH.goldDark}44`, color: TH.gold, cursor: "pointer", fontSize: 12, borderRadius: 2, padding: "2px 4px" }}>⏱️</button>
            <button onClick={onEdit} style={{background:"none", border:"none", cursor:"pointer", fontSize:12}}>✏️</button>
        </div>
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

const EventCalendar = ({ TH, tasks, sched, vy, vm, setVY, setVM, streakPct }: any) => {
  const today = new Date();
  const cells = []; 
  const fd = new Date(vy, vm, 1).getDay();
  for (let i = 0; i < fd; i++) cells.push(null); for (let d = 1; d <= 31; d++) cells.push(d);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
      {cells.map((d, i) => {
        if (!d) return <div key={i} />;
        const dstr = `${vy}-${String(vm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const isToday = today.getFullYear()===vy && today.getMonth()===vm && today.getDate()===d;
        const doneRate = (sched.filter(r=>r.done).length / (sched.length || 1)) * 100;
        const win = doneRate >= streakPct;
        return (
          <div key={i} style={{ minHeight: 45, border: `1px solid ${isToday ? TH.gold : TH.border}`, padding: 4 }}>
            <div style={{ fontSize: 9, color: isToday ? TH.gold : TH.textDim }}>{d}</div>
            {isToday && sched.length > 0 && <div style={{fontSize:7, fontWeight:"bold", color: win ? "#4AFF9E" : "#FF4A9E"}}>{win ? "WIN" : "LOSE"}</div>}
            <div style={{ display: 'flex', gap: 1, marginTop: 2 }}>
              {tasks?.filter((tk: any) => tk.deadline === dstr).map((tk: any) => <div key={tk.id} style={{ width: 4, height: 4, background: TH.textMuted }}></div>)}
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
  const [links, setLinks] = useState<any[]>(() => LS.get("apx7_links", DEF_LINKS));
  const [timers, setTimers] = useState<any[]>(() => LS.get("apx7_timers", [{id:"1", name:"Deep Work", tasks:["数学","英語","ビジネス"], seconds:3000}]));
  const [activeTab, setTab] = useState("today");
  const [mobSec, setMob] = useState("schedule");
  const [isMobile, setMobile] = useState(false);
  const [modal, setModal] = useState<any>(null);
  const [settingsOpen, setSettings] = useState(false);

  // タイマーState
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsRunning] = useState(false);
  const [selectedTimerTask, setSelectedTask] = useState("");
  const [shouldRecord, setShouldRecord] = useState(true);
  const wakeLock = useRef<any>(null);

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
    let int: any;
    if (isTimerRunning && timeLeft > 0) {
      int = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === 301) {
             const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
             const osc = ctx.createOscillator(); osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.5);
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsRunning(false);
      if (shouldRecord && isOnline && user) upsertData(user.id, `log_${Date.now()}`, { type:"work", task:selectedTimerTask, at:new Date().toISOString() });
    }
    return () => clearInterval(int);
  }, [isTimerRunning, timeLeft, shouldRecord, isOnline, user, selectedTimerTask]);

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
  const saveTask = (item: any, d: any) => { if (!item) setTasks(prev => [...prev, { id: String(Date.now()), done: false, ...d }]); else setTasks(prev => prev.map(tk => tk.id === item.id ? { ...tk, ...d } : tk)); };
  
  const toggleSched = (id: string) => setSched(prev => prev.map(rc => {
    if (rc.id !== id) return rc;
    const nextDone = !rc.done;
    let nextIdx = rc.currentCycleIndex || 0;
    if (nextDone && rc.cycle?.length) nextIdx = (nextIdx + 1) % rc.cycle.length;
    return { ...rc, done: nextDone, currentCycleIndex: nextIdx };
  }));

  const saveSched = (item: any, d: any) => {
    if (!item) setSched(prev => [...prev, { id: String(Date.now()), done: false, ...d }]);
    else setSched(prev => prev.map(rc => rc.id === item.id ? { ...rc, ...d } : rc));
  };

  const TimerPanel = () => {
    const cur = timers.find(t2 => t2.id === activeTimerId);
    return (
      <Panel TH={TH} style={{ marginBottom: 20, textAlign: 'center', padding: 20 }}>
        {!selectedTimerTask ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {timers.map(t2 => (
              <div key={t2.id} style={{position:'relative'}}>
                <button onClick={() => { setActiveTimerId(t2.id); setTimeLeft(t2.seconds); setSelectedTask(t2.tasks[0] || "作業"); }} style={{ width:'100%', padding: 15, background: TH.bg2, border: `1px solid ${TH.border}`, color: TH.gold, borderRadius: 4, cursor:"pointer" }}>{t2.name}</button>
                <button onClick={(e) => { e.stopPropagation(); setModal({type:"timerEdit", item:t2}); }} style={{position:'absolute', top:5, right:5, background:'none', border:'none', color:TH.textMuted, fontSize:10, cursor:"pointer"}}>⚙️</button>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 42, fontFamily: 'monospace', color: TH.text }}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
            <p style={{fontSize:10, color:TH.gold, marginBottom:10}}>{selectedTimerTask}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setIsRunning(!isTimerRunning)} style={{ flex: 1, padding: 12, background: TH.gold, border: "none", fontWeight: "bold", cursor:"pointer" }}>{isTimerRunning ? "PAUSE" : "START"}</button>
              <button onClick={() => { setIsRunning(false); setSelectedTask(""); }} style={{ flex: 1, padding: 12, background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, cursor:"pointer" }}>RESET</button>
            </div>
            <div style={{marginTop:15}}><label style={{fontSize:10, color:TH.textDim}}><input type="checkbox" checked={shouldRecord} onChange={e=>setShouldRecord(e.target.checked)}/> 記録を保存</label></div>
          </div>
        )}
      </Panel>
    );
  };

  const RecordPanel = () => (
    <Panel TH={TH}>
      <PanelHeader title="ANALYTICS" sub="稼働データ" TH={TH} />
      <div style={{ padding: 26 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 20 }}>
          <div className="stat-card"><p style={{ fontSize: 9, color: TH.textMuted }}>達成率</p><p style={{ fontSize: 20, color: TH.gold, fontFamily: 'monospace' }}>{Math.round((sched.filter(r=>r.done).length / (sched.length || 1)) * 100)}%</p></div>
          <div className="stat-card"><p style={{ fontSize: 9, color: TH.textMuted }}>ランク</p><p style={{ fontSize: 20, color: TH.goldLight, fontFamily: 'monospace' }}>S</p></div>
        </div>
        <p style={{fontSize:9, color:TH.textMuted}}>GALAXY S26 ULTRAまで あと 64,500円</p>
        <div style={{height:6, background:"#222", borderRadius:3, marginTop:8, overflow:"hidden"}}><div style={{width:"65%", height:"100%", background:TH.gold}}></div></div>
      </div>
    </Panel>
  );

  const displayTasks = tasks.filter(tk => !tk.done || (tk.updated_at || "").split('T')[0] === currentDayStr);
  const activeSched = sched.filter(rc => !rc.mode || rc.mode === "all" || rc.mode === activeMode);

  return (
    <div style={{ minHeight: "100vh", background: TH.bg, color: TH.text, fontFamily: "serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "15px" : "30px" }}>
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 28, letterSpacing: 8, color: TH.gold }}>APEX HUB</h1>
            <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
              {["weekday", "holiday", "monk"].map(m => (
                <button key={m} onClick={() => setActiveMode(m)} style={{ padding: '3px 8px', background: activeMode === m ? TH.gold : 'transparent', color: activeMode === m ? TH.bg : TH.textDim, border: `1px solid ${TH.goldDark}`, borderRadius: 4, fontSize: 8, cursor:"pointer" }}>{m.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:18, color:TH.goldLight, fontFamily:"monospace"}}>{time.toLocaleTimeString()}</div>
            <button onClick={() => setSettings(true)} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, padding: "5px 10px", marginTop: 10, cursor:"pointer", fontSize:10 }}>SETTINGS</button>
          </div>
        </div>

        {/* MAIN AREA */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 25 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>
            {(isMobile ? mobSec === "schedule" : activeTab === "today") && (
              <>
                <TimerPanel />
                <Panel TH={TH}>
                  <PanelHeader title="ROUTINES" right={<span style={{fontSize:9, color:TH.gold}}>{activeMode.toUpperCase()}</span>} TH={TH} />
                  {activeSched.map(rc => <RoutineRow key={rc.id} routine={rc} onToggleDone={() => toggleSched(rc.id)} onEdit={() => setModal({type:"sched", item:rc})} onStartTimer={(n:string)=>{setSelectedTask(n); setTimeLeft(3000); setIsRunning(true);}} TH={TH} />)}
                  <AddRow onClick={() => setModal({ type: "sched", item: null })} label="+ Add Routine" TH={TH} />
                </Panel>
              </>
            )}
            {(isMobile ? mobSec === "tasks" : activeTab === "today") && (
              <Panel TH={TH}>
                <PanelHeader title="TASKS" TH={TH} />
                {Array.from(new Set(displayTasks.map(tk => tk.category || "Focus"))).map(cat => (
                  <div key={cat} style={{marginBottom:15}}>
                    <div style={{padding:"4px 15px", background:"#111", fontSize:9, color:TH.gold}}>{cat.toUpperCase()}</div>
                    {displayTasks.filter(tk => (tk.category || "Focus") === cat).map(tk => (
                      <div key={tk.id} className="row" style={{borderBottom:`1px solid ${TH.border}`}}>
                        <div onClick={() => toggleTask(tk.id)} style={{ width: 18, height: 18, border: `1px solid ${tk.done ? TH.gold : TH.border}`, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{tk.done && "✓"}</div>
                        <span style={{ flex: 1, fontSize: 13, textDecoration: tk.done ? "line-through" : "none", opacity: tk.done ? 0.5 : 1, marginLeft:10 }} onClick={()=>setModal({type:"task", item:tk})}>{tk.text}</span>
                        {tk.memo && <span onClick={()=>setModal({type:"task", item:tk})} style={{fontSize:9, color:TH.goldDark, cursor:"pointer"}}>📄 MEMO</span>}
                      </div>
                    ))}
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
                  <div key={l.id} className="row" style={{ borderBottom: `1px solid ${TH.border}` }}>
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
                <EventCalendar tasks={tasks} sched={sched} TH={TH} vy={time.getFullYear()} vm={time.getMonth()} streakPct={80} onAddEvent={() => {}} />
              </div>
            </Panel>
            {(!isMobile || mobSec === "chart") && <RecordPanel />}
          </div>
        </div>
      </div>

      {/* OVERLAYS */}
      {settingsOpen && <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.85)', zIndex:1500, display:'flex', justifyContent:'flex-end'}}><div style={{width:300, background:TH.bg2, padding:30, borderLeft:`1px solid ${TH.border}`}}><h2 style={{color:TH.gold}}>SETTINGS</h2><button onClick={()=>signInWithGoogle()} style={{width:'100%', padding:12, background:'#fff', color:'#000', margin:'20px 0', border:"none", borderRadius:4, fontWeight:"bold", cursor:"pointer"}}>GOOGLE LOGIN</button><button onClick={()=>setSettings(false)} style={{width:'100%', padding:10, background:TH.goldDark, color:"#fff", border:"none", cursor:"pointer"}}>CLOSE</button></div></div>}
      {modal?.type === "task" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: TH.surface, padding: 25, borderRadius: 8, width: "100%", maxWidth: 400, border: `1px solid ${TH.gold}` }}>
            <h3 style={{ color: TH.gold, marginBottom: 15 }}>TASK DETAILS</h3>
            <input style={{ width: "100%", background: TH.inputBg, color: TH.text, border: `1px solid ${TH.border}`, padding: 10, marginBottom: 10 }} value={modal.item?.text || ""} onChange={e => saveTask(modal.item, { text: e.target.value })} />
            <textarea style={{ width: "100%", background: TH.inputBg, color: TH.text, border: `1px solid ${TH.border}`, padding: 10, minHeight: 100 }} value={modal.item?.memo || ""} onChange={e => saveTask(modal.item, { memo: e.target.value })} placeholder="Memo..." />
            <div style={{ display: "flex", gap: 10, marginTop: 15 }}><button onClick={() => setModal(null)} style={{ flex: 1, padding: 10, background: TH.gold, border: "none", fontWeight: "bold", cursor:"pointer" }}>SAVE</button>{modal.item && <button onClick={() => { setTasks(prev => prev.filter(tk => tk.id !== modal.item.id)); setModal(null); }} style={{ padding: 10, color: "red", background: "none", border: "1px solid red", cursor:"pointer" }}>DEL</button>}</div>
          </div>
        </div>
      )}
      {modal?.type === "sched" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: TH.surface, padding: 25, borderRadius: 8, width: "100%", maxWidth: 400, border: `1px solid ${TH.gold}` }}>
            <h3 style={{ color: TH.gold, marginBottom: 15 }}>ROUTINE SETTING</h3>
            <input type="time" style={{ width: "100%", background: TH.inputBg, color: TH.text, border: `1px solid ${TH.border}`, padding: 10, marginBottom: 10 }} value={modal.item?.time || "08:00"} onChange={e => saveSched(modal.item, { time: e.target.value })} />
            <input style={{ width: "100%", background: TH.inputBg, color: TH.text, border: `1px solid ${TH.border}`, padding: 10, marginBottom: 10 }} value={modal.item?.task || ""} onChange={e => saveSched(modal.item, { task: e.target.value })} placeholder="Routine name" />
            <div style={{ display: "flex", gap: 10 }}><button onClick={() => setModal(null)} style={{ flex:1, padding: 10, background: TH.gold, border: "none", fontWeight: "bold", cursor:"pointer" }}>SAVE</button>{modal.item && <button onClick={() => { setSched(prev => prev.filter(rc => rc.id !== modal.item.id)); setModal(null); }} style={{ padding: 10, color: "red", background: "none", border: "1px solid red", cursor:"pointer" }}>DEL</button>}</div>
          </div>
        </div>
      )}
      {modal?.type === "timerEdit" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: TH.surface, padding: 25, borderRadius: 8, width: "100%", maxWidth: 400, border: `1px solid ${TH.gold}` }}>
            <h3 style={{ color: TH.gold, marginBottom: 15 }}>TIMER SETTING</h3>
            <input style={{ width: "100%", background: TH.inputBg, color: TH.text, border: `1px solid ${TH.border}`, padding: 10, marginBottom: 10 }} value={modal.item?.name || ""} onChange={e => setTimers(prev => prev.map(t2=>t2.id===modal.item.id ? {...t2, name: e.target.value} : t2))} />
            <div style={{ display: "flex", gap: 10 }}><button onClick={() => setModal(null)} style={{ flex: 1, padding: 10, background: TH.gold, border: "none", fontWeight: "bold", cursor:"pointer" }}>SAVE</button></div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="mob-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: isMobile ? "flex" : "none", background: TH.bg2, borderTop: `1px solid ${TH.border}`, justifyContent: "space-around", padding: 10, zIndex: 1000 }}>
        {["schedule", "partner", "tasks", "links", "chart"].map(k => <button key={k} onClick={() => isMobile ? setMob(k) : setTab(k)} style={{ background: "none", border: "none", color: (isMobile ? mobSec : activeTab) === k ? TH.gold : "#555", fontSize: 9 }}>{k.toUpperCase()}</button>)}
      </nav>
    </div>
  );
}
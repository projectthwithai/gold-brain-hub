// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabase, isSupabaseConfigured, onAuthStateChange, fetchAllData, upsertData, signInWithGoogle } from "../lib/supabase";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 定数・設定・テーマ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const THEMES: any = {
  dark: { bg:"#050505", bg2:"#0A0A0A", surface:"#0d0d0d", surfaceHover:"#131313", border:"#2a2a2a", borderGold:"#8A683066", text:"#F0EAD8", textDim:"#C8C0B0", textMuted:"#888", gold:"#C9A84C", goldLight:"#F0D878", goldDark:"#8A6830", inputBg:"#0f0f0f" },
};
const DICT: any = {
  ja: { tagline:"規律 · 集中 · 卓越", routine_title:"ルーティン", events_title:"カレンダー", progress:"進捗", completed:"完了", settings:"設定", mob_routine:"日課", mob_partner:"相棒", mob_tasks:"タスク", mob_links:"リンク", mob_events:"予定", url_hub:"帝国の門" },
};
const DEF_TASKS = [{ id: "1", text: "17歳の野望を開始せよ", done: false, category: "Vision", memo: "ここをクリックしてメモを編集" }];
const DEF_SCHEDULE = [{ id: "s1", time: "05:00", endTime: "09:00", task: "Deep Work", done: false, freq: "daily", options: ["数学", "英語", "ビジネス"] }];
const DEF_LINKS = [
  { id: "l1", name: "Math Lab", url: "https://math-lab-xxx.vercel.app", icon: "📐", color: "#C9A84C", cat: "Lab" },
  { id: "l2", name: "English Lab", url: "https://english-lab-xxx.vercel.app", icon: "🇬🇧", color: "#4A9EFF", cat: "Lab" },
  { id: "l3", name: "Japanese Lab", url: "https://japanese-lab-xxx.vercel.app", icon: "🇯🇵", color: "#FF6B4A", cat: "Lab" }
];

const LS = {
  get: (k: string, fb: any) => { if (typeof window === "undefined") return fb; const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; },
  set: (k: string, v: any) => { if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v)); }
};

const isActiveToday = (item: any, dow: number) => true;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 独立コンポーネント (Dashboardの外)
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

function AddRow({onClick, label, TH}: any){
  return (
    <button onClick={onClick} style={{display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"10px", background:"transparent", border:`1px dashed ${TH.border}`, color:TH.textMuted, cursor:"pointer", fontSize:11, letterSpacing:4, textTransform:"uppercase", fontFamily:"inherit"}}>{label}</button>
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
            <span style={{ fontSize: 16 }}>{routine.icon || "📌"}</span>
            <span style={{ fontSize: 13, color: routine.done ? TH.textMuted : TH.text, textDecoration: routine.done ? 'line-through' : 'none', opacity: routine.done ? 0.6 : 1 }}>
              {routine.task} {routine.selectedOption && <span style={{ color: TH.gold }}>( {routine.selectedOption} )</span>}
            </span>
          </div>
          <div style={{ fontSize: 10, color: TH.textMuted }}>{routine.time} {routine.endTime ? `〜 ${routine.endTime}` : ""}</div>
        </div>
        <button className="edit-btn" onClick={onEdit}>✏️</button>
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

function EventCalendar({ TH, tasks, sched, onAddEvent }: any) {
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
}

function ScheduleModal({item, onSave, onDelete, onClose, TH}: any){
  const [time, setTime] = useState(item?.time || "08:00");
  const [endTime, setEndTime] = useState(item?.endTime || ""); 
  const [task, setTask] = useState(item?.task || "");
  const [options, setOptions] = useState<string[]>(item?.options || [""]);
  const [mode, setMode] = useState(item?.mode || "all");
  const IS = { width: "100%", background: TH.inputBg, border: `1px solid ${TH.border}`, color: TH.text, padding: "10px", borderRadius: 2, marginBottom: 10 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: TH.surface, padding: 25, borderRadius: 8, width: "100%", maxWidth: 400, border: `1px solid ${TH.gold}` }}>
        <h3 style={{ color: TH.gold, marginBottom: 15 }}>ROUTINE SETTING</h3>
        <div style={{display:"flex", gap:10}}><input type="time" style={IS} value={time} onChange={e=>setTime(e.target.value)} /><input type="time" style={IS} value={endTime} onChange={e=>setEndTime(e.target.value)} /></div>
        <input style={IS} value={task} onChange={e=>setTask(e.target.value)} placeholder="Task name..." />
        <select style={IS} value={mode} onChange={e=>setMode(e.target.value)}><option value="all">ALL MODES</option><option value="weekday">WEEKDAY</option><option value="holiday">HOLIDAY</option><option value="monk">MONK MODE</option></select>
        {options.map((opt, i) => (
          <div key={i} style={{display:"flex", gap:5}}><input style={IS} value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} /><button onClick={()=>setOptions(options.filter((_,idx)=>idx!==i))} style={{color:"red"}}>✕</button></div>
        ))}
        <button onClick={() => setOptions([...options, ""])} style={{fontSize:10, color:TH.gold, background:"none", border:`1px dashed ${TH.gold}`, width:"100%", padding:5, marginBottom:15}}>+ ADD OPTION</button>
        <div style={{display:"flex", gap:10}}>
          {item && <button onClick={() => { onDelete(item.id); onClose(); }} style={{ flex: 1, background: "#200", color: "red", border: "1px solid red" }}>DELETE</button>}
          <button onClick={() => { onSave({ time, endTime, task, mode, options: options.filter(o => o.trim() !== "") }); onClose(); }} style={{flex:1, padding:10, background:TH.gold, color:"#000", fontWeight:"bold"}}>SAVE</button>
        </div>
      </div>
    </div>
  );
}

function TaskModal({task, onSave, onDelete, onClose, TH}: any){
  const [text, setText] = useState(task?.text || "");
  const [memo, setMemo] = useState(task?.memo || "");
  const [cat, setCat] = useState(task?.category || "Focus");
  const IS = { width: "100%", background: TH.inputBg, border: `1px solid ${TH.border}`, color: TH.text, padding: "10px", borderRadius: 2, marginBottom: 10 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: TH.surface, padding: 25, borderRadius: 8, width: "100%", maxWidth: 400, border: `1px solid ${TH.gold}` }}>
        <h3 style={{ color: TH.gold, marginBottom: 15 }}>TASK DETAILS</h3>
        <input style={IS} value={text} onChange={e=>setText(e.target.value)} />
        <input style={IS} value={cat} onChange={e=>setCat(e.target.value)} placeholder="Category..." />
        <textarea style={{...IS, minHeight: 100}} value={memo} onChange={e=>setMemo(e.target.value)} placeholder="Memo..." />
        <div style={{display:"flex", gap:10}}>
          {task && <button onClick={()=>{onDelete(task.id); onClose();}} style={{flex:1, color:"red", background:"none", border:"1px solid red"}}>DELETE</button>}
          <button onClick={() => { onSave({ text, memo, category: cat }); onClose(); }} style={{flex:1, padding:10, background:TH.gold, color:"#000", fontWeight:"bold"}}>SAVE</button>
        </div>
      </div>
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

  const [time, setTime] = useState(new Date());
  const todayDow = time.getDay();
  const currentDayStr = new Date().toISOString().split('T')[0];

  const [activeMode, setActiveMode] = useState(() => LS.get("apx7_mode", "monk"));
  const [tasks, setTasks] = useState<any[]>(() => LS.get("apx7_tasks", DEF_TASKS));
  const [sched, setSched] = useState<any[]>(() => LS.get("apx7_sched", DEF_SCHEDULE));
  const [links, setLinks] = useState<any[]>(() => LS.get("apx7_links", DEF_LINKS));
  const [mobSec, setMob] = useState("schedule");
  const [isMobile, setMobile] = useState(false);
  const [modal, setModal] = useState<any>(null);
  // --- タイマー関連のState ---
  const [timerItems, setTimerItems] = useState<any[]>(() => LS.get("apx7_timers", [
    { id: "t1", name: "学習", tasks: ["数学", "英語", "物理"], seconds: 1500 },
    { id: "t2", name: "Deep Work", tasks: ["GBH開発", "Lab開発"], seconds: 3000 }
  ]));
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState(""); // ★第2項：選んだ作業名

  // タイマーのカウントダウン処理
  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);
  const [settingsOpen, setSettings] = useState(false);

  const TH = THEMES.dark;
  const t = DICT.ja;

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

  const TimerPanel = () => {
    const currentTimer = timerItems.find(t => t.id === activeTimerId);

    return (
      <Panel TH={TH}>
        <PanelHeader title="TACTICAL TIMER" sub={isRunning ? `Focusing on: ${selectedTask}` : "準備を整えよ"} TH={TH} />
        <div style={{ padding: 26, textAlign: 'center' }}>
          {!activeTimerId ? (
            /* タイマー選択画面 */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {timerItems.map(t => (
                <button key={t.id} onClick={() => { setActiveTimerId(t.id); setTimeLeft(t.seconds); }} style={{ padding: 20, background: TH.bg2, border: `1px solid ${TH.border}`, color: TH.gold, borderRadius: 4, cursor: 'pointer' }}>
                  {t.name}
                </button>
              ))}
            </div>
          ) : !isRunning && !selectedTask ? (
            /* ★第2項：作業選択画面 */
            <div>
              <p style={{ fontSize: 12, color: TH.textDim, marginBottom: 15 }}>何に従事するか選べ：</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                {currentTimer?.tasks.map((task: string) => (
                  <button key={task} onClick={() => setSelectedTask(task)} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${TH.gold}`, color: TH.gold, borderRadius: 20, cursor: 'pointer' }}>
                    {task}
                  </button>
                ))}
              </div>
              <button onClick={() => setActiveTimerId(null)} style={{ marginTop: 20, background: 'none', border: 'none', color: TH.textMuted, fontSize: 10, cursor: 'pointer' }}>← 戻る</button>
            </div>
          ) : (
            /* カウントダウン表示 */
            <div>
              <div style={{ fontSize: 48, fontFamily: 'monospace', color: TH.text, marginBottom: 10 }}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
              <p style={{ fontSize: 11, color: TH.gold, marginBottom: 20 }}>{selectedTask}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setIsRunning(!isRunning)} style={{ flex: 1, padding: 12, background: TH.gold, color: "#000", border: 'none', fontWeight: 'bold', borderRadius: 4 }}>
                  {isRunning ? "PAUSE" : "START"}
                </button>
                <button onClick={() => { setIsRunning(false); setActiveTimerId(null); setSelectedTask(""); }} style={{ flex: 1, padding: 12, background: 'none', border: `1px solid ${TH.border}`, color: TH.textDim, borderRadius: 4 }}>
                  RESET
                </button>
              </div>
            </div>
          )}
        </div>
      </Panel>
    );
  };

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
  const saveSched = (item: any, d: any) => {
    if (!item) setSched(prev => [...prev, { id: String(Date.now()), done: false, ...d }]);
    else setSched(prev => prev.map(rc => rc.id === item.id ? { ...rc, ...d } : rc));
  };

  const displayTasks = tasks.filter(tk => !tk.done || (tk.updated_at || "").split('T')[0] === currentDayStr);

  return (
    <div style={{ minHeight: "100vh", background: TH.bg, color: TH.text, fontFamily: "serif" }}>
      <style>{`.row:hover{background:${TH.surfaceHover};}.tab-btn{padding:10px;background:none;border:none;color:#555;cursor:pointer;font-size:10px;letter-spacing:2px;border-bottom:2px solid transparent;}.tab-btn.active{color:${TH.gold};border-bottom-color:${TH.gold};}`}</style>
      
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

        {/* CONTENT */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 25 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>
            {(!isMobile || mobSec === "schedule") && (
              <Panel TH={TH}>
                <PanelHeader title={t.routine_title} TH={TH} />
                {sched.filter(rc => !rc.mode || rc.mode === "all" || rc.mode === activeMode).map(rc => (
                  <RoutineRow key={rc.id} routine={rc} onToggleDone={() => setSched(prev => prev.map(r => r.id === rc.id ? {...r, done: !r.done} : r))} onEdit={() => setModal({type:"sched", item:rc})} TH={TH} t={t} />
                ))}
                <AddRow onClick={() => setModal({ type: "sched", item: null })} label={t.add_routine} TH={TH} />
              </Panel>
            )}
            {/* モバイル表示の例 */}
{mobSec === "schedule" && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <TimerPanel /> {/* ★ここにタイマーを出現させる */}
    <Panel TH={TH}> ...ルーティン... </Panel>
  </div>
)}

            {(!isMobile || mobSec === "tasks") && (
              <Panel TH={TH}>
                <PanelHeader title="TASKS" TH={TH} />
                {Array.from(new Set(displayTasks.map(tk => tk.category || "Focus"))).map(cat => (
                  <div key={cat} style={{marginBottom:15}}>
                    <div style={{display:"flex", justifyContent:"space-between", padding:"5px 15px", background:"#111"}}>
                      <span style={{fontSize:10, color:TH.gold}}>{cat}</span>
                    </div>
                    {displayTasks.filter(tk => (tk.category || "Focus") === cat).sort((a,b)=> (a.done === b.done ? 0 : a.done ? 1 : -1)).map(tk => (
                      <div key={tk.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 15px", borderBottom: `1px solid ${TH.border}` }}>
                        <div onClick={() => toggleTask(tk.id)} style={{ width: 20, height: 20, border: `1px solid ${tk.done ? TH.gold : TH.border}`, background: tk.done ? `${TH.gold}1a` : "transparent", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{tk.done && "✓"}</div>
                        <span style={{ flex: 1, fontSize: 13, textDecoration: tk.done ? "line-through" : "none", opacity: tk.done ? 0.5 : 1 }} onClick={()=>setModal({type:"task", item:tk})}>{tk.text}</span>
                        {tk.memo && <span onClick={()=>setModal({type:"task", item:tk})} style={{ fontSize: 9, color: TH.goldDark, cursor:"pointer", border:"1px solid", padding:"2px 4px" }}>MEMO</span>}
                      </div>
                    ))}
                  </div>
                ))}
                <AddRow onClick={() => setModal({ type: "task", item: null })} label={t.add_task} TH={TH} />
              </Panel>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>
            {(!isMobile || mobSec === "links") && (
              <Panel TH={TH}>
                <PanelHeader title={t.url_hub} TH={TH} />
                {links.map(l => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", padding: "12px 15px", borderBottom: `1px solid ${TH.border}` }}>
                    <span style={{marginRight:10}}>{l.icon}</span>
                    <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, color: TH.text, textDecoration: "none", fontSize: 13 }}>{l.name}</a>
                    <span style={{fontSize:10, color:TH.gold}}>↗</span>
                  </div>
                ))}
              </Panel>
            )}

            {(!isMobile || mobSec === "events") && (
              <Panel TH={TH}>
                <PanelHeader title={t.events_title} TH={TH} />
                <div style={{ padding: 15 }}>
                  <EventCalendar tasks={tasks} sched={sched} TH={TH} onAddEvent={() => {}} />
                </div>
              </Panel>
            )}
            
            {/* 相棒セクション (仮) */}
            {(!isMobile || mobSec === "partner") && (
              <Panel TH={TH}>
                <PanelHeader title="PARTNER" sub="相棒タブ" TH={TH} />
                <div style={{padding:20, textAlign:"center"}}>
                  <button onClick={signInWithGoogle} style={{background:TH.gold, color:"#000", border:"none", padding:"10px 20px", borderRadius:4, cursor:"pointer"}}>INVITE PARTNER</button>
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>

      {/* OVERLAYS */}
      {settingsOpen && <SettingsPanel open={settingsOpen} onClose={() => setSettings(false)} userName={userName} setUserName={setUserName} t={t} TH={TH} user={user} />}
      {modal?.type === "task" && <TaskModal task={modal.item} onSave={(d: any) => saveTask(modal.item, d)} onDelete={(id: string) => setTasks(prev => prev.filter(tk => tk.id !== id))} onClose={() => setModal(null)} TH={TH} />}
      {modal?.type === "sched" && <ScheduleModal item={modal.item} onSave={(d: any) => saveSched(modal.item, d)} onDelete={(id: string) => setSched(prev => prev.filter(rc => rc.id !== id))} onClose={() => setModal(null)} TH={TH} />}

      {/* BOTTOM NAV */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: isMobile ? "flex" : "none", background: TH.bg2, borderTop: `1px solid ${TH.border}`, justifyContent: "space-around", padding: 10, zIndex: 1000 }}>
        {["schedule", "partner", "tasks", "links", "events"].map(k => (
          <button key={k} onClick={() => setMob(k)} style={{ background: "none", border: "none", color: mobSec === k ? TH.gold : "#555", fontSize: 9 }}>{k.toUpperCase()}</button>
        ))}
      </nav>
    </div>
  );
}
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

const LS = {
  get: (k: string, fb: any) => { if (typeof window === "undefined") return fb; const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; },
  set: (k: string, v: any) => { if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v)); }
};

const isActiveToday = (item: any, dow: number) => true;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. SUB-COMPONENTS (Dashboardの外に配置)
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

function EventCalendar({ events, TH, tasks, sched, onAddEvent, vy, vm, setVY, setVM }: any) {
  const today = new Date();
  const cells = []; 
  const fd = new Date(vy, vm, 1).getDay();
  for (let i = 0; i < fd; i++) cells.push(null); for (let d = 1; d <= 31; d++) cells.push(d);
  const prev = () => { if (vm === 0) { setVY((y: any) => y - 1); setVM(11); } else setVM((m: any) => m - 1); };
  const next = () => { if (vm === 11) { setVY((y: any) => y + 1); setVM(0); } else setVM((m: any) => m + 1); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={prev} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textDim }}>‹</button>
        <span style={{ fontSize: 12, color: TH.gold }}>{vy} / {vm + 1}</span>
        <button onClick={next} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textDim }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dstr = `${vy}-${String(vm + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isToday = today.getFullYear()===vy && today.getMonth()===vm && today.getDate()===d;
          return (
            <div key={i} style={{ minHeight: 45, border: `1px solid ${isToday ? TH.gold : TH.border}`, padding: 4 }} onClick={() => onAddEvent(dstr)}>
              <div style={{ fontSize: 9, color: isToday ? TH.gold : TH.textDim }}>{d}</div>
              <div style={{ marginTop: 2 }}>
                {tasks?.filter((tk: any) => tk.deadline === dstr).map((tk: any) => <div key={tk.id} style={{ fontSize: 7, color: TH.textMuted }}>□</div>)}
                {sched?.filter((rc: any) => rc.done).map((rc: any) => <div key={rc.id} style={{ fontSize: 7, color: TH.gold }}>•</div>)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SettingsPanel({open, onClose, lang, setLang, themeName, setTheme, userName, setUserName, streakPct, setStreakPct, t, TH, user}: any){
  const [name, setName] = useState(userName);
  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1500 }} />}
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(400px,95vw)", background: TH.surface, zIndex: 1600, transform: open ? "translateX(0)" : "translateX(100%)", transition: "0.3s", padding: 20, overflowY: "auto" }}>
        <h2 style={{ color: TH.gold, marginBottom: 20 }}>SETTINGS</h2>
        {!user ? <button onClick={signInWithGoogle} style={{ width: "100%", padding: 12, background: "#fff", color: "#000", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><img src="https://www.google.com/favicon.ico" style={{width:16}}/>Continue with Google</button> : <p style={{color:TH.text}}>{user.email}</p>}
        <div style={{marginTop:20}}>
           <label style={{fontSize:11, color:TH.textMuted}}>NAME</label>
           <input value={name} onChange={e=>setName(e.target.value)} style={{width:"100%", background:TH.inputBg, border:`1px solid ${TH.border}`, color:TH.text, padding:10}} />
        </div>
        <button onClick={() => { setUserName(name); onClose(); }} style={{ width: "100%", marginTop: 20, padding: 12, background: TH.goldDark, color: TH.goldLight, border: "none", cursor: "pointer" }}>SAVE</button>
      </div>
    </>
  );
}

function ScheduleModal({item, onSave, onDelete, onClose, t, TH}: any){
  const [time, setTime] = useState(item?.time || "08:00");
  const [endTime, setEndTime] = useState(item?.endTime || ""); 
  const [task, setTask] = useState(item?.task || "");
  const [options, setOptions] = useState<string[]>(item?.options || [""]);
  const IS = { width: "100%", background: TH.inputBg, border: `1px solid ${TH.border}`, color: TH.text, padding: "10px", borderRadius: 2, marginBottom: 10 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: TH.surface, padding: 25, borderRadius: 8, width: "100%", maxWidth: 400, border: `1px solid ${TH.gold}` }}>
        <h3 style={{ color: TH.gold, marginBottom: 15 }}>{item ? "EDIT ROUTINE" : "ADD ROUTINE"}</h3>
        <label style={{fontSize:10, color:TH.textMuted}}>START / END</label>
        <div style={{display:"flex", gap:10}}><input type="time" style={IS} value={time} onChange={e=>setTime(e.target.value)} /><input type="time" style={IS} value={endTime} onChange={e=>setEndTime(e.target.value)} /></div>
        <input style={IS} value={task} onChange={e=>setTask(e.target.value)} placeholder="Task name..." />
        <label style={{fontSize:10, color:TH.textMuted}}>OPTIONS (選択肢)</label>
        {options.map((opt, i) => (
          <div key={i} style={{display:"flex", gap:5}}>
            <input style={IS} value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }} />
            <button onClick={()=>setOptions(options.filter((_,idx)=>idx!==i))} style={{color:"red", background:"none", border:"none", height:40}}>✕</button>
          </div>
        ))}
        <button onClick={() => setOptions([...options, ""])} style={{fontSize:10, color:TH.gold, background:"none", border:`1px dashed ${TH.gold}`, width:"100%", padding:5, marginBottom:15}}>+ Add Option</button>
        <div style={{display:"flex", gap:10}}>
          <button onClick={onClose} style={{flex:1, padding:10, background:"none", border:`1px solid ${TH.border}`, color:TH.textDim}}>CANCEL</button>
          <button onClick={() => { onSave({ time, endTime, task, options: options.filter(o => o.trim() !== "") }); onClose(); }} style={{flex:1, padding:10, background:TH.gold, color:TH.bg, border:"none", fontWeight:"bold"}}>SAVE</button>
        </div>
      </div>
    </div>
  );
}

function TaskModal({task, onSave, onDelete, onClose, t, TH}: any){
  const [text, setText] = useState(task?.text || "");
  const [memo, setMemo] = useState(task?.memo || "");
  const IS = { width: "100%", background: TH.inputBg, border: `1px solid ${TH.border}`, color: TH.text, padding: "10px", borderRadius: 2, marginBottom: 10 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: TH.surface, padding: 25, borderRadius: 8, width: "100%", maxWidth: 400, border: `1px solid ${TH.gold}` }}>
        <h3 style={{ color: TH.gold, marginBottom: 15 }}>TASK DETAILS</h3>
        <input style={IS} value={text} onChange={e=>setText(e.target.value)} />
        <textarea style={{...IS, minHeight: 100}} value={memo} onChange={e=>setMemo(e.target.value)} placeholder="Memo..." />
        <div style={{display:"flex", gap:10}}>
          <button onClick={onClose} style={{flex:1, padding:10, background:"none", border:`1px solid ${TH.border}`, color:TH.textDim}}>CANCEL</button>
          <button onClick={() => { onSave({ text, memo }); onClose(); }} style={{flex:1, padding:10, background:TH.gold, color:TH.bg, border:"none", fontWeight:"bold"}}>SAVE</button>
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

  const [lang] = useState("ja");
  const [themeName] = useState("dark");
  const [activeMode, setActiveMode] = useState(() => LS.get("apx7_mode", "monk"));
  const [tasks, setTasks] = useState<any[]>(() => LS.get("apx7_tasks", DEF_TASKS));
  const [sched, setSched] = useState<any[]>(() => LS.get("apx7_sched", DEF_SCHEDULE));
  const [mobSec, setMob] = useState("schedule");
  const [isMobile, setMobile] = useState(false);
  const [settingsOpen, setSettings] = useState(false);
  const [modal, setModal] = useState<any>(null);
  const [calYear, setCalYear] = useState(() => time.getFullYear());
  const [calMonth, setCalMonth] = useState(() => time.getMonth());

  const TH = THEMES[themeName] || THEMES.dark;
  const t = DICT[lang];

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

  const toggleTask = (id: string) => setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, done: !tk.done, updated_at: new Date().toISOString() } : tk));
  const toggleSched = (id: string) => setSched(prev => prev.map(rc => rc.id === id ? { ...rc, done: !rc.done } : rc));

  const displayTasks = tasks.filter(tk => !tk.done || (tk.updated_at || "").split('T')[0] === currentDayStr);

  return (
    <div style={{ minHeight: "100vh", background: TH.bg, color: TH.text, fontFamily: "serif" }}>
      <style>{`.row:hover{background:${TH.surfaceHover};}`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "20px" : "40px" }}>
        
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
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:20, color:TH.goldLight}}>{time.toLocaleTimeString()}</div>
            <button onClick={() => setSettings(true)} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, padding: "5px 10px", marginTop: 10, cursor:"pointer" }}>SETTINGS</button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 25 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 25 }}>
            {(!isMobile || mobSec === "schedule") && (
              <Panel TH={TH}>
                <PanelHeader title="ROUTINES" TH={TH} />
                {sched.map(rc => <RoutineRow key={rc.id} routine={rc} onToggleDone={() => toggleSched(rc.id)} onEdit={() => setModal({type:"sched", item:rc})} TH={TH} t={t} />)}
                <AddRow onClick={() => setModal({ type: "sched", item: null })} label="+ Add Routine" TH={TH} />
              </Panel>
            )}
            {(!isMobile || mobSec === "tasks") && (
              <Panel TH={TH}>
                <PanelHeader title="TASKS" TH={TH} />
                {displayTasks.map(tk => (
                  <div key={tk.id} className="row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 15px", borderBottom: `1px solid ${TH.border}` }}>
                    <div onClick={() => toggleTask(tk.id)} style={{ width: 20, height: 20, border: `1px solid ${tk.done ? TH.gold : TH.border}`, background: tk.done ? `${TH.gold}1a` : "transparent", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{tk.done && "✓"}</div>
                    <span style={{ flex: 1, fontSize: 13, textDecoration: tk.done ? "line-through" : "none", opacity: tk.done ? 0.5 : 1 }} onClick={()=>setModal({type:"task", item:tk})}>{tk.text}</span>
                    {tk.memo && <span onClick={()=>setModal({type:"task", item:tk})} style={{ fontSize: 10, color: TH.goldDark, cursor:"pointer" }}>📄 MEMO</span>}
                  </div>
                ))}
                <AddRow onClick={() => setModal({ type: "task", item: null })} label="+ Add Task" TH={TH} />
              </Panel>
            )}
          </div>
          {(!isMobile || mobSec === "events") && (
            <Panel TH={TH}>
              <PanelHeader title="CALENDAR" TH={TH} />
              <div style={{ padding: 15 }}>
                <EventCalendar tasks={tasks} sched={sched} TH={TH} t={t} vy={calYear} vm={calMonth} setVY={setCalYear} setVM={setCalMonth} onAddEvent={(d: string) => {}} />
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* MODALS */}
      {settingsOpen && <SettingsPanel open={settingsOpen} onClose={() => setSettings(false)} lang={lang} setLang={() => {}} themeName={themeName} setTheme={() => {}} userName={userName} setUserName={setUserName} streakPct={streakPct} setStreakPct={setStreakPct} t={t} TH={TH} user={user} />}
      {modal?.type === "task" && <TaskModal task={modal.item} onSave={(d: any) => saveTask(modal.item, d)} onDelete={(id: string) => setTasks(prev => prev.filter(tk => tk.id !== id))} onClose={() => setModal(null)} t={t} TH={TH} />}
      {modal?.type === "sched" && <ScheduleModal item={modal.item} onSave={(d: any) => setSched(prev => modal.item ? prev.map(rc => rc.id === modal.item.id ? {...rc, ...d} : rc) : [...prev, {id: String(Date.now()), done: false, ...d}])} onDelete={(id: string) => setSched(prev => prev.filter(rc => rc.id !== id))} onClose={() => setModal(null)} t={t} TH={TH} />}

      {/* BOTTOM NAV */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: isMobile ? "flex" : "none", background: TH.bg2, borderTop: `1px solid ${TH.border}`, justifyContent: "space-around", padding: 10, zIndex: 1000 }}>
        {["schedule", "tasks", "events"].map(k => <button key={k} onClick={() => setMob(k)} style={{ background: "none", border: "none", color: mobSec === k ? TH.gold : "#555", fontSize: 10 }}>{k.toUpperCase()}</button>)}
      </nav>
    </div>
  );
}
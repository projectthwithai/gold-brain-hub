// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getSupabase, isSupabaseConfigured, onAuthStateChange, fetchAllData, upsertData, signInWithGoogle } from "../lib/supabase";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CONSTANTS & DEFAULTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const THEMES: any = {
  dark: { bg:"#050505", bg2:"#0A0A0A", surface:"#0d0d0d", surfaceHover:"#131313", border:"#2a2a2a", borderGold:"#8A683066", text:"#F0EAD8", textDim:"#C8C0B0", textMuted:"#888", gold:"#C9A84C", goldLight:"#F0D878", goldDark:"#8A6830", inputBg:"#0f0f0f" },
};
const DICT: any = {
  ja: { tagline:"規律 · 集中 · 卓越", routine_title:"ルーティン", events_title:"カレンダー", progress:"進捗", completed:"完了", settings:"設定", mob_routine:"日課", mob_partner:"相棒", mob_tasks:"タスク", mob_links:"リンク", mob_events:"予定", url_hub:"帝国の門" },
};
const LS = {
  get: (k: string, fb: any) => { if (typeof window === "undefined") return fb; const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; },
  set: (k: string, v: any) => { if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v)); }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. REUSABLE UI COMPONENTS
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
function GBtn({ children, onClick, variant="primary", TH }: any) {
  const styles: any = {
    primary: { background: TH.gold, color: "#000" },
    ghost: { background: "none", border: `1px solid ${TH.border}`, color: TH.textDim }
  };
  return <button onClick={onClick} style={{ padding: "8px 16px", borderRadius: 4, cursor: "pointer", border: "none", fontSize: 11, fontWeight: "bold", ...styles[variant] }}>{children}</button>;
}

// --- ルーティンの1行 ---
function RoutineRow({ routine, onToggleDone, onEdit, TH }: any) {
  const handleToggle = () => { if (routine.done) routine.selectedOption = null; onToggleDone(); };
  return (
    <div className="row" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '14px 18px', borderBottom: `1px solid ${TH.border}` }}>
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
        <button onClick={onEdit} className="edit-btn">✏️</button>
      </div>
      {!routine.done && routine.options?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', paddingLeft: 34 }}>
          {routine.options.map((opt: string) => (
            <button key={opt} onClick={() => { routine.selectedOption = opt; onToggleDone(); }} style={{ background: 'transparent', border: `1px solid ${TH.goldDark}`, color: TH.gold, fontSize: 9, padding: '4px 8px', borderRadius: 10, cursor: 'pointer' }}>+ {opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. MAIN DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function Dashboard() {
  // --- 3.1. States ---
  const [session, setSession] = useState<any>(null);
  const user = session?.user ?? null;
  const isOnline = !!user && isSupabaseConfigured();

  const [time, setTime] = useState(new Date());
  const [activeMode, setActiveMode] = useState(() => LS.get("apx7_mode", "monk"));
  const [tasks, setTasks] = useState<any[]>(() => LS.get("apx7_tasks", []));
  const [sched, setSched] = useState<any[]>(() => LS.get("apx7_sched", []));
  const [links, setLinks] = useState<any[]>(() => LS.get("apx7_links", []));
  const [timers, setTimers] = useState<any[]>(() => LS.get("apx7_timers", [{id:"1", name:"Deep Work", tasks:["数学","英語","ビジネス"], seconds:3000}]));
  const [cds, setCDs] = useState<any[]>(() => LS.get("apx7_cds", []));
  const [activeCdId, setActiveCdId] = useState(() => LS.get("apx7_acd", null));

  const [activeTab, setTab] = useState("today"); // Desktop用
  const [mobSec, setMob] = useState("schedule"); // Mobile用
  const [isMobile, setMobile] = useState(false);
  const [modal, setModal] = useState<any>(null);
  const [settingsOpen, setSettings] = useState(false);

  // タイマー実行State
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsRunning] = useState(false);
  const [selectedTimerTask, setSelectedTask] = useState("");

  const TH = THEMES.dark;
  const t = DICT.ja;

  // --- 3.2. Effects ---
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

  // タイマーロジック
  useEffect(() => {
    let int: any;
    if (isTimerRunning && timeLeft > 0) {
      int = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) { setIsRunning(false); }
    return () => clearInterval(int);
  }, [isTimerRunning, timeLeft]);

  // クラウド同期
  const cloudSave = useCallback(async (key: string, value: any) => {
    if (isOnline && user) await upsertData(user.id, key, value);
  }, [isOnline, user]);

  useEffect(() => {
    if (!isOnline) return;
    (async () => {
      const data = await fetchAllData(user.id);
      if (data.tasks) setTasks(data.tasks);
      if (data.sched) setSched(data.sched);
      if (data.links) setLinks(data.links);
      if (data.timers) setTimers(data.timers);
      if (data.cds) setCDs(data.cds);
    })();
  }, [isOnline, user?.id]);

  useEffect(() => { LS.set("apx7_tasks", tasks); cloudSave("tasks", tasks); }, [tasks, cloudSave]);
  useEffect(() => { LS.set("apx7_sched", sched); cloudSave("sched", sched); }, [sched, cloudSave]);

  // --- 3.3. Handlers ---
  const toggleTask = (id: string) => setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, done: !tk.done, updated_at: new Date().toISOString() } : tk));
  const saveTask = (item: any, d: any) => { if (!item) setTasks(prev => [...prev, { id: String(Date.now()), done: false, ...d }]); else setTasks(prev => prev.map(tk => tk.id === item.id ? { ...tk, ...d } : tk)); };
  const saveSched = (item: any, d: any) => { if (!item) setSched(prev => [...prev, { id: String(Date.now()), done: false, ...d }]); else setSched(prev => prev.map(rc => rc.id === item.id ? { ...rc, ...d } : rc)); };

  const currentDayStr = new Date().toISOString().split('T')[0];
  const displayTasks = tasks.filter(tk => !tk.done || (tk.updated_at || "").split('T')[0] === currentDayStr);
  const activeSched = sched.filter(rc => !rc.mode || rc.mode === "all" || rc.mode === activeMode);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. RENDER BLOCKS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const TimerPanel = () => {
    const cur = timers.find(t2 => t2.id === activeTimerId);
    return (
      <Panel TH={TH} style={{ marginBottom: 20 }}>
        <PanelHeader title="TACTICAL TIMER" sub={isTimerRunning ? `Focus: ${selectedTimerTask}` : "Ready"} TH={TH} />
        <div style={{ padding: 20, textAlign: 'center' }}>
          {!activeTimerId ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {timers.map(t2 => <button key={t2.id} onClick={() => { setActiveTimerId(t2.id); setTimeLeft(t2.seconds); }} style={{ padding: 15, background: TH.bg2, border: `1px solid ${TH.border}`, color: TH.gold, borderRadius: 4 }}>{t2.name}</button>)}
            </div>
          ) : !isTimerRunning && !selectedTimerTask ? (
            <div>
              <p style={{ fontSize: 11, color: TH.textDim, marginBottom: 10 }}>項目を選択：</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {cur?.tasks.map((tk: string) => <button key={tk} onClick={() => setSelectedTask(tk)} style={{ padding: '6px 12px', border: `1px solid ${TH.gold}`, color: TH.gold, background: 'none', borderRadius: 20, fontSize: 10 }}>{tk}</button>)}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 42, fontFamily: 'monospace', color: TH.text }}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
              <p style={{ fontSize: 10, color: TH.gold, margin: '10px 0' }}>{selectedTimerTask}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setIsRunning(!isTimerRunning)} style={{ flex: 1, padding: 10, background: TH.gold, color: "#000", fontWeight: "bold" }}>{isTimerRunning ? "PAUSE" : "START"}</button>
                <button onClick={() => { setIsRunning(false); setActiveTimerId(null); setSelectedTask(""); }} style={{ flex: 1, padding: 10, background: "none", border: `1px solid ${TH.border}`, color: TH.textDim }}>RESET</button>
              </div>
            </div>
          )}
        </div>
      </Panel>
    );
  };

  const LinksPanel = () => (
    <Panel TH={TH}>
      <PanelHeader title={t.url_hub} TH={TH} />
      {links.map(l => (
        <div key={l.id} className="row" style={{ display: "flex", alignItems: "center", padding: "12px 15px", borderBottom: `1px solid ${TH.border}` }}>
          <span style={{ marginRight: 10 }}>{l.icon}</span>
          <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, color: TH.text, textDecoration: "none", fontSize: 13 }}>{l.name}</a>
          <span style={{ fontSize: 10, color: TH.gold }}>↗</span>
        </div>
      ))}
    </Panel>
  );

  const activeCd = cds.find(c => c.id === activeCdId);

  return (
    <div style={{ minHeight: "100vh", background: TH.bg, color: TH.text, fontFamily: "serif" }}>
      <style>{`.row:hover{background:${TH.surfaceHover};}.edit-btn{background:none;border:none;color:#555;cursor:pointer;font-size:12px;}.pbar{height:3px;background:#222;}.pfill{height:100%;background:${TH.gold};transition:width 1s;}`}</style>
      
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "15px" : "30px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 25 }}>
          <div>
            <h1 style={{ fontSize: 26, letterSpacing: 6, color: TH.gold }}>APEX HUB</h1>
            <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
              {["weekday", "holiday", "monk"].map(m => (
                <button key={m} onClick={() => setActiveMode(m)} style={{ padding: '3px 8px', background: activeMode === m ? TH.gold : 'transparent', color: activeMode === m ? TH.bg : TH.textDim, border: `1px solid ${TH.goldDark}`, borderRadius: 4, fontSize: 8 }}>{m.toUpperCase()}</button>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, color: TH.goldLight, fontFamily: "monospace" }}>{time.toLocaleTimeString()}</div>
            <button onClick={() => setSettings(true)} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, padding: "4px 8px", marginTop: 8, cursor: "pointer", fontSize: 9 }}>SETTINGS</button>
          </div>
        </div>

        {/* COUNTDOWN WIDGET */}
        {activeCd && (
          <Panel TH={TH} style={{ marginBottom: 20, textAlign: 'center', padding: 15 }}>
            <div style={{ fontSize: 10, color: TH.textMuted, letterSpacing: 2 }}>{activeCd.name.toUpperCase()}</div>
            <div style={{ fontSize: 32, color: TH.gold, fontFamily: 'monospace' }}>
              {Math.ceil((new Date(activeCd.date).getTime() - new Date().getTime()) / 86400000)} DAYS LEFT
            </div>
          </Panel>
        )}

        {/* MAIN CONTENT */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {(!isMobile || mobSec === "schedule") && (
              <>
                <TimerPanel />
                <Panel TH={TH}>
                  <PanelHeader title="ROUTINES" right={<span style={{fontSize:9, color:TH.gold}}>{activeMode.toUpperCase()}</span>} TH={TH} />
                  {activeSched.map(rc => <RoutineRow key={rc.id} routine={rc} onToggleDone={() => toggleSched(rc.id)} onEdit={() => setModal({type:"sched", item:rc})} TH={TH} />)}
                  <AddRow onClick={() => setModal({ type: "sched", item: null })} label="+ Add Routine" TH={TH} />
                </Panel>
              </>
            )}
            {(!isMobile || mobSec === "tasks") && (
              <Panel TH={TH}>
                <PanelHeader title="TASKS" TH={TH} />
                {Array.from(new Set(displayTasks.map(tk => tk.category || "Focus"))).map(cat => (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div style={{ padding: "4px 15px", background: "#0a0a0a", fontSize: 9, color: TH.gold, borderBottom: `1px solid ${TH.border}` }}>{cat.toUpperCase()}</div>
                    {displayTasks.filter(tk => (tk.category || "Focus") === cat).sort((a,b)=> a.done === b.done ? 0 : a.done ? 1 : -1).map(tk => (
                      <div key={tk.id} className="row" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 15px", borderBottom: `1px solid ${TH.border}` }}>
                        <div onClick={() => toggleTask(tk.id)} style={{ width: 18, height: 18, border: `1px solid ${tk.done ? TH.gold : TH.border}`, background: tk.done ? `${TH.gold}1a` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>{tk.done && "✓"}</div>
                        <span style={{ flex: 1, fontSize: 13, textDecoration: tk.done ? "line-through" : "none", opacity: tk.done ? 0.5 : 1 }} onClick={()=>setModal({type:"task", item:tk})}>{tk.text}</span>
                        {tk.memo && <span onClick={()=>setModal({type:"task", item:tk})} style={{ fontSize: 9, color: TH.goldDark, cursor:"pointer" }}>📄 MEMO</span>}
                      </div>
                    ))}
                  </div>
                ))}
                <AddRow onClick={() => setModal({ type: "task", item: null })} label="+ Add Task" TH={TH} />
              </Panel>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {(!isMobile || mobSec === "links") && <LinksPanel />}
            {(!isMobile || mobSec === "partner") && (
              <Panel TH={TH}>
                <PanelHeader title="PARTNER" TH={TH} />
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: TH.textDim, marginBottom: 15 }}>相棒と進捗を同期せよ</p>
                  <button onClick={signInWithGoogle} style={{ padding: '10px 20px', background: TH.gold, border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}>INVITE PARTNER</button>
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>

      {/* OVERLAYS */}
      {settingsOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 1500, display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "min(350px, 80vw)", background: TH.bg2, padding: 25, borderLeft: `1px solid ${TH.border}` }}>
             <h2 style={{ color: TH.gold, marginBottom: 20 }}>SETTINGS</h2>
             <button onClick={() => setSettings(false)} style={{ width: "100%", padding: 10, background: TH.goldDark, color: "#fff", border: "none" }}>CLOSE</button>
             <button onClick={() => getSupabase().auth.signOut()} style={{ width: "100%", marginTop: 10, padding: 10, background: "none", border: `1px solid ${TH.border}`, color: "#999" }}>LOGOUT</button>
          </div>
        </div>
      )}
      
      {modal?.type === "task" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: TH.surface, padding: 25, borderRadius: 8, width: "100%", maxWidth: 400, border: `1px solid ${TH.gold}` }}>
            <h3 style={{ color: TH.gold, marginBottom: 15 }}>TASK DETAILS</h3>
            <input style={{ width: "100%", background: TH.inputBg, color: TH.text, border: `1px solid ${TH.border}`, padding: 10, marginBottom: 10 }} value={modal.item.text} onChange={e => saveTask(modal.item, { text: e.target.value })} />
            <textarea style={{ width: "100%", background: TH.inputBg, color: TH.text, border: `1px solid ${TH.border}`, padding: 10, minHeight: 100 }} value={modal.item.memo} onChange={e => saveTask(modal.item, { memo: e.target.value })} placeholder="Memo..." />
            <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: 10, background: TH.gold, border: "none", fontWeight: "bold" }}>CLOSE</button>
              <button onClick={() => { setTasks(prev => prev.filter(tk => tk.id !== modal.item.id)); setModal(null); }} style={{ padding: 10, color: "red", background: "none", border: "1px solid red" }}>DEL</button>
            </div>
          </div>
        </div>
      )}

      {modal?.type === "sched" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: TH.surface, padding: 25, borderRadius: 8, width: "100%", maxWidth: 400, border: `1px solid ${TH.gold}` }}>
            <h3 style={{ color: TH.gold, marginBottom: 15 }}>ROUTINE SETTING</h3>
            <input type="time" style={{ width: "100%", background: TH.inputBg, color: TH.text, border: `1px solid ${TH.border}`, padding: 10, marginBottom: 10 }} value={modal.item?.time || "08:00"} onChange={e => saveSched(modal.item, { time: e.target.value })} />
            <input style={{ width: "100%", background: TH.inputBg, color: TH.text, border: `1px solid ${TH.border}`, padding: 10, marginBottom: 10 }} value={modal.item?.task || ""} onChange={e => saveSched(modal.item, { task: e.target.value })} placeholder="Task name" />
            <button onClick={() => setModal(null)} style={{ width: "100%", padding: 10, background: TH.gold, border: "none", fontWeight: "bold" }}>SAVE & CLOSE</button>
          </div>
        </div>
      )}

      {/* MOBILE NAV */}
      <nav className="mob-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: isMobile ? "flex" : "none", background: TH.bg2, borderTop: `1px solid ${TH.border}`, justifyContent: "space-around", padding: 10, zIndex: 1000 }}>
        {["schedule", "tasks", "partner", "links"].map(k => (
          <button key={k} onClick={() => setMob(k)} style={{ background: "none", border: "none", color: mobSec === k ? TH.gold : "#555", fontSize: 9 }}>{k.toUpperCase()}</button>
        ))}
      </nav>
    </div>
  );
}
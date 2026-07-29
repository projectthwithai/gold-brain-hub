// components/TacticalTimer.tsx
// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';

export default function TacticalTimer({ TH, t, timers, upsertData, user, isOnline }: any) {
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsRunning] = useState(false);
  const [selectedTask, setSelectedTask] = useState("");
  const [shouldRecord, setShouldRecord] = useState(true);
  const wakeLock = useRef<any>(null);

  // 画面スリープ防止機能
  const toggleWakeLock = async (on: boolean) => {
    if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (on) wakeLock.current = await (navigator as any).wakeLock.request('screen');
      else { if (wakeLock.current) { await wakeLock.current.release(); wakeLock.current = null; } }
    } catch (e) {}
  };

  useEffect(() => {
    let int: any;
    if (isTimerRunning && timeLeft > 0) {
      int = setInterval(() => {
        setTimeLeft(prev => {
          // 残り5分のアラート音
          if (prev === 301) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.5);
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsRunning(false);
      toggleWakeLock(false);
      // 記録機能の連動
      if (shouldRecord && isOnline && user) {
        upsertData(user.id, `log_${Date.now()}`, { 
          type: "work", 
          task: selectedTask, 
          duration: 50, // 仮で50分。タイマー設定から取得も可
          at: new Date().toISOString() 
        });
        alert("任務完了。記録を転送した。");
      }
    }
    return () => clearInterval(int);
  }, [isTimerRunning, timeLeft, shouldRecord, isOnline, user, selectedTask]);

  const startTimer = () => { setIsRunning(true); toggleWakeLock(true); };
  const resetTimer = () => { setIsRunning(false); toggleWakeLock(false); setActiveTimerId(null); setSelectedTask(""); };

  const cur = timers.find((tm: any) => tm.id === activeTimerId);

  return (
    <div style={{ background: TH.surface, border: `1px solid ${TH.borderGold}`, borderRadius: 4, padding: 20, textAlign: 'center', position: 'relative' }}>
      <h3 style={{ color: TH.gold, fontSize: 12, letterSpacing: 4, marginBottom: 15 }}>TACTICAL TIMER</h3>
      
      {!selectedTask ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {timers.map((tm: any) => (
            <button key={tm.id} onClick={() => { setActiveTimerId(tm.id); setTimeLeft(tm.seconds); setSelectedTask(tm.tasks[0]); }}
              style={{ padding: 15, background: TH.bg2, border: `1px solid ${TH.border}`, color: TH.gold, borderRadius: 4, cursor: "pointer" }}>
              {tm.name}
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 48, fontFamily: 'monospace', color: TH.text, marginBottom: 10 }}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
          <p style={{ fontSize: 11, color: TH.gold, marginBottom: 15 }}>MISSION: {selectedTask.toUpperCase()}</p>
          
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => isTimerRunning ? setIsRunning(false) : startTimer()} 
              style={{ flex: 1, padding: 12, background: TH.gold, color: "#000", fontWeight: "bold", border: "none", borderRadius: 4, cursor: "pointer" }}>
              {isTimerRunning ? "PAUSE" : "START"}
            </button>
            <button onClick={resetTimer} 
              style={{ flex: 1, padding: 12, background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, borderRadius: 4, cursor: "pointer" }}>
              RESET
            </button>
          </div>
          
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 15, cursor: 'pointer', fontSize: 10, color: TH.textMuted }}>
            <input type="checkbox" checked={shouldRecord} onChange={e => setShouldRecord(e.target.checked)} />
            この結果を記録タブに保存
          </label>
        </div>
      )}
    </div>
  );
}
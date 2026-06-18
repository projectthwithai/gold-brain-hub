// @ts-nocheck
import { useState, useEffect, useRef } from "react";

export default function LiquidTimerCard({ cfg, isDefault, onDelete, onEdit, onFocusChange, TH, t, userId, unlockAudio, playBowlSound, sendTimerNotification }: any) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [mode, setMode] = useState("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [workStartTime, setWorkStartTime] = useState(null);
  const [restCredit, setRestCredit] = useState(0);

  const timerRef = useRef(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      if (mode === "work") completeWork();
      else completeRest();
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, timeLeft]);

  const startWork = () => {
    unlockAudio();
    setMode("work");
    setIsRunning(true);
    setTimeLeft(cfg.maxWorkMin * 60);
    setWorkStartTime(Date.now());
    onFocusChange(true);
  };

  const completeWork = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    const elapsedSec = workStartTime ? Math.floor((Date.now() - workStartTime) / 1000) : 0;
    const workMin = elapsedSec / 60;
    const calculatedRestMin = Math.ceil(workMin / cfg.workRestRatio);
    const restSec = calculatedRestMin * 60;
    setMode("break");
    setTimeLeft(restSec);
    setSessions(s => s + 1);
    setIsRunning(true);
    playBowlSound("break");
    sendTimerNotification("break");
  };

  const completeRest = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    setMode("idle");
    setTimeLeft(0);
    onFocusChange(false);
    playBowlSound("work");
    sendTimerNotification("work");
  };

  const stopTimer = () => {
    if (mode === "work") completeWork();
    else if (mode === "break") {
      setRestCredit(prev => prev + timeLeft);
      completeRest();
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div style={{
      background: mode === "work" ? `${TH.gold}0a` : mode === "break" ? "#00FF0005" : TH.surface,
      border: `1px solid ${mode === "work" ? TH.gold : TH.border}`,
      borderRadius: 4, padding: 16, position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, letterSpacing: 2, color: TH.gold }}>{cfg.name}</span>
        <div style={{ display: 'flex', gap: 5 }}>
          <button onClick={onEdit} style={{ background: 'none', border: 'none', color: TH.textMuted, cursor: 'pointer' }}>✏️</button>
          {!isDefault && <button onClick={onDelete} style={{ background: 'none', border: 'none', color: TH.textMuted, cursor: 'pointer' }}>✕</button>}
        </div>
      </div>
      <div style={{ textAlign: 'center', margin: '15px 0' }}>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 32, color: isRunning ? TH.text : TH.textMuted }}>
          {mode === "idle" ? fmt(cfg.maxWorkMin * 60) : fmt(timeLeft)}
        </div>
        <div style={{ fontSize: 9, color: TH.goldDark, letterSpacing: 2, marginTop: 4 }}>
          {mode.toUpperCase()} · {sessions} SESSIONS
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {mode === "idle" ? (
          <button onClick={startWork} style={{ flex: 1, background: TH.gold, color: TH.bg, border: 'none', padding: '8px', borderRadius: 2, fontSize: 11, fontWeight: 'bold', cursor: 'pointer' }}>{t.start}</button>
        ) : (
          <button onClick={stopTimer} style={{ flex: 1, background: 'transparent', border: `1px solid ${TH.gold}`, color: TH.gold, padding: '8px', borderRadius: 2, fontSize: 11, cursor: 'pointer' }}>{t.stop}</button>
        )}
      </div>
      {restCredit > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${TH.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: TH.textMuted }}>REST: {Math.floor(restCredit / 60)}m</span>
          <button onClick={() => { setTimeLeft(prev => prev + restCredit); setRestCredit(0); if (mode !== "break") setMode("break"); setIsRunning(true); }}
            style={{ fontSize: 8, background: `${TH.gold}22`, border: `1px solid ${TH.goldDark}`, color: TH.gold, padding: '2px 6px', borderRadius: 1, cursor: 'pointer' }}>USE</button>
        </div>
      )}
    </div>
  );
}
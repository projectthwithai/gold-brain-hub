"use client";
import React, { useState, useEffect } from "react";
import { sendNotification, playBeepSound } from "../../utils/notification";

interface TacticalTimerProps {
  initialTask?: string;
  initialMinutes?: number;
}

export default function TacticalTimer({ initialTask = "数学 Deep Work", initialMinutes = 45 }: TacticalTimerProps) {
  const [taskName, setTaskName] = useState(initialTask);
  const [inputMinutes, setMinutes] = useState(initialMinutes);
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // 実際に作業した経過秒数
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work"); // 作業 or 休憩
  const [saveToRecord, setSaveToRecord] = useState(true);

  useEffect(() => {
    setTaskName(initialTask);
    setMinutes(initialMinutes);
    setTimeLeft(initialMinutes * 60);
    setElapsedSeconds(0);
    setTimerMode("work");
  }, [initialTask, initialMinutes]);

  // タイマーカウントダウン ＆ 経過時間カウント ＆ Wake Lock
  useEffect(() => {
    let interval: any = null;
    let wakeLock: any = null;

    if (isRunning && timeLeft > 0) {
      if ("wakeLock" in navigator) {
        (navigator as any).wakeLock.request("screen").then((lock: any) => { wakeLock = lock; }).catch(() => {});
      }

      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        if (timerMode === "work") {
          setElapsedSeconds((prev) => prev + 1); // 実作業時間をカウント
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (wakeLock) wakeLock.release();
    };
  }, [isRunning, timeLeft, timerMode]);

  // 好きなタイミングで「作業終了/停止」を押した時の1/5自動休憩計算ロジック
  const handleStopOrComplete = () => {
    setIsRunning(false);

    if (timerMode === "work") {
      // 実際に作業した秒数の 1/5 を計算 (最小1分/60秒保証)
      const calculatedBreakSeconds = Math.max(60, Math.floor(elapsedSeconds / 5));
      const breakMins = Math.floor(calculatedBreakSeconds / 60);

      sendNotification("【作業終了】休憩開始", `実作業時間: ${Math.floor(elapsedSeconds / 60)}分 ➔ 自動設定の休憩時間: ${breakMins}分`);
      playBeepSound();

      // 休憩モードへ自動切替
      setTimerMode("break");
      setTimeLeft(calculatedBreakSeconds);
    } else {
      // 休憩終了時 ➔ 再び作業モードへセット
      setTimerMode("work");
      setTimeLeft(inputMinutes * 60);
      setElapsedSeconds(0);
    }
  };

  const handleCustomTimeSet = (mins: number) => {
    setMinutes(mins);
    setTimeLeft(mins * 60);
    setElapsedSeconds(0);
    setIsRunning(false);
    setTimerMode("work");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ background: "#0d0d0d", border: `2px solid ${timerMode === "work" ? "#C9A84C" : "#22c55e"}`, borderRadius: "8px", padding: "20px", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h3 style={{ margin: 0, color: timerMode === "work" ? "#C9A84C" : "#22c55e", fontSize: "16px" }}>
          {timerMode === "work" ? "⏱️ 戦術的作業タイマー (動的ポモドーロ)" : "☕ 自動計算 1/5 休憩タイマー"}
        </h3>
        <span style={{ padding: "4px 8px", background: timerMode === "work" ? "#C9A84C" : "#22c55e", color: "#000", fontWeight: "bold", fontSize: "12px", borderRadius: "4px" }}>
          {timerMode === "work" ? "集中モード" : "休憩モード"}
        </span>
      </div>

      {/* 作業設定 ＆ 時間自由指定 */}
      {timerMode === "work" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="作業名を入力..."
              style={{ flex: 1, padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
            />
            <label style={{ fontSize: "12px", color: "#888", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
              <input type="checkbox" checked={saveToRecord} onChange={(e) => setSaveToRecord(e.target.checked)} />
              記録保存
            </label>
          </div>

          {/* 時間自由設定プリセットボタン */}
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#888" }}>時間指定:</span>
            {[15, 25, 45, 60, 90].map((m) => (
              <button
                key={m}
                onClick={() => handleCustomTimeSet(m)}
                style={{ padding: "4px 8px", background: inputMinutes === m ? "#C9A84C" : "#222", color: inputMinutes === m ? "#000" : "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
              >
                {m}分
              </button>
            ))}
          </div>
        </div>
      )}

      {/* タイマーカウント表示 */}
      <div style={{ fontSize: "52px", fontWeight: "bold", textAlign: "center", color: timerMode === "work" ? "#C9A84C" : "#22c55e", fontFamily: "monospace", margin: "15px 0" }}>
        {formatTime(timeLeft)}
      </div>

      {/* 経過時間表示 (作業時のみ) */}
      {timerMode === "work" && (
        <div style={{ textAlign: "center", fontSize: "12px", color: "#888", marginBottom: "15px" }}>
          実作業時間: <strong style={{ color: "#fff" }}>{Math.floor(elapsedSeconds / 60)}分 {elapsedSeconds % 60}秒</strong> （※停止時にこの 1/5 の時間【{Math.max(1, Math.floor(elapsedSeconds / 300))}分】が自動休憩に設定されます）
        </div>
      )}

      {/* 操作ボタン */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button
          onClick={() => setIsRunning(!isRunning)}
          style={{ padding: "10px 24px", background: isRunning ? "#e11d48" : (timerMode === "work" ? "#C9A84C" : "#22c55e"), color: isRunning ? "#fff" : "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
        >
          {isRunning ? "一時停止" : (timerMode === "work" ? "集中開始" : "休憩開始")}
        </button>

        {/* 好きなタイミングで押せる作業終了 / 1/5 休憩発動ボタン */}
        <button
          onClick={handleStopOrComplete}
          style={{ padding: "10px 16px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
        >
          {timerMode === "work" ? "作業終了 ➔ 自動1/5休憩へ" : "休憩終了 ➔ 次の作業へ"}
        </button>
      </div>
    </div>
  );
}
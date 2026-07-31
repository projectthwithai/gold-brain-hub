"use client";
import React, { useState, useEffect } from "react";
import { sendNotification, playBeepSound } from "../../utils/notification";

interface TacticalTimerProps {
  initialTask?: string;
  initialMinutes?: number;
}

export default function TacticalTimer({ initialTask = "数学 Deep Work", initialMinutes = 45 }: TacticalTimerProps) {
  const [taskName, setTaskName] = useState(initialTask);
  const [customMins, setCustomMins] = useState(initialMinutes); // 自由入力の時間(分)
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // 実作業時間
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");
  const [saveToRecord, setSaveToRecord] = useState(true);

  useEffect(() => {
    setTaskName(initialTask);
    setCustomMins(initialMinutes);
    setTimeLeft(initialMinutes * 60);
    setElapsedSeconds(0);
    setTimerMode("work");
  }, [initialTask, initialMinutes]);

  // 手動で時間を直接入力変更した時
  const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCustomMins(val);
    setTimeLeft(val * 60);
    setElapsedSeconds(0);
    setIsRunning(false);
    setTimerMode("work");
  };

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
          setElapsedSeconds((prev) => prev + 1);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (wakeLock) wakeLock.release();
    };
  }, [isRunning, timeLeft, timerMode]);

  // 作業停止時の 1/5 自動計算ポモドーロ機能
  const handleStopOrComplete = () => {
    setIsRunning(false);

    if (timerMode === "work") {
      const calculatedBreakSeconds = Math.max(60, Math.floor(elapsedSeconds / 5));
      const breakMins = Math.floor(calculatedBreakSeconds / 60);

      sendNotification("【作業完了】1/5自動休憩開始", `実作業: ${Math.floor(elapsedSeconds / 60)}分 ➔ 休憩設定: ${breakMins}分`);
      playBeepSound();

      setTimerMode("break");
      setTimeLeft(calculatedBreakSeconds);
    } else {
      setTimerMode("work");
      setTimeLeft(customMins * 60);
      setElapsedSeconds(0);
    }
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
          {timerMode === "work" ? "⏱️ 戦術的タイマー (完全自由時間設定)" : "☕ 自動計算 1/5 休憩タイマー"}
        </h3>
        <span style={{ padding: "4px 8px", background: timerMode === "work" ? "#C9A84C" : "#22c55e", color: "#000", fontWeight: "bold", fontSize: "12px", borderRadius: "4px" }}>
          {timerMode === "work" ? "集中モード" : "休憩モード"}
        </span>
      </div>

      {/* 固定選択肢全撤去！ 自由時間入力フォーム */}
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

          {/* 指揮官指示：自由時間入力インプット */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#151515", padding: "10px", borderRadius: "4px" }}>
            <span style={{ fontSize: "13px", color: "#C9A84C", fontWeight: "bold" }}>⚙️ 目標作業時間を自分で設定 (分):</span>
            <input
              type="number"
              min="1"
              max="300"
              value={customMins}
              onChange={handleCustomTimeChange}
              style={{ width: "80px", padding: "6px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", fontSize: "16px", fontWeight: "bold", textAlign: "center" }}
            />
            <span style={{ fontSize: "13px", color: "#ccc" }}>分</span>
          </div>
        </div>
      )}

      {/* カウント表示 */}
      <div style={{ fontSize: "52px", fontWeight: "bold", textAlign: "center", color: timerMode === "work" ? "#C9A84C" : "#22c55e", fontFamily: "monospace", margin: "15px 0" }}>
        {formatTime(timeLeft)}
      </div>

      {timerMode === "work" && (
        <div style={{ textAlign: "center", fontSize: "12px", color: "#888", marginBottom: "15px" }}>
          実作業時間: <strong style={{ color: "#fff" }}>{Math.floor(elapsedSeconds / 60)}分 {elapsedSeconds % 60}秒</strong> （※停止時にこの 1/5 の時間【{Math.max(1, Math.floor(elapsedSeconds / 300))}分】が自動休憩にセットされます）
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
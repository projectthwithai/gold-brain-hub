"use client";
import React, { useState, useEffect } from "react";

interface TacticalTimerProps {
  initialTask?: string;
  initialMinutes?: number;
}

const DEFAULT_PRESETS = [
  "数学 Deep Work",
  "英語 SVOC 精読",
  "現代文 論理デバッグ",
  "プログラミング",
  "肉体兵站筋トレ",
];

export default function TacticalTimer({ initialTask = "数学 Deep Work", initialMinutes = 45 }: TacticalTimerProps) {
  const [presets, setPresets] = useState<string[]>(DEFAULT_PRESETS);
  const [newPresetInput, setNewPresetInput] = useState("");
  const [taskName, setTaskName] = useState(initialTask);
  const [customMins, setCustomMins] = useState(initialMinutes);
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");
  const [saveToRecord, setSaveToRecord] = useState(true);

  // コンポーネント内直接呼び出し型：ブラウザ通知機能
  const triggerNotification = (title: string, body: string) => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(title, { body });
          }
        });
      }
    }
  };

  // コンポーネント内直接呼び出し型：電子アラート音再生機能 (Web Audio API)
  const triggerBeepSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 (880Hz) 高音ビープ
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // AudioContextブロック時のフォールバック
    }
  };

  useEffect(() => {
    setTaskName(initialTask);
    setCustomMins(initialMinutes);
    setTimeLeft(initialMinutes * 60);
    setElapsedSeconds(0);
    setTimerMode("work");
  }, [initialTask, initialMinutes]);

  const handleAddPreset = () => {
    if (!newPresetInput.trim()) return;
    if (!presets.includes(newPresetInput.trim())) {
      setPresets([...presets, newPresetInput.trim()]);
    }
    setTaskName(newPresetInput.trim());
    setNewPresetInput("");
  };

  const handleDeletePreset = (presetToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (presets.length <= 1) return;
    setPresets(presets.filter((p) => p !== presetToDelete));
    if (taskName === presetToDelete) {
      setTaskName(presets.filter((p) => p !== presetToDelete)[0]);
    }
  };

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

      triggerNotification("【作業完了】1/5自動休憩開始", `実作業: ${Math.floor(elapsedSeconds / 60)}分 ➔ 休憩設定: ${breakMins}分`);
      triggerBeepSound();

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
          {timerMode === "work" ? "⏱️ 戦術的タイマー (項目作成・選択式)" : "☕ 自動計算 1/5 休憩タイマー"}
        </h3>
        <span style={{ padding: "4px 8px", background: timerMode === "work" ? "#C9A84C" : "#22c55e", color: "#000", fontWeight: "bold", fontSize: "12px", borderRadius: "4px" }}>
          {timerMode === "work" ? "集中モード" : "休憩モード"}
        </span>
      </div>

      {timerMode === "work" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "15px" }}>
          
          {/* 選択肢（プリセット）の新規作成フォーム */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="新しいタイマー項目名を入力して追加..."
              value={newPresetInput}
              onChange={(e) => setNewPresetInput(e.target.value)}
              style={{ flex: 1, padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: "4px", fontSize: "13px" }}
            />
            <button
              onClick={handleAddPreset}
              style={{ padding: "8px 14px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
            >
              ＋ 選択肢作成
            </button>
          </div>

          {/* 選択肢一覧 */}
          <div>
            <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "6px" }}>タイマー項目の選択肢:</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {presets.map((p) => (
                <div
                  key={p}
                  onClick={() => setTaskName(p)}
                  style={{
                    padding: "6px 12px",
                    background: taskName === p ? "#C9A84C" : "#1a1a1a",
                    color: taskName === p ? "#000" : "#ccc",
                    border: `1px solid ${taskName === p ? "#C9A84C" : "#333"}`,
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>{p}</span>
                  <span
                    onClick={(e) => handleDeletePreset(p, e)}
                    style={{ color: taskName === p ? "#000" : "#e11d48", fontWeight: "bold", marginLeft: "4px", padding: "0 2px" }}
                    title="この選択肢を削除"
                  >
                    ✕
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 自由時間入力 ＆ 記録保存トグル */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#151515", padding: "10px", borderRadius: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: "#C9A84C", fontWeight: "bold" }}>目標時間:</span>
              <input
                type="number"
                min="1"
                max="300"
                value={customMins}
                onChange={handleCustomTimeChange}
                style={{ width: "70px", padding: "4px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", fontSize: "15px", fontWeight: "bold", textAlign: "center" }}
              />
              <span style={{ fontSize: "13px", color: "#ccc" }}>分</span>
            </div>

            <label style={{ fontSize: "12px", color: "#888", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
              <input type="checkbox" checked={saveToRecord} onChange={(e) => setSaveToRecord(e.target.checked)} />
              記録へ保存
            </label>
          </div>
        </div>
      )}

      {/* カウント表示 */}
      <div style={{ fontSize: "52px", fontWeight: "bold", textAlign: "center", color: timerMode === "work" ? "#C9A84C" : "#22c55e", fontFamily: "monospace", margin: "15px 0" }}>
        {formatTime(timeLeft)}
      </div>

      {timerMode === "work" && (
        <div style={{ textAlign: "center", fontSize: "12px", color: "#888", marginBottom: "15px" }}>
          ターゲット: <strong style={{ color: "#C9A84C" }}>{taskName}</strong> ｜ 実作業: <strong style={{ color: "#fff" }}>{Math.floor(elapsedSeconds / 60)}分 {elapsedSeconds % 60}秒</strong> （※停止で 1/5 休憩発動）
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
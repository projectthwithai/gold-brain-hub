"use client";
import React, { useState, useEffect, useRef } from "react";
import { sendNotification, playBeepSound } from "../../utils/notification";

export type AlarmMode = "silent" | "once" | "loop";

export interface TimerPreset {
  id: string;
  name: string;
  taskCategory: string;
  workMinutes: number;
  ratioWorkToBreak: number;
  hasMidAlert: boolean;
  midAlertMinutesList: number[]; // 例: [10, 20, 30] (開始から10分後、20分後、30分後に鳴らす)
  alarmMode: AlarmMode;
}

const INITIAL_TIMER_PRESETS: TimerPreset[] = [
  { id: "p1", name: "標準 Deep Work (50分/10分)", taskCategory: "数学 Deep Work", workMinutes: 50, ratioWorkToBreak: 5, hasMidAlert: true, midAlertMinutesList: [25, 45], alarmMode: "once" },
  { id: "p2", name: "短期スプリント (25分/5分)", taskCategory: "英語 SVOC 精読", workMinutes: 25, ratioWorkToBreak: 5, hasMidAlert: false, midAlertMinutesList: [15], alarmMode: "loop" },
];

export interface TaskOption {
  id: string;
  label: string;
}

const INITIAL_TASK_OPTIONS: TaskOption[] = [
  { id: "t1", label: "数学 Deep Work" },
  { id: "t2", label: "英語 SVOC 精読" },
  { id: "t3", label: "現代文 論理デバッグ" },
  { id: "t4", label: "プログラミング" },
  { id: "t5", label: "肉体兵站筋トレ" },
];

interface TacticalTimerProps {
  initialTask?: string;
  initialMinutes?: number;
}

export default function TacticalTimer({ initialTask, initialMinutes }: TacticalTimerProps) {
  const [taskOptions, setTaskOptions] = useState<TaskOption[]>(INITIAL_TASK_OPTIONS);
  const [newTaskOptInput, setNewTaskOptInput] = useState("");
  const [editingTaskOpt, setEditingTaskOpt] = useState<TaskOption | null>(null);
  const [isManagingTaskOpts, setIsManagingTaskOpts] = useState(false);

  const [timerPresets, setTimerPresets] = useState<TimerPreset[]>(INITIAL_TIMER_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("p1");
  const [editingPreset, setEditingPreset] = useState<TimerPreset | null>(null);
  const [isCreatingPreset, setIsCreatingPreset] = useState(false);

  const [newPreset, setNewPreset] = useState<Omit<TimerPreset, "id">>({
    name: "カスタムタイマー",
    taskCategory: "数学 Deep Work",
    workMinutes: 45,
    ratioWorkToBreak: 5,
    hasMidAlert: true,
    midAlertMinutesList: [15, 30],
    alarmMode: "once"
  });

  // ★追加: アラート分数の一時入力用 State★
  const [midAlertInput, setMidAlertInput] = useState<number | "">(10);

  const activePreset = timerPresets.find((p) => p.id === selectedPresetId) || timerPresets[0];
  const [currentTaskCategory, setCurrentTaskCategory] = useState(initialTask || activePreset.taskCategory);
  const [timeLeft, setTimeLeft] = useState((initialMinutes || activePreset.workMinutes) * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // ★実際の稼働秒数を正確にカウント★
  const [isRunning, setIsRunning] = useState(false);
  // ★要件4: 休憩時間の温存（繰り越し・加算）機能用 State★
  const [enableBreakCarryover, setEnableBreakCarryover] = useState<boolean>(true); // 機能の ON/OFF
  const [savedBreakSeconds, setSavedBreakSeconds] = useState<number>(0); // 温存された休憩プール(秒)
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");
  const [isLoopAlarmRinging, setIsLoopAlarmRinging] = useState(false);

  const loopAudioIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (initialTask) setCurrentTaskCategory(initialTask);
    if (initialMinutes) setTimeLeft(initialMinutes * 60);
    setElapsedSeconds(0);
  }, [initialTask, initialMinutes]);

  const playBeep = (isShort = true) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(isShort ? 880 : 587, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (isShort ? 0.3 : 1.2));
    } catch (e) {}
  };

  const stopLoopAlarm = () => {
    if (loopAudioIntervalRef.current) {
      clearInterval(loopAudioIntervalRef.current);
      loopAudioIntervalRef.current = null;
    }
    setIsLoopAlarmRinging(false);
  };

  const handleSelectPreset = (presetId: string) => {
    stopLoopAlarm();
    setSelectedPresetId(presetId);
    const p = timerPresets.find((x) => x.id === presetId) || timerPresets[0];
    setCurrentTaskCategory(p.taskCategory);
    setTimeLeft(p.workMinutes * 60);
    setElapsedSeconds(0);
    setIsRunning(false);
    setTimerMode("work");
  };

  // ★要件完全修正: 予定時間ではなく【実際の稼働時間(elapsedSeconds)】に対して 5:1 (設定比率) の自動休憩時間を算出★
  // ★要件3 & 4: 端数繰り上げお得休憩計算 ＆ 未消化休憩の温存プール加算★
  const handleStopOrComplete = () => {
    setIsRunning(false);
    stopLoopAlarm();

    if (timerMode === "work") {
      // 1. 端数繰り上げ（5分0秒➔1分, 5分1秒➔2分）で休憩秒数を計算
      const ratioSec = activePreset.ratioWorkToBreak * 60;
      const newBreakSeconds = Math.max(60, Math.ceil(elapsedSeconds / ratioSec) * 60);

      // 2. 温存プールからの加算
      const carryover = enableBreakCarryover ? savedBreakSeconds : 0;
      const totalBreakSeconds = newBreakSeconds + carryover;

      const actualWorkedMins = Math.floor(elapsedSeconds / 60);
      const totalBreakMins = Math.floor(totalBreakSeconds / 60);

      sendNotification(
        "【作業完了】お得1/5自動休憩開始",
        `実作業: ${actualWorkedMins}分${elapsedSeconds % 60}秒 ➔ 休憩: ${totalBreakMins}分${carryover > 0 ? ` (温存分 ${Math.floor(carryover / 60)}分${carryover % 60}秒 加算!)` : ""}`
      );
      playBeep(true);

      // プール分を消費
      if (enableBreakCarryover && savedBreakSeconds > 0) {
        setSavedBreakSeconds(0);
      }

      setTimerMode("break");
      setTimeLeft(totalBreakSeconds);
    } else {
      // 3. 休憩モードから作業に戻る際、未消化の休憩時間をプールに温存！
      if (enableBreakCarryover && timeLeft > 0) {
        setSavedBreakSeconds((prev) => prev + timeLeft);
      }

      setTimerMode("work");
      setTimeLeft(activePreset.workMinutes * 60);
      setElapsedSeconds(0);
    }
  };

  // タイマーカウントダウン ＆ 稼働秒数カウント ＆ 自動1/5休憩計算
  useEffect(() => {
    let interval: any = null;
    let wakeLock: any = null;

    if (isRunning && timeLeft > 0) {
      if ("wakeLock" in navigator) {
        (navigator as any).wakeLock.request("screen").then((lock: any) => { wakeLock = lock; }).catch(() => {});
      }

      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const nextSec = prev - 1;

          // 実作業時間を秒単位で正確に加算カウント
          if (timerMode === "work") {
            setElapsedSeconds((e) => e + 1);
          }

          // 中間アラート音（開始から〇分経過時に判定）
          if (timerMode === "work" && activePreset.hasMidAlert && activePreset.midAlertMinutesList) {
            const currentWorkedSec = elapsedSeconds + 1;
            if (currentWorkedSec > 0 && currentWorkedSec % 60 === 0) {
              const currentWorkedMins = currentWorkedSec / 60;
              if (activePreset.midAlertMinutesList.includes(currentWorkedMins)) {
                playBeep(true);
              }
            }
          }

          // タイマー完走 (0秒到達) 時の処理
          if (nextSec <= 0) {
            setIsRunning(false);

            if (activePreset.alarmMode === "once") {
              playBeep(true);
            } else if (activePreset.alarmMode === "loop") {
              setIsLoopAlarmRinging(true);
              loopAudioIntervalRef.current = setInterval(() => playBeep(false), 1500);
            }

            if (timerMode === "work") {
              // 完走時も端数繰り上げ＆温存分を加算！
              const ratioSec = activePreset.ratioWorkToBreak * 60;
              const newBreakSeconds = Math.max(60, Math.ceil((elapsedSeconds + 1) / ratioSec) * 60);
              const carryover = enableBreakCarryover ? savedBreakSeconds : 0;
              const totalBreakSeconds = newBreakSeconds + carryover;

              if (enableBreakCarryover && savedBreakSeconds > 0) {
                setSavedBreakSeconds(0);
              }

              setTimerMode("break");
              return totalBreakSeconds;
            } else {
              setTimerMode("work");
              setElapsedSeconds(0);
              return activePreset.workMinutes * 60;
            }
          }

          return nextSec;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (wakeLock) wakeLock.release();
    };
  }, [isRunning, timeLeft, timerMode, activePreset, elapsedSeconds, enableBreakCarryover, savedBreakSeconds]);
  const handleAddTaskOption = () => {
    if (!newTaskOptInput.trim()) return;
    const newOpt: TaskOption = { id: `t_${Date.now()}`, label: newTaskOptInput.trim() };
    setTaskOptions([...taskOptions, newOpt]);
    setCurrentTaskCategory(newTaskOptInput.trim());
    setNewTaskOptInput("");
  };

  const handleSaveTaskOptEdit = () => {
    if (!editingTaskOpt) return;
    setTaskOptions(taskOptions.map((x) => (x.id === editingTaskOpt.id ? editingTaskOpt : x)));
    setEditingTaskOpt(null);
  };

  const handleDeletePreset = (id: string) => {
    if (timerPresets.length <= 1) return;
    const updated = timerPresets.filter((p) => p.id !== id);
    setTimerPresets(updated);
    if (selectedPresetId === id) {
      setSelectedPresetId(updated[0].id);
    }
    setEditingPreset(null);
  };

  const handleSavePreset = () => {
    if (isCreatingPreset) {
      const item: TimerPreset = { ...newPreset, id: `p_${Date.now()}` };
      setTimerPresets([...timerPresets, item]);
      setSelectedPresetId(item.id);
      setIsCreatingPreset(false);
    } else if (editingPreset) {
      setTimerPresets(timerPresets.map((p) => (p.id === editingPreset.id ? editingPreset : p)));
      setEditingPreset(null);
    }
  };

  return (
    <div style={{ background: "#0d0d0d", border: `2px solid ${timerMode === "work" ? "#C9A84C" : "#22c55e"}`, borderRadius: "8px", padding: "20px", color: "#fff" }}>
      
      {isLoopAlarmRinging && (
        <div style={{ background: "#e11d48", padding: "12px", borderRadius: "6px", marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", fontWeight: "bold" }}>
          <span>🔔 アラームが鳴り響いています！</span>
          <button onClick={stopLoopAlarm} style={{ padding: "6px 16px", background: "#fff", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
            ⏹️ アラーム停止
          </button>
        </div>
      )}

      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, color: timerMode === "work" ? "#C9A84C" : "#22c55e", fontSize: "16px" }}>
          {timerMode === "work" ? "⏱️ 戦術的タイマー (実稼働1/5動的ポモドーロ計算)" : "☕ 自動計算 1/5 休憩タイマー"}
        </h3>

        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setIsManagingTaskOpts(true)} style={{ padding: "6px 12px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>
            🏷️ 作業選択肢の管理
          </button>
          <button onClick={() => setIsCreatingPreset(true)} style={{ padding: "6px 12px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}>
            ＋ 新規タイマー作成
          </button>
        </div>
      </div>

      {/* タイマー切り替えタブ */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px", flexWrap: "wrap" }}>
        {timerPresets.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center" }}>
            <button
              onClick={() => handleSelectPreset(p.id)}
              style={{
                padding: "8px 14px",
                background: selectedPresetId === p.id ? (timerMode === "work" ? "#C9A84C" : "#22c55e") : "#1a1a1a",
                color: selectedPresetId === p.id ? "#000" : "#888",
                border: `1px solid ${selectedPresetId === p.id ? (timerMode === "work" ? "#C9A84C" : "#22c55e") : "#333"}`,
                borderRadius: "4px 0 0 4px",
                fontWeight: "bold",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              {p.name}
            </button>
            <button
              onClick={() => setEditingPreset(p)}
              style={{ padding: "8px 8px", background: "#1a1a1a", color: "#3b82f6", border: "1px solid #333", borderLeft: "none", borderRadius: "0 4px 4px 0", cursor: "pointer", fontSize: "12px" }}
              title="タイマー設定を編集・削除"
            >
              ⚙️
            </button>
          </div>
        ))}
      </div>

      {/* 作業項目の選択肢ドロップダウン選択 */}
      {timerMode === "work" && (
        <div style={{ background: "#151515", padding: "12px", borderRadius: "6px", marginBottom: "15px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: "#C9A84C", fontWeight: "bold" }}>🎯 作業項目を選択:</span>
          <select
            value={currentTaskCategory}
            onChange={(e) => setCurrentTaskCategory(e.target.value)}
            style={{ flex: 1, padding: "8px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", fontWeight: "bold" }}
          >
            {taskOptions.map((opt) => (
              <option key={opt.id} value={opt.label}>{opt.label}</option>
            ))}
          </select>

          <div style={{ fontSize: "12px", color: "#aaa" }}>
            設定比率: <strong>{activePreset.ratioWorkToBreak} : 1</strong>
          </div>
        </div>
      )}

      {/* カウント表示 */}
      <div style={{ fontSize: "56px", fontWeight: "bold", textAlign: "center", color: timerMode === "work" ? "#C9A84C" : "#22c55e", fontFamily: "monospace", margin: "15px 0" }}>
        {`${Math.floor(timeLeft / 60).toString().padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`}
      </div>

      {/* ⏱️ 実作業時間 ＆ 端数繰り上げお得休憩のリアルタイム表示 */}
      {timerMode === "work" && (
        <div style={{ textAlign: "center", fontSize: "13px", color: "#aaa", marginBottom: "15px", background: "#111", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
          <span>⏱️ 現在の実作業時間: <strong style={{ color: "#C9A84C", fontSize: "16px" }}>{Math.floor(elapsedSeconds / 60)}分 {elapsedSeconds % 60}秒</strong></span>
          <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
            💡 今停止した場合のお得休憩: <strong style={{ color: "#22c55e", fontSize: "14px" }}>{Math.max(1, Math.ceil(elapsedSeconds / (activePreset.ratioWorkToBreak * 60)))} 分</strong>
            {enableBreakCarryover && savedBreakSeconds > 0 && (
              <span style={{ color: "#38bdf8", marginLeft: "8px", fontWeight: "bold" }}>
                (＋温存プール {Math.floor(savedBreakSeconds / 60)}分{savedBreakSeconds % 60}秒 加算予定!)
              </span>
            )}
          </div>
        </div>
      )}

      {/* パラメータ状態バッジ表示 ＆ 🎒 休憩温存モードトグル */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", fontSize: "12px", color: "#888", marginBottom: "20px", flexWrap: "wrap" }}>
        <span>🔔 中間アラート: <strong style={{ color: activePreset.hasMidAlert ? "#C9A84C" : "#555" }}>{activePreset.hasMidAlert && activePreset.midAlertMinutesList?.length > 0 ? `${activePreset.midAlertMinutesList.join("分, ")}分経過時` : "OFF"}</strong></span>
        <span>🔊 アラーム: <strong style={{ color: "#C9A84C" }}>{activePreset.alarmMode === "silent" ? "無音" : activePreset.alarmMode === "once" ? "1回だけ" : "連射停止"}</strong></span>

        {/* 🎒 休憩温存機能トグル＆プール状態 */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#181818", padding: "4px 8px", borderRadius: "4px", border: "1px solid #333" }}>
          <span style={{ color: enableBreakCarryover ? "#38bdf8" : "#666", fontWeight: "bold" }}>
            🎒 休憩温存: {enableBreakCarryover ? "ON" : "OFF"}
          </span>
          <button
            type="button"
            onClick={() => setEnableBreakCarryover(!enableBreakCarryover)}
            style={{ padding: "2px 6px", background: enableBreakCarryover ? "#0284c7" : "#333", color: "#fff", border: "none", borderRadius: "3px", fontSize: "10px", cursor: "pointer", fontWeight: "bold" }}
          >
            切替
          </button>
          {enableBreakCarryover && (
            <span style={{ color: "#7dd3fc", fontWeight: "bold", marginLeft: "4px" }}>
              (プール: {Math.floor(savedBreakSeconds / 60)}分{savedBreakSeconds % 60}秒)
            </span>
          )}
        </div>
      </div>

      {/* 操作ボタン */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button onClick={() => setIsRunning(!isRunning)} style={{ padding: "12px 28px", background: isRunning ? "#e11d48" : (timerMode === "work" ? "#C9A84C" : "#22c55e"), color: isRunning ? "#fff" : "#000", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>
          {isRunning ? "一時停止" : (timerMode === "work" ? "集中開始" : "休憩開始")}
        </button>
        <button onClick={handleStopOrComplete} style={{ padding: "12px 20px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
          作業完了 ➔ 実作業の1/5自動休憩へ
        </button>
      </div>

      {/* モーダル群 (作業選択肢管理 ＆ タイマー設定) */}
      {isManagingTaskOpts && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>🏷️ 作業選択肢の【追加・編集・削除】</h4>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="新しい作業名 (例: 物理演習)..."
                value={newTaskOptInput}
                onChange={(e) => setNewTaskOptInput(e.target.value)}
                style={{ flex: 1, padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
              />
              <button onClick={handleAddTaskOption} style={{ padding: "8px 14px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
                ＋追加
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
              {taskOptions.map((opt) => (
                <div key={opt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d0d0d", padding: "8px 12px", borderRadius: "4px", border: "1px solid #222" }}>
                  {editingTaskOpt?.id === opt.id ? (
                    <div style={{ display: "flex", gap: "6px", flex: 1 }}>
                      <input
                        type="text"
                        value={editingTaskOpt.label}
                        onChange={(e) => setEditingTaskOpt({ ...editingTaskOpt, label: e.target.value })}
                        style={{ flex: 1, padding: "4px", background: "#1a1a1a", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px" }}
                      />
                      <button onClick={handleSaveTaskOptEdit} style={{ padding: "4px 8px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold" }}>保存</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: "bold", fontSize: "14px" }}>{opt.label}</span>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => setEditingTaskOpt(opt)} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "12px" }}>✏️ 編集</button>
                        {taskOptions.length > 1 && (
                          <button onClick={() => setTaskOptions(taskOptions.filter((x) => x.id !== opt.id))} style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer", fontSize: "12px" }}>🗑️ 削除</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setIsManagingTaskOpts(false)} style={{ marginTop: "10px", padding: "10px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
              完了
            </button>
          </div>
        </div>
      )}

      {(isCreatingPreset || editingPreset) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "380px", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>{isCreatingPreset ? "＋ 新規タイマー種類作成" : "⚙️ タイマー種類の編集・削除"}</h4>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>タイマー名:</span>
              <input
                type="text"
                value={isCreatingPreset ? newPreset.name : editingPreset?.name || ""}
                onChange={(e) => isCreatingPreset ? setNewPreset({ ...newPreset, name: e.target.value }) : editingPreset && setEditingPreset({ ...editingPreset, name: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            {/* 作業時間 (分) - 0が残らない入力改善済み */}
            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>作業時間 (分):</span>
              <input
                type="number" min="1" max="300"
                value={isCreatingPreset ? (newPreset.workMinutes || "") : (editingPreset?.workMinutes || "")}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                  if (isCreatingPreset) setNewPreset({ ...newPreset, workMinutes: val });
                  else if (editingPreset) setEditingPreset({ ...editingPreset, workMinutes: val });
                }}
                placeholder="45"
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#C9A84C", borderRadius: "4px", fontWeight: "bold", boxSizing: "border-box" }}
              />
            </div>

            {/* 作業:休憩の比率 - 0が残らない入力改善済み */}
            <div style={{ background: "#0d0d0d", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
              <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold", display: "block", marginBottom: "6px" }}>⚖️ 作業:休憩の比率 (デフォルト 5:1):</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                <span>実作業時間分に対して 1/</span>
                <input
                  type="number" min="1" max="10"
                  value={isCreatingPreset ? (newPreset.ratioWorkToBreak || "") : (editingPreset?.ratioWorkToBreak || "")}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                    if (isCreatingPreset) setNewPreset({ ...newPreset, ratioWorkToBreak: val });
                    else if (editingPreset) setEditingPreset({ ...editingPreset, ratioWorkToBreak: val });
                  }}
                  placeholder="5"
                  style={{ width: "60px", padding: "6px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }}
                />
                <span>を自動休憩にする</span>
              </div>
            </div>

            {/* 複数中間アラート設定UI */}
            <div style={{ background: "#0d0d0d", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold" }}>🔔 中間アラート音 (開始から〇分経過時に通知):</span>
                <label style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <input
                    type="checkbox"
                    checked={isCreatingPreset ? newPreset.hasMidAlert : editingPreset?.hasMidAlert || false}
                    onChange={(e) => isCreatingPreset ? setNewPreset({ ...newPreset, hasMidAlert: e.target.checked }) : editingPreset && setEditingPreset({ ...editingPreset, hasMidAlert: e.target.checked })}
                  />
                  使用する
                </label>
              </div>

              {(isCreatingPreset ? newPreset.hasMidAlert : editingPreset?.hasMidAlert) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>開始から</span>
                    <input
                      type="number" min="1" max="300"
                      value={midAlertInput}
                      onChange={(e) => setMidAlertInput(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="10"
                      style={{ width: "60px", padding: "4px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center" }}
                    />
                    <span>分経過時に鳴らす</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof midAlertInput !== "number" || midAlertInput <= 0) return;
                        if (isCreatingPreset) {
                          const current = newPreset.midAlertMinutesList || [];
                          if (!current.includes(midAlertInput)) {
                            setNewPreset({ ...newPreset, midAlertMinutesList: [...current, midAlertInput].sort((a, b) => a - b) });
                          }
                        } else if (editingPreset) {
                          const current = editingPreset.midAlertMinutesList || [];
                          if (!current.includes(midAlertInput)) {
                            setEditingPreset({ ...editingPreset, midAlertMinutesList: [...current, midAlertInput].sort((a, b) => a - b) });
                          }
                        }
                      }}
                      style={{ padding: "4px 8px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "11px" }}
                    >
                      ＋追加
                    </button>
                  </div>

                  {/* 設定済みのアラート分数タグ一覧 */}
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {((isCreatingPreset ? newPreset.midAlertMinutesList : editingPreset?.midAlertMinutesList) || []).map((m) => (
                      <span key={m} style={{ fontSize: "11px", background: "#222", color: "#fdba74", padding: "2px 6px", borderRadius: "3px", border: "1px solid #f97316", display: "flex", alignItems: "center", gap: "4px" }}>
                        🔔 {m}分後
                        <button
                          type="button"
                          onClick={() => {
                            if (isCreatingPreset) {
                              setNewPreset({ ...newPreset, midAlertMinutesList: newPreset.midAlertMinutesList.filter((x) => x !== m) });
                            } else if (editingPreset) {
                              setEditingPreset({ ...editingPreset, midAlertMinutesList: editingPreset.midAlertMinutesList.filter((x) => x !== m) });
                            }
                          }}
                          style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "bold" }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: "#0d0d0d", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
              <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold", display: "block", marginBottom: "6px" }}>🔊 アラームモード:</span>
              <div style={{ display: "flex", gap: "6px" }}>
                {[
                  { id: "silent", label: "無音" },
                  { id: "once", label: "1回だけ" },
                  { id: "loop", label: "連射停止" },
                ].map((a) => {
                  const active = (isCreatingPreset ? newPreset.alarmMode : editingPreset?.alarmMode) === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => isCreatingPreset ? setNewPreset({ ...newPreset, alarmMode: a.id as any }) : editingPreset && setEditingPreset({ ...editingPreset, alarmMode: a.id as any })}
                      style={{
                        flex: 1, padding: "6px 0",
                        background: active ? "#C9A84C" : "#1a1a1a",
                        color: active ? "#000" : "#888",
                        border: "1px solid #C9A84C",
                        borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer"
                      }}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button onClick={handleSavePreset} style={{ flex: 1, padding: "10px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>保存する</button>

              {editingPreset && timerPresets.length > 1 && (
                <button onClick={() => handleDeletePreset(editingPreset.id)} style={{ padding: "10px 14px", background: "#e11d48", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
                  🗑️ 削除
                </button>
              )}

              <button onClick={() => { setIsCreatingPreset(false); setEditingPreset(null); }} style={{ padding: "10px 14px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
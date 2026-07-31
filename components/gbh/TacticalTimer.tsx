"use client";
import React, { useState, useEffect, useRef } from "react";

export type AlarmMode = "silent" | "once" | "loop";

// タイマープロファイル型
export interface TimerPreset {
  id: string;
  name: string;                   // プロファイル名 (例: "数学90分戦")
  taskCategory: string;           // 選択作業項目 (例: "数学 Deep Work")
  workMinutes: number;            // 作業時間 (分)
  ratioWorkToBreak: number;       // 作業:休憩比率 (デフォルト 5 ➔ 5:1)
  hasMidAlert: boolean;           // 中間アラート使用
  midAlertMinutesBeforeEnd: number;// 残り何分前で1回鳴らすか (例: 5)
  alarmMode: AlarmMode;           // アラームタイプ (無音/1回/連射)
}

// 作業項目選択肢型
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

const INITIAL_TIMER_PRESETS: TimerPreset[] = [
  { id: "p1", name: "標準 Deep Work (50分/10分)", taskCategory: "数学 Deep Work", workMinutes: 50, ratioWorkToBreak: 5, hasMidAlert: true, midAlertMinutesBeforeEnd: 5, alarmMode: "once" },
  { id: "p2", name: "短期スプリント (25分/5分)", taskCategory: "英語 SVOC 精読", workMinutes: 25, ratioWorkToBreak: 5, hasMidAlert: false, midAlertMinutesBeforeEnd: 3, alarmMode: "loop" },
];

interface TacticalTimerProps {
  initialTask?: string;
  initialMinutes?: number;
}

export default function TacticalTimer({ initialTask, initialMinutes }: TacticalTimerProps) {
  // 作業項目選択肢
  const [taskOptions, setTaskOptions] = useState<TaskOption[]>(INITIAL_TASK_OPTIONS);
  const [newTaskOptInput, setNewTaskOptInput] = useState("");
  const [isManagingTaskOpts, setIsManagingTaskOpts] = useState(false);

  // タイマープロファイルマルチ管理
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
    midAlertMinutesBeforeEnd: 5,
    alarmMode: "once"
  });

  const activePreset = timerPresets.find((p) => p.id === selectedPresetId) || timerPresets[0];
  const [currentTaskCategory, setCurrentTaskCategory] = useState(initialTask || activePreset.taskCategory);
  const [timeLeft, setTimeLeft] = useState((initialMinutes || activePreset.workMinutes) * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");
  const [isLoopAlarmRinging, setIsLoopAlarmRinging] = useState(false);

  const loopAudioIntervalRef = useRef<any>(null);

  // 外部からの初期値受け取り (クイックタイマー連動)
  useEffect(() => {
    if (initialTask) setCurrentTaskCategory(initialTask);
    if (initialMinutes) setTimeLeft(initialMinutes * 60);
  }, [initialTask, initialMinutes]);

  // 音声再生 (Web Audio API)
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
    setIsRunning(false);
    setTimerMode("work");
  };

  // ★修復箇所: 作業完了 / 1/5自動休憩移行処理関数★
  const handleStopOrComplete = () => {
    setIsRunning(false);
    stopLoopAlarm();

    if (timerMode === "work") {
      const breakMins = Math.max(1, Math.floor(activePreset.workMinutes / activePreset.ratioWorkToBreak));
      setTimerMode("break");
      setTimeLeft(breakMins * 60);
      playBeep(true);
    } else {
      setTimerMode("work");
      setTimeLeft(activePreset.workMinutes * 60);
    }
  };

  // カウントダウン ＆ 中間アラート ＆ 自動休憩移行
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

          // 中間アラート音 (止めずに1回だけ短く鳴る)
          if (timerMode === "work" && activePreset.hasMidAlert) {
            const alertSec = activePreset.midAlertMinutesBeforeEnd * 60;
            if (nextSec === alertSec) {
              playBeep(true);
            }
          }

          // タイマー完了
          if (nextSec <= 0) {
            setIsRunning(false);

            if (activePreset.alarmMode === "once") {
              playBeep(true);
            } else if (activePreset.alarmMode === "loop") {
              setIsLoopAlarmRinging(true);
              loopAudioIntervalRef.current = setInterval(() => playBeep(false), 1500);
            }

            if (timerMode === "work") {
              const breakMins = Math.max(1, Math.floor(activePreset.workMinutes / activePreset.ratioWorkToBreak));
              setTimerMode("break");
              return breakMins * 60;
            } else {
              setTimerMode("work");
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
  }, [isRunning, timeLeft, timerMode, activePreset]);

  const handleAddTaskOption = () => {
    if (!newTaskOptInput.trim()) return;
    const newOpt: TaskOption = { id: `t_${Date.now()}`, label: newTaskOptInput.trim() };
    setTaskOptions([...taskOptions, newOpt]);
    setCurrentTaskCategory(newTaskOptInput.trim());
    setNewTaskOptInput("");
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
      
      {/* 止めるまで鳴り響く連射アラーム時の通知バー */}
      {isLoopAlarmRinging && (
        <div style={{ background: "#e11d48", padding: "12px", borderRadius: "6px", marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", fontWeight: "bold" }}>
          <span>🔔 アラームが鳴り響いています！</span>
          <button onClick={stopLoopAlarm} style={{ padding: "6px 16px", background: "#fff", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
            ⏹️ アラーム停止
          </button>
        </div>
      )}

      {/* ヘッダー ＆ プロファイル追加 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, color: timerMode === "work" ? "#C9A84C" : "#22c55e", fontSize: "16px" }}>
          {timerMode === "work" ? "⏱️ 戦術的タイマー (マルチプロファイル＆高機能制御)" : "☕ 自動計算 1/5 休憩タイマー"}
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

      {/* タイマーの複数切り替えタブ */}
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
              title="タイマー設定を編集"
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
            比率: <strong>{activePreset.workMinutes}分 : {Math.max(1, Math.floor(activePreset.workMinutes / activePreset.ratioWorkToBreak))}分 ({activePreset.ratioWorkToBreak}:1)</strong>
          </div>
        </div>
      )}

      {/* カウント表示 */}
      <div style={{ fontSize: "56px", fontWeight: "bold", textAlign: "center", color: timerMode === "work" ? "#C9A84C" : "#22c55e", fontFamily: "monospace", margin: "20px 0" }}>
        {`${Math.floor(timeLeft / 60).toString().padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`}
      </div>

      {/* パラメータ状態バッジ表示 */}
      <div style={{ display: "flex", justifyContent: "center", gap: "12px", fontSize: "12px", color: "#888", marginBottom: "20px", flexWrap: "wrap" }}>
        <span>🔔 中間アラート: <strong style={{ color: activePreset.hasMidAlert ? "#C9A84C" : "#555" }}>{activePreset.hasMidAlert ? `残り${activePreset.midAlertMinutesBeforeEnd}分前に1回鳴る` : "OFF"}</strong></span>
        <span>🔊 アラームモード: <strong style={{ color: "#C9A84C" }}>{activePreset.alarmMode === "silent" ? "無音" : activePreset.alarmMode === "once" ? "1回だけ鳴る" : "止めるまで連射"}</strong></span>
      </div>

      {/* 操作ボタン */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
        <button onClick={() => setIsRunning(!isRunning)} style={{ padding: "12px 28px", background: isRunning ? "#e11d48" : (timerMode === "work" ? "#C9A84C" : "#22c55e"), color: isRunning ? "#fff" : "#000", border: "none", borderRadius: "6px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>
          {isRunning ? "一時停止" : (timerMode === "work" ? "集中開始" : "休憩開始")}
        </button>
        <button onClick={handleStopOrComplete} style={{ padding: "12px 20px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
          作業完了 ➔ 自動休憩へ
        </button>
      </div>

      {/* 🏷️ 作業選択肢の管理モーダル */}
      {isManagingTaskOpts && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>🏷️ タイマー作業選択肢の管理</h4>

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
                  <span style={{ fontWeight: "bold" }}>{opt.label}</span>
                  {taskOptions.length > 1 && (
                    <button onClick={() => setTaskOptions(taskOptions.filter((x) => x.id !== opt.id))} style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer" }}>
                      🗑️ 削除
                    </button>
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

      {/* ⚙️ タイマープロファイル作成・編集モーダル */}
      {(isCreatingPreset || editingPreset) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "380px", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>{isCreatingPreset ? "＋ 新規タイマー作成" : "⚙️ タイマーパラメータ設定変更"}</h4>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>タイマー名:</span>
              <input
                type="text"
                value={isCreatingPreset ? newPreset.name : editingPreset?.name || ""}
                onChange={(e) => isCreatingPreset ? setNewPreset({ ...newPreset, name: e.target.value }) : editingPreset && setEditingPreset({ ...editingPreset, name: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>作業時間 (分):</span>
              <input
                type="number" min="1" max="300"
                value={isCreatingPreset ? newPreset.workMinutes : editingPreset?.workMinutes || 45}
                onChange={(e) => isCreatingPreset ? setNewPreset({ ...newPreset, workMinutes: Number(e.target.value) }) : editingPreset && setEditingPreset({ ...editingPreset, workMinutes: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#C9A84C", borderRadius: "4px", fontWeight: "bold", boxSizing: "border-box" }}
              />
            </div>

            {/* 比率設定 */}
            <div style={{ background: "#0d0d0d", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
              <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold", display: "block", marginBottom: "6px" }}>⚖️ 作業:休憩の比率設定 (デフォルト 5:1):</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                <span>作業時間分に対して 1/</span>
                <input
                  type="number" min="1" max="10"
                  value={isCreatingPreset ? newPreset.ratioWorkToBreak : editingPreset?.ratioWorkToBreak || 5}
                  onChange={(e) => isCreatingPreset ? setNewPreset({ ...newPreset, ratioWorkToBreak: Number(e.target.value) }) : editingPreset && setEditingPreset({ ...editingPreset, ratioWorkToBreak: Number(e.target.value) })}
                  style={{ width: "60px", padding: "6px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }}
                />
                <span>を自動休憩にする (例: 5 ➔ 5:1)</span>
              </div>
            </div>

            {/* 中間アラート設定 */}
            <div style={{ background: "#0d0d0d", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold" }}>🔔 中間アラート音 (1回だけ短く鳴る):</span>
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  <span>タイマー終了の残り</span>
                  <input
                    type="number" min="1" max="60"
                    value={isCreatingPreset ? newPreset.midAlertMinutesBeforeEnd : editingPreset?.midAlertMinutesBeforeEnd || 5}
                    onChange={(e) => isCreatingPreset ? setNewPreset({ ...newPreset, midAlertMinutesBeforeEnd: Number(e.target.value) }) : editingPreset && setEditingPreset({ ...editingPreset, midAlertMinutesBeforeEnd: Number(e.target.value) })}
                    style={{ width: "60px", padding: "4px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center" }}
                  />
                  <span>分前になったら1回音を鳴らす</span>
                </div>
              )}
            </div>

            {/* アラームモード設定 */}
            <div style={{ background: "#0d0d0d", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
              <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold", display: "block", marginBottom: "6px" }}>🔊 完了時のアラームモード:</span>
              <div style={{ display: "flex", gap: "6px" }}>
                {[
                  { id: "silent", label: "無音" },
                  { id: "once", label: "1回だけ鳴る" },
                  { id: "loop", label: "止めるまで連射" },
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

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={handleSavePreset} style={{ flex: 1, padding: "10px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>保存する</button>
              <button onClick={() => { setIsCreatingPreset(false); setEditingPreset(null); }} style={{ flex: 1, padding: "10px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";
import React, { useState, useEffect } from "react";

export type RoutineMode = "weekday" | "holiday" | "monk";
export type FrequencyType = "daily" | "interval" | "weekly";

export interface RoutineItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  modes: RoutineMode[];
  freqType: FrequencyType;
  freqIntervalDays: number;
  freqDaysOfWeek: number[];
  done: boolean;

  // 多段階ローテーション仕様
  hasRotation: boolean;
  rotationItems: string[];
  currentRotationIndex: number;
  rotTargetCount: number;
  rotCurrentCount: number;

  // ★サブ項目ごとの個別手順メモマップ★
  hasSteps: boolean;
  stepMap: Record<string, string[]>; // 例: { "上半身": ["ベンチプレス", "ラットプル"], "下半身": ["スクワット", "レッグプレス"] }
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const INITIAL_ROUTINES: RoutineItem[] = [
  {
    id: "r1", name: "肉体兵站 筋トレローテーション", startTime: "06:30", endTime: "07:15", duration: 45,
    modes: ["weekday", "holiday", "monk"], freqType: "interval", freqIntervalDays: 2, freqDaysOfWeek: [1, 3, 5], done: false,
    hasRotation: true, rotationItems: ["上半身", "下半身"], currentRotationIndex: 0, rotTargetCount: 1, rotCurrentCount: 0,
    hasSteps: true,
    stepMap: {
      "上半身": ["1. ベンチプレス (3セット)", "2. ラットプルダウン (3セット)", "3. バーティカルロー (3セット)"],
      "下半身": ["1. スクワット (3セット)", "2. レッグプレス (3セット)", "3. デッドリフト (3セット)", "4. レッグカール (3セット)"]
    }
  },
  {
    id: "r2", name: "朝5時 帝国学習ローテーション", startTime: "05:00", endTime: "06:30", duration: 90,
    modes: ["weekday", "holiday", "monk"], freqType: "daily", freqIntervalDays: 1, freqDaysOfWeek: [1, 2, 3, 4, 5], done: false,
    hasRotation: true, rotationItems: ["数学 (微分積分)", "英語 (SVOC構文)", "現代文 (論理読解)"], currentRotationIndex: 0, rotTargetCount: 1, rotCurrentCount: 0,
    hasSteps: true,
    stepMap: {
      "数学 (微分積分)": ["1. 定理の証明確認 (15分)", "2. 演習問題 5問解説 (45分)", "3. 誤答の解き直し (30分)"],
      "英語 (SVOC構文)": ["1. 長文 1章精読 (30分)", "2. SVOC構造書き出し (30分)"],
      "現代文 (論理読解)": ["1. 本文要約作成 (30分)", "2. 設問解答デバッグ (15分)"]
    }
  },
];

export default function Page() {
  const [tab, setTab] = useState<"routine" | "timer" | "task" | "calendar" | "analytics" | "partner" | "record">("routine");

  const [currentMode, setCurrentMode] = useState<RoutineMode>("weekday");
  const [routines, setRoutines] = useState<RoutineItem[]>(INITIAL_ROUTINES);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 編集用サブ項目選択タブ State
  const [editingSubTab, setEditingSubTab] = useState<string>("上半身");

  // 入力保持State
  const [rotationInputText, setRotationInputText] = useState("");
  const [stepInputText, setStepInputText] = useState("");

  // 新規ルーティン用State
  const [newRoutine, setNewRoutine] = useState<Omit<RoutineItem, "id" | "done" | "currentRotationIndex" | "rotCurrentCount">>({
    name: "", startTime: "07:00", endTime: "08:00", duration: 60,
    modes: ["weekday", "holiday", "monk"], freqType: "daily", freqIntervalDays: 2, freqDaysOfWeek: [1, 3, 5],
    hasRotation: false, rotationItems: ["上半身", "下半身"], rotTargetCount: 1,
    hasSteps: false, stepMap: { "デフォルト": ["1. 準備", "2. 実行", "3. 完了"] }
  });

  // 全画面ステッププレイヤー用State
  const [activePlayerRoutine, setActivePlayerRoutine] = useState<RoutineItem | null>(null);
  const [playerSteps, setPlayerSteps] = useState<string[]>([]);
  const [playerCurrentStepIndex, setPlayerCurrentStepIndex] = useState(0);

  // タイマーState
  const [taskName, setTaskName] = useState("数学 Deep Work");
  const [customMins, setCustomMins] = useState(45);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");

  const handleQuickTimer = (name: string, duration: number) => {
    setTaskName(name);
    setCustomMins(duration);
    setTimeLeft(duration * 60);
    setElapsedSeconds(0);
    setTimerMode("work");
    setTab("timer");
  };

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        if (timerMode === "work") setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRunning, timeLeft, timerMode]);

  const handleStopOrComplete = () => {
    setIsRunning(false);
    if (timerMode === "work") {
      const breakSecs = Math.max(60, Math.floor(elapsedSeconds / 5));
      setTimerMode("break");
      setTimeLeft(breakSecs);
    } else {
      setTimerMode("work");
      setTimeLeft(customMins * 60);
      setElapsedSeconds(0);
    }
  };

  const todayDow = new Date().getDay();

  const activeRoutines = routines.filter((r) => {
    if (!r.modes.includes(currentMode)) return false;
    if (r.freqType === "daily") return true;
    if (r.freqType === "weekly") return r.freqDaysOfWeek?.includes(todayDow) ?? true;
    if (r.freqType === "interval") return true;
    return true;
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingRoutines = routines.filter((r) => {
    if (!r.modes.includes(currentMode)) return false;
    if (r.freqType === "weekly") return !r.freqDaysOfWeek?.includes(todayDow);
    return false;
  });

  const getDaysUntilNext = (item: RoutineItem) => {
    if (item.freqType === "interval") return item.freqIntervalDays - 1 || 1;
    if (item.freqType === "weekly" && item.freqDaysOfWeek && item.freqDaysOfWeek.length > 0) {
      const diffs = item.freqDaysOfWeek.map((d) => (d - todayDow + 7) % 7).filter((d) => d > 0);
      return diffs.length > 0 ? Math.min(...diffs) : 7;
    }
    return 1;
  };

  const handleCheckRoutine = (id: string) => {
    setRoutines(routines.map((r) => {
      if (r.id !== id) return r;
      if (!r.hasRotation || r.rotationItems.length === 0) {
        return { ...r, done: !r.done };
      }
      const newDone = !r.done;
      let newCount = r.rotCurrentCount + (newDone ? 1 : -1);
      if (newCount < 0) newCount = 0;
      let newIndex = r.currentRotationIndex;
      if (newCount >= r.rotTargetCount) {
        newIndex = (r.currentRotationIndex + 1) % r.rotationItems.length;
        newCount = 0;
      }
      return { ...r, done: newDone, rotCurrentCount: newCount, currentRotationIndex: newIndex };
    }));
  };

  const handleSkipRotation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoutines(routines.map((r) => {
      if (r.id !== id || !r.hasRotation || r.rotationItems.length === 0) return r;
      const nextIndex = (r.currentRotationIndex + 1) % r.rotationItems.length;
      return { ...r, currentRotationIndex: nextIndex, rotCurrentCount: 0 };
    }));
  };

  // ★自動連動: 現在アクトなサブ項目名に応じた手順を全画面表示★
  const openStepPlayer = (item: RoutineItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentSub = item.hasRotation && item.rotationItems?.length > 0
      ? item.rotationItems[item.currentRotationIndex % item.rotationItems.length]
      : "デフォルト";

    // サブ項目名に紐づく手順リストを取得 (なければデフォルト)
    const steps = item.stepMap?.[currentSub] || item.stepMap?.["デフォルト"] || Object.values(item.stepMap || {})[0] || ["1. 準備完了", "2. メイン実行", "3. 完遂"];

    setActivePlayerRoutine(item);
    setPlayerSteps(steps);
    setPlayerCurrentStepIndex(0);
  };

  const handleNextPlayerStep = () => {
    if (!activePlayerRoutine) return;
    if (playerCurrentStepIndex + 1 < playerSteps.length) {
      setPlayerCurrentStepIndex(playerCurrentStepIndex + 1);
    } else {
      handleCheckRoutine(activePlayerRoutine.id);
      setActivePlayerRoutine(null);
    }
  };

  const toggleFreqDay = (dow: number, isEdit: boolean) => {
    if (isEdit && editingRoutine) {
      const current = editingRoutine.freqDaysOfWeek || [];
      const updated = current.includes(dow) ? current.filter((d) => d !== dow) : [...current, dow];
      setEditingRoutine({ ...editingRoutine, freqDaysOfWeek: updated });
    } else {
      const current = newRoutine.freqDaysOfWeek || [];
      const updated = current.includes(dow) ? current.filter((d) => d !== dow) : [...current, dow];
      setNewRoutine({ ...newRoutine, freqDaysOfWeek: updated });
    }
  };

  const completedCount = activeRoutines.filter((r) => r.done).length;
  const progressPct = activeRoutines.length > 0 ? Math.round((completedCount / activeRoutines.length) * 100) : 0;

  // モーダル編集開始時の準備
  const startEdit = (item: RoutineItem) => {
    setEditingRoutine(item);
    setRotationInputText(item.rotationItems?.join(", ") || "");
    const subs = item.hasRotation && item.rotationItems?.length > 0 ? item.rotationItems : ["デフォルト"];
    const firstSub = subs[0];
    setEditingSubTab(firstSub);
    setStepInputText(item.stepMap?.[firstSub]?.join("\n") || "");
  };

  // サブ項目タブ切り替え時のテキストエリア同期
  const handleSubTabChange = (subName: string, isEdit: boolean) => {
    setEditingSubTab(subName);
    const map = isEdit ? editingRoutine?.stepMap : newRoutine.stepMap;
    const existingSteps = map?.[subName] || [];
    setStepInputText(existingSteps.join("\n"));
  };

  // テキストエリア更新時の StepMap 保存
  const handleStepTextChange = (text: string, isEdit: boolean) => {
    setStepInputText(text);
    const stepsArr = text.split("\n").filter((s) => s.trim().length > 0);

    if (isEdit && editingRoutine) {
      const updatedMap = { ...(editingRoutine.stepMap || {}), [editingSubTab]: stepsArr };
      setEditingRoutine({ ...editingRoutine, stepMap: updatedMap });
    } else if (isCreating) {
      const updatedMap = { ...(newRoutine.stepMap || {}), [editingSubTab]: stepsArr };
      setNewRoutine({ ...newRoutine, stepMap: updatedMap });
    }
  };

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#050505", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* 7大メインタブ */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid #222", paddingBottom: "10px", flexWrap: "wrap" }}>
        {[
          { id: "routine", label: "📜 ルーティン" },
          { id: "timer", label: "⏱️ 戦術タイマー" },
          { id: "task", label: "✅ タスク管理" },
          { id: "calendar", label: "📅 カレンダー WIN/LOSE" },
          { id: "analytics", label: "📊 研究所データ" },
          { id: "partner", label: "🤝 相棒監視" },
          { id: "record", label: "📱 兵站調達" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            style={{
              padding: "8px 14px",
              background: tab === t.id ? "#C9A84C" : "#111",
              color: tab === t.id ? "#000" : "#888",
              border: "1px solid #C9A84C",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. 📜 ルーティン タブ */}
      {tab === "routine" && (
        <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📜 日課ルーティン統制 (サブ項目別個別手順連動)</h3>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => { setIsCreating(true); setStepInputText(""); setRotationInputText(""); setEditingSubTab("デフォルト"); }} style={{ padding: "6px 12px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
                ＋ 新規作成
              </button>
              <div style={{ display: "flex", gap: "4px" }}>
                {(["weekday", "holiday", "monk"] as RoutineMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setCurrentMode(m)}
                    style={{
                      padding: "6px 10px",
                      background: currentMode === m ? "#C9A84C" : "#1b1b1b",
                      color: currentMode === m ? "#000" : "#888",
                      border: "1px solid #C9A84C",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 達成度バー */}
          <div style={{ background: "#151515", padding: "12px", borderRadius: "6px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px", color: "#ccc" }}>
              <span>【{currentMode.toUpperCase()}】本日の日課達成度 ({completedCount} / {activeRoutines.length})</span>
              <span style={{ color: "#C9A84C", fontWeight: "bold" }}>{progressPct}%</span>
            </div>
            <div style={{ width: "100%", background: "#222", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #C9A84C, #f59e0b)", height: "100%", transition: "width 0.3s" }} />
            </div>
          </div>

          {/* 本日のアクティブ日課カードリスト */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "30px" }}>
            <span style={{ fontSize: "13px", color: "#C9A84C", fontWeight: "bold" }}>🔥 本日の実行日課:</span>
            {activeRoutines.map((item) => {
              const currentSubItem = item.hasRotation && item.rotationItems?.length > 0
                ? item.rotationItems[item.currentRotationIndex % item.rotationItems.length]
                : null;

              return (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#151515", border: "1px solid #222", padding: "12px 15px", borderRadius: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleCheckRoutine(item.id)}
                      style={{ accentColor: "#C9A84C", cursor: "pointer", width: "18px", height: "18px" }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold" }}>⏰ {item.startTime} - {item.endTime}</span>
                        <span style={{ fontSize: "10px", padding: "2px 6px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "3px" }}>
                          {item.freqType === "daily" && "📅 毎日"}
                          {item.freqType === "interval" && `🔄 ${item.freqIntervalDays || 2}日に1回`}
                          {item.freqType === "weekly" && `📆 曜日: ${item.freqDaysOfWeek?.map((d) => WEEKDAYS[d]).join(",")}`}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ textDecoration: item.done ? "line-through" : "none", color: item.done ? "#888" : "#fff", fontWeight: "bold", fontSize: "15px" }}>
                          {item.name}
                        </span>

                        {item.hasRotation && currentSubItem && (
                          <span style={{ padding: "2px 8px", background: "#111", border: "1px solid #C9A84C", color: "#C9A84C", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                            🎯 現在: {currentSubItem}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {item.hasSteps && (
                      <button
                        onClick={(e) => openStepPlayer(item, e)}
                        style={{ padding: "4px 10px", background: "#222", color: "#22c55e", border: "1px solid #22c55e", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                      >
                        📺 全画面手順
                      </button>
                    )}

                    {item.hasRotation && item.rotationItems?.length > 0 && (
                      <button
                        onClick={(e) => handleSkipRotation(item.id, e)}
                        style={{ padding: "4px 8px", background: "#222", color: "#f59e0b", border: "1px solid #f59e0b", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}
                      >
                        スキップ ⏩
                      </button>
                    )}

                    <button onClick={() => handleQuickTimer(currentSubItem ? `${item.name} (${currentSubItem})` : item.name, item.duration)} style={{ padding: "4px 8px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>⏱️ 起動</button>
                    <button onClick={() => startEdit(item)} style={{ padding: "4px 8px", background: "#222", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>✏️ 編集</button>
                    <button onClick={() => setRoutines(routines.filter((r) => r.id !== item.id))} style={{ padding: "4px 8px", background: "#222", color: "#e11d48", border: "1px solid #e11d48", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 本日対象外の日課 */}
          {upcomingRoutines.length > 0 && (
            <div style={{ borderTop: "1px dashed #333", paddingTop: "20px" }}>
              <span style={{ fontSize: "13px", color: "#666", fontWeight: "bold", display: "block", marginBottom: "10px" }}>💤 本日対象外 (次回準備中の日課):</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {upcomingRoutines.map((item) => {
                  const daysLeft = getDaysUntilNext(item);
                  return (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", border: "1px solid #1f1f1f", padding: "10px 15px", borderRadius: "6px", opacity: 0.45 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <input type="checkbox" disabled checked={false} style={{ cursor: "not-allowed", width: "16px", height: "16px" }} />
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                            <span style={{ fontSize: "11px", color: "#666" }}>⏰ {item.startTime} - {item.endTime}</span>
                            <span style={{ fontSize: "10px", padding: "2px 6px", background: "#221100", color: "#f59e0b", border: "1px solid #78350f", borderRadius: "3px", fontWeight: "bold" }}>
                              ⏳ あと {daysLeft} 日後に表示
                            </span>
                          </div>
                          <span style={{ color: "#aaa", fontSize: "14px" }}>{item.name}</span>
                        </div>
                      </div>

                      <button onClick={() => startEdit(item)} style={{ padding: "4px 8px", background: "#1a1a1a", color: "#666", border: "1px solid #333", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>
                        ✏️ 編集
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📺 全画面手順モード (アクティブなサブ項目の手順を正確表示) */}
      {activePlayerRoutine && playerSteps.length > 0 && (
        <div style={{ position: "fixed", inset: 0, background: "#050505", zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "40px 20px", color: "#fff", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "16px", color: "#C9A84C", fontWeight: "bold" }}>
              📜 {activePlayerRoutine.name} ➔ 【{activePlayerRoutine.hasRotation ? activePlayerRoutine.rotationItems[activePlayerRoutine.currentRotationIndex % activePlayerRoutine.rotationItems.length] : "手順"}】
            </span>
            <button
              onClick={() => setActivePlayerRoutine(null)}
              style={{ padding: "8px 16px", background: "#222", border: "1px solid #555", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
            >
              ✕ 閉じる
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", marginTop: "auto", marginBottom: "auto" }}>
            <div style={{ fontSize: "24px", color: "#888", fontWeight: "bold", letterSpacing: "2px" }}>
              STEP {playerCurrentStepIndex + 1} / {playerSteps.length}
            </div>

            <div style={{ fontSize: "clamp(36px, 8vw, 72px)", fontWeight: "900", color: "#C9A84C", textShadow: "0 0 20px rgba(201,168,76,0.3)", padding: "0 20px", lineHeight: "1.2" }}>
              {playerSteps[playerCurrentStepIndex]}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <button
              onClick={handleNextPlayerStep}
              style={{
                width: "100%", maxWidth: "500px", padding: "20px 40px",
                background: "linear-gradient(135deg, #22c55e, #15803d)",
                color: "#fff", border: "none", borderRadius: "12px",
                fontSize: "24px", fontWeight: "900", cursor: "pointer",
                boxShadow: "0 10px 30px rgba(34,197,94,0.4)",
                letterSpacing: "1px"
              }}
            >
              {playerCurrentStepIndex + 1 < playerSteps.length ? "✅ クリア (次の種目へ ➔)" : "🔥 作戦完遂！ (ルーティン完了)"}
            </button>
          </div>
        </div>
      )}

      {/* ✏️ 編集 / 新規作成モーダル (サブ項目別手順メモ切替タブ新設) */}
      {(isCreating || editingRoutine) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "400px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "90vh", overflowY: "auto" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>{isCreating ? "＋ 日課新規追加" : "✏️ 日課・サブ項目別手順メモ設定"}</h4>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>ルーティン名:</span>
              <input
                type="text"
                placeholder="例: 筋トレ, 帝国学習..."
                value={isCreating ? newRoutine.name : editingRoutine?.name || ""}
                onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, name: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, name: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            {/* 多段階ローテーション設定UI */}
            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold" }}>🔄 多段階ローテーション設定:</span>
                <label style={{ fontSize: "12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <input
                    type="checkbox"
                    checked={isCreating ? newRoutine.hasRotation : editingRoutine?.hasRotation || false}
                    onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, hasRotation: e.target.checked }) : editingRoutine && setEditingRoutine({ ...editingRoutine, hasRotation: e.target.checked })}
                  />
                  使用する
                </label>
              </div>

              {(isCreating ? newRoutine.hasRotation : editingRoutine?.hasRotation) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#888" }}>サブ項目 (カンマ区切りで入力):</span>
                  <input
                    type="text"
                    placeholder="例: 上半身, 下半身  または  数学, 英語, 国語"
                    value={rotationInputText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRotationInputText(val);
                      const items = val.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
                      if (isCreating) setNewRoutine({ ...newRoutine, rotationItems: items });
                      else if (editingRoutine) setEditingRoutine({ ...editingRoutine, rotationItems: items });
                    }}
                    style={{ width: "100%", padding: "6px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }}
                  />
                </div>
              )}
            </div>

            {/* ★新機能要件: サブ項目別の個別手順メモ設定UI★ */}
            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: "bold" }}>📋 手順メモ設定 (全画面表示用):</span>
                <label style={{ fontSize: "12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <input
                    type="checkbox"
                    checked={isCreating ? newRoutine.hasSteps : editingRoutine?.hasSteps || false}
                    onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, hasSteps: e.target.checked }) : editingRoutine && setEditingRoutine({ ...editingRoutine, hasSteps: e.target.checked })}
                  />
                  使用する
                </label>
              </div>

              {(isCreating ? newRoutine.hasSteps : editingRoutine?.hasSteps) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {/* サブ項目選択タブ ([ 上半身 ] [ 下半身 ]) */}
                  {((isCreating ? newRoutine.rotationItems : editingRoutine?.rotationItems) || []).length > 0 && (
                    <div>
                      <span style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px" }}>手順を編集するサブ項目を選択:</span>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {((isCreating ? newRoutine.rotationItems : editingRoutine?.rotationItems) || ["デフォルト"]).map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => handleSubTabChange(sub, !isCreating)}
                            style={{
                              padding: "4px 8px",
                              background: editingSubTab === sub ? "#22c55e" : "#1a1a1a",
                              color: editingSubTab === sub ? "#000" : "#888",
                              border: "1px solid #22c55e",
                              borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "bold"
                            }}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <span style={{ fontSize: "11px", color: "#22c55e", display: "block" }}>
                    【{editingSubTab}】の手順 (1行に1種目ずつ入力):
                  </span>
                  <textarea
                    rows={4}
                    placeholder={`1. ベンチプレス (3セット)\n2. ラットプルダウン (3セット)\n3. バーティカルロー (3セット)`}
                    value={stepInputText}
                    onChange={(e) => handleStepTextChange(e.target.value, !isCreating)}
                    style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#22c55e", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box", fontFamily: "monospace" }}
                  />
                </div>
              )}
            </div>

            {/* 保存 / キャンセル */}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={() => {
                  if (isCreating) {
                    if (!newRoutine.name.trim()) return;
                    setRoutines([...routines, { ...newRoutine, id: Date.now().toString(), done: false, currentRotationIndex: 0, rotCurrentCount: 0 }]);
                    setIsCreating(false);
                  } else if (editingRoutine) {
                    setRoutines(routines.map((r) => (r.id === editingRoutine.id ? editingRoutine : r)));
                    setEditingRoutine(null);
                  }
                }}
                style={{ flex: 1, padding: "10px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                保存する
              </button>
              <button onClick={() => { setIsCreating(false); setEditingRoutine(null); }} style={{ flex: 1, padding: "10px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* その他のタブ */}
      {tab === "timer" && (
        <div style={{ background: "#0d0d0d", border: `2px solid ${timerMode === "work" ? "#C9A84C" : "#22c55e"}`, borderRadius: "8px", padding: "20px" }}>
          <h3 style={{ margin: "0 0 15px 0", color: timerMode === "work" ? "#C9A84C" : "#22c55e" }}>
            {timerMode === "work" ? "⏱️ 戦術タイマー (自由時間設定)" : "☕ 自動計算 1/5 休憩タイマー"}
          </h3>
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <input type="text" value={taskName} onChange={(e) => setTaskName(e.target.value)} style={{ flex: 1, padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: "4px" }} />
            <input type="number" value={customMins} onChange={(e) => { setCustomMins(Number(e.target.value)); setTimeLeft(Number(e.target.value) * 60); }} style={{ width: "70px", padding: "8px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }} />
            <span style={{ alignSelf: "center" }}>分</span>
          </div>
          <div style={{ fontSize: "52px", fontWeight: "bold", textAlign: "center", color: timerMode === "work" ? "#C9A84C" : "#22c55e", fontFamily: "monospace", margin: "15px 0" }}>
            {`${Math.floor(timeLeft / 60).toString().padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`}
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={() => setIsRunning(!isRunning)} style={{ padding: "10px 24px", background: isRunning ? "#e11d48" : "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
              {isRunning ? "一時停止" : "タイマー開始"}
            </button>
            <button onClick={handleStopOrComplete} style={{ padding: "10px 16px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
              作業終了 ➔ 1/5自動休憩へ
            </button>
          </div>
        </div>
      )}

      {tab === "task" && <div style={{ padding: "20px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #C9A84C" }}>✅ タスク管理ボード (稼働中)</div>}
      {tab === "calendar" && <div style={{ padding: "20px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #C9A84C" }}>📅 カレンダー WIN/LOSE 表示 (稼働中)</div>}
      {tab === "analytics" && <div style={{ padding: "20px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #C9A84C" }}>📊 研究所データセンター (稼働中)</div>}
      {tab === "partner" && <div style={{ padding: "20px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #C9A84C" }}>🤝 相棒監視タブ (稼働中)</div>}
      {tab === "record" && <div style={{ padding: "20px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #C9A84C" }}>📱 兵站調達: Galaxy S26 Ultra 資金18万円進捗 (稼働中)</div>}
    </div>
  );
}
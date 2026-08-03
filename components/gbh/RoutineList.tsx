"use client";
import React, { useState, useEffect } from "react";

export type RoutineMode = "weekday" | "holiday" | "monk";
export type FrequencyType = "daily" | "interval" | "weekly";
export type RotationAdvanceType = "check" | "days";

export interface RoutineModeOption {
  id: string;
  label: string;
}

export interface RoutineItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  modes: string[];
  freqType: FrequencyType;
  freqIntervalDays: number;
  freqDaysOfWeek: number[];
  done: boolean;

  hasRotation: boolean;
  rotationItems: string[];
  currentRotationIndex: number;
  rotTargetCount: number;
  rotCurrentCount: number;
  rotAdvanceType: RotationAdvanceType;
  lastDisplayedDate?: string;

  hasSteps: boolean;
  stepMap: Record<string, string[]>;
  showOnCalendar?: boolean;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const INITIAL_MODE_OPTIONS: RoutineModeOption[] = [
  { id: "weekday", label: "平日" },
  { id: "holiday", label: "休日/祝日" },
  { id: "monk", label: "MONK MODE" },
];

const INITIAL_ROUTINES: RoutineItem[] = [
  {
    id: "r1", name: "朝5時 帝国学習ローテーション", startTime: "05:00", endTime: "06:30", duration: 90,
    modes: ["weekday", "holiday", "monk"], freqType: "daily", freqIntervalDays: 1, freqDaysOfWeek: [1, 2, 3, 4, 5], done: false,
    hasRotation: true, rotationItems: ["英語 (SVOC構文)", "数学 (微分積分)", "現代文 (論理読解)"], currentRotationIndex: 0, rotTargetCount: 1, rotCurrentCount: 0, rotAdvanceType: "check",
    hasSteps: true,
    stepMap: {
      "英語 (SVOC構文)": ["1. 長文 1章精読 (30分)", "2. SVOC構造書き出し (30分)"],
      "数学 (微分積分)": ["1. 定理の証明確認 (15分)", "2. 演習問題 5問解説 (45分)"]
    },
    showOnCalendar: true
  },
  {
    id: "r2", name: "肉体兵站 筋トレローテーション", startTime: "06:30", endTime: "07:15", duration: 45,
    modes: ["weekday", "holiday", "monk"], freqType: "interval", freqIntervalDays: 2, freqDaysOfWeek: [1, 3, 5], done: false,
    hasRotation: true, rotationItems: ["上半身", "下半身"], currentRotationIndex: 0, rotTargetCount: 1, rotCurrentCount: 0, rotAdvanceType: "days",
    hasSteps: true,
    stepMap: {
      "上半身": ["1. ベンチプレス (3セット)", "2. ラットプルダウン (3セット)"],
      "下半身": ["1. スクワット (3セット)", "2. レッグプレス (3セット)"]
    },
    showOnCalendar: true
  },
];

export default function RoutineList({ onQuickTimer }: { onQuickTimer?: (name: string, mins: number) => void }) {
  const [modeOptions, setModeOptions] = useState<RoutineModeOption[]>(INITIAL_MODE_OPTIONS);
  const [currentModeId, setCurrentModeId] = useState<string>("weekday");
  const [isManagingModes, setIsManagingModes] = useState(false);
  const [newModeLabelInput, setNewModeLabelInput] = useState("");

  const [routines, setRoutines] = useState<RoutineItem[]>(INITIAL_ROUTINES);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingSubTab, setEditingSubTab] = useState<string>("上半身");
  const [rotationInputText, setRotationInputText] = useState("");
  const [stepInputText, setStepInputText] = useState("");

  // ★修正: showOnCalendar をデフォルト true に変更★
  const [newRoutine, setNewRoutine] = useState<Omit<RoutineItem, "id" | "done" | "currentRotationIndex" | "rotCurrentCount">>({
    name: "", startTime: "07:00", endTime: "08:00", duration: 60,
    modes: ["weekday", "holiday", "monk"], freqType: "daily", freqIntervalDays: 2, freqDaysOfWeek: [1, 3, 5],
    hasRotation: false, rotationItems: ["上半身", "下半身"], rotTargetCount: 1, rotAdvanceType: "check",
    hasSteps: false, stepMap: {}, showOnCalendar: true
  });

  const [activePlayerRoutine, setActivePlayerRoutine] = useState<RoutineItem | null>(null);
  const [playerSteps, setPlayerSteps] = useState<string[]>([]);
  const [playerCurrentStepIndex, setPlayerCurrentStepIndex] = useState(0);

  // ★修復: 読み込み完了ガード用 State★
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. 初回読み込み（一度だけ localStorage からロード）
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRoutines = localStorage.getItem("gbh_routines");
      if (savedRoutines) {
        try { setRoutines(JSON.parse(savedRoutines)); } catch (e) {}
      }
      const savedModes = localStorage.getItem("gbh_mode_options");
      if (savedModes) {
        try { setModeOptions(JSON.parse(savedModes)); } catch (e) {}
      }
      setIsLoaded(true); // 読み込み完了フラグをオン
    }
  }, []);

  // 2. 読み込み完了後に、ユーザーが変更した時だけ保存（初期値上書きバグを防止）
  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded) {
      localStorage.setItem("gbh_routines", JSON.stringify(routines));
    }
  }, [routines, isLoaded]);

  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded) {
      localStorage.setItem("gbh_mode_options", JSON.stringify(modeOptions));
    }
  }, [modeOptions, isLoaded]);

  const todayStr = new Date().toISOString().split("T")[0];
  const todayDow = new Date().getDay();

  // 表示日数経過による動的ローテーション歩進
  useEffect(() => {
    let updated = false;
    const newRoutines = routines.map((r) => {
      if (r.hasRotation && r.rotAdvanceType === "days" && r.modes.includes(currentModeId)) {
        if (r.lastDisplayedDate !== todayStr) {
          updated = true;
          const nextDaysCount = r.rotCurrentCount + 1;
          let nextIndex = r.currentRotationIndex;
          let resetCount = nextDaysCount;
          if (nextDaysCount >= r.rotTargetCount) {
            nextIndex = (r.currentRotationIndex + 1) % r.rotationItems.length;
            resetCount = 0;
          }
          return { ...r, lastDisplayedDate: todayStr, rotCurrentCount: resetCount, currentRotationIndex: nextIndex };
        }
      }
      return r;
    });
    if (updated) setRoutines(newRoutines);
  }, [currentModeId, todayStr]);

  const activeRoutines = routines.filter((r) => {
    if (!r.modes.includes(currentModeId)) return false;
    if (r.freqType === "daily") return true;
    if (r.freqType === "weekly") return r.freqDaysOfWeek?.includes(todayDow) ?? true;
    if (r.freqType === "interval") return true;
    return true;
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingRoutines = routines.filter((r) => {
    if (!r.modes.includes(currentModeId)) return false;
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
      const newDone = !r.done;
      if (r.hasRotation && r.rotAdvanceType === "check" && r.rotationItems.length > 0) {
        let newCount = r.rotCurrentCount + (newDone ? 1 : -1);
        if (newCount < 0) newCount = 0;
        let newIndex = r.currentRotationIndex;
        if (newCount >= r.rotTargetCount) {
          newIndex = (r.currentRotationIndex + 1) % r.rotationItems.length;
          newCount = 0;
        }
        return { ...r, done: newDone, rotCurrentCount: newCount, currentRotationIndex: newIndex };
      }
      return { ...r, done: newDone };
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

  const openStepPlayer = (item: RoutineItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentSub = item.hasRotation && item.rotationItems?.length > 0
      ? item.rotationItems[item.currentRotationIndex % item.rotationItems.length]
      : "デフォルト";

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

  const handleAddModeOption = () => {
    if (!newModeLabelInput.trim()) return;
    const newId = `custom_${Date.now()}`;
    const newOpt: RoutineModeOption = { id: newId, label: newModeLabelInput.trim() };
    setModeOptions([...modeOptions, newOpt]);
    setNewModeLabelInput("");
  };

  const handleDeleteModeOption = (id: string) => {
    if (modeOptions.length <= 1) return;
    setModeOptions(modeOptions.filter((m) => m.id !== id));
    if (currentModeId === id) {
      setCurrentModeId(modeOptions.filter((m) => m.id !== id)[0].id);
    }
  };

  const toggleRoutineModeAssign = (modeId: string, isEdit: boolean) => {
    if (modeId === "ALL") {
      const allIds = modeOptions.map((m) => m.id);
      if (isEdit && editingRoutine) setEditingRoutine({ ...editingRoutine, modes: allIds });
      else if (isCreating) setNewRoutine({ ...newRoutine, modes: allIds });
      return;
    }

    if (isEdit && editingRoutine) {
      const current = editingRoutine.modes || [];
      const updated = current.includes(modeId) ? current.filter((m) => m !== modeId) : [...current, modeId];
      setEditingRoutine({ ...editingRoutine, modes: updated });
    } else if (isCreating) {
      const current = newRoutine.modes || [];
      const updated = current.includes(modeId) ? current.filter((m) => m !== modeId) : [...current, modeId];
      setNewRoutine({ ...newRoutine, modes: updated });
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
  const currentModeLabel = modeOptions.find((m) => m.id === currentModeId)?.label || "全モード";

  const startEdit = (item: RoutineItem) => {
    setEditingRoutine({ ...item, showOnCalendar: item.showOnCalendar ?? true });
    setRotationInputText(item.rotationItems?.join(", ") || "");
    const subs = item.hasRotation && item.rotationItems?.length > 0 ? item.rotationItems : ["デフォルト"];
    const firstSub = subs[0];
    setEditingSubTab(firstSub);
    setStepInputText(item.stepMap?.[firstSub]?.join("\n") || "");
  };

  const handleSubTabChange = (subName: string, isEdit: boolean) => {
    setEditingSubTab(subName);
    const map = isEdit ? editingRoutine?.stepMap : newRoutine.stepMap;
    const existingSteps = map?.[subName] || [];
    setStepInputText(existingSteps.join("\n"));
  };

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
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff", fontFamily: "sans-serif" }}>
      
      {/* 1. ヘッダー ＆ モード切り替えボタン */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📜 日課ルーティン統制</h3>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={() => setIsManagingModes(true)} style={{ padding: "6px 12px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
            ⚙️ モード種類管理
          </button>

          <button onClick={() => { setIsCreating(true); setStepInputText(""); setRotationInputText(""); setEditingSubTab("デフォルト"); }} style={{ padding: "6px 12px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
            ＋ 新規日課作成
          </button>

          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {modeOptions.map((m) => (
              <button
                key={m.id}
                onClick={() => setCurrentModeId(m.id)}
                style={{
                  padding: "6px 10px",
                  background: currentModeId === m.id ? "#C9A84C" : "#1b1b1b",
                  color: currentModeId === m.id ? "#000" : "#888",
                  border: "1px solid #C9A84C",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. 本日の日課達成度 プログレスバー */}
      <div style={{ background: "#151515", padding: "12px", borderRadius: "6px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px", color: "#ccc" }}>
          <span>【{currentModeLabel}】本日の日課達成度 ({completedCount} / {activeRoutines.length})</span>
          <span style={{ color: "#C9A84C", fontWeight: "bold" }}>{progressPct}%</span>
        </div>
        <div style={{ width: "100%", background: "#222", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #C9A84C, #f59e0b)", height: "100%", transition: "width 0.3s" }} />
        </div>
      </div>

      {/* 3. 実行日課リスト */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "30px" }}>
        <span style={{ fontSize: "13px", color: "#C9A84C", fontWeight: "bold" }}>🔥 【{currentModeLabel}】実行日課:</span>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold" }}>⏰ {item.startTime} - {item.endTime}</span>
                    <span style={{ fontSize: "10px", padding: "2px 6px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "3px" }}>
                      {item.freqType === "daily" && "📅 毎日"}
                      {item.freqType === "interval" && `🔄 ${item.freqIntervalDays || 2}日に1回`}
                      {item.freqType === "weekly" && `📆 曜日: ${item.freqDaysOfWeek?.map((d) => WEEKDAYS[d]).join(",")}`}
                    </span>

                    <div style={{ display: "flex", gap: "2px" }}>
                      {item.modes.map((mid) => {
                        const opt = modeOptions.find((o) => o.id === mid);
                        return opt ? (
                          <span key={mid} style={{ fontSize: "9px", padding: "1px 4px", background: "#111", color: "#aaa", border: "1px solid #333", borderRadius: "2px" }}>
                            {opt.label}
                          </span>
                        ) : null;
                      })}
                    </div>
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

              {/* カード右側アクションボタン */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {item.hasSteps && (
                  <button onClick={(e) => openStepPlayer(item, e)} style={{ padding: "4px 10px", background: "#222", color: "#22c55e", border: "1px solid #22c55e", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                    📺 全画面手順
                  </button>
                )}

                {item.hasRotation && item.rotationItems?.length > 0 && (
                  <button onClick={(e) => handleSkipRotation(item.id, e)} style={{ padding: "4px 8px", background: "#222", color: "#f59e0b", border: "1px solid #f59e0b", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>
                    スキップ ⏩
                  </button>
                )}

                <button onClick={() => onQuickTimer && onQuickTimer(currentSubItem ? `${item.name} (${currentSubItem})` : item.name, item.duration)} style={{ padding: "4px 8px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>⏱️ 起動</button>
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

      {/* ⚙️ モード(種類)管理モーダル */}
      {isManagingModes && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>⚙️ ルーティンモード(種類)の管理</h4>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="text" placeholder="新しいモード名 (例: テスト期間)..." value={newModeLabelInput} onChange={(e) => setNewModeLabelInput(e.target.value)} style={{ flex: 1, padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }} />
              <button onClick={handleAddModeOption} style={{ padding: "8px 14px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>＋追加</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
              <span style={{ fontSize: "12px", color: "#888" }}>現在のモード一覧:</span>
              {modeOptions.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d0d0d", padding: "8px 12px", borderRadius: "4px", border: "1px solid #222" }}>
                  <span style={{ fontWeight: "bold", fontSize: "14px" }}>{m.label} ({m.id})</span>
                  {modeOptions.length > 1 && (
                    <button onClick={() => handleDeleteModeOption(m.id)} style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer", fontSize: "12px" }}>🗑️ 削除</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setIsManagingModes(false)} style={{ marginTop: "10px", padding: "10px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>完了</button>
          </div>
        </div>
      )}

      {/* 📺 全画面手順モード */}
      {activePlayerRoutine && playerSteps.length > 0 && (
        <div style={{ position: "fixed", inset: 0, background: "#050505", zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "40px 20px", color: "#fff", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "16px", color: "#C9A84C", fontWeight: "bold" }}>
              📜 {activePlayerRoutine.name} ➔ 【{activePlayerRoutine.hasRotation ? activePlayerRoutine.rotationItems[activePlayerRoutine.currentRotationIndex % activePlayerRoutine.rotationItems.length] : "手順"}】
            </span>
            <button onClick={() => setActivePlayerRoutine(null)} style={{ padding: "8px 16px", background: "#222", border: "1px solid #555", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>✕ 閉じる</button>
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
            <button onClick={handleNextPlayerStep} style={{ width: "100%", maxWidth: "500px", padding: "20px 40px", background: "linear-gradient(135deg, #22c55e, #15803d)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "24px", fontWeight: "900", cursor: "pointer", boxShadow: "0 10px 30px rgba(34,197,94,0.4)" }}>
              {playerCurrentStepIndex + 1 < playerSteps.length ? "✅ クリア (次の種目へ ➔)" : "🔥 作戦完遂！ (ルーティン完了)"}
            </button>
          </div>
        </div>
      )}

      {/* ✏️ 編集 / 新規作成モーダル */}
      {(isCreating || editingRoutine) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "400px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "90vh", overflowY: "auto" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>{isCreating ? "＋ 日課新規追加" : "✏️ 日課・所属モード＆設定変更"}</h4>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>ルーティン名:</span>
              <input
                type="text" placeholder="例: 筋トレ, 帝国学習..."
                value={isCreating ? newRoutine.name : editingRoutine?.name || ""}
                onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, name: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, name: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            {/* 🔴 カレンダー赤色表示トグル */}
            <div style={{ background: "#0d0d0d", padding: "10px", borderRadius: "6px", border: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: "bold" }}>🔴 カレンダーに赤色で表示する:</span>
              <input
                type="checkbox"
                checked={isCreating ? Boolean((newRoutine as any).showOnCalendar) : Boolean(editingRoutine?.showOnCalendar)}
                onChange={(e) => {
                  const val = e.target.checked;
                  if (isCreating) setNewRoutine({ ...newRoutine, showOnCalendar: val } as any);
                  else if (editingRoutine) setEditingRoutine({ ...editingRoutine, showOnCalendar: val });
                }}
                style={{ accentColor: "#ef4444", cursor: "pointer", width: "18px", height: "18px" }}
              />
            </div>

            {/* 所属モード選択 */}
            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222" }}>
              <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold", display: "block", marginBottom: "8px" }}>🏷️ 表示するモード(種類)の選択:</span>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "6px" }}>
                <button type="button" onClick={() => toggleRoutineModeAssign("ALL", !isCreating)} style={{ padding: "4px 8px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                  ＋ 全てのモードに割り当て
                </button>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {modeOptions.map((opt) => {
                  const assigned = isCreating ? newRoutine.modes?.includes(opt.id) : editingRoutine?.modes?.includes(opt.id);
                  return (
                    <button
                      key={opt.id} type="button" onClick={() => toggleRoutineModeAssign(opt.id, !isCreating)}
                      style={{ padding: "6px 10px", background: assigned ? "#C9A84C" : "#1a1a1a", color: assigned ? "#000" : "#888", border: `1px solid ${assigned ? "#C9A84C" : "#333"}`, borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#888" }}>時間:</span>
              <input type="time" value={isCreating ? newRoutine.startTime : editingRoutine?.startTime || "07:00"} onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, startTime: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, startTime: e.target.value })} style={{ padding: "6px", background: "#000", border: "1px solid #333", color: "#C9A84C", borderRadius: "4px" }} />
              <span style={{ fontSize: "12px", color: "#888" }}>〜</span>
              <input type="time" value={isCreating ? newRoutine.endTime : editingRoutine?.endTime || "08:00"} onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, endTime: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, endTime: e.target.value })} style={{ padding: "6px", background: "#000", border: "1px solid #333", color: "#C9A84C", borderRadius: "4px" }} />
            </div>

            {/* 多段階ローテーション設定UI */}
            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold" }}>🔄 多段階ローテーション設定:</span>
                <label style={{ fontSize: "12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <input type="checkbox" checked={isCreating ? newRoutine.hasRotation : editingRoutine?.hasRotation || false} onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, hasRotation: e.target.checked }) : editingRoutine && setEditingRoutine({ ...editingRoutine, hasRotation: e.target.checked })} />
                  使用する
                </label>
              </div>

              {(isCreating ? newRoutine.hasRotation : editingRoutine?.hasRotation) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  <input
                    type="text" placeholder="例: 上半身, 下半身  または  数学, 英語, 国語"
                    value={rotationInputText}
                    onChange={(e) => {
                      const val = e.target.value; setRotationInputText(val);
                      const items = val.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
                      if (isCreating) setNewRoutine({ ...newRoutine, rotationItems: items });
                      else if (editingRoutine) setEditingRoutine({ ...editingRoutine, rotationItems: items });
                    }}
                    style={{ width: "100%", padding: "6px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }}
                  />

                  {/* 進行ルールの選択UI */}
                  <div>
                    <span style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px" }}>次へ進む進行ルールの選択:</span>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                      {[
                        { id: "check", label: "完了チェック数で次へ" },
                        { id: "days", label: "表示日数経過で自動更新" },
                      ].map((type) => {
                        const active = (isCreating ? newRoutine.rotAdvanceType : editingRoutine?.rotAdvanceType || "check") === type.id;
                        return (
                          <button
                            key={type.id} type="button"
                            onClick={() => {
                              if (isCreating) setNewRoutine({ ...newRoutine, rotAdvanceType: type.id as any });
                              else if (editingRoutine) setEditingRoutine({ ...editingRoutine, rotAdvanceType: type.id as any });
                            }}
                            style={{
                              flex: 1, padding: "6px 0",
                              background: active ? "#C9A84C" : "#1a1a1a",
                              color: active ? "#000" : "#888",
                              border: "1px solid #C9A84C",
                              borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer"
                            }}
                          >
                            {type.label}
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                      <span>目標値:</span>
                      <input
                        type="number" min="1" max="30"
                        value={isCreating ? newRoutine.rotTargetCount : editingRoutine?.rotTargetCount || 1}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (isCreating) setNewRoutine({ ...newRoutine, rotTargetCount: val });
                          else if (editingRoutine) setEditingRoutine({ ...editingRoutine, rotTargetCount: val });
                        }}
                        style={{ width: "50px", padding: "4px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }}
                      />
                      <span>{(isCreating ? newRoutine.rotAdvanceType : editingRoutine?.rotAdvanceType) === "days" ? "日表示されたら自動で次へ (非表示日は除く)" : "回チェック完了したら次へ"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 手順メモ設定UI */}
            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: "bold" }}>📋 手順メモ設定 (全画面表示用):</span>
                <label style={{ fontSize: "12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <input type="checkbox" checked={isCreating ? newRoutine.hasSteps : editingRoutine?.hasSteps || false} onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, hasSteps: e.target.checked }) : editingRoutine && setEditingRoutine({ ...editingRoutine, hasSteps: e.target.checked })} />
                  使用する
                </label>
              </div>

              {(isCreating ? newRoutine.hasSteps : editingRoutine?.hasSteps) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {((isCreating ? newRoutine.rotationItems : editingRoutine?.rotationItems) || []).length > 0 && (
                    <div>
                      <span style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px" }}>手順を編集するサブ項目を選択:</span>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {((isCreating ? newRoutine.rotationItems : editingRoutine?.rotationItems) || ["デフォルト"]).map((sub) => (
                          <button
                            key={sub} type="button" onClick={() => handleSubTabChange(sub, !isCreating)}
                            style={{ padding: "4px 8px", background: editingSubTab === sub ? "#22c55e" : "#1a1a1a", color: editingSubTab === sub ? "#000" : "#888", border: "1px solid #22c55e", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={4} placeholder={`1. ベンチプレス (3セット)\n2. ラットプルダウン (3セット)`}
                    value={stepInputText} onChange={(e) => handleStepTextChange(e.target.value, !isCreating)}
                    style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#22c55e", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box", fontFamily: "monospace" }}
                  />
                </div>
              )}
            </div>

            {/* 表示頻度設定UI */}
            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222" }}>
              <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold", display: "block", marginBottom: "8px" }}>⚙️ 表示頻度の設定:</span>
              <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                {[
                  { id: "daily", label: "毎日" },
                  { id: "interval", label: "〇日に1回" },
                  { id: "weekly", label: "曜日指定" },
                ].map((f) => {
                  const active = (isCreating ? newRoutine.freqType : editingRoutine?.freqType) === f.id;
                  return (
                    <button
                      key={f.id} type="button"
                      onClick={() => isCreating ? setNewRoutine({ ...newRoutine, freqType: f.id as any }) : editingRoutine && setEditingRoutine({ ...editingRoutine, freqType: f.id as any })}
                      style={{ flex: 1, padding: "6px 0", background: active ? "#C9A84C" : "#1a1a1a", color: active ? "#000" : "#888", border: "1px solid #C9A84C", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {(isCreating ? newRoutine.freqType : editingRoutine?.freqType) === "interval" && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <span>表示間隔:</span>
                  <input type="number" min="2" max="30" value={isCreating ? newRoutine.freqIntervalDays : editingRoutine?.freqIntervalDays || 2} onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, freqIntervalDays: Number(e.target.value) }) : editingRoutine && setEditingRoutine({ ...editingRoutine, freqIntervalDays: Number(e.target.value) })} style={{ width: "60px", padding: "6px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center" }} />
                  <span>日に1回</span>
                </div>
              )}

              {(isCreating ? newRoutine.freqType : editingRoutine?.freqType) === "weekly" && (
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {WEEKDAYS.map((dayName, idx) => {
                    const selected = isCreating ? newRoutine.freqDaysOfWeek?.includes(idx) : editingRoutine?.freqDaysOfWeek?.includes(idx);
                    return (
                      <button
                        key={dayName} type="button" onClick={() => toggleFreqDay(idx, !isCreating)}
                        style={{ padding: "6px 10px", background: selected ? "#C9A84C" : "#1a1a1a", color: selected ? "#000" : "#666", border: `1px solid ${selected ? "#C9A84C" : "#333"}`, borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        {dayName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

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
    </div>
  );
}
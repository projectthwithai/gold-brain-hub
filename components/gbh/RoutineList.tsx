"use client";
import React, { useState, useEffect } from "react";

export type RoutineMode = "weekday" | "holiday" | "monk";
export type FrequencyType = "daily" | "interval" | "weekly";
export type RotationAdvanceType = "check" | "days"; // "check": チェック完了数, "days": 表示日数経過

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
  rotTargetCount: number;      // 〇回チェック (または 〇日経過)
  rotCurrentCount: number;     // 現在の完了カウント (または 表示日数カウント)
  rotAdvanceType: RotationAdvanceType; // "check" | "days"
  lastDisplayedDate?: string;  // 最後に表示された日付 (YYYY-MM-DD)

  hasSteps: boolean;
  stepMap: Record<string, string[]>;
  showOnCalendar?: boolean;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const INITIAL_ROUTINES: RoutineItem[] = [
  {
    id: "r1", name: "肉体兵站 筋トレローテーション", startTime: "06:30", endTime: "07:15", duration: 45,
    modes: ["weekday", "holiday", "monk"], freqType: "interval", freqIntervalDays: 2, freqDaysOfWeek: [1, 3, 5], done: false,
    hasRotation: true, rotationItems: ["上半身", "下半身"], currentRotationIndex: 0, rotTargetCount: 2, rotCurrentCount: 0,
    rotAdvanceType: "days", // ★2日表示経過で自動的に「下半身」へ切替★
    hasSteps: true,
    stepMap: {
      "上半身": ["1. ベンチプレス (3セット)", "2. ラットプルダウン (3セット)"],
      "下半身": ["1. スクワット (3セット)", "2. レッグプレス (3セット)"]
    },
    showOnCalendar: true
  },
  {
    id: "r2", name: "朝5時 帝国学習ローテーション", startTime: "05:00", endTime: "06:30", duration: 90,
    modes: ["weekday", "holiday", "monk"], freqType: "daily", freqIntervalDays: 1, freqDaysOfWeek: [1, 2, 3, 4, 5], done: false,
    hasRotation: true, rotationItems: ["数学 (微分積分)", "英語 (SVOC構文)", "現代文 (論理読解)"], currentRotationIndex: 0, rotTargetCount: 1, rotCurrentCount: 0,
    rotAdvanceType: "check", // 1回チェックで次へ
    hasSteps: true, stepMap: {}, showOnCalendar: false
  },
];

interface RoutineListProps {
  onQuickTimer?: (taskName: string, durationMinutes: number) => void;
}

export default function RoutineList({ onQuickTimer }: RoutineListProps) {
  const [currentMode, setCurrentMode] = useState<RoutineMode>("weekday");
  const [routines, setRoutines] = useState<RoutineItem[]>(INITIAL_ROUTINES);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingSubTab, setEditingSubTab] = useState<string>("上半身");
  const [rotationInputText, setRotationInputText] = useState("");
  const [stepInputText, setStepInputText] = useState("");

  const [newRoutine, setNewRoutine] = useState<Omit<RoutineItem, "id" | "done" | "currentRotationIndex" | "rotCurrentCount">>({
    name: "", startTime: "07:00", endTime: "08:00", duration: 60,
    modes: ["weekday", "holiday", "monk"], freqType: "daily", freqIntervalDays: 2, freqDaysOfWeek: [1, 3, 5],
    hasRotation: false, rotationItems: ["上半身", "下半身"], rotTargetCount: 1, rotAdvanceType: "check",
    hasSteps: false, stepMap: {}, showOnCalendar: false
  });

  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const todayDow = new Date().getDay();

  // 表示対象のフィルタリング ＆ ★「日数経過ベース」の自動ローテーション更新処理★
  useEffect(() => {
    let updated = false;
    const newRoutines = routines.map((r) => {
      // 表示日かつ「日数経過ベース (days)」のローテーション場合
      if (r.hasRotation && r.rotAdvanceType === "days" && r.modes.includes(currentMode)) {
        if (r.lastDisplayedDate !== todayStr) {
          updated = true;
          const nextDaysCount = r.rotCurrentCount + 1;
          let nextIndex = r.currentRotationIndex;
          let resetCount = nextDaysCount;

          // 指定表示日数に達したら自動で次のサブ項目へ歩進！
          if (nextDaysCount >= r.rotTargetCount) {
            nextIndex = (r.currentRotationIndex + 1) % r.rotationItems.length;
            resetCount = 0;
          }

          return {
            ...r,
            lastDisplayedDate: todayStr,
            rotCurrentCount: resetCount,
            currentRotationIndex: nextIndex,
          };
        }
      }
      return r;
    });

    if (updated) {
      setRoutines(newRoutines);
    }
  }, [currentMode, todayStr]);

  const filtered = routines.filter((r) => {
    if (!r.modes.includes(currentMode)) return false;
    if (r.freqType === "daily") return true;
    if (r.freqType === "weekly") return r.freqDaysOfWeek?.includes(todayDow) ?? true;
    if (r.freqType === "interval") return true;
    return true;
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // チェック操作 (rotAdvanceType === "check" の時のみカウント進める)
  const toggleDone = (id: string) => {
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

  const deleteRoutine = (id: string) => {
    setRoutines(routines.filter((r) => r.id !== id));
  };

  const handleSkipRotation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoutines(routines.map((r) => {
      if (r.id !== id || !r.hasRotation || r.rotationItems.length === 0) return r;
      const nextIndex = (r.currentRotationIndex + 1) % r.rotationItems.length;
      return { ...r, currentRotationIndex: nextIndex, rotCurrentCount: 0 };
    }));
  };

  const handleAddRoutine = () => {
    if (!newRoutine.name.trim()) return;
    const item: RoutineItem = {
      ...newRoutine,
      id: Date.now().toString(),
      done: false,
      currentRotationIndex: 0,
      rotCurrentCount: 0,
    };
    setRoutines([...routines, item]);
    setIsCreating(false);
  };

  const saveEdit = () => {
    if (!editingRoutine) return;
    setRoutines(routines.map((r) => (r.id === editingRoutine.id ? editingRoutine : r)));
    setEditingRoutine(null);
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff", fontFamily: "sans-serif" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📜 日課ルーティン統制 (自律ローテーション対応)</h3>

        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setIsCreating(true)} style={{ padding: "6px 12px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}>
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

      {/* ルーティン一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.map((item) => {
          const currentSubItem = item.hasRotation && item.rotationItems?.length > 0
            ? item.rotationItems[item.currentRotationIndex % item.rotationItems.length]
            : null;

          return (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#151515", border: "1px solid #222", padding: "12px 15px", borderRadius: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleDone(item.id)}
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
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ textDecoration: item.done ? "line-through" : "none", color: item.done ? "#888" : "#fff", fontWeight: "bold", fontSize: "15px" }}>
                      {item.name}
                    </span>

                    {/* ローテーション状態バッジ */}
                    {item.hasRotation && currentSubItem && (
                      <span style={{ padding: "2px 8px", background: "#111", border: "1px solid #C9A84C", color: "#C9A84C", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
                        🎯 現在: {currentSubItem} ({item.rotCurrentCount}/{item.rotTargetCount}{item.rotAdvanceType === "days" ? "日表示経過で自動切替" : "回完了で次へ"})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                {item.hasRotation && item.rotationItems?.length > 0 && (
                  <button onClick={(e) => handleSkipRotation(item.id, e)} style={{ padding: "4px 8px", background: "#222", color: "#f59e0b", border: "1px solid #f59e0b", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>
                    スキップ ⏩
                  </button>
                )}
                <button onClick={() => onQuickTimer && onQuickTimer(currentSubItem ? `${item.name} (${currentSubItem})` : item.name, item.duration)} style={{ padding: "4px 8px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>⏱️ 起動</button>
                <button onClick={() => setEditingRoutine(item)} style={{ padding: "4px 8px", background: "#222", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>✏️ 編集</button>
                <button onClick={() => deleteRoutine(item.id)} style={{ padding: "4px 8px", background: "#222", color: "#e11d48", border: "1px solid #e11d48", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ✏️ 編集 / 新規作成モーダル (ローテーション進行ルールの2選択機能組み込み) */}
      {(isCreating || editingRoutine) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "400px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "90vh", overflowY: "auto" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>{isCreating ? "＋ 日課新規追加" : "✏️ 日課・自律ローテーション設定"}</h4>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>ルーティン名:</span>
              <input
                type="text" placeholder="例: 筋トレ, 帝国学習..."
                value={isCreating ? newRoutine.name : editingRoutine?.name || ""}
                onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, name: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, name: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            {/* 多段階ローテーション ＆ 進行条件の選択設定UI */}
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
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
                  <input
                    type="text" placeholder="サブ項目 (例: 上半身, 下半身  または  数学, 英語, 国語)"
                    value={isCreating ? newRoutine.rotationItems?.join(", ") : editingRoutine?.rotationItems?.join(", ") || ""}
                    onChange={(e) => {
                      const items = e.target.value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
                      if (isCreating) setNewRoutine({ ...newRoutine, rotationItems: items });
                      else if (editingRoutine) setEditingRoutine({ ...editingRoutine, rotationItems: items });
                    }}
                    style={{ width: "100%", padding: "6px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }}
                  />

                  {/* ★要件: 次へ進む進行条件の2選択ラジオUI★ */}
                  <div>
                    <span style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px" }}>次へ進む進行ルールの選択:</span>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                      {[
                        { id: "check", label: "完了チェック数で次へ" },
                        { id: "days", label: "表示日数経過で自動更新" },
                      ].map((type) => {
                        const active = (isCreating ? newRoutine.rotAdvanceType : editingRoutine?.rotAdvanceType) === type.id;
                        return (
                          <button
                            key={type.id} type="button"
                            onClick={() => isCreating ? setNewRoutine({ ...newRoutine, rotAdvanceType: type.id as any }) : editingRoutine && setEditingRoutine({ ...editingRoutine, rotAdvanceType: type.id as any })}
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
                        onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, rotTargetCount: Number(e.target.value) }) : editingRoutine && setEditingRoutine({ ...editingRoutine, rotTargetCount: Number(e.target.value) })}
                        style={{ width: "50px", padding: "4px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }}
                      />
                      <span>{(isCreating ? newRoutine.rotAdvanceType : editingRoutine?.rotAdvanceType) === "days" ? "日表示されたら自動で次へ (非表示日は除く)" : "回チェック完了したら次へ"}</span>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* 保存 / キャンセル */}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={isCreating ? handleAddRoutine : saveEdit}
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
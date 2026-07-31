"use client";
import React, { useState } from "react";

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
  freqIntervalDays?: number; // 〇日に1回用
  freqDaysOfWeek?: number[];  // 0=日, 1=月, 2=火, 3=水, 4=木, 5=金, 6=土
  done: boolean;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const INITIAL_ROUTINES: RoutineItem[] = [
  { id: "r1", name: "朝5時 Deep Work (数学演習)", startTime: "05:00", endTime: "06:30", duration: 90, modes: ["weekday", "holiday", "monk"], freqType: "daily", done: false },
  { id: "r2", name: "高強度筋トレ (肉体兵站)", startTime: "06:30", endTime: "07:15", duration: 45, modes: ["weekday", "holiday", "monk"], freqType: "interval", freqIntervalDays: 2, done: false },
  { id: "r3", name: "英語 SVOC 論理構造", startTime: "08:00", endTime: "09:00", duration: 60, modes: ["weekday", "monk"], freqType: "weekly", freqDaysOfWeek: [1, 3, 5], done: false }, // 月水金
];

export default function RoutineList({ onQuickTimer }: { onQuickTimer?: (name: string, mins: number) => void }) {
  const [currentMode, setCurrentMode] = useState<RoutineMode>("weekday");
  const [routines, setRoutines] = useState<RoutineItem[]>(INITIAL_ROUTINES);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 新規作成用フォームのState
  const [newRoutine, setNewRoutine] = useState<Omit<RoutineItem, "id" | "done">>({
    name: "",
    startTime: "07:00",
    endTime: "08:00",
    duration: 60,
    modes: ["weekday", "holiday", "monk"],
    freqType: "daily",
    freqIntervalDays: 2,
    freqDaysOfWeek: [1, 3, 5],
  });

  const todayDow = new Date().getDay(); // 今日の曜日 (0〜6)

  // モード ＆ 表示頻度(Frequency) の両方の条件に合うものを抽出して時間順にソート！
  const filtered = routines
    .filter((r) => {
      // 1. モード判定
      if (!r.modes.includes(currentMode)) return false;

      // 2. 頻度(Frequency)判定
      if (r.freqType === "daily") return true;
      if (r.freqType === "weekly") {
        return r.freqDaysOfWeek?.includes(todayDow) ?? true;
      }
      if (r.freqType === "interval") return true; // 〇日に1回

      return true;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const toggleDone = (id: string) => {
    setRoutines(routines.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  };

  const deleteRoutine = (id: string) => {
    setRoutines(routines.filter((r) => r.id !== id));
  };

  const handleAddRoutine = () => {
    if (!newRoutine.name.trim()) return;
    const item: RoutineItem = {
      ...newRoutine,
      id: Date.now().toString(),
      done: false,
    };
    setRoutines([...routines, item]);
    setIsCreating(false);
    setNewRoutine({
      name: "",
      startTime: "07:00",
      endTime: "08:00",
      duration: 60,
      modes: ["weekday", "holiday", "monk"],
      freqType: "daily",
      freqIntervalDays: 2,
      freqDaysOfWeek: [1, 3, 5],
    });
  };

  const saveEdit = () => {
    if (!editingRoutine) return;
    setRoutines(routines.map((r) => (r.id === editingRoutine.id ? editingRoutine : r)));
    setEditingRoutine(null);
  };

  const toggleFreqDay = (dow: number, isEdit = false) => {
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

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📜 時間・頻度対応 日課ルーティン管理</h3>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setIsCreating(true)}
            style={{ padding: "6px 12px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
          >
            ＋ 日課新規追加
          </button>

          {/* モード切替 */}
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
        {filtered.map((item) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#151515", border: "1px solid #222", padding: "12px 15px", borderRadius: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="checkbox" checked={item.done} onChange={() => toggleDone(item.id)} style={{ accentColor: "#C9A84C", cursor: "pointer", width: "18px", height: "18px" }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                  <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold" }}>
                    ⏰ {item.startTime} - {item.endTime}
                  </span>
                  
                  {/* 表示頻度バッジ表示 */}
                  <span style={{ fontSize: "10px", padding: "1px 6px", background: "#222", color: "#aaa", border: "1px solid #444", borderRadius: "3px" }}>
                    {item.freqType === "daily" && "📅 毎日"}
                    {item.freqType === "interval" && `🔄 ${item.freqIntervalDays}日に1回`}
                    {item.freqType === "weekly" && `📆 曜日: ${item.freqDaysOfWeek?.map((d) => WEEKDAYS[d]).join(",")}`}
                  </span>
                </div>

                <span style={{ textDecoration: item.done ? "line-through" : "none", color: item.done ? "#888" : "#fff", fontWeight: "bold", fontSize: "15px" }}>
                  {item.name}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => onQuickTimer && onQuickTimer(item.name, item.duration)} style={{ padding: "4px 8px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                ⏱️ 起動
              </button>
              <button onClick={() => setEditingRoutine(item)} style={{ padding: "4px 8px", background: "#222", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                ✏️ 編集
              </button>
              <button onClick={() => deleteRoutine(item.id)} style={{ padding: "4px 8px", background: "#222", color: "#e11d48", border: "1px solid #e11d48", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* モーダル (新規追加 または 編集) */}
      {(isCreating || editingRoutine) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
            <h4 style={{ margin: 0, color: "#C9A84C" }}>{isCreating ? "＋ 日課新規追加" : "✏️ 日課・表示頻度編集"}</h4>

            <input
              type="text"
              placeholder="ルーティン名を入力..."
              value={isCreating ? newRoutine.name : editingRoutine?.name || ""}
              onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, name: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, name: e.target.value })}
              style={{ padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
            />

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#888" }}>時間:</span>
              <input
                type="time"
                value={isCreating ? newRoutine.startTime : editingRoutine?.startTime || "07:00"}
                onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, startTime: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, startTime: e.target.value })}
                style={{ padding: "6px", background: "#000", border: "1px solid #333", color: "#C9A84C", borderRadius: "4px" }}
              />
              <span style={{ fontSize: "12px", color: "#888" }}>〜</span>
              <input
                type="time"
                value={isCreating ? newRoutine.endTime : editingRoutine?.endTime || "08:00"}
                onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, endTime: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, endTime: e.target.value })}
                style={{ padding: "6px", background: "#000", border: "1px solid #333", color: "#C9A84C", borderRadius: "4px" }}
              />
            </div>

            {/* 要件: 表示頻度設定UI (毎日 / 〇日に1回 / 曜日指定) */}
            <div style={{ background: "#0d0d0d", padding: "10px", borderRadius: "6px", border: "1px solid #222" }}>
              <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold", display: "block", marginBottom: "8px" }}>⚙️ 表示頻度の設定:</span>

              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                {(["daily", "interval", "weekly"] as FrequencyType[]).map((f) => (
                  <label key={f} style={{ fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                    <input
                      type="radio"
                      name="freq"
                      checked={(isCreating ? newRoutine.freqType : editingRoutine?.freqType) === f}
                      onChange={() => isCreating ? setNewRoutine({ ...newRoutine, freqType: f }) : editingRoutine && setEditingRoutine({ ...editingRoutine, freqType: f })}
                    />
                    {f === "daily" && "毎日"}
                    {f === "interval" && "〇日に1回"}
                    {f === "weekly" && "曜日で指定"}
                  </label>
                ))}
              </div>

              {/* 〇日に1回入力フォーム */}
              {(isCreating ? newRoutine.freqType : editingRoutine?.freqType) === "interval" && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    value={isCreating ? newRoutine.freqIntervalDays : editingRoutine?.freqIntervalDays || 2}
                    onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, freqIntervalDays: Number(e.target.value) }) : editingRoutine && setEditingRoutine({ ...editingRoutine, freqIntervalDays: Number(e.target.value) })}
                    style={{ width: "60px", padding: "4px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center" }}
                  />
                  <span>日に1回表示</span>
                </div>
              )}

              {/* 曜日複数選択チェックボックス */}
              {(isCreating ? newRoutine.freqType : editingRoutine?.freqType) === "weekly" && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {WEEKDAYS.map((dayName, idx) => {
                    const selected = isCreating ? newRoutine.freqDaysOfWeek?.includes(idx) : editingRoutine?.freqDaysOfWeek?.includes(idx);
                    return (
                      <button
                        key={dayName}
                        type="button"
                        onClick={() => toggleFreqDay(idx, !isCreating)}
                        style={{
                          padding: "4px 8px",
                          background: selected ? "#C9A84C" : "#222",
                          color: selected ? "#000" : "#888",
                          border: "none",
                          borderRadius: "3px",
                          fontSize: "11px",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        {dayName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ボタン */}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={isCreating ? handleAddRoutine : saveEdit}
                style={{ flex: 1, padding: "8px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                保存
              </button>
              <button
                onClick={() => { setIsCreating(false); setEditingRoutine(null); }}
                style={{ flex: 1, padding: "8px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
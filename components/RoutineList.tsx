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
  freqIntervalDays: number; // 〇日に1回用 (デフォルト2)
  freqDaysOfWeek: number[]; // 曜日の配列 (0=日, 1=月, ..., 6=土)
  done: boolean;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const INITIAL_ROUTINES: RoutineItem[] = [
  { id: "r1", name: "朝5時 Deep Work (数学演習)", startTime: "05:00", endTime: "06:30", duration: 90, modes: ["weekday", "holiday", "monk"], freqType: "daily", freqIntervalDays: 1, freqDaysOfWeek: [1,2,3,4,5], done: false },
  { id: "r2", name: "高強度筋トレ (肉体兵站補給)", startTime: "06:30", endTime: "07:15", duration: 45, modes: ["weekday", "holiday", "monk"], freqType: "interval", freqIntervalDays: 2, freqDaysOfWeek: [1,3,5], done: false },
  { id: "r3", name: "英語 SVOC 論理構造インストール", startTime: "08:00", endTime: "09:00", duration: 60, modes: ["weekday", "monk"], freqType: "weekly", freqIntervalDays: 1, freqDaysOfWeek: [1, 3, 5], done: false },
];

export default function RoutineList({ onQuickTimer }: { onQuickTimer?: (name: string, mins: number) => void }) {
  const [currentMode, setCurrentMode] = useState<RoutineMode>("weekday");
  const [routines, setRoutines] = useState<RoutineItem[]>(INITIAL_ROUTINES);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

  const todayDow = new Date().getDay();

  const filtered = routines
    .filter((r) => {
      if (!r.modes.includes(currentMode)) return false;
      if (r.freqType === "daily") return true;
      if (r.freqType === "weekly") return r.freqDaysOfWeek?.includes(todayDow) ?? true;
      if (r.freqType === "interval") return true;
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
  };

  const saveEdit = () => {
    if (!editingRoutine) return;
    setRoutines(routines.map((r) => (r.id === editingRoutine.id ? editingRoutine : r)));
    setEditingRoutine(null);
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

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff" }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📜 日課ルーティン管理一覧</h3>

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
        {filtered.map((item) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#151515", border: "1px solid #222", padding: "12px 15px", borderRadius: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="checkbox" checked={item.done} onChange={() => toggleDone(item.id)} style={{ accentColor: "#C9A84C", cursor: "pointer", width: "18px", height: "18px" }} />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                  <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold" }}>
                    ⏰ {item.startTime} - {item.endTime}
                  </span>
                  
                  {/* 表示頻度バッジ */}
                  <span style={{ fontSize: "10px", padding: "2px 6px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "3px" }}>
                    {item.freqType === "daily" && "📅 毎日"}
                    {item.freqType === "interval" && `🔄 ${item.freqIntervalDays || 2}日に1回`}
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

      {/* ✏️ 編集 / ＋ 新規作成 ポップアップモーダル */}
      {(isCreating || editingRoutine) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>{isCreating ? "＋ 日課新規追加" : "✏️ 日課・表示頻度の設定変更"}</h4>

            {/* ルーティン名 */}
            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>ルーティン名:</span>
              <input
                type="text"
                placeholder="ルーティン名を入力..."
                value={isCreating ? newRoutine.name : editingRoutine?.name || ""}
                onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, name: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, name: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            {/* 時間設定 */}
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

            {/* ⚙️ 表示頻度設定UI (毎日 / 〇日に1回 / 曜日指定) */}
            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222" }}>
              <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold", display: "block", marginBottom: "8px" }}>⚙️ 表示頻度の設定:</span>

              {/* タイプ切り替えボタン */}
              <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                {[
                  { id: "daily", label: "毎日" },
                  { id: "interval", label: "〇日に1回" },
                  { id: "weekly", label: "曜日指定" },
                ].map((f) => {
                  const active = (isCreating ? newRoutine.freqType : editingRoutine?.freqType) === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => isCreating ? setNewRoutine({ ...newRoutine, freqType: f.id as any }) : editingRoutine && setEditingRoutine({ ...editingRoutine, freqType: f.id as any })}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        background: active ? "#C9A84C" : "#1a1a1a",
                        color: active ? "#000" : "#888",
                        border: "1px solid #C9A84C",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* 〇日に1回フォーム */}
              {(isCreating ? newRoutine.freqType : editingRoutine?.freqType) === "interval" && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <span>表示間隔:</span>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    value={isCreating ? newRoutine.freqIntervalDays : editingRoutine?.freqIntervalDays || 2}
                    onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, freqIntervalDays: Number(e.target.value) }) : editingRoutine && setEditingRoutine({ ...editingRoutine, freqIntervalDays: Number(e.target.value) })}
                    style={{ width: "60px", padding: "6px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }}
                  />
                  <span>日に1回</span>
                </div>
              )}

              {/* 曜日複数選択ボタン群 */}
              {(isCreating ? newRoutine.freqType : editingRoutine?.freqType) === "weekly" && (
                <div>
                  <span style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "6px" }}>表示する曜日を選択 (複数選択可):</span>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {WEEKDAYS.map((dayName, idx) => {
                      const selected = isCreating ? newRoutine.freqDaysOfWeek?.includes(idx) : editingRoutine?.freqDaysOfWeek?.includes(idx);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => toggleFreqDay(idx, !isCreating)}
                          style={{
                            padding: "6px 10px",
                            background: selected ? "#C9A84C" : "#1a1a1a",
                            color: selected ? "#000" : "#666",
                            border: `1px solid ${selected ? "#C9A84C" : "#333"}`,
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer",
                            fontWeight: "bold",
                          }}
                        >
                          {dayName}
                        </button>
                      );
                    })}
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

              <button
                onClick={() => { setIsCreating(false); setEditingRoutine(null); }}
                style={{ flex: 1, padding: "10px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
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
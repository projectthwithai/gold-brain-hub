"use client";
import React, { useState } from "react";

export type RoutineMode = "weekday" | "holiday" | "monk";

export interface RoutineItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  modes: RoutineMode[];
  done: boolean;
}

const INITIAL_ROUTINES: RoutineItem[] = [
  { id: "r1", name: "朝5時 Deep Work (数学演習)", startTime: "05:00", endTime: "06:30", duration: 90, modes: ["weekday", "holiday", "monk"], done: false },
  { id: "r2", name: "高強度筋トレ (肉体兵站補給)", startTime: "06:30", endTime: "07:15", duration: 45, modes: ["weekday", "holiday", "monk"], done: false },
  { id: "r3", name: "英語 SVOC 論理構造インストール", startTime: "08:00", endTime: "09:00", duration: 60, modes: ["weekday", "monk"], done: false },
  { id: "r4", name: "現代文 論理デバッグ＆要約演習", startTime: "09:15", endTime: "10:00", duration: 45, modes: ["weekday", "monk"], done: false },
];

export default function RoutineList({ onQuickTimer }: { onQuickTimer?: (name: string, mins: number) => void }) {
  const [currentMode, setCurrentMode] = useState<RoutineMode>("weekday");
  const [routines, setRoutines] = useState<RoutineItem[]>(INITIAL_ROUTINES);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);

  const filtered = routines
    .filter((r) => r.modes.includes(currentMode))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const toggleDone = (id: string) => {
    setRoutines(routines.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  };

  const deleteRoutine = (id: string) => {
    setRoutines(routines.filter((r) => r.id !== id));
  };

  const saveEdit = () => {
    if (!editingRoutine) return;
    setRoutines(routines.map((r) => (r.id === editingRoutine.id ? editingRoutine : r)));
    setEditingRoutine(null);
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📜 日課ルーティン一覧 (開始時間ソート済み)</h3>

        <div style={{ display: "flex", gap: "5px" }}>
          {(["weekday", "holiday", "monk"] as RoutineMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setCurrentMode(m)}
              style={{
                padding: "6px 12px",
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

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.map((item) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#151515", border: "1px solid #222", padding: "12px 15px", borderRadius: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="checkbox" checked={item.done} onChange={() => toggleDone(item.id)} style={{ accentColor: "#C9A84C", cursor: "pointer" }} />
              <div>
                <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold", marginRight: "8px" }}>
                  ⏰ {item.startTime} - {item.endTime}
                </span>
                <span style={{ textDecoration: item.done ? "line-through" : "none", color: item.done ? "#888" : "#fff", fontWeight: "bold" }}>
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
                🗑️ 削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingRoutine && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "320px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <h4 style={{ margin: 0, color: "#C9A84C" }}>✏️ ルーティン編集</h4>
            <input type="text" value={editingRoutine.name} onChange={(e) => setEditingRoutine({ ...editingRoutine, name: e.target.value })} style={{ padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="time" value={editingRoutine.startTime} onChange={(e) => setEditingRoutine({ ...editingRoutine, startTime: e.target.value })} style={{ flex: 1, padding: "8px", background: "#000", border: "1px solid #333", color: "#C9A84C", borderRadius: "4px" }} />
              <input type="time" value={editingRoutine.endTime} onChange={(e) => setEditingRoutine({ ...editingRoutine, endTime: e.target.value })} style={{ flex: 1, padding: "8px", background: "#000", border: "1px solid #333", color: "#C9A84C", borderRadius: "4px" }} />
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button onClick={saveEdit} style={{ flex: 1, padding: "8px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>保存</button>
              <button onClick={() => setEditingRoutine(null)} style={{ flex: 1, padding: "8px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
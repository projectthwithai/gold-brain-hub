"use client";
import React, { useState } from "react";

export type RoutineMode = "weekday" | "holiday" | "monk";

export interface RoutineItem {
  id: string;
  name: string;
  duration: number;
  modes: RoutineMode[];
  done: boolean;
}

const INITIAL_ROUTINES: RoutineItem[] = [
  { id: "r1", name: "朝5時 Deep Work (数学演習)", duration: 90, modes: ["weekday", "holiday", "monk"], done: false },
  { id: "r2", name: "高強度筋トレ (肉体兵站補給)", duration: 45, modes: ["weekday", "holiday", "monk"], done: false },
  { id: "r3", name: "英語 SVOC 論理構造インストール", duration: 60, modes: ["weekday", "monk"], done: false },
  { id: "r4", name: "現代文 論理デバッグ＆要約演習", duration: 45, modes: ["weekday", "monk"], done: false },
];

export default function RoutineList({ onQuickTimer }: { onQuickTimer?: (name: string, mins: number) => void }) {
  const [currentMode, setCurrentMode] = useState<RoutineMode>("weekday");
  const [routines, setRoutines] = useState<RoutineItem[]>(INITIAL_ROUTINES);
  const [newName, setNewName] = useState("");
  const [newMin, setNewMin] = useState(30);

  const filtered = routines.filter((r) => r.modes.includes(currentMode));

  const addRoutine = () => {
    if (!newName.trim()) return;
    const item: RoutineItem = {
      id: Date.now().toString(),
      name: newName,
      duration: newMin,
      modes: ["weekday", "holiday", "monk"],
      done: false,
    };
    setRoutines([...routines, item]);
    setNewName("");
  };

  const deleteRoutine = (id: string) => {
    setRoutines(routines.filter((r) => r.id !== id));
  };

  const toggleDone = (id: string) => {
    setRoutines(routines.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📜 日課ルーティン管理一覧 (追加・編集・削除機能)</h3>

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

      {/* 新規ルーティン追加フォーム */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="新しいルーティン名を入力..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ flex: 1, padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
        />
        <input
          type="number"
          value={newMin}
          onChange={(e) => setNewMin(Number(e.target.value))}
          style={{ width: "60px", padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
        />
        <span style={{ alignSelf: "center", fontSize: "12px", color: "#888" }}>分</span>
        <button onClick={addRoutine} style={{ padding: "8px 16px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
          追加
        </button>
      </div>

      {/* ルーティン一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filtered.map((item) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#151515", border: "1px solid #222", padding: "12px 15px", borderRadius: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="checkbox" checked={item.done} onChange={() => toggleDone(item.id)} style={{ accentColor: "#C9A84C", cursor: "pointer" }} />
              <span style={{ textDecoration: item.done ? "line-through" : "none", color: item.done ? "#888" : "#fff", fontWeight: "bold" }}>
                {item.name} <span style={{ fontSize: "12px", color: "#C9A84C" }}>({item.duration}分)</span>
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => onQuickTimer && onQuickTimer(item.name, item.duration)} style={{ padding: "4px 10px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                ⏱️ 起動
              </button>
              <button onClick={() => deleteRoutine(item.id)} style={{ padding: "4px 8px", background: "#333", color: "#e11d48", border: "1px solid #e11d48", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                🗑️ 削除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
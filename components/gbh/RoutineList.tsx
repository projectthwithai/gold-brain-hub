"use client";
import React, { useState } from "react";

export type RoutineMode = "weekday" | "holiday" | "monk";

export interface RoutineItem {
  id: string;
  name: string;
  duration: number; // 分
  modes: RoutineMode[];
  done: boolean;
}

const INITIAL_ROUTINES: RoutineItem[] = [
  { id: "r1", name: "朝5時 Deep Work (数学演習)", duration: 90, modes: ["weekday", "holiday", "monk"], done: false },
  { id: "r2", name: "高強度筋トレ (肉体兵站補給)", duration: 45, modes: ["weekday", "holiday", "monk"], done: false },
  { id: "r3", name: "英語 SVOC 論理構造インストール", duration: 60, modes: ["weekday", "monk"], done: false },
  { id: "r4", name: "現代文 論理デバッグ＆要約演習", duration: 45, modes: ["weekday", "monk"], done: false },
  { id: "r5", name: "休日特別長時間の総復習演習", duration: 120, modes: ["holiday"], done: false },
  { id: "r6", name: "1日2L水・天然塩・卵摂取", duration: 10, modes: ["weekday", "holiday", "monk"], done: false },
];

interface RoutineListProps {
  onQuickTimer?: (taskName: string, durationMinutes: number) => void;
}

export default function RoutineList({ onQuickTimer }: RoutineListProps) {
  const [currentMode, setCurrentMode] = useState<RoutineMode>("weekday");
  const [routines, setRoutines] = useState<RoutineItem[]>(INITIAL_ROUTINES);

  const filteredRoutines = routines.filter((r) => r.modes.includes(currentMode));

  const toggleDone = (id: string) => {
    setRoutines(routines.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  };

  const completedCount = filteredRoutines.filter((r) => r.done).length;
  const progressPct = filteredRoutines.length > 0 ? Math.round((completedCount / filteredRoutines.length) * 100) : 0;

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff" }}>
      {/* モード切替ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📜 日課ルーティン全件管理一覧</h3>

        {/* 平日 / 休日・祝日 / MONK MODE 切替ボタン */}
        <div style={{ display: "flex", gap: "5px" }}>
          {[
            { id: "weekday", label: "平日モード" },
            { id: "holiday", label: "休日/祝日モード" },
            { id: "monk", label: "MONK MODE (極限)" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setCurrentMode(m.id as RoutineMode)}
              style={{
                padding: "6px 12px",
                background: currentMode === m.id ? "#C9A84C" : "#1b1b1b",
                color: currentMode === m.id ? "#000" : "#888",
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

      {/* 本日の達成率プログレスバー */}
      <div style={{ background: "#151515", padding: "12px", borderRadius: "6px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px", color: "#ccc" }}>
          <span>【{currentMode.toUpperCase()}】本日の日課達成度 ({completedCount} / {filteredRoutines.length})</span>
          <span style={{ color: "#C9A84C", fontWeight: "bold" }}>{progressPct}%</span>
        </div>
        <div style={{ width: "100%", background: "#222", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #C9A84C, #f59e0b)", height: "100%", transition: "width 0.3s" }} />
        </div>
      </div>

      {/* チェックボックス式ルーティン一覧 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredRoutines.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: item.done ? "#111" : "#1a1a1a",
              border: `1px solid ${item.done ? "#333" : "#2a2a2a"}`,
              padding: "12px 15px",
              borderRadius: "6px",
              opacity: item.done ? 0.6 : 1,
            }}
          >
            {/* チェックボックス ＆ ルーティン名 */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleDone(item.id)}
                style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#C9A84C" }}
              />
              <div>
                <span style={{ fontSize: "15px", fontWeight: "bold", textDecoration: item.done ? "line-through" : "none", color: item.done ? "#888" : "#fff" }}>
                  {item.name}
                </span>
                <span style={{ marginLeft: "10px", fontSize: "12px", color: "#C9A84C" }}>({item.duration}分)</span>
              </div>
            </div>

            {/* クイックタイマー起動ボタン */}
            <button
              onClick={() => onQuickTimer && onQuickTimer(item.name, item.duration)}
              style={{
                padding: "6px 12px",
                background: "#222",
                color: "#C9A84C",
                border: "1px solid #C9A84C",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              ⏱️ タイマー起動
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
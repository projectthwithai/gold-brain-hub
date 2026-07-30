"use client";
import React, { useState } from "react";

export type RoutineMode = "weekday" | "holiday" | "monk";

export interface RoutineItem {
  id: string;
  name: string;
  duration: number; // 分
  mode: RoutineMode;
}

const DEFAULT_ROUTINES: RoutineItem[] = [
  { id: "r1", name: "朝5時 Deep Work (数学)", duration: 90, mode: "monk" },
  { id: "r2", name: "高強度筋トレ (上半身)", duration: 45, mode: "monk" },
  { id: "r3", name: "英語 SVOC インストール", duration: 60, mode: "weekday" },
  { id: "r4", name: "現代文 デデバック演習", duration: 45, mode: "weekday" },
  { id: "r5", name: "休日特別演習", duration: 120, mode: "holiday" },
];

interface RoutineListProps {
  onQuickTimer?: (taskName: string, durationMinutes: number) => void;
}

export default function RoutineList({ onQuickTimer }: RoutineListProps) {
  const [mode, setMode] = useState<RoutineMode>("monk");
  const [currentIndex, setCurrentIndex] = useState(0);

  // 現在のモードに合ったルーティンだけを抽出
  const filteredRoutines = DEFAULT_ROUTINES.filter((r) => r.mode === mode || mode === "monk");
  const currentRoutine = filteredRoutines[currentIndex % filteredRoutines.length] || filteredRoutines[0];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredRoutines.length);
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📜 サイクル進行型ルーティン</h3>
        
        {/* モード切替 */}
        <div style={{ display: "flex", gap: "5px" }}>
          {(["weekday", "holiday", "monk"] as RoutineMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setCurrentIndex(0); }}
              style={{
                padding: "4px 10px",
                background: mode === m ? "#C9A84C" : "#222",
                color: mode === m ? "#000" : "#888",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                textTransform: "uppercase"
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* 現在のルーティン表示 */}
      {currentRoutine && (
        <div style={{ background: "#151515", padding: "15px", borderRadius: "6px", marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "12px", color: "#888", display: "block" }}>CURRENT TARGET</span>
            <strong style={{ fontSize: "18px", color: "#fff" }}>{currentRoutine.name}</strong>
            <span style={{ marginLeft: "10px", fontSize: "14px", color: "#C9A84C" }}>({currentRoutine.duration}分)</span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {/* クイックタイマー起動ボタン */}
            <button
              onClick={() => onQuickTimer && onQuickTimer(currentRoutine.name, currentRoutine.duration)}
              style={{ padding: "8px 12px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
              title="タイマー起動"
            >
              ⏱️ 起動
            </button>
            {/* NEXTスキップボタン */}
            <button
              onClick={handleNext}
              style={{ padding: "8px 12px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px", cursor: "pointer" }}
            >
              NEXT ⏩
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
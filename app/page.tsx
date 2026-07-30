"use client";
import React, { useState } from "react";
import RoutineList from "../components/gbh/RoutineList";
import TacticalTimer from "../components/gbh/TacticalTimer";
import TaskManager from "../components/gbh/TaskManager";
import CalendarView from "../components/gbh/CalendarView";
import AnalyticsCenter from "../components/gbh/AnalyticsCenter";
import PartnerTab from "../components/gbh/PartnerTab";
import RecordTab from "../components/gbh/RecordTab";

export default function Page() {
  const [tab, setTab] = useState<"routine" | "timer" | "task" | "calendar" | "analytics" | "partner" | "record">("routine");
  const [quickTask, setQuickTask] = useState("数学 Deep Work");
  const [quickMin, setQuickMin] = useState(45);

  const handleQuickTimer = (name: string, duration: number) => {
    setQuickTask(name);
    setQuickMin(duration);
    setTab("timer");
  };

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#050505", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* 5大メインナビゲーション */}
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

      {/* タブ切替コンテンツ */}
      {tab === "routine" && <RoutineList onQuickTimer={handleQuickTimer} />}
      {tab === "timer" && <TacticalTimer initialTask={quickTask} initialMinutes={quickMin} />}
      {tab === "task" && <TaskManager tasks={[]} setTasks={() => {}} TH={{ surface: "#0d0d0d", borderGold: "#8A683066", border: "#222", gold: "#C9A84C", text: "#fff" }} />}
      {tab === "calendar" && <CalendarView />}
      {tab === "analytics" && <AnalyticsCenter />}
      {tab === "partner" && <PartnerTab />}
      {tab === "record" && <RecordTab />}
    </div>
  );
}
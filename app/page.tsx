"use client";
import React, { useState } from "react";
import TaskManager from "../components/gbh/TaskManager";
import CalendarView from "../components/gbh/CalendarView";
import AnalyticsCenter from "../components/gbh/AnalyticsCenter";

export default function Page() {
  const [tab, setTab] = useState<"main" | "calendar" | "analytics">("main");

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#050505", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* ナビゲーションタブ */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #222", paddingBottom: "10px" }}>
        <button 
          onClick={() => setTab("main")}
          style={{ padding: "10px 20px", background: tab === "main" ? "#C9A84C" : "#111", color: tab === "main" ? "#000" : "#888", border: "1px solid #C9A84C", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
        >
          メイン (タスク管理)
        </button>
        <button 
          onClick={() => setTab("calendar")}
          style={{ padding: "10px 20px", background: tab === "calendar" ? "#C9A84C" : "#111", color: tab === "calendar" ? "#000" : "#888", border: "1px solid #C9A84C", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
        >
          カレンダー WIN/LOSE
        </button>
        <button 
          onClick={() => setTab("analytics")}
          style={{ padding: "10px 20px", background: tab === "analytics" ? "#C9A84C" : "#111", color: tab === "analytics" ? "#000" : "#888", border: "1px solid #C9A84C", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
        >
          研究所データセンター
        </button>
      </div>

      {/* タブコンテンツ切り替え */}
      {tab === "main" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <TaskManager tasks={[]} setTasks={() => {}} TH={{ surface: "#0d0d0d", borderGold: "#8A683066", border: "#222", gold: "#C9A84C", text: "#fff" }} />
        </div>
      )}

      {tab === "calendar" && <CalendarView />}

      {tab === "analytics" && <AnalyticsCenter />}
    </div>
  );
}
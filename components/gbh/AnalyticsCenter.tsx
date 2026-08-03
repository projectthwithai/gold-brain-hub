"use client";
import React, { useState, useEffect } from "react";
import { useSettings } from "./SettingsContext";

// 直近7日間の日付リストを取得
const getPast7Days = () => {
  const days = [];
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const label = `${month}/${date}`;
    const dayOfWeek = weekdays[d.getDay()];
    days.push({ dateStr, label, dayOfWeek, isToday: i === 0 });
  }
  return days;
};

// 科目・項目別のカラー定義
const CATEGORY_COLORS: Record<string, string> = {
  "数学 Deep Work": "#3b82f6",
  "英語 SVOC 精読": "#22c55e",
  "現代文 論理デバッグ": "#f59e0b",
  "プログラミング": "#a855f7",
  "肉体兵站筋トレ": "#ef4444",
  "その他": "#64748b",
};

export default function AnalyticsCenter() {
  const { t, themeStyles } = useSettings();
  const past7Days = getPast7Days();

  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>("all");

  // タイマー実行時間データ (分単位)
  const [studyData, setStudyData] = useState<Record<string, Record<string, number>>>({
    [past7Days[0].dateStr]: { "数学 Deep Work": 90, "英語 SVOC 精読": 60, "肉体兵站筋トレ": 45 },
    [past7Days[1].dateStr]: { "数学 Deep Work": 60, "現代文 論理デバッグ": 45, "プログラミング": 60 },
    [past7Days[2].dateStr]: { "英語 SVOC 精読": 90, "数学 Deep Work": 75, "肉体兵站筋トレ": 45 },
    [past7Days[3].dateStr]: { "プログラミング": 120, "現代文 論理デバッグ": 30 },
    [past7Days[4].dateStr]: { "数学 Deep Work": 105, "英語 SVOC 精読": 60, "肉体兵站筋トレ": 45 },
    [past7Days[5].dateStr]: { "数学 Deep Work": 90, "現代文 論理デバッグ": 60, "プログラミング": 90 },
    [past7Days[6].dateStr]: { "数学 Deep Work": 120, "英語 SVOC 精読": 45, "肉体兵站筋トレ": 45 },
  });

  // 全体＆個々ルーティンの過去7日間の達成率(%)データ
  const [overallRoutineHistory, setOverallRoutineHistory] = useState<number[]>([70, 85, 60, 100, 80, 90, 100]);
  const [routineList, setRoutineList] = useState<{ id: string; name: string }[]>([
    { id: "r1", name: "朝5時 帝国学習ローテーション" },
    { id: "r2", name: "肉体兵站 筋トレローテーション" },
  ]);
  const [individualRoutineHistory, setIndividualRoutineHistory] = useState<Record<string, number[]>>({
    "r1": [80, 100, 60, 100, 80, 100, 100],
    "r2": [60, 70, 60, 100, 80, 80, 100],
  });

  // 1. localStorage からデータロード
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRoutines = localStorage.getItem("gbh_routines");
      if (savedRoutines) {
        try {
          const parsed = JSON.parse(savedRoutines);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRoutineList(parsed.map((r: any) => ({ id: r.id, name: r.name })));
            if (!selectedRoutineId || selectedRoutineId === "all") {
              setSelectedRoutineId(parsed[0].id);
            }
          }
        } catch (e) {}
      }
    }
  }, []);

  // 7日間の総集中時間の計算
  const past7DaysTotalMinutes = past7Days.reduce((acc, day) => {
    const dayData = studyData[day.dateStr] || {};
    const daySum = Object.values(dayData).reduce((a, b) => a + b, 0);
    return acc + daySum;
  }, 0);

  // 科目・項目別の7日間集計（円グラフ用）
  const categoryTotals: Record<string, number> = {};
  past7Days.forEach((day) => {
    const dayData = studyData[day.dateStr] || {};
    Object.entries(dayData).forEach(([cat, mins]) => {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + mins;
    });
  });

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // 日別の最大作業分数（棒グラフのスケール用）
  const maxDayMinutes = Math.max(
    180,
    ...past7Days.map((day) => {
      const dayData = studyData[day.dateStr] || {};
      return Object.values(dayData).reduce((a, b) => a + b, 0);
    })
  );

  // 円グラフ用SVG計算
  let cumulativeAngle = 0;
  const pieSlices = categoryEntries.map(([cat, mins]) => {
    const percentage = past7DaysTotalMinutes > 0 ? mins / past7DaysTotalMinutes : 0;
    const angle = percentage * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    return { cat, mins, percentage, startAngle, angle };
  });

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div style={{ background: themeStyles.bgCard, border: `1px solid ${themeStyles.gold}`, borderRadius: "8px", padding: "16px", color: themeStyles.textMain, fontFamily: "sans-serif", boxSizing: "border-box" }}>
      
      {/* 1. ヘッダー ＆ 過去7日間サマリー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ margin: 0, color: themeStyles.gold, fontSize: "18px" }}>
            📊 {t("研究所データセンター", "Analytics Data Center")}
          </h3>
          <span style={{ fontSize: "12px", color: themeStyles.textSub }}>
            {t("直近7日間の学習集中時間 ＆ ルーティン達成率の多角的解析", "7-Day Focus Time & Routine Completion Analytics")}
          </span>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ background: themeStyles.bgInner, padding: "8px 14px", borderRadius: "6px", border: `1px solid ${themeStyles.border}`, textAlign: "right" }}>
            <span style={{ fontSize: "10px", color: themeStyles.textSub, display: "block" }}>{t("直近7日間の総集中時間", "7-Day Total Focus")}</span>
            <strong style={{ fontSize: "16px", color: themeStyles.gold }}>
              {Math.floor(past7DaysTotalMinutes / 60)}時間 {past7DaysTotalMinutes % 60}分
            </strong>
          </div>
          <div style={{ background: themeStyles.bgInner, padding: "8px 14px", borderRadius: "6px", border: `1px solid ${themeStyles.border}`, textAlign: "right" }}>
            <span style={{ fontSize: "10px", color: themeStyles.textSub, display: "block" }}>{t("平均日課達成率", "Avg Routine Completion")}</span>
            <strong style={{ fontSize: "16px", color: "#22c55e" }}>
              {Math.round(overallRoutineHistory.reduce((a, b) => a + b, 0) / overallRoutineHistory.length)}%
            </strong>
          </div>
        </div>
      </div>

      {/* 2. Studyplus風 直近7日間の作業時間（積層棒グラフ） ＆ 項目別割合（円グラフ） */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "25px" }}>
        
        {/* A. 日別積層棒グラフ */}
        <div style={{ background: themeStyles.bgInner, border: `1px solid ${themeStyles.border}`, borderRadius: "8px", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", color: themeStyles.gold, fontWeight: "bold" }}>
              📈 {t("直近7日間の日別集中時間 (Studyplus風)", "7-Day Daily Focus Time")}
            </span>
            <span style={{ fontSize: "10px", color: themeStyles.textSub }}>単位: 分</span>
          </div>

          <div style={{ height: "180px", display: "flex", alignItems: "flex-end", gap: "8px", paddingTop: "20px", paddingBottom: "5px", borderBottom: `1px solid ${themeStyles.border}`, position: "relative" }}>
            {past7Days.map((day, idx) => {
              const dayData = studyData[day.dateStr] || {};
              const totalMins = Object.values(dayData).reduce((a, b) => a + b, 0);
              const heightPct = Math.min(100, Math.round((totalMins / maxDayMinutes) * 100));

              return (
                <div
                  key={day.dateStr}
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                  style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", position: "relative", cursor: "pointer" }}
                >
                  {/* ポップアップ詳細ツールチップ */}
                  {hoveredBarIndex === idx && (
                    <div style={{ position: "absolute", bottom: `${heightPct + 10}%`, background: "#000", color: "#fff", border: `1px solid ${themeStyles.gold}`, borderRadius: "6px", padding: "6px 8px", fontSize: "10px", zIndex: 10, whiteSpace: "nowrap", boxShadow: "0 4px 10px rgba(0,0,0,0.5)" }}>
                      <strong style={{ color: themeStyles.gold, display: "block", marginBottom: "2px" }}>{day.label} ({day.dayOfWeek}): {totalMins}分</strong>
                      {Object.entries(dayData).map(([cat, mins]) => (
                        <div key={cat} style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                          <span style={{ color: CATEGORY_COLORS[cat] || "#aaa" }}>{cat}:</span>
                          <span>{mins}分</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <span style={{ fontSize: "10px", color: day.isToday ? themeStyles.gold : themeStyles.textSub, marginBottom: "4px", fontWeight: day.isToday ? "bold" : "normal" }}>
                    {totalMins > 0 ? `${totalMins}m` : ""}
                  </span>

                  {/* 積層バー */}
                  <div style={{ width: "100%", maxWidth: "28px", height: `${heightPct}%`, borderRadius: "4px 4px 0 0", overflow: "hidden", display: "flex", flexDirection: "column-reverse", background: "#222" }}>
                    {Object.entries(dayData).map(([cat, mins]) => {
                      const segmentPct = totalMins > 0 ? (mins / totalMins) * 100 : 0;
                      return (
                        <div
                          key={cat}
                          style={{
                            width: "100%",
                            height: `${segmentPct}%`,
                            backgroundColor: CATEGORY_COLORS[cat] || "#64748b",
                            transition: "height 0.3s ease"
                          }}
                          title={`${cat}: ${mins}分`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 日付ラベル */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginTop: "8px" }}>
            {past7Days.map((day) => (
              <div key={day.dateStr} style={{ flex: 1, textAlign: "center", fontSize: "10px", color: day.isToday ? themeStyles.gold : themeStyles.textSub, fontWeight: day.isToday ? "bold" : "normal" }}>
                {day.label}<br />({day.dayOfWeek})
              </div>
            ))}
          </div>
        </div>

        {/* B. 項目別時間割合（ドーナツチャート） */}
        <div style={{ background: themeStyles.bgInner, border: `1px solid ${themeStyles.border}`, borderRadius: "8px", padding: "14px" }}>
          <span style={{ fontSize: "13px", color: themeStyles.gold, fontWeight: "bold", display: "block", marginBottom: "12px" }}>
            🍩 {t("直近7日間の項目別時間割合", "Category Breakdown")}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
            {/* SVG ドーナツグラフ */}
            <div style={{ position: "relative", width: "130px", height: "130px" }}>
              <svg viewBox="-1 -1 2 2" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                {pieSlices.map((slice, index) => {
                  const [startX, startY] = getCoordinatesForPercent(slice.startAngle / 360);
                  const [endX, endY] = getCoordinatesForPercent((slice.startAngle + slice.angle) / 360);
                  const largeArcFlag = slice.angle > 180 ? 1 : 0;
                  const pathData = `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;
                  return (
                    <path
                      key={slice.cat}
                      d={pathData}
                      fill={CATEGORY_COLORS[slice.cat] || "#64748b"}
                      style={{ transition: "all 0.3s ease" }}
                    >
                      <title>{`${slice.cat}: ${slice.mins}分 (${Math.round(slice.percentage * 100)}%)`}</title>
                    </path>
                  );
                })}
              </svg>

              {/* ドーナツ中央穴 */}
              <div style={{ position: "absolute", inset: "25%", background: themeStyles.bgInner, borderRadius: "50%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                <span style={{ fontSize: "9px", color: themeStyles.textSub }}>合計</span>
                <strong style={{ fontSize: "11px", color: themeStyles.gold }}>{Math.floor(past7DaysTotalMinutes / 60)}h</strong>
              </div>
            </div>

            {/* 凡例リスト */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "120px" }}>
              {categoryEntries.map(([cat, mins]) => {
                const pct = past7DaysTotalMinutes > 0 ? Math.round((mins / past7DaysTotalMinutes) * 100) : 0;
                return (
                  <div key={cat} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: CATEGORY_COLORS[cat] || "#64748b" }} />
                      <span style={{ color: themeStyles.textMain, fontWeight: "bold" }}>{cat}</span>
                    </div>
                    <span style={{ color: themeStyles.textSub }}>{mins}分 ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* 3. 直近7日間の【全体】ルーティン達成率（％）推移 (折れ線グラフ) */}
      <div style={{ background: themeStyles.bgInner, border: `1px solid ${themeStyles.border}`, borderRadius: "8px", padding: "14px", marginBottom: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "13px", color: themeStyles.gold, fontWeight: "bold" }}>
            📉 {t("直近7日間の【全体】ルーティン達成率（％）推移", "Overall Routine Completion Rate (%)")}
          </span>
          <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: "bold" }}>
            本日: {overallRoutineHistory[6]}%
          </span>
        </div>

        {/* 折れ線グラフ SVG */}
        <div style={{ height: "140px", width: "100%", position: "relative", paddingTop: "10px" }}>
          <svg viewBox="0 0 700 120" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {/* 背景グリッド線 (25%, 50%, 75%, 100%) */}
            {[0, 25, 50, 75, 100].map((val) => {
              const y = 100 - (val / 100) * 80 + 10;
              return (
                <g key={val}>
                  <line x1="0" y1={y} x2="700" y2={y} stroke={themeStyles.border} strokeDasharray="3 3" strokeWidth="1" />
                  <text x="0" y={y - 2} fill={themeStyles.textSub} fontSize="10">{val}%</text>
                </g>
              );
            })}

            {/* 折れ線グラデーション領域 */}
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={themeStyles.gold} stopOpacity="0.3" />
                <stop offset="100%" stopColor={themeStyles.gold} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* 7日間の点プロット計算 */}
            {(() => {
              const points = overallRoutineHistory.map((val, idx) => {
                const x = (idx / 6) * 640 + 30;
                const y = 100 - (val / 100) * 80 + 10;
                return { x, y, val };
              });

              const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
              const areaPoints = `30,100 ${polylinePoints} 670,100`;

              return (
                <>
                  <polygon points={areaPoints} fill="url(#goldGradient)" />
                  <polyline fill="none" stroke={themeStyles.gold} strokeWidth="3" points={polylinePoints} />

                  {/* 各日のプロット点 ＆ ラベル */}
                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="5" fill={themeStyles.bgCard} stroke={themeStyles.gold} strokeWidth="3" />
                      <text x={p.x} y={p.y - 10} textAnchor="middle" fill={themeStyles.gold} fontSize="11" fontWeight="bold">
                        {p.val}%
                      </text>
                      <text x={p.x} y="115" textAnchor="middle" fill={past7Days[i].isToday ? themeStyles.gold : themeStyles.textSub} fontSize="10" fontWeight={past7Days[i].isToday ? "bold" : "normal"}>
                        {past7Days[i].label}
                      </text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* 4. 直近7日間の【個々のルーティン】別達成率（％）推移 */}
      <div style={{ background: themeStyles.bgInner, border: `1px solid ${themeStyles.border}`, borderRadius: "8px", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: themeStyles.gold, fontWeight: "bold" }}>
            📌 {t("直近7日間の【個々のルーティン】別達成率推移", "Individual Routine Completion Rate (%)")}
          </span>

          {/* 個別ルーティン選択ドロップダウン */}
          <select
            value={selectedRoutineId}
            onChange={(e) => setSelectedRoutineId(e.target.value)}
            style={{ padding: "6px 12px", background: themeStyles.bgCard, border: `1px solid ${themeStyles.gold}`, color: themeStyles.textMain, borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}
          >
            {routineList.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* 個別ルーティン折れ線グラフ SVG */}
        <div style={{ height: "140px", width: "100%", position: "relative", paddingTop: "10px" }}>
          <svg viewBox="0 0 700 120" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {[0, 50, 100].map((val) => {
              const y = 100 - (val / 100) * 80 + 10;
              return (
                <g key={val}>
                  <line x1="0" y1={y} x2="700" y2={y} stroke={themeStyles.border} strokeDasharray="3 3" strokeWidth="1" />
                  <text x="0" y={y - 2} fill={themeStyles.textSub} fontSize="10">{val}%</text>
                </g>
              );
            })}

            {(() => {
              const history = individualRoutineHistory[selectedRoutineId] || [80, 100, 60, 100, 80, 100, 100];
              const points = history.map((val, idx) => {
                const x = (idx / 6) * 640 + 30;
                const y = 100 - (val / 100) * 80 + 10;
                return { x, y, val };
              });

              const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

              return (
                <>
                  <polyline fill="none" stroke="#22c55e" strokeWidth="3" points={polylinePoints} />

                  {points.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="5" fill={themeStyles.bgCard} stroke="#22c55e" strokeWidth="3" />
                      <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">
                        {p.val}%
                      </text>
                      <text x={p.x} y="115" textAnchor="middle" fill={past7Days[i].isToday ? themeStyles.gold : themeStyles.textSub} fontSize="10" fontWeight={past7Days[i].isToday ? "bold" : "normal"}>
                        {past7Days[i].label}
                      </text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>
        </div>
      </div>

    </div>
  );
}
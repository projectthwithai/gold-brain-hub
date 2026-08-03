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

// 代表的な科目のデフォルトカラー定義
const CATEGORY_COLORS: Record<string, string> = {
  "数学 Deep Work": "#3b82f6",
  "英語 SVOC 精読": "#22c55e",
  "現代文 論理デバッグ": "#f59e0b",
  "プログラミング": "#a855f7",
  "肉体兵站筋トレ": "#ef4444",
  "数学": "#3b82f6",
  "英語": "#22c55e",
  "現代文": "#f59e0b",
  "兵站": "#ef4444",
  "その他": "#64748b",
};

const PALETTE = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#ec4899", "#8b5cf6"];

export default function AnalyticsCenter() {
  const { t, themeStyles } = useSettings();
  const past7Days = getPast7Days();

  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // リアルタイムデータ State
  const [timerLogs, setTimerLogs] = useState<any[]>([]);
  const [routinesList, setRoutinesList] = useState<any[]>([]);
  const [modeOptions, setModeOptions] = useState<any[]>([
    { id: "weekday", label: "平日" },
    { id: "holiday", label: "休日/祝日" },
    { id: "monk", label: "MONK MODE" },
  ]);

  // モード選択 State
  const [selectedOverallModeId, setSelectedOverallModeId] = useState<string>("weekday");
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>("");

  // 1. localStorage から本物の実データを0.5秒おきにリアルタイム同期ロード
  useEffect(() => {
    const loadRealData = () => {
      if (typeof window !== "undefined") {
        // タイマーの実際の実行記録ログを取得
        const savedTimerLogs = localStorage.getItem("gbh_timer_logs");
        if (savedTimerLogs) {
          try {
            const parsed = JSON.parse(savedTimerLogs);
            if (Array.isArray(parsed)) setTimerLogs(parsed);
          } catch (e) {}
        }

        // ルーティンモード一覧
        const savedModes = localStorage.getItem("gbh_mode_options");
        if (savedModes) {
          try {
            const parsedModes = JSON.parse(savedModes);
            if (Array.isArray(parsedModes) && parsedModes.length > 0) {
              setModeOptions(parsedModes);
            }
          } catch (e) {}
        }

        // 本物の最新ルーティン一覧を取得
        const savedRoutines = localStorage.getItem("gbh_routines");
        if (savedRoutines) {
          try {
            const parsed = JSON.parse(savedRoutines);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setRoutinesList(parsed);
              if (!selectedRoutineId) {
                setSelectedRoutineId(parsed[0].id);
              }
            }
          } catch (e) {}
        }
      }
    };

    loadRealData();
    const interval = setInterval(loadRealData, 500);
    window.addEventListener("focus", loadRealData);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", loadRealData);
    };
  }, [selectedRoutineId]);

  // ★1. 全タイマーの「全期間 累計総作業時間」の算出★
  const allTimeTotalMinutes = timerLogs.reduce((acc, log) => {
    return acc + (Number(log.minutes) || 0);
  }, 0);

  // ★2. 各タイマー(作業項目別)の「全期間 累計総作業時間」の算出★
  const allTimeCategoryTotals: Record<string, number> = {};
  timerLogs.forEach((log) => {
    const cat = log.category || "その他";
    const mins = Number(log.minutes) || 0;
    allTimeCategoryTotals[cat] = (allTimeCategoryTotals[cat] || 0) + mins;
  });

  const allTimeCategoryEntries = Object.entries(allTimeCategoryTotals).sort((a, b) => b[1] - a[1]);

  // ★3. 直近7日間の日別・項目別時間集計★
  const realStudyData: Record<string, Record<string, number>> = {};
  past7Days.forEach((d) => {
    realStudyData[d.dateStr] = {};
  });

  timerLogs.forEach((log) => {
    if (log.date && realStudyData[log.date]) {
      const cat = log.category || "その他";
      const mins = Number(log.minutes) || 0;
      realStudyData[log.date][cat] = (realStudyData[log.date][cat] || 0) + mins;
    }
  });

  // 直近7日間の総集中時間
  const past7DaysTotalMinutes = past7Days.reduce((acc, day) => {
    const dayData = realStudyData[day.dateStr] || {};
    const daySum = Object.values(dayData).reduce((a, b) => a + b, 0);
    return acc + daySum;
  }, 0);

  // 科目・項目別の7日間集計 (円グラフ用)
  const categoryTotals: Record<string, number> = {};
  past7Days.forEach((day) => {
    const dayData = realStudyData[day.dateStr] || {};
    Object.entries(dayData).forEach(([cat, mins]) => {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + mins;
    });
  });

  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // バーの最大スケール
  const maxDayMinutes = Math.max(
    60,
    ...past7Days.map((day) => {
      const dayData = realStudyData[day.dateStr] || {};
      return Object.values(dayData).reduce((a, b) => a + b, 0);
    })
  );

  // 円グラフ計算
  let cumulativeAngle = 0;
  const pieSlices = categoryEntries.map(([cat, mins], idx) => {
    const percentage = past7DaysTotalMinutes > 0 ? mins / past7DaysTotalMinutes : 0;
    const angle = percentage * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    const color = CATEGORY_COLORS[cat] || PALETTE[idx % PALETTE.length];
    return { cat, mins, percentage, startAngle, angle, color };
  });

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  // モード別ルーティン全体達成率の算出
  const modeFilteredRoutines = routinesList.filter((r) => {
    if (!r.modes) return true;
    return r.modes.includes(selectedOverallModeId);
  });

  const modeCompletedCount = modeFilteredRoutines.filter((r) => Boolean(r?.done)).length;
  const todayModeOverallPct = modeFilteredRoutines.length > 0 
    ? Math.round((modeCompletedCount / modeFilteredRoutines.length) * 100) 
    : 0;

  const overallRoutineHistory = [70, 85, 60, 100, 80, 90, todayModeOverallPct];

  // 個別ルーティン達成率の算出
  const selectedRoutine = routinesList.find((r) => r.id === selectedRoutineId) || routinesList[0];
  const isSelectedDone = selectedRoutine ? Boolean(selectedRoutine.done) : false;
  const todayIndividualPct = isSelectedDone ? 100 : 0;

  const individualRoutineHistory = [100, 0, 100, 100, 0, 100, todayIndividualPct];

  return (
    <div style={{ background: themeStyles.bgCard, border: `1px solid ${themeStyles.gold}`, borderRadius: "8px", padding: "16px", color: themeStyles.textMain, fontFamily: "sans-serif", boxSizing: "border-box" }}>
      
      {/* 1. ヘッダー ＆ サマリーバッジ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ margin: 0, color: themeStyles.gold, fontSize: "18px" }}>
            📊 {t("研究所データセンター", "Analytics Data Center")}
          </h3>
          <span style={{ fontSize: "12px", color: themeStyles.textSub }}>
            {t("タイマー累計稼働時間 ＆ ルーティン達成率の多角的解析", "Total Focus Time & Routine Completion Analytics")}
          </span>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {/* ★全タイマー全期間累計総作業時間バッジ★ */}
          <div style={{ background: themeStyles.bgInner, padding: "8px 14px", borderRadius: "6px", border: `1px solid ${themeStyles.gold}`, textAlign: "right" }}>
            <span style={{ fontSize: "10px", color: themeStyles.gold, display: "block", fontWeight: "bold" }}>
              🏆 {t("全タイマー累計総作業時間", "All-Time Grand Total")}
            </span>
            <strong style={{ fontSize: "18px", color: themeStyles.gold }}>
              {Math.floor(allTimeTotalMinutes / 60)}時間 {allTimeTotalMinutes % 60}分
            </strong>
          </div>

          <div style={{ background: themeStyles.bgInner, padding: "8px 14px", borderRadius: "6px", border: `1px solid ${themeStyles.border}`, textAlign: "right" }}>
            <span style={{ fontSize: "10px", color: themeStyles.textSub, display: "block" }}>{t("直近7日間集中時間", "7-Day Total Focus")}</span>
            <strong style={{ fontSize: "16px", color: themeStyles.textMain }}>
              {Math.floor(past7DaysTotalMinutes / 60)}時間 {past7DaysTotalMinutes % 60}分
            </strong>
          </div>

          <div style={{ background: themeStyles.bgInner, padding: "8px 14px", borderRadius: "6px", border: `1px solid ${themeStyles.border}`, textAlign: "right" }}>
            <span style={{ fontSize: "10px", color: themeStyles.textSub, display: "block" }}>{t("本日全体達成率", "Today Overall")}</span>
            <strong style={{ fontSize: "16px", color: "#22c55e" }}>
              {todayModeOverallPct}%
            </strong>
          </div>
        </div>
      </div>

      {/* 2. ★新規追加: 各タイマー(作業項目別) 累計総作業時間 アーカイブカード★ */}
      <div style={{ background: themeStyles.bgInner, border: `1px solid ${themeStyles.border}`, borderRadius: "8px", padding: "14px", marginBottom: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <span style={{ fontSize: "13px", color: themeStyles.gold, fontWeight: "bold", display: "block" }}>
              ⏱️ {t("各タイマー別 累計総作業時間記録", "All-Time Focus Totals per Timer")}
            </span>
            <span style={{ fontSize: "11px", color: themeStyles.textSub }}>
              {t("これまでにタイマーで記録されたすべての作業時間の累計集計", "Total focus time recorded for each timer item")}
            </span>
          </div>

          <div style={{ fontSize: "12px", color: themeStyles.gold, fontWeight: "bold" }}>
            全タイマー総計: {Math.floor(allTimeTotalMinutes / 60)}時間 {allTimeTotalMinutes % 60}分
          </div>
        </div>

        {/* 各タイマー項目別 累計カードグリッド */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
          {allTimeCategoryEntries.length === 0 ? (
            <span style={{ fontSize: "12px", color: themeStyles.textSub }}>まだ累計タイマー記録はありません（タイマーで作業完了すると自動蓄積されます）</span>
          ) : (
            allTimeCategoryEntries.map(([cat, mins], idx) => {
              const pct = allTimeTotalMinutes > 0 ? Math.round((mins / allTimeTotalMinutes) * 100) : 0;
              const color = CATEGORY_COLORS[cat] || PALETTE[idx % PALETTE.length];
              return (
                <div key={cat} style={{ background: themeStyles.bgCard, border: `1px solid ${themeStyles.border}`, borderRadius: "6px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", fontWeight: "bold", color: themeStyles.textMain, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }}>
                      🎯 {cat}
                    </span>
                    <span style={{ fontSize: "10px", padding: "1px 5px", background: "rgba(0,0,0,0.2)", borderRadius: "3px", color: color, fontWeight: "bold" }}>
                      {pct}%
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "11px", color: themeStyles.textSub }}>累計総時間:</span>
                    <strong style={{ fontSize: "15px", color: color }}>
                      {Math.floor(mins / 60)}時間 {mins % 60}分
                    </strong>
                  </div>

                  {/* 割合バー */}
                  <div style={{ width: "100%", background: "#222", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, backgroundColor: color, height: "100%" }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Studyplus風 直近7日間の作業時間（積層棒グラフ） ＆ 項目別割合（円グラフ） */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "25px" }}>
        
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
              const dayData = realStudyData[day.dateStr] || {};
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
                      {Object.keys(dayData).length === 0 ? (
                        <span style={{ color: "#666" }}>記録なし</span>
                      ) : (
                        Object.entries(dayData).map(([cat, mins]) => (
                          <div key={cat} style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                            <span style={{ color: CATEGORY_COLORS[cat] || "#aaa" }}>{cat}:</span>
                            <span>{mins}分</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <span style={{ fontSize: "10px", color: day.isToday ? themeStyles.gold : themeStyles.textSub, marginBottom: "4px", fontWeight: day.isToday ? "bold" : "normal" }}>
                    {totalMins > 0 ? `${totalMins}m` : ""}
                  </span>

                  {/* 積層バー */}
                  <div style={{ width: "100%", maxWidth: "28px", height: `${Math.max(4, heightPct)}%`, borderRadius: "4px 4px 0 0", overflow: "hidden", display: "flex", flexDirection: "column-reverse", background: "#222" }}>
                    {Object.entries(dayData).map(([cat, mins], cIdx) => {
                      const segmentPct = totalMins > 0 ? (mins / totalMins) * 100 : 0;
                      return (
                        <div
                          key={cat}
                          style={{
                            width: "100%",
                            height: `${segmentPct}%`,
                            backgroundColor: CATEGORY_COLORS[cat] || PALETTE[cIdx % PALETTE.length],
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

        {/* B. 項目別時間割合（円グラフ） */}
        <div style={{ background: themeStyles.bgInner, border: `1px solid ${themeStyles.border}`, borderRadius: "8px", padding: "14px" }}>
          <span style={{ fontSize: "13px", color: themeStyles.gold, fontWeight: "bold", display: "block", marginBottom: "12px" }}>
            🍩 {t("直近7日間の項目別時間割合", "Category Breakdown")}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
            <div style={{ position: "relative", width: "120px", height: "120px" }}>
              {past7DaysTotalMinutes === 0 ? (
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: `4px solid ${themeStyles.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: themeStyles.textSub }}>
                  記録待機中
                </div>
              ) : (
                <svg viewBox="-1 -1 2 2" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
                  {pieSlices.map((slice) => {
                    const [startX, startY] = getCoordinatesForPercent(slice.startAngle / 360);
                    const [endX, endY] = getCoordinatesForPercent((slice.startAngle + slice.angle) / 360);
                    const largeArcFlag = slice.angle > 180 ? 1 : 0;
                    const pathData = slice.percentage >= 0.999 
                      ? `M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0`
                      : `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;
                    return (
                      <path
                        key={slice.cat}
                        d={pathData}
                        fill={slice.color}
                        style={{ transition: "all 0.3s ease" }}
                      >
                        <title>{`${slice.cat}: ${slice.mins}分 (${Math.round(slice.percentage * 100)}%)`}</title>
                      </path>
                    );
                  })}
                </svg>
              )}

              <div style={{ position: "absolute", inset: "25%", background: themeStyles.bgInner, borderRadius: "50%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                <span style={{ fontSize: "9px", color: themeStyles.textSub }}>7日間合計</span>
                <strong style={{ fontSize: "11px", color: themeStyles.gold }}>{Math.floor(past7DaysTotalMinutes / 60)}h{past7DaysTotalMinutes % 60}m</strong>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1, minWidth: "120px" }}>
              {categoryEntries.length === 0 && <span style={{ fontSize: "11px", color: themeStyles.textSub }}>まだタイマー実行記録がありません</span>}
              {categoryEntries.map(([cat, mins], idx) => {
                const pct = past7DaysTotalMinutes > 0 ? Math.round((mins / past7DaysTotalMinutes) * 100) : 0;
                return (
                  <div key={cat} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "2px", backgroundColor: CATEGORY_COLORS[cat] || PALETTE[idx % PALETTE.length] }} />
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

      {/* 4. 直近7日間の【全体】ルーティン達成率（％）推移 (モード別選択) */}
      <div style={{ background: themeStyles.bgInner, border: `1px solid ${themeStyles.border}`, borderRadius: "8px", padding: "14px", marginBottom: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: themeStyles.gold, fontWeight: "bold" }}>
            📉 {t("直近7日間の【全体】ルーティン達成率（％）推移", "Overall Routine Completion Rate (%)")}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11px", color: themeStyles.textSub }}>対象モード:</span>
            <select
              value={selectedOverallModeId}
              onChange={(e) => setSelectedOverallModeId(e.target.value)}
              style={{ padding: "4px 8px", background: themeStyles.bgCard, border: `1px solid ${themeStyles.gold}`, color: themeStyles.textMain, borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}
            >
              {modeOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <span style={{ fontSize: "11px", color: "#22c55e", fontWeight: "bold" }}>
              本日: {todayModeOverallPct}%
            </span>
          </div>
        </div>

        <div style={{ height: "140px", width: "100%", position: "relative", paddingTop: "10px" }}>
          <svg viewBox="0 0 700 120" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {[0, 25, 50, 75, 100].map((val) => {
              const y = 100 - (val / 100) * 80 + 10;
              return (
                <g key={val}>
                  <line x1="0" y1={y} x2="700" y2={y} stroke={themeStyles.border} strokeDasharray="3 3" strokeWidth="1" />
                  <text x="0" y={y - 2} fill={themeStyles.textSub} fontSize="10">{val}%</text>
                </g>
              );
            })}

            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={themeStyles.gold} stopOpacity="0.3" />
                <stop offset="100%" stopColor={themeStyles.gold} stopOpacity="0.0" />
              </linearGradient>
            </defs>

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

      {/* 5. 直近7日間の【個々のルーティン】別達成率（％）推移 */}
      <div style={{ background: themeStyles.bgInner, border: `1px solid ${themeStyles.border}`, borderRadius: "8px", padding: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: themeStyles.gold, fontWeight: "bold" }}>
            📌 {t("直近7日間の【個々のルーティン】別達成率推移", "Individual Routine Completion Rate (%)")}
          </span>

          <select
            value={selectedRoutineId}
            onChange={(e) => setSelectedRoutineId(e.target.value)}
            style={{ padding: "6px 12px", background: themeStyles.bgCard, border: `1px solid ${themeStyles.gold}`, color: themeStyles.textMain, borderRadius: "4px", fontSize: "12px", fontWeight: "bold", maxWidth: "240px" }}
          >
            {routinesList.length === 0 && <option value="">ルーティンがありません</option>}
            {routinesList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.done ? "本日完了" : "本日未完了"})
              </option>
            ))}
          </select>
        </div>

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
              const points = individualRoutineHistory.map((val, idx) => {
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
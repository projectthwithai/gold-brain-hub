"use client";
import React, { useState, useEffect } from "react";
import { useSettings } from "./SettingsContext";

// 成長記録の項目型
export interface GrowthItem {
  id: string;
  name: string;         // 例: "ベンチプレス 1RM"
  unit: string;         // 例: "kg", "秒", "点"
  higherIsBetter: boolean; // true: 大きい方が上, false: 小さい方が上
}

// 成長記録の個別ログ型
export interface GrowthLog {
  id: string;
  itemId: string;
  value: number;
  dateStr: string;      // 例: "08/04 17:30"
  timestamp: number;
}

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

const DEFAULT_GROWTH_ITEMS: GrowthItem[] = [
  { id: "gi1", name: "ベンチプレス 1RM", unit: "kg", higherIsBetter: true },
  { id: "gi2", name: "50m走タイム", unit: "秒", higherIsBetter: false },
];

const DEFAULT_GROWTH_LOGS: GrowthLog[] = [
  { id: "gl1", itemId: "gi1", value: 70, dateStr: "08/01 10:00", timestamp: Date.now() - 3600000 * 72 },
  { id: "gl2", itemId: "gi1", value: 75, dateStr: "08/02 11:30", timestamp: Date.now() - 3600000 * 48 },
  { id: "gl3", itemId: "gi1", value: 80, dateStr: "08/04 09:00", timestamp: Date.now() - 3600000 * 8 },
  { id: "gl4", itemId: "gi2", value: 7.2, dateStr: "08/01 15:00", timestamp: Date.now() - 3600000 * 70 },
  { id: "gl5", itemId: "gi2", value: 6.9, dateStr: "08/03 16:20", timestamp: Date.now() - 3600000 * 24 },
];

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

  const [selectedOverallModeId, setSelectedOverallModeId] = useState<string>("weekday");
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>("");

  // ★成長記録機能 State★
  const [growthItems, setGrowthItems] = useState<GrowthItem[]>(DEFAULT_GROWTH_ITEMS);
  const [growthLogs, setGrowthLogs] = useState<GrowthLog[]>(DEFAULT_GROWTH_LOGS);
  const [selectedGrowthItemId, setSelectedGrowthItemId] = useState<string>("gi1");

  const [newLogValueInput, setNewLogValueInput] = useState<string>("");

  // 項目管理モーダル State
  const [isManagingGrowthItems, setIsManagingGrowthItems] = useState(false);
  const [editingGrowthItem, setEditingGrowthItem] = useState<GrowthItem | null>(null);
  const [isCreatingGrowthItem, setIsCreatingGrowthItem] = useState(false);
  const [inputItemName, setInputItemName] = useState("");
  const [inputItemUnit, setInputItemUnit] = useState("kg");
  const [inputItemHigherIsBetter, setInputItemHigherIsBetter] = useState(true);

  // ログタップ編集モーダル State
  const [editingLog, setEditingLog] = useState<GrowthLog | null>(null);
  const [editLogValueInput, setEditLogValueInput] = useState<string>("");

  const [isLoaded, setIsLoaded] = useState(false);

  // 1. 初回データ復元ロード
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTimerLogs = localStorage.getItem("gbh_timer_logs");
      if (savedTimerLogs) { try { setTimerLogs(JSON.parse(savedTimerLogs)); } catch (e) {} }

      const savedModes = localStorage.getItem("gbh_mode_options");
      if (savedModes) { try { setModeOptions(JSON.parse(savedModes)); } catch (e) {} }

      const savedRoutines = localStorage.getItem("gbh_routines");
      if (savedRoutines) {
        try {
          const parsed = JSON.parse(savedRoutines);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRoutinesList(parsed);
            if (!selectedRoutineId) setSelectedRoutineId(parsed[0].id);
          }
        } catch (e) {}
      }

      // 成長記録のロード
      const savedGItems = localStorage.getItem("gbh_growth_items");
      if (savedGItems) {
        try {
          const parsed = JSON.parse(savedGItems);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGrowthItems(parsed);
            setSelectedGrowthItemId(parsed[0].id);
          }
        } catch (e) {}
      }

      const savedGLogs = localStorage.getItem("gbh_growth_logs");
      if (savedGLogs) { try { setGrowthLogs(JSON.parse(savedGLogs)); } catch (e) {} }

      setIsLoaded(true);
    }
  }, []);

  // 2. 成長記録データの保存
  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded) {
      localStorage.setItem("gbh_growth_items", JSON.stringify(growthItems));
      localStorage.setItem("gbh_growth_logs", JSON.stringify(growthLogs));
    }
  }, [growthItems, growthLogs, isLoaded]);

  // リアルタイム同期タイマー
  useEffect(() => {
    const loadRealData = () => {
      if (typeof window !== "undefined") {
        const savedTimerLogs = localStorage.getItem("gbh_timer_logs");
        if (savedTimerLogs) { try { setTimerLogs(JSON.parse(savedTimerLogs)); } catch (e) {} }

        const savedRoutines = localStorage.getItem("gbh_routines");
        if (savedRoutines) {
          try {
            const parsed = JSON.parse(savedRoutines);
            if (Array.isArray(parsed) && parsed.length > 0) setRoutinesList(parsed);
          } catch (e) {}
        }
      }
    };

    const interval = setInterval(loadRealData, 500);
    return () => clearInterval(interval);
  }, []);

  // ★成長記録への新しい記録追加★
  const handleAddGrowthLog = () => {
    const num = Number(newLogValueInput);
    if (isNaN(num) || newLogValueInput.trim() === "") return;

    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const date = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const mins = now.getMinutes().toString().padStart(2, "0");
    const dateStr = `${month}/${date} ${hours}:${mins}`;

    const newLog: GrowthLog = {
      id: `gl_${Date.now()}`,
      itemId: selectedGrowthItemId,
      value: num,
      dateStr,
      timestamp: Date.now(),
    };

    setGrowthLogs([...growthLogs, newLog]);
    setNewLogValueInput("");
  };

  // 項目追加保存
  const handleAddGrowthItem = () => {
    if (!inputItemName.trim()) return;
    const newItem: GrowthItem = {
      id: `gi_${Date.now()}`,
      name: inputItemName.trim(),
      unit: inputItemUnit.trim() || "回",
      higherIsBetter: inputItemHigherIsBetter,
    };
    setGrowthItems([...growthItems, newItem]);
    setSelectedGrowthItemId(newItem.id);
    setIsCreatingGrowthItem(false);
    setInputItemName("");
  };

  // 項目編集保存
  const handleSaveGrowthItemEdit = () => {
    if (!editingGrowthItem) return;
    setGrowthItems(growthItems.map((i) => (i.id === editingGrowthItem.id ? editingGrowthItem : i)));
    setEditingGrowthItem(null);
  };

  // 項目削除
  const handleDeleteGrowthItem = (id: string) => {
    if (growthItems.length <= 1) return;
    const updated = growthItems.filter((i) => i.id !== id);
    setGrowthItems(updated);
    setGrowthLogs(growthLogs.filter((l) => l.itemId !== id));
    if (selectedGrowthItemId === id) setSelectedGrowthItemId(updated[0].id);
    setEditingGrowthItem(null);
  };

  // 記録ログの個別更新
  const handleSaveLogEdit = () => {
    if (!editingLog) return;
    const num = Number(editLogValueInput);
    if (isNaN(num)) return;

    setGrowthLogs(growthLogs.map((l) => (l.id === editingLog.id ? { ...l, value: num } : l)));
    setEditingLog(null);
  };

  // 記録ログの削除
  const handleDeleteLog = (id: string) => {
    setGrowthLogs(growthLogs.filter((l) => l.id !== id));
    setEditingLog(null);
  };

  // 集計計算群
  const allTimeTotalMinutes = timerLogs.reduce((acc, log) => acc + (Number(log.minutes) || 0), 0);
  const allTimeCategoryTotals: Record<string, number> = {};
  timerLogs.forEach((log) => {
    const cat = log.category || "その他";
    const mins = Number(log.minutes) || 0;
    allTimeCategoryTotals[cat] = (allTimeCategoryTotals[cat] || 0) + mins;
  });
  const allTimeCategoryEntries = Object.entries(allTimeCategoryTotals).sort((a, b) => b[1] - a[1]);

  const realStudyData: Record<string, Record<string, number>> = {};
  past7Days.forEach((d) => { realStudyData[d.dateStr] = {}; });
  timerLogs.forEach((log) => {
    if (log.date && realStudyData[log.date]) {
      const cat = log.category || "その他";
      const mins = Number(log.minutes) || 0;
      realStudyData[log.date][cat] = (realStudyData[log.date][cat] || 0) + mins;
    }
  });

  const past7DaysTotalMinutes = past7Days.reduce((acc, day) => {
    const dayData = realStudyData[day.dateStr] || {};
    return acc + Object.values(dayData).reduce((a, b) => a + b, 0);
  }, 0);

  const categoryTotals: Record<string, number> = {};
  past7Days.forEach((day) => {
    const dayData = realStudyData[day.dateStr] || {};
    Object.entries(dayData).forEach(([cat, mins]) => {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + mins;
    });
  });
  const categoryEntries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxDayMinutes = Math.max(60, ...past7Days.map((day) => Object.values(realStudyData[day.dateStr] || {}).reduce((a, b) => a + b, 0)));

  let cumulativeAngle = 0;
  const pieSlices = categoryEntries.map(([cat, mins], idx) => {
    const percentage = past7DaysTotalMinutes > 0 ? mins / past7DaysTotalMinutes : 0;
    const angle = percentage * 360;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    const color = CATEGORY_COLORS[cat] || PALETTE[idx % PALETTE.length];
    return { cat, mins, percentage, startAngle, angle, color };
  });

  const getCoordinatesForPercent = (percent: number) => [Math.cos(2 * Math.PI * percent), Math.sin(2 * Math.PI * percent)];

  const modeFilteredRoutines = routinesList.filter((r) => !r.modes || r.modes.includes(selectedOverallModeId));
  const modeCompletedCount = modeFilteredRoutines.filter((r) => Boolean(r?.done)).length;
  const todayModeOverallPct = modeFilteredRoutines.length > 0 ? Math.round((modeCompletedCount / modeFilteredRoutines.length) * 100) : 0;
  const overallRoutineHistory = [70, 85, 60, 100, 80, 90, todayModeOverallPct];

  const selectedRoutine = routinesList.find((r) => r.id === selectedRoutineId) || routinesList[0];
  const isSelectedDone = selectedRoutine ? Boolean(selectedRoutine.done) : false;
  const individualRoutineHistory = [100, 0, 100, 100, 0, 100, isSelectedDone ? 100 : 0];

  // 選択中成長項目の過去10回ログ抽出
  const currentGrowthItem = growthItems.find((i) => i.id === selectedGrowthItemId) || growthItems[0];
  const currentGrowthItemLogs = growthLogs
    .filter((l) => l.itemId === currentGrowthItem?.id)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-10); // 過去10回分

  return (
    <div style={{ background: themeStyles.bgCard, border: `1px solid ${themeStyles.gold}`, borderRadius: "8px", padding: "16px", color: themeStyles.textMain, fontFamily: "sans-serif", boxSizing: "border-box" }}>
      
      {/* 1. ヘッダー ＆ サマリー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3 style={{ margin: 0, color: themeStyles.gold, fontSize: "18px" }}>
            📊 {t("研究所データセンター", "Analytics Data Center")}
          </h3>
          <span style={{ fontSize: "12px", color: themeStyles.textSub }}>
            {t("タイマー累計時間 ＆ 成長記録 ＆ ルーティン達成率の多角的解析", "Focus Totals, Growth Logs & Routine Analytics")}
          </span>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ background: themeStyles.bgInner, padding: "8px 14px", borderRadius: "6px", border: `1px solid ${themeStyles.gold}`, textAlign: "right" }}>
            <span style={{ fontSize: "10px", color: themeStyles.gold, display: "block", fontWeight: "bold" }}>
              🏆 {t("全タイマー累計総作業時間", "All-Time Grand Total")}
            </span>
            <strong style={{ fontSize: "16px", color: themeStyles.gold }}>
              {Math.floor(allTimeTotalMinutes / 60)}時間 {allTimeTotalMinutes % 60}分
            </strong>
          </div>

          <div style={{ background: themeStyles.bgInner, padding: "8px 14px", borderRadius: "6px", border: `1px solid ${themeStyles.border}`, textAlign: "right" }}>
            <span style={{ fontSize: "10px", color: themeStyles.textSub, display: "block" }}>{t("直近7日間集中時間", "7-Day Total Focus")}</span>
            <strong style={{ fontSize: "16px", color: themeStyles.textMain }}>
              {Math.floor(past7DaysTotalMinutes / 60)}時間 {past7DaysTotalMinutes % 60}分
            </strong>
          </div>
        </div>
      </div>

      {/* 🌟 2. 新機能: 📈 成長記録（項目追加・編集・削除 ＆ 過去10回分折れ線グラフ ＆ 点タップ編集） */}
      <div style={{ background: themeStyles.bgInner, border: `2px solid ${themeStyles.gold}`, borderRadius: "8px", padding: "16px", marginBottom: "25px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "15px", color: themeStyles.gold, fontWeight: "bold" }}>
              📈 成長記録トラッカー (過去10回分の推移)
            </span>
            <button
              onClick={() => setIsManagingGrowthItems(true)}
              style={{ padding: "4px 8px", background: themeStyles.bgCard, color: themeStyles.gold, border: `1px solid ${themeStyles.gold}`, borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}
            >
              ⚙️ 項目設定・編集
            </button>
          </div>

          {/* 成長項目切替タブ */}
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {growthItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedGrowthItemId(item.id)}
                style={{
                  padding: "6px 12px",
                  background: selectedGrowthItemId === item.id ? themeStyles.gold : themeStyles.bgCard,
                  color: selectedGrowthItemId === item.id ? "#000" : themeStyles.textSub,
                  border: `1px solid ${selectedGrowthItemId === item.id ? themeStyles.gold : themeStyles.border}`,
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* 記録追加入力フォーム */}
        {currentGrowthItem && (
          <div style={{ background: themeStyles.bgCard, border: `1px solid ${themeStyles.border}`, borderRadius: "6px", padding: "10px 14px", marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "bold", color: themeStyles.textMain }}>
                🎯 【{currentGrowthItem.name}】に新たな記録を追加:
              </span>
              <span style={{ fontSize: "11px", color: themeStyles.textSub }}>
                (目標向き: {currentGrowthItem.higherIsBetter ? "⬆️ 大きい方が上" : "⬇️ 小さい方が上"})
              </span>
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input
                type="number"
                step="any"
                placeholder={`数値 (${currentGrowthItem.unit})`}
                value={newLogValueInput}
                onChange={(e) => setNewLogValueInput(e.target.value)}
                style={{ width: "120px", padding: "6px", background: themeStyles.bgInner, border: `1px solid ${themeStyles.gold}`, color: themeStyles.textMain, borderRadius: "4px", fontWeight: "bold" }}
              />
              <span style={{ fontSize: "12px", color: themeStyles.gold, fontWeight: "bold" }}>{currentGrowthItem.unit}</span>
              <button
                onClick={handleAddGrowthLog}
                style={{ padding: "6px 14px", background: themeStyles.gold, color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
              >
                ＋ 記録
              </button>
            </div>
          </div>
        )}

        {/* 過去10回分 折れ線グラフ SVG */}
        <div style={{ background: themeStyles.bgCard, border: `1px solid ${themeStyles.border}`, borderRadius: "6px", padding: "16px 12px 25px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: themeStyles.textSub, marginBottom: "8px" }}>
            <span>※グラフ上の「点 (プロット円)」をクリックすると数値の編集・削除ができます</span>
            <span>表示データ: 過去{currentGrowthItemLogs.length}回分</span>
          </div>

          {currentGrowthItemLogs.length === 0 ? (
            <div style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", color: themeStyles.textSub, fontSize: "12px" }}>
              まだ記録がありません。上のフォームから数値を入力して記録を追加してください。
            </div>
          ) : (
            <div style={{ height: "150px", width: "100%", position: "relative" }}>
              <svg viewBox="0 0 700 130" style={{ width: "100%", height: "100%", overflow: "visible" }}>
                {(() => {
                  const values = currentGrowthItemLogs.map((l) => l.value);
                  let minVal = Math.min(...values);
                  let maxVal = Math.max(...values);
                  if (minVal === maxVal) {
                    minVal = Math.max(0, minVal - 10);
                    maxVal = maxVal + 10;
                  }
                  const range = maxVal - minVal || 1;

                  // 過去最大10回のプロット計算
                  const points = currentGrowthItemLogs.map((log, idx) => {
                    const x = currentGrowthItemLogs.length === 1 ? 350 : (idx / (currentGrowthItemLogs.length - 1)) * 620 + 40;
                    
                    // higherIsBetter(大きい方が上) vs lowerIsBetter(小さい方が上)
                    let norm = (log.value - minVal) / range;
                    if (!currentGrowthItem.higherIsBetter) {
                      norm = 1 - norm; // 反転
                    }
                    const y = 100 - norm * 80 + 10;

                    return { ...log, x, y };
                  });

                  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

                  return (
                    <>
                      {/* 背景横ガイド線 */}
                      {[0, 0.5, 1].map((ratio, i) => {
                        const y = 10 + ratio * 80;
                        return <line key={i} x1="30" y1={y} x2="670" y2={y} stroke={themeStyles.border} strokeDasharray="3 3" strokeWidth="1" />;
                      })}

                      {/* 折れ線 */}
                      {points.length > 1 && (
                        <polyline fill="none" stroke={themeStyles.gold} strokeWidth="3" points={polylinePoints} />
                      )}

                      {/* タップ可能な点(プロット円) ＆ ラベル */}
                      {points.map((p) => (
                        <g
                          key={p.id}
                          onClick={() => {
                            setEditingLog(p);
                            setEditLogValueInput(p.value.toString());
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <circle
                            cx={p.x} cy={p.y} r="7"
                            fill={themeStyles.bgCard} stroke={themeStyles.gold} strokeWidth="3"
                            style={{ transition: "all 0.2s" }}
                          />
                          <text x={p.x} y={p.y - 12} textAnchor="middle" fill={themeStyles.gold} fontSize="12" fontWeight="bold">
                            {p.value}{currentGrowthItem.unit}
                          </text>
                          <text x={p.x} y="118" textAnchor="middle" fill={themeStyles.textSub} fontSize="9">
                            {p.dateStr}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* 3. 各タイマー別 累計総作業時間 アーカイブ */}
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
          {allTimeCategoryEntries.length === 0 ? (
            <span style={{ fontSize: "12px", color: themeStyles.textSub }}>まだ累計タイマー記録はありません</span>
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

                  <div style={{ width: "100%", background: "#222", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, backgroundColor: color, height: "100%" }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Studyplus風 直近7日間の作業時間（積層棒グラフ） ＆ 項目別割合（円グラフ） */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "25px" }}>
        
        {/* A. 日別積層棒グラフ */}
        <div style={{ background: themeStyles.bgInner, border: `1px solid ${themeStyles.border}`, borderRadius: "8px", padding: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "13px", color: themeStyles.gold, fontWeight: "bold" }}>
              📈 {t("直近7日間の日別集中時間", "7-Day Daily Focus Time")}
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

      {/* 5. 直近7日間の【全体】ルーティン達成率（％）推移 */}
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

      {/* 6. 直近7日間の【個々のルーティン】別達成率（％）推移 */}
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

      {/* ⚙️ 成長項目 管理モーダル */}
      {isManagingGrowthItems && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: themeStyles.bgCard, border: `1px solid ${themeStyles.gold}`, padding: "20px", borderRadius: "8px", width: "380px", maxWidth: "90vw", display: "flex", flexDirection: "column", gap: "12px", color: themeStyles.textMain }}>
            <h4 style={{ margin: 0, color: themeStyles.gold, fontSize: "16px" }}>⚙️ 成長記録項目の【追加・編集・削除】</h4>

            <button
              onClick={() => { setIsCreatingGrowthItem(true); setInputItemName(""); setInputItemUnit("kg"); setInputItemHigherIsBetter(true); }}
              style={{ padding: "8px", background: themeStyles.gold, color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "12px" }}
            >
              ＋ 新しい成長測定項目を追加
            </button>

            {/* 項目一覧 */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
              <span style={{ fontSize: "12px", color: themeStyles.textSub }}>現在の登録項目一覧:</span>
              {growthItems.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: themeStyles.bgInner, padding: "8px 12px", borderRadius: "6px", border: `1px solid ${themeStyles.border}` }}>
                  <div>
                    <strong style={{ fontSize: "14px", display: "block" }}>{item.name} ({item.unit})</strong>
                    <span style={{ fontSize: "10px", color: themeStyles.textSub }}>
                      グラフ向き: {item.higherIsBetter ? "⬆️ 大きい方が上" : "⬇️ 小さい方が上"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => setEditingGrowthItem(item)} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "12px" }}>✏️ 編集</button>
                    {growthItems.length > 1 && (
                      <button onClick={() => handleDeleteGrowthItem(item.id)} style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer", fontSize: "12px" }}>🗑️ 削除</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setIsManagingGrowthItems(false)} style={{ marginTop: "10px", padding: "10px", background: themeStyles.border, color: themeStyles.textMain, border: "none", borderRadius: "4px", cursor: "pointer" }}>
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* ＋ 新規項目作成 ＆ ✏️ 編集モーダル */}
      {(isCreatingGrowthItem || editingGrowthItem) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1001 }}>
          <div style={{ background: themeStyles.bgCard, border: `1px solid ${themeStyles.gold}`, padding: "20px", borderRadius: "8px", width: "360px", maxWidth: "90vw", display: "flex", flexDirection: "column", gap: "12px", color: themeStyles.textMain }}>
            <h4 style={{ margin: 0, color: themeStyles.gold, fontSize: "16px" }}>{isCreatingGrowthItem ? "＋ 成長測定項目の追加" : "✏️ 成長測定項目の編集"}</h4>

            <div>
              <span style={{ fontSize: "12px", color: themeStyles.textSub, display: "block", marginBottom: "4px" }}>項目名:</span>
              <input
                type="text"
                placeholder="例: ベンチプレス 1RM, 50m走タイム..."
                value={isCreatingGrowthItem ? inputItemName : editingGrowthItem?.name || ""}
                onChange={(e) => isCreatingGrowthItem ? setInputItemName(e.target.value) : editingGrowthItem && setEditingGrowthItem({ ...editingGrowthItem, name: e.target.value })}
                style={{ width: "100%", padding: "8px", background: themeStyles.bgInner, border: `1px solid ${themeStyles.border}`, color: themeStyles.textMain, borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <span style={{ fontSize: "12px", color: themeStyles.textSub, display: "block", marginBottom: "4px" }}>単位 (単位ラベル):</span>
              <input
                type="text"
                placeholder="例: kg, 秒, 点, %, 回..."
                value={isCreatingGrowthItem ? inputItemUnit : editingGrowthItem?.unit || ""}
                onChange={(e) => isCreatingGrowthItem ? setInputItemUnit(e.target.value) : editingGrowthItem && setEditingGrowthItem({ ...editingGrowthItem, unit: e.target.value })}
                style={{ width: "100%", padding: "8px", background: themeStyles.bgInner, border: `1px solid ${themeStyles.border}`, color: themeStyles.textMain, borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <span style={{ fontSize: "12px", color: themeStyles.textSub, display: "block", marginBottom: "6px" }}>グラフの目標方向 (軸の向き):</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => isCreatingGrowthItem ? setInputItemHigherIsBetter(true) : editingGrowthItem && setEditingGrowthItem({ ...editingGrowthItem, higherIsBetter: true })}
                  style={{
                    flex: 1, padding: "8px 4px",
                    background: (isCreatingGrowthItem ? inputItemHigherIsBetter : editingGrowthItem?.higherIsBetter) ? themeStyles.gold : themeStyles.bgInner,
                    color: (isCreatingGrowthItem ? inputItemHigherIsBetter : editingGrowthItem?.higherIsBetter) ? "#000" : themeStyles.textSub,
                    border: `1px solid ${themeStyles.gold}`, borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer"
                  }}
                >
                  ⬆️ 数字が大きい方が上 (重量,スコア等)
                </button>
                <button
                  type="button"
                  onClick={() => isCreatingGrowthItem ? setInputItemHigherIsBetter(false) : editingGrowthItem && setEditingGrowthItem({ ...editingGrowthItem, higherIsBetter: false })}
                  style={{
                    flex: 1, padding: "8px 4px",
                    background: !(isCreatingGrowthItem ? inputItemHigherIsBetter : editingGrowthItem?.higherIsBetter) ? themeStyles.gold : themeStyles.bgInner,
                    color: !(isCreatingGrowthItem ? inputItemHigherIsBetter : editingGrowthItem?.higherIsBetter) ? "#000" : themeStyles.textSub,
                    border: `1px solid ${themeStyles.gold}`, borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer"
                  }}
                >
                  ⬇️ 数字が小さい方が上 (タイム,順位等)
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={isCreatingGrowthItem ? handleAddGrowthItem : handleSaveGrowthItemEdit}
                style={{ flex: 1, padding: "10px", background: themeStyles.gold, color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                保存する
              </button>
              <button onClick={() => { setIsCreatingGrowthItem(false); setEditingGrowthItem(null); }} style={{ flex: 1, padding: "10px", background: themeStyles.border, color: themeStyles.textMain, border: "none", borderRadius: "4px", cursor: "pointer" }}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 グラフ上の点(プロット円) タップ時の数値修正・削除モーダル */}
      {editingLog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1002 }}>
          <div style={{ background: themeStyles.bgCard, border: `1px solid ${themeStyles.gold}`, padding: "20px", borderRadius: "8px", width: "320px", maxWidth: "90vw", display: "flex", flexDirection: "column", gap: "12px", color: themeStyles.textMain }}>
            <h4 style={{ margin: 0, color: themeStyles.gold, fontSize: "16px" }}>🎯 記録の修正・削除</h4>
            <span style={{ fontSize: "12px", color: themeStyles.textSub }}>
              記録日時: <strong>{editingLog.dateStr}</strong>
            </span>

            <div>
              <span style={{ fontSize: "12px", color: themeStyles.textSub, display: "block", marginBottom: "4px" }}>記録数値 ({currentGrowthItem?.unit}):</span>
              <input
                type="number"
                step="any"
                value={editLogValueInput}
                onChange={(e) => setEditLogValueInput(e.target.value)}
                style={{ width: "100%", padding: "8px", background: themeStyles.bgInner, border: `1px solid ${themeStyles.gold}`, color: themeStyles.textMain, borderRadius: "4px", fontSize: "16px", fontWeight: "bold", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button
                onClick={handleSaveLogEdit}
                style={{ flex: 1, padding: "10px", background: themeStyles.gold, color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                保存
              </button>
              <button
                onClick={() => handleDeleteLog(editingLog.id)}
                style={{ padding: "10px 14px", background: "#e11d48", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                🗑️ 削除
              </button>
              <button
                onClick={() => setEditingLog(null)}
                style={{ padding: "10px 14px", background: themeStyles.border, color: themeStyles.textMain, border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
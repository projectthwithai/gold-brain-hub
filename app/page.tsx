"use client";
import React, { useState, useEffect } from "react";

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
  freqIntervalDays: number;
  freqDaysOfWeek: number[];
  done: boolean;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

const INITIAL_ROUTINES: RoutineItem[] = [
  { id: "r1", name: "朝5時 Deep Work (数学演習)", startTime: "05:00", endTime: "06:30", duration: 90, modes: ["weekday", "holiday", "monk"], freqType: "daily", freqIntervalDays: 1, freqDaysOfWeek: [1, 2, 3, 4, 5], done: false },
  { id: "r2", name: "高強度筋トレ (肉体兵站補給)", startTime: "06:30", endTime: "07:15", duration: 45, modes: ["weekday", "holiday", "monk"], freqType: "interval", freqIntervalDays: 2, freqDaysOfWeek: [1, 3, 5], done: false },
  { id: "r3", name: "英語 SVOC 論理構造インストール", startTime: "08:00", endTime: "09:00", duration: 60, modes: ["weekday", "monk"], freqType: "weekly", freqIntervalDays: 1, freqDaysOfWeek: [1, 3, 5], done: false }, // 月, 水, 金
  { id: "r4", name: "現代文 論理デバッグ＆要約演習", startTime: "09:15", endTime: "10:00", duration: 45, modes: ["weekday", "monk"], freqType: "weekly", freqIntervalDays: 1, freqDaysOfWeek: [2, 4, 6], done: false }, // 火, 木, 土
];

export default function Page() {
  const [tab, setTab] = useState<"routine" | "timer" | "task" | "calendar" | "analytics" | "partner" | "record">("routine");

  const [currentMode, setCurrentMode] = useState<RoutineMode>("weekday");
  const [routines, setRoutines] = useState<RoutineItem[]>(INITIAL_ROUTINES);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newRoutine, setNewRoutine] = useState<Omit<RoutineItem, "id" | "done">>({
    name: "", startTime: "07:00", endTime: "08:00", duration: 60,
    modes: ["weekday", "holiday", "monk"], freqType: "daily", freqIntervalDays: 2, freqDaysOfWeek: [1, 3, 5]
  });

  // タイマーState
  const [taskName, setTaskName] = useState("数学 Deep Work");
  const [customMins, setCustomMins] = useState(45);
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<"work" | "break">("work");

  const handleQuickTimer = (name: string, duration: number) => {
    setTaskName(name);
    setCustomMins(duration);
    setTimeLeft(duration * 60);
    setElapsedSeconds(0);
    setTimerMode("work");
    setTab("timer");
  };

  useEffect(() => {
    let interval: any = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        if (timerMode === "work") setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRunning, timeLeft, timerMode]);

  const handleStopOrComplete = () => {
    setIsRunning(false);
    if (timerMode === "work") {
      const breakSecs = Math.max(60, Math.floor(elapsedSeconds / 5));
      setTimerMode("break");
      setTimeLeft(breakSecs);
    } else {
      setTimerMode("work");
      setTimeLeft(customMins * 60);
      setElapsedSeconds(0);
    }
  };

  const todayDow = new Date().getDay(); // 今日の曜日 (0=日, 1=月, ..., 6=土)

  // 1. 本日表示されるアクティブ日課
  const activeRoutines = routines.filter((r) => {
    if (!r.modes.includes(currentMode)) return false;
    if (r.freqType === "daily") return true;
    if (r.freqType === "weekly") return r.freqDaysOfWeek?.includes(todayDow) ?? true;
    if (r.freqType === "interval") return true;
    return true;
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));

  // 2. 本日対象外（未来に控えている）の非アクティブ日課
  const upcomingRoutines = routines.filter((r) => {
    if (!r.modes.includes(currentMode)) return false;
    if (r.freqType === "weekly") return !r.freqDaysOfWeek?.includes(todayDow);
    return false;
  });

  // 「あと〇日後に表示」の動的計算ロジック
  const getDaysUntilNext = (item: RoutineItem) => {
    if (item.freqType === "interval") {
      return item.freqIntervalDays - 1 || 1;
    }
    if (item.freqType === "weekly" && item.freqDaysOfWeek && item.freqDaysOfWeek.length > 0) {
      // 次の指定曜日までの最小日数を計算
      const diffs = item.freqDaysOfWeek.map((d) => (d - todayDow + 7) % 7).filter((d) => d > 0);
      return diffs.length > 0 ? Math.min(...diffs) : 7;
    }
    return 1;
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

  const completedCount = activeRoutines.filter((r) => r.done).length;
  const progressPct = activeRoutines.length > 0 ? Math.round((completedCount / activeRoutines.length) * 100) : 0;

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#050505", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* 7大メインタブ */}
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

      {/* 1. 📜 ルーティン タブ */}
      {tab === "routine" && (
        <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📜 日課ルーティン管理</h3>

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

          {/* 達成度バー */}
          <div style={{ background: "#151515", padding: "12px", borderRadius: "6px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px", color: "#ccc" }}>
              <span>【{currentMode.toUpperCase()}】本日の日課達成度 ({completedCount} / {activeRoutines.length})</span>
              <span style={{ color: "#C9A84C", fontWeight: "bold" }}>{progressPct}%</span>
            </div>
            <div style={{ width: "100%", background: "#222", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #C9A84C, #f59e0b)", height: "100%", transition: "width 0.3s" }} />
            </div>
          </div>

          {/* 本日のアクティブ日課カードリスト */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "30px" }}>
            <span style={{ fontSize: "13px", color: "#C9A84C", fontWeight: "bold" }}>🔥 本日の実行日課:</span>
            {activeRoutines.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#151515", border: "1px solid #222", padding: "12px 15px", borderRadius: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => setRoutines(routines.map((r) => (r.id === item.id ? { ...r, done: !r.done } : r)))}
                    style={{ accentColor: "#C9A84C", cursor: "pointer", width: "18px", height: "18px" }}
                  />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold" }}>⏰ {item.startTime} - {item.endTime}</span>
                      <span style={{ fontSize: "10px", padding: "2px 6px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "3px" }}>
                        {item.freqType === "daily" && "📅 毎日"}
                        {item.freqType === "interval" && `🔄 ${item.freqIntervalDays || 2}日に1回`}
                        {item.freqType === "weekly" && `📆 曜日: ${item.freqDaysOfWeek?.map((d) => WEEKDAYS[d]).join(",")}`}
                      </span>
                    </div>
                    <span style={{ textDecoration: item.done ? "line-through" : "none", color: item.done ? "#888" : "#fff", fontWeight: "bold", fontSize: "15px" }}>{item.name}</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => handleQuickTimer(item.name, item.duration)} style={{ padding: "4px 8px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>⏱️ 起動</button>
                  <button onClick={() => setEditingRoutine(item)} style={{ padding: "4px 8px", background: "#222", color: "#3b82f6", border: "1px solid #3b82f6", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>✏️ 編集</button>
                  <button onClick={() => setRoutines(routines.filter((r) => r.id !== item.id))} style={{ padding: "4px 8px", background: "#222", color: "#e11d48", border: "1px solid #e11d48", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>

          {/* ★新機能要件: 本日非表示のルーティンを下に薄く表示＆「あと〇日後に表示」バッジ！ */}
          {upcomingRoutines.length > 0 && (
            <div style={{ borderTop: "1px dashed #333", paddingTop: "20px" }}>
              <span style={{ fontSize: "13px", color: "#666", fontWeight: "bold", display: "block", marginBottom: "10px" }}>💤 本日対象外 (次回準備中の日課):</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {upcomingRoutines.map((item) => {
                  const daysLeft = getDaysUntilNext(item);
                  return (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111", border: "1px solid #1f1f1f", padding: "10px 15px", borderRadius: "6px", opacity: 0.45 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <input type="checkbox" disabled checked={false} style={{ cursor: "not-allowed", width: "16px", height: "16px" }} />
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                            <span style={{ fontSize: "11px", color: "#666" }}>⏰ {item.startTime} - {item.endTime}</span>
                            {/* ★「あと〇日後に表示」バッジ表示！ */}
                            <span style={{ fontSize: "10px", padding: "2px 6px", background: "#221100", color: "#f59e0b", border: "1px solid #78350f", borderRadius: "3px", fontWeight: "bold" }}>
                              ⏳ あと {daysLeft} 日後に表示
                            </span>
                          </div>
                          <span style={{ color: "#aaa", fontSize: "14px" }}>{item.name}</span>
                        </div>
                      </div>

                      <button onClick={() => setEditingRoutine(item)} style={{ padding: "4px 8px", background: "#1a1a1a", color: "#666", border: "1px solid #333", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>
                        ✏️ 編集
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✏️ 編集 / 新規作成ポップアップモーダル */}
      {(isCreating || editingRoutine) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>{isCreating ? "＋ 日課新規追加" : "✏️ 日課・表示頻度の設定変更"}</h4>

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

            {/* 表示頻度設定UI (毎日 / 〇日に1回 / 曜日指定) */}
            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222" }}>
              <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold", display: "block", marginBottom: "8px" }}>⚙️ 表示頻度の設定:</span>

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
                        flex: 1, padding: "6px 0",
                        background: active ? "#C9A84C" : "#1a1a1a",
                        color: active ? "#000" : "#888",
                        border: "1px solid #C9A84C",
                        borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer"
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {(isCreating ? newRoutine.freqType : editingRoutine?.freqType) === "interval" && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <span>表示間隔:</span>
                  <input
                    type="number" min="2" max="30"
                    value={isCreating ? newRoutine.freqIntervalDays : editingRoutine?.freqIntervalDays || 2}
                    onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, freqIntervalDays: Number(e.target.value) }) : editingRoutine && setEditingRoutine({ ...editingRoutine, freqIntervalDays: Number(e.target.value) })}
                    style={{ width: "60px", padding: "6px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }}
                  />
                  <span>日に1回</span>
                </div>
              )}

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
                            borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "bold"
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

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={() => {
                  if (isCreating) {
                    if (!newRoutine.name.trim()) return;
                    setRoutines([...routines, { ...newRoutine, id: Date.now().toString(), done: false }]);
                    setIsCreating(false);
                  } else if (editingRoutine) {
                    setRoutines(routines.map((r) => (r.id === editingRoutine.id ? editingRoutine : r)));
                    setEditingRoutine(null);
                  }
                }}
                style={{ flex: 1, padding: "10px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                保存する
              </button>
              <button onClick={() => { setIsCreating(false); setEditingRoutine(null); }} style={{ flex: 1, padding: "10px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ⏱️ タイマー タブ */}
      {tab === "timer" && (
        <div style={{ background: "#0d0d0d", border: `2px solid ${timerMode === "work" ? "#C9A84C" : "#22c55e"}`, borderRadius: "8px", padding: "20px" }}>
          <h3 style={{ margin: "0 0 15px 0", color: timerMode === "work" ? "#C9A84C" : "#22c55e" }}>
            {timerMode === "work" ? "⏱️ 戦術タイマー (自由時間設定)" : "☕ 自動計算 1/5 休憩タイマー"}
          </h3>
          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <input type="text" value={taskName} onChange={(e) => setTaskName(e.target.value)} style={{ flex: 1, padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: "4px" }} />
            <input type="number" value={customMins} onChange={(e) => { setCustomMins(Number(e.target.value)); setTimeLeft(Number(e.target.value) * 60); }} style={{ width: "70px", padding: "8px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center", fontWeight: "bold" }} />
            <span style={{ alignSelf: "center" }}>分</span>
          </div>
          <div style={{ fontSize: "52px", fontWeight: "bold", textAlign: "center", color: timerMode === "work" ? "#C9A84C" : "#22c55e", fontFamily: "monospace", margin: "15px 0" }}>
            {`${Math.floor(timeLeft / 60).toString().padStart(2, "0")}:${(timeLeft % 60).toString().padStart(2, "0")}`}
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={() => setIsRunning(!isRunning)} style={{ padding: "10px 24px", background: isRunning ? "#e11d48" : "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
              {isRunning ? "一時停止" : "タイマー開始"}
            </button>
            <button onClick={handleStopOrComplete} style={{ padding: "10px 16px", background: "#333", color: "#fff", border: "1px solid #555", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>
              作業終了 ➔ 1/5自動休憩へ
            </button>
          </div>
        </div>
      )}

      {/* その他のタブ */}
      {tab === "task" && <div style={{ padding: "20px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #C9A84C" }}>✅ タスク管理ボード (稼働中)</div>}
      {tab === "calendar" && <div style={{ padding: "20px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #C9A84C" }}>📅 カレンダー WIN/LOSE 表示 (稼働中)</div>}
      {tab === "analytics" && <div style={{ padding: "20px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #C9A84C" }}>📊 研究所データセンター (稼働中)</div>}
      {tab === "partner" && <div style={{ padding: "20px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #C9A84C" }}>🤝 相棒監視タブ (稼働中)</div>}
      {tab === "record" && <div style={{ padding: "20px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #C9A84C" }}>📱 兵站調達: Galaxy S26 Ultra 資金18万円進捗 (稼働中)</div>}
    </div>
  );
}
"use client";
import React, { useState, useEffect } from "react";
import TacticalTimer from "../components/gbh/TacticalTimer";
import TaskManager from "../components/gbh/TaskManager";
import RecordTab from "../components/gbh/RecordTab";
import Header from "../components/gbh/Header";
import { supabase } from "../lib/supabase";
import PartnerTab from "../components/gbh/PartnerTab";
import UrlTab from "../components/gbh/UrlTab";
import RoutineList from "@/components/gbh/RoutineList";

export type RoutineMode = "weekday" | "holiday" | "monk";
export type FrequencyType = "daily" | "interval" | "weekly";

// モード(種類)の型定義
export interface RoutineModeOption {
  id: string;
  label: string;
}

export interface RoutineItem {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  duration: number;
  modes: string[]; // 所属するモードIDの配列
  freqType: FrequencyType;
  freqIntervalDays: number;
  freqDaysOfWeek: number[];
  done: boolean;

  hasRotation: boolean;
  rotationItems: string[];
  currentRotationIndex: number;
  rotTargetCount: number;
  rotCurrentCount: number;

  hasSteps: boolean;
  stepMap: Record<string, string[]>;
  showOnCalendar?: boolean; // カレンダー赤色表示トグル
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// デフォルトのモード種類一覧
const INITIAL_MODE_OPTIONS: RoutineModeOption[] = [
  { id: "weekday", label: "平日" },
  { id: "holiday", label: "休日/祝日" },
  { id: "monk", label: "MONK MODE" },
];

const INITIAL_ROUTINES: RoutineItem[] = [
  {
    id: "r1", name: "肉体兵站 筋トレローテーション", startTime: "06:30", endTime: "07:15", duration: 45,
    modes: ["weekday", "holiday", "monk"], freqType: "interval", freqIntervalDays: 2, freqDaysOfWeek: [1, 3, 5], done: false,
    hasRotation: true, rotationItems: ["上半身", "下半身"], currentRotationIndex: 0, rotTargetCount: 1, rotCurrentCount: 0,
    hasSteps: true,
    stepMap: {
      "上半身": ["1. ベンチプレス (3セット)", "2. ラットプルダウン (3セット)", "3. バーティカルロー (3セット)"],
      "下半身": ["1. スクワット (3セット)", "2. レッグプレス (3セット)", "3. デッドリフト (3セット)", "4. レッグカール (3セット)"]
    },
    showOnCalendar: true
  },
  {
    id: "r2", name: "朝5時 帝国学習ローテーション", startTime: "05:00", endTime: "06:30", duration: 90,
    modes: ["weekday", "holiday", "monk"], freqType: "daily", freqIntervalDays: 1, freqDaysOfWeek: [1, 2, 3, 4, 5], done: false,
    hasRotation: true, rotationItems: ["数学 (微分積分)", "英語 (SVOC構文)", "現代文 (論理読解)"], currentRotationIndex: 0, rotTargetCount: 1, rotCurrentCount: 0,
    hasSteps: true,
    stepMap: {
      "数学 (微分積分)": ["1. 定理の証明確認 (15分)", "2. 演習問題 5問解説 (45分)", "3. 誤答の解き直し (30分)"],
      "英語 (SVOC構文)": ["1. 長文 1章精読 (30分)", "2. SVOC構造書き出し (30分)"]
    },
    showOnCalendar: false
  },
];

export default function Page() {
  // ★カレンダー青色表示用 タスクデータState★
  const [tasks] = useState<any[]>([
    { id: "t1", text: "筑波大学 AC入試 願書実績整理", category: "Vision", done: false, showOnCalendar: true, calendarDates: ["2026-08-01", "2026-08-15"] },
    { id: "t2", text: "微分積分 演習問題 10問解く", category: "数学", done: false, showOnCalendar: true, calendarDates: ["2026-08-02", "2026-08-20"] }
  ]);

  // カレンダー特定日メモ State
  const [dateNotes, setDateNotes] = useState<Record<string, string>>({
    "2026-08-15": "筑波AC願書提出準備"
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [dateNoteInput, setDateNoteInput] = useState("");

  // 連続記録 (Streak) ＆ 継続判定基準ライン (streakPct)
  const [streakDays, setStreakDays] = useState<number>(0);
  const [streakPct, setStreakPct] = useState<number>(50);  // 継続判定基準ライン (%)
  const [isManagingStreak, setIsManagingStreak] = useState<boolean>(false);

  const [tab, setTab] = useState<"routine" | "timer" | "task" | "calendar" | "analytics" | "partner" | "record" | "url">("routine");

  // モード(種類)動的管理State
  const [modeOptions, setModeOptions] = useState<RoutineModeOption[]>(INITIAL_MODE_OPTIONS);
  const [currentModeId, setCurrentModeId] = useState<string>("weekday");
  const [isManagingModes, setIsManagingModes] = useState(false);
  const [newModeLabelInput, setNewModeLabelInput] = useState("");

  const [routines, setRoutines] = useState<RoutineItem[]>(INITIAL_ROUTINES);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

　// ★神修復: カレンダー用の最新ルーティン＆タスクを0.5秒ごとにリアルタイム自動同期★
  const [calendarRoutines, setCalendarRoutines] = useState<any[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<any[]>([]);

  useEffect(() => {
    const syncCalendarData = () => {
      // 1. ルーティンの最新ON/OFFデータをロード
      const savedRoutinesStr = typeof window !== "undefined" && localStorage.getItem("gbh_routines");
      if (savedRoutinesStr) {
        try { setCalendarRoutines(JSON.parse(savedRoutinesStr)); } catch (e) {}
      } else {
        setCalendarRoutines(routines);
      }

      // 2. タスクの最新ON/OFFデータをロード
      const savedTasksStr = typeof window !== "undefined" && localStorage.getItem("gbh_tasks");
      if (savedTasksStr) {
        try { setCalendarTasks(JSON.parse(savedTasksStr)); } catch (e) {}
      } else {
        setCalendarTasks(tasks);
      }
    };

    syncCalendarData();
    const interval = setInterval(syncCalendarData, 500); // 0.5秒ごとに超高速チェック
    window.addEventListener("focus", syncCalendarData);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", syncCalendarData);
    };
  }, [routines, tasks, tab]);

  // ★全自動クラウド同期エンジン (Auto Cloud Sync)★
  useEffect(() => {
    if (!supabase) return;

    const loadCloudData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from("user_data")
          .select("payload")
          .eq("user_id", session.user.id)
          .single();

        if (data?.payload && !error) {
          const p = data.payload;
          if (p.routines) setRoutines(p.routines);
          if (p.modeOptions) setModeOptions(p.modeOptions);
          if (p.streakDays !== undefined) setStreakDays(p.streakDays);
          if (p.streakPct !== undefined) setStreakPct(p.streakPct);
          if (p.dateNotes) setDateNotes(p.dateNotes);
        }
      }
    };

    loadCloudData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadCloudData();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const payload = {
          routines,
          modeOptions,
          streakDays,
          streakPct,
          dateNotes,
          updatedAt: new Date().toISOString()
        };

        await supabase.from("user_data").upsert({
          user_id: session.user.id,
          payload,
          updated_at: new Date().toISOString()
        });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [routines, modeOptions, streakDays, streakPct, dateNotes]);
  const [editingSubTab, setEditingSubTab] = useState<string>("上半身");
  const [rotationInputText, setRotationInputText] = useState("");
  const [stepInputText, setStepInputText] = useState("");

  const [newRoutine, setNewRoutine] = useState<Omit<RoutineItem, "id" | "done" | "currentRotationIndex" | "rotCurrentCount">>({
    name: "", startTime: "07:00", endTime: "08:00", duration: 60,
    modes: ["weekday", "holiday", "monk"], freqType: "daily", freqIntervalDays: 2, freqDaysOfWeek: [1, 3, 5],
    hasRotation: false, rotationItems: ["上半身", "下半身"], rotTargetCount: 1,
    hasSteps: false, stepMap: {}, showOnCalendar: false
  });

  const [activePlayerRoutine, setActivePlayerRoutine] = useState<RoutineItem | null>(null);
  const [playerSteps, setPlayerSteps] = useState<string[]>([]);
  const [playerCurrentStepIndex, setPlayerCurrentStepIndex] = useState(0);

  // タイマーState
  const [quickTask, setQuickTask] = useState("数学 Deep Work");
  const [quickMin, setQuickMin] = useState(45);

  const handleQuickTimer = (name: string, duration: number) => {
    setQuickTask(name);
    setQuickMin(duration);
    setTab("timer");
  };

  const todayDow = new Date().getDay();

  // モードフィルタリング
  const activeRoutines = routines.filter((r) => {
    if (!r.modes.includes(currentModeId)) return false;
    if (r.freqType === "daily") return true;
    if (r.freqType === "weekly") return r.freqDaysOfWeek?.includes(todayDow) ?? true;
    if (r.freqType === "interval") return true;
    return true;
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingRoutines = routines.filter((r) => {
    if (!r.modes.includes(currentModeId)) return false;
    if (r.freqType === "weekly") return !r.freqDaysOfWeek?.includes(todayDow);
    return false;
  });

  const getDaysUntilNext = (item: RoutineItem) => {
    if (item.freqType === "interval") return item.freqIntervalDays - 1 || 1;
    if (item.freqType === "weekly" && item.freqDaysOfWeek && item.freqDaysOfWeek.length > 0) {
      const diffs = item.freqDaysOfWeek.map((d) => (d - todayDow + 7) % 7).filter((d) => d > 0);
      return diffs.length > 0 ? Math.min(...diffs) : 7;
    }
    return 1;
  };

  const handleCheckRoutine = (id: string) => {
    setRoutines(routines.map((r) => {
      if (r.id !== id) return r;
      if (!r.hasRotation || r.rotationItems.length === 0) {
        return { ...r, done: !r.done };
      }
      const newDone = !r.done;
      let newCount = r.rotCurrentCount + (newDone ? 1 : -1);
      if (newCount < 0) newCount = 0;
      let newIndex = r.currentRotationIndex;
      if (newCount >= r.rotTargetCount) {
        newIndex = (r.currentRotationIndex + 1) % r.rotationItems.length;
        newCount = 0;
      }
      return { ...r, done: newDone, rotCurrentCount: newCount, currentRotationIndex: newIndex };
    }));
  };

  const handleSkipRotation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoutines(routines.map((r) => {
      if (r.id !== id || !r.hasRotation || r.rotationItems.length === 0) return r;
      const nextIndex = (r.currentRotationIndex + 1) % r.rotationItems.length;
      return { ...r, currentRotationIndex: nextIndex, rotCurrentCount: 0 };
    }));
  };

  const openStepPlayer = (item: RoutineItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentSub = item.hasRotation && item.rotationItems?.length > 0
      ? item.rotationItems[item.currentRotationIndex % item.rotationItems.length]
      : "デフォルト";

    const steps = item.stepMap?.[currentSub] || item.stepMap?.["デフォルト"] || Object.values(item.stepMap || {})[0] || ["1. 準備完了", "2. メイン実行", "3. 完遂"];

    setActivePlayerRoutine(item);
    setPlayerSteps(steps);
    setPlayerCurrentStepIndex(0);
  };

  const handleNextPlayerStep = () => {
    if (!activePlayerRoutine) return;
    if (playerCurrentStepIndex + 1 < playerSteps.length) {
      setPlayerCurrentStepIndex(playerCurrentStepIndex + 1);
    } else {
      handleCheckRoutine(activePlayerRoutine.id);
      setActivePlayerRoutine(null);
    }
  };

  // 新規モード(種類)の追加
  const handleAddModeOption = () => {
    if (!newModeLabelInput.trim()) return;
    const newId = `custom_${Date.now()}`;
    const newOpt: RoutineModeOption = { id: newId, label: newModeLabelInput.trim() };
    setModeOptions([...modeOptions, newOpt]);
    setNewModeLabelInput("");
  };

  // モードの削除
  const handleDeleteModeOption = (id: string) => {
    if (modeOptions.length <= 1) return;
    setModeOptions(modeOptions.filter((m) => m.id !== id));
    if (currentModeId === id) {
      setCurrentModeId(modeOptions.filter((m) => m.id !== id)[0].id);
    }
  };

  // ルーティン所属モードの切替
  const toggleRoutineModeAssign = (modeId: string, isEdit: boolean) => {
    if (modeId === "ALL") {
      const allIds = modeOptions.map((m) => m.id);
      if (isEdit && editingRoutine) setEditingRoutine({ ...editingRoutine, modes: allIds });
      else if (isCreating) setNewRoutine({ ...newRoutine, modes: allIds });
      return;
    }

    if (isEdit && editingRoutine) {
      const current = editingRoutine.modes || [];
      const updated = current.includes(modeId) ? current.filter((m) => m !== modeId) : [...current, modeId];
      setEditingRoutine({ ...editingRoutine, modes: updated });
    } else if (isCreating) {
      const current = newRoutine.modes || [];
      const updated = current.includes(modeId) ? current.filter((m) => m !== modeId) : [...current, modeId];
      setNewRoutine({ ...newRoutine, modes: updated });
    }
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
  
  // 本日のWIN判定 ＆ 動的ストリークカウント(+1)計算
  const currentDisplayStreak = streakDays + (progressPct >= streakPct ? 1 : 0);

  const startEdit = (item: RoutineItem) => {
    setEditingRoutine(item);
    setRotationInputText(item.rotationItems?.join(", ") || "");
    const subs = item.hasRotation && item.rotationItems?.length > 0 ? item.rotationItems : ["デフォルト"];
    const firstSub = subs[0];
    setEditingSubTab(firstSub);
    setStepInputText(item.stepMap?.[firstSub]?.join("\n") || "");
  };

  const handleSubTabChange = (subName: string, isEdit: boolean) => {
    setEditingSubTab(subName);
    const map = isEdit ? editingRoutine?.stepMap : newRoutine.stepMap;
    const existingSteps = map?.[subName] || [];
    setStepInputText(existingSteps.join("\n"));
  };

  const handleStepTextChange = (text: string, isEdit: boolean) => {
    setStepInputText(text);
    const stepsArr = text.split("\n").filter((s) => s.trim().length > 0);

    if (isEdit && editingRoutine) {
      const updatedMap = { ...(editingRoutine.stepMap || {}), [editingSubTab]: stepsArr };
      setEditingRoutine({ ...editingRoutine, stepMap: updatedMap });
    } else if (isCreating) {
      const updatedMap = { ...(newRoutine.stepMap || {}), [editingSubTab]: stepsArr };
      setNewRoutine({ ...newRoutine, stepMap: updatedMap });
    }
  };

  const handleSaveDateNote = () => {
    if (!selectedCalendarDate) return;
    setDateNotes({ ...dateNotes, [selectedCalendarDate]: dateNoteInput.trim() });
    setSelectedCalendarDate(null);
    setDateNoteInput("");
  };

  const currentModeLabel = modeOptions.find((m) => m.id === currentModeId)?.label || "全モード";

  return (
    <div style={{ padding: "20px", color: "#fff", background: "#050505", minHeight: "100vh", fontFamily: "sans-serif" }}>
<Header />
      {/* 画面最上部: 連続記録 (Streak) 氷 ➔ 炎 動的エフェクトバッジ */}
      <div
        style={{
          display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
          background: progressPct >= streakPct ? "linear-gradient(135deg, #1c0d02, #0d0d0d)" : "linear-gradient(135deg, #031f38, #0d0d0d)",
          border: `1px solid ${progressPct >= streakPct ? "#f97316" : "#38bdf8"}`,
          boxShadow: progressPct >= streakPct ? "0 0 18px rgba(249, 115, 22, 0.4)" : "0 0 18px rgba(56, 189, 248, 0.25)",
          padding: "12px 18px",
          borderRadius: "8px",
          marginBottom: "15px",
          flexWrap: "wrap",
          gap: "10px",
          transition: "all 0.5s ease-in-out"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "28px", filter: progressPct >= streakPct ? "drop-shadow(0 0 8px #f97316)" : "drop-shadow(0 0 8px #38bdf8)", transition: "all 0.5s" }}>
            {progressPct >= streakPct ? "🔥" : "🧊"}
          </span>
          <div>
            <span style={{ fontSize: "10px", color: progressPct >= streakPct ? "#fdba74" : "#7dd3fc", letterSpacing: "1px", fontWeight: "bold", display: "block" }}>
              {progressPct >= streakPct ? "🔥 STREAK IGNITED (基準達成中)" : "❄️ FROZEN STREAK (凍結中)"}
            </span>
            <strong
              style={{
                fontSize: "20px",
                fontWeight: "900",
                color: progressPct >= streakPct ? "#f97316" : "#38bdf8",
                textShadow: progressPct >= streakPct
                  ? "0 0 10px rgba(249, 115, 22, 0.8), 0 0 20px rgba(234, 88, 12, 0.5)"
                  : "0 0 10px rgba(56, 189, 248, 0.8), 0 0 20px rgba(125, 211, 252, 0.4)",
                letterSpacing: "0.5px",
                transition: "all 0.5s"
              }}
            >
              {currentDisplayStreak} 日連続達成中
            </strong>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "11px", color: "#888", display: "block" }}>本日達成度 / 判定基準</span>
            <span style={{ fontSize: "13px", fontWeight: "bold", color: progressPct >= streakPct ? "#22c55e" : "#38bdf8" }}>
              本日 {progressPct}% / 基準 {streakPct}% ({progressPct >= streakPct ? "🔥 WIN 達成！" : "🧊 凍結中"})
            </span>
          </div>

          <button
            onClick={() => setIsManagingStreak(true)}
            style={{ padding: "6px 12px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
          >
            ⚙️ 基準設定
          </button>
        </div>
      </div>

      {/* 7大メインタブ */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid #222", paddingBottom: "10px", flexWrap: "wrap" }}>
        {[
          { id: "routine", label: "📜 ルーティン" },
          { id: "timer", label: "⏱️ 戦術タイマー" },
          { id: "task", label: "✅ タスク管理" },
          { id: "calendar", label: "📅 カレンダー WIN/LOSE" },
          { id: "url", label: "🔗 有益URL/Lab" },
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

      {/* ★全7タブが完全に独立分離された Keep-Alive レンダリングエリア (真っ黒問題解呪)★ */}

      {/* 1. 📜 ルーティン タブ (RoutineList.tsx から呼び出し) */}
      <div style={{ display: tab === "routine" ? "block" : "none" }}>
        <RoutineList onQuickTimer={handleQuickTimer} />
      </div>

      {/* 2. ⏱️ 戦術タイマー (独立保持) */}
      <div style={{ display: tab === "timer" ? "block" : "none" }}>
        <TacticalTimer initialTask={quickTask || "数学 Deep Work"} initialMinutes={quickMin || 45} />
      </div>

      {/* 3. ✅ タスク管理 (独立保持) */}
      <div style={{ display: tab === "task" ? "block" : "none" }}>
        <TaskManager />
      </div>

      {/* 4. 📅 カレンダー WIN/LOSE タブ (独立保持) */}
      <div style={{ display: tab === "calendar" ? "block" : "none" }}>
        <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📅 カレンダー審判 (WIN/LOSE ＆ 赤:ルーティン / 青:タスク連動)</h3>
            <span style={{ fontSize: "12px", color: "#aaa" }}>※日付マスをクリックすると特定日の予定メモを書けます</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
            {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
              <div key={d} style={{ textAlign: "center", padding: "6px", fontSize: "12px", fontWeight: "bold", color: i === 0 ? "#e11d48" : i === 6 ? "#3b82f6" : "#888" }}>{d}</div>
            ))}

            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const dateStr = `2026-08-${day.toString().padStart(2, "0")}`;
              const todayNum = new Date().getDate(); 
              const isToday = day === todayNum;
              const isPast = day < todayNum;

              let resultStatus: "WIN" | "LOSE" | null = null;
              if (isToday) {
                resultStatus = progressPct >= streakPct ? "WIN" : "LOSE";
              } else if (isPast) {
                resultStatus = (day % 2 === 0) ? "WIN" : "LOSE";
              } else {
                resultStatus = null;
              }

              // ★修正: ルーティンとタスクの最新ON/OFFデータをリアルタイム読み込み★
              // ★ルーティン(赤)とタスク(青)を両方100%リアルタイム読み込み★
              const savedRoutinesArr = typeof window !== "undefined" && localStorage.getItem("gbh_routines") ? JSON.parse(localStorage.getItem("gbh_routines")!) : (calendarRoutines || routines || []);
              const redRoutines = (savedRoutinesArr || []).filter((r: any) => Boolean(r?.showOnCalendar));

              const savedTasksArr = typeof window !== "undefined" && localStorage.getItem("gbh_tasks") ? JSON.parse(localStorage.getItem("gbh_tasks")!) : (calendarTasks || tasks || []);
              const blueTasks = (savedTasksArr || []).filter((t: any) => Boolean(t?.showOnCalendar && t?.calendarDates?.includes(dateStr)));
              const dateNote = dateNotes[dateStr];

              return (
                <div
                  key={day}
                  onClick={() => { setSelectedCalendarDate(dateStr); setDateNoteInput(dateNotes[dateStr] || ""); }}
                  style={{
                    background: isToday ? "#1f1a08" : "#111",
                    border: `1px solid ${isToday ? "#C9A84C" : "#222"}`,
                    borderRadius: "6px", minHeight: "90px", padding: "6px",
                    cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: "bold", color: isToday ? "#C9A84C" : "#ccc" }}>{day}日</span>
                    {resultStatus && (
                      <span style={{ fontSize: "10px", padding: "1px 4px", borderRadius: "3px", fontWeight: "bold", background: resultStatus === "WIN" ? "#14532d" : "#450a0a", color: resultStatus === "WIN" ? "#22c55e" : "#ef4444" }}>
                        {resultStatus}
                      </span>
                    )}
                  </div>

                  {dateNote && (
                    <div style={{ fontSize: "9px", background: "#222", color: "#f59e0b", padding: "2px 4px", borderRadius: "2px", borderLeft: "2px solid #f59e0b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      📝 {dateNote}
                    </div>
                  )}

                  {/* ★解決: 手元で編集された最新の赤色ルーティンをダイレクト読み込み表示★ */}
                  {(typeof window !== "undefined" && localStorage.getItem("gbh_routines") ? JSON.parse(localStorage.getItem("gbh_routines")!) : routines).filter((r: any) => Boolean(r?.showOnCalendar)).map((r: any) => {
                    const currentSub = r.hasRotation && r.rotationItems?.length > 0
                      ? r.rotationItems[r.currentRotationIndex % r.rotationItems.length]
                      : null;
                    return (
                      <div key={r.id} style={{ fontSize: "9px", background: "#450a0a", color: "#fca5a5", padding: "2px 4px", borderRadius: "2px", borderLeft: "2px solid #ef4444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🔴 {r.name} {currentSub ? `(${currentSub})` : ""}
                      </div>
                    );
                  })}

                  {/* ★新機能: カレンダーに自動計算でローテーション予定順序(上半身/下半身...)を刻印★ */}
                  {routines.filter((r: any) => r.hasRotation && r.rotationItems?.length > 0).map((r: any) => {
                    const dayDiff = day - (new Date().getDate());
                    const targetCount = r.rotTargetCount || 1;
                    const stepsToAdvance = Math.floor(dayDiff / targetCount);
                    const itemsLen = r.rotationItems.length;
                    const predictedIndex = (((r.currentRotationIndex + stepsToAdvance) % itemsLen) + itemsLen) % itemsLen;
                    const predictedSubName = r.rotationItems[predictedIndex];

                    return (
                      <div key={r.id} style={{ fontSize: "9px", background: "#261c02", color: "#f59e0b", padding: "2px 4px", borderRadius: "2px", borderLeft: "2px solid #f59e0b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🔄 {r.name}: {predictedSubName}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 8. 🔗 有益ポータル/Lab (非破壊保持) */}
      <div style={{ display: tab === "url" ? "block" : "none" }}>
        <UrlTab />
      </div>

      {/* 5. 📊 研究所データ (独立保持) */}
      <div style={{ display: tab === "analytics" ? "block" : "none" }}>
        <div style={{ padding: "20px", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #C9A84C" }}>📊 研究所データセンター (稼働中)</div>
      </div>

      {/* 6. 🤝 相棒監視 (本物コンポーネント呼び出し) */}
      <div style={{ display: tab === "partner" ? "block" : "none" }}>
        <PartnerTab />
      </div>

      {/* 7. 📱 兵站調達 (独立保持) */}
      <div style={{ display: tab === "record" ? "block" : "none" }}>
        <RecordTab />
      </div>

      {/* ⚙️ モード管理モーダル */}
      {isManagingModes && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>⚙️ ルーティンモード(種類)の管理</h4>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="text" placeholder="新しいモード名 (例: テスト期間)..." value={newModeLabelInput} onChange={(e) => setNewModeLabelInput(e.target.value)} style={{ flex: 1, padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px" }} />
              <button onClick={handleAddModeOption} style={{ padding: "8px 14px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>＋追加</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
              <span style={{ fontSize: "12px", color: "#888" }}>現在のモード一覧:</span>
              {modeOptions.map((m) => (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d0d0d", padding: "8px 12px", borderRadius: "4px", border: "1px solid #222" }}>
                  <span style={{ fontWeight: "bold", fontSize: "14px" }}>{m.label} ({m.id})</span>
                  {modeOptions.length > 1 && (
                    <button onClick={() => handleDeleteModeOption(m.id)} style={{ background: "none", border: "none", color: "#e11d48", cursor: "pointer", fontSize: "12px" }}>🗑️ 削除</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setIsManagingModes(false)} style={{ marginTop: "10px", padding: "10px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>完了</button>
          </div>
        </div>
      )}

      {/* 📺 全画面手順モード */}
      {activePlayerRoutine && playerSteps.length > 0 && (
        <div style={{ position: "fixed", inset: 0, background: "#050505", zIndex: 9999, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "40px 20px", color: "#fff", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "16px", color: "#C9A84C", fontWeight: "bold" }}>
              📜 {activePlayerRoutine.name} ➔ 【{activePlayerRoutine.hasRotation ? activePlayerRoutine.rotationItems[activePlayerRoutine.currentRotationIndex % activePlayerRoutine.rotationItems.length] : "手順"}】
            </span>
            <button onClick={() => setActivePlayerRoutine(null)} style={{ padding: "8px 16px", background: "#222", border: "1px solid #555", color: "#fff", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>✕ 閉じる</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "20px", marginTop: "auto", marginBottom: "auto" }}>
            <div style={{ fontSize: "24px", color: "#888", fontWeight: "bold", letterSpacing: "2px" }}>
              STEP {playerCurrentStepIndex + 1} / {playerSteps.length}
            </div>
            <div style={{ fontSize: "clamp(36px, 8vw, 72px)", fontWeight: "900", color: "#C9A84C", textShadow: "0 0 20px rgba(201,168,76,0.3)", padding: "0 20px", lineHeight: "1.2" }}>
              {playerSteps[playerCurrentStepIndex]}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <button onClick={handleNextPlayerStep} style={{ width: "100%", maxWidth: "500px", padding: "20px 40px", background: "linear-gradient(135deg, #22c55e, #15803d)", color: "#fff", border: "none", borderRadius: "12px", fontSize: "24px", fontWeight: "900", cursor: "pointer", boxShadow: "0 10px 30px rgba(34,197,94,0.4)" }}>
              {playerCurrentStepIndex + 1 < playerSteps.length ? "✅ クリア (次の種目へ ➔)" : "🔥 作戦完遂！ (ルーティン完了)"}
            </button>
          </div>
        </div>
      )}

      {/* ✏️ 編集 / 新規作成モーダル */}
      {(isCreating || editingRoutine) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "400px", display: "flex", flexDirection: "column", gap: "12px", maxHeight: "90vh", overflowY: "auto" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>{isCreating ? "＋ 日課新規追加" : "✏️ 日課・所属モード＆設定変更"}</h4>

            <div>
              <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>ルーティン名:</span>
              <input
                type="text" placeholder="例: 筋トレ, 帝国学習..."
                value={isCreating ? newRoutine.name : editingRoutine?.name || ""}
                onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, name: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, name: e.target.value })}
                style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", boxSizing: "border-box" }}
              />
            </div>

            {/* 🔴 カレンダー赤色表示トグル */}
            <div style={{ background: "#0d0d0d", padding: "10px", borderRadius: "6px", border: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: "bold" }}>🔴 カレンダーに赤色で表示する:</span>
              <input
                type="checkbox"
                checked={isCreating ? Boolean((newRoutine as any).showOnCalendar) : Boolean(editingRoutine?.showOnCalendar)}
                onChange={(e) => {
                  const val = e.target.checked;
                  if (isCreating) setNewRoutine({ ...newRoutine, showOnCalendar: val } as any);
                  else if (editingRoutine) setEditingRoutine({ ...editingRoutine, showOnCalendar: val });
                }}
                style={{ accentColor: "#ef4444", cursor: "pointer", width: "18px", height: "18px" }}
              />
            </div>

            {/* 所属モード選択 */}
            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222" }}>
              <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold", display: "block", marginBottom: "8px" }}>🏷️ 表示するモード(種類)の選択:</span>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "6px" }}>
                <button type="button" onClick={() => toggleRoutineModeAssign("ALL", !isCreating)} style={{ padding: "4px 8px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", cursor: "pointer" }}>
                  ＋ 全てのモードに割り当て
                </button>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {modeOptions.map((opt) => {
                  const assigned = isCreating ? newRoutine.modes?.includes(opt.id) : editingRoutine?.modes?.includes(opt.id);
                  return (
                    <button
                      key={opt.id} type="button" onClick={() => toggleRoutineModeAssign(opt.id, !isCreating)}
                      style={{ padding: "6px 10px", background: assigned ? "#C9A84C" : "#1a1a1a", color: assigned ? "#000" : "#888", border: `1px solid ${assigned ? "#C9A84C" : "#333"}`, borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#888" }}>時間:</span>
              <input type="time" value={isCreating ? newRoutine.startTime : editingRoutine?.startTime || "07:00"} onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, startTime: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, startTime: e.target.value })} style={{ padding: "6px", background: "#000", border: "1px solid #333", color: "#C9A84C", borderRadius: "4px" }} />
              <span style={{ fontSize: "12px", color: "#888" }}>〜</span>
              <input type="time" value={isCreating ? newRoutine.endTime : editingRoutine?.endTime || "08:00"} onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, endTime: e.target.value }) : editingRoutine && setEditingRoutine({ ...editingRoutine, endTime: e.target.value })} style={{ padding: "6px", background: "#000", border: "1px solid #333", color: "#C9A84C", borderRadius: "4px" }} />
            </div>

            {/* 多段階ローテーション設定UI */}
            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#C9A84C", fontWeight: "bold" }}>🔄 多段階ローテーション設定:</span>
                <label style={{ fontSize: "12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <input type="checkbox" checked={isCreating ? newRoutine.hasRotation : editingRoutine?.hasRotation || false} onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, hasRotation: e.target.checked }) : editingRoutine && setEditingRoutine({ ...editingRoutine, hasRotation: e.target.checked })} />
                  使用する
                </label>
              </div>

              {(isCreating ? newRoutine.hasRotation : editingRoutine?.hasRotation) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  <input
                    type="text" placeholder="例: 上半身, 下半身  または  数学, 英語, 国語"
                    value={rotationInputText}
                    onChange={(e) => {
                      const val = e.target.value; setRotationInputText(val);
                      const items = val.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
                      if (isCreating) setNewRoutine({ ...newRoutine, rotationItems: items });
                      else if (editingRoutine) setEditingRoutine({ ...editingRoutine, rotationItems: items });
                    }}
                    style={{ width: "100%", padding: "6px", background: "#000", border: "1px solid #333", color: "#fff", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box" }}
                  />
                </div>
              )}
            </div>

            {/* 手順メモ設定UI */}
            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: "bold" }}>📋 手順メモ設定 (全画面表示用):</span>
                <label style={{ fontSize: "12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <input type="checkbox" checked={isCreating ? newRoutine.hasSteps : editingRoutine?.hasSteps || false} onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, hasSteps: e.target.checked }) : editingRoutine && setEditingRoutine({ ...editingRoutine, hasSteps: e.target.checked })} />
                  使用する
                </label>
              </div>

              {(isCreating ? newRoutine.hasSteps : editingRoutine?.hasSteps) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {((isCreating ? newRoutine.rotationItems : editingRoutine?.rotationItems) || []).length > 0 && (
                    <div>
                      <span style={{ fontSize: "11px", color: "#888", display: "block", marginBottom: "4px" }}>手順を編集するサブ項目を選択:</span>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {((isCreating ? newRoutine.rotationItems : editingRoutine?.rotationItems) || ["デフォルト"]).map((sub) => (
                          <button
                            key={sub} type="button" onClick={() => handleSubTabChange(sub, !isCreating)}
                            style={{ padding: "4px 8px", background: editingSubTab === sub ? "#22c55e" : "#1a1a1a", color: editingSubTab === sub ? "#000" : "#888", border: "1px solid #22c55e", borderRadius: "4px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" }}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <textarea
                    rows={4} placeholder={`1. ベンチプレス (3セット)\n2. ラットプルダウン (3セット)`}
                    value={stepInputText} onChange={(e) => handleStepTextChange(e.target.value, !isCreating)}
                    style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#22c55e", borderRadius: "4px", fontSize: "12px", boxSizing: "border-box", fontFamily: "monospace" }}
                  />
                </div>
              )}
            </div>

            {/* 表示頻度設定UI */}
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
                      key={f.id} type="button"
                      onClick={() => isCreating ? setNewRoutine({ ...newRoutine, freqType: f.id as any }) : editingRoutine && setEditingRoutine({ ...editingRoutine, freqType: f.id as any })}
                      style={{ flex: 1, padding: "6px 0", background: active ? "#C9A84C" : "#1a1a1a", color: active ? "#000" : "#888", border: "1px solid #C9A84C", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {(isCreating ? newRoutine.freqType : editingRoutine?.freqType) === "interval" && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                  <span>表示間隔:</span>
                  <input type="number" min="2" max="30" value={isCreating ? newRoutine.freqIntervalDays : editingRoutine?.freqIntervalDays || 2} onChange={(e) => isCreating ? setNewRoutine({ ...newRoutine, freqIntervalDays: Number(e.target.value) }) : editingRoutine && setEditingRoutine({ ...editingRoutine, freqIntervalDays: Number(e.target.value) })} style={{ width: "60px", padding: "6px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", textAlign: "center" }} />
                  <span>日に1回</span>
                </div>
              )}

              {(isCreating ? newRoutine.freqType : editingRoutine?.freqType) === "weekly" && (
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {WEEKDAYS.map((dayName, idx) => {
                    const selected = isCreating ? newRoutine.freqDaysOfWeek?.includes(idx) : editingRoutine?.freqDaysOfWeek?.includes(idx);
                    return (
                      <button
                        key={dayName} type="button" onClick={() => toggleFreqDay(idx, !isCreating)}
                        style={{ padding: "6px 10px", background: selected ? "#C9A84C" : "#1a1a1a", color: selected ? "#000" : "#666", border: `1px solid ${selected ? "#C9A84C" : "#333"}`, borderRadius: "4px", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
                      >
                        {dayName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                onClick={() => {
                  if (isCreating) {
                    if (!newRoutine.name.trim()) return;
                    setRoutines([...routines, { ...newRoutine, id: Date.now().toString(), done: false, currentRotationIndex: 0, rotCurrentCount: 0 }]);
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

      {/* 判定基準設定モーダル */}
      {isManagingStreak && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "340px", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>⚙️ 連続記録の達成基準ライン設定</h4>
            <span style={{ fontSize: "12px", color: "#ccc", lineHeight: "1.4" }}>
              本日の日課達成率（％）がこの基準を超えると、連続記録（Streak日数）がカウントアップされます。1日でも届かないと0日にリセットされます。
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#0d0d0d", padding: "12px", borderRadius: "4px", border: "1px solid #222" }}>
              <span style={{ fontSize: "13px", color: "#C9A84C", fontWeight: "bold" }}>達成基準ライン:</span>
              <input type="number" min="10" max="100" step="5" value={streakPct} onChange={(e) => setStreakPct(Number(e.target.value))} style={{ width: "70px", padding: "6px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", fontSize: "16px", fontWeight: "bold", textAlign: "center" }} />
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>％</span>
            </div>
            <button onClick={() => setIsManagingStreak(false)} style={{ marginTop: "10px", padding: "10px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}>
              設定を保存して閉じる
            </button>
          </div>
        </div>
      )}

      {/* 📅 カレンダー特定日スケジュールメモ入力モーダル (1文字のズレもなく完璧に閉じる！) */}
      {selectedCalendarDate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "320px", display: "flex", flexDirection: "column", gap: "12px", color: "#fff" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>📝 【{selectedCalendarDate}】の予定メモ入力</h4>
            <textarea rows={4} placeholder="この日の重要な予定・スケジュールを入力..." value={dateNoteInput} onChange={(e) => setDateNoteInput(e.target.value)} style={{ width: "100%", padding: "8px", background: "#000", border: "1px solid #333", color: "#f59e0b", borderRadius: "4px", fontSize: "13px", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  if (selectedCalendarDate) {
                    setDateNotes({ ...dateNotes, [selectedCalendarDate]: dateNoteInput.trim() });
                    setSelectedCalendarDate(null);
                    setDateNoteInput("");
                  }
                }}
                style={{ flex: 1, padding: "8px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                保存
              </button>
              <button onClick={() => setSelectedCalendarDate(null)} style={{ flex: 1, padding: "8px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
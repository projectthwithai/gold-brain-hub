// FORCE UPDATE: 2026-07-18-22:15
// @ts-nocheck
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import LiquidTimerCard from "../components/LiquidTimerCard";
import RoutineRow from "../components/RoutineRow";
import RoutineStepPlayer from "../components/RoutineStepPlayer";
import PartnerPanel from "../components/PartnerPanel";
import {
  DEFAULT_MAX_WORK_MIN,
  DEFAULT_LONG_BREAK_MIN,
  DEFAULT_WORK_REST_RATIO,
} from "../lib/liquidTimer";
import {
  applyStepCompletion,
  completeAllSteps,
  deriveRoutineDone,
  resetSteps,
  syncAllRoutinesToDb,
  toggleStep,
} from "../lib/routineSteps";
import {
  acceptInviteCode,
  createInviteCode,
  fetchActivePartnership,
  fetchPartnerActivities,
  fetchPartnerSnapshot,
  fetchPendingInviteCode,
  getPartnerUserId,
  logPartnerActivity,
  subscribePartnerActivities,
  upsertPartnerSnapshot,
} from "../lib/partnerships";
import type { GoalItem, PartnerActivity, PartnerSnapshot, Partnership, RoutineItem, RoutineStep } from "../lib/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUPABASE LAYER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import {
  getSupabase,
  isSupabaseConfigured,
  onAuthStateChange,
  fetchAllData,
  upsertData,
  signInWithGoogle,
} from "../lib/supabase";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// THEME
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const THEMES = {
  dark: {
    name:"Black & Gold",
    bg:"#050505", bg2:"#0A0A0A", bg3:"#111",
    surface:"#0d0d0d", surfaceHover:"#131313",
    border:"#2a2a2a", borderGold:"#8A683066",
    text:"#F0EAD8", textDim:"#C8C0B0", textMuted:"#888",
    gold:"#C9A84C", goldLight:"#F0D878", goldDark:"#8A6830",
    inputBg:"#0f0f0f", scrollThumb:"#8A6830",
    gridLine:"#C9A84C07",
  },
  light: {
    name:"White & Gold",
    bg:"#F5F0E8", bg2:"#FFFFFF", bg3:"#F0EBE0",
    surface:"#FFFFFF", surfaceHover:"#F8F4ED",
    border:"#E0D8C8", borderGold:"#C9A84C55",
    text:"#1A1208", textDim:"#6B5A30", textMuted:"#B0A080",
    gold:"#B8922A", goldLight:"#D4A83A", goldDark:"#8A6820",
    inputBg:"#F8F4ED", scrollThumb:"#C9A84C",
    gridLine:"#B8922A07",
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// i18n
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DICT = {
  en:{
    tagline:"DISCIPLINE · FOCUS · EXCELLENCE",
    greeting_morning:"Good Morning", greeting_afternoon:"Good Afternoon", greeting_evening:"Good Evening",
    remaining_days:"Days Remaining", no_target:"Set your target date →",
    streak_label:"Day Streak", perfect_day:"🏆 PERFECT",
    task_rate:"Task Rate", routine_lbl:"Routine", active_goals:"Goals", focus_mode:"Focus",
    today:"TODAY", goals:"GOALS", chart:"CHART",
    routine_title:"Daily Routine", routine_sub:"Tap to complete · ✏ to edit",
    url_hub:"URL Hub", url_sub:"Tap to open in new tab",
    events_title:"Events", events_sub:"Calendar & tasks",
    add_routine:"＋ Add Routine", add_task:"＋ Add Task", add_goal:"＋ Add Goal",
    add_link:"＋ Add Link", add_event:"＋ Add Event", add_timer:"＋ Add Timer",
    add_countdown:"＋ Add Countdown",
    progress:"PROGRESS", completed:"COMPLETED", reset:"Reset",
    export_btn:"↓ Export", import_btn:"↑ Import",
    settings:"Settings", lang_label:"Language", theme_label:"Theme",
    username_label:"Your Name", username_placeholder:"e.g. Alex",
    target_date:"Target Date", save_settings:"Save Settings",
    streak_threshold:"Streak Threshold (%)",
    streak_threshold_sub:"Complete this % of today's tasks to count as a streak day",
    focus_lbl:"Focus", break_lbl:"Break", cycles:"cycles", start:"START", pause:"PAUSE", stop:"STOP",
    long_break:"Long Break", rest_credit:"Rest Credit", max_work:"Max Work", sessions:"sessions", idle_lbl:"Ready",
    work_rest_ratio:"Work:Rest Ratio", long_break_min:"Long Break (min)", worked_for:"Worked",
    ceiling_note:(raw: string, ceil: string)=>`${raw} min rounded up to ${ceil} min break`,
    delete_btn:"Delete", cancel_btn:"Cancel", save_btn:"Save",
    modal_add_task:"Add Task", modal_edit_task:"Edit Task",
    modal_add_sched:"Add Routine", modal_edit_sched:"Edit Routine",
    modal_add_link:"Add Link", modal_edit_link:"Edit Link",
    modal_add_goal:"Add Goal", modal_edit_goal:"Edit Goal",
    modal_add_event:"Add Event", modal_edit_event:"Edit Event",
    timer_name:"Timer Name", timer_name_ph:"e.g. Deep Study",
    countdown_name:"Countdown Name", countdown_name_ph:"e.g. Exam Day",
    countdown_date:"Target Date", countdown_active:"Show on Dashboard",
    task_name:"Task Name", task_ph:"e.g. Read research paper",
    category:"Category", cat_ph:"e.g. Focus",
    time_lbl:"Time", sched_ph:"e.g. Morning meditation",
    icon_lbl:"Icon", site_name:"Site Name", site_ph:"e.g. Coursera",
    url_lbl:"URL", accent_color:"Accent Color",
    goal_lbl:"Goal", goal_ph:"e.g. Reach peak fitness",
    timeline:"Timeline", timeline_ph:"e.g. 6 months", prog_lbl:"Progress",
    event_title_lbl:"Title", event_date_lbl:"Date", event_time_lbl:"Time (opt.)",
    event_color_lbl:"Color", event_desc_lbl:"Note",
    days_lbl:"Active Days", freq_lbl:"Frequency",
    freq_daily:"Every day", freq_every2:"Every 2 days", freq_every3:"Every 3 days",
    freq_weekly:"Weekly", freq_custom:"Custom days", freq_rotation:"Daily rotation",
    task_memo:"Memo", task_memo_ph:"Notes, links, context...", task_deadline:"Due date",
    delete_cat:"Delete category",
    days_short:["Su","Mo","Tu","We","Th","Fr","Sa"],
    inactive_today:"Not scheduled today",
    by_category:"By Category",
    img_upload:"Upload Image", img_or:"or pick emoji",
    mob_routine:"Routine", mob_tasks:"Tasks", mob_links:"Links", mob_events:"Events", mob_partner:"Partner",
    footer:"Apex Hub v7.0 · Built for Hyperformers · 2026",
    days_left:"days left", days_past:"days past", today_word:"TODAY",
    countdown_title:"Countdowns",
    no_countdown:"No active countdown — add one below",
    play_sequence:"Start Sequence", steps_label:"steps", shared_badge:"Shared",
    add_step:"＋ Add Step", step_title_ph:"e.g. Push-ups 1 set", share_routine:"Share with Partner",
    step_of:(c: number, total: number)=>`Step ${c} of ${total}`, complete_step:"Complete Step", exit_player:"Exit Focus",
    all_done:"All steps complete!", partner_title:"Partner Sync", partner_sub:"Share progress with your partner in real time",
    invite_code:"Your Invite Code", generate_code:"Generate Invite Code", enter_code:"Enter 6-char code",
    join_partner:"Join Partner", routine_progress:"routines", goal_progress:"Goals",
    activity_feed:"Partner Feed", no_partner:"Sign in to sync with your partner",
    no_activity:"No activity yet", copied:"Copied!", partner_label:"Partner",
  },
  ja:{
    tagline:"規律 · 集中 · 卓越",
    greeting_morning:"おはようございます", greeting_afternoon:"こんにちは", greeting_evening:"こんばんは",
    remaining_days:"残り日数", no_target:"目標日を設定してください →",
    streak_label:"継続日数", perfect_day:"🏆 達成",
    task_rate:"タスク完了率", routine_lbl:"ルーティン", active_goals:"目標数", focus_mode:"集中",
    today:"今日", goals:"目標", chart:"グラフ",
    routine_title:"デイリールーティン", routine_sub:"タップで完了 · ✏で編集",
    url_hub:"URLハブ", url_sub:"タップで別タブ起動",
    events_title:"イベント", events_sub:"カレンダーと予定",
    add_routine:"＋ ルーティン追加", add_task:"＋ タスク追加", add_goal:"＋ 目標追加",
    add_link:"＋ リンク追加", add_event:"＋ イベント追加", add_timer:"＋ タイマー追加",
    add_countdown:"＋ カウントダウン追加",
    progress:"進捗", completed:"完了", reset:"リセット",
    export_btn:"↓ エクスポート", import_btn:"↑ インポート",
    settings:"設定", lang_label:"言語", theme_label:"テーマ",
    username_label:"お名前", username_placeholder:"例：田中",
    target_date:"目標日", save_settings:"設定を保存",
    streak_threshold:"継続判定ライン (%)",
    streak_threshold_sub:"この割合以上タスクを完了した日を継続日数としてカウント",
    focus_lbl:"集中", break_lbl:"休憩", cycles:"サイクル", start:"スタート", pause:"一時停止", stop:"停止",
    long_break:"大休憩", rest_credit:"休憩クレジット", max_work:"上限", sessions:"セッション", idle_lbl:"待機",
    work_rest_ratio:"作業:休憩 比率", long_break_min:"大休憩 (分)", worked_for:"作業時間",
    ceiling_note:(raw: string, ceil: string)=>`${raw}分 → ${ceil}分に切り上げ`,
    delete_btn:"削除", cancel_btn:"キャンセル", save_btn:"保存",
    modal_add_task:"タスク追加", modal_edit_task:"タスク編集",
    modal_add_sched:"ルーティン追加", modal_edit_sched:"ルーティン編集",
    modal_add_link:"リンク追加", modal_edit_link:"リンク編集",
    modal_add_goal:"目標追加", modal_edit_goal:"目標編集",
    modal_add_event:"イベント追加", modal_edit_event:"イベント編集",
    timer_name:"タイマー名", timer_name_ph:"例：深い学習",
    countdown_name:"カウントダウン名", countdown_name_ph:"例：試験当日",
    countdown_date:"目標日", countdown_active:"ダッシュボードに表示",
    task_name:"タスク名", task_ph:"例：論文を1本読む",
    category:"カテゴリ", cat_ph:"例：学習",
    time_lbl:"時刻", sched_ph:"例：朝のストレッチ",
    icon_lbl:"アイコン", site_name:"サイト名", site_ph:"例：Coursera",
    url_lbl:"URL", accent_color:"アクセントカラー",
    goal_lbl:"目標", goal_ph:"例：ピーク体力を達成",
    timeline:"期限", timeline_ph:"例：6ヶ月", prog_lbl:"進捗",
    event_title_lbl:"タイトル", event_date_lbl:"日付", event_time_lbl:"時間（任意）",
    event_color_lbl:"色", event_desc_lbl:"メモ",
    days_lbl:"表示曜日", freq_lbl:"頻度",
    freq_daily:"毎日", freq_every2:"2日に1回", freq_every3:"3日に1回",
    freq_weekly:"週1回", freq_custom:"曜日を選択",
    days_short:["日","月","火","水","木","金","土"],
    inactive_today:"本日は対象外",
    by_category:"カテゴリ別",
    img_upload:"画像をアップロード", img_or:"または絵文字を選択",
    mob_routine:"ルーティン", mob_tasks:"タスク", mob_links:"リンク", mob_events:"イベント", mob_partner:"相棒",
    footer:"Apex Hub v7.0 · ハイパフォーマーのために · 2026",
    days_left:"日後", days_past:"日経過", today_word:"今日",
    countdown_title:"カウントダウン",
    no_countdown:"カウントダウンがありません — 下から追加してください",
    play_sequence:"順番に実行", steps_label:"ステップ", shared_badge:"共有中",
    add_step:"＋ ステップ追加", step_title_ph:"例：腕立て1セット", share_routine:"パートナーと共有",
    step_of:(c: number, total: number)=>`ステップ ${c} / ${total}`, complete_step:"完了", exit_player:"集中モードを終了",
    all_done:"全ステップ完了！", partner_title:"パートナー同期", partner_sub:"パートナーと進捗をリアルタイム共有",
    invite_code:"招待コード", generate_code:"招待コードを発行", enter_code:"6桁コードを入力",
    join_partner:"参加する", routine_progress:"ルーティン", goal_progress:"目標",
    activity_feed:"相棒フィード", no_partner:"ログインしてパートナーと同期",
    no_activity:"まだアクティビティがありません", copied:"コピーしました", partner_label:"相棒",
  },
};
const QUOTES_EN=["The disciplined mind finds freedom.","What you do daily determines who you become.","Excellence is not a destination — it's a standard.","Discomfort is the price of growth.","Win the morning. Win the day."];
const QUOTES_JA=["規律ある心が、真の自由を生む。","日々の積み重ねが、あなたを形作る。","卓越とは目的地ではなく、基準だ。","不快感は成長の代償である。","朝を制する者が、一日を制する。"];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEFAULTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DEF_TASKS=[
  {id:"t1",text:"Today's Priority #1",done:false,category:"Focus"},
  {id:"t2",text:"Skill Learning (1h)",done:false,category:"Growth"},
  {id:"t3",text:"Logical Exercise",done:false,category:"Growth"},
  {id:"t4",text:"Journaling",done:false,category:"Reflection"},
];
const DEF_SCHEDULE=[
  {id:"s1",time:"06:00",task:"Hydration + Morning Intention",icon:"💧",iconImg:null,done:false,freq:"daily",days:[0,1,2,3,4,5,6]},
  {id:"s2",time:"06:30",task:"Decide Today's Top 3 Priorities",icon:"🎯",iconImg:null,done:false,freq:"daily",days:[0,1,2,3,4,5,6]},
  {id:"s3",time:"07:00",task:"Deep Work Block #1",icon:"🔥",iconImg:null,done:false,freq:"custom",days:[1,2,3,4,5]},
  {id:"s4",time:"09:00",task:"Skill Learning (1h)",icon:"📚",iconImg:null,done:false,freq:"daily",days:[0,1,2,3,4,5,6]},
  {id:"s5",time:"12:00",task:"Lunch + Recovery",icon:"🍃",iconImg:null,done:false,freq:"daily",days:[0,1,2,3,4,5,6]},
  {id:"s6",time:"13:00",task:"Deep Work Block #2",icon:"💎",iconImg:null,done:false,freq:"custom",days:[1,2,3,4,5]},
  {id:"s7",time:"18:00",task:"Physical Activity",icon:"🏃",iconImg:null,done:false,freq:"daily",days:[0,1,2,3,4,5,6],
    isShared:true,steps:[
      {id:"s7a",title:"Push-ups 1 set",order:0,isCompleted:false},
      {id:"s7b",title:"Pull-ups 1 set",order:1,isCompleted:false},
      {id:"s7c",title:"Stretch 5 min",order:2,isCompleted:false},
    ]},
  {id:"s8",time:"20:00",task:"Journaling",icon:"✍️",iconImg:null,done:false,freq:"daily",days:[0,1,2,3,4,5,6]},
  {id:"s9",time:"21:30",task:"Digital Detox — Screens Off",icon:"🌙",iconImg:null,done:false,freq:"daily",days:[0,1,2,3,4,5,6]},
];
const DEF_LINKS=[
  {
    id: "lab-math",
    name: "Math Lab",
    url: "https://math-lab-ruby.vercel.app", // ★ここに数学のURL
    icon: "📐",
    color: "#C9A84C",
    cat: "Science"
  },
  {
    id: "lab-english",
    name: "English Lab",
    url: "https://english-k8iakfzc6-closecanoe-1771s-projects.vercel.app", // ★ここに英語のURL
    icon: "🇬🇧",
    color: "#4A9EFF",
    cat: "Language"
  },
  {
    id: "lab-japanese",
    name: "Japanese Lab",
    url: "https://japanese-lab-omega.vercel.app", // ★ここに国語のURL
    icon: "🇯🇵",
    color: "#FF6B4A",
    cat: "Language"
  },
  {id:"l1",name:"Brilliant",url:"https://brilliant.org",icon:"💡",iconImg:null,color:"#F0D878",cat:"Learn"},
  {id:"l2",name:"Arxiv AI",url:"https://arxiv.org/list/cs.AI/recent",icon:"📄",iconImg:null,color:"#FF6B4A",cat:"Research"},
  {id:"l3",name:"GitHub",url:"https://github.com",icon:"🐙",iconImg:null,color:"#8B8BFF",cat:"Build"},
  {id:"l4",name:"Google Scholar",url:"https://scholar.google.com",icon:"🔬",iconImg:null,color:"#4AFF9E",cat:"Research"},
  {id:"l5",name:"Notion",url:"https://notion.so",icon:"📒",iconImg:null,color:"#CCC",cat:"Manage"},
  {id:"l6",name:"Coursera",url:"https://www.coursera.org",icon:"🎓",iconImg:null,color:"#4A9EFF",cat:"Learn"},
];
const DEF_GOALS=[
  {id:"g1",goal:"Master a new skill domain",deadline:"3 months",icon:"🏆",iconImg:null,progress:30},
  {id:"g2",goal:"Build a meaningful project",deadline:"6 months",icon:"🚀",iconImg:null,progress:15},
  {id:"g3",goal:"Reach physical peak",deadline:"12 months",icon:"⚡",iconImg:null,progress:50},
  {id:"g4",goal:"Revenue target",deadline:"Q4",icon:"💰",iconImg:null,progress:35,targetAmount:100000,currentAmount:35000,currency:"JPY"},
];
const LINK_COLORS=["#F0D878","#C9A84C","#4A9EFF","#FF6B4A","#8B8BFF","#4AFF9E","#FF9E4A","#FF4A9E","#4AFFEE","#CCC"];
const EVENT_COLORS=["#C9A84C","#4A9EFF","#FF6B4A","#4AFF9E","#8B8BFF","#FF9E4A","#FF4A9E","#4AFFEE","#FF7777","#AAA"];
const SCHED_ICONS=["🌅","💧","🎯","🔥","📚","🧠","🍃","💎","📊","🏃","✍️","🌙","📌","☕","🎵","💡","🧘","⚡","🏋️","📖"];
const LINK_ICONS=["🔗","⚡","📄","💡","🎓","🐙","🔬","📒","📚","🎯","💻","🌐","🚀","📊","🧠","🤖","⭐","🏆","🦊","🎨"];
const GOAL_ICONS=["🎓","🚀","🌐","💻","🏆","⭐","💡","🎯","📊","🧠","🏋️","✈️","💰","🔥","⚡"];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STORAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type LSApi = {
  get: <T,>(k: string, fb: T) => T;
  set: (k: string, v: unknown) => void;
};
const LS: LSApi = {
  get: <T,>(k: string, fb: T) => {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : fb;
    } catch {
      return fb;
    }
  },
  set: (k: string, v: unknown) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      // Ignore write errors (e.g. blocked storage / quota).
    }
  },
};
let _n = Date.now();
const nid = () => String(++_n);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCHEDULING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type SchedItem = { id?: string; freq?: string; days?: number[] };

function daysSinceEpoch(date?: Date): number {
  const d = date ?? new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

function isRotationActive(
  routine: SchedItem,
  allRoutines: SchedItem[],
  date?: Date,
): boolean {
  if (routine.freq !== "rotation") return true;
  const group = allRoutines
    .filter((r) => r.freq === "rotation")
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if (group.length === 0) return true;
  const dayIndex = daysSinceEpoch(date);
  return group[dayIndex % group.length].id === routine.id;
}

function isActiveToday(item: SchedItem, dow: number) {
  if (!item.freq || item.freq === "daily") return true;
  if (item.freq === "rotation") return true;
  if (item.freq === "every2") return Math.floor(Date.now()/86400000) % 2 === 0;
  if (item.freq === "every3") return Math.floor(Date.now()/86400000) % 3 === 0;
  if (item.freq === "weekly") return dow === (item.days?.[0] ?? 1);
  if (item.freq === "custom") return (item.days||[]).includes(dow);
  return true;
}

function isRoutineVisibleOnDate(
  routine: SchedItem,
  allRoutines: SchedItem[],
  date: Date,
): boolean {
  if (!isActiveToday(routine, date.getDay())) return false;
  return isRotationActive(routine, allRoutines, date);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ISOLATED MODAL BACKDROP
// Never use shared keydown listeners — each modal owns its own.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
type ModalBackdropProps = {
  onClose: () => void;
  children: any;
  TH: any;
  maxWidth?: number;
};
function ModalBackdrop({ onClose, children, TH, maxWidth = 480 }: ModalBackdropProps) {
  // Register Escape in capture phase so it fires before anything else
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", fn, true);
    return () => document.removeEventListener("keydown", fn, true);
  }, [onClose]);

  const CORS = [
    {top:0,left:0,borderWidth:"1px 0 0 1px"},{top:0,right:0,borderWidth:"1px 1px 0 0"},
    {bottom:0,left:0,borderWidth:"0 0 1px 1px"},{bottom:0,right:0,borderWidth:"0 1px 1px 0"},
  ];
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.84)",
      backdropFilter:"blur(6px)",zIndex:2000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16,
    }}>
      {/* Inner panel — swallow all clicks AND all keyboard events */}
      <div
        onClick={e=>e.stopPropagation()}
        onKeyDown={e=>e.stopPropagation()}
        onKeyUp={e=>e.stopPropagation()}
        style={{
          background:TH.surface, border:`1px solid ${TH.goldDark}`,
          borderRadius:4, padding:26, width:"100%", maxWidth,
          position:"relative", maxHeight:"90vh", overflowY:"auto",
          boxShadow:`0 0 60px ${TH.gold}18, inset 0 1px 0 ${TH.gold}18`,
        }}
      >
        {CORS.map((s,i)=>(
          <div key={i} style={{position:"absolute",width:15,height:15,
            borderColor:TH.goldDark,borderStyle:"solid",...s}}/>
        ))}
        <div style={{position:"absolute",top:0,left:"10%",right:"10%",height:1,
          background:`linear-gradient(90deg,transparent,${TH.gold},transparent)`}}/>
        {children}
      </div>
    </div>
  );
}

// Shared modal header
function ModalHeader({ title, onClose, TH }: any) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
      <h3 style={{fontSize:13,letterSpacing:4,color:TH.gold,textTransform:"uppercase",fontWeight:400}}>{title}</h3>
      <button onClick={onClose} style={{background:"none",border:`1px solid ${TH.border}`,
        color:TH.textMuted,cursor:"pointer",fontSize:16,width:28,height:28,
        display:"flex",alignItems:"center",justifyContent:"center",borderRadius:2}}>×</button>
    </div>
  );
}

// Input / label helpers
const mkIS = (TH: any) => ({
  width:"100%",background:TH.inputBg,border:`1px solid ${TH.border}`,color:TH.text,
  fontFamily:"'Cormorant Garamond','Noto Serif JP',serif",fontSize:15,
  padding:"10px 13px",borderRadius:2,outline:"none",
});
const mkLS = (TH: any) => ({
  fontSize:11,letterSpacing:3,color:TH.textMuted,textTransform:"uppercase",display:"block",marginBottom:6,
});

function GBtn({ children, onClick, variant="primary", TH }: any) {
  const V = {
    primary:{bg:`${TH.gold}1a`,bd:TH.goldDark,cl:TH.gold},
    danger: {bg:"#FF333318",bd:"#FF333355",cl:"#FF7777"},
    ghost:  {bg:"transparent",bd:TH.border,cl:TH.textDim},
  }[variant];
  return (
    <button onClick={onClick} style={{fontFamily:"inherit",fontSize:12,letterSpacing:3,cursor:"pointer",
      padding:"10px 20px",borderRadius:2,textTransform:"uppercase",
      background:V.bg,border:`1px solid ${V.bd}`,color:V.cl,transition:"all .2s"}}>
      {children}
    </button>
  );
}

function Field({ label, children }: any) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{fontSize:11,letterSpacing:3,color:"#888",textTransform:"uppercase",display:"block",marginBottom:6}}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ICON DISPLAY + PICKER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function IconDisplay({ emoji, img, size=20 }) {
  if (img) return <img src={img} alt="" style={{width:size,height:size,borderRadius:4,objectFit:"cover",flexShrink:0}}/>;
  return <span style={{fontSize:size*0.9,lineHeight:1,flexShrink:0}}>{emoji}</span>;
}
function useImgUpload(cb) {
  return () => {
    const i = document.createElement("input"); i.type="file"; i.accept="image/*";
    i.onchange = e => {
      const f = e.target.files[0]; if(!f) return;
      const r = new FileReader(); r.onload = ev => cb(ev.target.result); r.readAsDataURL(f);
    }; i.click();
  };
}
function IconPicker({ icon, iconImg, onIcon, onImg, presetIcons, TH }) {
  const upload = useImgUpload(onImg);
  return (
    <div>
      {iconImg && (
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <img src={iconImg} alt="" style={{width:40,height:40,borderRadius:6,objectFit:"cover"}}/>
          <button onClick={()=>onImg(null)} style={{background:"transparent",border:`1px solid ${TH.border}`,
            color:TH.textDim,cursor:"pointer",fontSize:10,padding:"4px 10px",borderRadius:2}}>✕</button>
        </div>
      )}
      <button onClick={upload} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,
        width:"100%",marginBottom:10,background:`${TH.gold}11`,border:`1px solid ${TH.goldDark}`,
        color:TH.gold,cursor:"pointer",fontFamily:"inherit",fontSize:11,letterSpacing:3,
        padding:"9px",borderRadius:2,textTransform:"uppercase"}}>
        📷 Upload Image
      </button>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
        {presetIcons.map(ic=>(
          <button key={ic} onClick={()=>{onIcon(ic);onImg(null);}} style={{
            fontSize:17,background:!iconImg&&icon===ic?`${TH.gold}22`:"transparent",
            border:`1px solid ${!iconImg&&icon===ic?TH.gold:TH.border}`,
            borderRadius:4,cursor:"pointer",width:34,height:34,lineHeight:1}}>
            {ic}
          </button>
        ))}
      </div>
      <input value={icon} onChange={e=>{onIcon(e.target.value);onImg(null);}}
        placeholder="or type emoji"
        style={{width:"100%",background:TH.inputBg,border:`1px solid ${TH.border}`,color:TH.text,
          fontFamily:"inherit",fontSize:20,padding:"7px",borderRadius:2,outline:"none",textAlign:"center"}}/>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LUXURY TIMER SOUND — Tibetan singing bowl via Web Audio API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _sharedCtx = null;

function getCtx() {
  try {
    if (!_sharedCtx || _sharedCtx.state === "closed") {
      _sharedCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return _sharedCtx;
  } catch(e) { return null; }
}

// Must be called from a click handler (user gesture) to unlock audio
function unlockAudio() {
  const ctx = getCtx();
  if (!ctx) return;
  // Play a zero-length silent buffer — the standard browser unlock trick
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  // resume() returns a Promise; we don't await but kick it off
  if (ctx.state === "suspended") ctx.resume();
}

function _doPlayBowl(ctx, phase) {
  const now = ctx.currentTime;
  const partials = phase === "break"
    ? [
        { freq: 528,  gain: 0.35, decay: 2.8 },
        { freq: 1056, gain: 0.16, decay: 2.0 },
        { freq: 1584, gain: 0.06, decay: 1.2 },
      ]
    : [
        { freq: 220,  gain: 0.36, decay: 4.0 },
        { freq: 440,  gain: 0.18, decay: 2.8 },
        { freq: 660,  gain: 0.07, decay: 1.6 },
      ];

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.7, now);
  master.connect(ctx.destination);

  partials.forEach(({ freq, gain, decay }) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * 0.9996, now + decay);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + 0.008);
    env.gain.setTargetAtTime(0, now + 0.04, decay * 0.32);
    osc.connect(env);
    env.connect(master);
    osc.start(now);
    osc.stop(now + decay + 0.5);
  });
}

function playBowlSound(phase) {
  const ctx = getCtx();
  if (!ctx) return;
  // If context is running, play immediately
  if (ctx.state === "running") {
    _doPlayBowl(ctx, phase);
  } else {
    // Context suspended — resume then play
    ctx.resume().then(() => _doPlayBowl(ctx, phase)).catch(() => {});
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BROWSER NOTIFICATION — called on timer phase switch
// Works in local environments where Notification permission is granted.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function sendTimerNotification(phase) {
  try {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    const isBreak = phase === "break";
    new Notification(isBreak ? "🍃 Break Time" : "🔥 Focus Time", {
      body: isBreak
        ? "Great work! Take a 5-minute break."
        : "Break is over. Time to focus!",
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>" + (isBreak ? "🍃" : "🔥") + "</text></svg>",
      silent: true, // We handle sound ourselves
    });
  } catch(e) {}
}
// Liquid Pomodoro timers: components/LiquidTimerCard.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COUNTDOWN WIDGET
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  target.setHours(0,0,0,0);
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((target - now) / 86400000);
}

function CountdownBig({ cd, TH, t }) {
  if (!cd) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      padding:"20px",opacity:.5,fontSize:12,color:TH.textMuted,letterSpacing:2}}>
      {t.no_countdown}
    </div>
  );
  const d = daysUntil(cd.date);
  const isToday = d === 0, isPast = d < 0;
  const color = isPast?"#FF7777":isToday?TH.goldLight:TH.gold;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"16px 8px"}}>
      <span style={{fontSize:10,letterSpacing:4,color:TH.textMuted,textTransform:"uppercase"}}>{cd.name}</span>
      <div style={{
        fontFamily:"'Share Tech Mono',monospace",
        fontSize:isToday?36:48, fontWeight:700,
        color,lineHeight:1,
        textShadow:`0 0 30px ${color}66`,
      }}>
        {isToday ? t.today_word : Math.abs(d)}
      </div>
      {!isToday && (
        <span style={{fontSize:10,letterSpacing:3,color:TH.textMuted,textTransform:"uppercase"}}>
          {isPast ? t.days_past : t.days_left}
        </span>
      )}
      {/* mini arc progress for upcoming */}
      {!isPast && !isToday && cd.totalDays && (
        <div style={{width:"100%",height:3,background:TH.border,borderRadius:2,marginTop:4}}>
          <div style={{height:"100%",borderRadius:2,background:`linear-gradient(90deg,${TH.goldDark},${TH.gold})`,
            width:`${Math.max(0,Math.min(100,((cd.totalDays-d)/cd.totalDays)*100))}%`,
            transition:"width .8s"}}/>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHARTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function DonutChart({ done, total, size=130, TH }) {
  const pct=total?done/total:0, r=46, circ=2*Math.PI*r, cx=size/2, cy=size/2;
  const dash=circ*pct, ang=pct*360-90, rad=ang*Math.PI/180;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs><linearGradient id="dc7" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={TH.goldDark}/><stop offset="100%" stopColor={TH.goldLight}/>
      </linearGradient></defs>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={TH.border} strokeWidth="11"/>
      {pct>0&&<circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#dc7)" strokeWidth="11"
        strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={circ*0.25} strokeLinecap="round"
        style={{transition:"stroke-dasharray .9s"}}/>}
      {pct>0.02&&<circle cx={cx+r*Math.cos(rad)} cy={cy+r*Math.sin(rad)} r="5" fill={TH.goldLight}/>}
      <text x={cx} y={cy-6} textAnchor="middle" fill={TH.goldLight} fontSize="22" fontWeight="600"
        fontFamily="'Share Tech Mono',monospace">{Math.round(pct*100)}%</text>
      <text x={cx} y={cy+13} textAnchor="middle" fill={TH.textMuted} fontSize="9" letterSpacing="2">{done}/{total}</text>
    </svg>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENT CALENDAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// --- ここから EventCalendar 関数の定義 ---
// @ts-nocheck

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. EVENT CALENDAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. SUB-COMPONENTS (Dashboardの外に配置：ホイスティング対策)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Panel({children, TH, style={}}: any){
  return(
    <div style={{background:TH.surface, border:`1px solid ${TH.borderGold}`, borderRadius:3, overflow:"hidden", position:"relative", boxShadow:`0 2px 18px ${TH.gold}06`, ...style}}>
      <div style={{position:"absolute", top:0, left:0, right:0, height:1, background:`linear-gradient(90deg,transparent,${TH.gold}44,transparent)`, zIndex:1}}/>
      {children}
    </div>
  );
}

function PanelHeader({title, sub, right, TH}: any){
  return(
    <div style={{padding:"12px 15px 10px", borderBottom:`1px solid ${TH.border}`, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
      <div><h2 style={{fontSize:12, letterSpacing:4, color:TH.gold, textTransform:"uppercase", fontWeight:400}}>{title}</h2>
      {sub && <p style={{fontSize:10, color:TH.textMuted, marginTop:2, letterSpacing:1}}>{sub}</p>}</div>
      {right}
    </div>
  );
}

function AddRow({onClick, label, TH}: any){
  return(
    <button onClick={onClick} style={{display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", padding:"10px", background:"transparent", border:`1px dashed ${TH.border}`, color:TH.textMuted, cursor:"pointer", fontSize:11, letterSpacing:4, textTransform:"uppercase", fontFamily:"inherit"}}>{label}</button>
  );
}

function TasksPanel({ tasks, activeTab, setTab, t, TH, toggleTask, setModal, setTasks, lang }: any) {
  return (
    <Panel TH={TH}>
      <div style={{ display: "flex", borderBottom: `1px solid ${TH.border}` }}>
        {["today", "goals", "chart"].map((name) => (
          <button key={name} className={`tab-btn${activeTab === name ? " active" : ""}`} onClick={() => setTab(name)}>{t[name as keyof typeof t]}</button>
        ))}
      </div>
      {activeTab === "today" && (
        <div style={{ padding: "10px 0" }}>
          {Array.from(new Set(tasks.map((tk: any) => tk.category || "Focus"))).map((catName: any) => {
            const sortedInCat = [...tasks.filter((tk: any) => (tk.category || "Focus") === catName)].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
            return (
              <div key={catName} style={{ marginBottom: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 15px', borderBottom: `1px solid ${TH.border}`, background: `${TH.gold}08` }}>
                  <span style={{ fontSize: 10, color: TH.gold, letterSpacing: 2, fontWeight: 600 }}>{catName}</span>
                  <button onClick={() => setTasks((prev: any) => prev.filter((tk: any) => (tk.category || "Focus") !== catName))} style={{ fontSize: 9, color: '#FF7777', background: 'none', border: 'none' }}>CLEAR</button>
                </div>
                {sortedInCat.map(taskItem => (
                  <div key={taskItem.id} className="row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div onClick={(e) => { e.stopPropagation(); toggleTask(taskItem.id); }} style={{ width: 22, height: 22, border: `1px solid ${taskItem.done ? TH.gold : TH.border}`, background: taskItem.done ? `${TH.gold}1a` : "transparent", display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{taskItem.done && "✓"}</div>
                      <span style={{ flex: 1, fontSize: 13, textDecoration: taskItem.done ? "line-through" : "none", opacity: taskItem.done ? 0.6 : 1 }} onClick={() => setModal({ type: "task", item: taskItem })}>{taskItem.text}</span>
                      <button className="edit-btn" onClick={() => setModal({ type: "task", item: taskItem })}>✏️</button>
                    </div>
                    {taskItem.memo && (
                      <div style={{ paddingLeft: 34, marginTop: 4 }}>
                        <button onClick={() => setModal({ type: "task", item: taskItem })} style={{ background: `${TH.gold}11`, border: `1px solid ${TH.goldDark}44`, color: TH.goldDark, fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>📄 メモを表示</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          <AddRow onClick={() => setModal({ type: "task", item: null })} label={t.add_task} TH={TH} />
        </div>
      )}
    </Panel>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. MAIN DASHBOARD
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState("idle");
  const user: User | null = session?.user ?? null;
  const isOnline = !!user && isSupabaseConfigured();

  // 時間・曜日の定義（最上部へ）
  const [time, setTime] = useState(new Date());
  const timeStr = time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString("ja-JP", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const todayDow = time.getDay();
  const currentDayStr = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, "0")}-${String(time.getDate()).padStart(2, "0")}`;

  const [lang, setLangRaw] = useState(() => LS.get("apx7_lang", "ja"));
  const [themeName, setThemeRaw] = useState(() => LS.get("apx7_theme", "dark"));
  const [userName, setUserName] = useState(() => LS.get("apx7_uname", ""));
  const [streakPct, setStreakPct] = useState(() => LS.get("apx7_spct", 80));
  const [activeMode, setActiveMode] = useState<string>(() => LS.get("apx7_mode", "weekday"));

  const [tasks, setTasks] = useState<any[]>(() => LS.get("apx7_tasks", DEF_TASKS));
  const [sched, setSched] = useState<any[]>(() => LS.get("apx7_sched", DEF_SCHEDULE));
  const [links, setLinks] = useState(() => LS.get("apx7_links", DEF_LINKS));
  const [goals, setGoals] = useState(() => LS.get("apx7_goals", DEF_GOALS));
  const [events, setEvents] = useState(() => LS.get("apx7_events", []));
  const [timers, setTimers] = useState(() => LS.get("apx7_timers", [{ id: "default", name: "Deep Work", maxWorkMin: 50, workRestRatio: 5, longBreakMin: 15 }]));
  const [cds, setCDs] = useState(() => LS.get("apx7_cds", []));
  const [activeCd, setActiveCd] = useState(() => LS.get("apx7_acd", null));
  const [calColors, setCalColors] = useState(() => LS.get("apx7_calcol", {}));

  const [activeTab, setTab] = useState("today");
  const [mobSec, setMob] = useState("schedule");
  const [isMobile, setMobile] = useState(false);
  const [focusMode, setFocus] = useState(false);
  const [settingsOpen, setSettings] = useState(false);
  const [modal, setModal] = useState<any>(null);
  const [calYear, setCalYear] = useState(() => time.getFullYear());
  const [calMonth, setCalMonth] = useState(() => time.getMonth());

  const setLang = (v: any) => { const n = typeof v === "function" ? v(lang) : v; setLangRaw(n); LS.set("apx7_lang", n); };
  const setTheme = (v: any) => { const n = typeof v === "function" ? v(themeName) : v; setThemeRaw(n); LS.set("apx7_theme", n); };
  const TH = THEMES[themeName as keyof typeof THEMES] || THEMES.dark;
  const t = DICT[lang as keyof typeof DICT];

  const cloudSave = useCallback(async (key: string, value: any) => {
    if (isOnline && user) await upsertData(user.id, key, value);
  }, [isOnline, user]);

  useEffect(() => {
    onAuthStateChange((sess) => setSession(sess));
    const fn = () => setMobile(window.innerWidth < 768);
    fn(); window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  useEffect(() => {
    const ti = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(ti);
  }, []);

  useEffect(() => {
    if (!isOnline || !user) return;
    (async () => {
      const data = await fetchAllData(user.id);
      if (data.tasks) setTasks(data.tasks);
      if (data.sched) setSched(data.sched);
      if (data.links) setLinks(data.links);
      if (data.goals) setGoals(data.goals);
    })();
  }, [isOnline, user?.id]);

  useEffect(() => { if(!isOnline) LS.set("apx7_tasks", tasks); cloudSave("tasks", tasks); }, [tasks, cloudSave, isOnline]);
  useEffect(() => { if(!isOnline) LS.set("apx7_sched", sched); cloudSave("sched", sched); }, [sched, cloudSave, isOnline]);
  useEffect(() => { LS.set("apx7_mode", activeMode); }, [activeMode]);

  const toggleTask = (id: string) => setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, done: !tk.done } : tk));
  const saveTask = (item: any, d: any) => { 
    if (!item) setTasks(prev => [...prev, { id: String(Date.now()), done: false, ...d }]);
    else setTasks(prev => prev.map(tk => tk.id === item.id ? { ...tk, ...d } : tk)); 
  };
  const toggleSched = (id: string) => setSched(prev => prev.map(rc => rc.id === id ? { ...rc, done: !rc.done } : rc));
  const setCellColor = (ds: string, c: string) => setCalColors(prev => ({ ...prev, [ds]: c }));

  const css = `.tab-btn{flex:1;padding:12px;background:none;border:none;color:#888;cursor:pointer;font-size:11px;letter-spacing:2px;border-bottom:2px solid transparent;}.tab-btn.active{color:${TH.gold};border-bottom-color:${TH.gold};}.row{display:flex;padding:12px 15px;border-bottom:1px solid ${TH.border};align-items:center;}.edit-btn{background:none;border:none;color:#555;cursor:pointer;}`;

  return (
    <div style={{ minHeight: "100vh", background: TH.bg, color: TH.text, position: "relative", fontFamily: "serif" }}>
      <style>{css}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 32, letterSpacing: 8, color: TH.gold }}>APEX HUB</h1>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              {["weekday", "holiday", "monk"].map((m) => (
                <button key={m} onClick={() => setActiveMode(m)} style={{ padding: '3px 10px', borderRadius: 4, fontSize: 9, cursor: 'pointer', background: activeMode === m ? TH.gold : 'transparent', color: activeMode === m ? TH.bg : TH.textDim, border: `1px solid ${TH.goldDark}`, textTransform: 'uppercase' }}>{m}</button>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontFamily: "monospace" }}>{timeStr}</div>
            <p style={{ fontSize: 10, color: TH.textMuted }}>{dateStr}</p>
            <button onClick={() => setSettings(true)} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textDim, padding: "5px 10px", marginTop: 10, cursor: "pointer" }}>SETTINGS</button>
          </div>
        </div>

        {/* MAIN AREA */}
        {!isMobile ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Panel TH={TH}>
                <PanelHeader title={t.routine_title} TH={TH} />
                {sched.filter(rc => isActiveToday(rc, todayDow) && (!rc.mode || rc.mode === "all" || rc.mode === activeMode)).map(rc => (
                  <RoutineRow key={rc.id} routine={rc} onToggleDone={() => toggleSched(rc.id)} onEdit={() => setModal({ type: "sched", item: rc })} TH={TH} t={t} />
                ))}
                <AddRow onClick={() => setModal({ type: "sched", item: null })} label={t.add_routine} TH={TH} />
              </Panel>
              <TasksPanel tasks={tasks} activeTab={activeTab} setTab={setTab} t={t} TH={TH} toggleTask={toggleTask} setModal={setModal} setTasks={setTasks} lang={lang} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Panel TH={TH}><PanelHeader title={t.events_title} TH={TH} /><div style={{ padding: 15 }}><EventCalendar events={events} TH={TH} t={t} calColors={calColors} onCellColor={setCellColor} vy={calYear} vm={calMonth} setVY={setCalYear} setVM={setCalMonth} tasks={tasks} sched={sched} onEditEvent={() => {}} onAddEvent={(d: string) => setModal({ type: "event", initDate: d })} /></div></Panel>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 80 }}>
            {mobSec === "schedule" && (
              <Panel TH={TH}>
                <PanelHeader title={t.routine_title} TH={TH} />
                {sched.filter(rc => isActiveToday(rc, todayDow) && (!rc.mode || rc.mode === "all" || rc.mode === activeMode)).map(rc => (
                  <RoutineRow key={rc.id} routine={rc} onToggleDone={() => toggleSched(rc.id)} onEdit={() => setModal({ type: "sched", item: rc })} TH={TH} t={t} />
                ))}
                <AddRow onClick={() => setModal({ type: "sched", item: null })} label={t.add_routine} TH={TH} />
              </Panel>
            )}
            {mobSec === "tasks" && <TasksPanel tasks={tasks} activeTab={activeTab} setTab={setTab} t={t} TH={TH} toggleTask={toggleTask} setModal={setModal} setTasks={setTasks} lang={lang} />}
            {/* 他のモバイルセクションも同様に配置 */}
          </div>
        )}
      </div>

      {/* MODALS */}
      {settingsOpen && <SettingsPanel open={settingsOpen} onClose={() => setSettings(false)} lang={lang} setLang={setLang} themeName={themeName} setTheme={setTheme} userName={userName} setUserName={setUserName} streakPct={streakPct} setStreakPct={setStreakPct} t={t} TH={TH} user={user} />}
      {modal?.type === "task" && <TaskModal task={modal.item} onSave={(d: any) => saveTask(modal.item, d)} onDelete={(id: string) => setTasks(prev => prev.filter(tk => tk.id !== id))} onClose={() => setModal(null)} t={t} TH={TH} />}
      {modal?.type === "sched" && <ScheduleModal item={modal.item} onSave={(d: any) => setSched(prev => modal.item ? prev.map(rc => rc.id === modal.item.id ? {...rc, ...d} : rc) : [...prev, {id: String(Date.now()), done: false, ...d}])} onDelete={(id: string) => setSched(prev => prev.filter(rc => rc.id !== id))} onClose={() => setModal(null)} t={t} TH={TH} />}

      {/* MOBILE NAV */}
      <nav className="mob-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: isMobile ? "flex" : "none", background: TH.bg2, borderTop: `1px solid ${TH.border}`, justifyContent: "space-around", padding: "10px 0", zIndex: 1000 }}>
        {["schedule", "tasks", "links"].map((key) => (
          <button key={key} onClick={() => setMob(key)} style={{ background: "none", border: "none", color: mobSec === key ? TH.gold : "#555", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", flex: 1 }}>
            <span style={{ fontSize: 18 }}>{key === "schedule" ? "🗓" : key === "tasks" ? "✅" : "🔗"}</span>
            <span style={{ fontSize: 9 }}>{key.toUpperCase()}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
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
  signInWithGoogle
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
    freq_weekly:"Weekly", freq_custom:"Custom days",
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
type SchedItem = { freq?: string; days?: number[] };
function isActiveToday(item: SchedItem, dow: number) {
  if (!item.freq || item.freq === "daily") return true;
  if (item.freq === "every2") return Math.floor(Date.now()/86400000) % 2 === 0;
  if (item.freq === "every3") return Math.floor(Date.now()/86400000) % 3 === 0;
  if (item.freq === "weekly") return dow === (item.days?.[0] ?? 1);
  if (item.freq === "custom") return (item.days||[]).includes(dow);
  return true;
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
function EventCalendar({ events, onEditEvent, onAddEvent, TH, t, calColors, onCellColor, vy, vm, setVY, setVM, tasks, sched }: any) {
  const today = new Date();
  const [pick, setPick] = useState(null);

  const dim = new Date(vy,vm+1,0).getDate();
  const fd  = new Date(vy,vm,1).getDay();
  const prev = () => { if(vm===0){setVY(y=>y-1);setVM(11);}else setVM(m=>m-1); };
  const next = () => { if(vm===11){setVY(y=>y+1);setVM(0);}else setVM(m=>m+1); };
  const ds = d => `${vy}-${String(vm+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  const isToday = d => vy===today.getFullYear()&&vm===today.getMonth()&&d===today.getDate();
  const evOn = d => events.filter(e=>e.date===ds(d));
  const MN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const MNja = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  const ml = t.days_short[0]==="Su"?`${MN[vm]} ${vy}`:`${vy}年${MNja[vm]}`;
  const CP = ["","#C9A84C22","#4A9EFF22","#FF6B4A22","#4AFF9E22","#8B8BFF22","#FF9E4A22","#FF4A9E22","#FF777722"];

  const cells=[]; for(let i=0;i<fd;i++)cells.push(null); for(let d=1;d<=dim;d++)cells.push(d);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <button onClick={prev} style={{background:"none",border:`1px solid ${TH.border}`,color:TH.textDim,
          cursor:"pointer",padding:"3px 10px",borderRadius:2,fontSize:14}}>‹</button>
        <span style={{fontSize:12,letterSpacing:3,color:TH.gold,textTransform:"uppercase"}}>{ml}</span>
        <button onClick={next} style={{background:"none",border:`1px solid ${TH.border}`,color:TH.textDim,
          cursor:"pointer",padding:"3px 10px",borderRadius:2,fontSize:14}}>›</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:3}}>
        {t.days_short.map(d=>(
          <div key={d} style={{textAlign:"center",fontSize:9,color:TH.textMuted,padding:"3px 0",letterSpacing:1}}>{d}</div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={`e${i}`}/>;
          const dstr=ds(d), evs=evOn(d), bg=calColors[dstr]||"transparent", tod=isToday(d), pk=pick===dstr;
          return (
            <div key={dstr} style={{
              position:"relative",minHeight:50,borderRadius:3,
              background:bg,border:`1px solid ${tod?TH.gold:TH.border}`,
              padding:"3px 4px",cursor:"pointer",
              boxShadow:tod?`0 0 7px ${TH.gold}44`:"none",
            }}
              onClick={()=>{ if(pk){setPick(null);}else onAddEvent(dstr); }}
              onContextMenu={e=>{e.preventDefault();setPick(pk?null:dstr);}}>
              <div style={{fontSize:10,fontWeight:tod?700:400,color:tod?TH.gold:TH.textDim,
                fontFamily:"'Share Tech Mono',monospace",lineHeight:1}}>{d}</div>
              {evs.map(ev=>(
                <div key={ev.id} onClick={e=>{e.stopPropagation();onEditEvent(ev);}}
                  style={{fontSize:9,marginTop:2,padding:"1px 3px",borderRadius:2,
                    background:ev.color||TH.gold+"33",color:TH.text,
                    whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer"}}>
                  {ev.title}
                </div>
              ))}
              {/* カレンダー同期表示 */}
<div style={{ pointerEvents: 'none' }}>
  {tasks.filter(tk => tk.deadline === dstr).map(tk => (
    <div key={tk.id} style={{ fontSize: 7, color: TH.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', opacity: 0.7 }}>□ {tk.text}</div>
  ))}
  {sched.filter(rc => isActiveToday(rc, new Date(vy, vm, d).getDay())).map(rc => (
    <div key={rc.id} style={{ fontSize: 7, color: TH.goldDark, whiteSpace: 'nowrap', overflow: 'hidden' }}>• {rc.task}</div>
  ))}
</div>
              {pk&&(
                <div onClick={e=>e.stopPropagation()}
                  style={{position:"absolute",top:"100%",left:0,zIndex:500,
                    background:TH.surface,border:`1px solid ${TH.gold}`,
                    borderRadius:4,padding:6,display:"flex",gap:4,flexWrap:"wrap",width:110,
                    boxShadow:"0 4px 20px #00000055"}}>
                  {CP.map(c=>(
                    <div key={c||"clr"} onClick={()=>{onCellColor(dstr,c);setPick(null);}}
                      style={{width:20,height:20,borderRadius:3,background:c||"transparent",
                        border:`1px solid ${c?c:"#555"}`,cursor:"pointer",
                        boxShadow:calColors[dstr]===c?`0 0 5px ${TH.gold}`:"none"}}/>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p style={{fontSize:9,color:TH.textMuted,marginTop:5,letterSpacing:1}}>
        {t.days_short[0]==="Su"?"Click=add · Right-click=color":"クリック=追加 · 右クリック=色"}
      </p>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRUD MODALS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{/* 新・タスク表示システム */}
{Array.from(new Set(tasks.map(t => t.category || "Focus"))).map(cat => {
  const catTasks = tasks.filter(tk => (tk.category || "Focus") === cat);
  const sorted = [...catTasks].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  return (
    <div key={cat} style={{ marginBottom: 15 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 15px', borderBottom: `1px solid ${TH.border}`, background: `${TH.gold}08` }}>
        <span style={{ fontSize: 10, color: TH.gold, letterSpacing: 2, fontWeight: 600 }}>{cat}</span>
        <button onClick={() => setTasks(ts => ts.filter(tk => (tk.category || "Focus") !== cat))} style={{ fontSize: 9, color: '#FF7777', background: 'none', border: 'none', cursor: 'pointer' }}>DELETE ALL</button>
      </div>
      {sorted.map(t2 => (
        <div key={t2.id} className="row" onClick={() => setModal({ type: "task", item: t2 })} style={{cursor: "pointer"}}>
          <div onClick={(e) => { e.stopPropagation(); toggleTask(t2.id); }} style={{ width: 22, height: 22, border: `1px solid ${t2.done ? TH.gold : TH.border}`, background: t2.done ? `${TH.gold}1a` : "transparent", display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            {t2.done && <span style={{ color: TH.gold }}>✓</span>}
          </div>
          <span style={{ flex: 1, fontSize: 13, color: t2.done ? TH.textMuted : TH.text, textDecoration: t2.done ? "line-through" : "none", opacity: t2.done ? 0.5 : 1 }}>{t2.text}</span>
        </div>
      ))}
    </div>
  );
})}

function ScheduleModal({item,onSave,onDelete,onClose,t,TH}){
  const[time,setTime]=useState(item?.time||"08:00");
  const[task,setTask]=useState(item?.task||"");
  const[icon,setIcon]=useState(item?.icon||"📌");
  const[iconImg,setIconImg]=useState(item?.iconImg||null);
  const[freq,setFreq]=useState(item?.freq||"daily");
  const[days,setDays]=useState(item?.days||[0,1,2,3,4,5,6]);
  const[steps,setSteps]=useState<RoutineStep[]>(item?.steps||[]);
  const[isShared,setIsShared]=useState(item?.isShared||false);
  const[stepDraft,setStepDraft]=useState("");
  const IS=mkIS(TH);
  const toggleDay=d=>setDays(ds=>ds.includes(d)?ds.filter(x=>x!==d):[...ds,d].sort());
  const getRotationItem = (routine: any) => {
    if (!routine.freq || routine.freq !== "rotation") return true;
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const rotationGroup = sched.filter(r => r.freq === "rotation");
    if (rotationGroup.length === 0) return true;
    return rotationGroup[daysSinceEpoch % rotationGroup.length].id === routine.id;
  };
  const activeSched = sched.filter(r => isActiveToday(r, todayDow) && getRotationItem(r));
  const addStep=()=>{
    const title=stepDraft.trim();
    if(!title)return;
    setSteps(ss=>[...ss,{id:crypto.randomUUID?.()||String(Date.now()),title,order:ss.length,isCompleted:false}]);
    setStepDraft("");
  };
  const removeStep=id=>setSteps(ss=>ss.filter(s=>s.id!==id).map((s,i)=>({...s,order:i})));
  return(
    <ModalBackdrop onClose={onClose} TH={TH} maxWidth={520}>
      <ModalHeader title={item?t.modal_edit_sched:t.modal_add_sched} onClose={onClose} TH={TH}/>
      <Field label={t.time_lbl}><input type="time" style={IS} value={time} onChange={e=>setTime(e.target.value)}/></Field>
      <Field label={t.task_name}><input style={IS} value={task} onChange={e=>setTask(e.target.value)} placeholder={t.sched_ph} autoFocus/></Field>
      <Field label={t.freq_lbl}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {freqOpts.map(o=>(
            <button key={o.v} onClick={()=>setFreq(o.v)} style={{
              fontSize:11,padding:"6px 12px",borderRadius:2,cursor:"pointer",
              background:freq===o.v?`${TH.gold}22`:"transparent",
              border:`1px solid ${freq===o.v?TH.gold:TH.border}`,
              color:freq===o.v?TH.gold:TH.textDim}}>
              {o.l}
            </button>
          ))}
        </div>
      </Field>
      {(freq==="custom"||freq==="weekly")&&(
        <Field label={t.days_lbl}>
          <div style={{display:"flex",gap:5}}>
            {t.days_short.map((d,i)=>(
              <button key={i} onClick={()=>toggleDay(i)} style={{
                width:32,height:32,borderRadius:"50%",cursor:"pointer",fontSize:11,
                background:days.includes(i)?`${TH.gold}22`:"transparent",
                border:`1px solid ${days.includes(i)?TH.gold:TH.border}`,
                color:days.includes(i)?TH.gold:TH.textDim}}>
                {d}
              </button>
            ))}
          </div>
        </Field>
      )}
      <Field label={t.icon_lbl}>
        <IconPicker icon={icon} iconImg={iconImg} onIcon={setIcon} onImg={setIconImg} presetIcons={SCHED_ICONS} TH={TH}/>
      </Field>
      <Field label={t.steps_label}>
        <div style={{display:"flex",gap:8,marginBottom:8}}>
          <input style={{...IS,flex:1}} value={stepDraft} onChange={e=>setStepDraft(e.target.value)}
            placeholder={t.step_title_ph} onKeyDown={e=>e.key==="Enter"&&addStep()}/>
          <button type="button" onClick={addStep} style={{
            minHeight:44,padding:"0 14px",background:`${TH.gold}18`,border:`1px solid ${TH.goldDark}`,
            color:TH.gold,cursor:"pointer",fontFamily:"inherit",fontSize:11,letterSpacing:2,borderRadius:2}}>
            {t.add_step}
          </button>
        </div>
        {steps.map((s,i)=>(
          <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <span style={{fontSize:12,color:TH.textMuted,width:20}}>{i+1}.</span>
            <span style={{flex:1,fontSize:14,color:TH.text}}>{s.title}</span>
            <button type="button" onClick={()=>removeStep(s.id)} style={{
              background:"transparent",border:`1px solid ${TH.border}`,color:TH.textMuted,
              cursor:"pointer",fontSize:11,minWidth:44,minHeight:44,borderRadius:2}}>✕</button>
          </div>
        ))}
      </Field>
      <label style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,cursor:"pointer",minHeight:44}}>
        <input type="checkbox" checked={isShared} onChange={e=>setIsShared(e.target.checked)}
          style={{width:18,height:18,accentColor:TH.gold}}/>
        <span style={{fontSize:13,color:TH.textDim,letterSpacing:1}}>{t.share_routine}</span>
      </label>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:4,flexWrap:"wrap"}}>
        {item&&<GBtn variant="danger" onClick={()=>{onDelete(item.id);onClose();}} TH={TH}>{t.delete_btn}</GBtn>}
        <GBtn variant="ghost" onClick={onClose} TH={TH}>{t.cancel_btn}</GBtn>
        <GBtn onClick={()=>{
          if(!task.trim()||!time)return;
          onSave({time,task:task.trim(),icon,iconImg,freq,days,steps,isShared});
          onClose();
        }} TH={TH}>
          {item?t.save_btn:t.modal_add_sched}
        </GBtn>
      </div>
    </ModalBackdrop>
  );
}

function LinkModal({link,onSave,onDelete,onClose,t,TH}){
  const[name,setName]=useState(link?.name||"");
  const[url,setUrl]=useState(link?.url||"https://");
  const[icon,setIcon]=useState(link?.icon||"🔗");
  const[iconImg,setIconImg]=useState(link?.iconImg||null);
  const[color,setColor]=useState(link?.color||TH.gold);
  const[cat,setCat]=useState(link?.cat||"Learn");
  const IS=mkIS(TH);
  return(
    <ModalBackdrop onClose={onClose} TH={TH}>
      <ModalHeader title={link?t.modal_edit_link:t.modal_add_link} onClose={onClose} TH={TH}/>
      <Field label={t.site_name}><input style={IS} value={name} onChange={e=>setName(e.target.value)} placeholder={t.site_ph} autoFocus/></Field>
      <Field label={t.url_lbl}><input style={IS} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://..."/></Field>
      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1,marginBottom:14}}>
          <label style={mkLS(TH)}>{t.category}</label>
          <input style={IS} value={cat} onChange={e=>setCat(e.target.value)} placeholder={t.cat_ph}/>
        </div>
        <div style={{flex:1,marginBottom:14}}>
          <label style={mkLS(TH)}>{t.accent_color}</label>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",paddingTop:2}}>
            {LINK_COLORS.map(c=><div key={c} onClick={()=>setColor(c)} style={{
              width:22,height:22,borderRadius:"50%",background:c,cursor:"pointer",
              border:`2px solid ${color===c?"#fff":"transparent"}`,boxShadow:color===c?`0 0 5px ${c}`:"none"}}/>)}
          </div>
        </div>
      </div>
      <Field label={t.icon_lbl}><IconPicker icon={icon} iconImg={iconImg} onIcon={setIcon} onImg={setIconImg} presetIcons={LINK_ICONS} TH={TH}/></Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:4,flexWrap:"wrap"}}>
        {link&&<GBtn variant="danger" onClick={()=>{onDelete(link.id);onClose();}} TH={TH}>{t.delete_btn}</GBtn>}
        <GBtn variant="ghost" onClick={onClose} TH={TH}>{t.cancel_btn}</GBtn>
        <GBtn onClick={()=>{if(!name.trim()||!url.trim())return;onSave({name:name.trim(),url:url.trim(),icon,iconImg,color,cat});onClose();}} TH={TH}>
          {link?t.save_btn:t.modal_add_link}
        </GBtn>
      </div>
    </ModalBackdrop>
  );
}

function GoalModal({goal,onSave,onDelete,onClose,t,TH}){
  const[text,setText]=useState(goal?.goal||"");
  const[deadline,setDeadline]=useState(goal?.deadline||"");
  const[icon,setIcon]=useState(goal?.icon||"🎯");
  const[iconImg,setIconImg]=useState(goal?.iconImg||null);
  const[prog,setProg]=useState(goal?.progress??0);
  const IS=mkIS(TH);
  return(
    <ModalBackdrop onClose={onClose} TH={TH}>
      <ModalHeader title={goal?t.modal_edit_goal:t.modal_add_goal} onClose={onClose} TH={TH}/>
      <Field label={t.goal_lbl}><input style={IS} value={text} onChange={e=>setText(e.target.value)} placeholder={t.goal_ph} autoFocus/></Field>
      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1,marginBottom:14}}>
          <label style={mkLS(TH)}>{t.timeline}</label>
          <input style={IS} value={deadline} onChange={e=>setDeadline(e.target.value)} placeholder={t.timeline_ph}/>
        </div>
        <div style={{flex:1,marginBottom:14}}>
          <label style={mkLS(TH)}>{t.prog_lbl} — {prog}%</label>
          <input type="range" min="0" max="100" value={prog} onChange={e=>setProg(Number(e.target.value))}
            style={{width:"100%",accentColor:TH.gold,marginTop:12}}/>
        </div>
      </div>
      <Field label={t.icon_lbl}><IconPicker icon={icon} iconImg={iconImg} onIcon={setIcon} onImg={setIconImg} presetIcons={GOAL_ICONS} TH={TH}/></Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:4,flexWrap:"wrap"}}>
        {goal&&<GBtn variant="danger" onClick={()=>{onDelete(goal.id);onClose();}} TH={TH}>{t.delete_btn}</GBtn>}
        <GBtn variant="ghost" onClick={onClose} TH={TH}>{t.cancel_btn}</GBtn>
        <GBtn onClick={()=>{if(!text.trim())return;onSave({goal:text.trim(),deadline,icon,iconImg,progress:prog});onClose();}} TH={TH}>
          {goal?t.save_btn:t.modal_add_goal}
        </GBtn>
      </div>
    </ModalBackdrop>
  );
}

function EventModal({ev,initDate,onSave,onDelete,onClose,t,TH}){
  const[title,setTitle]=useState(ev?.title||"");
  const[date,setDate]=useState(ev?.date||initDate||"");
  const[time,setTime]=useState(ev?.time||"");
  const[color,setColor]=useState(ev?.color||TH.gold+"44");
  const[desc,setDesc]=useState(ev?.desc||"");
  const IS=mkIS(TH);
  return(
    <ModalBackdrop onClose={onClose} TH={TH}>
      <ModalHeader title={ev?t.modal_edit_event:t.modal_add_event} onClose={onClose} TH={TH}/>
      <Field label={t.event_title_lbl}><input style={IS} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Study session" autoFocus/></Field>
      <div style={{display:"flex",gap:12}}>
        <div style={{flex:1,marginBottom:14}}>
          <label style={mkLS(TH)}>{t.event_date_lbl}</label>
          <input type="date" style={{...IS,colorScheme:"dark"}} value={date} onChange={e=>setDate(e.target.value)}/>
        </div>
        <div style={{flex:1,marginBottom:14}}>
          <label style={mkLS(TH)}>{t.event_time_lbl}</label>
          <input type="time" style={IS} value={time} onChange={e=>setTime(e.target.value)}/>
        </div>
      </div>
      <Field label={t.event_color_lbl}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {EVENT_COLORS.map(c=><div key={c} onClick={()=>setColor(c+"44")} style={{
            width:24,height:24,borderRadius:4,background:c,cursor:"pointer",
            border:`2px solid ${color===c+"44"?"#fff":"transparent"}`,boxShadow:color===c+"44"?`0 0 5px ${c}`:"none"}}/>)}
        </div>
      </Field>
      <Field label={t.event_desc_lbl}>
        <textarea style={{...IS,minHeight:56,resize:"vertical"}} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Optional note..."/>
      </Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:4,flexWrap:"wrap"}}>
        {ev&&<GBtn variant="danger" onClick={()=>{onDelete(ev.id);onClose();}} TH={TH}>{t.delete_btn}</GBtn>}
        <GBtn variant="ghost" onClick={onClose} TH={TH}>{t.cancel_btn}</GBtn>
        <GBtn onClick={()=>{if(!title.trim()||!date)return;onSave({title:title.trim(),date,time,color,desc});onClose();}} TH={TH}>
          {ev?t.save_btn:t.modal_add_event}
        </GBtn>
      </div>
    </ModalBackdrop>
  );
}

// Add/Edit Timer Modal — Liquid Pomodoro
function TimerModal({timer,onSave,onClose,t,TH}){
  const[name,setName]=useState(timer?.name||"");
  const[maxW,setMaxW]=useState(String(timer?.maxWorkMin ?? timer?.focusMin ?? DEFAULT_MAX_WORK_MIN));
  const[ratio,setRatio]=useState(String(timer?.workRestRatio ?? DEFAULT_WORK_REST_RATIO));
  const[longBr,setLongBr]=useState(String(timer?.longBreakMin ?? DEFAULT_LONG_BREAK_MIN));
  const IS=mkIS(TH);
  const save=()=>{
    const m=parseInt(maxW,10),r=parseInt(ratio,10),lb=parseInt(longBr,10);
    if(!name.trim()||isNaN(m)||m<5||m>180||isNaN(r)||r<1||r>20||isNaN(lb)||lb<1||lb>120)return;
    onSave({name:name.trim(),maxWorkMin:m,workRestRatio:r,longBreakMin:lb});
    onClose();
  };
  const raw = 3.4;
  const ceil = Math.ceil(raw);
  return(
    <ModalBackdrop onClose={onClose} TH={TH} maxWidth={520}>
      <ModalHeader title={timer?t.save_btn:t.add_timer} onClose={onClose} TH={TH}/>
      <Field label={t.timer_name}><input style={IS} value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>e.key==="Enter"&&save()} placeholder={t.timer_name_ph} autoFocus/></Field>
      <div style={{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{flex:"1 1 120px"}}>
          <label style={mkLS(TH)}>{t.max_work} (min)</label>
          <input type="number" min="5" max="180" style={IS} value={maxW} onChange={e=>setMaxW(e.target.value)}/>
        </div>
        <div style={{flex:"1 1 100px"}}>
          <label style={mkLS(TH)}>{t.work_rest_ratio}</label>
          <input type="number" min="1" max="20" style={IS} value={ratio} onChange={e=>setRatio(e.target.value)}
            title="e.g. 5 = 5 min work → 1 min rest"/>
        </div>
        <div style={{flex:"1 1 100px"}}>
          <label style={mkLS(TH)}>{t.long_break_min}</label>
          <input type="number" min="1" max="120" style={IS} value={longBr} onChange={e=>setLongBr(e.target.value)}/>
        </div>
      </div>
      <p style={{fontSize:11,color:TH.textMuted,marginBottom:14,lineHeight:1.6,letterSpacing:1}}>
        {ratio}:1 — {t.break_lbl} = {t.focus_lbl} ÷ {ratio || DEFAULT_WORK_REST_RATIO} ({t.ceiling_note(String(raw),String(ceil))})
      </p>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <GBtn variant="ghost" onClick={onClose} TH={TH}>{t.cancel_btn}</GBtn>
        <GBtn onClick={save} TH={TH}>{timer?t.save_btn:t.add_timer}</GBtn>
      </div>
    </ModalBackdrop>
  );
}

// Add/Edit Countdown Modal
function CountdownModal({cd,onSave,onDelete,onClose,t,TH,onSetActive}){
  const[name,setName]=useState(cd?.name||"");
  const[date,setDate]=useState(cd?.date||"");
  const IS=mkIS(TH);
  const save=()=>{
    if(!name.trim()||!date)return;
    const totalDays=Math.max(1,Math.ceil((new Date(date)-new Date())/86400000));
    onSave({name:name.trim(),date,totalDays});
    onClose();
  };
  return(
    <ModalBackdrop onClose={onClose} TH={TH}>
      <ModalHeader title={cd?"Edit Countdown":t.add_countdown} onClose={onClose} TH={TH}/>
      <Field label={t.countdown_name}>
        <input style={IS} value={name} onChange={e=>setName(e.target.value)} placeholder={t.countdown_name_ph} autoFocus/>
      </Field>
      <Field label={t.countdown_date}>
        <input type="date" style={{...IS,colorScheme:"dark"}} value={date} onChange={e=>setDate(e.target.value)}/>
      </Field>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:4,flexWrap:"wrap"}}>
        {cd&&<GBtn variant="danger" onClick={()=>{onDelete(cd.id);onClose();}} TH={TH}>{t.delete_btn}</GBtn>}
        {cd&&onSetActive&&<GBtn variant="ghost" onClick={()=>{onSetActive(cd.id);onClose();}} TH={TH}>{t.countdown_active}</GBtn>}
        <GBtn variant="ghost" onClick={onClose} TH={TH}>{t.cancel_btn}</GBtn>
        <GBtn onClick={save} TH={TH}>{cd?t.save_btn:t.add_countdown}</GBtn>
      </div>
    </ModalBackdrop>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETTINGS PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function SettingsPanel({open,onClose,lang,setLang,themeName,setTheme,userName,setUserName,streakPct,setStreakPct,t,TH,user}: any){
  const [name, setName] = useState(userName);
  const [sp, setSp] = useState(streakPct);

  useEffect(() => { setName(userName); }, [userName]);
  useEffect(() => { setSp(streakPct); }, [streakPct]);
  useEffect(() => {
    if (!open) return;
    const fn = (e: any) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn, true);
    return () => document.removeEventListener("keydown", fn, true);
  }, [open, onClose]);

  const save = () => {
    setUserName(name); 
    if (!user) {
      localStorage.setItem("apx7_uname", name);
      localStorage.setItem("apx7_spct", String(sp));
    }
    onClose();
  };

  return (
    <>
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)", zIndex: 1500 }} />}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(400px,95vw)",
        background: TH.surface, borderLeft: `1px solid ${TH.goldDark}55`,
        zIndex: 1600, transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform .38s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
        boxShadow: open ? `-16px 0 50px #00000066` : "none", overflowY: "auto",
      }}>
        <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${TH.gold},${TH.goldLight},${TH.gold},transparent)`, flexShrink: 0 }} />
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 16px", borderBottom: `1px solid ${TH.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>⚙️</span>
            <h2 style={{ fontSize: 12, letterSpacing: 4, color: TH.gold, textTransform: "uppercase", fontWeight: 400 }}>{t.settings}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${TH.border}`, color: TH.textMuted, cursor: "pointer", fontSize: 16, width: 28, height: 28, borderRadius: 2 }}>×</button>
        </div>
        
        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: 22, flex: 1 }}>
          
          {/* 1. Account (Google Login) */}
          <div>
            <label style={{ fontSize: 11, letterSpacing: 4, color: TH.textMuted, textTransform: "uppercase", display: "block", marginBottom: 14 }}>Account</label>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: `${TH.gold}0a`, border: `1px solid ${TH.goldDark}55`, borderRadius: 3 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: TH.text }}>{user.email}</p>
                  <p style={{ fontSize: 10, color: TH.textMuted, marginTop: 2 }}>☁️ Cloud sync active</p>
                </div>
                <button onClick={() => getSupabase().auth.signOut()} style={{ background: "transparent", border: `1px solid ${TH.border}`, color: TH.textMuted, cursor: "pointer", fontSize: 10, padding: "5px 12px", borderRadius: 2 }}>Sign Out</button>
              </div>
            ) : (
              <button onClick={signInWithGoogle} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, width: "100%", padding: "14px", borderRadius: 4, cursor: "pointer", background: "#ffffff", border: `1px solid ${TH.border}`, color: "#3c4043", fontFamily: "sans-serif", fontSize: 14, fontWeight: 500, boxShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
                <img src="https://www.google.com/favicon.ico" style={{ width: 16 }} alt="" />
                Continue with Google
              </button>
            )}
          </div>

          <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${TH.goldDark}44,transparent)` }} />

          {/* 2. Language */}
          <div>
            <label style={{ fontSize: 11, letterSpacing: 4, color: TH.textMuted, textTransform: "uppercase", display: "block", marginBottom: 14 }}>{t.lang_label}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 13 }}>EN</span>
              <div onClick={() => setLang((l: string) => l === "en" ? "ja" : "en")} style={{ width: 52, height: 26, borderRadius: 13, background: lang === "ja" ? TH.gold : "#2a2a2a", position: "relative", cursor: "pointer" }}>
                <div style={{ position: "absolute", top: 3, left: lang === "ja" ? 27 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "all 0.3s" }} />
              </div>
              <span style={{ fontSize: 13 }}>日本語</span>
            </div>
          </div>

          <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${TH.goldDark}44,transparent)` }} />

          {/* 3. Theme */}
          <div>
            <label style={{ fontSize: 11, letterSpacing: 4, color: TH.textMuted, textTransform: "uppercase", display: "block", marginBottom: 14 }}>{t.theme_label}</label>
            <div style={{ display: "flex", gap: 10 }}>
              {Object.keys(THEMES).map((k: string) => (
                <button key={k} onClick={() => setTheme(k)} style={{ flex: 1, padding: "12px 8px", borderRadius: 3, cursor: "pointer", background: (THEMES as any)[k].bg2, border: `2px solid ${themeName === k ? TH.gold : TH.border}`, transition: "all 0.2s" }}>
                  <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: (THEMES as any)[k].bg }} />
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: (THEMES as any)[k].gold }} />
                  </div>
                  <p style={{ fontSize: 8, letterSpacing: 1, color: themeName === k ? TH.gold : TH.textMuted, textTransform: "uppercase" }}>{(THEMES as any)[k].name}</p>
                </button>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${TH.goldDark}44,transparent)` }} />

          {/* 4. Name */}
          <div>
            <label style={{ fontSize: 11, letterSpacing: 4, color: TH.textMuted, textTransform: "uppercase", display: "block", marginBottom: 10 }}>{t.username_label}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", background: TH.inputBg, border: `1px solid ${TH.border}`, color: TH.text, padding: "10px", borderRadius: 2 }} placeholder={t.username_placeholder} />
          </div>

          <button onClick={save} style={{ marginTop: "auto", background: TH.goldDark, border: `1px solid ${TH.gold}`, color: TH.goldLight, padding: "13px", borderRadius: 2, cursor: "pointer", textTransform: "uppercase", fontWeight: "bold" }}>
            {t.save_settings}
          </button>
        </div>
      </div>
    </>
  );
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STREAK SETTINGS MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function StreakSettingsModal({ streakPct, onSave, onClose, TH, t }) {
  const [val, setVal] = useState(streakPct);
  return (
    <ModalBackdrop onClose={onClose} TH={TH}>
      <ModalHeader title={t.streak_threshold} onClose={onClose} TH={TH}/>
      <p style={{fontSize:12,color:TH.textDim,marginBottom:20,lineHeight:1.7,letterSpacing:1}}>
        {t.streak_threshold_sub}
      </p>
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20}}>
        <input type="range" min="10" max="100" step="5" value={val}
          onChange={e=>setVal(Number(e.target.value))}
          style={{flex:1,accentColor:TH.gold}}/>
        <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:32,color:TH.gold,
          minWidth:54,textAlign:"right",lineHeight:1}}>{val}%</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:TH.textMuted,marginBottom:24}}>
        <span>10%</span><span style={{color:TH.gold,fontWeight:600}}>{val}%</span><span>100%</span>
      </div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <GBtn variant="ghost" onClick={onClose} TH={TH}>{t.cancel_btn}</GBtn>
        <GBtn onClick={()=>{onSave(val);onClose();}} TH={TH}>{t.save_btn}</GBtn>
      </div>
    </ModalBackdrop>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CLEAR ALL BUTTON — two-step inline confirm (no confirm() dialog)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ClearAllButton({ onConfirm, lang, step, setStep }) {
  if (step === 0) {
    return (
      <button onClick={()=>setStep(1)} style={{
        display:"flex",alignItems:"center",justifyContent:"center",gap:6,
        width:"100%",padding:"10px",background:"transparent",
        border:"1px solid #FF333328",color:"#FF7777",
        cursor:"pointer",fontSize:11,letterSpacing:3,textTransform:"uppercase",
        fontFamily:"inherit",
      }}>
        🗑 {lang==="ja"?"タスクを全て削除":"Clear All Tasks"}
      </button>
    );
  }

  return (
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"12px 16px",background:"#FF333311",
      borderTop:"1px solid #FF333344",gap:10,flexWrap:"wrap",
    }}>
      <span style={{fontSize:12,color:"#FF9999",letterSpacing:1}}>
        {lang==="ja"?"本当に削除しますか？":"Delete all tasks?"}
      </span>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setStep(0)} style={{
          background:"transparent",border:"1px solid #555",color:"#aaa",
          cursor:"pointer",fontFamily:"inherit",fontSize:11,letterSpacing:2,
          padding:"8px 18px",borderRadius:2,textTransform:"uppercase",
        }}>
          {lang==="ja"?"戻る":"Cancel"}
        </button>
        <button onClick={()=>{setStep(0);onConfirm();}} style={{
          background:"#FF333322",border:"1px solid #FF555566",color:"#FF9999",
          cursor:"pointer",fontFamily:"inherit",fontSize:11,letterSpacing:2,
          padding:"8px 18px",borderRadius:2,textTransform:"uppercase",fontWeight:600,
        }}>
          {lang==="ja"?"削除する":"Delete"}
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PANEL SHELL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function Panel({children,TH,style:{}}){
  return(
    <div style={{background:TH.surface,border:`1px solid ${TH.borderGold}`,borderRadius:3,
      overflow:"hidden",position:"relative",boxShadow:`0 2px 18px ${TH.gold}06`,...{}}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,
        background:`linear-gradient(90deg,transparent,${TH.gold}44,transparent)`,zIndex:1}}/>
      {children}
    </div>
  );
}
function PanelHeader({title,sub,right,TH}){
  return(
    <div style={{padding:"12px 15px 10px",borderBottom:`1px solid ${TH.border}`,
      display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <h2 style={{fontSize:12,letterSpacing:4,color:TH.gold,textTransform:"uppercase",fontWeight:400}}>{title}</h2>
        {sub&&<p style={{fontSize:10,color:TH.textMuted,marginTop:2,letterSpacing:1}}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}
function AddRow({onClick,label,TH}){
  const[h,setH]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,
        width:"100%",padding:"10px",background:"transparent",
        border:`1px dashed ${h?TH.goldDark:TH.border}`,color:h?TH.gold:TH.textMuted,
        cursor:"pointer",fontSize:11,letterSpacing:4,textTransform:"uppercase",
        transition:"all .2s",fontFamily:"inherit"}}>
      {label}
    </button>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function Dashboard() {
  // ── Auth & Sync state ─────────────────────────────────────────
  const [session,     setSession]    = useState<Session | null>(null);   // Supabase session
  const [syncStatus,  setSyncStatus] = useState("idle"); // "idle"|"syncing"|"saved"|"error"
  const syncTimerRef  = useRef(null);

  const user: User | null = session?.user ?? null;
  const isOnline = !!user && isSupabaseConfigured();

  // Show sync badge briefly then revert to idle
  const showSync = useCallback((status) => {
    setSyncStatus(status);
    clearTimeout(syncTimerRef.current);
    if (status === "saved" || status === "error") {
      syncTimerRef.current = setTimeout(() => setSyncStatus("idle"), 2500);
    }
  }, []);

  // Auth listener — runs once on mount
  useEffect(() => {
    // 1. ページが開いた瞬間に、今のログイン状態を直接チェックする
    const checkSession = async () => {
      const sb = getSupabase();
      if (sb) {
        const { data: { session } } = await sb.auth.getSession();
        setSession(session);
      }
    };
    checkSession();

    // 2. その後のログイン・ログアウトの変化を監視する
    const unsub = onAuthStateChange(sess => setSession(sess));
    return unsub;
  }, []);
  // Cloud save helper — called after every data change
  const cloudSave = useCallback(async (key, value) => {
    if (!isOnline) return; // offline → LocalStorage only (handled in each useEffect)
    try {
      showSync("syncing");
      await upsertData(user.id, key, value);
      showSync("saved");
    } catch(e) {
      console.error("Sync error:", e);
      showSync("error");
    }
  }, [isOnline, user, showSync]);

  // On login: pull all cloud data and merge into local state
  useEffect(() => {
    if (!isOnline) return;
    (async () => {
      try {
        showSync("syncing");
        const data = await fetchAllData(user.id);
        if (data.tasks)     setTasks(data.tasks);
        if (data.sched)     setSched(data.sched);
        if (data.links)     setLinks(data.links);
        if (data.goals)     setGoals(data.goals);
        if (data.events)    setEvents(data.events);
        if (data.timers)    setTimers(data.timers);
        if (data.cds)       setCDs(data.cds);
        if (data.streakLog) setStreakLog(data.streakLog);
        if (data.calColors) setCalColors(data.calColors);
        if (data.settings) {
          const s = data.settings;
          if (s.lang)       setLangRaw(s.lang);
          if (s.themeName)  setThemeRaw(s.themeName);
          if (s.userName)   setUserName(s.userName);
          if (s.streakPct != null) setStreakPct(s.streakPct);
        }
        showSync("saved");
      } catch(e) {
        console.error("Cloud load error:", e);
        showSync("error");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, user?.id]);
  const [lang,       setLangRaw]  = useState(()=>LS.get("apx7_lang","en"));
  const [themeName,  setThemeRaw] = useState(()=>LS.get("apx7_theme","dark"));
  const [userName,   setUserName] = useState(()=>LS.get("apx7_uname",""));
  const [streakPct,  setStreakPct]= useState(()=>LS.get("apx7_spct",80)); // default 80%

  const setLang  = v => { const n=typeof v==="function"?v(lang):v; setLangRaw(n); if(!isOnline) LS.set("apx7_lang",n); };
  const setTheme = v => { const n=typeof v==="function"?v(themeName):v; setThemeRaw(n); if(!isOnline) LS.set("apx7_theme",n); };

  const TH = THEMES[themeName] || THEMES.dark;
  const t  = DICT[lang];
  const QUOTES = lang==="ja" ? QUOTES_JA : QUOTES_EN;

  // ── Data ───────────────────────────────────────────────────
  const [tasks,    setTasks]    = useState(()=>LS.get("apx7_tasks",   DEF_TASKS));
  const [sched,    setSched]    = useState(()=>LS.get("apx7_sched",   DEF_SCHEDULE));
  const [links,    setLinks]    = useState(()=>LS.get("apx7_links",   DEF_LINKS));
  const [goals,    setGoals]    = useState(()=>LS.get("apx7_goals",   DEF_GOALS));
  const [events,   setEvents]   = useState(()=>LS.get("apx7_events",  []));
  const [timers,   setTimers]   = useState(()=>LS.get("apx7_timers",  [{id:"default",name:"Liquid Pomodoro",maxWorkMin:DEFAULT_MAX_WORK_MIN,workRestRatio:DEFAULT_WORK_REST_RATIO,longBreakMin:DEFAULT_LONG_BREAK_MIN}]));
  const [cds,      setCDs]      = useState(()=>LS.get("apx7_cds",     [])); // countdowns
  const [activeCd, setActiveCd] = useState(()=>LS.get("apx7_acd",    null)); // id of active countdown
  const [calColors,setCalColors]= useState(()=>LS.get("apx7_calcol", {}));

  // ── Streak state — stored separately ──────────────────────
  // streakLog: { "YYYY-MM-DD": true } — records days where threshold was met
  const [streakLog, setStreakLog] = useState(()=>LS.get("apx7_slog", {}));

  useEffect(()=>{ if(!isOnline) LS.set("apx7_tasks",   tasks);    cloudSave("tasks",   tasks);   },[tasks, isOnline, cloudSave]);
  useEffect(()=>{ if(!isOnline) LS.set("apx7_sched",   sched);    cloudSave("sched",   sched);
    if (isOnline && user) syncAllRoutinesToDb(user.id, sched as RoutineItem[]);
  },[sched, isOnline, cloudSave, user?.id]);
  useEffect(()=>{ if(!isOnline) LS.set("apx7_links",   links);    cloudSave("links",   links);   },[links, isOnline, cloudSave]);
  useEffect(()=>{ if(!isOnline) LS.set("apx7_goals",   goals);    cloudSave("goals",   goals);   },[goals, isOnline, cloudSave]);
  useEffect(()=>{ if(!isOnline) LS.set("apx7_events",  events);   cloudSave("events",  events);  },[events, isOnline, cloudSave]);
  useEffect(()=>{ if(!isOnline) LS.set("apx7_timers",  timers);   cloudSave("timers",  timers);  },[timers, isOnline, cloudSave]);
  useEffect(()=>{ if(!isOnline) LS.set("apx7_cds",     cds);      cloudSave("cds",     cds);     },[cds, isOnline, cloudSave]);
  useEffect(()=>{ if(!isOnline) LS.set("apx7_acd",     activeCd); },[activeCd, isOnline]);
  useEffect(()=>{ if(!isOnline) LS.set("apx7_calcol",  calColors);cloudSave("calColors",calColors);},[calColors, isOnline, cloudSave]);
  useEffect(()=>{ if(!isOnline) LS.set("apx7_slog",    streakLog);cloudSave("streakLog",streakLog);},[streakLog, isOnline, cloudSave]);
  // Save settings bundle when any setting changes
  useEffect(()=>{
    const s={lang,themeName:themeName,userName,streakPct};
    if(!isOnline){ LS.set("apx7_lang",lang); LS.set("apx7_theme",themeName); }
    cloudSave("settings", s);
  },[lang,themeName,userName,streakPct, isOnline, cloudSave]);

  // ── STREAK LOGIC — based on ROUTINE completion ─────────────
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  })();

  const todayDow    = new Date().getDay();
  const getRotationItem = (routine: any) => {
    if (!routine.freq || routine.freq !== "rotation") return true;
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const rotationGroup = sched.filter(r => r.freq === "rotation");
    if (rotationGroup.length === 0) return true;
    return rotationGroup[daysSinceEpoch % rotationGroup.length].id === routine.id;
  };
  const activeSched = sched.filter(r => isActiveToday(r, todayDow) && getRotationItem(r));
  const schedDone   = activeSched.filter(r => r.done).length;
  const routinePct  = activeSched.length > 0
    ? Math.round((schedDone / activeSched.length) * 100)
    : 0;
  const metThreshold = routinePct >= streakPct;

  // Update streakLog whenever routine completion or threshold changes.
  // Once today is marked "met", it stays met until tomorrow's reset.
  // If routines are unchecked (dropping below threshold), today's entry
  // is REMOVED — so tomorrow starts fresh without a false streak day.
  useEffect(() => {
    setStreakLog(prev => {
      const alreadyMet = !!prev[todayStr];
      if (alreadyMet && !metThreshold) {
        // Routines un-checked — remove today so streak doesn't count this day
        const next = { ...prev };
        delete next[todayStr];
        if(!isOnline) LS.set("apx7_slog", next);
        return next;
      }
      if (!alreadyMet && metThreshold) {
        // Threshold newly crossed — mark today
        const next = { ...prev, [todayStr]: true };
        if(!isOnline) LS.set("apx7_slog", next);
        return next;
      }
      return prev; // no change
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedDone, activeSched.length, streakPct, todayStr]);

  // Compute display streak: consecutive days in log ending today (or yesterday if today unmet)
  const streak = (() => {
    const fmt = d =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    let count = 0;
    const d = new Date();
    // Start from today if met, yesterday otherwise
    if (!streakLog[fmt(d)]) d.setDate(d.getDate() - 1);
    while (streakLog[fmt(d)]) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  })();

  // ── UI State ───────────────────────────────────────────────
  const [time,setTime]         = useState(new Date());
  const [quoteIdx,setQI]       = useState(0);
  const [activeTab,setTab]     = useState("today");
  const [mobSec,setMob]        = useState("schedule");
  const [isMobile,setMobile]   = useState(false);
  const [focusMode,setFocus]   = useState(false);
  const [settingsOpen,setSettings]=useState(false);
  const [showPomo,setPomo]     = useState(false);
  const [saveFlash,setSave]    = useState(false);
  const [modal,setModal]       = useState(null);
  // Calendar view state lifted here so it survives EventsPanel re-renders
  const [calYear,  setCalYear]  = useState(()=>new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(()=>new Date().getMonth());
  // Lifted from ClearAllButton so it survives TasksPanel re-renders
  const [clearStep, setClearStep] = useState(0);
  const [expandedRoutines, setExpandedRoutines] = useState<Record<string, boolean>>({});
  const [stepPlayerRoutine, setStepPlayerRoutine] = useState<RoutineItem | null>(null);
  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  const [partnerActivities, setPartnerActivities] = useState<PartnerActivity[]>([]);
  const [partnerSnapshot, setPartnerSnapshot] = useState<PartnerSnapshot | null>(null);
  const [mySnapshot, setMySnapshot] = useState<PartnerSnapshot | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [stepFocusMode, setStepFocusMode] = useState(false);

  // ── Notification permission + AudioContext unlock on first user click ──
  useEffect(() => {
    // Request notification permission on mount
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Unlock AudioContext on first click anywhere on the page
    const unlock = () => {
      unlockAudio();
      document.removeEventListener("click", unlock);
    };
    document.addEventListener("click", unlock);
    return () => document.removeEventListener("click", unlock);
  }, []);

  // ── Daily auto-reset: when the date changes, uncheck all tasks and routines ──
  useEffect(()=>{
    const lastDate = LS.get("apx7_last_date", "");
    if (lastDate && lastDate !== todayStr) {
      // New day detected — clear all done states
      setTasks(ts => ts.map(t2 => ({...t2, done: false})));
      setSched(s  => s.map(r  => ({...r,  done: false, steps: resetSteps(r.steps) })));
    }
    if(!isOnline) LS.set("apx7_last_date", todayStr);
  }, [todayStr]);

  useEffect(()=>{
    const ti=setInterval(()=>setTime(new Date()),1000);
    const q =setInterval(()=>setQI(i=>(i+1)%QUOTES.length),7000);
    return()=>{ clearInterval(ti); clearInterval(q); };
  },[QUOTES.length]);

  useEffect(()=>{
    const fn=()=>setMobile(window.innerWidth<768);
    fn(); window.addEventListener("resize",fn);
    return()=>window.removeEventListener("resize",fn);
  },[]);

  // ── Derived ────────────────────────────────────────────────
  const doneCount = tasks.filter(t2=>t2.done).length;
  const taskPct   = tasks.length ? Math.round((doneCount/tasks.length)*100) : 0;
  const activeCdObj = cds.find(c=>c.id===activeCd) || null;

  const timeStr = time.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const dateStr = time.toLocaleDateString(lang==="ja"?"ja-JP":"en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  const greeting = () => {
    const h=time.getHours(), nm=userName?`, ${userName}`:"";
    if(h<12) return `${t.greeting_morning}${nm}`;
    if(h<18) return `${t.greeting_afternoon}${nm}`;
    return `${t.greeting_evening}${nm}`;
  };

  // ── CRUD ───────────────────────────────────────────────────
  const toggleTask  = id => setTasks(ts=>ts.map(t2=>t2.id===id?{...t2,done:!t2.done}:t2));
  const saveTask    = (item,d)=>{ if(!item)setTasks(ts=>[...ts,{id:nid(),done:false,...d}]); else setTasks(ts=>ts.map(t2=>t2.id===item.id?{...t2,...d}:t2)); };
  const deleteTask  = id=>setTasks(ts=>ts.filter(t2=>t2.id!==id));
  const toggleSched = (id: string) =>
    setSched((s) =>
      s.map((r) => {
        if (r.id !== id) return r;
        const newDone = !r.done;
        if (r.steps?.length) {
          const steps = newDone
            ? completeAllSteps(r.steps)
            : resetSteps(r.steps)!;
          return { ...r, done: newDone, steps };
        }
        return { ...r, done: newDone };
      }),
    );

  const toggleRoutineStep = (routineId: string, stepId: string) => {
    setSched((s) =>
      s.map((r) => {
        if (r.id !== routineId || !r.steps?.length) return r;
        const { steps, allDone } = toggleStep(r.steps, stepId);
        return { ...r, steps, done: allDone };
      }),
    );
  };

  const completePlayerStep = (stepId: string) => {
    if (!stepPlayerRoutine) return;
    setSched((s) => {
      const next = s.map((r) => {
        if (r.id !== stepPlayerRoutine.id || !r.steps?.length) return r;
        const { steps, allDone } = applyStepCompletion(r.steps, stepId);
        const updated = { ...r, steps, done: allDone };
        queueMicrotask(() => setStepPlayerRoutine(updated));
        return updated;
      });
      return next;
    });
    if (partnership && user) {
      const msg =
        lang === "ja"
          ? `${userName || "相棒"}が「${stepPlayerRoutine.task}」のステップを完了`
          : `${userName || "Partner"} completed a step in "${stepPlayerRoutine.task}"`;
      logPartnerActivity(user.id, partnership.id, "step_complete", { message: msg });
    }
  };

  const saveSched = (item: RoutineItem | null, d: Partial<RoutineItem>) => {
    const sort = (a: RoutineItem[]) =>
      [...a].sort((x, y) => x.time.localeCompare(y.time));
    if (!item) {
      setSched((s) =>
        sort([...s, { id: nid(), done: false, steps: [], isShared: false, ...d } as RoutineItem]),
      );
    } else {
      setSched((s) =>
        sort(
          s.map((r) =>
            r.id === item.id
              ? {
                  ...r,
                  ...d,
                  done: (d.steps ?? r.steps)?.length
                    ? deriveRoutineDone(d.steps ?? r.steps, false)
                    : r.done,
                }
              : r,
          ),
        ),
      );
    }
  };

  const deleteSched = (id: string) => setSched((s) => s.filter((r) => r.id !== id));
  const saveLink    = (item,d)=>{ if(!item)setLinks(ls=>[...ls,{id:nid(),...d}]); else setLinks(ls=>ls.map(l=>l.id===item.id?{...l,...d}:l)); };
  const deleteLink  = id=>setLinks(ls=>ls.filter(l=>l.id!==id));
  const saveGoal    = (item,d)=>{ if(!item)setGoals(gs=>[...gs,{id:nid(),...d}]); else setGoals(gs=>gs.map(g=>g.id===item.id?{...g,...d}:g)); };
  const deleteGoal  = id=>setGoals(gs=>gs.filter(g=>g.id!==id));
  const saveEvent   = (item,d)=>{ if(!item)setEvents(es=>[...es,{id:nid(),...d}]); else setEvents(es=>es.map(e=>e.id===item.id?{...e,...d}:e)); };
  const deleteEvent = id=>setEvents(es=>es.filter(e=>e.id!==id));
  const saveTimer   = (item,d)=>{ if(!item)setTimers(ts=>[...ts,{id:nid(),...d}]); else setTimers(ts=>ts.map(x=>x.id===item.id?{...x,...d}:x)); };
  const deleteTimer = id=>setTimers(ts=>ts.filter(x=>x.id!==id));
  const saveCd      = (item,d)=>{ if(!item)setCDs(cs=>[...cs,{id:nid(),...d}]); else setCDs(cs=>cs.map(c=>c.id===item.id?{...c,...d}:c)); };
  const deleteCd    = id=>{ setCDs(cs=>cs.filter(c=>c.id!==id)); if(activeCd===id)setActiveCd(null); };
  const resetDay    = ()=>{ if(!confirm(lang==="ja"?"チェックをリセット？":"Reset today's checks?"))return;
    setTasks(ts=>ts.map(t2=>({...t2,done:false})));
    setSched(s=>s.map(r=>({...r,done:false,steps:resetSteps(r.steps)})));
  };
  const setCellColor= (ds,c)=>setCalColors(cc=>({...cc,[ds]:c}));

  const startStepPlayer = (routine: RoutineItem) => {
    setStepPlayerRoutine(routine);
    setStepFocusMode(true);
    if (partnership && user) {
      const msg =
        lang === "ja"
          ? `${userName || "相棒"}がDeep Workを開始: ${routine.task}`
          : `${userName || "Partner"} started Deep Work: ${routine.task}`;
      logPartnerActivity(user.id, partnership.id, "work_start", { message: msg });
    }
  };

  const handleGenerateInvite = async () => {
    if (!user) return;
    setPartnerLoading(true);
    const code = await createInviteCode(user.id);
    setPendingInviteCode(code);
    setPartnerLoading(false);
  };

  const handleJoinPartner = async (code: string) => {
    if (!user) return;
    setPartnerLoading(true);
    const p = await acceptInviteCode(user.id, code);
    if (p) {
      setPartnership(p);
      setPendingInviteCode(null);
      const acts = await fetchPartnerActivities(p.id);
      setPartnerActivities(acts);
      const partnerId = getPartnerUserId(p, user.id);
      if (partnerId) {
        const snap = await fetchPartnerSnapshot(partnerId, p.id);
        setPartnerSnapshot(snap);
      }
    }
    setPartnerLoading(false);
  };

  useEffect(() => {
    if (!stepPlayerRoutine) return;
    const fresh = sched.find((r) => r.id === stepPlayerRoutine.id);
    if (fresh) setStepPlayerRoutine(fresh as RoutineItem);
  }, [sched, stepPlayerRoutine?.id]);

  useEffect(() => {
    if (!isOnline || !user?.id) {
      setPartnership(null);
      setPendingInviteCode(null);
      return;
    }
    (async () => {
      setPartnerLoading(true);
      const p = await fetchActivePartnership(user.id);
      setPartnership(p);
      if (p) {
        const acts = await fetchPartnerActivities(p.id);
        setPartnerActivities(acts);
        const partnerId = getPartnerUserId(p, user.id);
        if (partnerId) {
          const snap = await fetchPartnerSnapshot(partnerId, p.id);
          setPartnerSnapshot(snap);
        }
      } else {
        const code = await fetchPendingInviteCode(user.id);
        setPendingInviteCode(code);
      }
      setPartnerLoading(false);
    })();
  }, [isOnline, user?.id]);

  useEffect(() => {
    if (!partnership?.id || !user?.id) return;
    return subscribePartnerActivities(partnership.id, (activity) => {
      setPartnerActivities((prev) => [activity, ...prev].slice(0, 30));
    });
  }, [partnership?.id, user?.id]);

  useEffect(() => {
    if (!partnership || !user) return;
    const snap: PartnerSnapshot = {
      user_id: user.id,
      user_name: userName || user.email?.split("@")[0] || "You",
      routine_pct: routinePct,
      routine_done: schedDone,
      routine_total: activeSched.length,
      goals: (goals as GoalItem[]).map((g) => ({
        id: g.id,
        goal: g.goal,
        progress: g.progress,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        currency: g.currency,
      })),
      updated_at: new Date().toISOString(),
    };
    setMySnapshot(snap);
    upsertPartnerSnapshot(user.id, partnership.id, snap);
  }, [partnership, user, userName, routinePct, schedDone, activeSched.length, goals]);

  useEffect(() => {
    if (!partnership || !user) return;
    const partnerId = getPartnerUserId(partnership, user.id);
    if (!partnerId) return;
    const interval = setInterval(async () => {
      const snap = await fetchPartnerSnapshot(partnerId, partnership.id);
      if (snap) setPartnerSnapshot(snap);
    }, 30000);
    return () => clearInterval(interval);
  }, [partnership, user]);

  // ── Export / Import ────────────────────────────────────────
  const exportData=()=>{
    const d={tasks,sched,links,goals,events,timers,cds,activeCd,streakLog,streakPct,userName,lang,themeName,calColors,exportedAt:new Date().toISOString()};
    const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`apex-hub-${todayStr}.json`;a.click();
  };
  const importData=()=>{
    const inp=document.createElement("input");inp.type="file";inp.accept=".json";
    inp.onchange=e=>{
      const f=e.target.files[0];if(!f)return;
      const r=new FileReader();r.onload=ev=>{
        try{
          const d=JSON.parse(ev.target.result);
          if(d.tasks)setTasks(d.tasks);if(d.sched)setSched(d.sched);
          if(d.links)setLinks(d.links);if(d.goals)setGoals(d.goals);
          if(d.events)setEvents(d.events);if(d.timers)setTimers(d.timers);
          if(d.cds)setCDs(d.cds);if(d.activeCd!=null)setActiveCd(d.activeCd);
          if(d.streakLog)setStreakLog(d.streakLog);
          if(d.streakPct!=null){setStreakPct(d.streakPct); if(!isOnline) LS.set("apx7_spct",d.streakPct);}
          if(d.calColors)setCalColors(d.calColors);
          if(d.userName){setUserName(d.userName); if(!isOnline) LS.set("apx7_uname",d.userName);}
          if(d.lang)setLang(d.lang);if(d.themeName)setTheme(d.themeName);
          alert("✦ Imported successfully.");
        }catch{alert("Invalid JSON file.");}
      };r.readAsText(f);
    };inp.click();
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CSS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Noto+Serif+JP:wght@300;400;600&family=Share+Tech+Mono&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    ::-webkit-scrollbar{width:3px;}
    ::-webkit-scrollbar-track{background:${TH.bg};}
    ::-webkit-scrollbar-thumb{background:${TH.scrollThumb};border-radius:2px;}

    .stat-card{background:${TH.surface};border:1px solid ${TH.borderGold};border-radius:2px;
      padding:16px;position:relative;overflow:hidden;transition:all .3s;box-shadow:inset 0 1px 0 ${TH.gold}11;}
    .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;
      background:linear-gradient(90deg,transparent,${TH.gold}77,transparent);}
    .stat-card:hover{border-color:${TH.gold}55;transform:translateY(-2px);box-shadow:0 8px 28px ${TH.gold}0d;}

    .row{display:flex;align-items:center;gap:10px;padding:12px 15px;
      border-bottom:1px solid ${TH.border};transition:background .15s;min-height:50px;}
    .row:last-child{border-bottom:none;}
    .row:hover{background:${TH.surfaceHover};}

    .edit-btn{background:none;border:1px solid transparent;color:${TH.textMuted};cursor:pointer;
      padding:4px 6px;border-radius:2px;transition:all .2s;flex-shrink:0;font-size:13px;line-height:1;}
    .edit-btn:hover{border-color:${TH.goldDark};color:${TH.gold};}

    .tab-btn{flex:1;padding:10px 6px;border:none;border-bottom:2px solid transparent;
      background:transparent;color:${TH.textMuted};cursor:pointer;font-family:inherit;
      font-size:11px;letter-spacing:3px;text-transform:uppercase;transition:all .2s;}
    .tab-btn.active{border-bottom-color:${TH.gold};color:${TH.gold};}
    .tab-btn:hover:not(.active){color:${TH.textDim};}

    .mob-nav{flex:1;padding:13px 6px;border:none;border-top:2px solid transparent;
      background:${TH.bg2};color:${TH.textMuted};cursor:pointer;font-family:inherit;
      font-size:10px;letter-spacing:2px;text-transform:uppercase;
      transition:all .2s;display:flex;flex-direction:column;align-items:center;gap:4px;}
    .mob-nav.active{border-top-color:${TH.gold};color:${TH.gold};}

    .pbar{height:3px;background:${TH.border};border-radius:2px;overflow:hidden;}
    .pfill{height:100%;background:linear-gradient(90deg,${TH.goldDark},${TH.goldLight});
      transition:width .9s cubic-bezier(.4,0,.2,1);box-shadow:0 0 6px ${TH.gold}44;}

    .glow-dot{width:7px;height:7px;border-radius:50%;background:${TH.gold};
      box-shadow:0 0 10px ${TH.gold};animation:pulse 2.5s infinite;flex-shrink:0;}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}

    .clock{font-family:'Share Tech Mono',monospace;font-size:clamp(22px,3.8vw,40px);
      color:${TH.gold};letter-spacing:5px;text-shadow:0 0 22px ${TH.gold}44;}

    .badge{font-size:9px;letter-spacing:2px;text-transform:uppercase;padding:2px 7px;
      border:1px solid currentColor;border-radius:1px;white-space:nowrap;}

    .quote-text{font-style:italic;font-size:14px;color:${TH.goldLight};
      letter-spacing:2px;animation:fio 7s infinite;}
    @keyframes fio{0%,100%{opacity:0;}12%,88%{opacity:1;}}

    .iodbtn{background:transparent;border:1px solid ${TH.border};color:${TH.textMuted};
      cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:2px;
      padding:5px 11px;border-radius:1px;text-transform:uppercase;transition:all .2s;}
    .iodbtn:hover{border-color:${TH.goldDark};color:${TH.gold};}

    .gear{background:transparent;border:1px solid ${TH.border};color:${TH.textMuted};
      cursor:pointer;width:32px;height:32px;border-radius:2px;font-size:14px;
      display:flex;align-items:center;justify-content:center;transition:all .25s;}
    .gear:hover{border-color:${TH.goldDark};color:${TH.gold};transform:rotate(30deg);}

    .save-toast{position:fixed;bottom:84px;right:16px;background:${TH.surface};
      border:1px solid ${TH.goldDark};padding:6px 14px;font-size:10px;letter-spacing:4px;
      color:${TH.gold};opacity:0;transition:opacity .3s;pointer-events:none;z-index:999;border-radius:2px;}
    .save-toast.show{opacity:1;}

    .focus-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);
      backdrop-filter:brightness(.65);pointer-events:none;z-index:50;}

    .si{opacity:0;transform:translateY(14px);animation:sian .6s forwards;}
    @keyframes sian{to{opacity:1;transform:none;}}

    .inactive-row{opacity:.3;}
    .inactive-row .edit-btn{pointer-events:all;}
    .inactive-row{pointer-events:none;}
    .inactive-row .edit-btn{pointer-events:all;}

    input[type=time]::-webkit-calendar-picker-indicator,
    input[type=date]::-webkit-calendar-picker-indicator{
      filter:${themeName==="light"?"none":"invert(.3)"};
    }
    @media(max-width:767px){.dk-grid{display:none!important;}.mob-content{display:flex!important;}}
    @media(min-width:768px){.mob-content{display:none!important;}.mob-bar{display:none!important;}}
  `;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PANELS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const SchedulePanel = ({maxH=480}) => (
    <div style={{background:TH.surface,border:`1px solid ${TH.borderGold}`,borderRadius:3,
      overflow:"hidden",position:"relative",height:"100%"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,
        background:`linear-gradient(90deg,transparent,${TH.gold}44,transparent)`,zIndex:1}}/>
      <PanelHeader TH={TH} title={t.routine_title} sub={t.routine_sub}
        right={<div style={{display:"flex",gap:7,alignItems:"center"}}>
          <button style={{background:"transparent",border:`1px solid ${TH.border}`,color:TH.textMuted,
            cursor:"pointer",fontFamily:"inherit",fontSize:10,letterSpacing:2,padding:"3px 9px",borderRadius:1,minHeight:36}}
            onClick={resetDay}>{t.reset}</button>
          <span style={{fontSize:11,color:TH.goldDark,fontFamily:"'Share Tech Mono',monospace"}}>{schedDone}/{activeSched.length}</span>
        </div>}
      />
      <div style={{maxHeight:maxH,overflowY:"auto"}}>
        {activeSched.map(r=>(
          <RoutineRow
            key={r.id}
            routine={r as RoutineItem}
            expanded={!!expandedRoutines[r.id]}
            onToggleExpand={()=>setExpandedRoutines(ex=>({...ex,[r.id]:!ex[r.id]}))}
            onToggleDone={()=>toggleSched(r.id)}
            onEdit={()=>setModal({type:"sched",item:r})}
            onStartPlayer={()=>startStepPlayer(r as RoutineItem)}
            onToggleStep={(stepId)=>toggleRoutineStep(r.id,stepId)}
            TH={TH}
            t={t}
          />
        ))}
        {sched.filter(r=>!isActiveToday(r,todayDow)).length>0&&(
          <div style={{borderTop:`1px dashed ${TH.border}`,padding:"5px 15px 2px"}}>
            <p style={{fontSize:9,letterSpacing:3,color:TH.textMuted,textTransform:"uppercase"}}>{t.inactive_today}</p>
          </div>
        )}
        {sched.filter(r=>!isActiveToday(r,todayDow)).map(r=>(
          <RoutineRow
            key={r.id}
            routine={r as RoutineItem}
            inactive
            expanded={!!expandedRoutines[r.id]}
            onToggleExpand={()=>setExpandedRoutines(ex=>({...ex,[r.id]:!ex[r.id]}))}
            onToggleDone={()=>{}}
            onEdit={()=>setModal({type:"sched",item:r})}
            onStartPlayer={()=>startStepPlayer(r as RoutineItem)}
            onToggleStep={(stepId)=>toggleRoutineStep(r.id,stepId)}
            TH={TH}
            t={t}
          />
        ))}
      </div>
      <AddRow onClick={()=>setModal({type:"sched",item:null})} label={t.add_routine} TH={TH}/>
      <div style={{padding:"9px 15px",borderTop:`1px solid ${TH.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:TH.textMuted,marginBottom:4}}>
          <span style={{letterSpacing:2}}>{t.progress}</span>
          <span style={{color:TH.goldDark,fontFamily:"'Share Tech Mono',monospace"}}>{routinePct}%</span>
        </div>
        <div className="pbar"><div className="pfill" style={{width:`${routinePct}%`}}/></div>
      </div>
    </div>
  );

  const PartnerPanelWrap = () => (
    <PartnerPanel
      TH={TH}
      t={t}
      lang={lang}
      userId={user?.id}
      userName={userName}
      partnership={partnership}
      pendingCode={pendingInviteCode}
      partnerSnapshot={partnerSnapshot}
      mySnapshot={mySnapshot}
      activities={partnerActivities}
      onGenerateCode={handleGenerateInvite}
      onJoinCode={handleJoinPartner}
      loading={partnerLoading}
    />
  );

  const TasksPanel = () => (
    <div style={{background:TH.surface,border:`1px solid ${TH.borderGold}`,borderRadius:3,overflow:"hidden",position:"relative"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${TH.gold}44,transparent)`,zIndex:1}}/>
      <div style={{display:"flex",borderBottom:`1px solid ${TH.border}`}}>
        {["today","goals","chart"].map(tab=>(
          <button key={tab} className={`tab-btn${activeTab===tab?" active":""}`} onClick={()=>setTab(tab)}>
            {t[tab]}
          </button>
        ))}
      </div>
      {activeTab==="today"&&(
        <div>
          {Array.from(new Set(tasks.map(t => t.category || "Focus"))).map(cat => {
  const catTasks = tasks.filter(tk => (tk.category || "Focus") === cat);
  const sorted = [...catTasks].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  return (
    <div key={cat} style={{ marginBottom: 15 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 15px', borderBottom: `1px solid ${TH.border}`, background: `${TH.gold}08` }}>
        <span style={{ fontSize: 10, color: TH.gold, letterSpacing: 2, fontWeight: 600 }}>{cat}</span>
        <button onClick={() => setTasks(ts => ts.filter(tk => (tk.category || "Focus") !== cat))} style={{ fontSize: 9, color: '#FF7777', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: 1 }}>DELETE ALL</button>
      </div>
      {sorted.map(t2 => (
        <div key={t2.id} className="row" onClick={() => setModal({ type: "task", item: t2 })} style={{cursor: "pointer"}}>
          <div 
            onClick={(e) => { e.stopPropagation(); toggleTask(t2.id); }} 
            style={{ width: 22, height: 22, border: `1px solid ${t2.done ? TH.gold : TH.border}`, 
              background: t2.done ? `${TH.gold}1a` : "transparent",
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            {t2.done && <span style={{ color: TH.gold, fontSize: 14 }}>✓</span>}
          </div>
          <span style={{ flex: 1, fontSize: 13, color: t2.done ? TH.textMuted : TH.text, textDecoration: t2.done ? "line-through" : "none", opacity: t2.done ? 0.6 : 1 }}>
            {t2.text}
          </span>
          <button className="edit-btn" onClick={e => { e.stopPropagation(); setModal({ type: "task", item: t2 }); }}>✏️</button>
        </div>
      ))}
    </div>
  );
})}
          <AddRow onClick={()=>setModal({type:"task",item:null})} label={t.add_task} TH={TH}/>
          {tasks.length > 0 && (
            <button
              onClick={()=>setModal({type:"clearAll"})}
              style={{
                display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                width:"100%",padding:"10px",background:"transparent",
                border:"1px solid #FF333328",color:"#FF7777",
                cursor:"pointer",fontSize:11,letterSpacing:3,textTransform:"uppercase",
                fontFamily:"inherit",
              }}>
              🗑 {lang==="ja"?"タスクを全て削除":"Clear All Tasks"}
            </button>
          )}
          <div style={{padding:"9px 15px",borderTop:`1px solid ${TH.border}`}}>
            {/* Streak threshold indicator */}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:TH.textMuted,marginBottom:4}}>
              <span style={{letterSpacing:2}}>{t.progress} (streak≥{streakPct}%)</span>
              <span style={{color:metThreshold?TH.gold:TH.textMuted,fontFamily:"'Share Tech Mono',monospace"}}>{taskPct}%</span>
            </div>
            <div className="pbar">
              <div className="pfill" style={{width:`${taskPct}%`}}/>
            </div>
            {/* Threshold marker */}
            <div style={{position:"relative",height:0}}>
              <div style={{position:"absolute",top:-3,left:`${streakPct}%`,transform:"translateX(-50%)",
                width:1,height:9,background:TH.gold,opacity:.6}}/>
            </div>
            <p style={{fontSize:10,color:TH.textMuted,marginTop:6,letterSpacing:3}}>
              {doneCount}/{tasks.length} {t.completed}
              {metThreshold&&<span style={{color:TH.goldLight,marginLeft:10}}>🔥 {streak}</span>}
            </p>
          </div>
        </div>
      )}
      {activeTab==="goals"&&(
        <div>
          <div style={{padding:"14px 15px 4px"}}>
            {goals.map(g=>(
              <div key={g.id} style={{marginBottom:15,display:"flex",alignItems:"flex-start",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <span style={{fontSize:13,display:"flex",alignItems:"center",gap:7}}>
                      <IconDisplay emoji={g.icon} img={g.iconImg} size={16}/>{g.goal}
                    </span>
                    <span style={{fontSize:10,color:TH.textMuted}}>{g.deadline}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div className="pbar" style={{flex:1}}><div className="pfill" style={{width:`${g.progress}%`}}/></div>
                    <span style={{fontSize:10,color:TH.goldDark,width:28,textAlign:"right",fontFamily:"'Share Tech Mono',monospace"}}>{g.progress}%</span>
                  </div>
                </div>
                <button className="edit-btn" onClick={()=>setModal({type:"goal",item:g})}>✏️</button>
              </div>
            ))}
          </div>
          <AddRow onClick={()=>setModal({type:"goal",item:null})} label={t.add_goal} TH={TH}/>
        </div>
      )}
      {activeTab==="chart"&&(
        <div style={{padding:18}}>
          <div style={{display:"flex",alignItems:"center",gap:22,flexWrap:"wrap"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
              <DonutChart done={doneCount} total={tasks.length} size={128} TH={TH}/>
              <p style={{fontSize:10,color:TH.textMuted,letterSpacing:3}}>TODAY</p>
            </div>
            <div style={{flex:1,minWidth:120}}>
              {[...new Set(tasks.map(t2=>t2.category))].map(cat=>{
                const ct=tasks.filter(t2=>t2.category===cat),dc=ct.filter(t2=>t2.done).length;
                return(
                  <div key={cat} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:TH.textDim,marginBottom:3}}>
                      <span>{cat}</span><span style={{color:TH.goldDark}}>{dc}/{ct.length}</span>
                    </div>
                    <div className="pbar"><div className="pfill" style={{width:`${ct.length?(dc/ct.length)*100:0}%`}}/></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const LinksPanel = () => (
    <div style={{background:TH.surface,border:`1px solid ${TH.borderGold}`,borderRadius:3,overflow:"hidden",position:"relative"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${TH.gold}44,transparent)`,zIndex:1}}/>
      <PanelHeader TH={TH} title={t.url_hub} sub={t.url_sub}/>
      {links.map(l=>(
        <div key={l.id} className="row">
          <a href={l.url} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",gap:11,flex:1,textDecoration:"none",color:"inherit",minWidth:0}}>
            <IconDisplay emoji={l.icon} img={l.iconImg} size={18}/>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:13,color:TH.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.name}</p>
              <p style={{fontSize:9,color:TH.textMuted,marginTop:1,letterSpacing:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {l.url.replace("https://","").replace(/\/$/,"")}
              </p>
            </div>
            <span className="badge" style={{color:l.color,borderColor:l.color+"44",fontSize:8,flexShrink:0}}>{l.cat}</span>
            <span style={{fontSize:12,color:l.color,marginLeft:5,flexShrink:0}}>↗</span>
          </a>
          <button className="edit-btn" onClick={()=>setModal({type:"link",item:l})}>✏️</button>
        </div>
      ))}
      <AddRow onClick={()=>setModal({type:"link",item:null})} label={t.add_link} TH={TH}/>
    </div>
  );

  const EventsPanel = () => {
    const ds = new Date(); const todStr=`${ds.getFullYear()}-${String(ds.getMonth()+1).padStart(2,"0")}-${String(ds.getDate()).padStart(2,"0")}`;
    const sorted = [...events].sort((a,b)=>a.date.localeCompare(b.date));
    return(
      <div style={{background:TH.surface,border:`1px solid ${TH.borderGold}`,borderRadius:3,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${TH.gold}44,transparent)`,zIndex:1}}/>
        <PanelHeader TH={TH} title={t.events_title} sub={t.events_sub}
          right={<button className="edit-btn" style={{fontSize:18,color:TH.goldDark}}
            onClick={()=>setModal({type:"event",item:null,initDate:todStr})}>＋</button>}/>
        <div style={{padding:"12px 12px 8px"}}>
          <EventCalendar events={events} onEditEvent={ev=>setModal({type:"event",item:ev,initDate:ev.date})}
            onAddEvent={ds=>setModal({type:"event",item:null,initDate:ds})}
            TH={TH} t={t} calColors={calColors} onCellColor={setCellColor}
            vy={calYear} vm={calMonth} setVY={setCalYear} setVM={setCalMonth}
            tasks={tasks} sched={sched}/>
        </div>
        <div style={{borderTop:`1px solid ${TH.border}`,maxHeight:180,overflowY:"auto"}}>
          {sorted.length===0&&<p style={{padding:"14px",fontSize:12,color:TH.textMuted,textAlign:"center",letterSpacing:2}}>{t.add_event}</p>}
          {sorted.map(ev=>(
            <div key={ev.id} className="row" style={{opacity:ev.date<todStr?.5:1}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:ev.color||TH.gold,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,color:TH.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ev.title}</p>
                <p style={{fontSize:10,color:TH.textMuted,marginTop:1,fontFamily:"'Share Tech Mono',monospace"}}>{ev.date}{ev.time?` · ${ev.time}`:""}</p>
              </div>
              <button className="edit-btn" onClick={()=>setModal({type:"event",item:ev,initDate:ev.date})}>✏️</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Focus + Countdown side by side
  const FocusAndCountdown = () => (
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20}}>
      {/* Focus / Timers */}
      <div style={{background:TH.surface,border:`1px solid ${TH.borderGold}`,borderRadius:3,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${TH.gold}44,transparent)`,zIndex:1}}/>
        <PanelHeader TH={TH} title={t.focus_mode} sub="Liquid Pomodoro · 5:1"/>
        <div style={{padding:"14px 12px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
            {timers.map(cfg=>(
              <LiquidTimerCard key={cfg.id} cfg={cfg} isDefault={cfg.id==="default"}
                onDelete={()=>deleteTimer(cfg.id)} onEdit={()=>setModal({type:"timer",item:cfg})}
                onFocusChange={setFocus} TH={TH}
                t={t} userId={user?.id} unlockAudio={unlockAudio}
                playBowlSound={playBowlSound} sendTimerNotification={sendTimerNotification}/>
            ))}
          </div>
          <AddRow onClick={()=>setModal({type:"timer",item:null})} label={t.add_timer} TH={TH}/>
        </div>
      </div>

      {/* Countdowns */}
      <div style={{background:TH.surface,border:`1px solid ${TH.borderGold}`,borderRadius:3,overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${TH.gold}44,transparent)`,zIndex:1}}/>
        <PanelHeader TH={TH} title={t.countdown_title}
          right={<button className="edit-btn" style={{fontSize:18,color:TH.goldDark}}
            onClick={()=>setModal({type:"countdown",item:null})}>＋</button>}/>
        {/* Big display of active countdown */}
        <div style={{borderBottom:`1px solid ${TH.border}`,background:`radial-gradient(ellipse at center,${TH.gold}07 0%,transparent 70%)`}}>
          <CountdownBig cd={activeCdObj} TH={TH} t={t}/>
        </div>
        {/* List of all countdowns */}
        <div style={{maxHeight:220,overflowY:"auto"}}>
          {cds.length===0&&(
            <p style={{padding:"14px",fontSize:11,color:TH.textMuted,textAlign:"center",letterSpacing:2}}>
              {t.no_countdown}
            </p>
          )}
          {cds.map(cd=>{
            const d=daysUntil(cd.date);
            const isAct=activeCd===cd.id;
            return(
              <div key={cd.id} className="row" style={{background:isAct?`${TH.gold}0a`:undefined}}>
                <div style={{flex:1}}>
                  <p style={{fontSize:13,color:TH.text}}>{cd.name}</p>
                  <p style={{fontSize:10,color:TH.textMuted,marginTop:1,fontFamily:"'Share Tech Mono',monospace"}}>
                    {cd.date} · {d===0?t.today_word:d>0?`${d} ${t.days_left}`:`${Math.abs(d)} ${t.days_past}`}
                  </p>
                </div>
                {/* Set as active */}
                <button onClick={()=>setActiveCd(isAct?null:cd.id)}
                  style={{background:isAct?`${TH.gold}22`:"transparent",
                    border:`1px solid ${isAct?TH.gold:TH.border}`,
                    color:isAct?TH.gold:TH.textMuted,cursor:"pointer",
                    fontSize:9,letterSpacing:2,padding:"3px 8px",borderRadius:1,textTransform:"uppercase"}}>
                  {isAct?"✓ ON":"SET"}
                </button>
                <button className="edit-btn" onClick={()=>setModal({type:"countdown",item:cd})}>✏️</button>
              </div>
            );
          })}
        </div>
        <AddRow onClick={()=>setModal({type:"countdown",item:null})} label={t.add_countdown} TH={TH}/>
      </div>
    </div>
  );

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div style={{minHeight:"100vh",background:TH.bg,
      fontFamily:"'Cormorant Garamond','Noto Serif JP',serif",color:TH.text,position:"relative"}}>
      <style>{css}</style>

      {/* BG */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        backgroundImage:`radial-gradient(ellipse at 15% 15%,${TH.gold}09 0%,transparent 45%),radial-gradient(ellipse at 85% 80%,${TH.gold}06 0%,transparent 45%)`}}/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,
        backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 100px,${TH.gridLine} 100px,${TH.gridLine} 101px),repeating-linear-gradient(90deg,transparent,transparent 100px,${TH.gridLine} 100px,${TH.gridLine} 101px)`}}/>

      {focusMode && <div className="focus-overlay"/>}
      {stepFocusMode && <div className="focus-overlay" style={{zIndex:2999}}/>}

      {stepPlayerRoutine && (
        <RoutineStepPlayer
          routine={stepPlayerRoutine}
          onCompleteStep={completePlayerStep}
          onClose={()=>{ setStepPlayerRoutine(null); setStepFocusMode(false); }}
          TH={TH}
          t={t}
        />
      )}
      <div className={`save-toast${saveFlash?" show":""}`}>✦ SAVED</div>

      {/* SETTINGS */}
      <SettingsPanel open={settingsOpen} onClose={()=>setSettings(false)}
        lang={lang} setLang={setLang} themeName={themeName} setTheme={setTheme}
        userName={userName} setUserName={setUserName}
        streakPct={streakPct} setStreakPct={setStreakPct}
        t={t} TH={TH} user={user}/>

      {/* MODALS */}
      {modal?.type==="task"           && <TaskModal          task={modal.item}  onSave={d=>saveTask(modal.item,d)}   onDelete={deleteTask}   onClose={()=>setModal(null)} t={t} TH={TH}/>}
      {modal?.type==="sched"          && <ScheduleModal       item={modal.item}  onSave={d=>saveSched(modal.item,d)}  onDelete={deleteSched}  onClose={()=>setModal(null)} t={t} TH={TH}/>}
      {modal?.type==="link"           && <LinkModal           link={modal.item}  onSave={d=>saveLink(modal.item,d)}   onDelete={deleteLink}   onClose={()=>setModal(null)} t={t} TH={TH}/>}
      {modal?.type==="goal"           && <GoalModal           goal={modal.item}  onSave={d=>saveGoal(modal.item,d)}   onDelete={deleteGoal}   onClose={()=>setModal(null)} t={t} TH={TH}/>}
      {modal?.type==="event"          && <EventModal          ev={modal.item}    initDate={modal.initDate} onSave={d=>saveEvent(modal.item,d)} onDelete={deleteEvent} onClose={()=>setModal(null)} t={t} TH={TH}/>}
      {modal?.type==="timer"          && <TimerModal          timer={modal.item} onSave={d=>saveTimer(modal.item,d)} onClose={()=>setModal(null)} t={t} TH={TH}/>}
      {modal?.type==="countdown"      && <CountdownModal      cd={modal.item}    onSave={d=>saveCd(modal.item,d)} onDelete={deleteCd} onSetActive={setActiveCd} onClose={()=>setModal(null)} t={t} TH={TH}/>}
      {modal?.type==="streakSettings" && <StreakSettingsModal streakPct={streakPct} onSave={v=>{setStreakPct(v); if(!isOnline) LS.set("apx7_spct",v);}} onClose={()=>setModal(null)} TH={TH} t={t}/>}
      {modal?.type==="clearAll" && (
        <ModalBackdrop onClose={()=>setModal(null)} TH={TH}>
          <ModalHeader title={lang==="ja"?"タスクの削除":"Clear All Tasks"} onClose={()=>setModal(null)} TH={TH}/>
          <p style={{fontSize:14,color:TH.textDim,marginBottom:28,lineHeight:1.8,textAlign:"center"}}>
            {lang==="ja"
              ? "全てのタスクを削除します。この操作は元に戻せません。"
              : "This will delete all tasks. This cannot be undone."}
          </p>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button onClick={()=>setModal(null)} style={{
              background:"transparent",border:`1px solid ${TH.border}`,color:TH.textDim,
              cursor:"pointer",fontFamily:"inherit",fontSize:12,letterSpacing:3,
              padding:"11px 28px",borderRadius:2,textTransform:"uppercase",
            }}>
              {lang==="ja"?"戻る":"Cancel"}
            </button>
            <button onClick={()=>{setTasks([]);setModal(null);}} style={{
              background:"#FF333322",border:"1px solid #FF555566",color:"#FF9999",
              cursor:"pointer",fontFamily:"inherit",fontSize:12,letterSpacing:3,
              padding:"11px 28px",borderRadius:2,textTransform:"uppercase",fontWeight:600,
            }}>
              {lang==="ja"?"削除する":"Delete All"}
            </button>
          </div>
        </ModalBackdrop>
      )}

      <div style={{position:"relative",zIndex:focusMode?51:1,maxWidth:1340,margin:"0 auto",
        padding:isMobile?"18px 14px 90px":"26px 22px 34px"}}>

        {/* HEADER */}
        <div className="si" style={{animationDelay:"0s",marginBottom:22}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:14}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:5}}>
                <div className="glow-dot"/>
                <span style={{fontSize:10,letterSpacing:5,color:TH.goldDark,textTransform:"uppercase"}}>High Performance OS</span>
              </div>
              <h1 style={{fontSize:"clamp(22px,3.8vw,46px)",fontWeight:300,letterSpacing:".12em",color:TH.text,lineHeight:1.05}}>
                <span style={{color:TH.gold,fontWeight:600,textShadow:`0 0 30px ${TH.gold}44`}}>APEX</span> HUB
              </h1>
              <p style={{fontSize:13,color:TH.goldLight,letterSpacing:2,marginTop:5,fontStyle:"italic"}}>{greeting()}</p>
              <p style={{fontSize:10,color:TH.textMuted,letterSpacing:4,marginTop:3}}>{t.tagline}</p>
            </div>
            <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:7}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                {/* Sync status badge */}
                {syncStatus !== "idle" && (
                  <div style={{
                    display:"flex",alignItems:"center",gap:5,
                    padding:"4px 10px",borderRadius:2,fontSize:10,letterSpacing:2,
                    border:`1px solid ${syncStatus==="error"?"#FF444466":syncStatus==="syncing"?TH.borderGold:TH.goldDark+"66"}`,
                    color: syncStatus==="error"?"#FF7777":syncStatus==="syncing"?TH.textDim:TH.gold,
                    background: syncStatus==="error"?"#FF222211":"transparent",
                    transition:"all .3s",
                  }}>
                    {syncStatus==="syncing" && <span style={{animation:"pulse 1s infinite"}}>⟳</span>}
                    {syncStatus==="saved"   && "✦"}
                    {syncStatus==="error"   && "✕"}
                    <span>
                      {syncStatus==="syncing" ? (lang==="ja"?"同期中...":"Syncing...")
                      :syncStatus==="saved"   ? (lang==="ja"?"保存完了":"Saved")
                      :                         (lang==="ja"?"同期エラー":"Sync error")}
                    </span>
                  </div>
                )}
                {/* Profile avatar or gear */}
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url} alt=""
                    onClick={()=>setSettings(true)}
                    style={{width:32,height:32,borderRadius:"50%",cursor:"pointer",
                      border:`2px solid ${TH.goldDark}`,
                      boxShadow:`0 0 8px ${TH.gold}44`,
                      transition:"box-shadow .2s"}}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow=`0 0 14px ${TH.gold}88`}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow=`0 0 8px ${TH.gold}44`}
                    title={user.user_metadata?.full_name || user.email}
                  />
                ) : (
                  <button className="gear" onClick={()=>setSettings(true)}>⚙️</button>
                )}
                <button className="iodbtn" onClick={exportData}>{t.export_btn}</button>
                <button className="iodbtn" onClick={importData}>{t.import_btn}</button>
              </div>
              <div className="clock">{timeStr}</div>
              <p style={{fontSize:10,color:TH.textMuted,letterSpacing:1}}>{dateStr}</p>
              {/* Active countdown on header */}
              {activeCdObj&&(()=>{
                const d=daysUntil(activeCdObj.date);
                const c=d===0?TH.goldLight:d<0?"#FF7777":TH.gold;
                return(
                  <div style={{display:"flex",alignItems:"center",gap:8,
                    background:`${TH.gold}0f`,border:`1px solid ${TH.goldDark}44`,
                    padding:"5px 12px",borderRadius:2}}>
                    <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:20,fontWeight:700,color:c}}>
                      {d===0?t.today_word:Math.abs(d)}
                    </span>
                    <div>
                      <p style={{fontSize:9,color:TH.textMuted,letterSpacing:2,textTransform:"uppercase"}}>
                        {d===0?t.today_word:d>0?t.days_left:t.days_past}
                      </p>
                      <p style={{fontSize:9,color:TH.gold,letterSpacing:1}}>{activeCdObj.name}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          <div style={{marginTop:18,height:1,
            background:`linear-gradient(90deg,transparent,${TH.goldDark}88,${TH.gold},${TH.goldLight},${TH.gold},${TH.goldDark}88,transparent)`}}/>
        </div>

        {/* QUOTE */}
        <div className="si" style={{animationDelay:".08s",marginBottom:18,textAlign:"center"}}>
          <p className="quote-text" key={`${quoteIdx}-${lang}`}>「 {QUOTES[quoteIdx]} 」</p>
        </div>

        {/* STATS */}
        <div className="si" style={{animationDelay:".13s",marginBottom:22,
          display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:12}}>

          {/* Streak — click to edit threshold */}
          <div className="stat-card" onClick={()=>setModal({type:"streakSettings"})}
            style={{
              cursor:"pointer",
              background:metThreshold?`radial-gradient(ellipse at center,${TH.gold}18 0%,${TH.surface} 70%)`:TH.surface,
              border:`1px solid ${metThreshold?TH.gold:TH.borderGold}`,
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            }}>
            <div style={{fontSize:metThreshold?34:26,lineHeight:1}}>🔥</div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:30,fontWeight:700,
              color:metThreshold?TH.goldLight:TH.gold,lineHeight:1}}>{streak}</div>
            <div style={{fontSize:9,color:TH.textMuted,letterSpacing:3,textTransform:"uppercase",textAlign:"center"}}>
              {metThreshold?t.perfect_day:t.streak_label}
            </div>
            <div style={{fontSize:9,color:TH.textMuted,marginTop:2}}>≥{streakPct}% routine · ✏️</div>
          </div>

          {/* Task Rate + Routine Rate — side by side in one card */}
          <div className="stat-card" style={{gridColumn:"span 2"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0,height:"100%"}}>
              {/* Task */}
              <div style={{paddingRight:12,borderRight:`1px solid ${TH.border}`}}>
                <div style={{fontSize:9,letterSpacing:3,color:TH.textMuted,textTransform:"uppercase",marginBottom:6}}>{t.task_rate}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:3,marginBottom:6}}>
                  <span style={{fontSize:28,fontWeight:600,color:TH.gold,lineHeight:1,fontFamily:"'Share Tech Mono',monospace"}}>{taskPct}</span>
                  <span style={{fontSize:13,color:TH.goldDark}}>%</span>
                  <span style={{fontSize:10,color:TH.textMuted,marginLeft:4}}>{doneCount}/{tasks.length}</span>
                </div>
                <div className="pbar"><div className="pfill" style={{width:`${taskPct}%`}}/></div>
              </div>
              {/* Routine */}
              <div style={{paddingLeft:12}}>
                <div style={{fontSize:9,letterSpacing:3,color:TH.textMuted,textTransform:"uppercase",marginBottom:6}}>{t.routine_lbl}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:3,marginBottom:6}}>
                  <span style={{fontSize:28,fontWeight:600,color:metThreshold?TH.goldLight:TH.gold,lineHeight:1,fontFamily:"'Share Tech Mono',monospace"}}>
                    {routinePct}
                  </span>
                  <span style={{fontSize:13,color:TH.goldDark}}>%</span>
                  <span style={{fontSize:10,color:TH.textMuted,marginLeft:4}}>{schedDone}/{activeSched.length}</span>
                </div>
                <div className="pbar"><div className="pfill" style={{width:`${routinePct}%`}}/></div>
              </div>
            </div>
          </div>

          {/* Goals — total / achieved */}
          {(()=>{
            const achieved = goals.filter(g => g.progress >= 100).length;
            return (
              <div className="stat-card">
                <div style={{fontSize:9,letterSpacing:3,color:TH.textMuted,textTransform:"uppercase",marginBottom:7}}>{t.active_goals}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                  <span style={{fontSize:28,fontWeight:600,color:TH.gold,lineHeight:1,fontFamily:"'Share Tech Mono',monospace"}}>{goals.length}</span>
                  <span style={{fontSize:11,color:TH.textMuted}}>total</span>
                </div>
                <div style={{fontSize:10,color:TH.goldDark,marginTop:4,letterSpacing:1}}>
                  ✓ {achieved} achieved
                </div>
              </div>
            );
          })()}
        </div>

        {/* PARTNER SYNC — responsive full-width panel */}
        <div className="si mb-5 sm:mb-6" style={{animationDelay:".17s"}}>
          <div className="min-h-[320px] sm:min-h-[360px]">
            <PartnerPanelWrap/>
          </div>
        </div>

        {/* FOCUS + COUNTDOWN — always shown, 2 columns, NO dk-grid class */}
        <div className="si" style={{animationDelay:".2s",marginBottom:22,
          display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20}}>

          {/* Focus / Timers — collapsible */}
          <div style={{background:TH.surface,border:`1px solid ${TH.borderGold}`,borderRadius:3,overflow:"hidden",position:"relative"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${TH.gold}44,transparent)`,zIndex:1}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"12px 15px 10px",borderBottom:showPomo?`1px solid ${TH.border}`:"none",cursor:"pointer"}}
              onClick={()=>setPomo(p=>!p)}>
              <div>
                <h2 style={{fontSize:12,letterSpacing:4,color:TH.gold,textTransform:"uppercase",fontWeight:400}}>{t.focus_mode}</h2>
                <p style={{fontSize:10,color:TH.textMuted,marginTop:2,letterSpacing:1}}>Liquid Pomodoro · 5:1</p>
              </div>
              <span style={{fontSize:18,color:TH.goldDark,transform:showPomo?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
            </div>
            {showPomo && (
              <div style={{padding:"14px 12px",display:"flex",flexDirection:"column",gap:12}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
                  {timers.map(cfg=>(
                    <LiquidTimerCard key={cfg.id} cfg={cfg} isDefault={cfg.id==="default"}
                      onDelete={()=>deleteTimer(cfg.id)} onEdit={()=>setModal({type:"timer",item:cfg})}
                      onFocusChange={setFocus} TH={TH}
                      t={t} userId={user?.id} unlockAudio={unlockAudio}
                      playBowlSound={playBowlSound} sendTimerNotification={sendTimerNotification}/>
                  ))}
                </div>
                <AddRow onClick={()=>setModal({type:"timer",item:null})} label={t.add_timer} TH={TH}/>
              </div>
            )}
          </div>

          {/* Countdowns — always fully visible */}
          <div style={{background:TH.surface,border:`1px solid ${TH.borderGold}`,borderRadius:3,overflow:"hidden",position:"relative"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${TH.gold}44,transparent)`,zIndex:1}}/>
            <PanelHeader TH={TH} title={t.countdown_title}
              right={<button style={{background:"none",border:"none",fontSize:18,color:TH.goldDark,cursor:"pointer"}}
                onClick={()=>setModal({type:"countdown",item:null})}>＋</button>}/>
            {/* Big display of active countdown */}
            <div style={{borderBottom:`1px solid ${TH.border}`,
              background:`radial-gradient(ellipse at center,${TH.gold}07 0%,transparent 70%)`}}>
              <CountdownBig cd={activeCdObj} TH={TH} t={t}/>
            </div>
            {/* List */}
            <div style={{maxHeight:200,overflowY:"auto"}}>
              {cds.length===0 && (
                <p style={{padding:"14px",fontSize:11,color:TH.textMuted,textAlign:"center",letterSpacing:2}}>
                  {t.no_countdown}
                </p>
              )}
              {cds.map(cd=>{
                const d=daysUntil(cd.date), isAct=activeCd===cd.id;
                return(
                  <div key={cd.id} className="row" style={{background:isAct?`${TH.gold}0a`:undefined}}>
                    <div style={{flex:1}}>
                      <p style={{fontSize:13,color:TH.text}}>{cd.name}</p>
                      <p style={{fontSize:10,color:TH.textMuted,marginTop:1,fontFamily:"'Share Tech Mono',monospace"}}>
                        {cd.date} · {d===0?t.today_word:d>0?`${d} ${t.days_left}`:`${Math.abs(d)} ${t.days_past}`}
                      </p>
                    </div>
                    <button onClick={()=>setActiveCd(isAct?null:cd.id)}
                      style={{background:isAct?`${TH.gold}22`:"transparent",
                        border:`1px solid ${isAct?TH.gold:TH.border}`,
                        color:isAct?TH.gold:TH.textMuted,cursor:"pointer",
                        fontSize:9,letterSpacing:2,padding:"3px 8px",borderRadius:1,textTransform:"uppercase"}}>
                      {isAct?"✓ ON":"SET"}
                    </button>
                    <button className="edit-btn" onClick={()=>setModal({type:"countdown",item:cd})}>✏️</button>
                  </div>
                );
              })}
            </div>
            <AddRow onClick={()=>setModal({type:"countdown",item:null})} label={t.add_countdown} TH={TH}/>
          </div>
        </div>

        {/* DESKTOP GRID */}
        <div className="dk-grid si" style={{animationDelay:".26s",display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <SchedulePanel maxH={500}/>
          <div style={{display:"flex",flexDirection:"column",gap:18}}>
            <TasksPanel/>
            <LinksPanel/>
          </div>
        </div>
        <div className="dk-grid si" style={{animationDelay:".32s",marginTop:20}}>
          <EventsPanel/>
        </div>

        {/* MOBILE */}
        <div className="mob-content" style={{flexDirection:"column",gap:0}}>
          {mobSec==="schedule"&&<SchedulePanel maxH={99999}/>}
          {mobSec==="partner"&&<div className="min-h-[70vh]"><PartnerPanelWrap/></div>}
          {mobSec==="tasks"&&<div style={{display:"flex",flexDirection:"column",gap:16}}><TasksPanel/></div>}
          {mobSec==="links"&&<LinksPanel/>}
          {mobSec==="events"&&<EventsPanel/>}
        </div>

        {/* FOOTER */}
        {!isMobile&&(
          <div style={{marginTop:26,textAlign:"center"}}>
            <div style={{height:1,background:`linear-gradient(90deg,transparent,${TH.goldDark}55,${TH.gold}88,${TH.goldDark}55,transparent)`,marginBottom:12}}/>
            <p style={{fontSize:10,color:TH.textMuted,letterSpacing:5,textTransform:"uppercase"}}>{t.footer}</p>
          </div>
        )}
      </div>

      {/* MOBILE NAV */}
      <nav className="mob-bar" style={{position:"fixed",bottom:0,left:0,right:0,display:"flex",
        borderTop:`1px solid ${TH.goldDark}44`,background:TH.bg2,zIndex:100,
        paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        {[
          {key:"schedule",icon:"🗓",label:t.mob_routine},
          {key:"partner", icon:"🤝",label:t.mob_partner},
          {key:"tasks",   icon:"✅",label:t.mob_tasks},
          {key:"links",   icon:"🔗",label:t.mob_links},
          {key:"events",  icon:"📅",label:t.mob_events},
        ].map(({key,icon,label})=>(
          <button key={key} className={`mob-nav${mobSec===key?" active":""}`} onClick={()=>setMob(key)}>
            <span style={{fontSize:20}}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
        <button className="mob-nav" onClick={()=>setSettings(true)}>
          <span style={{fontSize:20}}>⚙️</span>
          <span>{t.settings}</span>
        </button>
      </nav>
    </div>
  );
} 
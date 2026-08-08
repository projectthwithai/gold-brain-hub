"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export type Language = "ja" | "en";
export type Theme = "black" | "white";

interface SettingsContextType {
  lang: Language;
  theme: Theme;
  userId: string; // ★全タブ連動用 ログインアカウントID ("guest" または ユーザーID)
  setLang: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  t: (jaText: string, enText?: string) => string;
  themeStyles: {
    bgMain: string;
    bgCard: string;
    bgInner: string;
    textMain: string;
    textSub: string;
    gold: string;
    border: string;
  };
}

// 🌐 アプリ全体対応のUI翻訳辞書 (日本語 ⇄ 英語)
const translationMap: Record<string, string> = {
  // 7大メインタブ
  "📜 ルーティン": "📜 Routines",
  "⏱️ 戦術タイマー": "⏱️ Tactical Timer",
  "✅ タスク管理": "✅ Task Board",
  "📅 カレンダー WIN/LOSE": "📅 Calendar WIN/LOSE",
  "🔗 有益URL/Lab": "🔗 Useful Portal",
  "📊 研究所データ": "📊 Analytics Data",
  "🤝 相棒監視": "🤝 Partner Monitor",
  "📱 兵站調達": "📱 Logistics",

  // 最上部 Streak & カウントダウン
  "日連続達成中": " Days Streak",
  "本日達成度 / 判定基準": "Today's Progress / Target",
  "判定モード:": "Target Mode:",
  "⚙️ 基準設定": "⚙️ Target Settings",
  "イベントカウントダウン": "Event Countdown",
  "▲ 閉じる": "▲ Close",
  "▼ 開く": "▼ Open",
  "あと": "In ",
  "日": " Days",
  "🔥 本日当日！": "🔥 Today!",
  "日経過": " Days Ago",

  // 1. ルーティン統制 (RoutineList)
  "📜 日課ルーティン統制": "📜 Routine Control Center",
  "⚙️ モード種類管理": "⚙️ Manage Modes",
  "＋ 新規日課作成": "＋ New Routine",
  "本日の日課達成度": "Today's Routine Progress",
  "🔥 【平日】実行日課:": "🔥 Active Routines:",
  "🔥 【休日/祝日】実行日課:": "🔥 Active Routines:",
  "🔥 【長期休み】実行日課:": "🔥 Active Routines:",
  "💤 本日対象外 (次回準備中の日課):": "💤 Inactive Today (Upcoming):",
  "全画面手順": "Fullscreen Steps",
  "スキップ ⏩": "Skip ⏩",
  "⏱️ 起動": "⏱️ Start",
  "✏️ 編集": "✏️ Edit",
  "🗑️ 削除": "🗑️ Delete",
  "📅 毎日": "📅 Daily",
  "日に1回": "Days Interval",
  "📆 曜日:": "📆 Days:",
  "🎯 現在:": "🎯 Current:",

  // 2. 戦術タイマー (TacticalTimer)
  "⏱️ 戦術的タイマー (実稼働1/5動的ポモドーロ計算)": "⏱️ Tactical Timer (1/5 Auto Break)",
  "☕ 自動計算 1/5 休憩タイマー": "☕ 1/5 Auto Break Timer",
  "🏷️ 作業選択肢の管理": "🏷️ Task Options",
  "＋ 新規タイマー作成": "＋ New Timer",
  "🎯 作業項目を選択:": "🎯 Select Task:",
  "設定比率:": "Ratio:",
  "⏱️ 現在の実作業時間:": "⏱️ Actual Work Time:",
  "💡 今停止した場合のお得休憩:": "💡 Break Time If Stopped Now:",
  "🔔 中間アラート:": "🔔 Mid-Alert:",
  "🔊 アラーム:": "🔊 Alarm:",
  "🎒 休憩温存:": "🎒 Break Saved:",
  "切替": "Toggle",
  "一時停止": "Pause",
  "集中開始": "Start Focus",
  "休憩開始": "Start Break",
  "作業完了 ➔ 実作業の1/5自動休憩へ": "Complete Work ➔ 1/5 Auto Break",
  "作業へ戻る ➔": "Return to Work ➔",
  "🗑️ リセット": "🗑️ Reset",
  "1回だけ": "Once",
  "無音": "Silent",
  "連射停止": "Continuous",
  "経過時": " Elapsed",

  // 3. タスク管理 (TaskManager)
  "✅ タスク管理ボード (カレンダー青色連動対応)": "✅ Task Control Board",
  "🏷️ ジャンル選択肢の管理": "🏷️ Categories",
  "＋ 新規タスク追加:": "＋ Add Task:",
  "タスク追加": "Add Task",
  "🔥 実行中タスク:": "🔥 Active Tasks:",
  "タスクはありません": "No tasks available",
  "📄 メモを開く": "📄 Open Note",
  "✔ 本日完了タスク (※24時間後に自動消去されます):": "✔ Completed Today (Auto-cleared in 24h):",
  "🔵 カレンダー表示ON": "🔵 Calendar ON",

  // 4. カレンダー (Calendar)
  "📅 カレンダー審判 (WIN/LOSE ＆ 赤:ルーティン / 青:タスク連動)": "📅 Calendar Judgement (WIN/LOSE)",
  "※日付マスをクリックすると特定日の予定メモを書けます": "* Click a date cell to add schedule notes or countdowns",
  "予定メモ:": "Schedule Note:",
  "⏳ この日へのカウントダウン設定:": "⏳ Countdown Setup:",
  "この日付のカウントダウンはありません": "No countdowns for this date",

  // モーダル & ボタン共通
  "環境設定": "System Settings",
  "表示言語": "Language",
  "カラーテーマ": "Color Theme",
  "設定を適用して閉じる": "Apply & Close",
  "保存": "Save",
  "保存する": "Save",
  "キャンセル": "Cancel",
  "閉じる": "Close",
  "完了": "Done",
};

// 逆引き辞書 (英語 ➔ 日本語)
const reverseMap: Record<string, string> = {};
Object.entries(translationMap).forEach(([ja, en]) => {
  reverseMap[en] = ja;
});

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>("ja");
  const [theme, setThemeState] = useState<Theme>("black");
  const [userId, setUserId] = useState<string>("guest"); // ★追加: アカウントID★
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

// ★全タブ連動用 ログインアカウント(userId)のリアルタイム監視★
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }: any) => {
      setUserId(data?.session?.user?.id || "guest");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUserId(session?.user?.id || "guest");
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("gbh_lang") as Language;
      if (savedLang) setLangState(savedLang);
      const savedTheme = localStorage.getItem("gbh_theme") as Theme;
      if (savedTheme) setThemeState(savedTheme);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    if (typeof window !== "undefined") localStorage.setItem("gbh_lang", newLang);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") localStorage.setItem("gbh_theme", newTheme);
  };

  const t = (jaText: string, enText?: string) => {
    if (lang === "ja") return jaText;
    if (enText) return enText;
    return translationMap[jaText] || jaText;
  };

  // 🌐 DOM テキストノード自動置換（ユーザー入力以外を英語/日本語へ自動変換）
  useEffect(() => {
    if (typeof window === "undefined") return;

    const translateDOM = () => {
      const root = document.querySelector('[data-theme]');
      if (!root) return;

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
      let node: Node | null = walker.nextNode();

      while (node) {
        const text = node.nodeValue?.trim();
        const parent = node.parentElement;

        // ユーザーの直接入力エリア (input, textarea) は自動置換から除外
        const isInput = parent && (parent.tagName === "INPUT" || parent.tagName === "TEXTAREA" || parent.isContentEditable);

        if (text && !isInput) {
          if (lang === "en") {
            if (translationMap[text]) {
              node.nodeValue = node.nodeValue!.replace(text, translationMap[text]);
            } else {
              Object.entries(translationMap).forEach(([ja, en]) => {
                if (text.includes(ja)) {
                  node!.nodeValue = node!.nodeValue!.replace(ja, en);
                }
              });
            }
          } else {
            if (reverseMap[text]) {
              node.nodeValue = node.nodeValue!.replace(text, reverseMap[text]);
            } else {
              Object.entries(reverseMap).forEach(([en, ja]) => {
                if (text.includes(en)) {
                  node!.nodeValue = node!.nodeValue!.replace(en, ja);
                }
              });
            }
          }
        }
        node = walker.nextNode();
      }
    };

    translateDOM();
    const interval = setInterval(translateDOM, 400); // 動的更新対応

    return () => clearInterval(interval);
  }, [lang]);

  const themeStyles = theme === "black" ? {
    bgMain: "#050505",
    bgCard: "#0d0d0d",
    bgInner: "#151515",
    textMain: "#ffffff",
    textSub: "#aaa",
    gold: "#C9A84C",
    border: "#222",
  } : {
    bgMain: "#f4f4f6",
    bgCard: "#ffffff",
    bgInner: "#f0f0f4",
    textMain: "#111827",
    textSub: "#4b5563",
    gold: "#b48811",
    border: "#d1d5db",
  };

  return (
    <SettingsContext.Provider value={{ lang, theme, userId, setLang, setTheme, isSettingsOpen, setIsSettingsOpen, t, themeStyles }}>
      <style>{`
        ${theme === "white" ? `
          body, [data-theme] {
            background-color: #f4f4f6 !important;
            color: #111827 !important;
          }

          [data-theme] div {
            background-color: #ffffff !important;
            border-color: #e5e7eb !important;
            color: #111827 !important;
          }

          [data-theme] div[style*="fixed"],
          [data-theme] div[style*="absolute"] {
            background-color: rgba(255,255,255,0.95) !important;
          }

          [data-theme] span,
          [data-theme] p,
          [data-theme] h1,
          [data-theme] h2,
          [data-theme] h3,
          [data-theme] h4,
          [data-theme] strong,
          [data-theme] label,
          [data-theme] td,
          [data-theme] th {
            color: #111827 !important;
          }

          [data-theme] input,
          [data-theme] select,
          [data-theme] textarea {
            background-color: #f9fafb !important;
            color: #111827 !important;
            border-color: #d1d5db !important;
          }

          [data-theme] button {
            background-color: #f3f4f6 !important;
            color: #111827 !important;
            border-color: #d1d5db !important;
          }

          [data-theme] *[style*="C9A84C"],
          [data-theme] *[style*="c9a84c"] {
            color: #b48811 !important;
            border-color: #b48811 !important;
          }

          [data-theme] div[style*="monospace"] {
            color: #b48811 !important;
          }
        ` : ""}
      `}</style>

      <div data-theme={theme} style={{ background: themeStyles.bgMain, color: themeStyles.textMain, minHeight: "100vh", transition: "all 0.3s ease" }}>
        {children}
      </div>
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      lang: "ja" as Language,
      theme: "black" as Theme,
      userId: "guest",
      setLang: () => {},
      setTheme: () => {},
      isSettingsOpen: false,
      setIsSettingsOpen: () => {},
      t: (jaText: string) => jaText,
      themeStyles: {
        bgMain: "#050505",
        bgCard: "#0d0d0d",
        bgInner: "#151515",
        textMain: "#ffffff",
        textSub: "#aaa",
        gold: "#C9A84C",
        border: "#222",
      }
    };
  }
  return context;
};
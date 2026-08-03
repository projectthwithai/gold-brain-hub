"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "ja" | "en";
export type Theme = "black" | "white";

interface SettingsContextType {
  lang: Language;
  theme: Theme;
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

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>("ja");
  const [theme, setThemeState] = useState<Theme>("black");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

    const dict: Record<string, string> = {
      "📜 ルーティン": "📜 Routines",
      "⏱️ 戦術タイマー": "⏱️ Tactical Timer",
      "✅ タスク管理": "✅ Tasks",
      "📅 カレンダー WIN/LOSE": "📅 Calendar WIN/LOSE",
      "🔗 有益URL/Lab": "🔗 Useful URLs/Lab",
      "📊 研究所データ": "📊 Analytics Data",
      "🤝 相棒監視": "🤝 Partner Panel",
      "📱 兵站調達": "📱 Equipment",
      "⚙️ モード種類管理": "⚙️ Modes",
      "＋ 新規日課作成": "＋ Create Routine",
      "本日の日課達成度": "Today's Routine Progress",
      "実行日課:": "Active Routines:",
      "全画面手順": "Fullscreen Steps",
      "スキップ ⏩": "Skip ⏩",
      "⏱️ 起動": "⏱️ Start",
      "✏️ 編集": "✏️ Edit",
      "🗑️ 削除": "🗑️ Delete",
      "保存する": "Save",
      "キャンセル": "Cancel",
      "閉じる": "Close",
      "環境設定": "Settings"
    };

    return dict[jaText] || jaText;
  };

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
    <SettingsContext.Provider value={{ lang, theme, setLang, setTheme, isSettingsOpen, setIsSettingsOpen, t, themeStyles }}>
      {/* 🎨 全要素に対する強力なWhite & Gold適用CSS */}
      <style>{`
        ${theme === "white" ? `
          [data-theme="white"],
          [data-theme="white"] body {
            background-color: #f4f4f6 !important;
            color: #111827 !important;
          }

          /* 全てのカード・ブロックの背景をホワイトへ一括強制反転 */
          [data-theme="white"] div {
            background-color: #ffffff !important;
            border-color: #e5e7eb !important;
            color: #111827 !important;
          }

          /* 特殊背景や最深ブロックの明るさ補正 */
          [data-theme="white"] div[style*="fixed"],
          [data-theme="white"] div[style*="absolute"] {
            background-color: rgba(255,255,255,0.95) !important;
          }

          /* テキスト全般をくっきり見やすい濃いグレー（#111827）に一括置換 */
          [data-theme="white"] span,
          [data-theme="white"] p,
          [data-theme="white"] h1,
          [data-theme="white"] h2,
          [data-theme="white"] h3,
          [data-theme="white"] h4,
          [data-theme="white"] strong,
          [data-theme="white"] label,
          [data-theme="white"] td,
          [data-theme="white"] th {
            color: #111827 !important;
          }

          /* フォーム入力欄の背景と文字色 */
          [data-theme="white"] input,
          [data-theme="white"] select,
          [data-theme="white"] textarea {
            background-color: #f9fafb !important;
            color: #111827 !important;
            border-color: #d1d5db !important;
          }

          /* ボタン類のカラーテーマ最適化 */
          [data-theme="white"] button {
            background-color: #f3f4f6 !important;
            color: #111827 !important;
            border-color: #d1d5db !important;
          }

          /* ゴールド強調要素を白背景で見やすいダークゴールド(#b48811)に自動補正 */
          [data-theme="white"] *[style*="C9A84C"],
          [data-theme="white"] *[style*="c9a84c"] {
            color: #b48811 !important;
            border-color: #b48811 !important;
          }

          /* タイマー数字等の金文字テキスト補正 */
          [data-theme="white"] div[style*="monospace"] {
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
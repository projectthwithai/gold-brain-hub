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

  // 言語辞書による自動翻訳変換
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
      {/* 🎨 アプリ全体の全コンポーネントへ White & Gold / Black & Gold を強制適用させる一括テーマCSS */}
      <style>{`
        ${theme === "white" ? `
          body, [data-theme="gbh-root"] {
            background-color: #f4f4f6 !important;
            color: #111827 !important;
          }

          /* 黒背景・カードを一括して高級感のあるホワイト＆ライトグレー背景に切り替え */
          [data-theme="gbh-root"] div[style*="background: #050505"],
          [data-theme="gbh-root"] div[style*="background: \"#050505\""],
          [data-theme="gbh-root"] div[style*="background: #0d0d0d"],
          [data-theme="gbh-root"] div[style*="background: \"#0d0d0d\""],
          [data-theme="gbh-root"] div[style*="background: #151515"],
          [data-theme="gbh-root"] div[style*="background: \"#151515\""],
          [data-theme="gbh-root"] div[style*="background: #111"],
          [data-theme="gbh-root"] div[style*="background: \"#111\""],
          [data-theme="gbh-root"] div[style*="background: #1a1a1a"],
          [data-theme="gbh-root"] div[style*="background: #1f1a08"],
          [data-theme="gbh-root"] div[style*="background: #222"],
          [data-theme="gbh-root"] div[style*="background: #181818"],
          [data-theme="gbh-root"] div[style*="background: #000"] {
            background-color: #ffffff !important;
            border-color: #e5e7eb !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          }

          /* 入力フォーム類の背景と文字色補正 */
          [data-theme="gbh-root"] input,
          [data-theme="gbh-root"] select,
          [data-theme="gbh-root"] textarea {
            background-color: #f9fafb !important;
            color: #111827 !important;
            border-color: #d1d5db !important;
          }

          /* 白文字・テキスト色を濃いグレー（#111827）へ反転 */
          [data-theme="gbh-root"] span,
          [data-theme="gbh-root"] h3,
          [data-theme="gbh-root"] h4,
          [data-theme="gbh-root"] strong,
          [data-theme="gbh-root"] label,
          [data-theme="gbh-root"] p,
          [data-theme="gbh-root"] div {
            color: #111827;
          }

          /* ゴールド文字・枠線を白背景で見やすいダークゴールド（#b48811）に自動補正 */
          [data-theme="gbh-root"] *[style*="C9A84C"],
          [data-theme="gbh-root"] *[style*="c9a84c"] {
            color: #b48811 !important;
            border-color: #b48811 !important;
          }

          /* ボタン背景と文字色の最適化 */
          [data-theme="gbh-root"] button[style*="background: #C9A84C"],
          [data-theme="gbh-root"] button[style*="background: \"#C9A84C\""] {
            background-color: #b48811 !important;
            color: #ffffff !important;
          }

          [data-theme="gbh-root"] button[style*="background: #222"],
          [data-theme="gbh-root"] button[style*="background: #111"] {
            background-color: #e5e7eb !important;
            color: #111827 !important;
            border-color: #d1d5db !important;
          }
        ` : ""}
      `}</style>

      <div data-theme="gbh-root" style={{ background: themeStyles.bgMain, color: themeStyles.textMain, minHeight: "100vh", transition: "all 0.3s ease" }}>
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
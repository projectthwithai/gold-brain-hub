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
  t: (jaText: string, enText: string) => string;
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

  const t = (jaText: string, enText: string) => (lang === "ja" ? jaText : enText);

  // Black & Gold vs White & Gold の配色定義
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
    bgInner: "#eef0f4",
    textMain: "#111827",
    textSub: "#6b7280",
    gold: "#b48811",
    border: "#d1d5db",
  };

  return (
    <SettingsContext.Provider value={{ lang, theme, setLang, setTheme, isSettingsOpen, setIsSettingsOpen, t, themeStyles }}>
      <div style={{ background: themeStyles.bgMain, color: themeStyles.textMain, minHeight: "100vh", transition: "background 0.3s, color 0.3s" }}>
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
"use client";
import React from "react";
import { useSettings } from "./SettingsContext";

export default function SettingsModal() {
  const { lang, theme, setLang, setTheme, isSettingsOpen, setIsSettingsOpen, t, themeStyles } = useSettings();

  if (!isSettingsOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
      <div style={{ background: themeStyles.bgCard, border: `1px solid ${themeStyles.gold}`, padding: "24px", borderRadius: "10px", width: "360px", color: themeStyles.textMain, boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: themeStyles.gold, fontSize: "18px" }}>
            ⚙️ {t("環境設定", "System Settings")}
          </h3>
          <button onClick={() => setIsSettingsOpen(false)} style={{ background: "none", border: "none", color: themeStyles.textSub, cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}>
            ✕
          </button>
        </div>

        {/* 1. 言語設定 (日本語 / English) */}
        <div style={{ marginBottom: "20px", background: themeStyles.bgInner, padding: "14px", borderRadius: "8px", border: `1px solid ${themeStyles.border}` }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: themeStyles.gold, display: "block", marginBottom: "10px" }}>
            🌐 {t("表示言語", "Language")}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setLang("ja")}
              style={{
                flex: 1, padding: "8px",
                background: lang === "ja" ? themeStyles.gold : themeStyles.bgCard,
                color: lang === "ja" ? "#000" : themeStyles.textSub,
                border: `1px solid ${themeStyles.gold}`,
                borderRadius: "6px", fontWeight: "bold", fontSize: "12px", cursor: "pointer"
              }}
            >
              🇯🇵 日本語
            </button>
            <button
              onClick={() => setLang("en")}
              style={{
                flex: 1, padding: "8px",
                background: lang === "en" ? themeStyles.gold : themeStyles.bgCard,
                color: lang === "en" ? "#000" : themeStyles.textSub,
                border: `1px solid ${themeStyles.gold}`,
                borderRadius: "6px", fontWeight: "bold", fontSize: "12px", cursor: "pointer"
              }}
            >
              🇺🇸 English
            </button>
          </div>
        </div>

        {/* 2. カラーテーマ設定 (Black & Gold / White & Gold) */}
        <div style={{ marginBottom: "20px", background: themeStyles.bgInner, padding: "14px", borderRadius: "8px", border: `1px solid ${themeStyles.border}` }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: themeStyles.gold, display: "block", marginBottom: "10px" }}>
            🎨 {t("カラーテーマ", "Color Theme")}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setTheme("black")}
              style={{
                flex: 1, padding: "10px",
                background: theme === "black" ? "#000" : themeStyles.bgCard,
                color: theme === "black" ? "#C9A84C" : themeStyles.textSub,
                border: `2px solid ${theme === "black" ? "#C9A84C" : themeStyles.border}`,
                borderRadius: "6px", fontWeight: "bold", fontSize: "12px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
              }}
            >
              🌙 Black & Gold
            </button>
            <button
              onClick={() => setTheme("white")}
              style={{
                flex: 1, padding: "10px",
                background: theme === "white" ? "#fff" : themeStyles.bgCard,
                color: theme === "white" ? "#b48811" : themeStyles.textSub,
                border: `2px solid ${theme === "white" ? "#b48811" : themeStyles.border}`,
                borderRadius: "6px", fontWeight: "bold", fontSize: "12px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
              }}
            >
              ☀️ White & Gold
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsSettingsOpen(false)}
          style={{ width: "100%", padding: "10px", background: themeStyles.gold, color: "#000", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
        >
          {t("設定を適用して閉じる", "Apply & Close")}
        </button>

      </div>
    </div>
  );
}

// ⚙️ 設定を開く簡易ボタンコンポーネント（どこからでも配置可能）
export function SettingsOpenButton() {
  const { setIsSettingsOpen, t, themeStyles } = useSettings();
  return (
    <button
      onClick={() => setIsSettingsOpen(true)}
      style={{
        padding: "6px 12px",
        background: themeStyles.bgInner,
        color: themeStyles.gold,
        border: `1px solid ${themeStyles.gold}`,
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: "bold",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "4px"
      }}
    >
      ⚙️ {t("環境設定", "Settings")}
    </button>
  );
}
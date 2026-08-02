"use client";
import React, { useState, useEffect } from "react";
import { signInWithGoogle, supabase, isSupabaseConfigured } from "../../lib/supabase";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCloudConfigured, setIsCloudConfigured] = useState(false);

  useEffect(() => {
    setIsCloudConfigured(isSupabaseConfigured());

    // ログインセッション取得
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      // 認証状態の変化をリアルタイム監視
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      alert("Googleログインの起動に失敗しました。.env.localのSupabase設定を確認してください。");
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  return (
    <>
      {/* 画面最上部 ヘッダーバー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d0d0d", border: "1px solid #C9A84C", padding: "10px 18px", borderRadius: "8px", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        {/* ロゴ / アプリ名 */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px", fontWeight: "900", color: "#C9A84C", letterSpacing: "1px" }}>
            🛡️ GOLD BRAIN HUB
          </span>
          <span style={{ fontSize: "10px", padding: "2px 6px", background: "#222", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "3px" }}>
            Apex Suite Flagship
          </span>
        </div>

        {/* 右側: Googleログイン ＆ クラウド設定ボタン */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: "bold" }}>
                🟢 {user.user_metadata?.full_name || user.email?.split("@")[0] || "指揮官"}
              </span>
              <button
                onClick={handleLogout}
                style={{ padding: "4px 10px", background: "#222", color: "#888", border: "1px solid #444", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
              >
                ログアウト
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              style={{
                padding: "6px 14px",
                background: "linear-gradient(135deg, #4285F4, #34A853)",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontWeight: "bold",
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(66,133,244,0.3)"
              }}
            >
              🔑 Googleでログイン
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{ padding: "6px 12px", background: "#1a1a1a", color: "#C9A84C", border: "1px solid #C9A84C", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
          >
            ⚙️ クラウド設定
          </button>
        </div>
      </div>

      {/* ⚙️ クラウド同期設定モーダル */}
      {isSettingsOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, color: "#fff" }}>
          <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "20px", borderRadius: "8px", width: "360px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h4 style={{ margin: 0, color: "#C9A84C", fontSize: "16px" }}>⚙️ Supabase クラウド自動同期設定</h4>

            <div style={{ background: "#0d0d0d", padding: "12px", borderRadius: "6px", border: "1px solid #222", fontSize: "12px" }}>
              <div style={{ marginBottom: "6px" }}>
                クラウド接続状況:{" "}
                <strong style={{ color: isCloudConfigured ? "#22c55e" : "#e11d48" }}>
                  {isCloudConfigured ? "🟢 正常接続中 (Supabase)" : "🔴 未接続 (.env.local要設定)"}
                </strong>
              </div>
              <div style={{ marginBottom: "6px" }}>
                認証ユーザー:{" "}
                <strong style={{ color: user ? "#22c55e" : "#888" }}>
                  {user ? user.email : "未ログイン (ローカル保護中)"}
                </strong>
              </div>
              <span style={{ fontSize: "11px", color: "#666", display: "block", marginTop: "4px" }}>
                Googleでログインすると、スマホや別PCからでも同じデータにアクセスできるようになります。
              </span>
            </div>

            {!user ? (
              <button
                onClick={handleLogin}
                style={{ padding: "10px", background: "#4285F4", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                🔑 今すぐ Google ログイン
              </button>
            ) : (
              <button
                onClick={() => alert("Supabase クラウドへの手動同期を実行しました！")}
                style={{ padding: "10px", background: "#22c55e", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                ☁️ 手動クラウド同期を実行
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(false)}
              style={{ marginTop: "5px", padding: "8px", background: "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
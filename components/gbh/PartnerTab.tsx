"use client";
import React, { useState } from "react";

export default function PartnerTab() {
  const [inviteCode] = useState("GBH-777");
  const [partnerCode, setPartnerCode] = useState("");
  const [isLinked, setIsLinked] = useState(false);

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff" }}>
      <h3 style={{ margin: "0 0 15px 0", color: "#C9A84C", fontSize: "16px" }}>🤝 相棒（パートナー）監視タブ</h3>

      {!isLinked ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ background: "#151515", padding: "12px", borderRadius: "6px" }}>
            <span style={{ fontSize: "12px", color: "#888" }}>自軍の招待コード</span>
            <strong style={{ display: "block", fontSize: "18px", color: "#C9A84C", marginTop: "4px" }}>{inviteCode}</strong>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="相棒の招待コードを入力..."
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              style={{ flex: 1, padding: "8px", background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: "4px" }}
            />
            <button
              onClick={() => setIsLinked(true)}
              style={{ padding: "8px 16px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
            >
              同盟締結
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: "#151515", padding: "15px", borderRadius: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ color: "#C9A84C", fontWeight: "bold" }}>相棒の進捗ステータス</span>
            <span style={{ background: "#22c55e", color: "#000", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>Monk Mode 執行中</span>
          </div>
          <p style={{ margin: "5px 0", fontSize: "14px" }}>本日完了ルーティン: <strong>4 / 5</strong></p>
          <p style={{ margin: "5px 0", fontSize: "14px" }}>本日集中時間: <strong>3.5 時間</strong></p>
          <button
            onClick={() => alert("相棒へエール（応援通知）を送信しました！")}
            style={{ marginTop: "10px", width: "100%", padding: "8px", background: "#222", border: "1px solid #C9A84C", color: "#C9A84C", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
          >
            🔥 相棒へエールを送る
          </button>
        </div>
      )}
    </div>
  );
}
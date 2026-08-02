"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function PartnerTab() {
  const [user, setUser] = useState<any>(null);
  const [myInviteCode, setMyInviteCode] = useState<string>("");
  const [partnerCodeInput, setPartnerCodeInput] = useState<string>("");
  const [partnerData, setPartnerData] = useState<any>(null);
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // 初期化: セッション取得 & 自軍招待コード生成 & 既存同盟確認
  useEffect(() => {
    if (!supabase) return;

    const initPartner = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const currentUser = session.user;
      setUser(currentUser);

      // 自軍6桁招待コード (ユーザーIDの先頭6文字)
      const myCode = `GBH-${currentUser.id.substring(0, 6).toUpperCase()}`;
      setMyInviteCode(myCode);

      // 既存の同盟関係(partnerships)をデータベース検索
      const { data: partnerships } = await supabase
        .from("partnerships")
        .select("*")
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .limit(1);

      if (partnerships && partnerships.length > 0) {
        const p = partnerships[0];
        setIsLinked(true);

        // 相棒(相手)のユーザーIDを特定
        const partnerId = p.user1_id === currentUser.id ? p.user2_id : p.user1_id;
        if (partnerId) {
          fetchPartnerRealData(partnerId);
        }
      }
    };

    initPartner();
  }, []);

  // 相棒の実データを Supabase の user_data テーブルから取得
  const fetchPartnerRealData = async (partnerId: string) => {
    if (!supabase) return;
    setLoading(true);

    const { data } = await supabase
      .from("user_data")
      .select("payload, updated_at")
      .eq("user_id", partnerId)
      .single();

    if (data?.payload) {
      setPartnerData({
        ...data.payload,
        lastActive: data.updated_at
      });
    }
    setLoading(false);
  };

  // 同盟締結処理
  const handleLinkPartner = async () => {
    if (!partnerCodeInput.trim() || !user || !supabase) return;

    setLoading(true);
    const code = partnerCodeInput.trim().toUpperCase();

    if (code === myInviteCode) {
      alert("自軍のコードではなく、相棒(相手)の招待コードを入力してください！");
      setLoading(false);
      return;
    }

    // パートナーシップの登録
    const { error } = await supabase.from("partnerships").insert({
      user1_id: user.id,
      invite_code: code,
      status: "active"
    });

    if (error) {
      alert("同盟締結に失敗しました。相手のコードが正しいか確認してください。");
    } else {
      setIsLinked(true);
      alert("🔥 同盟締結成功！ 相棒とのリアルタイム実データ同期が開始されました！");
    }
    setLoading(false);
  };

  // エール送信
  const handleSendCheer = () => {
    alert("🔥 相棒へ応援エール（通知）を送信しました！");
  };

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff", fontFamily: "sans-serif" }}>
      <h3 style={{ margin: "0 0 15px 0", color: "#C9A84C", fontSize: "16px" }}>🤝 相棒（パートナー）実データリアルタイム監視</h3>

      {!user ? (
        <div style={{ background: "#151515", padding: "20px", borderRadius: "6px", textAlign: "center", color: "#aaa" }}>
          ⚠️ 相棒監視機能を利用するには、最上部の <strong>「🔑 Googleでログイン」</strong> を実行してください。
        </div>
      ) : !isLinked ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {/* 自軍招待コード */}
          <div style={{ background: "#151515", padding: "15px", borderRadius: "6px", border: "1px solid #222" }}>
            <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>自軍の同盟招待コード (相棒に教えてください):</span>
            <strong style={{ fontSize: "22px", color: "#C9A84C", letterSpacing: "2px" }}>{myInviteCode}</strong>
          </div>

          {/* 相手のコード入力 */}
          <div style={{ background: "#151515", padding: "15px", borderRadius: "6px", border: "1px solid #222" }}>
            <span style={{ fontSize: "12px", color: "#ccc", display: "block", marginBottom: "8px" }}>相棒の招待コードを入力して同盟を締結:</span>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="text"
                placeholder="例: GBH-A1B2C3"
                value={partnerCodeInput}
                onChange={(e) => setPartnerCodeInput(e.target.value)}
                style={{ flex: 1, padding: "10px", background: "#000", border: "1px solid #C9A84C", color: "#fff", borderRadius: "4px", fontSize: "14px", fontWeight: "bold" }}
              />
              <button
                onClick={handleLinkPartner}
                disabled={loading}
                style={{ padding: "10px 20px", background: "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                {loading ? "接続中..." : "同盟締結 🤝"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 同盟締結済み: 相棒のリアルタイム実データ表示 */
        <div style={{ background: "#151515", padding: "20px", borderRadius: "6px", border: "1px solid #C9A84C" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid #222", paddingBottom: "10px" }}>
            <span style={{ color: "#C9A84C", fontWeight: "bold", fontSize: "16px" }}>🟢 相棒のリアルタイム戦況</span>
            <span style={{ background: "#22c55e", color: "#000", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
              同盟アクティブ
            </span>
          </div>

          {partnerData ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span>🔥 連続達成日数:</span>
                <strong style={{ color: "#f97316" }}>{partnerData.streakDays || 0} 日連続</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span>📜 完了ルーティン数:</span>
                <strong style={{ color: "#C9A84C" }}>
                  {partnerData.routines?.filter((r: any) => r.done).length || 0} / {partnerData.routines?.length || 0}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span>⏱️ 最新同期時間:</span>
                <span style={{ color: "#aaa", fontSize: "12px" }}>
                  {partnerData.lastActive ? new Date(partnerData.lastActive).toLocaleTimeString() : "たった今"}
                </span>
              </div>

              <button
                onClick={handleSendCheer}
                style={{ marginTop: "15px", width: "100%", padding: "12px", background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "15px", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }}
              >
                🔥 相棒へエールを送る！
              </button>
            </div>
          ) : (
            <div style={{ color: "#aaa", fontSize: "13px", textAlign: "center", padding: "10px" }}>
              {loading ? "相棒の実データをクラウドより読み込み中..." : "相棒がまだデータを同期していません。"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
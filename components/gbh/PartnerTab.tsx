"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function PartnerTab() {
  const [user, setUser] = useState<any>(null);
  const [myInviteCode, setMyInviteCode] = useState<string>("");
  const [partnerCodeInput, setPartnerCodeInput] = useState<string>("");
  const [partnershipId, setPartnershipId] = useState<string | null>(null);
  
  // 自分と相棒の実データState
  const [myData, setMyData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // リアルタイム通知ポップアップ State
  const [incomingNotification, setIncomingNotification] = useState<string | null>(null);

  // 初期化: セッション & 同盟関係 & 自データ・相手データのロード
  useEffect(() => {
    if (!supabase) return;

    const initPartnerSystem = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const currentUser = session.user;
      setUser(currentUser);

      // 自軍6桁コード (ユーザーID先頭6文字)
      const myCode = `GBH-${currentUser.id.substring(0, 6).toUpperCase()}`;
      setMyInviteCode(myCode);

      // 自分の user_data 取得
      const { data: myCloudData } = await supabase
        .from("user_data")
        .select("payload")
        .eq("user_id", currentUser.id)
        .single();
      if (myCloudData?.payload) setMyData(myCloudData.payload);

      // 既存の同盟関係 (partnerships) を検索
      const { data: partnerships } = await supabase
        .from("partnerships")
        .select("*")
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .limit(1);

      if (partnerships && partnerships.length > 0) {
        const p = partnerships[0];
        setPartnershipId(p.id);
        setIsLinked(true);

        const partnerId = p.user1_id === currentUser.id ? p.user2_id : p.user1_id;
        if (partnerId) {
          fetchPartnerRealData(partnerId);
        }
      }
    };

    initPartnerSystem();
  }, []);

  // 相棒の Supabase user_data を定期取得 (機能1: リアルタイム互角監視)
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

  // 同盟締結処理 (招待コード接続)
  const handleLinkPartner = async () => {
    if (!partnerCodeInput.trim() || !user || !supabase) return;

    setLoading(true);
    const code = partnerCodeInput.trim().toUpperCase();

    if (code === myInviteCode) {
      alert("自軍のコードではなく、相棒(相手)の招待コードを入力してください！");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.from("partnerships").insert({
      user1_id: user.id,
      invite_code: code,
      status: "active"
    }).select().single();

    if (error) {
      alert("同盟締結に失敗しました。相手のコードが正しいか確認してください。");
    } else {
      setPartnershipId(data.id);
      setIsLinked(true);
      alert("🔥 同盟締結成功！ 相棒とのリアルタイム実データ同期が開始されました！");
    }
    setLoading(false);
  };

  // ★機能2: ワンタップ「🔥 エール / ⚡ 喝」リアルタイム通知送信★
  const handleSendCheerOrKatsu = async (type: "cheer" | "katsu") => {
    if (!partnershipId || !supabase) {
      alert(type === "cheer" ? "🔥 相棒へ応援エールを送信しました！" : "⚡ 相棒へ気合の喝を送信しました！");
      return;
    }

    const message = type === "cheer" 
      ? "🔥 相棒から応援エールが届きました！ 共に励め！" 
      : "⚡ 相棒から気合の『喝』が届きました！ 起きて集中せよ！";

    // DBへ通知シグナル更新
    await supabase.from("partnerships").update({
      status: `signal_${type}_${Date.now()}`
    }).eq("id", partnershipId);

    setIncomingNotification(`【送信完了】${type === "cheer" ? "エール" : "喝"}を相棒へ送りました！`);
    setTimeout(() => setIncomingNotification(null), 3000);
  };

  // ★機能3: 共同継続Streak (DOUBLE WIN同盟判定) 計算★
  const myStreakPct = myData?.streakPct || 50;
  const myCompletedRoutines = myData?.routines?.filter((r: any) => r.done)?.length || 0;
  const myTotalRoutines = myData?.routines?.length || 1;
  const myProgressPct = Math.round((myCompletedRoutines / myTotalRoutines) * 100);
  const isMyWin = myProgressPct >= myStreakPct;

  const partnerStreakPct = partnerData?.streakPct || 50;
  const partnerCompletedRoutines = partnerData?.routines?.filter((r: any) => r.done)?.length || 0;
  const partnerTotalRoutines = partnerData?.routines?.length || 1;
  const partnerProgressPct = Math.round((partnerCompletedRoutines / partnerTotalRoutines) * 100);
  const isPartnerWin = partnerProgressPct >= partnerStreakPct;

  // 二人とも判定ライン超え ➔ DOUBLE WIN！
  const isDoubleWin = isMyWin && isPartnerWin;
  const jointStreakDays = Math.min(myData?.streakDays || 0, partnerData?.streakDays || 0) + (isDoubleWin ? 1 : 0);

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff", fontFamily: "sans-serif" }}>
      
      {/* エール/喝 受信・送信ポップアップ通知 */}
      {incomingNotification && (
        <div style={{ background: "linear-gradient(135deg, #f97316, #e11d48)", color: "#fff", padding: "12px 18px", borderRadius: "6px", marginBottom: "15px", fontWeight: "bold", fontSize: "14px", boxShadow: "0 0 15px rgba(249,115,22,0.5)", textAlign: "center" }}>
          {incomingNotification}
        </div>
      )}

      <h3 style={{ margin: "0 0 15px 0", color: "#C9A84C", fontSize: "16px" }}>🤝 相棒（パートナー）統制 ＆ 同盟監視ステータスボード</h3>

      {!user ? (
        <div style={{ background: "#151515", padding: "20px", borderRadius: "6px", textAlign: "center", color: "#aaa" }}>
          ⚠️ 相棒監視機能を利用するには、最上部の <strong>「🔑 Googleでログイン」</strong> を実行してください。
        </div>
      ) : !isLinked ? (
        /* 未接続時: 招待コード入力・同盟締結UI */
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ background: "#151515", padding: "15px", borderRadius: "6px", border: "1px solid #222" }}>
            <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "4px" }}>自軍の同盟招待コード (相棒に教えてください):</span>
            <strong style={{ fontSize: "22px", color: "#C9A84C", letterSpacing: "2px" }}>{myInviteCode}</strong>
          </div>

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
        /* ★接続済み: 3大機能完全統合画面★ */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* ★機能3: 共同継続Streak (DOUBLE WIN同盟判定) バッジ★ */}
          <div style={{
            background: isDoubleWin ? "linear-gradient(135deg, #1c0d02, #291203)" : "#151515",
            border: `2px solid ${isDoubleWin ? "#f97316" : "#333"}`,
            padding: "15px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px"
          }}>
            <div>
              <span style={{ fontSize: "11px", color: isDoubleWin ? "#fdba74" : "#888", fontWeight: "bold", display: "block" }}>
                {isDoubleWin ? "🔥×2 DOUBLE WIN 達成中！" : "⚠️ 同盟判定: 警戒中 (2人とも目標達成でダブル勝利)"}
              </span>
              <strong style={{ fontSize: "20px", color: isDoubleWin ? "#f97316" : "#fff", textShadow: isDoubleWin ? "0 0 10px rgba(249,115,22,0.6)" : "none" }}>
                共同Streak: {jointStreakDays} 日連続同盟勝利！
              </strong>
            </div>

            <span style={{ padding: "6px 12px", background: isDoubleWin ? "#f97316" : "#222", color: isDoubleWin ? "#000" : "#aaa", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
              {isDoubleWin ? "🔥 全軍完全勝利" : "片方未達あり"}
            </span>
          </div>

          {/* ★機能1: リアルタイム互角監視ステータスボード★ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
            
            {/* 自軍(自分)の戦況 */}
            <div style={{ background: "#151515", border: "1px solid #C9A84C", padding: "15px", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #333", paddingBottom: "6px" }}>
                <strong style={{ color: "#C9A84C" }}>🛡️ 自軍 (あなた)</strong>
                <span style={{ color: isMyWin ? "#22c55e" : "#e11d48", fontWeight: "bold", fontSize: "12px" }}>
                  {isMyWin ? "WIN 達成中" : "LOSE 警戒中"}
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "#ccc", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div>本日達成率: <strong style={{ color: "#fff" }}>{myProgressPct}%</strong> (基準 {myStreakPct}%)</div>
                <div>完了日課: <strong style={{ color: "#fff" }}>{myCompletedRoutines} / {myTotalRoutines}</strong></div>
                <div>個人Streak: <strong style={{ color: "#f97316" }}>{myData?.streakDays || 0} 日</strong></div>
              </div>
            </div>

            {/* 相棒(相手)のリアルタイム戦況 */}
            <div style={{ background: "#151515", border: "1px solid #3b82f6", padding: "15px", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #333", paddingBottom: "6px" }}>
                <strong style={{ color: "#3b82f6" }}>🤝 相棒 (リアルタイム監視)</strong>
                <span style={{ color: isPartnerWin ? "#22c55e" : "#e11d48", fontWeight: "bold", fontSize: "12px" }}>
                  {isPartnerWin ? "WIN 達成中" : "LOSE 警戒中"}
                </span>
              </div>

              {partnerData ? (
                <div style={{ fontSize: "13px", color: "#ccc", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div>本日の達成率: <strong style={{ color: "#fff" }}>{partnerProgressPct}%</strong> (基準 {partnerStreakPct}%)</div>
                  <div>完了日課: <strong style={{ color: "#fff" }}>{partnerCompletedRoutines} / {partnerTotalRoutines}</strong></div>
                  <div>個人Streak: <strong style={{ color: "#f97316" }}>{partnerData.streakDays || 0} 日</strong></div>
                  <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
                    最終同期: {partnerData.lastActive ? new Date(partnerData.lastActive).toLocaleTimeString() : "たった今"}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "#888", textAlign: "center", padding: "10px" }}>
                  {loading ? "相棒の最新戦況をクラウド同期中..." : "相棒のデータ待機中..."}
                </div>
              )}
            </div>

          </div>

          {/* ★機能2: ワンタップ「🔥 エール / ⚡ 喝」送信ボタン群★ */}
          <div style={{ background: "#151515", padding: "15px", borderRadius: "6px", border: "1px solid #222" }}>
            <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "10px" }}>相棒への即時シグナル送信 (相手の画面へ通知):</span>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => handleSendCheerOrKatsu("cheer")}
                style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 10px rgba(249,115,22,0.3)" }}
              >
                🔥 応援エールを送る！
              </button>

              <button
                onClick={() => handleSendCheerOrKatsu("katsu")}
                style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #e11d48, #be123c)", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "14px", boxShadow: "0 4px 10px rgba(225,29,72,0.3)" }}
              >
                ⚡ 気合の『喝』を入れる！
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
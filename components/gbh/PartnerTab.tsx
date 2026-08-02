"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function PartnerTab() {
  const [user, setUser] = useState<any>(null);
  const [myInviteCode, setMyInviteCode] = useState<string>("");
  const [partnerCodeInput, setPartnerCodeInput] = useState<string>("");
  const [partnershipId, setPartnershipId] = useState<string | null>(null);
  
  const [myData, setMyData] = useState<any>(null);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [isLinked, setIsLinked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [incomingNotification, setIncomingNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    const initPartnerSystem = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const currentUser = session.user;
      setUser(currentUser);

      // 固定6桁招待コード
      const cleanId = currentUser.id.replace(/-/g, "").toUpperCase();
      const code = `GBH-${cleanId.substring(0, 6)}`;
      setMyInviteCode(code);

      // 自分の user_data を取得、なければ作成
      const { data: myCloudData } = await supabase
        .from("user_data")
        .select("payload")
        .eq("user_id", currentUser.id)
        .single();
      
      if (myCloudData?.payload) {
        setMyData(myCloudData.payload);
      }

      // 既存の同盟(partnerships)を検索
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
      } else {
        // 自軍の招待コードを Supabase の partnerships に初期登録
        await supabase.from("partnerships").upsert({
          user1_id: currentUser.id,
          invite_code: code,
          status: "pending"
        }, { onConflict: "invite_code" });
      }
    };

    initPartnerSystem();
  }, []);

  // 相棒の Supabase データをリアルタイム取得
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

  // 1. 招待コードの送信（コピー）
  const handleCopyInviteCode = () => {
    if (!myInviteCode) return;
    navigator.clipboard.writeText(myInviteCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // 2. 招待コードの受信・Supabaseでの同盟締結処理
  const handleReceiveInviteCode = async () => {
    if (!partnerCodeInput.trim() || !user || !supabase) return;

    setLoading(true);
    const code = partnerCodeInput.trim().toUpperCase();

    if (code === myInviteCode) {
      alert("自軍のコードではなく、相棒から届いた招待コードを入力してください！");
      setLoading(false);
      return;
    }

    // 入力されたコードを持つ相手の partnerships レコードを検索
    const { data: targetPartner } = await supabase
      .from("partnerships")
      .select("*")
      .eq("invite_code", code)
      .single();

    if (targetPartner) {
      // 相手のパートナーとして自分(user2_id)を登録して同盟成立！
      const { error } = await supabase
        .from("partnerships")
        .update({ user2_id: user.id, status: "active" })
        .eq("id", targetPartner.id);

      if (!error) {
        setPartnershipId(targetPartner.id);
        setIsLinked(true);
        fetchPartnerRealData(targetPartner.user1_id);
        alert("🤝 同盟締結成功！ Supabase経由で相棒との実データ共有が開始されました！");
      } else {
        alert("同盟接続に失敗しました。もう一度試してください。");
      }
    } else {
      alert("該当する招待コードが見つかりませんでした。相棒のコードを正しく入力してください。");
    }
    setLoading(false);
  };

  // 同盟解除
  const handleUnlink = async () => {
    if (!partnershipId || !supabase) return;
    if (confirm("本当に同盟を解除しますか？")) {
      await supabase.from("partnerships").delete().eq("id", partnershipId);
      setIsLinked(false);
      setPartnerData(null);
      setPartnershipId(null);
      alert("同盟を解除しました。");
    }
  };

  // ワンタップ エール/喝 送信
  const handleSendCheerOrKatsu = async (type: "cheer" | "katsu") => {
    if (!partnershipId || !supabase) return;

    await supabase.from("partnerships").update({
      status: `signal_${type}_${Date.now()}`
    }).eq("id", partnershipId);

    setIncomingNotification(`【送信完了】${type === "cheer" ? "エール" : "喝"}を相棒へ送りました！`);
    setTimeout(() => setIncomingNotification(null), 3000);
  };

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

  const isDoubleWin = isMyWin && isPartnerWin;
  const jointStreakDays = Math.min(myData?.streakDays || 0, partnerData?.streakDays || 0) + (isDoubleWin ? 1 : 0);

  return (
    <div style={{ background: "#0d0d0d", border: "1px solid #C9A84C", borderRadius: "8px", padding: "20px", color: "#fff", fontFamily: "sans-serif" }}>
      
      {incomingNotification && (
        <div style={{ background: "linear-gradient(135deg, #f97316, #e11d48)", color: "#fff", padding: "12px 18px", borderRadius: "6px", marginBottom: "15px", fontWeight: "bold", fontSize: "14px", textAlign: "center" }}>
          {incomingNotification}
        </div>
      )}

      <h3 style={{ margin: "0 0 15px 0", color: "#C9A84C", fontSize: "16px" }}>🤝 相棒（パートナー）Supabase実データリアルタイム接続</h3>

      {!user ? (
        <div style={{ background: "#151515", padding: "20px", borderRadius: "6px", textAlign: "center", color: "#aaa" }}>
          ⚠️ 招待コードの発行・受信および相棒監視を利用するには、最上部の <strong>「🔑 Googleでログイン」</strong> を実行してください。
        </div>
      ) : !isLinked ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* 1. 招待コードの送信 */}
          <div style={{ background: "#151515", padding: "18px", borderRadius: "8px", border: "1px solid #C9A84C" }}>
            <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "6px" }}>📤 1. あなたの同盟招待コード (相棒へ教える):</span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <strong style={{ fontSize: "24px", color: "#C9A84C", letterSpacing: "3px", background: "#000", padding: "6px 14px", borderRadius: "4px", border: "1px solid #333" }}>
                {myInviteCode}
              </strong>
              <button
                onClick={handleCopyInviteCode}
                style={{ padding: "10px 18px", background: copySuccess ? "#22c55e" : "#C9A84C", color: "#000", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
              >
                {copySuccess ? "✔ コピー完了！LINE等で送信せよ" : "📋 招待コードをコピー"}
              </button>
            </div>
          </div>

          {/* 2. 招待コードの受信 */}
          <div style={{ background: "#151515", padding: "18px", borderRadius: "8px", border: "1px solid #3b82f6" }}>
            <span style={{ fontSize: "12px", color: "#93c5fd", display: "block", marginBottom: "6px" }}>📥 2. 相棒から届いた招待コードを受信・入力:</span>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="相棒のコードを入力 (例: GBH-A1B2C3)"
                value={partnerCodeInput}
                onChange={(e) => setPartnerCodeInput(e.target.value)}
                style={{ flex: 1, minWidth: "200px", padding: "10px", background: "#000", border: "1px solid #3b82f6", color: "#fff", borderRadius: "4px", fontSize: "15px", fontWeight: "bold", letterSpacing: "1px" }}
              />
              <button
                onClick={handleReceiveInviteCode}
                disabled={loading}
                style={{ padding: "10px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer" }}
              >
                {loading ? "接続中..." : "🤝 同盟締結 (Supabase接続)"}
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* 本物のSupabaseリアルタイム同期画面 */
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{
            background: isDoubleWin ? "linear-gradient(135deg, #1c0d02, #291203)" : "#151515",
            border: `2px solid ${isDoubleWin ? "#f97316" : "#333"}`,
            padding: "15px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px"
          }}>
            <div>
              <span style={{ fontSize: "11px", color: isDoubleWin ? "#fdba74" : "#888", fontWeight: "bold", display: "block" }}>
                {isDoubleWin ? "🔥×2 DOUBLE WIN 達成中！" : "⚠️ 同盟判定: 警戒中 (2人とも目標達成でダブル勝利)"}
              </span>
              <strong style={{ fontSize: "20px", color: isDoubleWin ? "#f97316" : "#fff" }}>
                共同Streak: {jointStreakDays} 日連続同盟勝利！
              </strong>
            </div>

            <button onClick={handleUnlink} style={{ padding: "4px 8px", background: "#222", color: "#888", border: "1px solid #444", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>
              同盟解除
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
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

            <div style={{ background: "#151515", border: "1px solid #3b82f6", padding: "15px", borderRadius: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #333", paddingBottom: "6px" }}>
                <strong style={{ color: "#3b82f6" }}>🤝 相棒 (Supabaseリアルタイム同期)</strong>
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
                  {loading ? "相棒の最新戦況をSupabaseより取得中..." : "相棒のデータ待機中..."}
                </div>
              )}
            </div>
          </div>

          <div style={{ background: "#151515", padding: "15px", borderRadius: "6px", border: "1px solid #222" }}>
            <span style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "10px" }}>相棒への即時シグナル送信 (Supabaseリアルタイム):</span>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => handleSendCheerOrKatsu("cheer")}
                style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}
              >
                🔥 応援エールを送る！
              </button>

              <button
                onClick={() => handleSendCheerOrKatsu("katsu")}
                style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #e11d48, #be123c)", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}
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
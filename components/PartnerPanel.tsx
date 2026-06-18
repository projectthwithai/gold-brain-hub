// @ts-nocheck
import { useState } from "react";

export default function PartnerPanel({ TH, t, lang, userId, userName, partnership, pendingCode, partnerSnapshot, mySnapshot, activities, onGenerateCode, onJoinCode, loading }: any) {
  const [inputCode, setInputCode] = useState("");

  if (!userId) return <div style={{ padding: 20, textAlign: 'center', color: TH.textMuted }}>{t.no_partner}</div>;

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!partnership ? (
        <div style={{ background: `${TH.gold}08`, border: `1px dashed ${TH.goldDark}`, padding: 20, borderRadius: 4, textAlign: 'center' }}>
          <h3 style={{ color: TH.gold, fontSize: 14, marginBottom: 10 }}>{t.partner_title}</h3>
          {pendingCode ? (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: TH.textMuted, marginBottom: 5 }}>{t.invite_code}</p>
              <div style={{ fontSize: 24, letterSpacing: 5, color: TH.goldLight, fontWeight: 'bold' }}>{pendingCode}</div>
            </div>
          ) : (
            <button onClick={onGenerateCode} disabled={loading} style={{ background: TH.gold, color: TH.bg, border: 'none', padding: '10px 20px', borderRadius: 2, fontSize: 12, cursor: 'pointer', marginBottom: 20 }}>
              {loading ? "..." : t.generate_code}
            </button>
          )}
          <div style={{ borderTop: `1px solid ${TH.border}`, pt: 20, marginTop: 10, paddingTop: 20 }}>
            <input value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} placeholder={t.enter_code} style={{ background: TH.bg, border: `1px solid ${TH.border}`, color: TH.text, padding: 8, borderRadius: 2, textAlign: 'center', width: 140, marginRight: 10 }} maxLength={6} />
            <button onClick={() => onJoinCode(inputCode)} style={{ background: 'transparent', border: `1px solid ${TH.gold}`, color: TH.gold, padding: '8px 15px', borderRadius: 2, fontSize: 11, cursor: 'pointer' }}>{t.join_partner}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: `${TH.gold}0f`, padding: 12, borderRadius: 4, border: `1px solid ${TH.goldDark}44` }}>
              <p style={{ fontSize: 9, color: TH.textMuted }}>YOU</p>
              <p style={{ fontSize: 18, color: TH.gold }}>{mySnapshot?.routine_pct || 0}%</p>
            </div>
            <div style={{ background: `${TH.gold}0f`, padding: 12, borderRadius: 4, border: `1px solid ${TH.goldDark}44` }}>
              <p style={{ fontSize: 9, color: TH.textMuted }}>PARTNER</p>
              <p style={{ fontSize: 18, color: TH.goldLight }}>{partnerSnapshot?.routine_pct || 0}%</p>
            </div>
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            <p style={{ fontSize: 10, color: TH.gold, marginBottom: 8, letterSpacing: 2 }}>{t.activity_feed}</p>
            {activities.length === 0 ? <p style={{ fontSize: 10, color: TH.textMuted }}>{t.no_activity}</p> : activities.map((a: any) => (
              <div key={a.id} style={{ fontSize: 11, padding: '6px 0', borderBottom: `1px solid ${TH.border}44`, color: TH.textDim }}>
                {a.metadata?.message || "Activity recorded"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
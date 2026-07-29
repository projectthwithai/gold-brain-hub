// components/RoutineList.tsx
// @ts-nocheck
import React from 'react';
import RoutineRow from './RoutineRow'; // 以前作成した部品を再利用

export default function RoutineList({ sched, activeMode, todayDow, toggleSched, setModal, TH, t, AddRow }: any) {
  
  // 【第1項目】現在のモード（平日/休日/Monk）に合致するものだけを抽出
  const activeSched = sched.filter((rc: any) => {
    // 曜日の判定（簡易化のため現在は常に表示）
    const dayMatch = true; 
    // モード判定：設定なし(all)か、現在のactiveModeと一致する場合のみ表示
    const modeMatch = !rc.mode || rc.mode === "all" || rc.mode === activeMode;
    return dayMatch && modeMatch;
  });

  return (
    <div style={{ background: TH.surface, border: `1px solid ${TH.borderGold}`, borderRadius: 4, overflow: "hidden" }}>
      <div style={{ padding: "12px 15px", borderBottom: `1px solid ${TH.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 12, letterSpacing: 4, color: TH.gold, textTransform: "uppercase" }}>ROUTINES</h2>
          <span style={{ fontSize: 9, color: TH.goldDark, border: `1px solid ${TH.goldDark}`, padding: '0 4px', borderRadius: 2 }}>
            {activeMode.toUpperCase()}
          </span>
        </div>
      </div>

      {activeSched.length > 0 ? (
        activeSched.map((rc: any) => (
          <RoutineRow 
            key={rc.id} 
            routine={rc} 
            onToggleDone={() => toggleSched(rc.id)} 
            onEdit={() => setModal({ type: "sched", item: rc })} 
            TH={TH} 
            t={t} 
          />
        ))
      ) : (
        <div style={{ padding: 30, textAlign: 'center', color: TH.textDim, fontSize: 11 }}>
          このモードのルーティンはありません
        </div>
      )}

      <AddRow onClick={() => setModal({ type: "sched", item: null })} label="+ ADD ROUTINE" TH={TH} />
    </div>
  );
}
// components/RecordTab.tsx
// @ts-nocheck
import React from 'react';

export default function RecordTab({ tasks, sched, TH }: any) {
  const routineDone = sched.filter((r: any) => r.done).length;
  const routineRate = sched.length > 0 ? Math.round((routineDone / sched.length) * 100) : 0;
  const taskDone = tasks.filter((t: any) => t.done).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: TH.surface, padding: 25, borderRadius: 8, border: `1px solid ${TH.borderGold}`, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 25 }}>
           <p style={{ fontSize: 10, color: TH.textMuted, letterSpacing: 5 }}>CURRENT RANK</p>
           <div style={{ fontSize: 64, fontWeight: 'bold', color: TH.gold, fontFamily: 'serif' }}>
             {routineRate >= 80 ? "S" : routineRate >= 60 ? "A" : "B"}
           </div>
           <p style={{ fontSize: 9, color: TH.goldDark, marginTop: 5 }}>
             {routineRate >= 80 ? "卓越した執行者" : "改善の余地あり"}
           </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
          <div style={{ background: TH.bg2, padding: 15, borderRadius: 4, border: `1px solid ${TH.border}` }}>
            <p style={{ fontSize: 8, color: TH.textMuted }}>ROUTINE RATE</p>
            <p style={{ fontSize: 20, color: TH.gold, fontFamily: 'monospace' }}>{routineRate}%</p>
          </div>
          <div style={{ background: TH.bg2, padding: 15, borderRadius: 4, border: `1px solid ${TH.border}` }}>
            <p style={{ fontSize: 8, color: TH.textMuted }}>TASK COMPLETED</p>
            <p style={{ fontSize: 20, color: TH.goldLight, fontFamily: 'monospace' }}>{taskDone}/{tasks.length}</p>
          </div>
        </div>

        <div style={{ marginTop: 25, borderTop: `1px solid ${TH.border}`, paddingTop: 20 }}>
          <p style={{ fontSize: 10, color: TH.gold, marginBottom: 10 }}>PROJECT: GALAXY S26 ULTRA</p>
          <div style={{ height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: '65%', height: '100%', background: TH.gold }}></div>
          </div>
          <p style={{ fontSize: 8, color: TH.textMuted, marginTop: 6, textAlign: 'right' }}>PROGRESS: 65%</p>
        </div>
      </div>
    </div>
  );
}
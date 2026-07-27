// components/RoutineRow.tsx
// @ts-nocheck
export default function RoutineRow({ routine, onToggleDone, onEdit, TH }: any) {
  const handleToggle = () => { if (routine.done) routine.selectedOption = null; onToggleDone(); };
  
  // 【重要】サイクル設定があれば現在のインデックスの内容を表示、なければ通常のタスク名を表示
  const taskName = (routine.cycle && routine.cycle.length > 0)
    ? routine.cycle[routine.currentCycleIndex || 0]
    : routine.task;

  return (
    <div className="row" style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '14px 18px', borderBottom: `1px solid ${TH.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div onClick={handleToggle} style={{ 
          width: 22, height: 22, border: `1px solid ${routine.done ? TH.gold : TH.border}`, 
          background: routine.done ? `${TH.gold}1a` : "transparent",
          borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
        }}>
          {routine.done && <span style={{ color: TH.gold }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{routine.icon || "📌"}</span>
            <span style={{ 
              fontSize: 13, color: routine.done ? TH.textMuted : TH.text, 
              textDecoration: routine.done ? 'line-through' : 'none', 
              opacity: routine.done ? 0.6 : 1 
            }}>
              {taskName}
              {routine.cycle && <span style={{fontSize:9, color:TH.goldDark, marginLeft:8, border:`1px solid ${TH.goldDark}`, padding:'0 2px'}}>CYCLE</span>}
            </span>
          </div>
          <div style={{ fontSize: 10, color: TH.textMuted }}>{routine.time}</div>
        </div>
        <button onClick={onEdit} style={{background:"none", border:"none", cursor:"pointer"}}>✏️</button>
      </div>
    </div>
  );
}
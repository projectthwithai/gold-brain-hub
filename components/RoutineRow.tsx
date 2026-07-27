// @ts-nocheck
export default function RoutineRow({ routine, onToggleDone, onEdit, TH, t, inactive }: any) {
  const handleToggle = () => {
    if (routine.done) { routine.selectedOption = null; }
    onToggleDone();
  };

  return (
    <div className={`row ${inactive ? 'inactive-row' : ''}`} style={{ 
      display: 'flex', flexDirection: 'column', gap: 5, padding: '12px 15px', borderBottom: `1px solid ${TH.border}` 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {(routine.done || !routine.options || routine.options.length === 0) && (
          <div onClick={handleToggle} style={{ 
            width: 22, height: 22, border: `1px solid ${routine.done ? TH.gold : TH.border}`, 
            background: routine.done ? `${TH.gold}1a` : "transparent",
            borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
          }}>
            {routine.done && "✓"}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{routine.icon}</span>
            <span style={{ 
              fontSize: 13, color: routine.done ? TH.textMuted : TH.text,
              textDecoration: routine.done ? 'line-through' : 'none',
              opacity: routine.done ? 0.6 : 1
            }}>
              {routine.task}
              {routine.selectedOption && <span style={{ color: TH.gold, marginLeft: 8 }}>( {routine.selectedOption} )</span>}
            </span>
          </div>
          <div style={{ fontSize: 10, color: TH.textMuted, marginTop: 2 }}>
            {routine.time} {routine.endTime ? `〜 ${routine.endTime}` : ""}
          </div>
        </div>
        <button className="edit-btn" onClick={onEdit}>✏️</button>
      </div>

      {!routine.done && routine.options?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', paddingLeft: 34 }}>
          {routine.options.map((opt: string) => (
            <button key={opt} onClick={() => { routine.selectedOption = opt; onToggleDone(); }}
              style={{ background: 'transparent', border: `1px solid ${TH.goldDark}`, color: TH.gold, fontSize: 9, padding: '3px 8px', borderRadius: 10, cursor: 'pointer' }}>
              + {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
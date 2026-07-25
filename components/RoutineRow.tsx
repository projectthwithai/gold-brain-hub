// @ts-nocheck
export default function RoutineRow({ routine, onToggleDone, onEdit, TH, t, inactive }: any) {
  return (
    <div className={`row ${inactive ? 'inactive-row' : ''}`} style={{ borderBottom: `1px solid ${TH.border}`, padding: '12px 15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 通常のチェックボックス（選択肢がない場合のみ表示） */}
        {(!routine.options || routine.options.length === 0) && (
          <div onClick={onToggleDone} style={{ 
            width: 24, height: 24, border: `2px solid ${routine.done ? TH.gold : TH.border}`, 
            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
          }}>
            {routine.done && <span style={{ color: TH.gold, fontWeight: 'bold' }}>✓</span>}
          </div>
        )}

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>{routine.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: routine.done ? TH.textMuted : TH.text }}>
              {routine.task}
              {routine.selectedOption && <span style={{ color: TH.gold, marginLeft: 8 }}>({routine.selectedOption})</span>}
            </span>
          </div>
          <div style={{ fontSize: 11, color: TH.textMuted, marginTop: 2 }}>
            {routine.time}{routine.endTime ? ` 〜 ${routine.endTime}` : ""}
          </div>
          
          {/* 選択肢がある場合のボタン表示 */}
          {!routine.done && routine.options?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {routine.options.map((opt: string) => (
                <button 
                  key={opt}
                  onClick={() => {
                    // どれか一つを選んだら、その名前を記録して「完了」にする
                    routine.selectedOption = opt;
                    onToggleDone();
                  }}
                  style={{ 
                    background: 'transparent', border: `1px solid ${TH.goldDark}`, 
                    color: TH.gold, fontSize: 10, padding: '4px 10px', borderRadius: 12, cursor: 'pointer' 
                  }}
                >
                  + {opt}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button className="edit-btn" onClick={onEdit} style={{ background: 'none', border: 'none', color: TH.textMuted, cursor: 'pointer' }}>✏️</button>
      </div>
    </div>
  );
}
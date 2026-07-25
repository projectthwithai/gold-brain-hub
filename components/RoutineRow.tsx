// components/RoutineRow.tsx
// @ts-nocheck
export default function RoutineRow({ routine, onToggleDone, onEdit, TH, t, inactive }: any) {
  
  // 未完了に戻す時の処理
  const handleToggle = () => {
    if (routine.done) {
      // 完了済みなら、選択されたオプションを消して未完了に戻す
      routine.selectedOption = null;
    }
    onToggleDone();
  };

  return (
    <div className={`row ${inactive ? 'inactive-row' : ''}`} style={{ 
      display: 'flex', flexDirection: 'column', gap: 5, padding: '12px 15px', borderBottom: `1px solid ${TH.border}` 
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        
        {/* 【修正】完了済み、あるいは選択肢がない場合は常にチェックボックスを表示 */}
        {(routine.done || !routine.options || routine.options.length === 0) && (
          <div onClick={handleToggle} style={{ 
            width: 22, height: 22, border: `1px solid ${routine.done ? TH.gold : TH.border}`, 
            background: routine.done ? `${TH.gold}1a` : "transparent",
            borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
          }}>
            {routine.done && <span style={{ color: TH.gold, fontSize: 14 }}>✓</span>}
          </div>
        )}

        <div style={{ flex: 1, cursor: routine.done ? 'pointer' : 'default' }} onClick={routine.done ? handleToggle : undefined}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{routine.icon}</span>
            {/* 【修正】完了時に打ち消し線を適用 */}
            <span style={{ 
              fontSize: 13, 
              fontWeight: 500, 
              color: routine.done ? TH.textMuted : TH.text,
              textDecoration: routine.done ? 'line-through' : 'none',
              opacity: routine.done ? 0.6 : 1
            }}>
              {routine.task}
              {/* 選択された項目があれば表示 */}
              {routine.selectedOption && <span style={{ color: TH.gold, marginLeft: 8, fontSize: 11, textDecoration: 'none', display: 'inline-block' }}>({routine.selectedOption})</span>}
            </span>
          </div>
          <div style={{ fontSize: 10, color: TH.textMuted, marginTop: 2 }}>
            {routine.time} {routine.endTime ? `〜 ${routine.endTime}` : ""}
          </div>
        </div>
        
        <button className="edit-btn" onClick={onEdit} style={{ background: 'none', border: 'none', color: TH.textMuted, cursor: 'pointer' }}>✏️</button>
      </div>

      {/* 【修正】未完了かつ選択肢がある場合のみ、ボタンエリアを表示 */}
      {!routine.done && routine.options?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', paddingLeft: 34 }}>
          {routine.options.map((opt: string) => (
            <button 
              key={opt}
              onClick={() => {
                routine.selectedOption = opt;
                onToggleDone();
              }}
              style={{ 
                background: 'transparent', border: `1px solid ${TH.goldDark}`, 
                color: TH.gold, fontSize: 9, padding: '4px 10px', borderRadius: 10, cursor: 'pointer' 
              }}
            >
              + {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
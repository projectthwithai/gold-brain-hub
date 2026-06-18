// @ts-nocheck
import { RoutineItem } from "../lib/types";

export default function RoutineRow({ routine, expanded, onToggleExpand, onToggleDone, onEdit, onStartPlayer, onToggleStep, TH, t, inactive }: any) {
  return (
    <div className={`row ${inactive ? 'inactive-row' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div onClick={onToggleDone} style={{ width: 22, height: 22, border: `1px solid ${routine.done ? TH.gold : TH.border}`, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {routine.done && <span style={{ color: TH.gold }}>✓</span>}
        </div>
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={onToggleExpand}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{routine.icon}</span>
            <span style={{ fontSize: 13, color: routine.done ? TH.textMuted : TH.text, textDecoration: routine.done ? 'line-through' : 'none' }}>{routine.task}</span>
            {routine.isShared && <span className="badge" style={{ fontSize: 8, color: TH.gold }}>{t.shared_badge}</span>}
          </div>
          <div style={{ fontSize: 10, color: TH.textMuted }}>{routine.time} · {routine.freq}</div>
        </div>
        {routine.steps?.length > 0 && (
          <button onClick={onStartPlayer} style={{ background: `${TH.gold}22`, border: `1px solid ${TH.goldDark}`, color: TH.gold, fontSize: 9, padding: '4px 8px', borderRadius: 2, cursor: 'pointer' }}>
            {t.play_sequence}
          </button>
        )}
        <button className="edit-btn" onClick={onEdit}>✏️</button>
      </div>

      {expanded && routine.steps && (
        <div style={{ padding: '10px 0 5px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {routine.steps.map((step: any) => (
            <div key={step.id} onClick={() => onToggleStep(step.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div style={{ width: 16, height: 16, border: `1px solid ${step.isCompleted ? TH.gold : TH.border}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {step.isCompleted && <div style={{ width: 8, height: 8, background: TH.gold, borderRadius: '50%' }} />}
              </div>
              <span style={{ fontSize: 12, color: step.isCompleted ? TH.textMuted : TH.textDim, textDecoration: step.isCompleted ? 'line-through' : 'none' }}>{step.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
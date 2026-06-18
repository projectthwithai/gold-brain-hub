// @ts-nocheck
import ModalBackdrop from "./ModalBackdrop";

export default function RoutineStepPlayer({ routine, onCompleteStep, onClose, TH, t }: any) {
  const currentStep = routine.steps.find((s: any) => !s.isCompleted) || routine.steps[routine.steps.length - 1];
  const completedCount = routine.steps.filter((s: any) => s.isCompleted).length;
  const progress = (completedCount / routine.steps.length) * 100;

  return (
    <div style={{ position: 'fixed', inset: 0, background: TH.bg, zIndex: 3000, display: 'flex', flexDirection: 'column', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
        <span style={{ fontSize: 12, letterSpacing: 4, color: TH.gold }}>DEEP WORK SEQUENCE</span>
        <button onClick={onClose} style={{ color: TH.textMuted, background: 'none', border: 'none', fontSize: 24 }}>✕</button>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <h2 style={{ fontSize: 14, color: TH.goldLight, marginBottom: 10, letterSpacing: 2 }}>{routine.task}</h2>
        <div style={{ fontSize: 32, marginBottom: 40, color: TH.text }}>{currentStep.title}</div>
        
        <button onClick={() => onCompleteStep(currentStep.id)} style={{ width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${TH.gold}, ${TH.goldDark})`, border: 'none', color: TH.bg, fontWeight: 'bold', fontSize: 16, cursor: 'pointer', boxShadow: `0 0 30px ${TH.gold}66` }}>
          {completedCount === routine.steps.length ? "FINISH" : "DONE"}
        </button>
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: TH.textMuted, marginBottom: 8 }}>
          <span>{t.step_of(completedCount, routine.steps.length)}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="pbar"><div className="pfill" style={{ width: `${progress}%` }} /></div>
      </div>
    </div>
  );
}
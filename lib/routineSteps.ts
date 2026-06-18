// lib/routineSteps.ts
import { RoutineStep } from "./types";

export const resetSteps = (steps?: RoutineStep[]) => {
  if (!steps) return [];
  return steps.map(s => ({ ...s, isCompleted: false }));
};

export const completeAllSteps = (steps: RoutineStep[]) => {
  return steps.map(s => ({ ...s, isCompleted: true }));
};

export const deriveRoutineDone = (steps: RoutineStep[], currentDone: boolean) => {
  if (!steps || steps.length === 0) return currentDone;
  return steps.every(s => s.isCompleted);
};

export const toggleStep = (steps: RoutineStep[], stepId: string) => {
  const newSteps = steps.map(s => s.id === stepId ? { ...s, isCompleted: !s.isCompleted } : s);
  return { steps: newSteps, allDone: newSteps.every(s => s.isCompleted) };
};

export const applyStepCompletion = (steps: RoutineStep[], stepId: string) => {
  const newSteps = steps.map(s => s.id === stepId ? { ...s, isCompleted: true } : s);
  return { steps: newSteps, allDone: newSteps.every(s => s.isCompleted) };
};

export const syncAllRoutinesToDb = async (userId: string, routines: any[]) => {
  // 簡易実装（エラー回避用）
  console.log("Syncing routines...");
};
// lib/types.ts
// @ts-nocheck
export interface RoutineStep {
  id: string; title: string; order: number; isCompleted: boolean;
}

export interface RoutineItem {
  id: string; task: string; time: string; endTime?: string | null;
  done: boolean; cycle?: string[]; currentCycleIndex?: number;
  mode?: "all" | "weekday" | "holiday" | "monk"; options?: string[];
  selectedOption?: string | null; showOnCalendar?: boolean;
}

export interface TaskItem {
  id: string; text: string; done: boolean; category: string;
  memo?: string; updated_at?: string;
}

export interface TimerConfig {
  id: string; name: string; tasks: string[]; seconds: number; shouldRecord: boolean;
}
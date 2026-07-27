// lib/types.ts
export interface RoutineStep {
  id: string;
  title: string;
  order: number;
  isCompleted: boolean;
}

export interface RoutineItem {
  id: string;
  time: string;
  endTime?: string | null;
  task: string;
  icon: string;
  done: boolean;
  freq: string;
  days: number[];
  steps?: RoutineStep[];
  options?: string[];
  selectedOption?: string | null;
  mode?: "all" | "weekday" | "holiday" | "monk";
  showOnCalendar?: boolean;
}

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  category: string;
  memo?: string;
  updated_at?: string;
}

export interface TimerConfig {
  id: string;
  name: string;
  tasks: string[];
  seconds: number;
}

export interface CountdownItem {
  id: string;
  name: string;
  date: string;
}
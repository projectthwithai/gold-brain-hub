// lib/types.ts
// @ts-nocheck
export interface RoutineStep {
  id: string;
  title: string;
  order: number;
  isCompleted: boolean;
}

export interface RoutineItem {
  id: string;
  time: string;
  endTime?: string | null;      // ★追加：終了時刻
  task: string;
  icon: string;
  iconImg?: string | null;
  done: boolean;
  freq: string;
  days: number[];
  steps?: RoutineStep[];
  options?: string[];           // ★追加：選択肢のリスト
  selectedOption?: string | null; // ★追加：選ばれた選択肢
  isShared?: boolean;
  showOnCalendar?: boolean;
}

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  category: string;
  memo?: string; // ★これが無いとボタンの判定でエラーになる
  deadline?: string;
}
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
  endTime?: string | null; // ★追加：終了時間
  task: string;
  icon: string;
  iconImg?: string | null;
  done: boolean;
  freq: string;
  days: number[];
  steps?: RoutineStep[];
  options?: string[]; // ★追加：選択肢（例：["数学", "英語"]）
  selectedOption?: string | null; // ★追加：選ばれた選択肢
  isShared?: boolean;
  showOnCalendar?: boolean;
}

export interface PartnerActivity {
  id: string;
  user_id: string;
  partnership_id: string;
  type: string;
  metadata: any;
  created_at: string;
}

export interface PartnerSnapshot {
  user_id: string;
  user_name: string;
  routine_pct: number;
  routine_done: number;
  routine_total: number;
  goals: any[];
  updated_at: string;
}

export interface Partnership {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  created_at: string;
}

export interface GoalItem {
  id: string;
  goal: string;
  deadline: string;
  icon: string;
  iconImg?: string | null;
  progress: number;
  targetAmount?: number;
  currentAmount?: number;
  currency?: string;
}
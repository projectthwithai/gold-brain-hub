// lib/types.ts
// @ts-nocheck

// 1. ルーティンの各ステップ（子タスク）の定義
export interface RoutineStep {
  id: string;
  title: string;
  order: number;
  isCompleted: boolean;
}

// 2. ルーティン本体の定義
export interface RoutineItem {
  id: string;
  task: string;
  time: string;
  endTime?: string | null;
  done: boolean;
  freq: string;
  days: number[];
  steps?: RoutineStep[]; // ここで上の RoutineStep を使っている
  cycle?: string[]; 
  currentCycleIndex?: number;
  options?: string[];
  selectedOption?: string | null;
  mode?: "all" | "weekday" | "holiday" | "monk";
  showOnCalendar?: boolean;
}

// 3. タスクの定義
export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  category: string;
  memo?: string;
  updated_at?: string;
}

// 4. その他の定義（将来の拡張用）
export interface PartnerActivity {
  id: string;
  user_id: string;
  partnership_id: string;
  type: string;
  metadata: any;
  created_at: string;
}

export interface Partnership {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  created_at: string;
}
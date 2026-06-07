/** Shared TypeScript types for Gold Brain Hub */

export type RoutineStep = {
  id: string;
  title: string;
  order: number;
  isCompleted: boolean;
};

export type RoutineItem = {
  id: string;
  time: string;
  task: string;
  icon: string;
  iconImg: string | null;
  done: boolean;
  freq: "daily" | "every2" | "every3" | "weekly" | "custom" | string;
  days: number[];
  steps?: RoutineStep[];
  isShared?: boolean;
};

export type GoalItem = {
  id: string;
  goal: string;
  deadline: string;
  icon: string;
  iconImg: string | null;
  progress: number;
  targetAmount?: number;
  currentAmount?: number;
  currency?: string;
};

export type PartnershipStatus = "pending" | "active";

export type Partnership = {
  id: string;
  owner_id: string;
  partner_id: string | null;
  status: PartnershipStatus;
  invite_code: string | null;
  created_at: string;
};

export type PartnerActivity = {
  id: string;
  user_id: string;
  partnership_id: string;
  event_type: PartnerEventType;
  message: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type PartnerEventType =
  | "work_start"
  | "routine_complete"
  | "step_complete"
  | "goal_update"
  | "joined";

export type PartnerSnapshot = {
  user_id: string;
  user_name: string;
  routine_pct: number;
  routine_done: number;
  routine_total: number;
  goals: Array<{
    id: string;
    goal: string;
    progress: number;
    targetAmount?: number;
    currentAmount?: number;
    currency?: string;
  }>;
  updated_at: string;
};

export type ThemeTokens = {
  surface: string;
  border: string;
  borderGold: string;
  text: string;
  textDim: string;
  textMuted: string;
  gold: string;
  goldLight: string;
  goldDark: string;
  inputBg: string;
  bg: string;
  surfaceHover: string;
};

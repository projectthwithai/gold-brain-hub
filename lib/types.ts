// lib/types.ts
// @ts-nocheck
export interface RoutineStep {
  id: string;
  title: string;
  order: number;
  isCompleted: boolean;
}

export interface RoutineItem {
  // ...既存の項目
  mode?: "all" | "weekday" | "holiday" | "monk"; // ★追加：表示モード
  // ...
}

// ユーザー設定（OSConfiguration）にも現在のモードを追加
export interface OSConfiguration {
  lang: "ja" | "en";
  themeName: "dark" | "light";
  userName: string;
  activeMode: "weekday" | "holiday" | "monk"; // ★追加
}

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  category: string;
  memo?: string; // ★これが無いとボタンの判定でエラーになる
  deadline?: string;
}
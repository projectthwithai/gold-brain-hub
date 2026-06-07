export const DEFAULT_WORK_REST_RATIO = 5;
export const DEFAULT_MAX_WORK_MIN = 50;
export const DEFAULT_LONG_BREAK_MIN = 15;

export type LiquidMode = "idle" | "work" | "rest" | "longBreak";

export type TimerCfg = {
  id: string;
  name: string;
  maxWorkMin?: number;
  workRestRatio?: number;
  longBreakMin?: number;
  /** @deprecated legacy field — mapped to maxWorkMin */
  focusMin?: number;
  breakMin?: number;
};

export function getMaxWorkMin(cfg: TimerCfg): number {
  return cfg.maxWorkMin ?? cfg.focusMin ?? DEFAULT_MAX_WORK_MIN;
}

export function getWorkRestRatio(cfg: TimerCfg): number {
  const r = cfg.workRestRatio ?? DEFAULT_WORK_REST_RATIO;
  return r >= 1 ? r : DEFAULT_WORK_REST_RATIO;
}

export function getLongBreakMin(cfg: TimerCfg): number {
  const m = cfg.longBreakMin ?? DEFAULT_LONG_BREAK_MIN;
  return m >= 1 ? m : DEFAULT_LONG_BREAK_MIN;
}

/** work:rest ratio with minute ceiling for earned rest. */
export function calcRestMinutes(
  workSeconds: number,
  ratio = DEFAULT_WORK_REST_RATIO,
): {
  rawMinutes: number;
  ceilMinutes: number;
} {
  if (workSeconds <= 0) return { rawMinutes: 0, ceilMinutes: 0 };
  const r = ratio >= 1 ? ratio : DEFAULT_WORK_REST_RATIO;
  const rawMinutes = workSeconds / 60 / r;
  return {
    rawMinutes,
    ceilMinutes: Math.max(1, Math.ceil(rawMinutes)),
  };
}

export function formatTimer(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function formatMinutes(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

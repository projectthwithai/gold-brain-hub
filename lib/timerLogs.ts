import { getSupabase, isSupabaseConfigured } from "./supabase";

export type TimerLogEventType =
  | "work_start"
  | "work_stop"
  | "work_limit"
  | "rest_start"
  | "rest_complete"
  | "rest_skipped"
  | "long_break_start"
  | "long_break_complete"
  | "long_break_skipped";

export type TimerLogEntry = {
  timerId: string;
  timerName: string;
  eventType: TimerLogEventType;
  workSeconds?: number;
  restMinutes?: number;
  restRawMinutes?: number;
  restCreditSeconds?: number;
  metadata?: Record<string, unknown>;
};

export async function logTimerEvent(
  userId: string | null | undefined,
  entry: TimerLogEntry,
): Promise<void> {
  if (!userId || !isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from("timer_logs").insert({
      user_id: userId,
      timer_id: entry.timerId,
      timer_name: entry.timerName,
      event_type: entry.eventType,
      work_seconds: entry.workSeconds ?? null,
      rest_minutes: entry.restMinutes ?? null,
      rest_raw_minutes: entry.restRawMinutes ?? null,
      rest_credit_seconds: entry.restCreditSeconds ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.error("timer_logs insert failed:", e);
  }
}

import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { RoutineItem, RoutineStep } from "./types";

export function deriveRoutineDone(steps: RoutineStep[] | undefined, fallback: boolean): boolean {
  if (!steps || steps.length === 0) return fallback;
  return steps.every((s) => s.isCompleted);
}

export function applyStepCompletion(
  steps: RoutineStep[],
  stepId: string,
): { steps: RoutineStep[]; allDone: boolean } {
  const next = steps.map((s) =>
    s.id === stepId ? { ...s, isCompleted: true } : s,
  );
  return { steps: next, allDone: next.every((s) => s.isCompleted) };
}

export function toggleStep(
  steps: RoutineStep[],
  stepId: string,
): { steps: RoutineStep[]; allDone: boolean } {
  const next = steps.map((s) =>
    s.id === stepId ? { ...s, isCompleted: !s.isCompleted } : s,
  );
  return { steps: next, allDone: next.every((s) => s.isCompleted) };
}

export function completeAllSteps(steps: RoutineStep[]): RoutineStep[] {
  return steps.map((s) => ({ ...s, isCompleted: true }));
}

export function resetSteps(steps: RoutineStep[] | undefined): RoutineStep[] | undefined {
  if (!steps?.length) return steps;
  return steps.map((s) => ({ ...s, isCompleted: false }));
}

export function sortSteps(steps: RoutineStep[]): RoutineStep[] {
  return [...steps].sort((a, b) => a.order - b.order);
}

export function nextIncompleteStep(steps: RoutineStep[]): RoutineStep | null {
  return sortSteps(steps).find((s) => !s.isCompleted) ?? null;
}

export async function syncRoutineToDb(
  userId: string,
  routine: RoutineItem,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.from("user_routine_items").upsert(
      {
        id: routine.id,
        user_id: userId,
        title: routine.task,
        time: routine.time,
        icon: routine.icon,
        freq: routine.freq,
        days: routine.days,
        is_shared: routine.isShared ?? false,
        done: routine.done,
        metadata: { iconImg: routine.iconImg },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,id" },
    );

    if (routine.steps?.length) {
      await supabase
        .from("routine_steps")
        .delete()
        .eq("user_id", userId)
        .eq("routine_id", routine.id);

      await supabase.from("routine_steps").insert(
        sortSteps(routine.steps).map((s) => ({
          id: s.id.length === 36 ? s.id : undefined,
          routine_id: routine.id,
          user_id: userId,
          title: s.title,
          step_order: s.order,
          is_completed: s.isCompleted,
          completed_date: s.isCompleted ? new Date().toISOString().slice(0, 10) : null,
        })),
      );
    }
  } catch (e) {
    console.error("syncRoutineToDb failed:", e);
  }
}

export async function syncAllRoutinesToDb(
  userId: string,
  routines: RoutineItem[],
): Promise<void> {
  await Promise.all(routines.map((r) => syncRoutineToDb(userId, r)));
}

export async function fetchSharedPartnerRoutines(
  partnerUserId: string,
): Promise<RoutineItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: items } = await supabase
    .from("user_routine_items")
    .select("*")
    .eq("user_id", partnerUserId)
    .eq("is_shared", true);

  if (!items?.length) return [];

  const { data: steps } = await supabase
    .from("routine_steps")
    .select("*")
    .eq("user_id", partnerUserId)
    .in(
      "routine_id",
      items.map((i) => i.id),
    );

  return items.map((item) => ({
    id: item.id,
    time: item.time,
    task: item.title,
    icon: item.icon ?? "📌",
    iconImg: (item.metadata as { iconImg?: string })?.iconImg ?? null,
    done: item.done,
    freq: item.freq,
    days: item.days ?? [],
    isShared: item.is_shared,
    steps: sortSteps(
      (steps ?? [])
        .filter((s) => s.routine_id === item.id)
        .map((s) => ({
          id: s.id,
          title: s.title,
          order: s.step_order,
          isCompleted: s.is_completed,
        })),
    ),
  }));
}

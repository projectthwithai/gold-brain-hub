import { getSupabase, isSupabaseConfigured } from "./supabase";
import type {
  PartnerActivity,
  PartnerEventType,
  PartnerSnapshot,
  Partnership,
} from "./types";

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createInviteCode(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const code = randomCode();
  const { error } = await supabase.from("partnerships").insert({
    owner_id: userId,
    partner_id: null,
    status: "pending",
    invite_code: code,
  });

  if (error) {
    console.error("createInviteCode:", error);
    return null;
  }
  return code;
}

export async function acceptInviteCode(
  userId: string,
  code: string,
): Promise<Partnership | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const normalized = code.trim().toUpperCase();
  const { data: row, error: findErr } = await supabase
    .from("partnerships")
    .select("*")
    .eq("invite_code", normalized)
    .eq("status", "pending")
    .is("partner_id", null)
    .maybeSingle();

  if (findErr || !row) return null;
  if (row.owner_id === userId) return null;

  const { data: updated, error: updErr } = await supabase
    .from("partnerships")
    .update({ partner_id: userId, status: "active", invite_code: null })
    .eq("id", row.id)
    .select("*")
    .single();

  if (updErr) return null;

  await logPartnerActivity(userId, updated.id, "joined", {
    message: "Partner joined via invite code",
  });

  return updated as Partnership;
}

export async function fetchActivePartnership(
  userId: string,
): Promise<Partnership | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from("partnerships")
    .select("*")
    .eq("status", "active")
    .or(`owner_id.eq.${userId},partner_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Partnership) ?? null;
}

export async function fetchPendingInviteCode(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from("partnerships")
    .select("invite_code")
    .eq("owner_id", userId)
    .eq("status", "pending")
    .is("partner_id", null)
    .not("invite_code", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.invite_code ?? null;
}

export function getPartnerUserId(
  partnership: Partnership,
  myUserId: string,
): string | null {
  if (partnership.owner_id === myUserId) return partnership.partner_id;
  if (partnership.partner_id === myUserId) return partnership.owner_id;
  return null;
}

export async function logPartnerActivity(
  userId: string,
  partnershipId: string,
  eventType: PartnerEventType,
  opts: { message: string; payload?: Record<string, unknown> },
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("partner_activities").insert({
    partnership_id: partnershipId,
    user_id: userId,
    event_type: eventType,
    message: opts.message,
    payload: opts.payload ?? {},
  });
}

export async function fetchPartnerActivities(
  partnershipId: string,
  limit = 20,
): Promise<PartnerActivity[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("partner_activities")
    .select("*")
    .eq("partnership_id", partnershipId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as PartnerActivity[]) ?? [];
}

export async function upsertPartnerSnapshot(
  userId: string,
  partnershipId: string,
  snapshot: PartnerSnapshot,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("partner_snapshots").upsert(
    {
      user_id: userId,
      partnership_id: partnershipId,
      snapshot,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,partnership_id" },
  );
}

export async function fetchPartnerSnapshot(
  partnerUserId: string,
  partnershipId: string,
): Promise<PartnerSnapshot | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from("partner_snapshots")
    .select("snapshot")
    .eq("user_id", partnerUserId)
    .eq("partnership_id", partnershipId)
    .maybeSingle();

  return (data?.snapshot as PartnerSnapshot) ?? null;
}

export function subscribePartnerActivities(
  partnershipId: string,
  onInsert: (activity: PartnerActivity) => void,
): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`partner-activities-${partnershipId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "partner_activities",
        filter: `partnership_id=eq.${partnershipId}`,
      },
      (payload) => {
        onInsert(payload.new as PartnerActivity);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

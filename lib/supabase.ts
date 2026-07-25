// lib/supabase.ts
// @ts-nocheck
import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let supabaseInstance: any = null;

// インスタンスの取得
export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return supabaseInstance;
}

// ★page.tsx:42行目のエラーを解決する関数
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey;
}

// ★page.tsx:43行目のエラーを解決する関数
export function onAuthStateChange(callback: (session: Session | null) => void) {
  const sb = getSupabase();
  if (!sb) return () => {};

  const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => {
    subscription.unsubscribe();
  };
}

// Googleサインイン
export async function signInWithGoogle() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : '',
    },
  });
}

// クラウドデータの全取得
export async function fetchAllData(userId: string): Promise<Record<string, any>> {
  const sb = getSupabase();
  if (!sb) return {};

  try {
    const { data, error } = await sb
      .from("user_data")
      .select("payload")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data?.payload || {};
  } catch (err) {
    console.error("Failed to fetch client data payload:", err);
    return {};
  }
}

// データのクラウド保存（JSONB形式）
export async function upsertData(userId: string, key: string, value: any) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const currentPayload = await fetchAllData(userId);
    const nextPayload = {
      ...currentPayload,
      [key]: value,
    };

    const { error } = await sb
      .from("user_data")
      .upsert({
        user_id: userId,
        payload: nextPayload,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) throw error;
  } catch (err) {
    console.error(`Failed to upsert client data on key [${key}]:`, err);
    throw err;
  }
}
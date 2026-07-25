// lib/supabase.ts
// @ts-nocheck
import { createClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// 1. 直接の export (partnerships.ts などが使用)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// 2. 関数形式の export (page.tsx などが使用)
export function getSupabase() {
  return supabase;
}

// 3. 設定確認
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey;
}

// 4. 認証リスナー
export function onAuthStateChange(callback: (session: Session | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}

// 5. Googleログイン
export async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : '',
    },
  });
}

// 6. クラウドデータの全取得
export async function fetchAllData(userId: string): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
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

// 7. データのクラウド保存（JSONB一括保存）
export async function upsertData(userId: string, key: string, value: any) {
  try {
    const currentPayload = await fetchAllData(userId);
    const nextPayload = {
      ...currentPayload,
      [key]: value,
    };

    const { error } = await supabase
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
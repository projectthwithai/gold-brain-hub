// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getSupabase() { return supabase; }

export const signInWithGoogle = async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin }
  });
};

// 【重要】クラウドから全データを一括取得する
export async function fetchAllData(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("payload")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data?.payload || {};
  } catch (err) {
    console.error("Fetch error:", err);
    return {};
  }
}

// 【重要】データをクラウドへ保存する
export async function upsertData(userId: string, key: string, value: any) {
  try {
    // 現在の全データを取得
    const current = await fetchAllData(userId);
    // 新しいデータ（tasksなど）を上書き
    const nextPayload = { ...current, [key]: value };

    const { error } = await supabase
      .from("user_data")
      .upsert({
        user_id: userId,
        payload: nextPayload,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    if (error) throw error;
  } catch (err) {
    console.error("Save error:", err);
  }
}
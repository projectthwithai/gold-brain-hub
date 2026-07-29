// lib/supabase.ts
// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getSupabase = () => supabase;
export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;

export const onAuthStateChange = (callback: any) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
};

export const signInWithGoogle = async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : '' }
  });
};

export const fetchAllData = async (userId: string) => {
  const { data, error } = await supabase.from("user_data").select("*").eq("user_id", userId);
  if (error) return {};
  return data.reduce((acc: any, item: any) => { acc[item.key] = item.value; return acc; }, {});
};

export const upsertData = async (userId: string, key: string, value: any) => {
  await supabase.from("user_data").upsert({ user_id: userId, key, value, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
};
// lib/partnerships.ts
// @ts-nocheck
import { supabase } from "./supabase";

// 1. 自分の招待コードを発行する
export const createInviteCode = async (userId: string) => {
  if (!supabase) return null;

  // 既存の保留中の招待があれば削除
  await supabase.from('partnerships').delete().eq('user1_id', userId).eq('status', 'pending');

  // ランダムな6桁のコードを生成
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { error } = await supabase
    .from('partnerships')
    .insert([{ user1_id: userId, invite_code: code, status: 'pending' }]);

  if (error) {
    console.error("Invite code generation error:", error);
    return null;
  }
  return code;
};

// 2. 相手のコードを入力して参加する
export const acceptInviteCode = async (userId: string, code: string) => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('partnerships')
    .update({ user2_id: userId, status: 'active', invite_code: null }) // 使用済みコードは消す
    .eq('invite_code', code)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) {
    console.error("Accept code error:", error);
    return null;
  }
  return data;
};

// 3. 現在有効なパートナーシップを取得する
export const fetchActivePartnership = async (userId: string) => {
  if (!supabase) return null;
  const { data } = await supabase
    .from('partnerships')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'active')
    .single();
  return data;
};
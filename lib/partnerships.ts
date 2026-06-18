// @ts-nocheck
import { supabase } from "./supabase";

export const fetchActivePartnership = async (userId: string) => {
  const { data } = await supabase.from('partnerships').select('*').or(`user1_id.eq.${userId},user2_id.eq.${userId}`).eq('status', 'active').single();
  return data;
};

export const createInviteCode = async (userId: string) => "INVITE";
export const acceptInviteCode = async (userId: string, code: string) => null;
export const fetchPartnerActivities = async (pId: string) => [];
export const logPartnerActivity = async (uId: string, pId: string, type: string, meta: any) => {};
export const subscribePartnerActivities = (pId: string, cb: any) => () => {};
export const fetchPartnerSnapshot = async (uId: string, pId: string) => null;
export const upsertPartnerSnapshot = async (uId: string, pId: string, snap: any) => {};
export const getPartnerUserId = (p: any, myId: string) => p.user1_id === myId ? p.user2_id : p.user1_id;
export const fetchPendingInviteCode = async (uId: string) => null;
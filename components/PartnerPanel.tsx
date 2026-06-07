"use client";

import { useState } from "react";
import type {
  PartnerActivity,
  PartnerSnapshot,
  Partnership,
  ThemeTokens,
} from "../lib/types";

type PartnerDict = {
  partner_title: string;
  partner_sub: string;
  invite_code: string;
  generate_code: string;
  enter_code: string;
  join_partner: string;
  routine_progress: string;
  goal_progress: string;
  activity_feed: string;
  no_partner: string;
  no_activity: string;
  copied: string;
  partner_label: string;
};

type Props = {
  TH: ThemeTokens;
  t: PartnerDict;
  lang: string;
  userId: string | null | undefined;
  userName: string;
  partnership: Partnership | null;
  pendingCode: string | null;
  partnerSnapshot: PartnerSnapshot | null;
  mySnapshot: PartnerSnapshot | null;
  activities: PartnerActivity[];
  onGenerateCode: () => void;
  onJoinCode: (code: string) => void;
  loading?: boolean;
};

function formatAmount(n: number, currency: string, lang: string): string {
  if (currency === "JPY" || lang === "ja") {
    return `¥${n.toLocaleString(lang === "ja" ? "ja-JP" : "en-US")}`;
  }
  return `$${n.toLocaleString()}`;
}

export default function PartnerPanel({
  TH,
  t,
  lang,
  userId,
  partnership,
  pendingCode,
  partnerSnapshot,
  mySnapshot,
  activities,
  onGenerateCode,
  onJoinCode,
  loading,
}: Props) {
  const [joinInput, setJoinInput] = useState("");
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!pendingCode) return;
    try {
      await navigator.clipboard.writeText(pendingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const renderGoalBar = (
    goal: PartnerSnapshot["goals"][0],
    key: string,
  ) => {
    const hasMoney = goal.targetAmount != null && goal.targetAmount > 0;
    const pct = hasMoney
      ? Math.min(
          100,
          Math.round(((goal.currentAmount ?? 0) / goal.targetAmount!) * 100),
        )
      : goal.progress;

    return (
      <div key={key} className="mb-3 sm:mb-4 last:mb-0">
        <div className="flex justify-between items-baseline gap-2 mb-1.5">
          <span className="text-xs sm:text-sm truncate" style={{ color: TH.text }}>
            {goal.goal}
          </span>
          <span
            className="text-[10px] sm:text-xs shrink-0 font-mono"
            style={{ color: TH.goldDark }}
          >
            {pct}%
          </span>
        </div>
        <div className="h-1.5 sm:h-2 rounded-full overflow-hidden" style={{ background: TH.border }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${TH.goldDark}, ${TH.goldLight})`,
            }}
          />
        </div>
        {hasMoney && (
          <p className="text-[10px] sm:text-xs mt-1" style={{ color: TH.textMuted }}>
            {formatAmount(goal.currentAmount ?? 0, goal.currency ?? "JPY", lang)}
            {" / "}
            {formatAmount(goal.targetAmount!, goal.currency ?? "JPY", lang)}
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      className="relative overflow-hidden rounded-sm border h-full flex flex-col"
      style={{ background: TH.surface, borderColor: TH.borderGold }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px z-[1]"
        style={{
          background: `linear-gradient(90deg,transparent,${TH.gold}44,transparent)`,
        }}
      />

      <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b" style={{ borderColor: TH.border }}>
        <h2
          className="text-xs sm:text-sm tracking-[4px] uppercase font-normal"
          style={{ color: TH.gold }}
        >
          {t.partner_title}
        </h2>
        <p className="text-[10px] sm:text-xs mt-1 tracking-wide" style={{ color: TH.textMuted }}>
          {t.partner_sub}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-4 sm:gap-5">
        {!userId ? (
          <p className="text-center text-xs sm:text-sm py-8" style={{ color: TH.textMuted }}>
            {t.no_partner}
          </p>
        ) : !partnership ? (
          <div className="flex flex-col gap-4 sm:gap-5">
            {pendingCode ? (
              <div
                className="p-4 sm:p-5 rounded-sm text-center border"
                style={{ borderColor: TH.goldDark, background: `${TH.gold}0a` }}
              >
                <p className="text-[10px] sm:text-xs tracking-[3px] uppercase mb-2" style={{ color: TH.textMuted }}>
                  {t.invite_code}
                </p>
                <p
                  className="text-2xl sm:text-3xl font-mono tracking-[6px] mb-3"
                  style={{ color: TH.goldLight }}
                >
                  {pendingCode}
                </p>
                <button
                  type="button"
                  onClick={copyCode}
                  className="min-h-[48px] w-full sm:w-auto sm:min-w-[160px] px-6 rounded-sm text-xs tracking-[3px] uppercase cursor-pointer"
                  style={{
                    background: `${TH.gold}18`,
                    border: `1px solid ${TH.gold}`,
                    color: TH.gold,
                    fontFamily: "inherit",
                  }}
                >
                  {copied ? t.copied : "Copy"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onGenerateCode}
                disabled={loading}
                className="min-h-[52px] w-full rounded-sm text-xs sm:text-sm tracking-[3px] uppercase cursor-pointer disabled:opacity-50"
                style={{
                  background: `${TH.gold}18`,
                  border: `1px solid ${TH.goldDark}`,
                  color: TH.gold,
                  fontFamily: "inherit",
                }}
              >
                {t.generate_code}
              </button>
            )}

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                placeholder={t.enter_code}
                maxLength={6}
                className="flex-1 min-h-[48px] sm:min-h-[52px] px-4 rounded-sm text-sm sm:text-base font-mono tracking-widest uppercase outline-none"
                style={{
                  background: TH.inputBg,
                  border: `1px solid ${TH.border}`,
                  color: TH.text,
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (joinInput.trim()) onJoinCode(joinInput.trim());
                }}
                disabled={joinInput.length < 6 || loading}
                className="min-h-[48px] sm:min-h-[52px] px-6 rounded-sm text-xs sm:text-sm tracking-[3px] uppercase cursor-pointer disabled:opacity-40 shrink-0"
                style={{
                  background: `${TH.gold}22`,
                  border: `1px solid ${TH.gold}`,
                  color: TH.gold,
                  fontFamily: "inherit",
                }}
              >
                {t.join_partner}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Partner progress cards — stack on mobile, side-by-side on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {partnerSnapshot && (
                <div
                  className="p-3 sm:p-4 rounded-sm border"
                  style={{ borderColor: TH.border, background: `${TH.gold}06` }}
                >
                  <p className="text-[10px] tracking-[3px] uppercase mb-2" style={{ color: TH.textMuted }}>
                    {t.partner_label}: {partnerSnapshot.user_name || "Partner"}
                  </p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl sm:text-3xl font-mono font-bold" style={{ color: TH.gold }}>
                      {partnerSnapshot.routine_pct}%
                    </span>
                    <span className="text-[10px] sm:text-xs" style={{ color: TH.textMuted }}>
                      {partnerSnapshot.routine_done}/{partnerSnapshot.routine_total} {t.routine_progress}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: TH.border }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${partnerSnapshot.routine_pct}%`,
                        background: `linear-gradient(90deg, ${TH.goldDark}, ${TH.goldLight})`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] tracking-[2px] uppercase mb-2" style={{ color: TH.textMuted }}>
                    {t.goal_progress}
                  </p>
                  {partnerSnapshot.goals.slice(0, 3).map((g) => renderGoalBar(g, g.id))}
                </div>
              )}

              {mySnapshot && (
                <div
                  className="p-3 sm:p-4 rounded-sm border"
                  style={{ borderColor: TH.border }}
                >
                  <p className="text-[10px] tracking-[3px] uppercase mb-2" style={{ color: TH.textMuted }}>
                    You
                  </p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl sm:text-3xl font-mono font-bold" style={{ color: TH.goldLight }}>
                      {mySnapshot.routine_pct}%
                    </span>
                    <span className="text-[10px] sm:text-xs" style={{ color: TH.textMuted }}>
                      {mySnapshot.routine_done}/{mySnapshot.routine_total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: TH.border }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${mySnapshot.routine_pct}%`,
                        background: `linear-gradient(90deg, ${TH.goldDark}, ${TH.goldLight})`,
                      }}
                    />
                  </div>
                  {mySnapshot.goals.slice(0, 3).map((g) => renderGoalBar(g, `my-${g.id}`))}
                </div>
              )}
            </div>

            {/* Activity feed */}
            <div>
              <p
                className="text-[10px] sm:text-xs tracking-[3px] uppercase mb-2 sm:mb-3"
                style={{ color: TH.textMuted }}
              >
                {t.activity_feed}
              </p>
              {activities.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: TH.textMuted }}>
                  {t.no_activity}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {activities.map((a) => (
                    <div
                      key={a.id}
                      className="flex gap-3 p-3 sm:p-3.5 rounded-sm min-h-[48px] items-start"
                      style={{
                        background: TH.surfaceHover,
                        border: `1px solid ${TH.border}`,
                      }}
                    >
                      <span className="text-base shrink-0">
                        {a.event_type === "work_start"
                          ? "🔥"
                          : a.event_type === "routine_complete"
                            ? "✓"
                            : a.event_type === "goal_update"
                              ? "💰"
                              : a.event_type === "joined"
                                ? "🤝"
                                : "▸"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm leading-snug" style={{ color: TH.text }}>
                          {a.message}
                        </p>
                        <p
                          className="text-[10px] mt-1 font-mono"
                          style={{ color: TH.textMuted }}
                        >
                          {new Date(a.created_at).toLocaleTimeString(
                            lang === "ja" ? "ja-JP" : "en-US",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

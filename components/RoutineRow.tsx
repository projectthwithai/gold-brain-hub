"use client";

import { useState } from "react";
import type { RoutineItem, ThemeTokens } from "../lib/types";
import { sortSteps } from "../lib/routineSteps";

function IconDisplay({ emoji, img, size = 18 }: { emoji: string; img: string | null; size?: number }) {
  if (img) {
    return (
      <img
        src={img}
        alt=""
        className="rounded object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>{emoji}</span>;
}

type RowDict = {
  play_sequence: string;
  steps_label: string;
  shared_badge: string;
};

type Props = {
  routine: RoutineItem;
  inactive?: boolean;
  onToggleExpand: () => void;
  expanded: boolean;
  onToggleDone: () => void;
  onEdit: () => void;
  onStartPlayer: () => void;
  onToggleStep: (stepId: string) => void;
  TH: ThemeTokens;
  t: RowDict;
};

export default function RoutineRow({
  routine,
  inactive = false,
  expanded,
  onToggleExpand,
  onToggleDone,
  onEdit,
  onStartPlayer,
  onToggleStep,
  TH,
  t,
}: Props) {
  const steps = sortSteps(routine.steps ?? []);
  const hasSteps = steps.length > 0;
  const completedSteps = steps.filter((s) => s.isCompleted).length;
  const [hover, setHover] = useState(false);

  return (
    <div
      className={inactive ? "opacity-50" : ""}
      style={{ borderBottom: `1px solid ${TH.border}` }}
    >
      <div
        className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 min-h-[52px] transition-colors"
        style={{
          borderLeft: `2px solid ${routine.done ? TH.gold : "transparent"}`,
          background: hover && !inactive ? TH.surfaceHover : undefined,
          cursor: "pointer",
          opacity: routine.done && !inactive ? 0.65 : 1,
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => {
          if (!inactive) onToggleDone();
        }}
      >
        <span
          className="shrink-0 w-10 sm:w-11 text-[11px] sm:text-xs"
          style={{
            fontFamily: "'Share Tech Mono',monospace",
            color: routine.done ? TH.goldDark : TH.textMuted,
          }}
        >
          {routine.time}
        </span>

        <IconDisplay emoji={routine.icon} img={routine.iconImg} size={18} />

        <div className="flex-1 min-w-0">
          <span
            className="block text-[13px] sm:text-sm truncate"
            style={{
              color: routine.done ? TH.textMuted : TH.text,
              textDecoration: routine.done ? "line-through" : "none",
            }}
          >
            {routine.task}
          </span>
          {hasSteps && (
            <span className="text-[9px] sm:text-[10px] tracking-wider uppercase" style={{ color: TH.textMuted }}>
              {completedSteps}/{steps.length} {t.steps_label}
            </span>
          )}
        </div>

        {routine.isShared && (
          <span
            className="hidden sm:inline text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-sm shrink-0"
            style={{ color: TH.gold, border: `1px solid ${TH.gold}44` }}
          >
            {t.shared_badge}
          </span>
        )}

        {hasSteps && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartPlayer();
            }}
            className="min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-auto px-3 rounded-sm text-[10px] sm:text-[11px] tracking-[2px] uppercase shrink-0 cursor-pointer"
            style={{
              background: `${TH.gold}18`,
              border: `1px solid ${TH.goldDark}`,
              color: TH.gold,
              fontFamily: "inherit",
            }}
          >
            ▶
          </button>
        )}

        <div
          className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded-sm flex items-center justify-center"
          style={{
            border: `1px solid ${routine.done ? TH.gold : TH.border}`,
            background: routine.done ? `${TH.gold}1a` : "transparent",
            opacity: inactive ? 0.4 : 1,
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!inactive) onToggleDone();
          }}
        >
          {routine.done && <span style={{ fontSize: 12, color: TH.gold }}>✓</span>}
        </div>

        <button
          type="button"
          className="edit-btn min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          ✏️
        </button>

        {hasSteps && (
          <button
            type="button"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
            style={{ background: "none", border: "none", color: TH.goldDark }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            <span
              className="text-sm transition-transform duration-200 inline-block"
              style={{ transform: expanded ? "rotate(180deg)" : "none" }}
            >
              ▾
            </span>
          </button>
        )}
      </div>

      {expanded && hasSteps && (
        <div
          className="px-3 sm:px-4 pb-3 sm:pb-4"
          style={{ background: `${TH.gold}05` }}
        >
          {steps.map((step, i) => (
            <div
              key={step.id}
              className="flex items-center gap-3 py-2.5 sm:py-3 min-h-[48px] cursor-pointer rounded-sm px-2"
              style={{
                borderBottom: i < steps.length - 1 ? `1px solid ${TH.border}` : "none",
              }}
              onClick={() => onToggleStep(step.id)}
            >
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-sm flex items-center justify-center"
                style={{
                  border: `1px solid ${step.isCompleted ? TH.gold : TH.border}`,
                  background: step.isCompleted ? `${TH.gold}1a` : "transparent",
                }}
              >
                {step.isCompleted && (
                  <span style={{ fontSize: 13, color: TH.gold }}>✓</span>
                )}
              </div>
              <span
                className="flex-1 text-[13px] sm:text-sm"
                style={{
                  color: step.isCompleted ? TH.textMuted : TH.text,
                  textDecoration: step.isCompleted ? "line-through" : "none",
                }}
              >
                {i + 1}. {step.title}
              </span>
            </div>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartPlayer();
            }}
            className="w-full mt-2 min-h-[48px] rounded-sm text-xs sm:text-sm tracking-[3px] uppercase cursor-pointer"
            style={{
              background: `${TH.gold}15`,
              border: `1px dashed ${TH.goldDark}`,
              color: TH.gold,
              fontFamily: "inherit",
            }}
          >
            ▶ {t.play_sequence}
          </button>
        </div>
      )}
    </div>
  );
}

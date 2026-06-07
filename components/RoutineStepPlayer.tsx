"use client";

import type { RoutineItem, RoutineStep, ThemeTokens } from "../lib/types";
import { nextIncompleteStep, sortSteps } from "../lib/routineSteps";

type StepPlayerDict = {
  step_of: (current: number, total: number) => string;
  complete_step: string;
  exit_player: string;
  all_done: string;
  focus_mode: string;
};

type Props = {
  routine: RoutineItem;
  onCompleteStep: (stepId: string) => void;
  onClose: () => void;
  TH: ThemeTokens;
  t: StepPlayerDict;
};

export default function RoutineStepPlayer({
  routine,
  onCompleteStep,
  onClose,
  TH,
  t,
}: Props) {
  const steps = sortSteps(routine.steps ?? []);
  const current = nextIncompleteStep(steps);
  const currentIdx = current ? steps.findIndex((s) => s.id === current.id) : -1;
  const allDone = steps.length > 0 && !current;

  return (
    <div
      className="fixed inset-0 z-[3000] flex flex-col items-center justify-center p-4 sm:p-8"
      style={{ background: "rgba(0,0,0,.92)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-lg rounded-md border p-6 sm:p-10 flex flex-col items-center gap-6 sm:gap-8"
        style={{
          background: TH.surface,
          borderColor: TH.goldDark,
          boxShadow: `0 0 80px ${TH.gold}22`,
        }}
      >
        <div className="text-center w-full">
          <p
            className="text-[10px] sm:text-xs tracking-[4px] uppercase mb-2"
            style={{ color: TH.textMuted }}
          >
            {t.focus_mode}
          </p>
          <h2
            className="text-lg sm:text-2xl tracking-wide font-normal"
            style={{ color: TH.gold }}
          >
            {routine.icon} {routine.task}
          </h2>
          <p
            className="text-[10px] sm:text-xs mt-2 tracking-[3px] uppercase"
            style={{ color: TH.textMuted, fontFamily: "'Share Tech Mono',monospace" }}
          >
            {routine.time}
          </p>
        </div>

        {allDone ? (
          <div className="text-center py-8 sm:py-12">
            <div className="text-5xl sm:text-6xl mb-4">✦</div>
            <p className="text-base sm:text-xl" style={{ color: TH.goldLight }}>
              {t.all_done}
            </p>
          </div>
        ) : current ? (
          <>
            <p
              className="text-[10px] sm:text-xs tracking-[3px] uppercase"
              style={{ color: TH.goldDark }}
            >
              {t.step_of(currentIdx + 1, steps.length)}
            </p>
            <div
              className="w-full text-center py-8 sm:py-12 px-4 rounded-md"
              style={{
                background: `radial-gradient(ellipse at center, ${TH.gold}14 0%, transparent 70%)`,
                border: `1px solid ${TH.gold}44`,
              }}
            >
              <p
                className="text-2xl sm:text-4xl leading-snug"
                style={{ color: TH.text }}
              >
                {current.title}
              </p>
            </div>

            <div className="flex gap-2 sm:gap-3 w-full justify-center flex-wrap">
              {steps.map((s, i) => (
                <div
                  key={s.id}
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all"
                  style={{
                    background: s.isCompleted
                      ? TH.gold
                      : s.id === current.id
                        ? TH.goldLight
                        : TH.border,
                    boxShadow: s.id === current.id ? `0 0 10px ${TH.gold}` : "none",
                    transform: s.id === current.id ? "scale(1.3)" : "scale(1)",
                  }}
                  title={`Step ${i + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => onCompleteStep(current.id)}
              className="w-full min-h-[52px] sm:min-h-[56px] rounded-sm text-sm sm:text-base tracking-[3px] uppercase cursor-pointer transition-all active:scale-[0.98]"
              style={{
                background: `${TH.gold}22`,
                border: `1px solid ${TH.gold}`,
                color: TH.gold,
                fontFamily: "inherit",
              }}
            >
              ✓ {t.complete_step}
            </button>
          </>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-6 rounded-sm text-xs sm:text-sm tracking-[3px] uppercase cursor-pointer"
          style={{
            background: "transparent",
            border: `1px solid ${TH.border}`,
            color: TH.textMuted,
            fontFamily: "inherit",
          }}
        >
          {t.exit_player}
        </button>
      </div>
    </div>
  );
}

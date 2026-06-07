"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  calcRestMinutes,
  formatTimer,
  formatMinutes,
  getMaxWorkMin,
  getWorkRestRatio,
  getLongBreakMin,
  type LiquidMode,
  type TimerCfg,
} from "../lib/liquidTimer";
import { logTimerEvent } from "../lib/timerLogs";

type Theme = {
  surface: string;
  border: string;
  borderGold: string;
  text: string;
  textMuted: string;
  gold: string;
  goldLight: string;
  goldDark: string;
};

type Dict = {
  start: string;
  stop: string;
  reset: string;
  focus_lbl: string;
  break_lbl: string;
  long_break: string;
  rest_credit: string;
  ceiling_note: (raw: string, ceil: string) => string;
  max_work: string;
  sessions: string;
  idle_lbl: string;
  worked_for: string;
};

type Props = {
  cfg: TimerCfg;
  isDefault: boolean;
  onDelete: () => void;
  onEdit?: () => void;
  onFocusChange?: (active: boolean) => void;
  TH: Theme;
  t: Dict;
  userId?: string | null;
  unlockAudio: () => void;
  playBowlSound: (phase: "focus" | "break") => void;
  sendTimerNotification: (phase: "focus" | "break") => void;
};

type DisplayState = {
  mode: LiquidMode;
  displaySeconds: number;
  restCredit: number;
  ceilingNote: string | null;
  sessions: number;
  lastWorkSeconds: number;
};

export default function LiquidTimerCard({
  cfg,
  isDefault,
  onDelete,
  onEdit,
  onFocusChange,
  TH,
  t,
  userId,
  unlockAudio,
  playBowlSound,
  sendTimerNotification,
}: Props) {
  const maxWorkSec = getMaxWorkMin(cfg) * 60;
  const workRestRatio = getWorkRestRatio(cfg);
  const longBreakSec = getLongBreakMin(cfg) * 60;

  const modeRef = useRef<LiquidMode>("idle");
  const workElapsedRef = useRef(0);
  const lastWorkSecRef = useRef(0);
  const restTotalRef = useRef(0);
  const restRemainRef = useRef(0);
  const restCreditRef = useRef(0);
  const sessionsRef = useRef(0);
  const startTsRef = useRef<number | null>(null);
  const iRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<() => void>(() => {});

  const [running, setRunning] = useState(false);
  const [display, setDisplay] = useState<DisplayState>({
    mode: "idle",
    displaySeconds: 0,
    restCredit: 0,
    ceilingNote: null,
    sessions: 0,
    lastWorkSeconds: 0,
  });

  const syncDisplay = useCallback((patch: Partial<DisplayState> = {}) => {
    setDisplay((prev) => ({
      mode: modeRef.current,
      displaySeconds:
        modeRef.current === "work"
          ? workElapsedRef.current
          : modeRef.current === "rest" || modeRef.current === "longBreak"
            ? restRemainRef.current
            : 0,
      restCredit: restCreditRef.current,
      ceilingNote:
        patch.ceilingNote !== undefined ? patch.ceilingNote : prev.ceilingNote,
      sessions: sessionsRef.current,
      lastWorkSeconds: lastWorkSecRef.current,
      ...patch,
    }));
  }, []);

  const clearTick = useCallback(() => {
    if (iRef.current) {
      clearInterval(iRef.current);
      iRef.current = null;
    }
  }, []);

  const setFocusActive = useCallback(
    (active: boolean) => {
      onFocusChange?.(active);
    },
    [onFocusChange],
  );

  const beginRest = useCallback(
    (workSeconds: number, reason: "work_stop" | "work_limit") => {
      const { rawMinutes, ceilMinutes } = calcRestMinutes(workSeconds, workRestRatio);
      if (ceilMinutes <= 0) {
        modeRef.current = "idle";
        setRunning(false);
        setFocusActive(false);
        syncDisplay();
        return;
      }

      lastWorkSecRef.current = workSeconds;
      sessionsRef.current += 1;
      modeRef.current = "rest";
      restTotalRef.current = ceilMinutes * 60;
      restRemainRef.current = ceilMinutes * 60;
      startTsRef.current = Date.now();
      setRunning(true);
      setFocusActive(false);

      const rawStr = rawMinutes.toFixed(1);
      const ceilingNote = t.ceiling_note(rawStr, String(ceilMinutes));

      playBowlSound("break");
      sendTimerNotification("break");

      logTimerEvent(userId, {
        timerId: cfg.id,
        timerName: cfg.name,
        eventType: reason === "work_limit" ? "work_limit" : "work_stop",
        workSeconds,
        restMinutes: ceilMinutes,
        restRawMinutes: rawMinutes,
        restCreditSeconds: restCreditRef.current,
      });
      logTimerEvent(userId, {
        timerId: cfg.id,
        timerName: cfg.name,
        eventType: "rest_start",
        workSeconds,
        restMinutes: ceilMinutes,
        restRawMinutes: rawMinutes,
        restCreditSeconds: restCreditRef.current,
      });

      syncDisplay({ ceilingNote, lastWorkSeconds: workSeconds });
      startTsRef.current = Date.now();
      if (!iRef.current) {
        iRef.current = setInterval(() => tickRef.current(), 500);
      }
    },
    [
      cfg.id,
      cfg.name,
      userId,
      playBowlSound,
      sendTimerNotification,
      setFocusActive,
      syncDisplay,
      t,
      workRestRatio,
    ],
  );

  const finishRest = useCallback(() => {
    logTimerEvent(userId, {
      timerId: cfg.id,
      timerName: cfg.name,
      eventType: "rest_complete",
      restCreditSeconds: restCreditRef.current,
    });
    modeRef.current = "idle";
    restTotalRef.current = 0;
    restRemainRef.current = 0;
    startTsRef.current = null;
    setRunning(false);
    syncDisplay({ ceilingNote: null });
  }, [cfg.id, cfg.name, userId, syncDisplay]);

  const finishLongBreak = useCallback(
    (skipped: boolean) => {
      logTimerEvent(userId, {
        timerId: cfg.id,
        timerName: cfg.name,
        eventType: skipped ? "long_break_skipped" : "long_break_complete",
        restCreditSeconds: restCreditRef.current,
      });
      modeRef.current = "idle";
      restTotalRef.current = 0;
      restRemainRef.current = 0;
      startTsRef.current = null;
      setRunning(false);
      setFocusActive(false);
      syncDisplay({ ceilingNote: null });
    },
    [cfg.id, cfg.name, userId, setFocusActive, syncDisplay],
  );

  const tick = useCallback(() => {
    if (!startTsRef.current) return;
    const elapsed = Math.floor((Date.now() - startTsRef.current) / 1000);

    if (modeRef.current === "work") {
      workElapsedRef.current = elapsed;
      if (workElapsedRef.current >= maxWorkSec) {
        clearTick();
        beginRest(maxWorkSec, "work_limit");
        return;
      }
      syncDisplay();
      return;
    }

    if (modeRef.current === "rest" || modeRef.current === "longBreak") {
      const remaining = restTotalRef.current - elapsed;
      if (remaining <= 0) {
        clearTick();
        if (modeRef.current === "rest") {
          finishRest();
        } else {
          finishLongBreak(false);
        }
        return;
      }
      restRemainRef.current = remaining;
      syncDisplay();
    }
  }, [maxWorkSec, clearTick, beginRest, finishRest, finishLongBreak, syncDisplay]);

  tickRef.current = tick;

  const startInterval = useCallback(() => {
    if (iRef.current) return;
    startTsRef.current = Date.now();
    iRef.current = setInterval(tick, 500);
    setRunning(true);
  }, [tick]);

  const doStartWork = () => {
    unlockAudio();
    if (modeRef.current === "rest" && running) {
      const skipped = restRemainRef.current;
      restCreditRef.current += skipped;
      clearTick();
      logTimerEvent(userId, {
        timerId: cfg.id,
        timerName: cfg.name,
        eventType: "rest_skipped",
        restCreditSeconds: restCreditRef.current,
        metadata: { skipped_seconds: skipped },
      });
    } else if (modeRef.current === "longBreak") {
      return;
    }

    modeRef.current = "work";
    workElapsedRef.current = 0;
    restTotalRef.current = 0;
    restRemainRef.current = 0;
    startInterval();
    setFocusActive(true);

    logTimerEvent(userId, {
      timerId: cfg.id,
      timerName: cfg.name,
      eventType: "work_start",
      restCreditSeconds: restCreditRef.current,
    });
    syncDisplay({ ceilingNote: null });
  };

  const doStop = () => {
    if (!running) return;
    clearTick();

    if (modeRef.current === "work") {
      const worked = workElapsedRef.current;
      setRunning(false);
      setFocusActive(false);
      if (worked > 0) {
        beginRest(worked, "work_stop");
      } else {
        modeRef.current = "idle";
        syncDisplay();
      }
      return;
    }

    if (modeRef.current === "rest") {
      finishRest();
      return;
    }

    if (modeRef.current === "longBreak") {
      restCreditRef.current = restRemainRef.current;
      finishLongBreak(true);
    }
  };

  const doReset = () => {
    clearTick();
    modeRef.current = "idle";
    workElapsedRef.current = 0;
    restTotalRef.current = 0;
    restRemainRef.current = 0;
    startTsRef.current = null;
    setRunning(false);
    setFocusActive(false);
    syncDisplay({ ceilingNote: null });
  };

  const doLongBreak = () => {
    if (restCreditRef.current < longBreakSec || running) return;
    unlockAudio();
    modeRef.current = "longBreak";
    restTotalRef.current = longBreakSec;
    restRemainRef.current = longBreakSec;
    restCreditRef.current -= longBreakSec;
    startInterval();
    setFocusActive(false);

    logTimerEvent(userId, {
      timerId: cfg.id,
      timerName: cfg.name,
      eventType: "long_break_start",
      restCreditSeconds: restCreditRef.current,
      metadata: { duration_seconds: longBreakSec },
    });
    playBowlSound("break");
    syncDisplay({ ceilingNote: null });
  };

  useEffect(() => () => clearTick(), [clearTick]);

  const { mode, displaySeconds, restCredit, ceilingNote, sessions, lastWorkSeconds } = display;
  const isWork = mode === "work";
  const isRest = mode === "rest";
  const isLongBreak = mode === "longBreak";
  const isBreak = isRest || isLongBreak;

  const ac = isBreak ? "#4AFF9E" : TH.gold;
  const relaxBg = isBreak ? "#4AFF9E0a" : "transparent";

  let total = maxWorkSec;
  let pct = 0;
  if (isWork) {
    total = maxWorkSec;
    pct = total > 0 ? Math.min(1, displaySeconds / total) : 0;
  } else if (isBreak) {
    total = restTotalRef.current || 1;
    pct = total > 0 ? displaySeconds / total : 0;
  }

  const R = 52;
  const circ = 2 * Math.PI * R;
  const CX = 72;
  const CY = 72;
  const gId = `ltg-${cfg.id}`;
  const maxCreditSec = Math.ceil((maxWorkSec / workRestRatio));
  const creditPct = maxCreditSec > 0 ? Math.min(1, restCredit / maxCreditSec) : 0;
  const canLongBreak = restCredit >= longBreakSec && !running;

  const phaseLabel = isLongBreak
    ? t.long_break
    : isRest
      ? t.break_lbl
      : isWork
        ? t.focus_lbl
        : t.idle_lbl;

  const primaryLabel =
    mode === "idle" || (mode === "rest" && !running)
      ? t.start
      : mode === "rest" && running
        ? t.start
        : t.stop;

  const handlePrimary = () => {
    if (mode === "idle") doStartWork();
    else if (mode === "rest" && !running) doStartWork();
    else if (mode === "rest" && running) doStartWork();
    else if (mode === "work" && running) doStop();
    else if (mode === "longBreak") doStop();
    else if (mode === "work" && !running) doStartWork();
  };

  return (
    <div
      style={{
        background: isWork && running ? `${TH.gold}08` : isBreak ? relaxBg : TH.surface,
        border: `1px solid ${running || isBreak ? ac + "88" : TH.borderGold}`,
        borderRadius: 4,
        padding: "18px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        position: "relative",
        transition: "border-color .3s, box-shadow .3s, background .3s",
        boxShadow: running || isBreak ? `0 0 22px ${ac}22` : "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(90deg,transparent,${running || isBreak ? ac : TH.gold}66,transparent)`,
        }}
      />

      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: 3,
            color: running || isBreak ? ac : TH.goldDark,
            textTransform: "uppercase",
            cursor: onEdit ? "pointer" : undefined,
          }}
          onClick={onEdit}
          title={onEdit ? "Settings" : undefined}
        >
          {cfg.name}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {onEdit && (
            <button
              onClick={onEdit}
              style={{
                background: "none",
                border: `1px solid ${TH.border}`,
                color: TH.textMuted,
                cursor: "pointer",
                fontSize: 11,
                padding: "2px 7px",
                borderRadius: 2,
              }}
            >
              ⚙
            </button>
          )}
          {!isDefault && (
          <button
            onClick={onDelete}
            style={{
              background: "none",
              border: `1px solid ${TH.border}`,
              color: TH.textMuted,
              cursor: "pointer",
              fontSize: 11,
              padding: "2px 7px",
              borderRadius: 2,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#FF7777";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = TH.textMuted;
            }}
          >
            ✕
          </button>
          )}
        </div>
      </div>

      <div style={{ position: "relative", width: 144, height: 144 }}>
        <svg
          width={144}
          height={144}
          style={{
            position: "absolute",
            inset: 0,
            filter: `drop-shadow(0 0 14px ${ac}${running || isBreak ? "44" : "1a"})`,
          }}
        >
          <defs>
            <linearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isBreak ? "#2ADF7E" : TH.goldDark} />
              <stop offset="100%" stopColor={isBreak ? "#4AFF9E" : TH.goldLight} />
            </linearGradient>
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={TH.border} strokeWidth="10" />
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={`url(#${gId})`}
            strokeWidth="10"
            strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
            strokeDashoffset={circ * 0.25}
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'Share Tech Mono',monospace",
              fontSize: 28,
              letterSpacing: 2,
              lineHeight: 1,
              color: running || isBreak ? ac : TH.goldLight,
              textShadow: running || isBreak ? `0 0 18px ${ac}88` : "none",
            }}
          >
            {formatTimer(displaySeconds)}
          </span>
          <span
            style={{
              fontSize: 10,
              color: TH.textMuted,
              letterSpacing: 3,
              marginTop: 5,
              textTransform: "uppercase",
            }}
          >
            {phaseLabel}
          </span>
        </div>
      </div>

      {isRest && lastWorkSeconds > 0 && (
        <p
          style={{
            fontSize: 10,
            color: TH.goldDark,
            letterSpacing: 2,
            textAlign: "center",
            margin: 0,
            fontFamily: "'Share Tech Mono',monospace",
          }}
        >
          {t.worked_for}: {formatMinutes(lastWorkSeconds)}
        </p>
      )}

      {ceilingNote && isRest && (
        <p
          style={{
            fontSize: 9,
            color: "#4AFF9E",
            letterSpacing: 1,
            textAlign: "center",
            lineHeight: 1.5,
            margin: 0,
            padding: "0 4px",
          }}
        >
          ✦ {ceilingNote}
        </p>
      )}

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 9,
              letterSpacing: 2,
              color: TH.textMuted,
              textTransform: "uppercase",
            }}
          >
            {t.rest_credit}
          </span>
          <span
            style={{
              fontSize: 10,
              color: restCredit > 0 ? "#4AFF9E" : TH.textMuted,
              fontFamily: "'Share Tech Mono',monospace",
              letterSpacing: 1,
            }}
          >
            {formatMinutes(restCredit)}
          </span>
        </div>
        <div
          style={{
            height: 4,
            background: TH.border,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${creditPct * 100}%`,
              background: "linear-gradient(90deg,#2ADF7E,#4AFF9E)",
              borderRadius: 2,
              transition: "width .4s ease",
              boxShadow: restCredit > 0 ? "0 0 8px #4AFF9E44" : "none",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={handlePrimary}
          style={{
            background: running && isWork ? `${ac}22` : isBreak ? `${ac}18` : `${TH.gold}18`,
            border: `1px solid ${running || isBreak ? ac : TH.goldDark}`,
            color: running || isBreak ? ac : TH.gold,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 11,
            letterSpacing: 3,
            padding: "9px 20px",
            borderRadius: 2,
            textTransform: "uppercase",
            minWidth: 90,
          }}
        >
          {primaryLabel}
        </button>
        <button
          onClick={doLongBreak}
          disabled={!canLongBreak}
          style={{
            background: canLongBreak ? "#4AFF9E18" : "transparent",
            border: `1px solid ${canLongBreak ? "#4AFF9E" : TH.border}`,
            color: canLongBreak ? "#4AFF9E" : TH.textMuted,
            cursor: canLongBreak ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            fontSize: 10,
            letterSpacing: 2,
            padding: "9px 12px",
            borderRadius: 2,
            textTransform: "uppercase",
            opacity: canLongBreak ? 1 : 0.45,
          }}
        >
          {t.long_break}
        </button>
        <button
          onClick={doReset}
          style={{
            background: "transparent",
            border: `1px solid ${TH.border}`,
            color: TH.textMuted,
            cursor: "pointer",
            fontSize: 18,
            padding: "9px 12px",
            borderRadius: 2,
          }}
        >
          ↺
        </button>
      </div>

      {sessions > 0 && (
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: TH.gold,
                boxShadow: `0 0 5px ${TH.gold}`,
              }}
            />
          ))}
          <span style={{ fontSize: 10, color: TH.goldDark, letterSpacing: 2, marginLeft: 4 }}>
            {sessions} {t.sessions}
          </span>
        </div>
      )}

      <div
        style={{
          fontSize: 10,
          color: TH.textMuted,
          letterSpacing: 2,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        {t.max_work}: {getMaxWorkMin(cfg)}m · {workRestRatio}:1 · {t.long_break} {getLongBreakMin(cfg)}m
      </div>
    </div>
  );
}

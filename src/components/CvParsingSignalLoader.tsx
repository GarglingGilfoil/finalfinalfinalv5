import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  DEFAULT_CV_PARSING_HEADING_LOCKUP,
  DEFAULT_CV_PARSING_SIGNALS,
  DEFAULT_CV_PARSING_STATUS_LINES
} from "../lib/mock-cv-parsing-signals";
import type {
  CvParsingHeadingLockup,
  CvParsingSignalDefinition,
  CvParsingSignalTierHint,
  CvParsingSignalTone,
  CvParsingSignalTrack
} from "../lib/mock-cv-parsing-signals";

const DESKTOP_STABLE_VISIBLE_SIGNALS = 4;
const DESKTOP_TRANSITION_VISIBLE_SIGNALS = 5;
const COMPACT_STABLE_VISIBLE_SIGNALS = 3;
const COMPACT_TRANSITION_VISIBLE_SIGNALS = 4;
const INTRO_DELAY_MS = 840;
const BUILD_INTERVAL_MS = 860;
const FOCUS_INTERVAL_MS = 5600;
const RECOMPOSE_INTERVAL_MS = 11800;
const RECOMPOSE_EXIT_MS = 420;
const RECOMPOSE_ENTER_MS = 760;
const LEAD_TRANSFER_WINDOW_MS = 1120;
const STATUS_INTERVAL_MS = 9400;

interface ChipSlotGeometry {
  widthRem: number;
  labelMaxRem: number;
}

const DESKTOP_SIGNAL_SLOTS = [
  {
    id: "north",
    className: "cv-signal-loader__chip--slot-a",
    supportPriority: [1, 2, 3, 4]
  },
  {
    id: "west",
    className: "cv-signal-loader__chip--slot-b",
    supportPriority: [0, 3, 2, 4]
  },
  {
    id: "east",
    className: "cv-signal-loader__chip--slot-c",
    supportPriority: [0, 4, 1, 3]
  },
  {
    id: "south-west",
    className: "cv-signal-loader__chip--slot-d",
    supportPriority: [1, 0, 4, 2]
  },
  {
    id: "south-east",
    className: "cv-signal-loader__chip--slot-e",
    supportPriority: [2, 0, 3, 1]
  }
] as const;

const COMPACT_SIGNAL_SLOTS = [
  {
    id: "north",
    className: "cv-signal-loader__chip--slot-a",
    supportPriority: [1, 2, 3]
  },
  {
    id: "west",
    className: "cv-signal-loader__chip--slot-b",
    supportPriority: [0, 3, 2]
  },
  {
    id: "east",
    className: "cv-signal-loader__chip--slot-c",
    supportPriority: [0, 3, 1]
  },
  {
    id: "south",
    className: "cv-signal-loader__chip--slot-e",
    supportPriority: [1, 2, 0]
  }
] as const;

const DESKTOP_CHIP_SLOT_GEOMETRY: readonly ChipSlotGeometry[] = [
  { widthRem: 14.2, labelMaxRem: 11.8 },
  { widthRem: 12.2, labelMaxRem: 9.8 },
  { widthRem: 12.2, labelMaxRem: 9.8 },
  { widthRem: 11.2, labelMaxRem: 8.8 },
  { widthRem: 11.2, labelMaxRem: 8.8 }
] as const;

const COMPACT_CHIP_SLOT_GEOMETRY: readonly ChipSlotGeometry[] = [
  { widthRem: 12.1, labelMaxRem: 9.8 },
  { widthRem: 8.4, labelMaxRem: 6.4 },
  { widthRem: 8.4, labelMaxRem: 6.4 },
  { widthRem: 10.8, labelMaxRem: 8.6 }
] as const;

type ScenePhase = "intro" | "bloom" | "build" | "stable" | "recompose";
type EnterState = "idle" | "blooming" | "entering" | "settled";
type ExitState = "idle" | "exiting";
type FocusState = "resting" | "focused" | "promoting" | "demoting";
type TierState = "steady" | "promoting" | "demoting";

type SignalSlotDefinition = (typeof DESKTOP_SIGNAL_SLOTS)[number] | (typeof COMPACT_SIGNAL_SLOTS)[number];

type CvParsingSignalInput = string | CvParsingSignalDefinition;

interface NormalizedSignal {
  id: string;
  label: string;
  tone: CvParsingSignalTone;
  initialTier?: CvParsingSignalTierHint;
  footprintRem: number;
  sceneWeight: number;
  track: CvParsingSignalTrack;
}

interface LeadTransferState {
  from: number;
  to: number;
}

interface RecomposeState {
  slotIndex: number;
  outgoingSignalId: string;
  incomingSignalId: string;
  stage: "exit" | "enter";
}

type ChipStyle = CSSProperties & Record<string, string | number | undefined>;

export interface CvParsingSignalLoaderProps {
  avatarSrc?: string;
  candidateName?: string;
  heading?: CvParsingHeadingLockup;
  extractedSignals?: readonly CvParsingSignalInput[];
  onSkip?: () => void;
  skipDisabled?: boolean;
  skipLabel?: string;
  statusLines?: readonly string[];
  transitionState?: "idle" | "exiting";
  className?: string;
}

function formatSignalSummary(
  signals: readonly NormalizedSignal[],
  leadIndex: number,
  slotDefinitions: readonly SignalSlotDefinition[],
  tierMapOverride?: readonly CvParsingSignalTierHint[]
): string {
  if (signals.length === 0) {
    return "We are building your profile from the clearest signals in your CV.";
  }

  const resolvedTierMap =
    tierMapOverride && tierMapOverride.length === signals.length
      ? tierMapOverride
      : buildStableTierMap(signals.length, leadIndex, slotDefinitions);
  const leadSignal = signals.find((_signal, index) => resolvedTierMap[index] === "lead") ?? signals[0];
  const supportSignals = signals
    .filter((_signal, index) => resolvedTierMap[index] === "support")
    .map((signal) => signal.label);
  const peripheralSignal =
    signals.find((_signal, index) => resolvedTierMap[index] === "peripheral")?.label ?? null;

  if (supportSignals.length === 0 && !peripheralSignal) {
    return `We are building your profile. The strongest signal we recognized from your CV is ${leadSignal.label}.`;
  }

  const supportSummary =
    supportSignals.length === 1
      ? supportSignals[0]
      : supportSignals.length === 2
        ? `${supportSignals[0]} and ${supportSignals[1]}`
        : `${supportSignals.slice(0, -1).join(", ")}, and ${supportSignals[supportSignals.length - 1]}`;
  const peripheralSummary = peripheralSignal ? ` Background signal: ${peripheralSignal}.` : "";

  if (supportSignals.length === 0) {
    return `We are building your profile. Lead signal: ${leadSignal.label}.${peripheralSummary}`;
  }

  return `We are building your profile. Lead signal: ${leadSignal.label}. Supporting signals: ${supportSummary}.${peripheralSummary}`;
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => {
      setReducedMotion(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => {
        mediaQuery.removeEventListener("change", update);
      };
    }

    mediaQuery.addListener(update);
    return () => {
      mediaQuery.removeListener(update);
    };
  }, []);

  return reducedMotion;
}

function useCompactSignalLayout(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 560px)");
    const update = (): void => {
      setCompact(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => {
        mediaQuery.removeEventListener("change", update);
      };
    }

    mediaQuery.addListener(update);
    return () => {
      mediaQuery.removeListener(update);
    };
  }, []);

  return compact;
}

function normalizeLines(values: readonly string[] | undefined, fallback: readonly string[]): string[] {
  const resolved = values?.length ? values : fallback;
  const seen = new Set<string>();

  return resolved
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const normalizedValue = value.toLowerCase();

      if (seen.has(normalizedValue)) {
        return false;
      }

      seen.add(normalizedValue);
      return true;
    });
}

function normalizeHeading(
  heading: CvParsingHeadingLockup | undefined,
  fallback: CvParsingHeadingLockup
): CvParsingHeadingLockup {
  const resolvedHeading = heading ?? fallback;
  const normalizedEyebrow = resolvedHeading.eyebrow?.trim() ?? fallback.eyebrow?.trim() ?? "";

  return {
    eyebrow: normalizedEyebrow,
    title: resolvedHeading.title.trim() || fallback.title,
    support: resolvedHeading.support.trim() || fallback.support
  };
}

function getSignalTone(signal: string): CvParsingSignalTone {
  const normalizedSignal = signal.trim().toLowerCase();

  if (
    normalizedSignal.includes("developer") ||
    normalizedSignal.includes("lead") ||
    normalizedSignal.includes("engineer")
  ) {
    return "role";
  }

  if (
    normalizedSignal.includes("degree") ||
    normalizedSignal.includes("bcom") ||
    normalizedSignal.includes("bcomm")
  ) {
    return "education";
  }

  if (
    normalizedSignal.includes("cape town") ||
    normalizedSignal.includes("johannesburg") ||
    normalizedSignal.includes("durban") ||
    normalizedSignal.includes("pretoria")
  ) {
    return "location";
  }

  if (
    normalizedSignal.includes("industry") ||
    normalizedSignal.includes("agency") ||
    normalizedSignal.includes("technology")
  ) {
    return "industry";
  }

  return "skill";
}

function slugifySignalId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSignals(
  values: readonly CvParsingSignalInput[] | undefined,
  fallback: readonly CvParsingSignalDefinition[]
): NormalizedSignal[] {
  const resolved = values?.length ? values : fallback;
  const seen = new Set<string>();

  return resolved
    .map((value, index): (NormalizedSignal & { originalIndex: number }) | null => {
      const definition: Partial<CvParsingSignalDefinition> =
        typeof value === "string"
          ? {
              label: value
            }
          : value;
      const label = definition.label?.trim() ?? "";

      if (!label) {
        return null;
      }

      const dedupeKey = definition.id?.trim().toLowerCase() || label.toLowerCase();

      if (seen.has(dedupeKey)) {
        return null;
      }

      seen.add(dedupeKey);

      return {
        id: definition.id?.trim() || slugifySignalId(label) || `signal-${seen.size}`,
        label,
        tone: definition.tone ?? getSignalTone(label),
        initialTier: definition.initialTier,
        footprintRem: definition.footprintRem ?? estimateSignalFootprintRem(label, definition.tone ?? getSignalTone(label)),
        sceneWeight: definition.sceneWeight ?? index,
        track: definition.track ?? (index < DESKTOP_TRANSITION_VISIBLE_SIGNALS ? "seed" : "rotation"),
        originalIndex: index
      };
    })
    .filter((value): value is NormalizedSignal & { originalIndex: number } => value !== null)
    .sort((firstSignal, secondSignal) => {
      if (firstSignal.sceneWeight !== secondSignal.sceneWeight) {
        return firstSignal.sceneWeight - secondSignal.sceneWeight;
      }

      return firstSignal.originalIndex - secondSignal.originalIndex;
    })
    .map(({ originalIndex: _originalIndex, ...signal }) => signal);
}

function estimateSignalFootprintRem(label: string, tone: CvParsingSignalTone): number {
  const characterCount = label.trim().length;
  const wordCount = label.trim().split(/\s+/).filter(Boolean).length;
  const toneBoost =
    tone === "role"
      ? 0.52
      : tone === "industry"
        ? 0.34
        : tone === "education"
          ? 0.28
          : tone === "location"
            ? 0.2
            : 0;

  return Number(Math.min(10.8, Math.max(4.6, 3.72 + characterCount * 0.19 + wordCount * 0.28 + toneBoost)).toFixed(2));
}

function getChipSlotGeometry(slotIndex: number, compactLayout: boolean): ChipSlotGeometry {
  const geometries = compactLayout ? COMPACT_CHIP_SLOT_GEOMETRY : DESKTOP_CHIP_SLOT_GEOMETRY;
  return geometries[slotIndex] ?? geometries[geometries.length - 1] ?? { widthRem: 10, labelMaxRem: 8 };
}

function buildChipStyle({
  slotGeometry,
  revealed,
  prefersReducedMotion
}: {
  slotGeometry: ChipSlotGeometry;
  revealed: boolean;
  prefersReducedMotion: boolean;
}): ChipStyle {
  const chipStyle: ChipStyle = {
    width: `${slotGeometry.widthRem}rem`,
    minWidth: `${slotGeometry.widthRem}rem`,
    maxWidth: `${slotGeometry.widthRem}rem`,
    ["--chip-footprint-width"]: `${slotGeometry.widthRem}rem`,
    ["--chip-label-max-width"]: `${slotGeometry.labelMaxRem}rem`
  };

  if (!revealed) {
    chipStyle.opacity = 0;
    chipStyle.filter = prefersReducedMotion ? "none" : "blur(6px) saturate(0.72)";
    chipStyle.pointerEvents = "none";
    chipStyle.transform = prefersReducedMotion
      ? "var(--chip-anchor) translate3d(var(--chip-base-x), var(--chip-base-y), 0) scale(calc(var(--chip-scale) * 0.96))"
      : "var(--chip-anchor) translate3d(calc(var(--chip-base-x) + var(--chip-entry-x)), calc(var(--chip-base-y) + var(--chip-entry-y)), 0) scale(calc(var(--chip-scale) * 0.82))";
  }

  return chipStyle;
}

function buildChipLabelStyle(labelMaxRem: number): ChipStyle {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: `${labelMaxRem}rem`,
    minWidth: 0,
    whiteSpace: "nowrap"
  };
}

function buildCandidateMonogram(candidateName: string | undefined): string | null {
  if (!candidateName) {
    return null;
  }

  const initials = candidateName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? "")
    .join("");

  return initials || null;
}

function getStartingLeadIndex(signals: readonly NormalizedSignal[]): number {
  const explicitLeadIndex = signals.findIndex((signal) => signal.initialTier === "lead");
  return explicitLeadIndex >= 0 ? explicitLeadIndex : 0;
}

function buildBuildTierMap(signals: readonly NormalizedSignal[]): CvParsingSignalTierHint[] {
  const explicitLeadIndex = signals.findIndex((signal) => signal.initialTier === "lead");
  const fallbackLeadIndex = explicitLeadIndex >= 0 ? explicitLeadIndex : 0;

  return signals.map((signal, index) => {
    if (index === fallbackLeadIndex) {
      return "lead";
    }

    if (signal.initialTier) {
      return signal.initialTier === "lead" ? "support" : signal.initialTier;
    }

    return index < Math.min(3, signals.length) ? "support" : "peripheral";
  });
}

function buildStableTierMap(
  slotCount: number,
  leadIndex: number,
  slotDefinitions: readonly SignalSlotDefinition[]
): CvParsingSignalTierHint[] {
  if (slotCount === 0) {
    return [];
  }

  if (slotCount === 1) {
    return ["lead"];
  }

  const supportCount = slotCount <= 3 ? slotCount - 1 : 2;
  const supportIndices: number[] = [];
  const preferredSupportIndices = slotDefinitions[leadIndex]?.supportPriority ?? [];

  preferredSupportIndices.forEach((index) => {
    if (index >= slotCount || index === leadIndex || supportIndices.includes(index)) {
      return;
    }

    if (supportIndices.length < supportCount) {
      supportIndices.push(index);
    }
  });

  for (let index = 0; index < slotCount && supportIndices.length < supportCount; index += 1) {
    if (index !== leadIndex && !supportIndices.includes(index)) {
      supportIndices.push(index);
    }
  }

  return Array.from({ length: slotCount }, (_, index) => {
    if (index === leadIndex) {
      return "lead";
    }

    return supportIndices.includes(index) ? "support" : "peripheral";
  });
}

function findNextHiddenSignal(
  allSignals: readonly NormalizedSignal[],
  visibleSignals: readonly NormalizedSignal[],
  startIndex: number
): { nextCursor: number; signal: NormalizedSignal } | null {
  if (allSignals.length === 0) {
    return null;
  }

  const visibleSignalIds = new Set(visibleSignals.map((signal) => signal.id));

  for (let offset = 0; offset < allSignals.length; offset += 1) {
    const candidateIndex = (startIndex + offset) % allSignals.length;
    const candidateSignal = allSignals[candidateIndex];

    if (!visibleSignalIds.has(candidateSignal.id)) {
      return {
        nextCursor: (candidateIndex + 1) % allSignals.length,
        signal: candidateSignal
      };
    }
  }

  return null;
}

function findRecomposeSlotIndex(
  tierMap: readonly CvParsingSignalTierHint[],
  leadIndex: number,
  startIndex: number
): number {
  const slotCount = tierMap.length;

  if (slotCount <= 1) {
    return 0;
  }

  for (let offset = 0; offset < slotCount; offset += 1) {
    const candidateIndex = (startIndex + offset) % slotCount;

    if (tierMap[candidateIndex] === "peripheral") {
      return candidateIndex;
    }
  }

  for (let offset = 0; offset < slotCount; offset += 1) {
    const candidateIndex = (startIndex + offset) % slotCount;

    if (candidateIndex !== leadIndex && tierMap[candidateIndex] === "support") {
      return candidateIndex;
    }
  }

  return (leadIndex + 1) % slotCount;
}

function ProfilePlaceholderGlyph(): JSX.Element {
  return (
    <svg aria-hidden="true" className="cv-signal-loader__avatar-glyph" viewBox="0 0 64 64">
      <circle cx="32" cy="23" fill="none" r="10" stroke="currentColor" strokeWidth="3.2" />
      <path
        d="M16 50c2.4-9.8 9.4-14.8 16-14.8S45.6 40.2 48 50"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3.2"
      />
    </svg>
  );
}

function IdentityGlyph({
  avatarSrc,
  candidateMonogram
}: {
  avatarSrc?: string;
  candidateMonogram: string | null;
}): JSX.Element {
  if (avatarSrc) {
    return <img alt="" src={avatarSrc} />;
  }

  if (candidateMonogram) {
    return (
      <span aria-hidden="true" className="cv-signal-loader__avatar-glyph cv-signal-loader__avatar-monogram">
        {candidateMonogram}
      </span>
    );
  }

  return <ProfilePlaceholderGlyph />;
}

export function CvParsingSignalLoader({
  avatarSrc,
  candidateName,
  heading,
  extractedSignals,
  onSkip,
  skipDisabled = false,
  skipLabel = "Skip",
  statusLines,
  transitionState = "idle",
  className
}: CvParsingSignalLoaderProps): JSX.Element {
  const headingId = useId();
  const supportId = useId();
  const statusId = useId();
  const summaryId = useId();
  const prefersReducedMotion = usePrefersReducedMotion();
  const compactSignalLayout = useCompactSignalLayout();
  const scheduledTimeoutsRef = useRef<number[]>([]);
  const leadTransferTimeoutRef = useRef<number | null>(null);
  const replacementCursorRef = useRef(0);
  const replacementSlotCursorRef = useRef(0);
  const leadIndexRef = useRef(0);
  const visibleSignalsRef = useRef<NormalizedSignal[]>([]);
  const recomposeStateRef = useRef<RecomposeState | null>(null);

  const resolvedHeading = useMemo(
    () => normalizeHeading(heading, DEFAULT_CV_PARSING_HEADING_LOCKUP),
    [heading]
  );
  const resolvedSignals = useMemo(
    () => normalizeSignals(extractedSignals, DEFAULT_CV_PARSING_SIGNALS),
    [extractedSignals]
  );
  const resolvedStatusLines = useMemo(
    () => normalizeLines(statusLines, DEFAULT_CV_PARSING_STATUS_LINES),
    [statusLines]
  );
  const signalSlots = compactSignalLayout ? COMPACT_SIGNAL_SLOTS : DESKTOP_SIGNAL_SLOTS;
  const stableVisibleSignalLimit = compactSignalLayout
    ? COMPACT_STABLE_VISIBLE_SIGNALS
    : DESKTOP_STABLE_VISIBLE_SIGNALS;
  const transitionVisibleSignalLimit = compactSignalLayout
    ? COMPACT_TRANSITION_VISIBLE_SIGNALS
    : DESKTOP_TRANSITION_VISIBLE_SIGNALS;
  const maxStableVisibleSignals = Math.min(stableVisibleSignalLimit, signalSlots.length, resolvedSignals.length);
  const maxTransitionVisibleSignals = Math.min(
    transitionVisibleSignalLimit,
    signalSlots.length,
    resolvedSignals.length
  );
  const seededVisibleSignals = useMemo(
    () => resolvedSignals.slice(0, maxStableVisibleSignals),
    [maxStableVisibleSignals, resolvedSignals]
  );
  const startingLeadIndex = useMemo(
    () => getStartingLeadIndex(seededVisibleSignals),
    [seededVisibleSignals]
  );
  const candidateMonogram = useMemo(() => buildCandidateMonogram(candidateName), [candidateName]);
  const identityLabel = candidateName ? `Candidate identity for ${candidateName}` : "Candidate identity";

  const [scenePhase, setScenePhase] = useState<ScenePhase>("intro");
  const [visibleSignals, setVisibleSignals] = useState<NormalizedSignal[]>(seededVisibleSignals);
  const [revealedCount, setRevealedCount] = useState(0);
  const [leadIndex, setLeadIndex] = useState(startingLeadIndex);
  const [leadTransfer, setLeadTransfer] = useState<LeadTransferState | null>(null);
  const [recomposeState, setRecomposeState] = useState<RecomposeState | null>(null);
  const [statusIndex, setStatusIndex] = useState(0);

  const clearScheduledTimeouts = (): void => {
    scheduledTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    scheduledTimeoutsRef.current = [];
  };

  const clearLeadTransferTimeout = (): void => {
    if (leadTransferTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(leadTransferTimeoutRef.current);
    leadTransferTimeoutRef.current = null;
  };

  const scheduleSceneTimeout = (callback: () => void, delay: number): void => {
    const timeoutId = window.setTimeout(() => {
      scheduledTimeoutsRef.current = scheduledTimeoutsRef.current.filter((value) => value !== timeoutId);
      callback();
    }, delay);

    scheduledTimeoutsRef.current.push(timeoutId);
  };

  const transferLead = (nextLeadIndex: number): void => {
    const currentLeadIndex = leadIndexRef.current;

    if (nextLeadIndex === currentLeadIndex) {
      return;
    }

    clearLeadTransferTimeout();
    setLeadTransfer({
      from: currentLeadIndex,
      to: nextLeadIndex
    });
    setLeadIndex(nextLeadIndex);
    leadIndexRef.current = nextLeadIndex;

    leadTransferTimeoutRef.current = window.setTimeout(() => {
      setLeadTransfer(null);
      leadTransferTimeoutRef.current = null;
    }, prefersReducedMotion ? LEAD_TRANSFER_WINDOW_MS - 260 : LEAD_TRANSFER_WINDOW_MS);
  };

  useEffect(() => {
    visibleSignalsRef.current = visibleSignals;
  }, [visibleSignals]);

  useEffect(() => {
    leadIndexRef.current = leadIndex;
  }, [leadIndex]);

  useEffect(() => {
    setVisibleSignals(seededVisibleSignals);
    setScenePhase("intro");
    setRevealedCount(0);
    setLeadIndex(startingLeadIndex);
    setLeadTransfer(null);
    setRecomposeState(null);
    setStatusIndex(0);
    replacementCursorRef.current = maxStableVisibleSignals;
    replacementSlotCursorRef.current = 0;
    leadIndexRef.current = startingLeadIndex;
    visibleSignalsRef.current = seededVisibleSignals;
    recomposeStateRef.current = null;
    clearScheduledTimeouts();
    clearLeadTransferTimeout();
  }, [maxStableVisibleSignals, seededVisibleSignals, startingLeadIndex]);

  useEffect(() => {
    return () => {
      clearScheduledTimeouts();
      clearLeadTransferTimeout();
    };
  }, []);

  useEffect(() => {
    if (visibleSignals.length === 0 || revealedCount >= visibleSignals.length) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const nextRevealCount = Math.min(revealedCount + 1, visibleSignals.length);

      setScenePhase(
        nextRevealCount === 1
          ? "bloom"
          : nextRevealCount < visibleSignals.length
            ? "build"
            : "stable"
      );
      setRevealedCount(nextRevealCount);
    }, revealedCount === 0 ? INTRO_DELAY_MS : BUILD_INTERVAL_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [revealedCount, visibleSignals.length]);

  const renderedSignals = visibleSignals.slice(0, revealedCount);
  const previewTierMap = useMemo(() => buildBuildTierMap(visibleSignals), [visibleSignals]);
  const tierMap = useMemo(
    () =>
      scenePhase === "stable" || scenePhase === "recompose"
        ? buildStableTierMap(renderedSignals.length, leadIndex, signalSlots)
        : buildBuildTierMap(renderedSignals),
    [leadIndex, renderedSignals, scenePhase, signalSlots]
  );

  useEffect(() => {
    if (prefersReducedMotion || scenePhase !== "stable" || renderedSignals.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      if (recomposeStateRef.current) {
        return;
      }

      transferLead((leadIndexRef.current + 1) % renderedSignals.length);
    }, prefersReducedMotion ? FOCUS_INTERVAL_MS + 320 : FOCUS_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [prefersReducedMotion, renderedSignals.length, scenePhase]);

  useEffect(() => {
    if (
      prefersReducedMotion ||
      scenePhase !== "stable" ||
      resolvedSignals.length <= visibleSignals.length ||
      visibleSignals.length === 0 ||
      maxTransitionVisibleSignals <= maxStableVisibleSignals
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      if (recomposeStateRef.current) {
        return;
      }

      const currentSignals = visibleSignalsRef.current;
      const currentLeadIndex = leadIndexRef.current;
      const currentTierMap = buildStableTierMap(currentSignals.length, currentLeadIndex, signalSlots);
      const slotIndex = findRecomposeSlotIndex(
        currentTierMap,
        currentLeadIndex,
        replacementSlotCursorRef.current
      );
      const nextHiddenSignal = findNextHiddenSignal(
        resolvedSignals,
        currentSignals,
        replacementCursorRef.current
      );

      if (!nextHiddenSignal) {
        return;
      }

      const outgoingSignal = currentSignals[slotIndex];
      const nextState: RecomposeState = {
        slotIndex,
        outgoingSignalId: outgoingSignal.id,
        incomingSignalId: nextHiddenSignal.signal.id,
        stage: "exit"
      };

      replacementCursorRef.current = nextHiddenSignal.nextCursor;
      replacementSlotCursorRef.current = (slotIndex + 1) % currentSignals.length;
      recomposeStateRef.current = nextState;
      setScenePhase("recompose");
      setRecomposeState(nextState);

      scheduleSceneTimeout(() => {
        setVisibleSignals((currentVisibleSignals) => {
          if (slotIndex >= currentVisibleSignals.length) {
            return currentVisibleSignals;
          }

          const nextVisibleSignals = [...currentVisibleSignals];
          nextVisibleSignals[slotIndex] = nextHiddenSignal.signal;
          visibleSignalsRef.current = nextVisibleSignals;
          return nextVisibleSignals;
        });

        const enteringState: RecomposeState = {
          slotIndex,
          outgoingSignalId: outgoingSignal.id,
          incomingSignalId: nextHiddenSignal.signal.id,
          stage: "enter"
        };

        recomposeStateRef.current = enteringState;
        setRecomposeState(enteringState);
        transferLead((currentLeadIndex + 1) % currentSignals.length);
      }, prefersReducedMotion ? RECOMPOSE_EXIT_MS - 160 : RECOMPOSE_EXIT_MS);

      scheduleSceneTimeout(() => {
        recomposeStateRef.current = null;
        setRecomposeState(null);
        setScenePhase("stable");
      }, prefersReducedMotion ? RECOMPOSE_ENTER_MS : RECOMPOSE_EXIT_MS + RECOMPOSE_ENTER_MS);
    }, prefersReducedMotion ? RECOMPOSE_INTERVAL_MS + 1000 : RECOMPOSE_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    maxStableVisibleSignals,
    maxTransitionVisibleSignals,
    prefersReducedMotion,
    resolvedSignals,
    scenePhase,
    signalSlots,
    visibleSignals.length
  ]);

  useEffect(() => {
    if (prefersReducedMotion || resolvedStatusLines.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setStatusIndex((currentIndex) => (currentIndex + 1) % resolvedStatusLines.length);
    }, prefersReducedMotion ? STATUS_INTERVAL_MS + 900 : STATUS_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [prefersReducedMotion, resolvedStatusLines.length]);

  const currentStatusLine =
    resolvedStatusLines[statusIndex % Math.max(1, resolvedStatusLines.length)] ??
    DEFAULT_CV_PARSING_STATUS_LINES[0];
  const accessibleSignalSummary = useMemo(() => {
    const summarySignals = renderedSignals.length > 0 ? renderedSignals : seededVisibleSignals;
    const summaryLeadIndex = Math.min(leadIndex, Math.max(0, summarySignals.length - 1));
    const summaryTierMap = renderedSignals.length > 0 ? tierMap : undefined;

    return formatSignalSummary(summarySignals, summaryLeadIndex, signalSlots, summaryTierMap);
  }, [leadIndex, renderedSignals, seededVisibleSignals, signalSlots, tierMap]);

  return (
    <section
      aria-describedby={`${supportId} ${summaryId}`}
      aria-labelledby={headingId}
      className={["cv-signal-loader", className].filter(Boolean).join(" ")}
      data-layout={compactSignalLayout ? "compact" : "desktop"}
      data-lead-transfer={leadTransfer ? "active" : "idle"}
      data-motion-mode={prefersReducedMotion ? "reduced" : "full"}
      data-phase={scenePhase}
      data-ready-state={revealedCount >= visibleSignals.length && visibleSignals.length > 0 ? "settled" : "building"}
      data-recompose-state={recomposeState?.stage ?? "idle"}
      data-transition-state={transitionState}
      data-visible-count={renderedSignals.length}
      data-visible-limit={maxStableVisibleSignals}
    >
      <div className="cv-signal-loader__chrome">
        <button
          className="button button--ghost cv-signal-loader__skip"
          disabled={skipDisabled}
          onClick={onSkip}
          type="button"
        >
          {skipLabel}
        </button>
      </div>

      <header className="cv-signal-loader__header" data-phase={scenePhase}>
        {resolvedHeading.eyebrow ? <p className="cv-signal-loader__eyebrow">{resolvedHeading.eyebrow}</p> : null}
        <div className="cv-signal-loader__lockup">
          <h1 className="cv-signal-loader__title" id={headingId}>
            {resolvedHeading.title}
          </h1>
          <p className="cv-signal-loader__support" id={supportId}>
            {resolvedHeading.support}
          </p>
        </div>
      </header>

      <div className="cv-signal-loader__stage" data-phase={scenePhase}>
        <div className="cv-signal-loader__ambient" aria-hidden="true">
          <span className="cv-signal-loader__ambient-glow cv-signal-loader__ambient-glow--one" />
          <span className="cv-signal-loader__ambient-glow cv-signal-loader__ambient-glow--two" />
        </div>

        <div className="cv-signal-loader__cluster" data-phase={scenePhase}>
        <div
          aria-label={identityLabel}
          className="cv-signal-loader__avatar-shell"
          data-avatar-breath={prefersReducedMotion ? "still" : scenePhase === "recompose" ? "responsive" : "steady"}
          data-avatar-pulse={prefersReducedMotion ? "reduced" : "active"}
          data-phase={scenePhase}
          role="img"
        >
          <span aria-hidden="true" className="cv-signal-loader__avatar-pulse cv-signal-loader__avatar-pulse--one" />
          <span aria-hidden="true" className="cv-signal-loader__avatar-pulse cv-signal-loader__avatar-pulse--two" />
          <span aria-hidden="true" className="cv-signal-loader__avatar-pulse cv-signal-loader__avatar-pulse--three" />
          <div className="cv-signal-loader__avatar-ring" aria-hidden="true" />
          <div className="cv-signal-loader__avatar" data-avatar-breath={prefersReducedMotion ? "still" : "active"}>
            <IdentityGlyph avatarSrc={avatarSrc} candidateMonogram={candidateMonogram} />
          </div>
        </div>

        <ul aria-hidden="true" className="cv-signal-loader__signal-field">
            {visibleSignals.map((signal, index) => {
              const slot = signalSlots[index];
              const isRevealed = index < revealedCount;
              const tier = (isRevealed ? tierMap[index] : previewTierMap[index]) ?? "peripheral";
              const isLead = tier === "lead";
              const enterState: EnterState =
                !isRevealed
                  ? "idle"
                  : recomposeState?.slotIndex === index && recomposeState.stage === "enter"
                    ? "entering"
                    : index === renderedSignals.length - 1 && scenePhase === "bloom"
                      ? "blooming"
                      : index === renderedSignals.length - 1 && scenePhase === "build"
                        ? "entering"
                        : revealedCount === visibleSignals.length
                          ? "settled"
                          : "idle";
              const exitState: ExitState =
                recomposeState?.slotIndex === index && recomposeState.stage === "exit" ? "exiting" : "idle";
              const focusState: FocusState =
                leadTransfer?.to === index
                  ? "promoting"
                  : leadTransfer?.from === index
                    ? "demoting"
                    : isLead && isRevealed
                      ? "focused"
                      : "resting";
              const tierState: TierState =
                leadTransfer?.to === index
                  ? "promoting"
                  : leadTransfer?.from === index
                    ? "demoting"
                    : "steady";
              const chipSlotGeometry = getChipSlotGeometry(index, compactSignalLayout);
              const chipStyle = buildChipStyle({
                slotGeometry: chipSlotGeometry,
                revealed: isRevealed,
                prefersReducedMotion
              });
              const chipLabelStyle = buildChipLabelStyle(chipSlotGeometry.labelMaxRem);

              return (
                <li
                  className={[
                    "cv-signal-loader__chip",
                    slot.className,
                    `cv-signal-loader__chip--${signal.tone}`,
                    isLead ? "is-active" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  data-enter-state={enterState}
                  data-exit-state={exitState}
                  data-focus-state={focusState}
                  data-phase={scenePhase}
                  data-revealed={isRevealed ? "true" : "false"}
                  data-signal-id={signal.id}
                  data-slot={slot.id}
                  data-slot-index={index}
                  data-tier={tier}
                  data-tier-state={tierState}
                  data-track={signal.track}
                  key={slot.id}
                  style={chipStyle}
                >
                  <span aria-hidden="true" className="cv-signal-loader__chip-shell" />
                  <span className="cv-signal-loader__chip-content" data-label-signal={signal.id} key={signal.id}>
                    <span className="cv-signal-loader__chip-label" style={chipLabelStyle}>
                      {signal.label}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="sr-only" id={summaryId}>
        {accessibleSignalSummary}
      </p>

      <div
        aria-hidden="true"
        className="cv-signal-loader__status"
        data-phase={scenePhase}
        id={statusId}
      >
        <p className="cv-signal-loader__status-line" key={currentStatusLine}>
          {currentStatusLine}
        </p>
      </div>
    </section>
  );
}

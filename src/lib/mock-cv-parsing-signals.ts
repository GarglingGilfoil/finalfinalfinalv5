export type CvParsingSignalTone = "role" | "education" | "location" | "industry" | "skill";
export type CvParsingSignalTierHint = "lead" | "support" | "peripheral";
export type CvParsingSignalTrack = "seed" | "rotation";

export interface CvParsingSignalDefinition {
  id: string;
  label: string;
  tone: CvParsingSignalTone;
  initialTier?: CvParsingSignalTierHint;
  footprintRem?: number;
  sceneWeight?: number;
  track?: CvParsingSignalTrack;
}

export interface CvParsingHeadingLockup {
  eyebrow?: string;
  title: string;
  support: string;
}

export interface CvParsingSignalLoaderModel {
  candidateName?: string;
  heading: CvParsingHeadingLockup;
  extractedSignals: readonly CvParsingSignalDefinition[];
  statusLines: readonly string[];
}

export const DEFAULT_CV_PARSING_HEADING_LOCKUP: CvParsingHeadingLockup = {
  title: "Building your profile",
  support: "Reading the clearest signals from your CV"
};

export const DEFAULT_CV_PARSING_SIGNALS: readonly CvParsingSignalDefinition[] = [
  {
    id: "front-end-developer",
    label: "Front End Developer",
    tone: "role",
    initialTier: "lead",
    footprintRem: 8.9,
    sceneWeight: 0,
    track: "seed"
  },
  {
    id: "cape-town",
    label: "Cape Town",
    tone: "location",
    initialTier: "support",
    footprintRem: 6.2,
    sceneWeight: 1,
    track: "seed"
  },
  {
    id: "react",
    label: "React",
    tone: "skill",
    initialTier: "support",
    footprintRem: 4.7,
    sceneWeight: 2,
    track: "seed"
  },
  {
    id: "bcomm-degree",
    label: "BComm Degree",
    tone: "education",
    initialTier: "peripheral",
    footprintRem: 7.2,
    sceneWeight: 3,
    track: "seed"
  },
  {
    id: "technology",
    label: "Technology",
    tone: "industry",
    initialTier: "peripheral",
    footprintRem: 6.7,
    sceneWeight: 4,
    track: "seed"
  },
  {
    id: "advertising-industry",
    label: "Advertising Industry",
    tone: "industry",
    footprintRem: 10.2,
    sceneWeight: 5,
    track: "rotation"
  },
  {
    id: "digital-agency",
    label: "Digital Agency",
    tone: "industry",
    footprintRem: 7.3,
    sceneWeight: 6,
    track: "rotation"
  },
  {
    id: "javascript",
    label: "JavaScript",
    tone: "skill",
    footprintRem: 6.3,
    sceneWeight: 7,
    track: "rotation"
  },
  {
    id: "team-lead",
    label: "Team Lead",
    tone: "role",
    footprintRem: 6,
    sceneWeight: 8,
    track: "rotation"
  }
] as const;

export const DEFAULT_CV_PARSING_STATUS_LINES = [
  "Building your profile...",
  "Reading key signals from your CV...",
  "Mapping your experience..."
] as const;

interface BuildMockCvParsingSignalLoaderModelOptions {
  candidateName?: string | null;
}

function normalizeCandidateName(candidateName: string | null | undefined): string | undefined {
  const normalizedName = candidateName?.trim();
  return normalizedName ? normalizedName : undefined;
}

export function buildMockCvParsingSignalLoaderModel(
  options: BuildMockCvParsingSignalLoaderModelOptions = {}
): CvParsingSignalLoaderModel {
  return {
    candidateName: normalizeCandidateName(options.candidateName),
    heading: DEFAULT_CV_PARSING_HEADING_LOCKUP,
    extractedSignals: DEFAULT_CV_PARSING_SIGNALS,
    statusLines: DEFAULT_CV_PARSING_STATUS_LINES
  };
}

export type CvParsingSignalTone = "role" | "education" | "location" | "industry" | "skill";

export interface CvParsingSignalDefinition {
  id: string;
  label: string;
  tone: CvParsingSignalTone;
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

// Prototype-only parsed hints. These are intentionally not rendered on the parsing
// animation, but later screens can still use them for soft defaults like location.
export const DEFAULT_CV_PARSING_SIGNALS: readonly CvParsingSignalDefinition[] = [
  {
    id: "front-end-developer",
    label: "Front End Developer",
    tone: "role"
  },
  {
    id: "cape-town",
    label: "Cape Town",
    tone: "location"
  },
  {
    id: "react",
    label: "React",
    tone: "skill"
  },
  {
    id: "bcomm-degree",
    label: "BComm Degree",
    tone: "education"
  },
  {
    id: "technology",
    label: "Technology",
    tone: "industry"
  },
  {
    id: "advertising-industry",
    label: "Advertising Industry",
    tone: "industry"
  },
  {
    id: "digital-agency",
    label: "Digital Agency",
    tone: "industry"
  },
  {
    id: "javascript",
    label: "JavaScript",
    tone: "skill"
  },
  {
    id: "team-lead",
    label: "Team Lead",
    tone: "role"
  }
] as const;

export const DEFAULT_CV_PARSING_STATUS_LINES = [
  "Analyzing your resume",
  "Checking your work history",
  "Identifying career highlights",
  "Reviewing education history",
  "Organizing your profile"
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

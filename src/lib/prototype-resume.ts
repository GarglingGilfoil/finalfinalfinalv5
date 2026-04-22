import type {
  CandidateResumeState,
  CandidateSession,
  PrototypeResumeRecord,
  ResumeFileExtension
} from "../contracts/application";

const RESUME_STORAGE_PREFIX = "ditto-jobs.prototype-resume-state";

function getStorageKey(email: string): string {
  return `${RESUME_STORAGE_PREFIX}:${encodeURIComponent(email.trim().toLowerCase())}`;
}

function slugifyName(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Candidate";
}

function buildSeededResume(fileName: string, daysAgo: number, fileSize: number): PrototypeResumeRecord {
  const fileExtension = fileName.split(".").pop()?.toLowerCase();
  const safeExtension: ResumeFileExtension =
    fileExtension === "doc" || fileExtension === "docx" ? fileExtension : "pdf";

  return {
    id: `resume-${fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${daysAgo}`,
    fileName,
    fileSize,
    fileExtension: safeExtension,
    uploadedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    source: "seeded"
  };
}

function buildSeededResumeState(session: CandidateSession): CandidateResumeState {
  const fullName = slugifyName(`${session.firstName}_${session.lastName}`);
  const resumes = [
    buildSeededResume(`${fullName}_Resume_2026.pdf`, 12, 412_000),
    buildSeededResume(`${fullName}_Profile_2025.docx`, 86, 368_000)
  ];

  return {
    resumes,
    selectedResumeId: resumes[0]?.id ?? null
  };
}

export function createEmptyResumeState(): CandidateResumeState {
  return {
    resumes: [],
    selectedResumeId: null
  };
}

export function readPrototypeResumeState(email: string): CandidateResumeState | null {
  const raw = window.localStorage.getItem(getStorageKey(email));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CandidateResumeState;

    if (!Array.isArray(parsed.resumes)) {
      throw new Error("Invalid resume state");
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(getStorageKey(email));
    return null;
  }
}

export function savePrototypeResumeState(email: string, state: CandidateResumeState): void {
  window.localStorage.setItem(getStorageKey(email), JSON.stringify(state));
}

export function readOrCreatePrototypeResumeState(
  session: CandidateSession
): CandidateResumeState {
  const existing = readPrototypeResumeState(session.email);

  if (existing) {
    return existing;
  }

  const seededState =
    session.entryMode === "signin"
      ? buildSeededResumeState(session)
      : createEmptyResumeState();

  savePrototypeResumeState(session.email, seededState);
  return seededState;
}

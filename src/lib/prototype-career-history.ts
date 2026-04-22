import type {
  CandidateCareerHistoryState,
  CandidateSession,
  PrototypeCareerEntry
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";

const CAREER_HISTORY_STORAGE_PREFIX = "ditto-jobs.prototype-career-history";

function getStorageKey(email: string, jobId: string): string {
  return `${CAREER_HISTORY_STORAGE_PREFIX}:${encodeURIComponent(email.trim().toLowerCase())}:${jobId}`;
}

function buildSeededEntries(job: JobViewData): PrototypeCareerEntry[] {
  return [
    {
      id: "career-entry-ditto",
      roleTitle: "Senior Frontend Engineer",
      companyName: "Ditto",
      startDateLabel: "Jan 2022",
      endDateLabel: "Present",
      location: "Cape Town"
    },
    {
      id: "career-entry-takealot",
      roleTitle: "Frontend Engineer",
      companyName: "Takealot",
      startDateLabel: "May 2019",
      endDateLabel: "Dec 2021",
      location: "Cape Town"
    },
    {
      id: "career-entry-onedayonly",
      roleTitle: "UI Developer",
      companyName: "OneDayOnly",
      startDateLabel: "Feb 2016",
      endDateLabel: "Apr 2019",
      location: "Cape Town"
    }
  ].map((entry, index) => {
    if (index === 0) {
      return {
        ...entry,
        roleTitle: job.title === "Senior React Engineer" ? "Senior React Engineer" : entry.roleTitle
      };
    }

    return entry;
  });
}

export function buildPrototypeCareerHistoryState(
  job: JobViewData,
  sourceResumeId: string | null
): CandidateCareerHistoryState {
  return {
    entries: buildSeededEntries(job),
    parsedAt: new Date().toISOString(),
    sourceResumeId
  };
}

export function readPrototypeCareerHistoryState(
  session: CandidateSession,
  jobId: string
): CandidateCareerHistoryState | null {
  const raw = window.localStorage.getItem(getStorageKey(session.email, jobId));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CandidateCareerHistoryState;

    if (!Array.isArray(parsed.entries)) {
      throw new Error("Invalid career history state.");
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(getStorageKey(session.email, jobId));
    return null;
  }
}

export function savePrototypeCareerHistoryState(
  session: CandidateSession,
  jobId: string,
  state: CandidateCareerHistoryState
): void {
  window.localStorage.setItem(getStorageKey(session.email, jobId), JSON.stringify(state));
}

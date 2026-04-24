import type {
  CandidateLocationValue,
  CandidatePersonalDetailsState,
  CandidateSession,
  PersonalDetailsCompletionSource,
  PrototypeCountryDetectionSource
} from "../contracts/application";

const PERSONAL_DETAILS_STORAGE_PREFIX = "ditto-jobs.prototype-personal-details";

interface BuildPrototypePersonalDetailsOptions {
  completionStartedFrom?: PersonalDetailsCompletionSource;
  detectedCountryCode?: string | null;
  detectedCountrySource?: PrototypeCountryDetectionSource;
  location?: CandidateLocationValue | null;
  sourceResumeId: string | null;
  jobId?: string;
}

function getStorageKey(email: string, jobId: string): string {
  return `${PERSONAL_DETAILS_STORAGE_PREFIX}:${encodeURIComponent(email.trim().toLowerCase())}:${jobId}`;
}

export function buildPrototypePersonalDetailsState(
  options: BuildPrototypePersonalDetailsOptions
): CandidatePersonalDetailsState {
  const timestamp = new Date().toISOString();

  return {
    version: 1,
    jobId: options.jobId,
    sourceResumeId: options.sourceResumeId,
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSavedAt: null,
    completionStartedFrom: options.completionStartedFrom ?? "direct-entry",
    location: options.location ?? null,
    phoneNumber: "",
    aboutMe: "",
    profilePicture: null,
    detectedCountryCode: options.detectedCountryCode ?? options.location?.countryCode ?? null,
    detectedCountrySource: options.detectedCountrySource ?? "fallback"
  };
}

export function readPrototypePersonalDetailsState(
  session: CandidateSession,
  jobId: string
): CandidatePersonalDetailsState | null {
  const raw = window.localStorage.getItem(getStorageKey(session.email, jobId));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CandidatePersonalDetailsState;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("status" in parsed) ||
      !("sourceResumeId" in parsed) ||
      !("updatedAt" in parsed)
    ) {
      throw new Error("Invalid personal details state.");
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(getStorageKey(session.email, jobId));
    return null;
  }
}

export function savePrototypePersonalDetailsState(
  session: CandidateSession,
  jobId: string,
  state: CandidatePersonalDetailsState
): void {
  const storageKey = getStorageKey(session.email, jobId);

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    if (state.profilePicture?.dataUrl) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ ...state, profilePicture: null }));
      } catch {
        // Prototype storage should never block the application flow.
      }
    }
  }
}

import type {
  ApplicationQualifier,
  CandidateRoleQuestionsState,
  CandidateSession
} from "../contracts/application";

const ROLE_QUESTIONS_STORAGE_PREFIX = "ditto-jobs.prototype-role-questions";

interface BuildPrototypeRoleQuestionsOptions {
  jobId?: string;
  sourceResumeId: string | null;
  answers?: Record<string, string>;
}

export const mockRoleQuestions: ApplicationQualifier[] = [
  {
    id: "drivers-licence",
    label: "Do you have a valid driver’s licence?",
    inputType: "yes_no",
    required: true,
    options: ["Yes", "No"]
  },
  {
    id: "relevant-experience-years",
    label: "How many years of relevant experience do you have for this role?",
    inputType: "number",
    required: true,
    min: 0,
    step: 0.5,
    placeholder: "e.g. 2"
  }
];

function getStorageKey(email: string, jobId: string): string {
  return `${ROLE_QUESTIONS_STORAGE_PREFIX}:${encodeURIComponent(email.trim().toLowerCase())}:${jobId}`;
}

function normalizeAnswers(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (answers, [key, answer]) => {
      if (typeof answer === "string") {
        answers[key] = answer;
      } else if (typeof answer === "number" && Number.isFinite(answer)) {
        answers[key] = String(answer);
      }

      return answers;
    },
    {}
  );
}

export function buildPrototypeRoleQuestionsState(
  options: BuildPrototypeRoleQuestionsOptions
): CandidateRoleQuestionsState {
  const timestamp = new Date().toISOString();

  return {
    version: 1,
    jobId: options.jobId,
    sourceResumeId: options.sourceResumeId,
    status: "draft",
    answers: normalizeAnswers(options.answers),
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSavedAt: null
  };
}

export function readPrototypeRoleQuestionsState(
  session: CandidateSession,
  jobId: string
): CandidateRoleQuestionsState | null {
  const raw = window.localStorage.getItem(getStorageKey(session.email, jobId));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CandidateRoleQuestionsState;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      parsed.version !== 1 ||
      !("status" in parsed) ||
      !("sourceResumeId" in parsed) ||
      !("answers" in parsed) ||
      !("updatedAt" in parsed)
    ) {
      throw new Error("Invalid role questions state.");
    }

    return {
      ...parsed,
      answers: normalizeAnswers(parsed.answers),
      status: parsed.status === "complete" ? "complete" : "draft",
      lastSavedAt: parsed.lastSavedAt ?? null
    };
  } catch {
    window.localStorage.removeItem(getStorageKey(session.email, jobId));
    return null;
  }
}

export function savePrototypeRoleQuestionsState(
  session: CandidateSession,
  jobId: string,
  state: CandidateRoleQuestionsState
): void {
  window.localStorage.setItem(getStorageKey(session.email, jobId), JSON.stringify(state));
}

export function isPrototypeRoleQuestionsComplete(
  state: CandidateRoleQuestionsState | null,
  sourceResumeId: string
): boolean {
  return Boolean(state?.status === "complete" && state.sourceResumeId === sourceResumeId);
}

import type {
  AuthProvider,
  CandidateEntryMode,
  CandidateSession
} from "../contracts/application";

const SESSION_STORAGE_KEY = "ditto-jobs.prototype-candidate-session";

interface SessionInput {
  email: string;
  firstName?: string;
  lastName?: string;
  provider: AuthProvider;
  entryMode: CandidateEntryMode;
}

function toTitleCase(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function buildPrototypeSession(input: SessionInput): CandidateSession {
  const emailName = input.email.split("@")[0] ?? "candidate";
  const derivedNameParts = emailName
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const firstName =
    input.firstName?.trim() || toTitleCase(derivedNameParts[0] ?? "Candidate");
  const lastName =
    input.lastName?.trim() || toTitleCase(derivedNameParts[1] ?? "User");

  return {
    authenticated: true,
    firstName,
    lastName,
    email: input.email.trim(),
    provider: input.provider,
    entryMode: input.entryMode,
    createdAt: new Date().toISOString()
  };
}

export function savePrototypeSession(session: CandidateSession): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function readPrototypeSession(): CandidateSession | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CandidateSession>;

    if (
      parsed.authenticated !== true ||
      !parsed.email ||
      !parsed.firstName ||
      !parsed.lastName ||
      !parsed.provider ||
      !parsed.createdAt
    ) {
      throw new Error("Invalid prototype session");
    }

    return {
      authenticated: true,
      email: parsed.email,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      provider: parsed.provider,
      entryMode: parsed.entryMode === "signup" ? "signup" : "signin",
      createdAt: parsed.createdAt
    };
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

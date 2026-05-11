import type { CandidateResumeState, CandidateSession, PrototypeResumeRecord } from "../contracts/application";

const APPLICATION_STORAGE_PREFIX = "ditto-jobs.prototype-applications";

export interface PrototypeApplicationRecord {
  version: 1;
  jobId: string;
  selectedResumeId: string;
  appliedAt: string;
  updatedAt: string;
  enrichmentCompletedAt: string | null;
}

type PrototypeApplicationIndex = Record<string, PrototypeApplicationRecord>;

function getStorageKey(email: string): string {
  return `${APPLICATION_STORAGE_PREFIX}:${encodeURIComponent(email.trim().toLowerCase())}`;
}

function normalizeRecord(jobId: string, value: unknown): PrototypeApplicationRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as Partial<PrototypeApplicationRecord>;

  if (!parsed.jobId || !parsed.selectedResumeId || !parsed.appliedAt || !parsed.updatedAt) {
    return null;
  }

  return {
    version: 1,
    jobId: parsed.jobId || jobId,
    selectedResumeId: parsed.selectedResumeId,
    appliedAt: parsed.appliedAt,
    updatedAt: parsed.updatedAt,
    enrichmentCompletedAt: parsed.enrichmentCompletedAt ?? null
  };
}

function readApplicationIndex(email: string): PrototypeApplicationIndex {
  const raw = window.localStorage.getItem(getStorageKey(email));

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed).reduce<PrototypeApplicationIndex>((records, [jobId, value]) => {
      const record = normalizeRecord(jobId, value);

      if (record) {
        records[jobId] = record;
      }

      return records;
    }, {});
  } catch {
    window.localStorage.removeItem(getStorageKey(email));
    return {};
  }
}

function saveApplicationIndex(email: string, index: PrototypeApplicationIndex): void {
  window.localStorage.setItem(getStorageKey(email), JSON.stringify(index));
}

export function readPrototypeApplicationRecord(
  session: CandidateSession | null,
  jobId: string
): PrototypeApplicationRecord | null {
  if (!session) {
    return null;
  }

  return readApplicationIndex(session.email)[jobId] ?? null;
}

export function hasPrototypeAppliedToJob(
  session: CandidateSession | null,
  jobId: string
): boolean {
  return Boolean(readPrototypeApplicationRecord(session, jobId));
}

export function markPrototypeApplicationSubmitted(
  session: CandidateSession,
  jobId: string,
  selectedResumeId: string
): PrototypeApplicationRecord {
  const index = readApplicationIndex(session.email);
  const existing = index[jobId];
  const timestamp = new Date().toISOString();
  const nextRecord: PrototypeApplicationRecord = existing
    ? {
        ...existing,
        selectedResumeId,
        updatedAt: timestamp
      }
    : {
        version: 1,
        jobId,
        selectedResumeId,
        appliedAt: timestamp,
        updatedAt: timestamp,
        enrichmentCompletedAt: null
      };

  index[jobId] = nextRecord;
  saveApplicationIndex(session.email, index);
  return nextRecord;
}

export function markPrototypeApplicationEnrichmentComplete(
  session: CandidateSession,
  jobId: string
): PrototypeApplicationRecord | null {
  const index = readApplicationIndex(session.email);
  const existing = index[jobId];

  if (!existing) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const nextRecord: PrototypeApplicationRecord = {
    ...existing,
    enrichmentCompletedAt: existing.enrichmentCompletedAt ?? timestamp,
    updatedAt: timestamp
  };

  index[jobId] = nextRecord;
  saveApplicationIndex(session.email, index);
  return nextRecord;
}

export function getSelectedResumeForApplication(
  resumeState: CandidateResumeState | null,
  application: PrototypeApplicationRecord | null
): PrototypeResumeRecord | null {
  if (!resumeState) {
    return null;
  }

  const preferredResumeId = application?.selectedResumeId ?? resumeState.selectedResumeId;
  return (
    resumeState.resumes.find((resume) => resume.id === preferredResumeId) ??
    resumeState.resumes.find((resume) => resume.id === resumeState.selectedResumeId) ??
    resumeState.resumes[0] ??
    null
  );
}

import { readJobView } from "../api/jobs";
import type {
  CandidateCareerHistoryState,
  CandidatePersonalDetailsState,
  CandidateResumeState,
  CandidateRoleQuestionsState,
  CandidateSession,
  PrototypeCareerEntry,
  PrototypeEducationEntry,
  PrototypeResumeRecord
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { readPrototypeCareerHistoryState } from "./prototype-career-history";
import { readPrototypeSession } from "./prototype-auth";
import {
  getSelectedResumeForApplication,
  readPrototypeApplicationRecord,
  type PrototypeApplicationRecord
} from "./prototype-application";
import { readPrototypePersonalDetailsState } from "./prototype-personal-details";
import { readPrototypeResumeState } from "./prototype-resume";
import {
  isPrototypeRoleQuestionsComplete,
  readPrototypeRoleQuestionsState
} from "./prototype-role-questions";
import {
  buildApplicationAuthPath,
  buildApplicationCareerHistoryPath,
  buildApplicationConfirmPath,
  buildApplicationPersonalDetailsPath,
  buildApplicationParsingPath,
  buildApplicationRoleQuestionsPath,
  buildApplicationUploadPath
} from "./router";

export type ApplicationStep =
  | "upload"
  | "parsing"
  | "personal-details"
  | "role-questions"
  | "career-history"
  | "confirm";

export type ApplicationAccessStatus =
  | "ready"
  | "missing-job"
  | "needs-auth"
  | "needs-resume"
  | "needs-personal-details"
  | "needs-role-questions"
  | "needs-career-history"
  | "application-complete";

export interface ApplicationAccessState {
  applicationRecord: PrototypeApplicationRecord | null;
  careerHistoryState: CandidateCareerHistoryState | null;
  job: JobViewData | null;
  nextPath: string | null;
  personalDetailsState: CandidatePersonalDetailsState | null;
  resumeState: CandidateResumeState | null;
  roleQuestionsState: CandidateRoleQuestionsState | null;
  selectedResume: PrototypeResumeRecord | null;
  session: CandidateSession | null;
  status: ApplicationAccessStatus;
}

function getStepPath(jobId: string, step: ApplicationStep): string {
  if (step === "upload") {
    return buildApplicationUploadPath(jobId);
  }

  if (step === "parsing") {
    return buildApplicationParsingPath(jobId);
  }

  if (step === "personal-details") {
    return buildApplicationPersonalDetailsPath(jobId);
  }

  if (step === "role-questions") {
    return buildApplicationRoleQuestionsPath(jobId);
  }

  if (step === "career-history") {
    return buildApplicationCareerHistoryPath(jobId);
  }

  return buildApplicationConfirmPath(jobId);
}

export function getApplicationStepPath(jobId: string, step: ApplicationStep): string {
  return getStepPath(jobId, step);
}

export function getSelectedPrototypeResume(
  resumeState: CandidateResumeState | null
): PrototypeResumeRecord | null {
  return (
    resumeState?.resumes.find((resume) => resume.id === resumeState.selectedResumeId) ??
    resumeState?.resumes[0] ??
    null
  );
}

function hasCompleteCareerEntry(entry: PrototypeCareerEntry): boolean {
  if (!entry.jobTitle.trim() || !entry.company.trim() || !entry.startMonth || !entry.startYear) {
    return false;
  }

  if (entry.isCurrent) {
    return true;
  }

  if (!entry.endMonth || !entry.endYear) {
    return false;
  }

  return Number(`${entry.startYear}${entry.startMonth}`) <= Number(`${entry.endYear}${entry.endMonth}`);
}

function hasCompleteEducationEntry(entry: PrototypeEducationEntry): boolean {
  return Boolean(
    entry.institution.trim() &&
      entry.qualification &&
      entry.startYear &&
      entry.endYear &&
      Number(entry.startYear) <= Number(entry.endYear)
  );
}

export function isPrototypeCareerHistoryReady(
  state: CandidateCareerHistoryState | null,
  sourceResumeId: string
): boolean {
  if (!state || state.sourceResumeId !== sourceResumeId) {
    return false;
  }

  return (
    state.careerEntries.every(hasCompleteCareerEntry) &&
    state.educationEntries.every(hasCompleteEducationEntry)
  );
}

export function getNextApplicationPath(jobId: string): string {
  const access = resolveApplicationAccess(jobId, "confirm");

  if (!access.job) {
    return buildApplicationAuthPath(jobId, "signin");
  }

  return access.nextPath ?? buildApplicationConfirmPath(jobId);
}

export function resolveApplicationAccess(
  jobId: string,
  targetStep: ApplicationStep
): ApplicationAccessState {
  const job = readJobView(jobId);

  if (!job) {
    return {
      careerHistoryState: null,
      applicationRecord: null,
      job: null,
      nextPath: null,
      personalDetailsState: null,
      resumeState: null,
      roleQuestionsState: null,
      selectedResume: null,
      session: null,
      status: "missing-job"
    };
  }

  const session = readPrototypeSession();
  const resumeState = session ? readPrototypeResumeState(session.email) : null;
  const applicationRecord = readPrototypeApplicationRecord(session, job.id);
  const selectedResume = getSelectedResumeForApplication(resumeState, applicationRecord);
  const personalDetailsState = session ? readPrototypePersonalDetailsState(session, job.id) : null;
  const roleQuestionsState = session ? readPrototypeRoleQuestionsState(session, job.id) : null;
  const careerHistoryState = session ? readPrototypeCareerHistoryState(session, job.id) : null;

  const baseState = {
    careerHistoryState,
    applicationRecord,
    job,
    personalDetailsState,
    resumeState,
    roleQuestionsState,
    selectedResume,
    session
  };

  if (!session) {
    return {
      ...baseState,
      nextPath: buildApplicationAuthPath(job.id, "signin"),
      status: "needs-auth"
    };
  }

  if (applicationRecord?.enrichmentCompletedAt) {
    return {
      ...baseState,
      nextPath: buildApplicationConfirmPath(job.id),
      status: targetStep === "confirm" ? "ready" : "application-complete"
    };
  }

  if (!applicationRecord) {
    return {
      ...baseState,
      nextPath: buildApplicationUploadPath(job.id),
      status: targetStep === "upload" ? "ready" : "needs-resume"
    };
  }

  if (!selectedResume) {
    return {
      ...baseState,
      nextPath: buildApplicationUploadPath(job.id),
      status: "needs-resume"
    };
  }

  if (targetStep === "upload") {
    return {
      ...baseState,
      nextPath: buildApplicationParsingPath(job.id),
      status: "needs-resume"
    };
  }

  if (targetStep === "parsing" || targetStep === "personal-details") {
    return {
      ...baseState,
      nextPath: getStepPath(job.id, targetStep),
      status: "ready"
    };
  }

  if (personalDetailsState?.status !== "complete") {
    return {
      ...baseState,
      nextPath: buildApplicationPersonalDetailsPath(job.id),
      status: "needs-personal-details"
    };
  }

  if (targetStep === "role-questions") {
    return {
      ...baseState,
      nextPath: buildApplicationRoleQuestionsPath(job.id),
      status: "ready"
    };
  }

  if (!isPrototypeRoleQuestionsComplete(roleQuestionsState, selectedResume.id)) {
    return {
      ...baseState,
      nextPath: buildApplicationRoleQuestionsPath(job.id),
      status: "needs-role-questions"
    };
  }

  if (targetStep === "career-history") {
    return {
      ...baseState,
      nextPath: buildApplicationCareerHistoryPath(job.id),
      status: "ready"
    };
  }

  if (!isPrototypeCareerHistoryReady(careerHistoryState, selectedResume.id)) {
    return {
      ...baseState,
      nextPath: buildApplicationCareerHistoryPath(job.id),
      status: "needs-career-history"
    };
  }

  return {
    ...baseState,
    nextPath: buildApplicationConfirmPath(job.id),
    status: "ready"
  };
}

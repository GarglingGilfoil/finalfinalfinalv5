import type {
  CandidateCareerHistoryState,
  CandidatePersonalDetailsState,
  CandidateResumeState,
  CandidateSession,
  PrototypeCareerEntry,
  PrototypeEducationEntry
} from "../contracts/application";
import type {
  CandidateFileCategory,
  CandidateMoneyValue,
  CandidateProfileFile,
  CandidateProfileState
} from "../contracts/candidate";
import { referenceJobView } from "../config/reference-job";
import {
  buildPrototypeCareerHistoryState,
  readPrototypeCareerHistoryState
} from "./prototype-career-history";
import { readPrototypePersonalDetailsState } from "./prototype-personal-details";
import { readOrCreatePrototypeResumeState } from "./prototype-resume";

const CANDIDATE_PROFILE_STORAGE_PREFIX = "ditto-jobs.prototype-candidate-profile";
const CANDIDATE_PROFILE_VERSION = 1;
const REFERENCE_JOB_ID = referenceJobView.id;

function getStorageKey(email: string): string {
  return `${CANDIDATE_PROFILE_STORAGE_PREFIX}:${encodeURIComponent(email.trim().toLowerCase())}`;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBooleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function buildDefaultMoneyValue(currencyCode = "ZAR"): CandidateMoneyValue {
  return {
    amount: "",
    currencyCode
  };
}

function getResumeCategory(index: number): CandidateFileCategory {
  return index === 0 ? "CV / Resume" : "Other";
}

function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toUpperCase() || "FILE";
}

function buildFilesFromResumeState(resumeState: CandidateResumeState): CandidateProfileFile[] {
  return resumeState.resumes.map((resume, index) => ({
    id: `profile-file-${resume.id}`,
    category: getResumeCategory(index),
    fileName: resume.fileName,
    fileSize: resume.fileSize,
    fileExtension: resume.fileExtension.toUpperCase(),
    uploadedAt: resume.uploadedAt,
    source: "resume",
    resumeRecord: resume
  }));
}

function getCurrentJobTitle(careerEntries: readonly PrototypeCareerEntry[]): string {
  const currentEntry = careerEntries.find((entry) => entry.isCurrent && entry.jobTitle.trim());
  return currentEntry?.jobTitle || careerEntries.find((entry) => entry.jobTitle.trim())?.jobTitle || "";
}

function getProfileSkills(careerEntries: readonly PrototypeCareerEntry[]): string[] {
  const seedSkills = ["React", "JavaScript", "Frontend Development", "UX Collaboration"];
  const industrySkills = careerEntries
    .map((entry) => entry.industry.trim())
    .filter(Boolean);

  return Array.from(new Set([...seedSkills, ...industrySkills])).slice(0, 8);
}

function normalizeProfileState(value: unknown, fallback: CandidateProfileState): CandidateProfileState {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const parsed = value as Partial<CandidateProfileState>;

  return {
    ...fallback,
    version: CANDIDATE_PROFILE_VERSION,
    email: readString(parsed.email) || fallback.email,
    firstName: readString(parsed.firstName) || fallback.firstName,
    lastName: readString(parsed.lastName) || fallback.lastName,
    profilePicture: parsed.profilePicture ?? fallback.profilePicture,
    location: parsed.location ?? fallback.location,
    phoneNumber: parsed.phoneNumber ?? fallback.phoneNumber,
    alternativeNumber: parsed.alternativeNumber ?? fallback.alternativeNumber,
    currentJobTitle: readString(parsed.currentJobTitle) || fallback.currentJobTitle,
    aboutMe: readString(parsed.aboutMe) || fallback.aboutMe,
    skills: readArray<string>(parsed.skills).filter((skill) => skill.trim()),
    languages: readArray(parsed.languages),
    careerEntries: readArray<PrototypeCareerEntry>(parsed.careerEntries).length
      ? readArray<PrototypeCareerEntry>(parsed.careerEntries)
      : fallback.careerEntries,
    educationEntries: readArray<PrototypeEducationEntry>(parsed.educationEntries).length
      ? readArray<PrototypeEducationEntry>(parsed.educationEntries)
      : fallback.educationEntries,
    files: readArray<CandidateProfileFile>(parsed.files).length
      ? readArray<CandidateProfileFile>(parsed.files)
      : fallback.files,
    nationality: parsed.nationality ?? fallback.nationality,
    citizenship: parsed.citizenship ?? fallback.citizenship,
    dateOfBirth: readString(parsed.dateOfBirth),
    willingToRelocate: readBooleanOrNull(parsed.willingToRelocate),
    noticePeriod: parsed.noticePeriod ?? "",
    ownTransport: readBooleanOrNull(parsed.ownTransport),
    currentRemuneration: parsed.currentRemuneration ?? fallback.currentRemuneration,
    desiredRemuneration: parsed.desiredRemuneration ?? fallback.desiredRemuneration,
    createdAt: readString(parsed.createdAt) || fallback.createdAt,
    updatedAt: readString(parsed.updatedAt) || fallback.updatedAt
  };
}

function buildFallbackProfile(session: CandidateSession): CandidateProfileState {
  const timestamp = new Date().toISOString();
  const personalDetails =
    readPrototypePersonalDetailsState(session, REFERENCE_JOB_ID) as CandidatePersonalDetailsState | null;
  const resumeState = readOrCreatePrototypeResumeState(session);
  const careerHistory =
    readPrototypeCareerHistoryState(session, REFERENCE_JOB_ID) ??
    buildPrototypeCareerHistoryState(referenceJobView, resumeState.selectedResumeId);
  const careerEntries = careerHistory.careerEntries;
  const educationEntries = careerHistory.educationEntries;

  return {
    version: CANDIDATE_PROFILE_VERSION,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    profilePicture: personalDetails?.profilePicture ?? null,
    location: personalDetails?.location ?? null,
    phoneNumber: personalDetails?.phoneNumber ?? "",
    alternativeNumber: "",
    currentJobTitle: getCurrentJobTitle(careerEntries),
    aboutMe: personalDetails?.aboutMe ?? "",
    skills: getProfileSkills(careerEntries),
    languages: [],
    careerEntries,
    educationEntries,
    files: buildFilesFromResumeState(resumeState),
    nationality: null,
    citizenship: null,
    dateOfBirth: "",
    willingToRelocate: null,
    noticePeriod: "",
    ownTransport: null,
    currentRemuneration: buildDefaultMoneyValue(),
    desiredRemuneration: buildDefaultMoneyValue(),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function readPrototypeCandidateProfile(session: CandidateSession): CandidateProfileState | null {
  const raw = window.localStorage.getItem(getStorageKey(session.email));

  if (!raw) {
    return null;
  }

  try {
    return normalizeProfileState(JSON.parse(raw), buildFallbackProfile(session));
  } catch {
    window.localStorage.removeItem(getStorageKey(session.email));
    return null;
  }
}

export function buildPrototypeCandidateProfile(session: CandidateSession): CandidateProfileState {
  return readPrototypeCandidateProfile(session) ?? buildFallbackProfile(session);
}

export function savePrototypeCandidateProfile(
  session: CandidateSession,
  profile: CandidateProfileState
): void {
  const nextProfile: CandidateProfileState = {
    ...profile,
    version: CANDIDATE_PROFILE_VERSION,
    email: session.email,
    updatedAt: new Date().toISOString()
  };

  window.localStorage.setItem(getStorageKey(session.email), JSON.stringify(nextProfile));
}

export function buildProfileUploadFile(file: File, category: CandidateFileCategory): CandidateProfileFile {
  const timestamp = new Date().toISOString();

  return {
    id: `profile-file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category,
    fileName: file.name,
    fileSize: file.size,
    fileExtension: getFileExtension(file.name),
    mimeType: file.type,
    uploadedAt: timestamp,
    source: "profile-upload"
  };
}

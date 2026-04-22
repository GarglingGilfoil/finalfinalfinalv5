export type ApplicationAuthMode = "signin" | "signup" | "forgot-password";
export type AuthProvider = "email" | "google" | "apple";
export type CandidateEntryMode = "signin" | "signup";
export type ResumeFileExtension = "pdf" | "doc" | "docx";

export interface CandidateSession {
  authenticated: true;
  firstName: string;
  lastName: string;
  email: string;
  provider: AuthProvider;
  entryMode: CandidateEntryMode;
  createdAt: string;
}

export interface PrototypeResumeRecord {
  id: string;
  fileName: string;
  fileSize: number;
  fileExtension: ResumeFileExtension;
  uploadedAt: string;
  source: "seeded" | "uploaded";
}

export interface CandidateResumeState {
  resumes: PrototypeResumeRecord[];
  selectedResumeId: string | null;
}

export interface PrototypeCareerEntry {
  id: string;
  roleTitle: string;
  companyName: string;
  startDateLabel: string;
  endDateLabel: string;
  location: string;
}

export interface CandidateCareerHistoryState {
  entries: PrototypeCareerEntry[];
  parsedAt: string;
  sourceResumeId: string | null;
}

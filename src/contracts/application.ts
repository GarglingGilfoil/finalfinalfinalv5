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

export type PrototypeReviewEntrySource = "parsed" | "manual";

export type PrototypeCareerLevel =
  | "Intern / Apprentice"
  | "Entry Level"
  | "Junior"
  | "Mid Level"
  | "Senior"
  | "Lead"
  | "Principal"
  | "Manager"
  | "Director"
  | "Vice President"
  | "Executive / C-Level";

export type PrototypeEducationQualification =
  | "Certificate"
  | "Diploma"
  | "Degree"
  | "Post-Graduate"
  | "Honours"
  | "Masters"
  | "Doctorate"
  | "Other";

export interface PrototypeCareerEntry {
  id: string;
  jobTitle: string;
  company: string;
  location: CandidateLocationValue | null;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  isCurrent: boolean;
  industry: string;
  careerLevel: PrototypeCareerLevel | "";
  description: string;
  reasonForLeaving: string;
  source: PrototypeReviewEntrySource;
}

export interface PrototypeEducationEntry {
  id: string;
  institution: string;
  qualification: PrototypeEducationQualification | "";
  fieldOfStudy: string;
  startYear: string;
  endYear: string;
  description: string;
  source: PrototypeReviewEntrySource;
}

export interface CandidateCareerHistoryState {
  version: 4;
  careerEntries: PrototypeCareerEntry[];
  educationEntries: PrototypeEducationEntry[];
  /**
   * Deprecated compatibility alias for the current career review UI.
   * New workflow code should use careerEntries.
   */
  entries: PrototypeCareerEntry[];
  parsedAt: string;
  sourceResumeId: string | null;
}

export type CandidateFieldSource = "empty" | "resume-prefill" | "manual" | "backend";
export type PersonalDetailsCompletionSource =
  | "parsing-skip"
  | "parsing-complete"
  | "direct-entry";
export type PrototypeCountryDetectionSource =
  | "parsed-signal"
  | "saved-draft"
  | "browser-locale"
  | "browser-timezone"
  | "fallback";

export interface CandidatePersonalDetailsFieldState<T> {
  value: T;
  source: CandidateFieldSource;
  touched: boolean;
  dirty: boolean;
  valid: boolean | null;
  errorMessage?: string | null;
  updatedAt?: string | null;
}

export interface CandidateLocationValue {
  cityId: string;
  cityName: string;
  stateCode?: string;
  stateName?: string;
  countryCode: string;
  countryName: string;
  label: string;
}

export interface CandidatePhoneNumberValue {
  raw: string;
  e164?: string | null;
  countryCode?: string | null;
  countryFlag?: string | null;
  countryName?: string | null;
  phoneCode?: string | null;
}

export interface CandidateProfilePictureValue {
  fileName: string;
  fileSize: number;
  mimeType: string;
  dataUrl: string;
  updatedAt: string;
}

export interface CandidatePersonalDetailsState {
  version?: 1;
  jobId?: string;
  sourceResumeId: string | null;
  status: "draft" | "complete";
  createdAt?: string;
  updatedAt: string;
  lastSavedAt?: string | null;
  location: CandidateLocationValue | null;
  phoneNumber: string | CandidatePhoneNumberValue;
  aboutMe: string;
  profilePicture?: CandidateProfilePictureValue | null;
  detectedCountryCode: string | null;
  detectedCountrySource: PrototypeCountryDetectionSource;
  completionStartedFrom?: PersonalDetailsCompletionSource;
}

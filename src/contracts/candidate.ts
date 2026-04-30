import type {
  CandidateLocationValue,
  CandidatePhoneNumberValue,
  CandidateProfilePictureValue,
  PrototypeCareerEntry,
  PrototypeEducationEntry,
  PrototypeResumeRecord
} from "./application";

export type CandidateLanguageProficiency =
  | "Native or bilingual proficiency"
  | "Full professional proficiency"
  | "Professional working proficiency"
  | "Limited working proficiency";

export type CandidateFileCategory =
  | "CV / Resume"
  | "Cover Letter"
  | "Certificate"
  | "Portfolio"
  | "Other";

export type CandidateNoticePeriod =
  | ""
  | "1 week"
  | "2 weeks"
  | "3 weeks"
  | "4 weeks"
  | "5 weeks"
  | "6 weeks"
  | "7 weeks"
  | "8 weeks"
  | "1 Calendar Month"
  | "2 Calendar Months"
  | "3 Calendar Months";

export interface CandidateLanguageEntry {
  id: string;
  languageCode: string;
  languageName: string;
  proficiency: CandidateLanguageProficiency | "";
}

export interface CandidateNationalityValue {
  countryCode: string;
  flag: string;
  nationality: string;
}

export interface CandidateMoneyValue {
  amount: string;
  currencyCode: string;
}

export interface CandidateProfileFile {
  id: string;
  category: CandidateFileCategory;
  fileName: string;
  fileSize: number;
  fileExtension: string;
  mimeType?: string;
  uploadedAt: string;
  source: "resume" | "profile-upload";
  resumeRecord?: PrototypeResumeRecord;
}

export interface CandidateProfileState {
  version: 1;
  email: string;
  firstName: string;
  lastName: string;
  coverImage: CandidateProfilePictureValue | null;
  profilePicture: CandidateProfilePictureValue | null;
  location: CandidateLocationValue | null;
  phoneNumber: CandidatePhoneNumberValue | string;
  alternativeNumber: CandidatePhoneNumberValue | string;
  currentJobTitle: string;
  aboutMe: string;
  skills: string[];
  languages: CandidateLanguageEntry[];
  careerEntries: PrototypeCareerEntry[];
  educationEntries: PrototypeEducationEntry[];
  files: CandidateProfileFile[];
  nationality: CandidateNationalityValue | null;
  citizenship: CandidateNationalityValue | null;
  dateOfBirth: string;
  willingToRelocate: boolean | null;
  noticePeriod: CandidateNoticePeriod;
  ownTransport: boolean | null;
  currentRemuneration: CandidateMoneyValue;
  desiredRemuneration: CandidateMoneyValue;
  createdAt: string;
  updatedAt: string;
}

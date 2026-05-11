import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject
} from "react";
import {
  AlertTriangle,
  Briefcase,
  Check,
  ChevronDown,
  Download,
  Edit3,
  Eye,
  FileText,
  MapPin,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  ApplicationPhoneField,
  getCandidatePhoneNumberError
} from "../components/ApplicationPhoneField";
import { AuthPasswordField, AuthRichTextField } from "../components/ApplicationAuthPrimitives";
import { ProfileImageUploader } from "../components/ProfileImageUploader";
import { ResumeUploadSection } from "../components/ResumeUploadSection";
import { TransitionLink } from "../components/application/TransitionLink";
import { CareerEducationReviewList } from "./ApplicationCareerHistoryPage";
import { referenceJobView } from "../config/reference-job";
import type {
  CandidateLocationValue,
  CandidatePhoneNumberValue,
  CandidateProfilePictureValue,
  CandidateResumeState,
  CandidateSession,
  PrototypeCareerEntry,
  PrototypeEducationEntry
} from "../contracts/application";
import type {
  CandidateFileCategory,
  CandidateLanguageEntry,
  CandidateLanguageProficiency,
  CandidateMoneyValue,
  CandidateNationalityValue,
  CandidateNoticePeriod,
  CandidateProfileFile,
  CandidateProfileState
} from "../contracts/candidate";
import { searchLanguages } from "../lib/languages";
import { searchNationalities, type NationalityOption } from "../lib/nationalities";
import { searchSkills } from "../lib/skills";
import { searchCurrencies } from "../lib/currencies";
import {
  buildProfileUploadFile,
  buildPrototypeCandidateProfile,
  savePrototypeCandidateProfile
} from "../lib/prototype-candidate-profile";
import {
  deletePrototypeProfileAsset,
  readPrototypeProfileAsset,
  savePrototypeProfileAsset
} from "../lib/prototype-profile-assets";
import { readPrototypeResumeAsset } from "../lib/prototype-resume-assets";
import {
  readOrCreatePrototypeResumeState,
  savePrototypeResumeState
} from "../lib/prototype-resume";
import { clearPrototypeAccountData } from "../lib/prototype-account";
import { clearPrototypeSession, readPrototypeSession } from "../lib/prototype-auth";
import {
  buildCandidateProfilePath,
  buildGlobalAuthPath,
  buildJobSearchPath,
  navigateTo
} from "../lib/router";

type ProfileSectionId =
  | "identity"
  | "about"
  | "contact"
  | "skills"
  | "languages"
  | "career"
  | "education"
  | "files"
  | "work"
  | "personal";

type ProfileTabId =
  | "about"
  | "experience"
  | "files"
  | "settings";

type ValidationErrors = Record<string, string | undefined>;

const PROFILE_TABS: Array<{ id: ProfileTabId; label: string; description: string }> = [
  {
    id: "about",
    label: "About",
    description: "Manage your contact details, professional snapshot, and key profile context."
  },
  {
    id: "experience",
    label: "Experience",
    description: "Review the roles and education that form your professional story."
  },
  {
    id: "files",
    label: "Files",
    description: "Manage your files and keep your resume up to date."
  },
  {
    id: "settings",
    label: "Settings",
    description: "Review your account basics and profile access."
  }
];

const PROFILE_FILE_ACCEPT =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp";
const PROFILE_FILE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PROFILE_FILE_NAME_MAX_LENGTH = 50;
const PROFILE_TAB_SCROLL_STORAGE_KEY = "ditto-jobs.profile-tab-scroll";

const LANGUAGE_PROFICIENCY_OPTIONS: CandidateLanguageProficiency[] = [
  "Native or bilingual proficiency",
  "Full professional proficiency",
  "Professional working proficiency",
  "Limited working proficiency"
];

const NOTICE_PERIOD_OPTIONS: CandidateNoticePeriod[] = [
  "",
  "1 week",
  "2 weeks",
  "3 weeks",
  "4 weeks",
  "5 weeks",
  "6 weeks",
  "7 weeks",
  "8 weeks",
  "1 Calendar Month",
  "2 Calendar Months",
  "3 Calendar Months"
];

function markProfileTabScrollPending(): void {
  try {
    window.sessionStorage.setItem(PROFILE_TAB_SCROLL_STORAGE_KEY, "true");
  } catch {
    // This is only a same-session UI alignment hint. Ignore storage failures.
  }
}

function consumeProfileTabScrollPending(): boolean {
  try {
    const isPending = window.sessionStorage.getItem(PROFILE_TAB_SCROLL_STORAGE_KEY) === "true";
    window.sessionStorage.removeItem(PROFILE_TAB_SCROLL_STORAGE_KEY);
    return isPending;
  } catch {
    return false;
  }
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtensionFromName(fileName: string, fallback: string): string {
  const extension = fileName.trim().split(".").pop();

  if (!extension || extension === fileName.trim()) {
    return fallback;
  }

  return extension.toUpperCase();
}

function buildPdfPreviewUrl(objectUrl: string): string {
  return `${objectUrl}#navpanes=0&zoom=100`;
}

function formatFileUploadedDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function stripHtml(value: string): string {
  if (!value.trim()) {
    return "";
  }

  const scratch = document.createElement("div");
  scratch.innerHTML = value;
  return scratch.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function buildInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.trim().toUpperCase() || "DU";
}

function normalizeSkill(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isPhoneEmpty(value: CandidatePhoneNumberValue | string): boolean {
  return typeof value === "string" ? !value.trim() : !value.raw.trim();
}

function formatPhoneValue(value: CandidatePhoneNumberValue | string): string {
  if (typeof value === "string") {
    return value.trim();
  }

  return value.e164?.trim() || value.raw.trim();
}

function formatBooleanValue(value: boolean | null): string | null {
  if (value === null) {
    return null;
  }

  return value ? "Yes" : "No";
}

function formatDateValue(value: string): string | null {
  if (!value.trim()) {
    return null;
  }

  const date = parseIsoDate(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function validateDateOfBirth(value: string): string | undefined {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return "Enter date of birth as YYYY MM DD.";
  }

  const date = parseIsoDate(trimmedValue);

  if (!date) {
    return "Enter a real date of birth.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date > today) {
    return "Date of birth cannot be in the future.";
  }

  if (date.getFullYear() < 1900) {
    return "Enter a date of birth after 1900.";
  }

  return undefined;
}

function formatMoneyValue(value: CandidateMoneyValue): string | null {
  const amount = value.amount.trim();

  if (!amount) {
    return null;
  }

  const numericAmount = Number(amount.replace(/[,\s]/g, ""));
  const formattedAmount = Number.isFinite(numericAmount)
    ? new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 0 }).format(numericAmount)
    : amount;

  return `${value.currencyCode || "ZAR"} ${formattedAmount} per month`;
}

function getCareerDateScore(month: string, year: string): number {
  const yearNumber = Number(year);
  const monthNumber = Number(month || "12");

  if (!Number.isFinite(yearNumber)) {
    return 0;
  }

  return yearNumber * 12 + (Number.isFinite(monthNumber) ? monthNumber : 12);
}

function getMostRecentCareerRole(careerEntries: readonly PrototypeCareerEntry[]): {
  sourceLabel: string;
  title: string;
} | null {
  const entriesWithTitle = careerEntries.filter((entry) => entry.jobTitle.trim());

  if (!entriesWithTitle.length) {
    return null;
  }

  const sortByStartDate = (a: PrototypeCareerEntry, b: PrototypeCareerEntry): number =>
    getCareerDateScore(b.startMonth, b.startYear) - getCareerDateScore(a.startMonth, a.startYear);

  const currentEntry = entriesWithTitle
    .filter((entry) => entry.isCurrent)
    .sort(sortByStartDate)[0];

  if (currentEntry) {
    return {
      sourceLabel: "Current role from Experience",
      title: currentEntry.jobTitle.trim()
    };
  }

  const recentEntry = entriesWithTitle
    .slice()
    .sort(
      (a, b) =>
        getCareerDateScore(b.endMonth || b.startMonth, b.endYear || b.startYear) -
        getCareerDateScore(a.endMonth || a.startMonth, a.endYear || a.startYear)
    )[0];

  return recentEntry
    ? {
        sourceLabel: "Most recent role from Experience",
        title: recentEntry.jobTitle.trim()
      }
    : null;
}

function getPrimaryCareerEntry(careerEntries: readonly PrototypeCareerEntry[]): PrototypeCareerEntry | null {
  if (!careerEntries.length) {
    return null;
  }

  const sortByStartDate = (a: PrototypeCareerEntry, b: PrototypeCareerEntry): number =>
    getCareerDateScore(b.startMonth, b.startYear) - getCareerDateScore(a.startMonth, a.startYear);

  const currentEntry = careerEntries
    .filter((entry) => entry.isCurrent)
    .sort(sortByStartDate)[0];

  if (currentEntry) {
    return currentEntry;
  }

  return careerEntries
    .slice()
    .sort(
      (a, b) =>
        getCareerDateScore(b.endMonth || b.startMonth, b.endYear || b.startYear) -
        getCareerDateScore(a.endMonth || a.startMonth, a.endYear || a.startYear)
    )[0] ?? null;
}

function getPrimaryEducationEntry(
  educationEntries: readonly PrototypeEducationEntry[]
): PrototypeEducationEntry | null {
  if (!educationEntries.length) {
    return null;
  }

  return educationEntries
    .slice()
    .sort(
      (a, b) =>
        getCareerDateScore("", b.endYear || b.startYear) -
        getCareerDateScore("", a.endYear || a.startYear)
    )[0] ?? null;
}

function validateEmail(value: string): string | undefined {
  if (!value.trim()) {
    return "Email is required.";
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? undefined
    : "Enter a valid email address.";
}

function validateProfileSection(
  sectionId: ProfileSectionId,
  profile: CandidateProfileState
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (sectionId === "identity") {
    if (!profile.firstName.trim()) {
      errors.firstName = "First name is required.";
    }
    if (!profile.lastName.trim()) {
      errors.lastName = "Last name is required.";
    }
    if (!profile.location) {
      errors.location = "Choose your city and country.";
    }
  }

  if (sectionId === "contact") {
    errors.email = validateEmail(profile.email);
    if (!isPhoneEmpty(profile.phoneNumber)) {
      errors.phoneNumber = getCandidatePhoneNumberError(profile.phoneNumber, profile.location?.countryCode);
    }

    if (!isPhoneEmpty(profile.alternativeNumber)) {
      errors.alternativeNumber = getCandidatePhoneNumberError(
        profile.alternativeNumber,
        profile.location?.countryCode
      );
    }
  }

  if (sectionId === "languages") {
    profile.languages.forEach((language) => {
      if (!language.languageCode) {
        errors[`language-${language.id}`] = "Choose a language.";
      }
      if (language.languageCode && !language.proficiency) {
        errors[`proficiency-${language.id}`] = "Choose a proficiency.";
      }
    });
  }

  if (sectionId === "personal") {
    errors.dateOfBirth = validateDateOfBirth(profile.dateOfBirth);
  }

  if (sectionId === "career") {
    profile.careerEntries.forEach((entry) => {
      if (!entry.jobTitle.trim()) {
        errors[`career-${entry.id}-jobTitle`] = "Job title is required.";
      }
      if (!entry.company.trim()) {
        errors[`career-${entry.id}-company`] = "Company is required.";
      }
      if (!entry.startMonth || !entry.startYear) {
        errors[`career-${entry.id}-start`] = "Start date is required.";
      }
      if (!entry.isCurrent && (!entry.endMonth || !entry.endYear)) {
        errors[`career-${entry.id}-end`] = "End date is required.";
      }
    });
  }

  if (sectionId === "education") {
    profile.educationEntries.forEach((entry) => {
      if (!entry.institution.trim()) {
        errors[`education-${entry.id}-institution`] = "Institution is required.";
      }
      if (!entry.qualification) {
        errors[`education-${entry.id}-qualification`] = "Qualification is required.";
      }
      if (!entry.startYear || !entry.endYear) {
        errors[`education-${entry.id}-years`] = "From and To years are required.";
      }
    });
  }

  if (sectionId === "work") {
    (["currentRemuneration", "desiredRemuneration"] as const).forEach((key) => {
      const value = profile[key];
      const amount = value.amount.trim();

      if (!amount) {
        return;
      }

      const numericAmount = Number(amount.replace(/,/g, ""));
      if (!Number.isFinite(numericAmount)) {
        errors[`${key}Amount`] = "Enter a numeric amount.";
      } else if (numericAmount < 0) {
        errors[`${key}Amount`] = "Amount cannot be negative.";
      }

      if (!value.currencyCode) {
        errors[`${key}Currency`] = "Choose a currency.";
      }
    });
  }

  return Object.fromEntries(Object.entries(errors).filter(([, value]) => Boolean(value)));
}

function calculateCompletion(profile: CandidateProfileState) {
  const primaryCareerEntry = getPrimaryCareerEntry(profile.careerEntries);
  const primaryEducationEntry = getPrimaryEducationEntry(profile.educationEntries);
  const hasCompleteLanguage = profile.languages.some(
    (language) => Boolean(language.languageCode && language.languageName.trim() && language.proficiency)
  );
  const hasMoneyValue = (value: CandidateMoneyValue): boolean =>
    Boolean(value.amount.trim() && value.currencyCode.trim());
  const hasCareerDates = primaryCareerEntry
    ? Boolean(
        primaryCareerEntry.startMonth &&
          primaryCareerEntry.startYear &&
          (primaryCareerEntry.isCurrent || (primaryCareerEntry.endMonth && primaryCareerEntry.endYear))
      )
    : false;
  const hasEducationYears = primaryEducationEntry
    ? Boolean(primaryEducationEntry.startYear && primaryEducationEntry.endYear)
    : false;
  const completionItems = [
    { id: "cover", target: "about", label: "Cover image", complete: Boolean(profile.coverImage) },
    { id: "avatar", target: "about", label: "Profile picture", complete: Boolean(profile.profilePicture) },
    { id: "first-name", target: "about", label: "First name", complete: Boolean(profile.firstName.trim()) },
    { id: "last-name", target: "about", label: "Last name", complete: Boolean(profile.lastName.trim()) },
    { id: "email", target: "contact", label: "Email address", complete: Boolean(validateEmail(profile.email) === undefined) },
    { id: "location", target: "about", label: "Location", complete: Boolean(profile.location) },
    { id: "about", target: "about", label: "About Me", complete: Boolean(stripHtml(profile.aboutMe)) },
    { id: "skills", target: "skills", label: "Skills", complete: profile.skills.length > 0 },
    { id: "languages", target: "languages", label: "Language and proficiency", complete: hasCompleteLanguage },
    {
      id: "career-title",
      target: "career",
      label: "Career job title",
      complete: Boolean(primaryCareerEntry?.jobTitle.trim())
    },
    {
      id: "career-company",
      target: "career",
      label: "Career company",
      complete: Boolean(primaryCareerEntry?.company.trim())
    },
    { id: "career-dates", target: "career", label: "Career dates", complete: hasCareerDates },
    {
      id: "career-industry",
      target: "career",
      label: "Industry",
      complete: Boolean(primaryCareerEntry?.industry.trim())
    },
    {
      id: "career-level",
      target: "career",
      label: "Career level",
      complete: Boolean(primaryCareerEntry?.careerLevel)
    },
    {
      id: "career-description",
      target: "career",
      label: "Career description",
      complete: Boolean(stripHtml(primaryCareerEntry?.description ?? ""))
    },
    {
      id: "education-institution",
      target: "education",
      label: "Education institution",
      complete: Boolean(primaryEducationEntry?.institution.trim())
    },
    {
      id: "education-qualification",
      target: "education",
      label: "Qualification",
      complete: Boolean(primaryEducationEntry?.qualification)
    },
    {
      id: "education-field",
      target: "education",
      label: "Field of study",
      complete: Boolean(primaryEducationEntry?.fieldOfStudy.trim())
    },
    { id: "education-years", target: "education", label: "Education years", complete: hasEducationYears },
    { id: "files", target: "files", label: "Files", complete: profile.files.length > 0 },
    {
      id: "date-of-birth",
      target: "personal",
      label: "Date of birth",
      complete: Boolean(profile.dateOfBirth.trim() && !validateDateOfBirth(profile.dateOfBirth))
    },
    { id: "nationality", target: "personal", label: "Nationality", complete: Boolean(profile.nationality) },
    { id: "citizenship", target: "personal", label: "Citizenship", complete: Boolean(profile.citizenship) },
    {
      id: "relocation",
      target: "work",
      label: "Relocation preference",
      complete: profile.willingToRelocate !== null
    },
    {
      id: "notice-period",
      target: "work",
      label: "Notice period",
      complete: Boolean(profile.noticePeriod)
    },
    {
      id: "own-transport",
      target: "work",
      label: "Own transport",
      complete: profile.ownTransport !== null
    },
    {
      id: "current-remuneration",
      target: "work",
      label: "Current compensation",
      complete: hasMoneyValue(profile.currentRemuneration)
    },
    {
      id: "desired-remuneration",
      target: "work",
      label: "Desired compensation",
      complete: hasMoneyValue(profile.desiredRemuneration)
    }
  ];
  const completedCount = completionItems.filter((item) => item.complete).length;

  return {
    items: completionItems,
    missing: completionItems.filter((item) => !item.complete),
    percentage: Math.round((completedCount / completionItems.length) * 100)
  };
}

function TextField({
  disabled = false,
  error,
  helper,
  label,
  onChange = () => undefined,
  placeholder,
  type = "text",
  value
}: {
  disabled?: boolean;
  error?: string;
  helper?: string;
  label: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: "date" | "email" | "number" | "password" | "text";
  value: string;
}): JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const describedBy = [helper ? helperId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <label className="auth-field candidate-profile-field">
      <span className="auth-field__label">{label}</span>
      <input
        aria-describedby={describedBy || undefined}
        aria-invalid={Boolean(error)}
        className={["auth-field__input", error ? "auth-field__input--error" : ""]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        id={id}
        onChange={(event) => {
          if (!disabled) {
            onChange(event.target.value);
          }
        }}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {helper ? (
        <span className="candidate-profile-field__helper" id={helperId}>
          {helper}
        </span>
      ) : null}
      {error ? (
        <span className="auth-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}

function getDateOfBirthParts(value: string): { day: string; month: string; year: string } {
  const [year = "", month = "", day = ""] = value.split("-");

  return {
    day: day.replace(/\D/g, "").slice(0, 2),
    month: month.replace(/\D/g, "").slice(0, 2),
    year: year.replace(/\D/g, "").slice(0, 4)
  };
}

function buildDateOfBirthValue(parts: { day: string; month: string; year: string }): string {
  if (!parts.year && !parts.month && !parts.day) {
    return "";
  }

  return [parts.year, parts.month, parts.day].join("-");
}

function DateOfBirthField({
  error,
  label,
  onChange,
  value
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}): JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;
  const yearInputRef = useRef<HTMLInputElement | null>(null);
  const monthInputRef = useRef<HTMLInputElement | null>(null);
  const dayInputRef = useRef<HTMLInputElement | null>(null);
  const parts = getDateOfBirthParts(value);

  const updatePart = (
    part: "day" | "month" | "year",
    nextValue: string,
    maxLength: number,
    nextInputRef?: RefObject<HTMLInputElement>
  ): void => {
    const sanitizedValue = nextValue.replace(/\D/g, "").slice(0, maxLength);
    const nextParts = {
      ...parts,
      [part]: sanitizedValue
    };

    onChange(buildDateOfBirthValue(nextParts));

    if (sanitizedValue.length === maxLength) {
      window.setTimeout(() => nextInputRef?.current?.focus(), 0);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>): void => {
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "");

    if (pastedDigits.length < 6) {
      return;
    }

    event.preventDefault();

    onChange(
      buildDateOfBirthValue({
        year: pastedDigits.slice(0, 4),
        month: pastedDigits.slice(4, 6),
        day: pastedDigits.slice(6, 8)
      })
    );
    window.setTimeout(() => dayInputRef.current?.focus(), 0);
  };

  const handleBackspaceToPrevious = (
    event: KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    previousInputRef?: RefObject<HTMLInputElement>
  ): void => {
    if (event.key === "Backspace" && currentValue.length === 0) {
      previousInputRef?.current?.focus();
    }
  };

  return (
    <div className="auth-field candidate-profile-field candidate-profile-date-field">
      <span className="auth-field__label" id={id}>
        {label}
      </span>
      <div
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        aria-labelledby={id}
        className={[
          "candidate-profile-date-field__control",
          error ? "candidate-profile-date-field__control--error" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        role="group"
      >
        <input
          aria-label={`${label} year`}
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => updatePart("year", event.target.value, 4, monthInputRef)}
          onPaste={handlePaste}
          placeholder="YYYY"
          ref={yearInputRef}
          type="text"
          value={parts.year}
        />
        <span aria-hidden="true">/</span>
        <input
          aria-label={`${label} month`}
          inputMode="numeric"
          maxLength={2}
          onChange={(event) => updatePart("month", event.target.value, 2, dayInputRef)}
          onKeyDown={(event) => handleBackspaceToPrevious(event, parts.month, yearInputRef)}
          onPaste={handlePaste}
          placeholder="MM"
          ref={monthInputRef}
          type="text"
          value={parts.month}
        />
        <span aria-hidden="true">/</span>
        <input
          aria-label={`${label} day`}
          inputMode="numeric"
          maxLength={2}
          onChange={(event) => updatePart("day", event.target.value, 2)}
          onKeyDown={(event) => handleBackspaceToPrevious(event, parts.day, monthInputRef)}
          onPaste={handlePaste}
          placeholder="DD"
          ref={dayInputRef}
          type="text"
          value={parts.day}
        />
      </div>
      {error ? (
        <span className="auth-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function LanguageProficiencySelect({
  error,
  label,
  onChange,
  value
}: {
  error?: string;
  label: string;
  onChange: (value: CandidateLanguageProficiency | "") => void;
  value: CandidateLanguageProficiency | "";
}): JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;
  const listboxId = `${id}-listbox`;
  const fieldRootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const options: Array<{ label: string; value: CandidateLanguageProficiency | "" }> = [
    { label: "Choose proficiency", value: "" },
    ...LANGUAGE_PROFICIENCY_OPTIONS.map((proficiency) => ({ label: proficiency, value: proficiency }))
  ];
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const selectedOption = options[selectedIndex] ?? options[0];
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(selectedIndex);
    }
  }, [isOpen, selectedIndex]);

  const closeDropdown = (): void => {
    setIsOpen(false);
  };

  const commitOption = (optionIndex: number): void => {
    const option = options[optionIndex];

    if (!option) {
      return;
    }

    onChange(option.value);
    closeDropdown();
    window.setTimeout(() => {
      buttonRef.current?.focus();
    }, 0);
  };

  const moveActiveOption = (direction: 1 | -1): void => {
    setActiveIndex((current) => {
      const nextIndex = current + direction;

      if (nextIndex < 0) {
        return options.length - 1;
      }

      if (nextIndex >= options.length) {
        return 0;
      }

      return nextIndex;
    });
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      moveActiveOption(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(options.length - 1);
      return;
    }

    if (event.key === "Escape") {
      closeDropdown();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      commitOption(activeIndex);
    }
  };

  return (
    <div
      className="auth-field career-review-select-field candidate-profile-proficiency-select"
      onBlur={(event) => {
        const nextFocusedTarget = event.relatedTarget;

        if (nextFocusedTarget instanceof Node && fieldRootRef.current?.contains(nextFocusedTarget)) {
          return;
        }

        closeDropdown();
      }}
      ref={fieldRootRef}
    >
      <label className="auth-field__label career-review-label" htmlFor={id}>
        <span>{label}</span>
      </label>
      <button
        aria-activedescendant={isOpen ? `${id}-option-${activeIndex}` : undefined}
        aria-controls={isOpen ? listboxId : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error)}
        className={[
          "auth-field__input",
          "career-review-select-field__trigger",
          error ? "auth-field__input--error" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        data-placeholder={!value ? "true" : "false"}
        id={id}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        ref={buttonRef}
        role="combobox"
        type="button"
      >
        <span className="career-review-select-field__value">
          {selectedOption?.label || "Choose proficiency"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="career-review-select-field__chevron"
          data-open={isOpen || undefined}
        />
      </button>
      {isOpen ? (
        <div className="career-review-select-field__panel">
          <ul className="career-review-select-field__list" id={listboxId} role="listbox">
            {options.map((option, index) => (
              <li
                aria-selected={option.value === value}
                className="career-review-select-field__option"
                data-active={index === activeIndex ? "true" : "false"}
                data-selected={option.value === value ? "true" : "false"}
                id={`${id}-option-${index}`}
                key={option.value || "empty"}
                onClick={() => commitOption(index)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                tabIndex={-1}
              >
                <span>{option.label}</span>
                {option.value === value ? (
                  <Check aria-hidden="true" className="career-review-select-field__check" />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? (
        <span className="auth-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function NoticePeriodSelect({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: CandidateNoticePeriod) => void;
  value: CandidateNoticePeriod;
}): JSX.Element {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const fieldRootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const options = NOTICE_PERIOD_OPTIONS.map((noticePeriod) => ({
    label: noticePeriod || "Select notice period",
    value: noticePeriod
  }));
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );
  const selectedOption = options[selectedIndex] ?? options[0];
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(selectedIndex);
    }
  }, [isOpen, selectedIndex]);

  const closeDropdown = (): void => {
    setIsOpen(false);
  };

  const commitOption = (optionIndex: number): void => {
    const option = options[optionIndex];

    if (!option) {
      return;
    }

    onChange(option.value);
    closeDropdown();
    window.setTimeout(() => {
      buttonRef.current?.focus();
    }, 0);
  };

  const moveActiveOption = (direction: 1 | -1): void => {
    setActiveIndex((current) => {
      const nextIndex = current + direction;

      if (nextIndex < 0) {
        return options.length - 1;
      }

      if (nextIndex >= options.length) {
        return 0;
      }

      return nextIndex;
    });
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      moveActiveOption(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(options.length - 1);
      return;
    }

    if (event.key === "Escape") {
      closeDropdown();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (!isOpen) {
        setIsOpen(true);
        return;
      }

      commitOption(activeIndex);
    }
  };

  return (
    <div
      className="auth-field career-review-select-field candidate-profile-notice-select"
      onBlur={(event) => {
        const nextFocusedTarget = event.relatedTarget;

        if (nextFocusedTarget instanceof Node && fieldRootRef.current?.contains(nextFocusedTarget)) {
          return;
        }

        closeDropdown();
      }}
      ref={fieldRootRef}
    >
      <label className="auth-field__label career-review-label" htmlFor={id}>
        <span>{label}</span>
      </label>
      <button
        aria-activedescendant={isOpen ? `${id}-option-${activeIndex}` : undefined}
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="auth-field__input career-review-select-field__trigger"
        data-placeholder={!value ? "true" : "false"}
        id={id}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
        ref={buttonRef}
        role="combobox"
        type="button"
      >
        <span className="career-review-select-field__value">
          {selectedOption?.label || "Select notice period"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="career-review-select-field__chevron"
          data-open={isOpen || undefined}
        />
      </button>
      {isOpen ? (
        <div className="career-review-select-field__panel">
          <ul className="career-review-select-field__list" id={listboxId} role="listbox">
            {options.map((option, index) => (
              <li
                aria-selected={option.value === value}
                className="career-review-select-field__option"
                data-active={index === activeIndex ? "true" : "false"}
                data-selected={option.value === value ? "true" : "false"}
                id={`${id}-option-${index}`}
                key={option.value || "empty"}
                onClick={() => commitOption(index)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
                tabIndex={-1}
              >
                <span>{option.label}</span>
                {option.value === value ? (
                  <Check aria-hidden="true" className="career-review-select-field__check" />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function EditableProfileSection({
  children,
  editingSection,
  id,
  isDirty,
  onCancel,
  onEdit,
  onSave,
  savedSection,
  support,
  title,
  variant = "default"
}: {
  children: ReactNode;
  editingSection: ProfileSectionId | null;
  id: ProfileSectionId;
  isDirty: boolean;
  onCancel: () => void;
  onEdit: (sectionId: ProfileSectionId) => void;
  onSave: (sectionId: ProfileSectionId) => void;
  savedSection: ProfileSectionId | null;
  support?: string;
  title: string;
  variant?: "default" | "story" | "panel";
}): JSX.Element {
  const isEditing = editingSection === id;
  const headingId = `profile-section-${id}`;

  return (
    <section
      aria-labelledby={headingId}
      className={[
        "candidate-profile-section",
        "surface-card",
        variant !== "default" ? `candidate-profile-section--${variant}` : ""
      ]
        .filter(Boolean)
        .join(" ")}
      data-editing={isEditing || undefined}
      id={id}
    >
      <header className="candidate-profile-section__header">
        <div>
          <h2 id={headingId}>{title}</h2>
          {support ? <p>{support}</p> : null}
        </div>
        <div className="candidate-profile-section__actions">
          {savedSection === id && !isEditing ? (
            <span className="candidate-profile-save-status" role="status">
              Saved
            </span>
          ) : null}
          {!isEditing ? (
            <button
              className="button button--ghost candidate-profile-section__edit"
              onClick={() => onEdit(id)}
              type="button"
            >
              <Edit3 aria-hidden="true" className="candidate-profile-section__edit-icon" />
              Edit
            </button>
          ) : null}
        </div>
      </header>
      {children}
      {isEditing ? (
        <div className="candidate-profile-section__footer">
          <button
            className="button button--ghost candidate-profile-section__footer-button"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button candidate-profile-section__footer-button candidate-profile-section__footer-button--primary"
            disabled={!isDirty}
            onClick={() => onSave(id)}
            type="button"
          >
            Save
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ProfileDetailRows({
  empty,
  rows
}: {
  empty?: ReactNode;
  rows: Array<{ label: string; value: ReactNode | null | undefined }>;
}): JSX.Element {
  const visibleRows = rows.filter((row) => row.value !== null && row.value !== undefined && row.value !== "");

  if (!visibleRows.length) {
    return <div className="candidate-profile-soft-empty">{empty ?? "Not shared yet"}</div>;
  }

  return (
    <dl className="candidate-profile-detail-rows">
      {visibleRows.map((row) => (
        <div className="candidate-profile-detail-row" key={row.label}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProfileInlinePrompt({ children }: { children: ReactNode }): JSX.Element {
  return <span className="candidate-profile-inline-prompt">{children}</span>;
}

function ProfileAboutMePreview({ value }: { value: string }): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowToggle, setShouldShowToggle] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsExpanded(false);
  }, [value]);

  useEffect(() => {
    const contentElement = contentRef.current;

    if (!contentElement) {
      setShouldShowToggle(false);
      return;
    }

    const updateToggleVisibility = (): void => {
      const styles = window.getComputedStyle(contentElement);
      const fontSize = Number.parseFloat(styles.fontSize) || 16;
      const lineHeight = Number.parseFloat(styles.lineHeight) || fontSize * 1.72;
      const previewHeight = lineHeight * 8;

      setShouldShowToggle(contentElement.scrollHeight > previewHeight + 2);
    };

    updateToggleVisibility();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateToggleVisibility);
      return () => {
        window.removeEventListener("resize", updateToggleVisibility);
      };
    }

    const resizeObserver = new ResizeObserver(updateToggleVisibility);
    resizeObserver.observe(contentElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [value]);

  return (
    <div
      className={[
        "candidate-profile-about-preview",
        isExpanded && shouldShowToggle ? "candidate-profile-about-preview--expanded" : "",
        shouldShowToggle ? "candidate-profile-about-preview--has-toggle" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="candidate-profile-rich-preview candidate-profile-story__summary candidate-profile-about-preview__content"
        dangerouslySetInnerHTML={{ __html: value }}
        ref={contentRef}
      />
      {shouldShowToggle ? (
        <div className="candidate-profile-about-preview__footer">
          <button
            className="career-review-see-more"
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
          >
            {isExpanded ? "See less" : "See more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function doesChipSetFitWithinRows(
  widths: number[],
  containerWidth: number,
  gap: number,
  maxRows: number
): boolean {
  if (!containerWidth) {
    return true;
  }

  let row = 1;
  let usedWidth = 0;

  for (const width of widths) {
    const chipWidth = Math.min(Math.ceil(width), containerWidth);
    const nextWidth = usedWidth === 0 ? chipWidth : usedWidth + gap + chipWidth;

    if (nextWidth <= containerWidth + 0.5) {
      usedWidth = nextWidth;
      continue;
    }

    row += 1;

    if (row > maxRows) {
      return false;
    }

    usedWidth = chipWidth;
  }

  return true;
}

function getVisibleProfileSkillCount(
  widths: number[],
  overflowWidths: Map<number, number>,
  containerWidth: number,
  gap: number,
  maxRows: number
): number {
  const total = widths.length;

  if (doesChipSetFitWithinRows(widths, containerWidth, gap, maxRows)) {
    return total;
  }

  for (let visibleCount = total - 1; visibleCount >= 0; visibleCount -= 1) {
    const hiddenCount = total - visibleCount;
    const overflowWidth = overflowWidths.get(hiddenCount);

    if (overflowWidth === undefined) {
      continue;
    }

    if (
      doesChipSetFitWithinRows(
        [...widths.slice(0, visibleCount), overflowWidth],
        containerWidth,
        gap,
        maxRows
      )
    ) {
      return visibleCount;
    }
  }

  return 0;
}

function ProfileSkillOverflowList({ skills }: { skills: string[] }): JSX.Element {
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const overflowId = useId();
  const [visibleCount, setVisibleCount] = useState(skills.length);
  const [isOpen, setIsOpen] = useState(false);

  useLayoutEffect(() => {
    const chipsElement = chipsRef.current;
    const measureElement = measureRef.current;

    if (!chipsElement || !measureElement || skills.length === 0) {
      setVisibleCount(skills.length);
      return;
    }

    let animationFrame = 0;

    const measureOverflow = (): void => {
      const containerWidth = chipsElement.clientWidth;

      if (!containerWidth) {
        return;
      }

      const computedStyles = window.getComputedStyle(chipsElement);
      const gap = Number.parseFloat(computedStyles.columnGap || computedStyles.gap || "0");
      const itemWidths = Array.from(
        measureElement.querySelectorAll<HTMLElement>("[data-profile-skill-measure]")
      ).map((node) => Math.ceil(node.getBoundingClientRect().width));
      const overflowWidths = new Map<number, number>();

      Array.from(
        measureElement.querySelectorAll<HTMLElement>("[data-profile-skill-overflow]")
      ).forEach((node) => {
        const hiddenCount = Number(node.dataset.profileSkillOverflow);
        overflowWidths.set(hiddenCount, Math.ceil(node.getBoundingClientRect().width));
      });

      const nextVisibleCount = getVisibleProfileSkillCount(
        itemWidths,
        overflowWidths,
        containerWidth,
        gap,
        3
      );

      setVisibleCount((current) => (current === nextVisibleCount ? current : nextVisibleCount));
    };

    const requestMeasure = (): void => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(measureOverflow);
    };

    requestMeasure();

    const resizeObserver = new ResizeObserver(() => requestMeasure());

    resizeObserver.observe(chipsElement);
    resizeObserver.observe(measureElement);

    if ("fonts" in document) {
      void document.fonts.ready.then(() => requestMeasure());
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [skills]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target as Node;

      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (visibleCount >= skills.length && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen, skills.length, visibleCount]);

  const hiddenCount = Math.max(0, skills.length - visibleCount);
  const visibleSkills = hiddenCount > 0 ? skills.slice(0, visibleCount) : skills;
  const overflowLabel = `+${hiddenCount} more`;

  return (
    <div
      className={[
        "candidate-profile-skill-overflow",
        isOpen ? "candidate-profile-skill-overflow--open" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="candidate-profile-chip-list candidate-profile-chip-list--profile candidate-profile-chip-list--clamped"
        ref={chipsRef}
        role="list"
      >
        {visibleSkills.map((skill) => (
          <span className="candidate-profile-chip" key={skill} role="listitem" title={skill}>
            {skill}
          </span>
        ))}

        {hiddenCount > 0 ? (
          <button
            aria-controls={overflowId}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-label={
              isOpen
                ? "Hide additional skills"
                : `Show ${hiddenCount} more skills`
            }
            className="candidate-profile-chip candidate-profile-chip--overflow"
            onClick={() => setIsOpen((current) => !current)}
            ref={triggerRef}
            type="button"
          >
            {overflowLabel}
          </button>
        ) : null}
      </div>

      <div className="candidate-profile-chip-measure" ref={measureRef} aria-hidden="true">
        <div className="candidate-profile-chip-list candidate-profile-chip-list--profile">
          {skills.map((skill) => (
            <span
              className="candidate-profile-chip"
              data-profile-skill-measure
              key={`measure-${skill}`}
              title={skill}
            >
              {skill}
            </span>
          ))}

          {Array.from({ length: skills.length }, (_, index) => {
            const count = index + 1;

            return (
              <span
                className="candidate-profile-chip candidate-profile-chip--overflow"
                data-profile-skill-overflow={count}
                key={`measure-overflow-${count}`}
              >
                +{count} more
              </span>
            );
          })}
        </div>
      </div>

      {hiddenCount > 0 && isOpen ? (
        <div
          aria-label="All skills"
          className="candidate-profile-skill-popover candidate-profile-skill-popover--floating"
          id={overflowId}
          ref={panelRef}
          role="dialog"
        >
          <div className="candidate-profile-skill-popover__header">
            <p>Skills</p>
            <button onClick={() => setIsOpen(false)} type="button">
              Show less
            </button>
          </div>
          <div className="candidate-profile-chip-list candidate-profile-chip-list--profile">
            {skills.map((skill) => (
              <span className="candidate-profile-chip" key={`overflow-${skill}`}>
                {skill}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CandidateProfileAvatar({
  onChange,
  profile
}: {
  onChange: (value: CandidateProfilePictureValue | null) => void;
  profile: CandidateProfileState;
}): JSX.Element {
  const initials = buildInitials(profile.firstName, profile.lastName);

  return (
    <ProfileImageUploader
      cropShape="circle"
      editorDescription="Crop and rotate before adding it to your profile."
      editorTitle="Adjust profile picture"
      onChange={onChange}
      outputHeight={720}
      outputWidth={720}
    >
      {({ describedBy, error, feedbackId, helpId, openFileDialog, triggerRef }) => (
        <div className="candidate-profile-avatar">
          <span className="sr-only" id={helpId}>Use a JPG, PNG, or WebP image under 5MB.</span>
          <button
            aria-describedby={describedBy || undefined}
            aria-label={profile.profilePicture ? "Replace profile picture" : "Add profile picture"}
            className="candidate-profile-avatar__button"
            onClick={openFileDialog}
            ref={triggerRef}
            type="button"
          >
            {profile.profilePicture?.dataUrl ? (
              <img alt="" src={profile.profilePicture.dataUrl} />
            ) : (
              <span>{initials}</span>
            )}
            <span className="candidate-profile-avatar__edit" aria-hidden="true">
              <Edit3 />
            </span>
          </button>
          {error ? (
            <p className="candidate-profile-image-error" id={feedbackId} role="status">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </ProfileImageUploader>
  );
}

function CandidateProfileHeader({
  onAvatarChange,
  onCoverChange,
  profile
}: {
  onAvatarChange: (value: CandidateProfilePictureValue | null) => void;
  onCoverChange: (value: CandidateProfilePictureValue | null) => void;
  profile: CandidateProfileState;
}): JSX.Element {
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const jobTitle = profile.currentJobTitle || "Current role not added";
  const location = profile.location?.label || "Location not added";

  return (
    <section className="candidate-profile-hero candidate-profile-hero--social surface-card">
      <ProfileImageUploader
        cropShape="wide"
        editorDescription="Crop and rotate before adding it as your profile cover."
        editorTitle="Adjust cover image"
        onChange={onCoverChange}
        outputHeight={400}
        outputWidth={1600}
      >
        {({ describedBy, error, feedbackId, helpId, openFileDialog, triggerRef }) => (
          <div className="candidate-profile-cover">
            {profile.coverImage?.dataUrl ? <img alt="" src={profile.coverImage.dataUrl} /> : null}
            <span className="sr-only" id={helpId}>Use a wide JPG, PNG, or WebP image under 5MB.</span>
            <button
              aria-describedby={describedBy || undefined}
              className="candidate-profile-cover__edit"
              onClick={openFileDialog}
              ref={triggerRef}
              type="button"
            >
              <Edit3 aria-hidden="true" />
              {profile.coverImage ? "Change cover" : "Add cover"}
            </button>
            {error ? (
              <p className="candidate-profile-cover__error" id={feedbackId} role="status">
                {error}
              </p>
            ) : null}
          </div>
        )}
      </ProfileImageUploader>
      <div className="candidate-profile-hero__identity">
        <CandidateProfileAvatar onChange={onAvatarChange} profile={profile} />
        <div className="candidate-profile-hero__identity-row">
          <div className="candidate-profile-hero__copy">
            <h1>{fullName || "Your profile"}</h1>
            <div className="candidate-profile-hero__meta" aria-label="Profile summary">
              <span>
                <Briefcase aria-hidden="true" />
                {jobTitle}
              </span>
              <span>
                <MapPin aria-hidden="true" />
                {location}
              </span>
            </div>
          </div>
          <p className="candidate-profile-hero__member-since">Member since 12 March 2019</p>
        </div>
      </div>
    </section>
  );
}

function CandidateProfileCompletionPrompt({ profile }: { profile: CandidateProfileState }): JSX.Element {
  const completion = calculateCompletion(profile);
  const missingDetailLabel = completion.missing.length === 1 ? "detail" : "details";

  return (
    <section className="candidate-profile-completion-prompt surface-card" aria-label="Profile completion">
      <div>
        <p className="section-kicker">Profile guidance</p>
        <h2>Complete your profile</h2>
        <p>
          Add a short professional summary and key details so recruiters can understand your fit faster.
        </p>
      </div>
      <div className="candidate-profile-completion-prompt__meta">
        <strong>{completion.percentage}%</strong>
        <span>{completion.missing.length} {missingDetailLabel} missing</span>
        <div
          aria-hidden="true"
          className="candidate-profile-completion__bar"
          style={{ ["--profile-completion" as string]: `${completion.percentage}%` }}
        />
      </div>
    </section>
  );
}

function SkillsEditor({
  onChange,
  value
}: {
  onChange: (skills: string[]) => void;
  value: string[];
}): JSX.Element {
  const inputId = useId();
  const listboxId = `${inputId}-results`;
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const suggestions = useMemo(() => searchSkills(inputValue, value), [inputValue, value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions]);

  const addSkill = (skillValue = inputValue): void => {
    const nextSkill = normalizeSkill(skillValue);

    if (!nextSkill) {
      return;
    }

    if (value.some((skill) => skill.toLowerCase() === nextSkill.toLowerCase())) {
      setError("That skill is already listed.");
      return;
    }

    onChange([...value, nextSkill]);
    setInputValue("");
    setError(null);
    setActiveIndex(0);
  };

  const addInputSkill = (): void => {
    const exactMatch = suggestions.find(
      (suggestion) => suggestion.toLowerCase() === normalizeSkill(inputValue).toLowerCase()
    );

    addSkill(exactMatch ?? inputValue);
  };

  const moveActiveSuggestion = (direction: 1 | -1): void => {
    if (!suggestions.length) {
      return;
    }

    setActiveIndex((current) => {
      const nextIndex = current + direction;

      if (nextIndex < 0) {
        return suggestions.length - 1;
      }

      if (nextIndex >= suggestions.length) {
        return 0;
      }

      return nextIndex;
    });
  };

  return (
    <div className="candidate-profile-chip-editor">
      <div className="candidate-profile-chip-list">
        {value.map((skill) => (
          <span className="candidate-profile-chip" key={skill}>
            {skill}
            <button
              aria-label={`Remove ${skill}`}
              onClick={() => onChange(value.filter((currentSkill) => currentSkill !== skill))}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <div className="candidate-profile-add-row candidate-profile-skill-add-row">
        <div className="candidate-profile-search-picker candidate-profile-skill-picker">
          <input
            aria-activedescendant={
              suggestions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined
            }
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={suggestions.length > 0}
            className="auth-field__input"
            id={inputId}
            onChange={(event) => {
              setInputValue(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addInputSkill();
                return;
              }

              if (event.key === "ArrowDown") {
                event.preventDefault();
                moveActiveSuggestion(1);
                return;
              }

              if (event.key === "ArrowUp") {
                event.preventDefault();
                moveActiveSuggestion(-1);
                return;
              }

              if (event.key === "Escape") {
                setInputValue("");
                setError(null);
              }
            }}
            placeholder="Add a skill"
            role="combobox"
            type="text"
            value={inputValue}
          />
          {inputValue.trim() ? (
            <div
              className="candidate-profile-search-picker__results candidate-profile-skill-picker__results"
              id={listboxId}
              role="listbox"
            >
              {suggestions.length ? (
                suggestions.map((skill, index) => (
                  <button
                    aria-selected={index === activeIndex}
                    className={index === activeIndex ? "is-active" : ""}
                    id={`${listboxId}-option-${index}`}
                    key={skill}
                    onClick={() => addSkill(skill)}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    type="button"
                  >
                    {skill}
                  </button>
                ))
              ) : (
                <p className="candidate-profile-search-picker__empty">
                  Press Enter to add "{normalizeSkill(inputValue)}".
                </p>
              )}
            </div>
          ) : null}
        </div>
        <button className="button button--ghost" onClick={() => addInputSkill()} type="button">
          Add
        </button>
      </div>
      {error ? <p className="auth-field__error">{error}</p> : null}
    </div>
  );
}

function LanguageSearch({
  excludedCodes,
  onSelect
}: {
  excludedCodes: readonly string[];
  onSelect: (language: { code: string; name: string }) => void;
}): JSX.Element {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchLanguages(query, excludedCodes), [excludedCodes, query]);

  return (
    <div className="candidate-profile-search-picker">
      <input
        className="auth-field__input"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search languages"
        type="text"
        value={query}
      />
      <div className="candidate-profile-search-picker__results">
        {results.map((language) => (
          <button
            key={language.code}
            onClick={() => {
              onSelect(language);
              setQuery("");
            }}
            type="button"
          >
            {language.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function LanguagesEditor({
  errors,
  onChange,
  value
}: {
  errors: ValidationErrors;
  onChange: (languages: CandidateLanguageEntry[]) => void;
  value: CandidateLanguageEntry[];
}): JSX.Element {
  const excludedCodes = value.map((language) => language.languageCode);

  return (
    <div className="candidate-profile-language-editor">
      <div className="candidate-profile-language-list">
        {value.map((language) => (
          <div className="candidate-profile-language-row" key={language.id}>
            <div>
              <strong>{language.languageName || "Language needed"}</strong>
              {errors[`language-${language.id}`] ? (
                <span className="auth-field__error">{errors[`language-${language.id}`]}</span>
              ) : null}
            </div>
            <LanguageProficiencySelect
              error={errors[`proficiency-${language.id}`]}
              label="Proficiency"
              onChange={(proficiency) =>
                onChange(
                  value.map((entry) =>
                    entry.id === language.id
                      ? { ...entry, proficiency }
                      : entry
                  )
                )
              }
              value={language.proficiency}
            />
            <button
              aria-label={`Remove ${language.languageName}`}
              className="candidate-profile-icon-button"
              onClick={() => onChange(value.filter((entry) => entry.id !== language.id))}
              type="button"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <LanguageSearch
        excludedCodes={excludedCodes}
        onSelect={(language) =>
          onChange([
            ...value,
            {
              id: `language-${language.code}-${Date.now()}`,
              languageCode: language.code,
              languageName: language.name,
              proficiency: ""
            }
          ])
        }
      />
    </div>
  );
}

function NationalitySelect({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: CandidateNationalityValue | null) => void;
  value: CandidateNationalityValue | null;
}): JSX.Element {
  const fieldId = useId();
  const listboxId = `${fieldId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const results = useMemo(() => searchNationalities(query, 12), [query]);
  const selectedIndex = results.findIndex((option) => option.countryCode === value?.countryCode);
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const activeDescendantId =
    isOpen && results[activeIndex] ? `${fieldId}-option-${results[activeIndex].countryCode}` : undefined;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [isOpen, results, selectedIndex]);

  const closePanel = (): void => {
    setIsOpen(false);
    setQuery("");
  };

  const openPanel = (): void => {
    setIsOpen(true);
    window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);
  };

  const commitOption = (option: NationalityOption): void => {
    onChange({
      countryCode: option.countryCode,
      flag: option.flag,
      nationality: option.nationality
    });
    closePanel();
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPanel();
      return;
    }

    if (event.key === "Escape") {
      closePanel();
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => {
        if (!results.length) {
          return -1;
        }

        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = current + direction;

        if (nextIndex < 0) {
          return results.length - 1;
        }

        if (nextIndex >= results.length) {
          return 0;
        }

        return nextIndex;
      });
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      window.setTimeout(() => triggerRef.current?.focus(), 0);
      return;
    }

    if (event.key === "Enter") {
      const activeOption = results[activeIndex];

      if (isOpen && activeOption) {
        event.preventDefault();
        commitOption(activeOption);
      }
    }
  };

  return (
    <div
      className="auth-field application-location-field candidate-profile-nationality-field"
      data-country-panel-open={isOpen ? "true" : "false"}
      onBlur={(event) => {
        const nextFocusedTarget = event.relatedTarget;

        if (nextFocusedTarget instanceof Node && rootRef.current?.contains(nextFocusedTarget)) {
          return;
        }

        closePanel();
      }}
      ref={rootRef}
    >
      <div className="application-location-field__label-row">
        <label className="auth-field__label" htmlFor={fieldId}>
          {label}
        </label>
      </div>
      <div className="application-location-field__control" data-picker-open={isOpen ? "country" : "closed"}>
        <button
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="auth-field__input application-location-field__input candidate-profile-nationality-field__input candidate-profile-nationality-field__trigger"
          data-placeholder={!value ? "true" : "false"}
          id={fieldId}
          onClick={openPanel}
          onKeyDown={handleTriggerKeyDown}
          ref={triggerRef}
          role="combobox"
          type="button"
        >
          <span className="candidate-profile-nationality-field__selected">
            {value ? `${value.flag} ${value.nationality}` : `Select ${label.toLowerCase()}`}
          </span>
        </button>

        {value ? (
          <button
            aria-label={`Clear ${label.toLowerCase()}`}
            className="candidate-profile-nationality-field__clear"
            onClick={() => {
              onChange(null);
              setQuery("");
              setIsOpen(false);
              window.setTimeout(() => triggerRef.current?.focus(), 0);
            }}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        ) : null}

        <button
          aria-label={`${value ? `Selected ${value.nationality}` : `Choose ${label.toLowerCase()}`}`}
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className="application-location-field__country-trigger"
          onClick={() => {
            const nextOpenState = !isOpen;
            setQuery("");

            if (nextOpenState) {
              openPanel();
            } else {
              closePanel();
              window.setTimeout(() => triggerRef.current?.focus(), 0);
            }
          }}
          type="button"
        >
          <span aria-hidden="true" className="application-location-field__country-flag">
            {value?.flag ?? "🌐"}
          </span>
        </button>

        {isOpen ? (
          <div
            aria-label={`Choose ${label.toLowerCase()}`}
            className="application-location-field__panel application-location-field__panel--countries"
            data-panel-state={results.length > 0 ? "results" : "empty"}
            role="dialog"
          >
            <input
              aria-activedescendant={activeDescendantId}
              aria-controls={listboxId}
              aria-expanded={isOpen}
              autoComplete="off"
              className="auth-field__input application-location-field__country-search"
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={`Search ${label.toLowerCase()}`}
              ref={searchInputRef}
              role="combobox"
              type="text"
              value={query}
            />

            {results.length > 0 ? (
              <ul
                className="application-location-field__results application-location-field__results--countries"
                id={listboxId}
                role="listbox"
              >
                {results.map((option, index) => (
                  <li
                    aria-selected={option.countryCode === value?.countryCode}
                    className="application-location-field__result application-location-field__result--country"
                    data-active={index === activeIndex ? "true" : "false"}
                    data-selected={option.countryCode === value?.countryCode ? "true" : "false"}
                    id={`${fieldId}-option-${option.countryCode}`}
                    key={option.countryCode}
                    onClick={() => commitOption(option)}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                    tabIndex={-1}
                  >
                    <div className="application-location-field__result-copy">
                      <strong>{option.nationality}</strong>
                      <span>{option.countryName}</span>
                    </div>
                    <span aria-hidden="true" className="application-location-field__result-flag">
                      {option.flag}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="application-location-field__empty-state">
                <strong>No nationality matches found</strong>
                <span>Try a different country or nationality name.</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MoneyInput({
  amountError,
  currencyError,
  helper,
  label,
  onChange,
  suffixLabel = "per month",
  tone = "default",
  value
}: {
  amountError?: string;
  currencyError?: string;
  helper?: string;
  label: string;
  onChange: (value: CandidateMoneyValue) => void;
  suffixLabel?: string;
  tone?: "default" | "emphasis";
  value: CandidateMoneyValue;
}): JSX.Element {
  const currencyControlRef = useRef<HTMLDivElement | null>(null);
  const [currencyQuery, setCurrencyQuery] = useState("");
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const currencies = useMemo(() => searchCurrencies(currencyQuery, 8), [currencyQuery]);
  const selectedCurrencyCode = value.currencyCode || "ZAR";
  const hasError = Boolean(amountError || currencyError);

  return (
    <div className={`candidate-profile-money candidate-profile-money--${tone}`}>
      <div className="candidate-profile-money__heading">
        <span className="auth-field__label">{label}</span>
        {helper ? <span className="candidate-profile-money__helper">{helper}</span> : null}
      </div>
      <div className="candidate-profile-money__control" data-error={hasError || undefined}>
        <div
          className="candidate-profile-money__currency"
          onBlur={(event) => {
            if (!currencyControlRef.current?.contains(event.relatedTarget)) {
              setIsCurrencyOpen(false);
              setCurrencyQuery("");
            }
          }}
          ref={currencyControlRef}
        >
          <span className="candidate-profile-money__currency-code">{selectedCurrencyCode}</span>
          <input
            aria-label={`${label} currency`}
            className="candidate-profile-money__currency-search"
            onChange={(event) => {
              setCurrencyQuery(event.target.value.toUpperCase());
              setIsCurrencyOpen(true);
            }}
            onFocus={() => setIsCurrencyOpen(true)}
            placeholder="Change"
            value={currencyQuery}
          />
          {isCurrencyOpen ? (
            <div className="candidate-profile-money__currency-results">
              {currencies.map((currency) => (
                <button
                  key={currency.code}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange({ ...value, currencyCode: currency.code });
                    setCurrencyQuery("");
                    setIsCurrencyOpen(false);
                  }}
                  type="button"
                >
                  {currency.code}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <input
          aria-label={`${label} amount`}
          className={["candidate-profile-money__amount", amountError ? "auth-field__input--error" : ""]
            .filter(Boolean)
            .join(" ")}
          inputMode="decimal"
          onChange={(event) => onChange({ ...value, amount: event.target.value })}
          placeholder="75,000"
          value={value.amount}
        />
        {suffixLabel ? <span className="candidate-profile-money__suffix">{suffixLabel}</span> : null}
      </div>
      {amountError || currencyError ? (
        <span className="auth-field__error">{amountError ?? currencyError}</span>
      ) : null}
    </div>
  );
}

function YesNoControl({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: boolean | null) => void;
  value: boolean | null;
}): JSX.Element {
  return (
    <div className="candidate-profile-segment">
      <span className="auth-field__label">{label}</span>
      <div className="candidate-profile-segment__buttons">
        {[
          { label: "Yes", value: true },
          { label: "No", value: false }
        ].map((option) => (
          <button
            className={value === option.value ? "is-selected" : ""}
            key={option.label}
            onClick={() => onChange(value === option.value ? null : option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }): JSX.Element {
  return <p className="candidate-profile-empty">{children}</p>;
}

function ProfileDialogPortal({ children }: { children: ReactNode }): JSX.Element {
  return createPortal(children, document.body);
}

function getProfileResumeFileCategory(index: number): CandidateFileCategory {
  return index === 0 ? "CV / Resume" : "Other";
}

function buildProfileFilesFromResumeState(resumeState: CandidateResumeState): CandidateProfileFile[] {
  return resumeState.resumes.map((resume, index) => ({
    id: `profile-file-${resume.id}`,
    category: getProfileResumeFileCategory(index),
    fileName: resume.fileName,
    fileSize: resume.fileSize,
    fileExtension: resume.fileExtension.toUpperCase(),
    uploadedAt: resume.uploadedAt,
    source: "resume",
    resumeRecord: resume
  }));
}

function ProfileResumeFilesSection({
  onChange,
  session
}: {
  onChange: (files: CandidateProfileFile[]) => void;
  session: CandidateSession;
}): JSX.Element {
  const [resumeState, setResumeState] = useState<CandidateResumeState>(() =>
    readOrCreatePrototypeResumeState(session)
  );

  useEffect(() => {
    setResumeState(readOrCreatePrototypeResumeState(session));
  }, [session]);

  const handleResumeStateChange = (nextState: CandidateResumeState): void => {
    setResumeState(nextState);
    savePrototypeResumeState(session.email, nextState);
    onChange(buildProfileFilesFromResumeState(nextState));
  };

  return (
    <ResumeUploadSection
      heading="Files"
      job={referenceJobView}
      kicker="Candidate profile"
      lead="Manage your resume files and keep the version recruiters see up to date."
      onContinue={() => undefined}
      onResumeStateChange={handleResumeStateChange}
      resumeState={resumeState}
      session={session}
      showBackAction={false}
      showCompanyHeading={false}
      showContinueAction={false}
      showContinueWhenEmpty={false}
      variant="application"
    />
  );
}

function ProfileFilesSection({
  onChange,
  profile,
  session
}: {
  onChange: (files: CandidateProfileFile[]) => void;
  profile: CandidateProfileState;
  session: CandidateSession;
}): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewFile, setPreviewFile] = useState<{ file: CandidateProfileFile; objectUrl: string } | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deleteTitleId = useId();
  const deleteDescriptionId = useId();
  const deleteFile = deleteFileId
    ? profile.files.find((candidateFile) => candidateFile.id === deleteFileId) ?? null
    : null;

  useEffect(() => {
    return () => {
      if (previewFile?.objectUrl) {
        URL.revokeObjectURL(previewFile.objectUrl);
      }
    };
  }, [previewFile]);

  useEffect(() => {
    if (!deleteFileId && !previewFile) {
      return;
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      if (previewFile?.objectUrl) {
        URL.revokeObjectURL(previewFile.objectUrl);
        setPreviewFile(null);
      }

      setDeleteFileId(null);
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteFileId, previewFile]);

  const openPreview = async (file: CandidateProfileFile): Promise<void> => {
    let asset: File | null = null;

    if (file.source === "profile-upload") {
      asset = await readPrototypeProfileAsset(session.email, file.id);
    } else if (file.resumeRecord) {
      asset = await readPrototypeResumeAsset(session.email, file.resumeRecord.id);
    }

    if (!asset) {
      setError("Preview is available for uploaded files only in this prototype.");
      return;
    }

    setPreviewFile({ file, objectUrl: URL.createObjectURL(asset) });
  };

  const downloadFile = async (file: CandidateProfileFile): Promise<void> => {
    let asset: File | null = null;

    if (file.source === "profile-upload") {
      asset = await readPrototypeProfileAsset(session.email, file.id);
    } else if (file.resumeRecord) {
      asset = await readPrototypeResumeAsset(session.email, file.resumeRecord.id);
    }

    const blob = asset ?? new Blob([`Prototype file: ${file.fileName}`], { type: "text/plain" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.fileName;
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (file.size > PROFILE_FILE_MAX_SIZE_BYTES) {
      setError("Files can be up to 5MB.");
      return;
    }

    const record = buildProfileUploadFile(file, "Other");
    await savePrototypeProfileAsset(session.email, record.id, file);
    onChange([record, ...profile.files]);
    setError(null);
  };

  const startRename = (file: CandidateProfileFile): void => {
    setRenamingFileId(file.id);
    setRenameValue(file.fileName.slice(0, PROFILE_FILE_NAME_MAX_LENGTH));
    setRenameError(null);
  };

  const cancelRename = (): void => {
    setRenamingFileId(null);
    setRenameValue("");
    setRenameError(null);
  };

  const saveRename = (): void => {
    if (!renamingFileId) {
      return;
    }

    const nextFileName = renameValue.trim().replace(/\s+/g, " ");

    if (!nextFileName) {
      setRenameError("Add a file name.");
      return;
    }

    if (nextFileName.length > PROFILE_FILE_NAME_MAX_LENGTH) {
      setRenameError(`File names can be up to ${PROFILE_FILE_NAME_MAX_LENGTH} characters.`);
      return;
    }

    onChange(
      profile.files.map((file) =>
        file.id === renamingFileId
          ? {
              ...file,
              fileName: nextFileName,
              fileExtension: getFileExtensionFromName(nextFileName, file.fileExtension)
            }
          : file
      )
    );
    cancelRename();
  };

  const confirmedDelete = async (): Promise<void> => {
    if (!deleteFileId) {
      return;
    }

    const file = profile.files.find((candidateFile) => candidateFile.id === deleteFileId);
    if (file?.source === "profile-upload") {
      await deletePrototypeProfileAsset(session.email, file.id);
    }

    onChange(profile.files.filter((candidateFile) => candidateFile.id !== deleteFileId));
    setDeleteFileId(null);
  };

  return (
    <section
      aria-labelledby="profile-section-files"
      className="candidate-profile-section surface-card"
      id="files"
    >
      <header className="candidate-profile-section__header">
        <div>
          <h2 id="profile-section-files">Files</h2>
          <p>Manage your files and keep your resume up to date.</p>
        </div>
        <div className="candidate-profile-section__actions">
          <input
            accept={PROFILE_FILE_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              void handleUpload(event);
            }}
            ref={fileInputRef}
            type="file"
          />
          <button
            className="button button--job-primary candidate-profile-files__upload-button"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload aria-hidden="true" />
            Upload file
          </button>
        </div>
      </header>
      <div className="candidate-profile-files">
        {error ? <p className="auth-field__error">{error}</p> : null}
        <div className="candidate-profile-file-list">
          {profile.files.length ? (
            profile.files.map((file) => {
              const isRenaming = renamingFileId === file.id;

              return (
                <article className="candidate-profile-file" key={file.id}>
                  <span className="candidate-profile-file__icon">
                    <FileText aria-hidden="true" />
                    <span>{file.fileExtension}</span>
                  </span>
                  <div className="candidate-profile-file__details">
                    {isRenaming ? (
                      <label className="candidate-profile-file__rename">
                        <span className="sr-only">Rename {file.fileName}</span>
                        <input
                          aria-describedby={renameError ? `rename-error-${file.id}` : undefined}
                          aria-invalid={Boolean(renameError)}
                          autoFocus
                          maxLength={PROFILE_FILE_NAME_MAX_LENGTH}
                          onChange={(event) => {
                            setRenameValue(event.target.value);
                            setRenameError(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              saveRename();
                            }

                            if (event.key === "Escape") {
                              cancelRename();
                            }
                          }}
                          value={renameValue}
                        />
                        <span className="candidate-profile-file__rename-count">
                          {renameValue.length}/{PROFILE_FILE_NAME_MAX_LENGTH}
                        </span>
                        {renameError ? (
                          <span className="auth-field__error" id={`rename-error-${file.id}`}>
                            {renameError}
                          </span>
                        ) : null}
                      </label>
                    ) : (
                      <>
                        <strong className="candidate-profile-file__name" title={file.fileName}>
                          {file.fileName}
                        </strong>
                        <span className="candidate-profile-file__meta">
                          {file.fileExtension} · {formatFileSize(file.fileSize)} · Uploaded{" "}
                          {formatFileUploadedDate(file.uploadedAt)}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="candidate-profile-file__actions">
                    {isRenaming ? (
                      <>
                        <button
                          aria-label={`Save new name for ${file.fileName}`}
                          onClick={saveRename}
                          type="button"
                        >
                          <Check aria-hidden="true" />
                        </button>
                        <button
                          aria-label={`Cancel renaming ${file.fileName}`}
                          onClick={cancelRename}
                          type="button"
                        >
                          <X aria-hidden="true" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          aria-label={`Preview ${file.fileName}`}
                          className="candidate-profile-file__preview-action"
                          onClick={() => {
                            void openPreview(file);
                          }}
                          type="button"
                        >
                          <Eye aria-hidden="true" />
                          Preview
                        </button>
                        <button
                          aria-label={`Rename ${file.fileName}`}
                          onClick={() => startRename(file)}
                          type="button"
                        >
                          <Edit3 aria-hidden="true" />
                        </button>
                        <button
                          aria-label={`Download ${file.fileName}`}
                          onClick={() => {
                            void downloadFile(file);
                          }}
                          type="button"
                        >
                          <Download aria-hidden="true" />
                        </button>
                        <button
                          aria-label={`Delete ${file.fileName}`}
                          className="candidate-profile-file__delete-action"
                          onClick={() => setDeleteFileId(file.id)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <EmptyState>Upload your resume or supporting files so recruiters can review them when needed.</EmptyState>
          )}
        </div>
      </div>
      {deleteFile ? (
        <ProfileDialogPortal>
          <div
            aria-describedby={deleteDescriptionId}
            aria-labelledby={deleteTitleId}
            className="candidate-profile-dialog"
            role="dialog"
            aria-modal="true"
          >
            <div className="candidate-profile-dialog__panel candidate-profile-dialog__panel--danger">
              <div className="candidate-profile-dialog__danger-header">
                <span className="candidate-profile-dialog__danger-mark">
                  <Trash2 aria-hidden="true" />
                </span>
                <div>
                  <h3 id={deleteTitleId}>Delete file?</h3>
                  <p id={deleteDescriptionId}>
                    This will remove the file from your profile. You can upload it again later if needed.
                  </p>
                </div>
              </div>
              <div className="candidate-profile-dialog__file-summary">
                <FileText aria-hidden="true" />
                <div>
                  <strong>{deleteFile.fileName}</strong>
                  <span>
                    {formatFileSize(deleteFile.fileSize)} · {deleteFile.fileExtension}
                  </span>
                </div>
              </div>
              <div className="candidate-profile-dialog__actions">
                <button
                  autoFocus
                  className="button button--ghost"
                  onClick={() => setDeleteFileId(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="button candidate-profile-dialog__danger-button"
                  onClick={() => {
                    void confirmedDelete();
                  }}
                  type="button"
                >
                  Delete file
                </button>
              </div>
            </div>
          </div>
        </ProfileDialogPortal>
      ) : null}
      {previewFile ? (
        <ProfileDialogPortal>
          <div className="candidate-profile-dialog candidate-profile-dialog--preview" role="dialog" aria-modal="true">
            <div className="candidate-profile-dialog__panel candidate-profile-dialog__panel--preview">
              <header>
                <h3>{previewFile.file.fileName}</h3>
                <button
                  aria-label="Close preview"
                  onClick={() => {
                    URL.revokeObjectURL(previewFile.objectUrl);
                    setPreviewFile(null);
                  }}
                  type="button"
                >
                  <X aria-hidden="true" />
                </button>
              </header>
              {previewFile.file.mimeType?.startsWith("image/") ? (
                <img alt="" src={previewFile.objectUrl} />
              ) : previewFile.file.mimeType === "application/pdf" ? (
                <iframe src={buildPdfPreviewUrl(previewFile.objectUrl)} title={previewFile.file.fileName} />
              ) : (
                <p className="candidate-profile-dialog__preview-empty">
                  Preview is not available for this file.
                </p>
              )}
            </div>
          </div>
        </ProfileDialogPortal>
      ) : null}
    </section>
  );
}

function ProfileGuard(): JSX.Element {
  return (
    <div className="candidate-profile-page" data-profile-background="current">
      <section className="candidate-profile-guard surface-card">
        <p className="section-kicker">Candidate profile</p>
        <h1>Sign in to view your profile</h1>
        <p>Your profile is private. Sign in to review your details, experience, and application information.</p>
        <div className="application-step__guard-actions">
          <TransitionLink
            className="button button--job-primary"
            href={buildGlobalAuthPath("signin", { next: buildCandidateProfilePath() })}
            source="profile-signin"
          >
            Sign in
          </TransitionLink>
          <TransitionLink
            className="button button--ghost"
            href={buildJobSearchPath()}
            source="profile-search-jobs"
          >
            Search jobs
          </TransitionLink>
        </div>
      </section>
    </div>
  );
}

function CandidateProfileSettingsTab({ email }: { email: string }): JSX.Element {
  const passwordPanelId = useId();
  const closeAccountPanelId = useId();
  const closeProgressFrameRef = useRef<number | null>(null);
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [closeValues, setCloseValues] = useState({
    password: "",
    confirmationPhrase: ""
  });
  const [closeErrors, setCloseErrors] = useState<Record<string, string>>({});
  const [isCloseConfirmationVisible, setIsCloseConfirmationVisible] = useState(false);
  const [isClosingAccount, setIsClosingAccount] = useState(false);
  const [closeAccountModalState, setCloseAccountModalState] = useState<"confirming" | "closing" | "closed">(
    "confirming"
  );
  const [closeAccountProgress, setCloseAccountProgress] = useState(0);
  const [openSettingsPanel, setOpenSettingsPanel] = useState<"password" | "close-account" | null>(null);
  const emailAddress = email.trim();
  const isPasswordPanelOpen = openSettingsPanel === "password";
  const isCloseAccountPanelOpen = openSettingsPanel === "close-account";

  useEffect(() => {
    return () => {
      if (closeProgressFrameRef.current !== null) {
        window.cancelAnimationFrame(closeProgressFrameRef.current);
      }
    };
  }, []);

  const updatePasswordValue = (field: keyof typeof passwordValues, value: string): void => {
    setPasswordValues((current) => ({ ...current, [field]: value }));
    setPasswordErrors((current) => ({ ...current, [field]: "" }));
    setPasswordSuccess("");
  };

  const updateCloseValue = (field: keyof typeof closeValues, value: string): void => {
    setCloseValues((current) => ({ ...current, [field]: value }));
    setCloseErrors((current) => ({ ...current, [field]: "" }));
    setIsCloseConfirmationVisible(false);
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};

    if (!passwordValues.currentPassword.trim()) {
      nextErrors.currentPassword = "Enter your current password.";
    }

    if (!passwordValues.newPassword) {
      nextErrors.newPassword = "Enter a new password.";
    } else if (passwordValues.newPassword.length < 8) {
      nextErrors.newPassword = "Use at least 8 characters.";
    } else if (passwordValues.currentPassword && passwordValues.newPassword === passwordValues.currentPassword) {
      nextErrors.newPassword = "Your new password must be different from your current password.";
    }

    if (!passwordValues.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your new password.";
    } else if (passwordValues.confirmPassword !== passwordValues.newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setPasswordErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setPasswordSuccess("");
      return;
    }

    // TODO: validate and persist password changes through backend auth when it exists.
    setPasswordValues({
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    });
    setPasswordSuccess("Your password has been updated.");
  };

  const handleSignOut = (): void => {
    clearPrototypeSession();
    navigateTo("/", { replace: true });
  };

  const toggleSettingsPanel = (panel: "password" | "close-account"): void => {
    setOpenSettingsPanel((current) => (current === panel ? null : panel));

    if (panel !== "close-account") {
      setIsCloseConfirmationVisible(false);
    }
  };

  const handleCloseAccountSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};

    if (!closeValues.password.trim()) {
      nextErrors.password = "Enter your password.";
    }

    if (closeValues.confirmationPhrase !== "CLOSE") {
      nextErrors.confirmationPhrase = "Type CLOSE to confirm.";
    }

    setCloseErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setIsCloseConfirmationVisible(false);
      return;
    }

    setCloseAccountModalState("confirming");
    setCloseAccountProgress(0);
    setIsCloseConfirmationVisible(true);
  };

  const handleCloseAccountConfirmed = async (): Promise<void> => {
    if (!emailAddress || isClosingAccount) {
      return;
    }

    if (closeProgressFrameRef.current !== null) {
      window.cancelAnimationFrame(closeProgressFrameRef.current);
      closeProgressFrameRef.current = null;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduceMotion ? 120 : 1500;
    const startedAt = window.performance.now();
    let isAccountCleared = false;
    let isProgressComplete = false;

    setIsClosingAccount(true);
    setCloseAccountModalState("closing");
    setCloseAccountProgress(0);

    const finishIfReady = (): void => {
      if (!isAccountCleared || !isProgressComplete) {
        return;
      }

      setCloseAccountProgress(100);
      setCloseAccountModalState("closed");
      setIsClosingAccount(false);
    };

    void clearPrototypeAccountData(emailAddress)
      .catch(() => undefined)
      .then(() => {
        isAccountCleared = true;
        finishIfReady();
      });

    const animateProgress = (timestamp: number): void => {
      const progress = Math.min(100, Math.round(((timestamp - startedAt) / duration) * 100));
      setCloseAccountProgress(progress);

      if (progress >= 100) {
        isProgressComplete = true;
        finishIfReady();
        return;
      }

      closeProgressFrameRef.current = window.requestAnimationFrame(animateProgress);
    };

    closeProgressFrameRef.current = window.requestAnimationFrame(animateProgress);
  };

  const closeAccountSuccessAndGoHome = (): void => {
    navigateTo("/", { replace: true });
  };

  const closeAccountProgressStyle = {
    "--close-account-progress": `${closeAccountProgress}%`
  } as CSSProperties;

  return (
    <section className="candidate-profile-section candidate-profile-section--settings surface-card">
      <div className="candidate-profile-settings">
        <div className="candidate-profile-settings__header">
          <p className="section-kicker">Account settings</p>
          <h2>Profile settings</h2>
        </div>

        <section className="candidate-profile-settings-card">
          <div>
            <h3>Email address</h3>
            <p>This email address is used to sign in to your Ditto profile.</p>
          </div>
          <div className="candidate-profile-settings-readonly-value">
            {emailAddress || "No email address available"}
          </div>
        </section>

        <section className="candidate-profile-settings-card candidate-profile-settings-card--disclosure">
          <button
            aria-controls={passwordPanelId}
            aria-expanded={isPasswordPanelOpen}
            className="candidate-profile-settings-disclosure"
            onClick={() => toggleSettingsPanel("password")}
            type="button"
          >
            <span>
              <strong>Change password</strong>
              <small>Update the password used to sign in to your Ditto profile.</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </button>

          {isPasswordPanelOpen ? (
            <form
              className="candidate-profile-settings-form"
              id={passwordPanelId}
              onSubmit={handlePasswordSubmit}
            >
              <div className="candidate-profile-settings-form__password-row">
                <AuthPasswordField
                  autoComplete="current-password"
                  error={passwordErrors.currentPassword}
                  label="Current password"
                  name="currentPassword"
                  onChange={(value) => updatePasswordValue("currentPassword", value)}
                  value={passwordValues.currentPassword}
                />
              </div>
              <div className="candidate-profile-settings-form__password-row">
                <AuthPasswordField
                  autoComplete="new-password"
                  error={passwordErrors.newPassword}
                  label="New password"
                  name="newPassword"
                  onChange={(value) => updatePasswordValue("newPassword", value)}
                  value={passwordValues.newPassword}
                />
                <AuthPasswordField
                  autoComplete="new-password"
                  error={passwordErrors.confirmPassword}
                  label="Confirm new password"
                  name="confirmPassword"
                  onChange={(value) => updatePasswordValue("confirmPassword", value)}
                  value={passwordValues.confirmPassword}
                />
              </div>
              <div className="candidate-profile-settings-form__footer">
                {passwordSuccess ? (
                  <p className="candidate-profile-settings-success" role="status">
                    {passwordSuccess}
                  </p>
                ) : null}
                <button className="button button--primary" type="submit">
                  Update password
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <section className="candidate-profile-settings-card candidate-profile-settings-card--action-row">
          <div>
            <h3>Sign out</h3>
            <p>Sign out of this browser session.</p>
          </div>
          <div className="candidate-profile-settings-actions">
            <button className="button button--ghost" onClick={handleSignOut} type="button">
              Sign out
            </button>
          </div>
        </section>

        <section className="candidate-profile-settings-card candidate-profile-settings-card--danger candidate-profile-settings-card--disclosure">
          <button
            aria-controls={closeAccountPanelId}
            aria-expanded={isCloseAccountPanelOpen}
            className="candidate-profile-settings-disclosure candidate-profile-settings-disclosure--danger"
            onClick={() => toggleSettingsPanel("close-account")}
            type="button"
          >
            <span>
              <strong>Close account</strong>
              <small>Permanently close your Ditto profile.</small>
            </span>
            <ChevronDown aria-hidden="true" />
          </button>

          {isCloseAccountPanelOpen ? (
            <div className="candidate-profile-settings-disclosure-panel" id={closeAccountPanelId}>
              <div className="candidate-profile-settings-danger-copy">
                <p>
                  This will permanently close your Ditto profile and remove your saved profile data.
                </p>
                <p className="candidate-profile-settings-warning">This action cannot be undone.</p>
              </div>
              <form className="candidate-profile-settings-form" onSubmit={handleCloseAccountSubmit}>
                <div className="candidate-profile-settings-form__password-row">
                  <AuthPasswordField
                    autoComplete="current-password"
                    error={closeErrors.password}
                    label="Password"
                    name="closeAccountPassword"
                    onChange={(value) => updateCloseValue("password", value)}
                    value={closeValues.password}
                  />
                  <TextField
                    error={closeErrors.confirmationPhrase}
                    label="Type CLOSE to confirm"
                    onChange={(value) => updateCloseValue("confirmationPhrase", value)}
                    value={closeValues.confirmationPhrase}
                  />
                </div>
                <div className="candidate-profile-settings-form__footer">
                  <button className="button button--destructive" type="submit">
                    Close account
                  </button>
                </div>
              </form>

            </div>
          ) : null}
        </section>
      </div>
      {isCloseConfirmationVisible ? (
        <ProfileDialogPortal>
          <div
            aria-describedby="close-account-confirm-description"
            aria-labelledby="close-account-confirm-title"
            aria-modal="true"
            className="candidate-profile-dialog"
            role="dialog"
          >
            <div className="candidate-profile-dialog__panel candidate-profile-dialog__panel--danger candidate-profile-dialog__panel--centered">
              {closeAccountModalState === "closing" ? (
                <div
                  aria-label={`Closing account ${closeAccountProgress}% complete`}
                  className="candidate-profile-dialog__progress"
                  role="status"
                  style={closeAccountProgressStyle}
                >
                  <span className="candidate-profile-dialog__progress-ring" />
                  <span className="candidate-profile-dialog__danger-mark candidate-profile-dialog__danger-mark--centered candidate-profile-dialog__danger-mark--progress">
                    <AlertTriangle aria-hidden="true" />
                  </span>
                </div>
              ) : (
                <span
                  className={`candidate-profile-dialog__danger-mark candidate-profile-dialog__danger-mark--centered${
                    closeAccountModalState === "closed" ? " candidate-profile-dialog__danger-mark--success" : ""
                  }`}
                >
                  {closeAccountModalState === "closed" ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <AlertTriangle aria-hidden="true" />
                  )}
                </span>
              )}
              <div className="candidate-profile-dialog__center-copy">
                <h3 id="close-account-confirm-title">
                  {closeAccountModalState === "closed"
                    ? "Your account has been closed."
                    : closeAccountModalState === "closing"
                      ? "Closing your account..."
                      : "Close your account?"}
                </h3>
                <p id="close-account-confirm-description">
                  {closeAccountModalState === "closed"
                    ? "Your Ditto profile and saved application data have been removed from this browser prototype."
                    : closeAccountModalState === "closing"
                      ? "Removing your profile and saved application data from this browser prototype."
                      : "Are you sure you want to close your account? Your profile and saved application data will be removed. This cannot be undone."}
                </p>
                {closeAccountModalState === "closing" ? (
                  <span className="candidate-profile-dialog__progress-label">{closeAccountProgress}%</span>
                ) : null}
              </div>
              <div className="candidate-profile-dialog__actions candidate-profile-dialog__actions--centered">
                {closeAccountModalState === "confirming" ? (
                  <>
                    <button
                      autoFocus
                      className="button button--ghost"
                      onClick={() => {
                        setIsCloseConfirmationVisible(false);
                        setCloseAccountProgress(0);
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="button button--destructive"
                      disabled={isClosingAccount}
                      onClick={() => {
                        void handleCloseAccountConfirmed();
                      }}
                      type="button"
                    >
                      Yes, close my account
                    </button>
                  </>
                ) : closeAccountModalState === "closed" ? (
                  <button
                    autoFocus
                    className="button button--primary"
                    onClick={closeAccountSuccessAndGoHome}
                    type="button"
                  >
                    Confirm
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </ProfileDialogPortal>
      ) : null}
    </section>
  );
}

interface CandidateProfilePageProps {
  initialTab?: ProfileTabId;
}

export function CandidateProfilePage({
  initialTab = "about"
}: CandidateProfilePageProps): JSX.Element {
  const session = useMemo(() => readPrototypeSession(), []);
  const [profile, setProfile] = useState<CandidateProfileState | null>(() =>
    session ? buildPrototypeCandidateProfile(session) : null
  );
  const [draftProfile, setDraftProfile] = useState<CandidateProfileState | null>(profile);
  const [editingSection, setEditingSection] = useState<ProfileSectionId | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTabId>(initialTab);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [savedSection, setSavedSection] = useState<ProfileSectionId | null>(null);
  const savedTimeoutRef = useRef<number | null>(null);
  const profileTabsRef = useRef<HTMLElement | null>(null);
  const shouldAlignProfileTabsRef = useRef(false);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current !== null) {
        window.clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setActiveTab(initialTab);
    setEditingSection(null);
    setErrors({});
  }, [initialTab]);

  useEffect(() => {
    if (!shouldAlignProfileTabsRef.current && !consumeProfileTabScrollPending()) {
      return;
    }

    shouldAlignProfileTabsRef.current = false;
    scrollProfileTabsToTop();
  }, [activeTab]);

  if (!session || !profile || !draftProfile) {
    return <ProfileGuard />;
  }

  const isDirty = JSON.stringify(profile) !== JSON.stringify(draftProfile);
  const displayProfile = editingSection ? draftProfile : profile;
  const activeTabMeta = PROFILE_TABS.find((tab) => tab.id === activeTab) ?? PROFILE_TABS[0];

  const beginEdit = (sectionId: ProfileSectionId): void => {
    setDraftProfile(profile);
    setEditingSection(sectionId);
    setErrors({});
  };

  const cancelEdit = (): void => {
    setDraftProfile(profile);
    setEditingSection(null);
    setErrors({});
  };

  const saveSection = (sectionId: ProfileSectionId): void => {
    const profileToSave =
      sectionId === "contact"
        ? {
            ...draftProfile,
            email: profile.email
          }
        : draftProfile;
    const nextErrors = validateProfileSection(sectionId, profileToSave);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const nextProfile = {
      ...profileToSave,
      updatedAt: new Date().toISOString()
    };
    savePrototypeCandidateProfile(session, nextProfile);
    setProfile(nextProfile);
    setDraftProfile(nextProfile);
    setEditingSection(null);
    setSavedSection(sectionId);

    if (savedTimeoutRef.current !== null) {
      window.clearTimeout(savedTimeoutRef.current);
    }

    savedTimeoutRef.current = window.setTimeout(() => setSavedSection(null), 2000);
  };

  const updateDraft = (updater: (current: CandidateProfileState) => CandidateProfileState): void => {
    setDraftProfile((current) => (current ? updater(current) : current));
  };

  const updateImmediate = (updater: (current: CandidateProfileState) => CandidateProfileState): void => {
    const nextProfile = updater(profile);
    savePrototypeCandidateProfile(session, nextProfile);
    setProfile(nextProfile);
    setDraftProfile(nextProfile);
  };

  const scrollProfileTabsToTop = (): void => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const tabs = profileTabsRef.current;

        if (!tabs) {
          return;
        }

        tabs.scrollIntoView({
          block: "start",
          inline: "nearest",
          behavior: "auto"
        });
      });
    });
  };

  const navigateToProfileTab = (tabId: ProfileTabId): void => {
    shouldAlignProfileTabsRef.current = true;
    markProfileTabScrollPending();
    navigateTo(buildCandidateProfilePath(tabId));
    setEditingSection(null);
    setErrors({});

    if (tabId === activeTab) {
      shouldAlignProfileTabsRef.current = false;
      scrollProfileTabsToTop();
    }
  };

  return (
    <div className="candidate-profile-page" data-profile-background="current">
      <div className="candidate-profile-shell">
        <CandidateProfileHeader
          onAvatarChange={(profilePicture) =>
            updateImmediate((current) => ({
              ...current,
              profilePicture,
              updatedAt: new Date().toISOString()
            }))
          }
          onCoverChange={(coverImage) =>
            updateImmediate((current) => ({
              ...current,
              coverImage,
              updatedAt: new Date().toISOString()
            }))
          }
          profile={profile}
        />

        <nav
          className="candidate-profile-tabs surface-card"
          aria-label="Candidate profile sections"
          ref={profileTabsRef}
          role="tablist"
        >
          {PROFILE_TABS.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "is-active" : ""}
              key={tab.id}
              onClick={() => {
                navigateToProfileTab(tab.id);
              }}
              role="tab"
              type="button"
            >
              <span>{tab.label}</span>
              <small>{tab.description}</small>
            </button>
          ))}
        </nav>

        <div className="candidate-profile-layout candidate-profile-layout--tabbed">
          <main
            className="candidate-profile-main candidate-profile-tab-panel"
            role="tabpanel"
            aria-label={activeTabMeta.label}
          >
            {activeTab === "about" ? (
              <div className="candidate-profile-about-tab">
                <CandidateProfileCompletionPrompt profile={profile} />

                <div className="candidate-profile-about-grid">
                  <div className="candidate-profile-about-grid__story">
                    <EditableProfileSection
                      editingSection={editingSection}
                      id="about"
                      isDirty={isDirty}
                      onCancel={cancelEdit}
                      onEdit={beginEdit}
                      onSave={saveSection}
                      savedSection={savedSection}
                      title="About Me"
                      variant="story"
                    >
                      {editingSection === "about" ? (
                        <AuthRichTextField
                          label="About Me"
                          name="candidate-profile-about"
                          onChange={(aboutMe) => updateDraft((current) => ({ ...current, aboutMe }))}
                          placeholder="Share a short intro about your background and strengths."
                          value={draftProfile.aboutMe}
                        />
                      ) : (
                        <div className="candidate-profile-story">
                          {stripHtml(displayProfile.aboutMe) ? (
                            <ProfileAboutMePreview value={displayProfile.aboutMe} />
                          ) : (
                            <div className="candidate-profile-soft-empty">
                              Add a professional summary to make this profile feel complete.
                            </div>
                          )}
                        </div>
                      )}
                    </EditableProfileSection>

                    <EditableProfileSection
                      editingSection={editingSection}
                      id="skills"
                      isDirty={isDirty}
                      onCancel={cancelEdit}
                      onEdit={beginEdit}
                      onSave={saveSection}
                      savedSection={savedSection}
                      title="Skills"
                      variant="story"
                    >
                      {editingSection === "skills" ? (
                        <SkillsEditor
                          onChange={(skills) => updateDraft((current) => ({ ...current, skills }))}
                          value={draftProfile.skills}
                        />
                      ) : displayProfile.skills.length ? (
                        <ProfileSkillOverflowList skills={displayProfile.skills} />
                      ) : (
                        <div className="candidate-profile-soft-empty">Add skills that describe your strongest work.</div>
                      )}
                    </EditableProfileSection>

                    <EditableProfileSection
                      editingSection={editingSection}
                      id="languages"
                      isDirty={isDirty}
                      onCancel={cancelEdit}
                      onEdit={beginEdit}
                      onSave={saveSection}
                      savedSection={savedSection}
                      title="Languages"
                      variant="story"
                    >
                      {editingSection === "languages" ? (
                        <LanguagesEditor
                          errors={errors}
                          onChange={(languages) => updateDraft((current) => ({ ...current, languages }))}
                          value={draftProfile.languages}
                        />
                      ) : displayProfile.languages.length ? (
                        <div className="candidate-profile-language-summary">
                          {displayProfile.languages.map((language) => (
                            <div className="candidate-profile-language-summary__row" key={language.id}>
                              <strong>{language.languageName}</strong>
                              <span>{language.proficiency}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="candidate-profile-soft-empty">Add languages you can work in.</div>
                      )}
                    </EditableProfileSection>
                  </div>

                  <aside className="candidate-profile-about-grid__details" aria-label="Hiring preferences">
                    <EditableProfileSection
                      editingSection={editingSection}
                      id="contact"
                      isDirty={isDirty}
                      onCancel={cancelEdit}
                      onEdit={beginEdit}
                      onSave={saveSection}
                      savedSection={savedSection}
                      title="Contact"
                      variant="panel"
                    >
                      {editingSection === "contact" ? (
                        <div className="candidate-profile-form-grid">
                          <TextField
                            disabled
                            error={errors.email}
                            helper="Email address cannot be edited here."
                            label="Email"
                            type="email"
                            value={profile.email}
                          />
                          <ApplicationPhoneField
                            defaultCountryCode={draftProfile.location?.countryCode}
                            error={errors.phoneNumber}
                            label="Phone Number (Optional)"
                            onChange={(phoneNumber) =>
                              updateDraft((current) => ({ ...current, phoneNumber }))
                            }
                            value={draftProfile.phoneNumber}
                          />
                          <ApplicationPhoneField
                            defaultCountryCode={draftProfile.location?.countryCode}
                            error={errors.alternativeNumber}
                            label="Alternative Number (Optional)"
                            onChange={(alternativeNumber) =>
                              updateDraft((current) => ({ ...current, alternativeNumber }))
                            }
                            value={draftProfile.alternativeNumber}
                          />
                        </div>
                      ) : (
                        <ProfileDetailRows
                          rows={[
                            {
                              label: "Email",
                              value: (
                                <span
                                  className="candidate-profile-truncated-value candidate-profile-email-popover"
                                  data-full-value={displayProfile.email}
                                  tabIndex={0}
                                  title={displayProfile.email}
                                >
                                  {displayProfile.email}
                                </span>
                              )
                            },
                            {
                              label: "Phone",
                              value: isPhoneEmpty(displayProfile.phoneNumber)
                                ? <ProfileInlinePrompt>Add phone number</ProfileInlinePrompt>
                                : formatPhoneValue(displayProfile.phoneNumber)
                            },
                            {
                              label: "Alternative",
                              value: isPhoneEmpty(displayProfile.alternativeNumber)
                                ? null
                                : formatPhoneValue(displayProfile.alternativeNumber)
                            }
                          ]}
                        />
                      )}
                    </EditableProfileSection>

                    <EditableProfileSection
                      editingSection={editingSection}
                      id="work"
                      isDirty={isDirty}
                      onCancel={cancelEdit}
                      onEdit={beginEdit}
                      onSave={saveSection}
                      savedSection={savedSection}
                      title="Hiring Preferences"
                      variant="panel"
                    >
                      {editingSection === "work" ? (
                        <div className="candidate-profile-form-grid">
                          <YesNoControl
                            label="Willing to relocate"
                            onChange={(willingToRelocate) =>
                              updateDraft((current) => ({ ...current, willingToRelocate }))
                            }
                            value={draftProfile.willingToRelocate}
                          />
                          <NoticePeriodSelect
                            label="Notice period"
                            onChange={(noticePeriod) =>
                              updateDraft((current) => ({
                                ...current,
                                noticePeriod
                              }))
                            }
                            value={draftProfile.noticePeriod}
                          />
                          <YesNoControl
                            label="Own transport"
                            onChange={(ownTransport) => updateDraft((current) => ({ ...current, ownTransport }))}
                            value={draftProfile.ownTransport}
                          />
                          <MoneyInput
                            amountError={errors.currentRemunerationAmount}
                            currencyError={errors.currentRemunerationCurrency}
                            helper="What you currently earn monthly."
                            label="Current Compensation"
                            onChange={(currentRemuneration) =>
                              updateDraft((current) => ({ ...current, currentRemuneration }))
                            }
                            value={draftProfile.currentRemuneration}
                          />
                          <MoneyInput
                            amountError={errors.desiredRemunerationAmount}
                            currencyError={errors.desiredRemunerationCurrency}
                            helper="What you would like to earn monthly."
                            label="Desired Compensation"
                            onChange={(desiredRemuneration) =>
                              updateDraft((current) => ({ ...current, desiredRemuneration }))
                            }
                            tone="emphasis"
                            value={draftProfile.desiredRemuneration}
                          />
                        </div>
                      ) : (
                        <ProfileDetailRows
                          rows={[
                            {
                              label: "Willing to relocate",
                              value:
                                formatBooleanValue(displayProfile.willingToRelocate) ?? (
                                  <span className="candidate-profile-muted-value">Not added</span>
                                )
                            },
                            {
                              label: "Notice period",
                              value:
                                displayProfile.noticePeriod || (
                                  <span className="candidate-profile-muted-value">Not added</span>
                                )
                            },
                            {
                              label: "Own transport",
                              value:
                                formatBooleanValue(displayProfile.ownTransport) ?? (
                                  <span className="candidate-profile-muted-value">Not added</span>
                                )
                            },
                            {
                              label: "Current Compensation",
                              value: formatMoneyValue(displayProfile.currentRemuneration) || (
                                <span className="candidate-profile-muted-value">Not added</span>
                              )
                            },
                            {
                              label: "Desired Compensation",
                              value: formatMoneyValue(displayProfile.desiredRemuneration) || (
                                <span className="candidate-profile-muted-value">Not added</span>
                              )
                            }
                          ]}
                        />
                      )}
                    </EditableProfileSection>

                    <EditableProfileSection
                      editingSection={editingSection}
                      id="personal"
                      isDirty={isDirty}
                      onCancel={cancelEdit}
                      onEdit={beginEdit}
                      onSave={saveSection}
                      savedSection={savedSection}
                      title="Personal Details"
                      variant="panel"
                    >
                      {editingSection === "personal" ? (
                        <div className="candidate-profile-form-grid">
                          <DateOfBirthField
                            error={errors.dateOfBirth}
                            label="Date of Birth"
                            onChange={(dateOfBirth) => updateDraft((current) => ({ ...current, dateOfBirth }))}
                            value={draftProfile.dateOfBirth}
                          />
                          <NationalitySelect
                            label="Nationality"
                            onChange={(nationality) => updateDraft((current) => ({ ...current, nationality }))}
                            value={draftProfile.nationality}
                          />
                          <NationalitySelect
                            label="Citizenship"
                            onChange={(citizenship) => updateDraft((current) => ({ ...current, citizenship }))}
                            value={draftProfile.citizenship}
                          />
                        </div>
                      ) : (
                        <ProfileDetailRows
                          empty="Not shared yet"
                          rows={[
                            {
                              label: "Date of birth",
                              value: formatDateValue(displayProfile.dateOfBirth) || (
                                <span className="candidate-profile-muted-value">Not added</span>
                              )
                            },
                            {
                              label: "Nationality",
                              value: displayProfile.nationality
                                ? `${displayProfile.nationality.flag} ${displayProfile.nationality.nationality}`
                                : null
                            },
                            {
                              label: "Citizenship",
                              value: displayProfile.citizenship
                                ? `${displayProfile.citizenship.flag} ${displayProfile.citizenship.nationality}`
                                : null
                            }
                          ]}
                        />
                      )}
                    </EditableProfileSection>
                  </aside>
                </div>
              </div>
            ) : null}

            {activeTab === "experience" ? (
              <section className="candidate-profile-section candidate-profile-section--career-review surface-card">
                <CareerEducationReviewList
                  careerEntries={profile.careerEntries}
                  defaultCareerCountryCode={profile.location?.countryCode ?? null}
                  educationEntries={profile.educationEntries}
                  onChange={({ careerEntries, educationEntries }) => {
                    updateImmediate((current) => ({
                      ...current,
                      careerEntries,
                      educationEntries,
                      updatedAt: new Date().toISOString()
                    }));
                  }}
                />
              </section>
            ) : null}

            {activeTab === "files" ? (
              <ProfileResumeFilesSection
                onChange={(files) => updateImmediate((current) => ({ ...current, files }))}
                session={session}
              />
            ) : null}

            {activeTab === "settings" ? (
              <CandidateProfileSettingsTab email={session.email} />
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

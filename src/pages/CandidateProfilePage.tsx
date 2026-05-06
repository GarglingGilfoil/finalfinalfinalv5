import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode
} from "react";
import {
  Check,
  Download,
  Edit3,
  Eye,
  FileText,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { createPortal } from "react-dom";
import {
  ApplicationPhoneField,
  getCandidatePhoneNumberError
} from "../components/ApplicationPhoneField";
import { AuthRichTextField } from "../components/ApplicationAuthPrimitives";
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
import { searchNationalities } from "../lib/nationalities";
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
import { readPrototypeSession } from "../lib/prototype-auth";
import { buildApplicationAuthPath } from "../lib/router";

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
  | "remuneration"
  | "personal";

type ProfileTabId =
  | "about"
  | "experience"
  | "files";
type ProfileBackgroundMode = "current" | "home";

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
  }
];

const REFERENCE_JOB_ID = "196794136";
const PROFILE_FILE_ACCEPT =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp";
const PROFILE_FILE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const PROFILE_FILE_NAME_MAX_LENGTH = 50;
const PROFILE_BACKGROUND_STORAGE_KEY = "ditto:candidate-profile-background";

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

function readInitialProfileBackgroundMode(): ProfileBackgroundMode {
  const profileBgParam = new URLSearchParams(window.location.search).get("profileBg");

  if (profileBgParam === "home" || profileBgParam === "current") {
    return profileBgParam;
  }

  try {
    const storedMode = window.localStorage.getItem(PROFILE_BACKGROUND_STORAGE_KEY);

    if (storedMode === "home" || storedMode === "current") {
      return storedMode;
    }
  } catch {
    return "current";
  }

  return "current";
}

function ProfileBackgroundToggle({
  mode,
  onChange
}: {
  mode: ProfileBackgroundMode;
  onChange: (mode: ProfileBackgroundMode) => void;
}): JSX.Element {
  return (
    <div className="profile-background-toggle" aria-label="Profile background design QA toggle">
      <span>Profile background</span>
      <div className="profile-background-toggle__options" role="group" aria-label="Profile background">
        <button
          aria-pressed={mode === "current"}
          className={mode === "current" ? "is-active" : ""}
          onClick={() => onChange("current")}
          type="button"
        >
          Current
        </button>
        <button
          aria-pressed={mode === "home"}
          className={mode === "home" ? "is-active" : ""}
          onClick={() => onChange("home")}
          type="button"
        >
          Home
        </button>
      </div>
    </div>
  );
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

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
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

  if (sectionId === "remuneration") {
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
    { id: "date-of-birth", target: "personal", label: "Date of birth", complete: Boolean(profile.dateOfBirth) },
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
      target: "remuneration",
      label: "Current remuneration",
      complete: hasMoneyValue(profile.currentRemuneration)
    },
    {
      id: "desired-remuneration",
      target: "remuneration",
      label: "Desired remuneration",
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
  type?: "date" | "email" | "number" | "text";
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

function SelectField({
  children,
  disabled,
  error,
  label,
  onChange,
  value
}: {
  children: ReactNode;
  disabled?: boolean;
  error?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}): JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <label className="auth-field candidate-profile-field">
      <span className="auth-field__label">{label}</span>
      <select
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={["auth-field__input", error ? "auth-field__input--error" : ""]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
      {error ? (
        <span className="auth-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
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
  onOpenAbout,
  profile
}: {
  onAvatarChange: (value: CandidateProfilePictureValue | null) => void;
  onCoverChange: (value: CandidateProfilePictureValue | null) => void;
  onOpenAbout: () => void;
  profile: CandidateProfileState;
}): JSX.Element {
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const professionalSubtitle = [
    profile.currentJobTitle || "Current role not added",
    profile.location?.label || "Location not added"
  ].join(" · ");

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
            <p>{professionalSubtitle}</p>
          </div>
          <button
            className="button button--ghost candidate-profile-hero__action"
            onClick={onOpenAbout}
            type="button"
          >
            Edit profile
          </button>
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
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addSkill = (): void => {
    const nextSkill = normalizeSkill(inputValue);

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
      <div className="candidate-profile-add-row">
        <input
          className="auth-field__input"
          onChange={(event) => {
            setInputValue(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addSkill();
            }
          }}
          placeholder="Add a skill"
          value={inputValue}
        />
        <button className="button button--ghost" onClick={addSkill} type="button">
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
            <SelectField
              error={errors[`proficiency-${language.id}`]}
              label="Proficiency"
              onChange={(proficiency) =>
                onChange(
                  value.map((entry) =>
                    entry.id === language.id
                      ? { ...entry, proficiency: proficiency as CandidateLanguageProficiency }
                      : entry
                  )
                )
              }
              value={language.proficiency}
            >
              <option value="">Choose proficiency</option>
              {LANGUAGE_PROFICIENCY_OPTIONS.map((proficiency) => (
                <option key={proficiency} value={proficiency}>
                  {proficiency}
                </option>
              ))}
            </SelectField>
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
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchNationalities(query, 10), [query]);

  return (
    <div className="auth-field candidate-profile-search-picker">
      <span className="auth-field__label">{label}</span>
      <div className="candidate-profile-nationality-value">
        {value ? `${value.flag} ${value.nationality}` : "Not added"}
        {value ? (
          <button onClick={() => onChange(null)} type="button">
            Remove
          </button>
        ) : null}
      </div>
      <input
        className="auth-field__input"
        onChange={(event) => setQuery(event.target.value)}
        placeholder={`Search ${label.toLowerCase()}`}
        value={query}
      />
      <div className="candidate-profile-search-picker__results">
        {results.map((option) => (
          <button
            key={option.countryCode}
            onClick={() => {
              onChange({
                countryCode: option.countryCode,
                flag: option.flag,
                nationality: option.nationality
              });
              setQuery("");
            }}
            type="button"
          >
            <span>{option.flag}</span>
            {option.nationality}
          </button>
        ))}
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

function ProfileGuard({
  backgroundMode,
  onBackgroundModeChange
}: {
  backgroundMode: ProfileBackgroundMode;
  onBackgroundModeChange: (mode: ProfileBackgroundMode) => void;
}): JSX.Element {
  return (
    <div className="candidate-profile-page" data-profile-background={backgroundMode}>
      <span aria-hidden="true" className="candidate-profile-bg-debug__shimmer" />
      <ProfileBackgroundToggle mode={backgroundMode} onChange={onBackgroundModeChange} />
      <section className="candidate-profile-guard surface-card">
        <p className="section-kicker">Candidate profile</p>
        <h1>Sign in to view your profile</h1>
        <p>Manage your details, files, and career history from one place.</p>
        <TransitionLink
          className="button button--job-primary"
          href={buildApplicationAuthPath(REFERENCE_JOB_ID, "signin")}
          source="profile-signin"
        >
          Sign in
        </TransitionLink>
      </section>
    </div>
  );
}

export function CandidateProfilePage(): JSX.Element {
  const session = useMemo(() => readPrototypeSession(), []);
  const [profileBackgroundMode, setProfileBackgroundMode] = useState<ProfileBackgroundMode>(
    readInitialProfileBackgroundMode
  );
  const [profile, setProfile] = useState<CandidateProfileState | null>(() =>
    session ? buildPrototypeCandidateProfile(session) : null
  );
  const [draftProfile, setDraftProfile] = useState<CandidateProfileState | null>(profile);
  const [editingSection, setEditingSection] = useState<ProfileSectionId | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTabId>("about");
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [savedSection, setSavedSection] = useState<ProfileSectionId | null>(null);
  const savedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current !== null) {
        window.clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  const updateProfileBackgroundMode = (nextMode: ProfileBackgroundMode): void => {
    setProfileBackgroundMode(nextMode);

    try {
      window.localStorage.setItem(PROFILE_BACKGROUND_STORAGE_KEY, nextMode);
    } catch {
      // Design QA preference only. Ignore storage failures.
    }
  };

  if (!session || !profile || !draftProfile) {
    return (
      <ProfileGuard
        backgroundMode={profileBackgroundMode}
        onBackgroundModeChange={updateProfileBackgroundMode}
      />
    );
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

  return (
    <div className="candidate-profile-page" data-profile-background={profileBackgroundMode}>
      <span aria-hidden="true" className="candidate-profile-bg-debug__shimmer" />
      <ProfileBackgroundToggle mode={profileBackgroundMode} onChange={updateProfileBackgroundMode} />
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
          onOpenAbout={() => {
            setActiveTab("about");
            beginEdit("about");
          }}
          profile={profile}
        />

        <nav
          className="candidate-profile-tabs surface-card"
          aria-label="Candidate profile sections"
          role="tablist"
        >
          {PROFILE_TABS.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={activeTab === tab.id ? "is-active" : ""}
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setEditingSection(null);
                setErrors({});
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
              <>
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

                  <aside className="candidate-profile-about-grid__details" aria-label="Hiring details">
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
                      title="Hiring Details"
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
                          <SelectField
                            label="Notice period"
                            onChange={(noticePeriod) =>
                              updateDraft((current) => ({
                                ...current,
                                noticePeriod: noticePeriod as CandidateNoticePeriod
                              }))
                            }
                            value={draftProfile.noticePeriod}
                          >
                            {NOTICE_PERIOD_OPTIONS.map((noticePeriod) => (
                              <option key={noticePeriod || "empty"} value={noticePeriod}>
                                {noticePeriod || "Select notice period"}
                              </option>
                            ))}
                          </SelectField>
                          <YesNoControl
                            label="Own transport"
                            onChange={(ownTransport) => updateDraft((current) => ({ ...current, ownTransport }))}
                            value={draftProfile.ownTransport}
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
                            }
                          ]}
                        />
                      )}
                    </EditableProfileSection>

                    <EditableProfileSection
                      editingSection={editingSection}
                      id="remuneration"
                      isDirty={isDirty}
                      onCancel={cancelEdit}
                      onEdit={beginEdit}
                      onSave={saveSection}
                      savedSection={savedSection}
                      title="Compensation"
                      variant="panel"
                    >
                      {editingSection === "remuneration" ? (
                        <div className="candidate-profile-remuneration-editor">
                          <MoneyInput
                            amountError={errors.currentRemunerationAmount}
                            currencyError={errors.currentRemunerationCurrency}
                            helper="What you currently earn monthly."
                            label="Current remuneration"
                            onChange={(currentRemuneration) =>
                              updateDraft((current) => ({ ...current, currentRemuneration }))
                            }
                            value={draftProfile.currentRemuneration}
                          />
                          <MoneyInput
                            amountError={errors.desiredRemunerationAmount}
                            currencyError={errors.desiredRemunerationCurrency}
                            helper="What you would like to earn monthly."
                            label="Desired remuneration"
                            onChange={(desiredRemuneration) =>
                              updateDraft((current) => ({ ...current, desiredRemuneration }))
                            }
                            tone="emphasis"
                            value={draftProfile.desiredRemuneration}
                          />
                        </div>
                      ) : (
                        <ProfileDetailRows
                          empty="Not shared yet"
                          rows={[
                            { label: "Current", value: formatMoneyValue(displayProfile.currentRemuneration) },
                            { label: "Desired", value: formatMoneyValue(displayProfile.desiredRemuneration) }
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
                          <TextField
                            label="Date of Birth"
                            onChange={(dateOfBirth) => updateDraft((current) => ({ ...current, dateOfBirth }))}
                            type="date"
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
              </>
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
          </main>
        </div>
      </div>
    </div>
  );
}

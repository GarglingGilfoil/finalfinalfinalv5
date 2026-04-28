import {
  useEffect,
  useId,
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
  Plus,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { ApplicationLocationField } from "../components/ApplicationLocationField";
import {
  ApplicationPhoneField,
  getCandidatePhoneNumberError
} from "../components/ApplicationPhoneField";
import { AuthRichTextField } from "../components/ApplicationAuthPrimitives";
import { TransitionLink } from "../components/application/TransitionLink";
import { CareerEducationReviewList } from "./ApplicationCareerHistoryPage";
import type {
  CandidateLocationValue,
  CandidatePhoneNumberValue,
  CandidateProfilePictureValue,
  CandidateSession,
  PrototypeCareerEntry,
  PrototypeCareerLevel,
  PrototypeEducationEntry,
  PrototypeEducationQualification
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
import { LANGUAGE_OPTIONS, searchLanguages } from "../lib/languages";
import { getNationalityByCountryCode, searchNationalities } from "../lib/nationalities";
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
import { readPrototypeSession } from "../lib/prototype-auth";
import { buildApplicationAuthPath, buildCandidateProfilePath } from "../lib/router";

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
  | "career-education"
  | "about"
  | "skills-languages"
  | "documents"
  | "preferences"
  | "personal";

type ValidationErrors = Record<string, string | undefined>;

const PROFILE_TABS: Array<{ id: ProfileTabId; label: string; description: string }> = [
  {
    id: "career-education",
    label: "Experience",
    description: "Review the roles and education that form your professional story."
  },
  {
    id: "about",
    label: "About",
    description: "Manage the identity, summary, and contact details recruiters see first."
  },
  {
    id: "skills-languages",
    label: "Skills",
    description: "Add capabilities and languages that help match you to better roles."
  },
  {
    id: "documents",
    label: "Documents",
    description: "Keep your CV, certificates, portfolio, and supporting files in one place."
  },
  {
    id: "preferences",
    label: "Preferences",
    description: "Share practical work preferences and remuneration context when useful."
  },
  {
    id: "personal",
    label: "Private Details",
    description: "Sensitive eligibility information stays separate from your public profile."
  }
];

const REFERENCE_JOB_ID = "196794136";
const PROFILE_FILE_ACCEPT =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp";
const PROFILE_FILE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const LANGUAGE_PROFICIENCY_OPTIONS: CandidateLanguageProficiency[] = [
  "Native or bilingual proficiency",
  "Full professional proficiency",
  "Professional working proficiency",
  "Limited working proficiency"
];

const CAREER_LEVEL_OPTIONS: PrototypeCareerLevel[] = [
  "Intern / Apprentice",
  "Entry Level",
  "Junior",
  "Mid Level",
  "Senior",
  "Lead",
  "Principal",
  "Manager",
  "Director",
  "Vice President",
  "Executive / C-Level"
];

const EDUCATION_QUALIFICATION_OPTIONS: PrototypeEducationQualification[] = [
  "Certificate",
  "Diploma",
  "Degree",
  "Post-Graduate",
  "Honours",
  "Masters",
  "Doctorate",
  "Other"
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

const FILE_CATEGORY_OPTIONS: CandidateFileCategory[] = [
  "CV / Resume",
  "Cover Letter",
  "Certificate",
  "Portfolio",
  "Other"
];

const MONTH_OPTIONS = [
  { label: "Jan", value: "01" },
  { label: "Feb", value: "02" },
  { label: "Mar", value: "03" },
  { label: "Apr", value: "04" },
  { label: "May", value: "05" },
  { label: "Jun", value: "06" },
  { label: "Jul", value: "07" },
  { label: "Aug", value: "08" },
  { label: "Sep", value: "09" },
  { label: "Oct", value: "10" },
  { label: "Nov", value: "11" },
  { label: "Dec", value: "12" }
] as const;

const YEAR_OPTIONS = Array.from({ length: 58 }, (_, index) =>
  String(new Date().getFullYear() - index)
);

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

function formatUpdatedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getDescriptionPreview(value: string, fallback: string): string {
  const text = stripHtml(value);

  if (!text) {
    return fallback;
  }

  return text.length > 260 ? `${text.slice(0, 260).trim()}...` : text;
}

function normalizeSkill(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isPhoneEmpty(value: CandidatePhoneNumberValue | string): boolean {
  return typeof value === "string" ? !value.trim() : !value.raw.trim();
}

function makeEmptyCareerEntry(): PrototypeCareerEntry {
  return {
    id: `career-profile-${Date.now()}`,
    jobTitle: "",
    company: "",
    location: null,
    startMonth: "",
    startYear: "",
    endMonth: "",
    endYear: "",
    isCurrent: false,
    industry: "",
    careerLevel: "",
    description: "",
    reasonForLeaving: "",
    source: "manual"
  };
}

function makeEmptyEducationEntry(): PrototypeEducationEntry {
  return {
    id: `education-profile-${Date.now()}`,
    institution: "",
    qualification: "",
    fieldOfStudy: "",
    startYear: "",
    endYear: "",
    description: "",
    source: "manual"
  };
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
    if (isPhoneEmpty(profile.phoneNumber)) {
      errors.phoneNumber = "Phone number is required.";
    } else {
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
  const completionItems = [
    { id: "avatar", target: "identity", label: "Profile picture", complete: Boolean(profile.profilePicture) },
    {
      id: "name",
      target: "identity",
      label: "Name",
      complete: Boolean(profile.firstName.trim() && profile.lastName.trim())
    },
    { id: "location", target: "identity", label: "Location", complete: Boolean(profile.location) },
    { id: "phone", target: "contact", label: "Phone number", complete: !isPhoneEmpty(profile.phoneNumber) },
    {
      id: "current-title",
      target: "identity",
      label: "Current title",
      complete: Boolean(profile.currentJobTitle.trim())
    },
    { id: "about", target: "about", label: "About Me", complete: Boolean(stripHtml(profile.aboutMe)) },
    { id: "skills", target: "skills", label: "Skills", complete: profile.skills.length > 0 },
    { id: "languages", target: "languages", label: "Languages", complete: profile.languages.length > 0 },
    { id: "career", target: "career", label: "Career history", complete: profile.careerEntries.length > 0 },
    { id: "education", target: "education", label: "Education", complete: profile.educationEntries.length > 0 },
    { id: "files", target: "files", label: "Files", complete: profile.files.length > 0 },
    {
      id: "work",
      target: "work",
      label: "Work preferences",
      complete: Boolean(profile.noticePeriod && profile.willingToRelocate !== null)
    },
    {
      id: "remuneration",
      target: "remuneration",
      label: "Desired remuneration",
      complete: Boolean(profile.desiredRemuneration.amount.trim())
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
  error,
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "date" | "email" | "number" | "text";
  value: string;
}): JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <label className="auth-field candidate-profile-field">
      <span className="auth-field__label">{label}</span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className={["auth-field__input", error ? "auth-field__input--error" : ""]
          .filter(Boolean)
          .join(" ")}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
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
  title
}: {
  children: ReactNode;
  editingSection: ProfileSectionId | null;
  id: ProfileSectionId;
  isDirty: boolean;
  onCancel: () => void;
  onEdit: (sectionId: ProfileSectionId) => void;
  onSave: (sectionId: ProfileSectionId) => void;
  savedSection: ProfileSectionId | null;
  support: string;
  title: string;
}): JSX.Element {
  const isEditing = editingSection === id;
  const headingId = `profile-section-${id}`;

  return (
    <section
      aria-labelledby={headingId}
      className="candidate-profile-section surface-card"
      data-editing={isEditing || undefined}
      id={id}
    >
      <header className="candidate-profile-section__header">
        <div>
          <h2 id={headingId}>{title}</h2>
          <p>{support}</p>
        </div>
        <div className="candidate-profile-section__actions">
          {savedSection === id && !isEditing ? (
            <span className="candidate-profile-save-status" role="status">
              Saved
            </span>
          ) : null}
          {isEditing ? (
            <>
              <button className="button button--ghost" onClick={onCancel} type="button">
                Cancel
              </button>
              <button
                className="button button--job-primary"
                disabled={!isDirty}
                onClick={() => onSave(id)}
                type="button"
              >
                Save
              </button>
            </>
          ) : (
            <button
              className="button button--ghost candidate-profile-section__edit"
              onClick={() => onEdit(id)}
              type="button"
            >
              <Edit3 aria-hidden="true" className="candidate-profile-section__edit-icon" />
              Edit
            </button>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

function CandidateProfileAvatar({
  onChange,
  profile
}: {
  onChange: (value: CandidateProfilePictureValue | null) => void;
  profile: CandidateProfileState;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const initials = buildInitials(profile.firstName, profile.lastName);

  const handleFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return;
    }

    if (file.size > PROFILE_FILE_MAX_SIZE_BYTES) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        return;
      }

      onChange({
        dataUrl: reader.result,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        updatedAt: new Date().toISOString()
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="candidate-profile-avatar">
      <button
        aria-label="Update profile picture"
        className="candidate-profile-avatar__button"
        onClick={() => inputRef.current?.click()}
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
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFile}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}

function CandidateProfileHeader({
  onAvatarChange,
  onOpenAbout,
  onOpenCareer,
  profile
}: {
  onAvatarChange: (value: CandidateProfilePictureValue | null) => void;
  onOpenAbout: () => void;
  onOpenCareer: () => void;
  profile: CandidateProfileState;
}): JSX.Element {
  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const completion = calculateCompletion(profile);
  const professionalSubtitle =
    [profile.currentJobTitle, profile.location?.label].filter(Boolean).join(" · ") ||
    "Professional profile";
  const aboutPreview = getDescriptionPreview(
    profile.aboutMe,
    "Add a short professional summary so recruiters understand your strengths faster."
  );

  return (
    <section className="candidate-profile-hero surface-card">
      <div className="candidate-profile-hero__identity">
        <CandidateProfileAvatar onChange={onAvatarChange} profile={profile} />
        <div className="candidate-profile-hero__copy">
          <p className="section-kicker">Candidate profile</p>
          <h1>{fullName || "Your profile"}</h1>
          <p>{professionalSubtitle}</p>
          <div className="candidate-profile-hero__meta">
            {profile.location?.countryName ? <span>{profile.location.countryName}</span> : null}
            <span>{profile.email}</span>
            {!isPhoneEmpty(profile.phoneNumber) ? <span>Phone available</span> : null}
          </div>
          <div className="candidate-profile-hero__actions">
            <button
              className="button button--ghost candidate-profile-hero__action"
              onClick={onOpenAbout}
              type="button"
            >
              Edit profile
            </button>
            <button
              className="button button--ghost candidate-profile-hero__action"
              onClick={onOpenCareer}
              type="button"
            >
              View experience
            </button>
          </div>
        </div>
      </div>
      <div className="candidate-profile-hero__summary" aria-label="Profile summary">
        <p>{aboutPreview}</p>
        <div className="candidate-profile-hero__completion">
          <span>{completion.percentage}% complete</span>
          <span>{completion.missing.length} details to add</span>
        </div>
        <div
          aria-hidden="true"
          className="candidate-profile-completion__bar"
          style={{ ["--profile-completion" as string]: `${completion.percentage}%` }}
        />
      </div>
    </section>
  );
}

function CandidateProfileCompletionCard({ profile }: { profile: CandidateProfileState }): JSX.Element {
  const completion = calculateCompletion(profile);

  return (
    <aside className="candidate-profile-rail candidate-profile-rail--compact" aria-label="Profile completion">
      <section className="candidate-profile-completion surface-card">
        <p className="section-kicker">Profile strength</p>
        <div className="candidate-profile-completion__score">{completion.percentage}%</div>
        <p>Complete your profile so recruiters get the full picture.</p>
        <div
          aria-hidden="true"
          className="candidate-profile-completion__bar"
          style={{ ["--profile-completion" as string]: `${completion.percentage}%` }}
        />
        <div className="candidate-profile-completion__missing">
          <span>{completion.missing.length} details missing</span>
          {completion.missing.slice(0, 6).map((item) => (
            <a href={`#${item.target}`} key={item.id}>
              {item.label}
            </a>
          ))}
        </div>
      </section>

      <section className="candidate-profile-quick surface-card">
        <p className="section-kicker">Last updated</p>
        <strong>{formatUpdatedAt(profile.updatedAt)}</strong>
        <p>Keep this updated so your applications are easier to review.</p>
      </section>
    </aside>
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
  label,
  onChange,
  value
}: {
  amountError?: string;
  currencyError?: string;
  label: string;
  onChange: (value: CandidateMoneyValue) => void;
  value: CandidateMoneyValue;
}): JSX.Element {
  const [currencyQuery, setCurrencyQuery] = useState("");
  const currencies = useMemo(() => searchCurrencies(currencyQuery, 8), [currencyQuery]);

  return (
    <div className="candidate-profile-money">
      <span className="auth-field__label">{label}</span>
      <div className="candidate-profile-money__row">
        <div className="candidate-profile-money__currency">
          <input
            aria-label={`${label} currency`}
            className="auth-field__input"
            onChange={(event) => setCurrencyQuery(event.target.value.toUpperCase())}
            placeholder={value.currencyCode || "ZAR"}
            value={currencyQuery}
          />
          <div className="candidate-profile-search-picker__results">
            {currencies.map((currency) => (
              <button
                key={currency.code}
                onClick={() => {
                  onChange({ ...value, currencyCode: currency.code });
                  setCurrencyQuery("");
                }}
                type="button"
              >
                {currency.code}
              </button>
            ))}
          </div>
          <span>{value.currencyCode || "ZAR"}</span>
        </div>
        <input
          aria-label={`${label} amount`}
          className={["auth-field__input", amountError ? "auth-field__input--error" : ""]
            .filter(Boolean)
            .join(" ")}
          inputMode="decimal"
          onChange={(event) => onChange({ ...value, amount: event.target.value })}
          placeholder="75,000"
          value={value.amount}
        />
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
  const [category, setCategory] = useState<CandidateFileCategory>("Other");
  const [previewFile, setPreviewFile] = useState<{ file: CandidateProfileFile; objectUrl: string } | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewFile?.objectUrl) {
        URL.revokeObjectURL(previewFile.objectUrl);
      }
    };
  }, [previewFile]);

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

    const record = buildProfileUploadFile(file, category);
    await savePrototypeProfileAsset(session.email, record.id, file);
    onChange([record, ...profile.files]);
    setError(null);
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
    <div className="candidate-profile-files">
      <div className="candidate-profile-file-upload">
        <SelectField
          label="File type"
          onChange={(value) => setCategory(value as CandidateFileCategory)}
          value={category}
        >
          {FILE_CATEGORY_OPTIONS.map((fileCategory) => (
            <option key={fileCategory} value={fileCategory}>
              {fileCategory}
            </option>
          ))}
        </SelectField>
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
          className="button button--job-primary"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Upload aria-hidden="true" />
          Upload file
        </button>
      </div>
      {error ? <p className="auth-field__error">{error}</p> : null}
      <div className="candidate-profile-file-list">
        {profile.files.length ? (
          profile.files.map((file) => (
            <article className="candidate-profile-file" key={file.id}>
              <span className="candidate-profile-file__icon">
                <FileText aria-hidden="true" />
              </span>
              <div>
                <strong>{file.fileName}</strong>
                <span>
                  {file.category} · {formatFileSize(file.fileSize)} · {file.fileExtension}
                </span>
              </div>
              <div className="candidate-profile-file__actions">
                <button
                  aria-label={`Preview ${file.fileName}`}
                  onClick={() => {
                    void openPreview(file);
                  }}
                  type="button"
                >
                  <Eye aria-hidden="true" />
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
                  onClick={() => setDeleteFileId(file.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </article>
          ))
        ) : (
          <EmptyState>Upload your CV, certificates, or supporting documents.</EmptyState>
        )}
      </div>
      {deleteFileId ? (
        <div className="candidate-profile-dialog" role="dialog" aria-modal="true">
          <div className="candidate-profile-dialog__panel">
            <h3>Delete this file?</h3>
            <p>This removes it from your prototype profile.</p>
            <div>
              <button className="button button--ghost" onClick={() => setDeleteFileId(null)} type="button">
                Cancel
              </button>
              <button
                className="button button--job-primary"
                onClick={() => {
                  void confirmedDelete();
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {previewFile ? (
        <div className="candidate-profile-dialog" role="dialog" aria-modal="true">
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
              <iframe src={previewFile.objectUrl} title={previewFile.file.fileName} />
            ) : (
              <p>Preview is not available for this file type.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CareerEditor({
  errors,
  onChange,
  value
}: {
  errors: ValidationErrors;
  onChange: (entries: PrototypeCareerEntry[]) => void;
  value: PrototypeCareerEntry[];
}): JSX.Element {
  const updateEntry = (
    entryId: string,
    updater: (entry: PrototypeCareerEntry) => PrototypeCareerEntry
  ): void => {
    onChange(value.map((entry) => (entry.id === entryId ? updater(entry) : entry)));
  };

  return (
    <div className="candidate-profile-entry-list">
      {value.map((entry) => (
        <article className="candidate-profile-entry-editor" key={entry.id}>
          <div className="candidate-profile-entry-editor__header">
            <strong>{entry.jobTitle || "New role"}</strong>
            <button
              aria-label="Remove role"
              className="candidate-profile-icon-button"
              onClick={() => onChange(value.filter((candidateEntry) => candidateEntry.id !== entry.id))}
              type="button"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
          <div className="candidate-profile-form-grid candidate-profile-form-grid--two">
            <TextField
              error={errors[`career-${entry.id}-jobTitle`]}
              label="Job title"
              onChange={(jobTitle) => updateEntry(entry.id, (current) => ({ ...current, jobTitle }))}
              value={entry.jobTitle}
            />
            <TextField
              error={errors[`career-${entry.id}-company`]}
              label="Company"
              onChange={(company) => updateEntry(entry.id, (current) => ({ ...current, company }))}
              value={entry.company}
            />
          </div>
          <ApplicationLocationField
            label="Location (Optional)"
            onChange={(location) => updateEntry(entry.id, (current) => ({ ...current, location }))}
            value={entry.location}
          />
          <div className="candidate-profile-form-grid candidate-profile-form-grid--four">
            <SelectField
              error={errors[`career-${entry.id}-start`]}
              label="From month"
              onChange={(startMonth) => updateEntry(entry.id, (current) => ({ ...current, startMonth }))}
              value={entry.startMonth}
            >
              <option value="">Month</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              error={errors[`career-${entry.id}-start`]}
              label="From year"
              onChange={(startYear) => updateEntry(entry.id, (current) => ({ ...current, startYear }))}
              value={entry.startYear}
            >
              <option value="">Year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </SelectField>
            <SelectField
              disabled={entry.isCurrent}
              error={errors[`career-${entry.id}-end`]}
              label="To month"
              onChange={(endMonth) => updateEntry(entry.id, (current) => ({ ...current, endMonth }))}
              value={entry.endMonth}
            >
              <option value="">Month</option>
              {MONTH_OPTIONS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              disabled={entry.isCurrent}
              error={errors[`career-${entry.id}-end`]}
              label="To year"
              onChange={(endYear) => updateEntry(entry.id, (current) => ({ ...current, endYear }))}
              value={entry.endYear}
            >
              <option value="">Year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </SelectField>
          </div>
          <label className="candidate-profile-inline-check">
            <input
              checked={entry.isCurrent}
              onChange={(event) =>
                updateEntry(entry.id, (current) => ({
                  ...current,
                  isCurrent: event.target.checked,
                  endMonth: event.target.checked ? "" : current.endMonth,
                  endYear: event.target.checked ? "" : current.endYear
                }))
              }
              type="checkbox"
            />
            Current position
          </label>
          <div className="candidate-profile-form-grid candidate-profile-form-grid--two">
            <TextField
              label="Industry"
              onChange={(industry) => updateEntry(entry.id, (current) => ({ ...current, industry }))}
              value={entry.industry}
            />
            <SelectField
              label="Career level"
              onChange={(careerLevel) =>
                updateEntry(entry.id, (current) => ({
                  ...current,
                  careerLevel: careerLevel as PrototypeCareerLevel
                }))
              }
              value={entry.careerLevel}
            >
              <option value="">Select level</option>
              {CAREER_LEVEL_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </SelectField>
          </div>
          <AuthRichTextField
            label="Description"
            name={`profile-career-${entry.id}`}
            onChange={(description) =>
              updateEntry(entry.id, (current) => ({ ...current, description }))
            }
            value={entry.description}
          />
          <TextField
            label="Reason for leaving"
            onChange={(reasonForLeaving) =>
              updateEntry(entry.id, (current) => ({ ...current, reasonForLeaving }))
            }
            value={entry.reasonForLeaving}
          />
        </article>
      ))}
      <button
        className="button button--ghost"
        onClick={() => onChange([...value, makeEmptyCareerEntry()])}
        type="button"
      >
        <Plus aria-hidden="true" />
        Add role
      </button>
    </div>
  );
}

function EducationEditor({
  errors,
  onChange,
  value
}: {
  errors: ValidationErrors;
  onChange: (entries: PrototypeEducationEntry[]) => void;
  value: PrototypeEducationEntry[];
}): JSX.Element {
  const updateEntry = (
    entryId: string,
    updater: (entry: PrototypeEducationEntry) => PrototypeEducationEntry
  ): void => {
    onChange(value.map((entry) => (entry.id === entryId ? updater(entry) : entry)));
  };

  return (
    <div className="candidate-profile-entry-list">
      {value.map((entry) => (
        <article className="candidate-profile-entry-editor" key={entry.id}>
          <div className="candidate-profile-entry-editor__header">
            <strong>{entry.qualification || "New education item"}</strong>
            <button
              aria-label="Remove education item"
              className="candidate-profile-icon-button"
              onClick={() => onChange(value.filter((candidateEntry) => candidateEntry.id !== entry.id))}
              type="button"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
          <div className="candidate-profile-form-grid candidate-profile-form-grid--two">
            <TextField
              error={errors[`education-${entry.id}-institution`]}
              label="Institution"
              onChange={(institution) =>
                updateEntry(entry.id, (current) => ({ ...current, institution }))
              }
              value={entry.institution}
            />
            <SelectField
              error={errors[`education-${entry.id}-qualification`]}
              label="Qualification"
              onChange={(qualification) =>
                updateEntry(entry.id, (current) => ({
                  ...current,
                  qualification: qualification as PrototypeEducationQualification
                }))
              }
              value={entry.qualification}
            >
              <option value="">Select qualification</option>
              {EDUCATION_QUALIFICATION_OPTIONS.map((qualification) => (
                <option key={qualification} value={qualification}>
                  {qualification}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="candidate-profile-form-grid candidate-profile-form-grid--three">
            <TextField
              label="Field of study"
              onChange={(fieldOfStudy) =>
                updateEntry(entry.id, (current) => ({ ...current, fieldOfStudy }))
              }
              value={entry.fieldOfStudy}
            />
            <SelectField
              error={errors[`education-${entry.id}-years`]}
              label="From"
              onChange={(startYear) =>
                updateEntry(entry.id, (current) => ({ ...current, startYear }))
              }
              value={entry.startYear}
            >
              <option value="">Year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </SelectField>
            <SelectField
              error={errors[`education-${entry.id}-years`]}
              label="To"
              onChange={(endYear) => updateEntry(entry.id, (current) => ({ ...current, endYear }))}
              value={entry.endYear}
            >
              <option value="">Year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </SelectField>
          </div>
          <AuthRichTextField
            label="Description"
            name={`profile-education-${entry.id}`}
            onChange={(description) =>
              updateEntry(entry.id, (current) => ({ ...current, description }))
            }
            value={entry.description}
          />
        </article>
      ))}
      <button
        className="button button--ghost"
        onClick={() => onChange([...value, makeEmptyEducationEntry()])}
        type="button"
      >
        <Plus aria-hidden="true" />
        Add education
      </button>
    </div>
  );
}

function ReadList({
  empty,
  items
}: {
  empty: string;
  items: ReactNode[];
}): JSX.Element {
  return items.length ? <div className="candidate-profile-read-list">{items}</div> : <EmptyState>{empty}</EmptyState>;
}

function ProfileGuard(): JSX.Element {
  return (
    <div className="candidate-profile-page">
      <section className="candidate-profile-guard surface-card">
        <p className="section-kicker">Candidate profile</p>
        <h1>Sign in to view your profile</h1>
        <p>Manage your details, documents, preferences, and career history from one place.</p>
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
  const [profile, setProfile] = useState<CandidateProfileState | null>(() =>
    session ? buildPrototypeCandidateProfile(session) : null
  );
  const [draftProfile, setDraftProfile] = useState<CandidateProfileState | null>(profile);
  const [editingSection, setEditingSection] = useState<ProfileSectionId | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTabId>("career-education");
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
    const nextErrors = validateProfileSection(sectionId, draftProfile);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const nextProfile = {
      ...draftProfile,
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
    <div className="candidate-profile-page">
      <div className="candidate-profile-shell">
        <CandidateProfileHeader
          onAvatarChange={(profilePicture) =>
            updateImmediate((current) => ({
              ...current,
              profilePicture,
              updatedAt: new Date().toISOString()
            }))
          }
          onOpenAbout={() => {
            setActiveTab("about");
            beginEdit("identity");
          }}
          onOpenCareer={() => {
            setActiveTab("career-education");
            setEditingSection(null);
            setErrors({});
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

        <div className="candidate-profile-tab-intro">
          <span>{activeTabMeta.label}</span>
          <p>{activeTabMeta.description}</p>
        </div>

        <div className="candidate-profile-layout candidate-profile-layout--tabbed">
          <main
            className="candidate-profile-main candidate-profile-tab-panel"
            role="tabpanel"
            aria-label={activeTabMeta.label}
          >
            {activeTab === "about" ? (
              <>
            <EditableProfileSection
              editingSection={editingSection}
              id="identity"
              isDirty={isDirty}
              onCancel={cancelEdit}
              onEdit={beginEdit}
              onSave={saveSection}
              savedSection={savedSection}
              support="Keep your core details easy for recruiters to understand."
              title="Profile"
            >
              {editingSection === "identity" ? (
                <div className="candidate-profile-form-grid candidate-profile-form-grid--two">
                  <TextField
                    error={errors.firstName}
                    label="First name"
                    onChange={(firstName) => updateDraft((current) => ({ ...current, firstName }))}
                    value={draftProfile.firstName}
                  />
                  <TextField
                    error={errors.lastName}
                    label="Last name"
                    onChange={(lastName) => updateDraft((current) => ({ ...current, lastName }))}
                    value={draftProfile.lastName}
                  />
                  <TextField
                    label="Current or most recent job title"
                    onChange={(currentJobTitle) =>
                      updateDraft((current) => ({ ...current, currentJobTitle }))
                    }
                    value={draftProfile.currentJobTitle}
                  />
                  <ApplicationLocationField
                    error={errors.location}
                    label="Location"
                    onChange={(location) => updateDraft((current) => ({ ...current, location }))}
                    required
                    value={draftProfile.location}
                  />
                </div>
              ) : (
                <ReadList
                  empty="Add your name, current role, and location."
                  items={[
                    <span key="name">{displayProfile.firstName} {displayProfile.lastName}</span>,
                    <span key="title">{displayProfile.currentJobTitle || "Current title not added"}</span>,
                    <span key="location">{displayProfile.location?.label || "Location not added"}</span>
                  ]}
                />
              )}
            </EditableProfileSection>

            <EditableProfileSection
              editingSection={editingSection}
              id="about"
              isDirty={isDirty}
              onCancel={cancelEdit}
              onEdit={beginEdit}
              onSave={saveSection}
              savedSection={savedSection}
              support="Tell recruiters what kind of work you do best."
              title="About"
            >
              {editingSection === "about" ? (
                <AuthRichTextField
                  label="About Me"
                  name="candidate-profile-about"
                  onChange={(aboutMe) => updateDraft((current) => ({ ...current, aboutMe }))}
                  placeholder="Share a short intro about your background and strengths."
                  value={draftProfile.aboutMe}
                />
              ) : stripHtml(displayProfile.aboutMe) ? (
                <div
                  className="candidate-profile-rich-preview"
                  dangerouslySetInnerHTML={{ __html: displayProfile.aboutMe }}
                />
              ) : (
                <EmptyState>Tell recruiters what kind of work you do best.</EmptyState>
              )}
            </EditableProfileSection>

            <EditableProfileSection
              editingSection={editingSection}
              id="contact"
              isDirty={isDirty}
              onCancel={cancelEdit}
              onEdit={beginEdit}
              onSave={saveSection}
              savedSection={savedSection}
              support="Make it easy for recruiters to reach you when there is a match."
              title="Contact Details"
            >
              {editingSection === "contact" ? (
                <div className="candidate-profile-form-grid candidate-profile-form-grid--two">
                  <TextField
                    error={errors.email}
                    label="Email"
                    onChange={(email) => updateDraft((current) => ({ ...current, email }))}
                    type="email"
                    value={draftProfile.email}
                  />
                  <ApplicationPhoneField
                    defaultCountryCode={draftProfile.location?.countryCode}
                    error={errors.phoneNumber}
                    label="Phone Number"
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
                <ReadList
                  empty="Add contact details so recruiters can reach you."
                  items={[
                    <span key="email">{displayProfile.email}</span>,
                    <span key="phone">{isPhoneEmpty(displayProfile.phoneNumber) ? "Phone needed" : "Phone added"}</span>,
                    <span key="alt">{isPhoneEmpty(displayProfile.alternativeNumber) ? "Alternative number not added" : "Alternative number added"}</span>
                  ]}
                />
              )}
            </EditableProfileSection>
              </>
            ) : null}

            {activeTab === "skills-languages" ? (
              <>
            <EditableProfileSection
              editingSection={editingSection}
              id="skills"
              isDirty={isDirty}
              onCancel={cancelEdit}
              onEdit={beginEdit}
              onSave={saveSection}
              savedSection={savedSection}
              support="Add a few skills so recruiters can match you to better roles."
              title="Skills"
            >
              {editingSection === "skills" ? (
                <SkillsEditor
                  onChange={(skills) => updateDraft((current) => ({ ...current, skills }))}
                  value={draftProfile.skills}
                />
              ) : displayProfile.skills.length ? (
                <div className="candidate-profile-chip-list">
                  {displayProfile.skills.map((skill) => (
                    <span className="candidate-profile-chip" key={skill}>{skill}</span>
                  ))}
                </div>
              ) : (
                <EmptyState>Add a few skills so recruiters can match you to better roles.</EmptyState>
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
              support="Add languages you can work in."
              title="Languages"
            >
              {editingSection === "languages" ? (
                <LanguagesEditor
                  errors={errors}
                  onChange={(languages) => updateDraft((current) => ({ ...current, languages }))}
                  value={draftProfile.languages}
                />
              ) : displayProfile.languages.length ? (
                <ReadList
                  empty="Add languages you can work in."
                  items={displayProfile.languages.map((language) => (
                    <span key={language.id}>{language.languageName} · {language.proficiency}</span>
                  ))}
                />
              ) : (
                <EmptyState>Add languages you can work in.</EmptyState>
              )}
            </EditableProfileSection>
              </>
            ) : null}

            {activeTab === "career-education" ? (
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

            {activeTab === "documents" ? (
            <EditableProfileSection
              editingSection={editingSection}
              id="files"
              isDirty={isDirty}
              onCancel={cancelEdit}
              onEdit={beginEdit}
              onSave={saveSection}
              savedSection={savedSection}
              support="Manage your CV, certificates, portfolio, and supporting documents."
              title="Files"
            >
              <ProfileFilesSection
                onChange={(files) =>
                  editingSection === "files"
                    ? updateDraft((current) => ({ ...current, files }))
                    : updateImmediate((current) => ({ ...current, files }))
                }
                profile={editingSection === "files" ? draftProfile : profile}
                session={session}
              />
            </EditableProfileSection>
            ) : null}

            {activeTab === "preferences" ? (
              <>
            <EditableProfileSection
              editingSection={editingSection}
              id="work"
              isDirty={isDirty}
              onCancel={cancelEdit}
              onEdit={beginEdit}
              onSave={saveSection}
              savedSection={savedSection}
              support="Share practical details that help recruiters understand fit."
              title="Work Preferences"
            >
              {editingSection === "work" ? (
                <div className="candidate-profile-form-grid candidate-profile-form-grid--three">
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
                <ReadList
                  empty="Add work preferences when you are ready."
                  items={[
                    <span key="relocate">Relocate: {displayProfile.willingToRelocate === null ? "Not added" : displayProfile.willingToRelocate ? "Yes" : "No"}</span>,
                    <span key="notice">Notice: {displayProfile.noticePeriod || "Not added"}</span>,
                    <span key="transport">Own transport: {displayProfile.ownTransport === null ? "Not added" : displayProfile.ownTransport ? "Yes" : "No"}</span>
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
              support="Keep labels neutral. You can leave amounts blank."
              title="Remuneration"
            >
              {editingSection === "remuneration" ? (
                <div className="candidate-profile-form-grid candidate-profile-form-grid--two">
                  <MoneyInput
                    amountError={errors.currentRemunerationAmount}
                    currencyError={errors.currentRemunerationCurrency}
                    label="Current remuneration"
                    onChange={(currentRemuneration) =>
                      updateDraft((current) => ({ ...current, currentRemuneration }))
                    }
                    value={draftProfile.currentRemuneration}
                  />
                  <MoneyInput
                    amountError={errors.desiredRemunerationAmount}
                    currencyError={errors.desiredRemunerationCurrency}
                    label="Desired remuneration"
                    onChange={(desiredRemuneration) =>
                      updateDraft((current) => ({ ...current, desiredRemuneration }))
                    }
                    value={draftProfile.desiredRemuneration}
                  />
                </div>
              ) : (
                <ReadList
                  empty="Add remuneration details if you would like recruiters to understand expectations."
                  items={[
                    <span key="current">Current: {displayProfile.currentRemuneration.amount ? `${displayProfile.currentRemuneration.currencyCode} ${displayProfile.currentRemuneration.amount}` : "Not added"}</span>,
                    <span key="desired">Desired: {displayProfile.desiredRemuneration.amount ? `${displayProfile.desiredRemuneration.currencyCode} ${displayProfile.desiredRemuneration.amount}` : "Not added"}</span>
                  ]}
                />
              )}
            </EditableProfileSection>
              </>
            ) : null}

            {activeTab === "personal" ? (
            <EditableProfileSection
              editingSection={editingSection}
              id="personal"
              isDirty={isDirty}
              onCancel={cancelEdit}
              onEdit={beginEdit}
              onSave={saveSection}
              savedSection={savedSection}
              support="These details help recruiters understand eligibility and role requirements."
              title="Personal Details"
            >
              {editingSection === "personal" ? (
                <div className="candidate-profile-form-grid candidate-profile-form-grid--three">
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
                  <TextField
                    label="Date of Birth (Optional)"
                    onChange={(dateOfBirth) => updateDraft((current) => ({ ...current, dateOfBirth }))}
                    type="date"
                    value={draftProfile.dateOfBirth}
                  />
                </div>
              ) : (
                <ReadList
                  empty="Add private details only if they are useful for eligibility."
                  items={[
                    <span key="nationality">Nationality: {displayProfile.nationality ? `${displayProfile.nationality.flag} ${displayProfile.nationality.nationality}` : "Not added"}</span>,
                    <span key="citizenship">Citizenship: {displayProfile.citizenship ? `${displayProfile.citizenship.flag} ${displayProfile.citizenship.nationality}` : "Not added"}</span>,
                    <span key="dob">Date of birth: {displayProfile.dateOfBirth || "Not added"}</span>
                  ]}
                />
              )}
            </EditableProfileSection>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

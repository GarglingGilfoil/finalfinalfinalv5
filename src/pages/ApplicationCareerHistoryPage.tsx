import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { Check, ChevronDown, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { getJobView } from "../api/jobs";
import { ApplicationStepShell } from "../components/ApplicationStepShell";
import { AuthRichTextField } from "../components/ApplicationAuthPrimitives";
import { ApplicationLocationField } from "../components/ApplicationLocationField";
import { CompanyApplicationHeading } from "../components/ResumeUploadSection";
import type {
  CandidateCareerHistoryState,
  CandidateLocationValue,
  CandidatePersonalDetailsState,
  CandidateResumeState,
  CandidateSession,
  PrototypeCareerEntry,
  PrototypeCareerLevel,
  PrototypeEducationEntry,
  PrototypeEducationQualification
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { readPrototypeSession } from "../lib/prototype-auth";
import {
  buildPrototypeCareerHistoryState,
  readPrototypeCareerHistoryState,
  savePrototypeCareerHistoryState
} from "../lib/prototype-career-history";
import { readPrototypePersonalDetailsState } from "../lib/prototype-personal-details";
import { readPrototypeResumeState } from "../lib/prototype-resume";
import {
  buildApplicationAuthPath,
  buildApplicationConfirmPath,
  buildApplicationPersonalDetailsPath,
  buildApplicationUploadPath,
  buildJobViewPath,
  navigateTo
} from "../lib/router";

interface ApplicationCareerHistoryPageProps {
  jobId: string;
}

type LoadState = "loading" | "ready" | "missing";

type CareerEntryErrors = Partial<
  Record<"jobTitle" | "company" | "startMonth" | "startYear" | "endMonth" | "endYear", string>
>;
type EducationEntryErrors = Partial<
  Record<"institution" | "qualification" | "startYear" | "endYear", string>
>;

const INDUSTRY_OPTIONS = [
  "Technology",
  "Advertising Industry",
  "E-commerce",
  "Financial Services",
  "Retail",
  "Healthcare",
  "Education",
  "Media",
  "Telecommunications",
  "Logistics",
  "Hospitality",
  "Professional Services",
  "Accounting",
  "Aerospace",
  "Agriculture",
  "Architecture",
  "Automotive",
  "Banking",
  "Beauty",
  "Biotechnology",
  "Broadcasting",
  "Business Services",
  "Call Centre",
  "Chemicals",
  "Civil Engineering",
  "Clean Energy",
  "Cloud Computing",
  "Construction",
  "Consumer Goods",
  "Cybersecurity",
  "Data Analytics",
  "Design",
  "Digital Marketing",
  "Electrical Engineering",
  "Energy",
  "Entertainment",
  "Environmental Services",
  "Events",
  "Fashion",
  "FinTech",
  "Food and Beverage",
  "Gaming",
  "Government",
  "Graphic Design",
  "Hardware",
  "Human Resources",
  "Import and Export",
  "Industrial Manufacturing",
  "Information Services",
  "Insurance",
  "Interior Design",
  "Investment Management",
  "Legal Services",
  "Luxury Goods",
  "Management Consulting",
  "Market Research",
  "Mechanical Engineering",
  "Mining",
  "Mobile Apps",
  "Motion Design",
  "Nonprofit",
  "Oil and Gas",
  "Online Learning",
  "Payments",
  "Pharmaceuticals",
  "Photography",
  "Private Equity",
  "Property",
  "Public Relations",
  "Publishing",
  "Real Estate",
  "Recruitment",
  "Renewable Energy",
  "Research",
  "Restaurants",
  "Robotics",
  "SaaS",
  "Security",
  "Shipping",
  "Social Media",
  "Software Development",
  "Sports",
  "Supply Chain",
  "Sustainability",
  "Travel",
  "UX Design",
  "Venture Capital",
  "Video Production",
  "Web Development",
  "Wholesale",
  "3D Printing",
  "Animation",
  "Artificial Intelligence",
  "Asset Management",
  "Audio Production",
  "B2B Services",
  "Capital Markets",
  "Community Services",
  "Content Marketing",
  "Corporate Training",
  "Customer Experience",
  "Direct-to-Consumer",
  "EdTech",
  "Facilities Management",
  "Film",
  "Fleet Management",
  "Freight",
  "HealthTech",
  "Home Services",
  "Influencer Marketing",
  "Infrastructure",
  "Internet of Things",
  "Leisure",
  "Marine",
  "Medical Devices",
  "Music",
  "Packaging",
  "Performance Marketing",
  "Pet Care",
  "Product Design",
  "Public Sector",
  "Quality Assurance",
  "Rail",
  "RegTech",
  "Sales",
  "Scientific Research",
  "Semiconductors",
  "Smart Home",
  "Telemedicine",
  "Textiles",
  "Tourism",
  "Utilities",
  "Virtual Reality",
  "Warehousing",
  "Wellness"
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
];

const YEAR_OPTIONS = Array.from({ length: new Date().getFullYear() - 1969 }, (_, index) =>
  String(new Date().getFullYear() - index)
);

function getMonthLabel(value: string): string {
  return MONTH_OPTIONS.find((month) => month.value === value)?.label ?? "";
}

function stripRichText(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeReviewRichTextHtml(value: string): string {
  if (!value.trim()) {
    return "";
  }

  if (typeof DOMParser === "undefined") {
    return `<p>${escapeHtml(stripRichText(value))}</p>`;
  }

  const allowedTags = new Set(["b", "br", "em", "i", "li", "ol", "p", "strong", "u", "ul"]);
  const documentParser = new DOMParser().parseFromString(value, "text/html");

  documentParser.querySelectorAll("script, style, template").forEach((node) => {
    node.remove();
  });

  documentParser.body.querySelectorAll("*").forEach((node) => {
    const tagName = node.tagName.toLowerCase();

    if (!allowedTags.has(tagName)) {
      node.replaceWith(documentParser.createTextNode(node.textContent ?? ""));
      return;
    }

    Array.from(node.attributes).forEach((attribute) => {
      node.removeAttribute(attribute.name);
    });
  });

  return documentParser.body.innerHTML;
}

function createReviewId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyCareerEntry(): PrototypeCareerEntry {
  return {
    id: createReviewId("career-entry"),
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

function createEmptyEducationEntry(): PrototypeEducationEntry {
  return {
    id: createReviewId("education-entry"),
    institution: "",
    qualification: "",
    fieldOfStudy: "",
    startYear: "",
    endYear: "",
    description: "",
    source: "manual"
  };
}

function hasErrors(errors: CareerEntryErrors | EducationEntryErrors | undefined): boolean {
  return Boolean(errors && Object.keys(errors).length > 0);
}

function compareCareerDates(entry: PrototypeCareerEntry): number {
  const start = Number(`${entry.startYear}${entry.startMonth}`);
  const end = Number(`${entry.endYear}${entry.endMonth}`);

  return start - end;
}

function validateCareerEntry(entry: PrototypeCareerEntry): CareerEntryErrors {
  const errors: CareerEntryErrors = {};

  if (!entry.jobTitle.trim()) {
    errors.jobTitle = "Add a job title.";
  }

  if (!entry.company.trim()) {
    errors.company = "Add a company.";
  }

  if (!entry.startMonth) {
    errors.startMonth = "Choose a start month.";
  }

  if (!entry.startYear) {
    errors.startYear = "Choose a start year.";
  }

  if (!entry.isCurrent && !entry.endMonth) {
    errors.endMonth = "Choose an end month.";
  }

  if (!entry.isCurrent && !entry.endYear) {
    errors.endYear = "Choose an end year.";
  }

  if (
    entry.startMonth &&
    entry.startYear &&
    !entry.isCurrent &&
    entry.endMonth &&
    entry.endYear &&
    compareCareerDates(entry) > 0
  ) {
    errors.endYear = "End date must be after the start date.";
  }

  return errors;
}

function validateEducationEntry(entry: PrototypeEducationEntry): EducationEntryErrors {
  const errors: EducationEntryErrors = {};

  if (!entry.institution.trim()) {
    errors.institution = "Add an institution.";
  }

  if (!entry.qualification) {
    errors.qualification = "Choose a qualification.";
  }

  if (!entry.startYear) {
    errors.startYear = "Choose a start year.";
  }

  if (!entry.endYear) {
    errors.endYear = "Choose an end year.";
  }

  if (entry.startYear && entry.endYear && Number(entry.startYear) > Number(entry.endYear)) {
    errors.endYear = "End year must be after the start year.";
  }

  return errors;
}

function getCareerDateLabel(entry: PrototypeCareerEntry): string {
  const start = [getMonthLabel(entry.startMonth), entry.startYear].filter(Boolean).join(" ");
  const end = entry.isCurrent
    ? "Present"
    : [getMonthLabel(entry.endMonth), entry.endYear].filter(Boolean).join(" ");

  if (!start && !end) {
    return "Dates needed";
  }

  return `${start || "Start needed"} - ${end || "End needed"}`;
}

function getCareerLocationLabel(location: CandidateLocationValue | null): string {
  if (!location) {
    return "Not added";
  }

  return `${location.cityName}, ${location.countryName}`;
}

function getEducationDateLabel(entry: PrototypeEducationEntry): string {
  if (!entry.startYear && !entry.endYear) {
    return "Years needed";
  }

  return `${entry.startYear || "Start needed"} - ${entry.endYear || "End needed"}`;
}

function getEducationTitle(entry: PrototypeEducationEntry): string {
  const fieldOfStudy = entry.fieldOfStudy.trim();

  if (fieldOfStudy && entry.qualification) {
    return `${entry.qualification} · ${fieldOfStudy}`;
  }

  return fieldOfStudy || entry.qualification || "Qualification needed";
}

function hasCareerCompletion(entry: PrototypeCareerEntry): boolean {
  const hasRelevantEndDate = entry.isCurrent || Boolean(entry.endMonth && entry.endYear);
  const hasRelevantReason = entry.isCurrent || Boolean(entry.reasonForLeaving.trim());

  return Boolean(
    entry.jobTitle.trim() &&
      entry.company.trim() &&
      entry.location?.countryCode &&
      entry.location?.cityName &&
      entry.startMonth &&
      entry.startYear &&
      hasRelevantEndDate &&
      entry.industry &&
      entry.careerLevel &&
      stripRichText(entry.description) &&
      hasRelevantReason
  );
}

function hasEducationCompletion(entry: PrototypeEducationEntry): boolean {
  return Boolean(
    entry.institution.trim() &&
      entry.qualification &&
      entry.fieldOfStudy.trim() &&
      entry.startYear &&
      entry.endYear &&
      stripRichText(entry.description)
  );
}

function getCareerFieldId(entryId: string, field: keyof CareerEntryErrors): string {
  return `career-${entryId}-${field}`;
}

function getEducationFieldId(entryId: string, field: keyof EducationEntryErrors): string {
  return `education-${entryId}-${field}`;
}

function getFirstCareerErrorField(errors: CareerEntryErrors): keyof CareerEntryErrors | null {
  return (
    (["jobTitle", "company", "startMonth", "startYear", "endMonth", "endYear"] as Array<
      keyof CareerEntryErrors
    >).find((field) => errors[field]) ?? null
  );
}

function getFirstEducationErrorField(errors: EducationEntryErrors): keyof EducationEntryErrors | null {
  return (
    (["institution", "qualification", "startYear", "endYear"] as Array<
      keyof EducationEntryErrors
    >).find((field) => errors[field]) ?? null
  );
}

function LoadingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <div className="application-step__panel surface-card skeleton skeleton--sheet" />
      </ApplicationStepShell>
    </div>
  );
}

function MissingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Application step not available</h1>
          <p className="muted-copy">We couldn’t resolve the role for this review step.</p>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function SessionGuard({ job }: { job: JobViewData }): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Continue your application</h1>
          <p className="muted-copy">Sign in before you review your profile for {job.title}.</p>
          <div className="application-step__guard-actions">
            <a className="button button--job-primary" href={buildApplicationAuthPath(job.id, "signin")}>
              Go to application sign in
            </a>
            <a className="button button--ghost" href={buildJobViewPath(job.id)}>
              Back to job view
            </a>
          </div>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function MissingResumeState({ job }: { job: JobViewData }): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Resume required</h1>
          <p className="muted-copy">Upload a resume before you review your career and education for {job.title}.</p>
          <div className="application-step__guard-actions">
            <a className="button button--job-primary" href={buildApplicationUploadPath(job.id)}>
              Back to resume upload
            </a>
          </div>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function MissingPersonalDetailsState({ job }: { job: JobViewData }): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell>
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Personal details needed</h1>
          <p className="muted-copy">
            Add your location details before you review your career and education for {job.title}.
          </p>
          <div className="application-step__guard-actions">
            <a className="button button--job-primary" href={buildApplicationPersonalDetailsPath(job.id)}>
              Go to personal details
            </a>
          </div>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }): JSX.Element | null {
  if (!message) {
    return null;
  }

  return (
    <span className="career-review-field-error" id={id}>
      {message}
    </span>
  );
}

interface SelectFieldOption {
  disabled: boolean;
  label: string;
  value: string;
}

function getNodeText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(getNodeText).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(value)) {
    return getNodeText(value.props.children);
  }

  return "";
}

function getSelectFieldOptions(children: ReactNode): SelectFieldOption[] {
  return Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const props = child.props as {
        children?: ReactNode;
        disabled?: boolean;
        value?: string | number;
      };

      return {
        disabled: Boolean(props.disabled),
        label: getNodeText(props.children).trim(),
        value: props.value === undefined ? "" : String(props.value)
      };
    });
}

function getNextEnabledOptionIndex(
  options: SelectFieldOption[],
  currentIndex: number,
  direction: 1 | -1
): number {
  if (options.length === 0) {
    return -1;
  }

  for (let step = 1; step <= options.length; step += 1) {
    const nextIndex = (currentIndex + step * direction + options.length) % options.length;

    if (!options[nextIndex]?.disabled) {
      return nextIndex;
    }
  }

  return -1;
}

function SelectField({
  children,
  disabled,
  error,
  id,
  label,
  onChange,
  required,
  searchable = false,
  value
}: {
  children: ReactNode;
  disabled?: boolean;
  error?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  searchable?: boolean;
  value: string;
}): JSX.Element {
  const errorId = `${id}-error`;
  const listboxId = `${id}-listbox`;
  const searchInputId = `${id}-search`;
  const fieldRootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const options = useMemo(() => getSelectFieldOptions(children), [children]);
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    if (!searchable) {
      return options;
    }

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query, searchable]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const filteredSelectedIndex = filteredOptions.findIndex((option) => option.value === value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(filteredSelectedIndex >= 0 ? filteredSelectedIndex : 0);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(
      filteredSelectedIndex >= 0
        ? filteredSelectedIndex
        : getNextEnabledOptionIndex(filteredOptions, -1, 1)
    );
    if (searchable) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 0);
    }
  }, [filteredOptions, filteredSelectedIndex, isOpen, searchable]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (filteredOptions.length === 0) {
        return -1;
      }

      if (current >= filteredOptions.length || current < 0) {
        return getNextEnabledOptionIndex(filteredOptions, -1, 1);
      }

      return current;
    });
  }, [filteredOptions]);

  const closeDropdown = (): void => {
    setIsOpen(false);
    setQuery("");
  };

  const commitOption = (option: SelectFieldOption): void => {
    if (option.disabled || disabled) {
      return;
    }

    onChange(option.value);
    closeDropdown();
    window.setTimeout(() => {
      buttonRef.current?.focus();
    }, 0);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setIsOpen(true);
      setActiveIndex((current) =>
        getNextEnabledOptionIndex(filteredOptions, current >= 0 ? current : filteredSelectedIndex, direction)
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(getNextEnabledOptionIndex(filteredOptions, -1, 1));
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(getNextEnabledOptionIndex(filteredOptions, 0, -1));
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

      const activeOption = filteredOptions[activeIndex];

      if (activeOption) {
        commitOption(activeOption);
      }
    }
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) =>
        getNextEnabledOptionIndex(filteredOptions, current >= 0 ? current : -1, direction)
      );
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(getNextEnabledOptionIndex(filteredOptions, -1, 1));
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(getNextEnabledOptionIndex(filteredOptions, 0, -1));
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
      window.setTimeout(() => {
        buttonRef.current?.focus();
      }, 0);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const activeOption = filteredOptions[activeIndex];

      if (activeOption) {
        commitOption(activeOption);
      }
    }
  };

  return (
    <div
      className="auth-field career-review-select-field"
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
        aria-activedescendant={
          isOpen && !searchable && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
        }
        aria-controls={isOpen ? listboxId : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        className={[
          "auth-field__input",
          "career-review-select-field__trigger",
          error ? "auth-field__input--error" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        data-placeholder={!selectedOption || !value ? "true" : "false"}
        disabled={disabled}
        id={id}
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        ref={buttonRef}
        role="combobox"
        type="button"
      >
        <span className="career-review-select-field__value">
          {selectedOption?.label || options[0]?.label || "Select"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="career-review-select-field__chevron"
          data-open={isOpen || undefined}
        />
      </button>

      {isOpen ? (
        <div className="career-review-select-field__panel">
          {searchable ? (
            <label className="career-review-select-field__search" htmlFor={searchInputId}>
              <Search aria-hidden="true" className="career-review-select-field__search-icon" />
              <input
                aria-activedescendant={
                  activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
                }
                aria-controls={listboxId}
                autoComplete="off"
                id={searchInputId}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={`Search ${label.toLowerCase().replace(/\s*\([^)]*\)/g, "")}`}
                role="searchbox"
                type="search"
                value={query}
              />
            </label>
          ) : null}
          <ul className="career-review-select-field__list" id={listboxId} role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  aria-disabled={option.disabled || undefined}
                  aria-selected={option.value === value}
                  className="career-review-select-field__option"
                  data-active={index === activeIndex ? "true" : "false"}
                  data-disabled={option.disabled ? "true" : "false"}
                  data-selected={option.value === value ? "true" : "false"}
                  id={`${id}-option-${index}`}
                  key={`${option.value}-${option.label}`}
                  onClick={() => {
                    commitOption(option);
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onMouseEnter={() => {
                    if (!option.disabled) {
                      setActiveIndex(index);
                    }
                  }}
                  role="option"
                  tabIndex={-1}
                >
                  <span>{option.label}</span>
                  {option.value === value ? (
                    <Check aria-hidden="true" className="career-review-select-field__check" />
                  ) : null}
                </li>
              ))
            ) : (
              <li className="career-review-select-field__empty">No matching options</li>
            )}
          </ul>
        </div>
      ) : null}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function IndustrySearchField({
  id,
  label,
  onChange,
  value
}: {
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}): JSX.Element {
  const listboxId = `${id}-listbox`;
  const searchInputId = `${id}-search`;
  const fieldRootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filteredIndustries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return INDUSTRY_OPTIONS;
    }

    return INDUSTRY_OPTIONS.filter((industry) =>
      industry.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);
  const selectedIndex = filteredIndustries.findIndex((industry) => industry === value);
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const activeIndustry = filteredIndustries[activeIndex];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);
  }, [isOpen, selectedIndex]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (filteredIndustries.length === 0) {
        return -1;
      }

      return Math.min(Math.max(current, 0), filteredIndustries.length - 1);
    });
  }, [filteredIndustries.length]);

  const closeDropdown = (): void => {
    setIsOpen(false);
    setQuery("");
  };

  const commitIndustry = (industry: string): void => {
    onChange(industry);
    closeDropdown();
    window.setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        filteredIndustries.length ? Math.min(current + 1, filteredIndustries.length - 1) : -1
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (filteredIndustries.length ? Math.max(current - 1, 0) : -1));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(filteredIndustries.length ? 0 : -1);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(filteredIndustries.length ? filteredIndustries.length - 1 : -1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
      window.setTimeout(() => {
        triggerRef.current?.focus();
      }, 0);
      return;
    }

    if (event.key === "Enter" && activeIndustry) {
      event.preventDefault();
      commitIndustry(activeIndustry);
    }
  };

  return (
    <div
      className="auth-field career-review-industry-field"
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
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="auth-field__input career-review-industry-field__trigger"
        data-placeholder={!value ? "true" : "false"}
        id={id}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
          }

          if (event.key === "Escape") {
            closeDropdown();
          }
        }}
        ref={triggerRef}
        role="combobox"
        type="button"
      >
        <span className="career-review-industry-field__value">
          {value || "Search industries"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="career-review-select-field__chevron"
          data-open={isOpen || undefined}
        />
      </button>

      {isOpen ? (
        <div className="career-review-industry-field__panel">
          <label className="career-review-industry-field__search" htmlFor={searchInputId}>
            <Search aria-hidden="true" className="career-review-industry-field__search-icon" />
            <input
              aria-activedescendant={
                activeIndex >= 0 ? `${id}-industry-option-${activeIndex}` : undefined
              }
              aria-controls={listboxId}
              autoComplete="off"
              id={searchInputId}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search industries"
              role="searchbox"
              type="search"
              value={query}
            />
          </label>

          <ul className="career-review-industry-field__list" id={listboxId} role="listbox">
            {filteredIndustries.length > 0 ? (
              filteredIndustries.map((industry, index) => (
                <li
                  aria-selected={industry === value}
                  className="career-review-industry-field__option"
                  data-active={index === activeIndex ? "true" : "false"}
                  data-selected={industry === value ? "true" : "false"}
                  id={`${id}-industry-option-${index}`}
                  key={industry}
                  onClick={() => {
                    commitIndustry(industry);
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onMouseEnter={() => {
                    setActiveIndex(index);
                  }}
                  role="option"
                  tabIndex={-1}
                >
                  <span>{industry}</span>
                  {industry === value ? (
                    <Check aria-hidden="true" className="career-review-industry-field__check" />
                  ) : null}
                </li>
              ))
            ) : (
              <li className="career-review-industry-field__empty">
                No matching industries
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function TextField({
  error,
  id,
  label,
  onChange,
  placeholder,
  required,
  value
}: {
  error?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}): JSX.Element {
  const errorId = `${id}-error`;

  return (
    <label className="auth-field">
      <span className="auth-field__label career-review-label">
        {label}
      </span>
      <input
        aria-required={required || undefined}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        className="auth-field__input"
        id={id}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      <FieldError id={errorId} message={error} />
    </label>
  );
}

function TextAreaField({
  className,
  id,
  label,
  onChange,
  placeholder,
  value
}: {
  className?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}): JSX.Element {
  return (
    <label className={["auth-field", className].filter(Boolean).join(" ")}>
      <span className="auth-field__label">{label}</span>
      <textarea
        className="auth-field__input career-review-textarea"
        id={id}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function EmptySection({
  actionLabel,
  description,
  onAdd
}: {
  actionLabel: string;
  description: string;
  onAdd: () => void;
}): JSX.Element {
  return (
    <div className="career-review-empty">
      <p>{description}</p>
      <button className="button button--ghost" onClick={onAdd} type="button">
        {actionLabel}
      </button>
    </div>
  );
}

function DetailItem({
  label,
  missing = false,
  value
}: {
  label: string;
  missing?: boolean;
  value: ReactNode;
}): JSX.Element {
  return (
    <div>
      <dt>{label}</dt>
      <dd data-missing={missing || undefined}>{missing ? "Not added" : value}</dd>
    </div>
  );
}

function RichTextPreview({
  isExpanded,
  label,
  onToggleExpanded,
  value
}: {
  isExpanded: boolean;
  label: string;
  onToggleExpanded: () => void;
  value: string;
}): JSX.Element {
  const plainText = stripRichText(value);
  const hasValue = plainText.length > 0;
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [shouldShowToggle, setShouldShowToggle] = useState(false);

  useEffect(() => {
    const contentElement = contentRef.current;

    if (!contentElement || !hasValue) {
      setShouldShowToggle(false);
      return;
    }

    const updateToggleVisibility = (): void => {
      const styles = window.getComputedStyle(contentElement);
      const fontSize = Number.parseFloat(styles.fontSize) || 14.56;
      const lineHeight =
        Number.parseFloat(styles.lineHeight) || fontSize * 1.66;
      const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;
      const tenLinePreviewHeight = lineHeight * 10 + paddingTop + paddingBottom;

      setShouldShowToggle(contentElement.scrollHeight > tenLinePreviewHeight + 2);
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
  }, [hasValue, value]);

  return (
    <div className="career-review-note career-review-note--full">
      <span>{label}</span>
      <div
        className={[
          "career-review-rich-preview",
          isExpanded && shouldShowToggle ? "career-review-rich-preview--expanded" : "",
          shouldShowToggle ? "career-review-rich-preview--has-toggle" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {hasValue ? (
          <div
            className="career-review-rich-preview__content"
            ref={contentRef}
            dangerouslySetInnerHTML={{
              __html: normalizeReviewRichTextHtml(value)
            }}
          />
        ) : (
          <p className="career-review-rich-preview__empty">Not added</p>
        )}
        {shouldShowToggle ? (
          <div className="career-review-rich-preview__footer">
            <button className="career-review-see-more" onClick={onToggleExpanded} type="button">
              {isExpanded ? "See less" : "See more"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CareerItem({
  draft,
  entry,
  errors,
  isEditing,
  isOpen,
  isPendingRemove,
  onCancel,
  onConfirmRemove,
  onDraftChange,
  onEdit,
  onRemove,
  onSave,
  onToggle,
  defaultCountryCode
}: {
  defaultCountryCode: string | null;
  draft: PrototypeCareerEntry;
  entry: PrototypeCareerEntry;
  errors?: CareerEntryErrors;
  isEditing: boolean;
  isOpen: boolean;
  isPendingRemove: boolean;
  onCancel: () => void;
  onConfirmRemove: () => void;
  onDraftChange: (
    field: keyof PrototypeCareerEntry,
    value: CandidateLocationValue | boolean | string | null
  ) => void;
  onEdit: () => void;
  onRemove: () => void;
  onSave: () => void;
  onToggle: () => void;
}): JSX.Element {
  const panelId = `career-panel-${entry.id}`;
  const headerId = `career-header-${entry.id}`;
  const completionState = hasCareerCompletion(entry) ? "complete" : "incomplete";
  const confirmRemoveRef = useRef<HTMLButtonElement | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const editorEntry = isEditing ? draft : entry;

  useEffect(() => {
    if (isPendingRemove) {
      confirmRemoveRef.current?.focus();
    }
  }, [isPendingRemove]);

  return (
    <article className="career-review-item" data-has-errors={hasErrors(errors) || undefined}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="career-review-item__summary"
        id={headerId}
        onClick={onToggle}
        type="button"
      >
        <span className="career-review-item__summary-main">
          <span className="career-review-item__title">
            {entry.jobTitle || "Job title needed"}
          </span>
          <span className="career-review-item__meta">
            {entry.company || "Company needed"} · {getCareerDateLabel(entry)}
          </span>
        </span>
        <span className="career-review-item__summary-aside">
          <span
            aria-hidden="true"
            className="career-review-item__chevron"
            data-completion={completionState}
          >
            <ChevronDown className="career-review-item__chevron-icon" data-open={isOpen || undefined} />
          </span>
          <span className="sr-only">
            {completionState === "complete" ? "All fields filled" : "Some fields are empty"}
          </span>
        </span>
      </button>

      {isOpen ? (
        <div aria-labelledby={headerId} className="career-review-item__panel" id={panelId}>
          <div className={isEditing ? "career-review-edit" : "career-review-read"}>
            <div className="career-review-read__toolbar">
              {isPendingRemove ? (
                <span className="career-review-remove-confirm">
                  Remove this role?
                  <button
                    className="button button--ghost"
                    onClick={onConfirmRemove}
                    ref={confirmRemoveRef}
                    type="button"
                  >
                    Remove
                  </button>
                  <button
                    className="button button--ghost"
                    onClick={() => {
                      onRemove();
                      window.setTimeout(() => {
                        document.getElementById(headerId)?.focus();
                      }, 0);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </span>
              ) : isEditing ? (
                <span className="career-review-item__actions">
                  <button
                    aria-label="Remove role"
                    className="career-review-icon-button"
                    onClick={onRemove}
                    title="Remove role"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="career-review-icon-button__icon" />
                  </button>
                </span>
              ) : (
                <span className="career-review-item__actions">
                  <button
                    aria-label="Edit role"
                    className="career-review-icon-button career-review-icon-button--edit"
                    onClick={onEdit}
                    title="Edit role"
                    type="button"
                  >
                    <Pencil aria-hidden="true" className="career-review-icon-button__icon" />
                  </button>
                  <button
                    aria-label="Remove role"
                    className="career-review-icon-button"
                    onClick={onRemove}
                    title="Remove role"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="career-review-icon-button__icon" />
                  </button>
                </span>
              )}
            </div>

            {isEditing ? (
              <>
              <div className="career-review-grid career-review-grid--two">
                <TextField
                  error={errors?.jobTitle}
                  id={getCareerFieldId(entry.id, "jobTitle")}
                  label="Job title"
                  onChange={(value) => {
                    onDraftChange("jobTitle", value);
                  }}
                  required
                  value={editorEntry.jobTitle}
                />
                <TextField
                  error={errors?.company}
                  id={getCareerFieldId(entry.id, "company")}
                  label="Company"
                  onChange={(value) => {
                    onDraftChange("company", value);
                  }}
                  required
                  value={editorEntry.company}
                />
              </div>

              <ApplicationLocationField
                defaultCountryCode={defaultCountryCode}
                label="Location (Optional)"
                onChange={(location) => {
                  onDraftChange("location", location);
                }}
                value={editorEntry.location}
              />

              <div className="career-review-date-shell">
                <span className="auth-field__label">Dates</span>
                <div className="career-review-date-range">
                  <div className="career-review-date-group">
                    <span className="auth-field__label career-review-date-group__label">
                      From
                    </span>
                    <div className="career-review-date-pair">
                      <SelectField
                        error={errors?.startMonth}
                        id={getCareerFieldId(entry.id, "startMonth")}
                        label="Month"
                        onChange={(value) => {
                          onDraftChange("startMonth", value);
                        }}
                        required
                        value={editorEntry.startMonth}
                      >
                        <option value="">Month</option>
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </SelectField>

                      <SelectField
                        error={errors?.startYear}
                        id={getCareerFieldId(entry.id, "startYear")}
                        label="Year"
                        onChange={(value) => {
                          onDraftChange("startYear", value);
                        }}
                        required
                        value={editorEntry.startYear}
                      >
                        <option value="">Year</option>
                        {YEAR_OPTIONS.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                  </div>

                  <div
                    aria-disabled={editorEntry.isCurrent}
                    className={`career-review-date-group${
                      editorEntry.isCurrent ? " career-review-date-group--disabled" : ""
                    }`}
                  >
                    <div className="career-review-date-group__header">
                      <span className="auth-field__label career-review-date-group__label">
                        To
                      </span>
                      <label className="career-review-checkbox career-review-checkbox--compact">
                        <input
                          checked={editorEntry.isCurrent}
                          onChange={(event) => {
                            onDraftChange("isCurrent", event.target.checked);
                          }}
                          type="checkbox"
                        />
                        <span>Current</span>
                      </label>
                    </div>
                    <div className="career-review-date-pair">
                      <SelectField
                        disabled={editorEntry.isCurrent}
                        error={errors?.endMonth}
                        id={getCareerFieldId(entry.id, "endMonth")}
                        label="Month"
                        onChange={(value) => {
                          onDraftChange("endMonth", value);
                        }}
                        required={!editorEntry.isCurrent}
                        value={editorEntry.endMonth}
                      >
                        <option value="">Month</option>
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </SelectField>

                      <SelectField
                        disabled={editorEntry.isCurrent}
                        error={errors?.endYear}
                        id={getCareerFieldId(entry.id, "endYear")}
                        label="Year"
                        onChange={(value) => {
                          onDraftChange("endYear", value);
                        }}
                        required={!editorEntry.isCurrent}
                        value={editorEntry.endYear}
                      >
                        <option value="">Year</option>
                        {YEAR_OPTIONS.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                  </div>
                </div>
              </div>

              <div className="career-review-grid career-review-grid--two career-review-grid--compact">
                <IndustrySearchField
                  id={`career-${entry.id}-industry`}
                  label="Industry (Optional)"
                  onChange={(value) => {
                    onDraftChange("industry", value);
                  }}
                  value={editorEntry.industry}
                />

                <SelectField
                  id={`career-${entry.id}-careerLevel`}
                  label="Career level (Optional)"
                  onChange={(value) => {
                    onDraftChange("careerLevel", value);
                  }}
                  value={editorEntry.careerLevel}
                >
                  <option value="">Select a level</option>
                  {CAREER_LEVEL_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </SelectField>
              </div>

              <AuthRichTextField
                className={[
                  "career-review-description-field",
                  "career-review-description-field--editor"
                ]
                  .filter(Boolean)
                  .join(" ")}
                label="Description (Optional)"
                name={`career-description-${entry.id}`}
                onChange={(value) => {
                  onDraftChange("description", value);
                }}
                placeholder="Summarise the role, responsibilities, and achievements."
                value={editorEntry.description}
              />

              <TextAreaField
                className="career-review-description-field"
                id={`career-${entry.id}-reason`}
                label="Reason for leaving (Optional)"
                onChange={(value) => {
                  onDraftChange("reasonForLeaving", value);
                }}
                placeholder="Optional"
                value={editorEntry.reasonForLeaving}
              />

              <div className="career-review-edit__footer">
                <button
                  className="button button--ghost career-review-item__edit-button"
                  onClick={onCancel}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="button career-review-item__edit-button career-review-item__edit-button--primary"
                  onClick={onSave}
                  type="button"
                >
                  Save
                </button>
              </div>
              </>
            ) : (
              <>
                <dl className="career-review-detail-grid">
                  <DetailItem
                    label="Location"
                    missing={!entry.location}
                    value={entry.location ? getCareerLocationLabel(entry.location) : ""}
                  />
                  <DetailItem
                    label="Dates"
                    missing={
                      !entry.startMonth ||
                      !entry.startYear ||
                      (!entry.isCurrent && (!entry.endMonth || !entry.endYear))
                    }
                    value={getCareerDateLabel(entry)}
                  />
                  <DetailItem label="Industry" missing={!entry.industry} value={entry.industry} />
                  <DetailItem
                    label="Career level"
                    missing={!entry.careerLevel}
                    value={entry.careerLevel}
                  />
                </dl>

                <RichTextPreview
                  isExpanded={isDescriptionExpanded}
                  label="Description"
                  onToggleExpanded={() => {
                    setIsDescriptionExpanded((current) => !current);
                  }}
                  value={entry.description}
                />

                <div className="career-review-note career-review-note--full">
                  <span>Reason for leaving</span>
                  <p data-missing={!entry.reasonForLeaving.trim() || undefined}>
                    {entry.reasonForLeaving.trim() || "Not added"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function EducationItem({
  draft,
  entry,
  errors,
  isEditing,
  isOpen,
  isPendingRemove,
  onCancel,
  onConfirmRemove,
  onDraftChange,
  onEdit,
  onRemove,
  onSave,
  onToggle
}: {
  draft: PrototypeEducationEntry;
  entry: PrototypeEducationEntry;
  errors?: EducationEntryErrors;
  isEditing: boolean;
  isOpen: boolean;
  isPendingRemove: boolean;
  onCancel: () => void;
  onConfirmRemove: () => void;
  onDraftChange: (field: keyof PrototypeEducationEntry, value: string) => void;
  onEdit: () => void;
  onRemove: () => void;
  onSave: () => void;
  onToggle: () => void;
}): JSX.Element {
  const panelId = `education-panel-${entry.id}`;
  const headerId = `education-header-${entry.id}`;
  const completionState = hasEducationCompletion(entry) ? "complete" : "incomplete";
  const confirmRemoveRef = useRef<HTMLButtonElement | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const editorEntry = isEditing ? draft : entry;

  useEffect(() => {
    if (isPendingRemove) {
      confirmRemoveRef.current?.focus();
    }
  }, [isPendingRemove]);

  return (
    <article className="career-review-item" data-has-errors={hasErrors(errors) || undefined}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="career-review-item__summary"
        id={headerId}
        onClick={onToggle}
        type="button"
      >
        <span className="career-review-item__summary-main">
          <span className="career-review-item__title">
            {getEducationTitle(entry)}
          </span>
          <span className="career-review-item__meta">
            {entry.institution || "Institution needed"} · {getEducationDateLabel(entry)}
          </span>
        </span>
        <span className="career-review-item__summary-aside">
          <span
            aria-hidden="true"
            className="career-review-item__chevron"
            data-completion={completionState}
          >
            <ChevronDown className="career-review-item__chevron-icon" data-open={isOpen || undefined} />
          </span>
          <span className="sr-only">
            {completionState === "complete" ? "All fields filled" : "Some fields are empty"}
          </span>
        </span>
      </button>

      {isOpen ? (
        <div aria-labelledby={headerId} className="career-review-item__panel" id={panelId}>
          <div className={isEditing ? "career-review-edit" : "career-review-read"}>
            <div className="career-review-read__toolbar">
              {isPendingRemove ? (
                <span className="career-review-remove-confirm">
                  Remove this education item?
                  <button
                    className="button button--ghost"
                    onClick={onConfirmRemove}
                    ref={confirmRemoveRef}
                    type="button"
                  >
                    Remove
                  </button>
                  <button
                    className="button button--ghost"
                    onClick={() => {
                      onRemove();
                      window.setTimeout(() => {
                        document.getElementById(headerId)?.focus();
                      }, 0);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                </span>
              ) : isEditing ? (
                <span className="career-review-item__actions">
                  <button
                    aria-label="Remove education item"
                    className="career-review-icon-button"
                    onClick={onRemove}
                    title="Remove education item"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="career-review-icon-button__icon" />
                  </button>
                </span>
              ) : (
                <span className="career-review-item__actions">
                  <button
                    aria-label="Edit education item"
                    className="career-review-icon-button career-review-icon-button--edit"
                    onClick={onEdit}
                    title="Edit education item"
                    type="button"
                  >
                    <Pencil aria-hidden="true" className="career-review-icon-button__icon" />
                  </button>
                  <button
                    aria-label="Remove education item"
                    className="career-review-icon-button"
                    onClick={onRemove}
                    title="Remove education item"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" className="career-review-icon-button__icon" />
                  </button>
                </span>
              )}
            </div>

            {isEditing ? (
              <>
              <div className="career-review-grid career-review-grid--two">
                <TextField
                  error={errors?.institution}
                  id={getEducationFieldId(entry.id, "institution")}
                  label="Institution"
                  onChange={(value) => {
                    onDraftChange("institution", value);
                  }}
                  required
                  value={editorEntry.institution}
                />

                <SelectField
                  error={errors?.qualification}
                  id={getEducationFieldId(entry.id, "qualification")}
                  label="Qualification"
                  onChange={(value) => {
                    onDraftChange("qualification", value);
                  }}
                  required
                  value={editorEntry.qualification}
                >
                  <option value="">Select a qualification</option>
                  {EDUCATION_QUALIFICATION_OPTIONS.map((qualification) => (
                    <option key={qualification} value={qualification}>
                      {qualification}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="career-review-grid career-review-grid--two career-review-grid--compact">
                <TextField
                  id={`education-${entry.id}-fieldOfStudy`}
                  label="Field of study (Optional)"
                  onChange={(value) => {
                    onDraftChange("fieldOfStudy", value);
                  }}
                  placeholder="Optional"
                  value={editorEntry.fieldOfStudy}
                />

                <div className="career-review-date-shell career-review-date-shell--inline">
                  <div className="career-review-date-pair career-review-date-pair--years">
                    <SelectField
                      error={errors?.startYear}
                      id={getEducationFieldId(entry.id, "startYear")}
                      label="From"
                      onChange={(value) => {
                        onDraftChange("startYear", value);
                      }}
                      required
                      value={editorEntry.startYear}
                    >
                      <option value="">Year</option>
                      {YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </SelectField>

                    <SelectField
                      error={errors?.endYear}
                      id={getEducationFieldId(entry.id, "endYear")}
                      label="To"
                      onChange={(value) => {
                        onDraftChange("endYear", value);
                      }}
                      required
                      value={editorEntry.endYear}
                    >
                      <option value="">Year</option>
                      {YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </SelectField>
                  </div>
                </div>
              </div>

              <AuthRichTextField
                className={[
                  "career-review-description-field",
                  "career-review-description-field--editor"
                ]
                  .filter(Boolean)
                  .join(" ")}
                label="Description (Optional)"
                name={`education-description-${entry.id}`}
                onChange={(value) => {
                  onDraftChange("description", value);
                }}
                placeholder="Add a short note about the qualification or coursework."
                value={editorEntry.description}
              />

              <div className="career-review-edit__footer">
                <button
                  className="button button--ghost career-review-item__edit-button"
                  onClick={onCancel}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="button career-review-item__edit-button career-review-item__edit-button--primary"
                  onClick={onSave}
                  type="button"
                >
                  Save
                </button>
              </div>
              </>
            ) : (
              <>
                <dl className="career-review-detail-grid">
                  <DetailItem
                    label="Institution"
                    missing={!entry.institution.trim()}
                    value={entry.institution}
                  />
                  <DetailItem
                    label="Qualification"
                    missing={!entry.qualification}
                    value={entry.qualification}
                  />
                  <DetailItem
                    label="Field of study"
                    missing={!entry.fieldOfStudy.trim()}
                    value={entry.fieldOfStudy}
                  />
                  <DetailItem
                    label="Years"
                    missing={!entry.startYear || !entry.endYear}
                    value={getEducationDateLabel(entry)}
                  />
                </dl>

                <RichTextPreview
                  isExpanded={isDescriptionExpanded}
                  label="Description"
                  onToggleExpanded={() => {
                    setIsDescriptionExpanded((current) => !current);
                  }}
                  value={entry.description}
                />
              </>
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function ReadyState({
  job,
  resumeState,
  session
}: {
  job: JobViewData;
  resumeState: CandidateResumeState | null;
  session: CandidateSession | null;
}): JSX.Element {
  const selectedResume = useMemo(
    () =>
      resumeState?.resumes.find((resume) => resume.id === resumeState.selectedResumeId) ??
      resumeState?.resumes[0] ??
      null,
    [resumeState]
  );
  const personalDetailsState = useMemo<CandidatePersonalDetailsState | null>(
    () => (session ? readPrototypePersonalDetailsState(session, job.id) : null),
    [job.id, session]
  );

  const [historyState, setHistoryState] = useState<CandidateCareerHistoryState | null>(null);
  const [openCareerId, setOpenCareerId] = useState<string | null>(null);
  const [openEducationId, setOpenEducationId] = useState<string | null>(null);
  const [careerDrafts, setCareerDrafts] = useState<Record<string, PrototypeCareerEntry>>({});
  const [educationDrafts, setEducationDrafts] = useState<Record<string, PrototypeEducationEntry>>({});
  const [newCareerIds, setNewCareerIds] = useState<string[]>([]);
  const [newEducationIds, setNewEducationIds] = useState<string[]>([]);
  const [careerErrors, setCareerErrors] = useState<Record<string, CareerEntryErrors>>({});
  const [educationErrors, setEducationErrors] = useState<Record<string, EducationEntryErrors>>({});
  const [pendingRemoveKey, setPendingRemoveKey] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);
  const [isEmptyStatePreview, setIsEmptyStatePreview] = useState(false);
  const careerAddRef = useRef<HTMLButtonElement | null>(null);
  const educationAddRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!session || !selectedResume) {
      setHistoryState(null);
      return;
    }

    const existing = readPrototypeCareerHistoryState(session, job.id);
    const nextState =
      existing && existing.sourceResumeId === selectedResume.id
        ? existing
        : buildPrototypeCareerHistoryState(job, selectedResume.id);

    setHistoryState(nextState);
    savePrototypeCareerHistoryState(session, job.id, nextState);
  }, [job, selectedResume, session]);

  useEffect(() => {
    if (!session || !historyState) {
      return;
    }

    savePrototypeCareerHistoryState(session, job.id, historyState);
  }, [historyState, job.id, session]);

  if (!session) {
    return <SessionGuard job={job} />;
  }

  if (!selectedResume) {
    return <MissingResumeState job={job} />;
  }

  if (personalDetailsState?.status !== "complete") {
    return <MissingPersonalDetailsState job={job} />;
  }

  if (!historyState) {
    return <LoadingState />;
  }

  const defaultCareerCountryCode =
    personalDetailsState.location?.countryCode ?? personalDetailsState.detectedCountryCode;

  const updateCareerEntries = (updater: (entries: PrototypeCareerEntry[]) => PrototypeCareerEntry[]): void => {
    setHistoryState((current) => {
      if (!current) {
        return current;
      }

      const careerEntries = updater(current.careerEntries);

      return {
        ...current,
        careerEntries,
        entries: careerEntries
      };
    });
  };

  const updateEducationEntries = (
    updater: (entries: PrototypeEducationEntry[]) => PrototypeEducationEntry[]
  ): void => {
    setHistoryState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        educationEntries: updater(current.educationEntries)
      };
    });
  };

  const focusCareerField = (entryId: string, field: keyof CareerEntryErrors): void => {
    window.setTimeout(() => {
      document.getElementById(getCareerFieldId(entryId, field))?.focus();
    }, 0);
  };

  const focusEducationField = (entryId: string, field: keyof EducationEntryErrors): void => {
    window.setTimeout(() => {
      document.getElementById(getEducationFieldId(entryId, field))?.focus();
    }, 0);
  };

  const handleCareerDraftChange = (
    entryId: string,
    field: keyof PrototypeCareerEntry,
    value: CandidateLocationValue | boolean | string | null
  ): void => {
    setCareerDrafts((current) => {
      const existingDraft =
        current[entryId] ?? historyState.careerEntries.find((entry) => entry.id === entryId);

      if (!existingDraft) {
        return current;
      }

      const nextEntry: PrototypeCareerEntry = {
        ...existingDraft,
        [field]: value,
        source: "manual"
      };

      if (field === "isCurrent" && value === true) {
        nextEntry.endMonth = "";
        nextEntry.endYear = "";
      }

      return {
        ...current,
        [entryId]: nextEntry
      };
    });
    setCareerErrors((current) => ({
      ...current,
      [entryId]: {}
    }));
    setFormNotice(null);
  };

  const handleEducationDraftChange = (
    entryId: string,
    field: keyof PrototypeEducationEntry,
    value: string
  ): void => {
    setEducationDrafts((current) => {
      const existingDraft =
        current[entryId] ?? historyState.educationEntries.find((entry) => entry.id === entryId);

      if (!existingDraft) {
        return current;
      }

      return {
        ...current,
        [entryId]: {
          ...existingDraft,
          [field]: value,
          source: "manual"
        }
      };
    });
    setEducationErrors((current) => ({
      ...current,
      [entryId]: {}
    }));
    setFormNotice(null);
  };

  const beginCareerEdit = (entry: PrototypeCareerEntry): void => {
    setOpenCareerId(entry.id);
    setPendingRemoveKey(null);
    setCareerDrafts((current) => ({
      ...current,
      [entry.id]: { ...entry }
    }));
    focusCareerField(entry.id, "jobTitle");
  };

  const beginEducationEdit = (entry: PrototypeEducationEntry): void => {
    setOpenEducationId(entry.id);
    setPendingRemoveKey(null);
    setEducationDrafts((current) => ({
      ...current,
      [entry.id]: { ...entry }
    }));
    focusEducationField(entry.id, "institution");
  };

  const cancelCareerEdit = (entryId: string): void => {
    setCareerDrafts((current) => {
      const { [entryId]: _removed, ...rest } = current;
      return rest;
    });
    setCareerErrors((current) => {
      const { [entryId]: _removed, ...rest } = current;
      return rest;
    });

    if (newCareerIds.includes(entryId)) {
      updateCareerEntries((entries) => entries.filter((entry) => entry.id !== entryId));
      setNewCareerIds((current) => current.filter((id) => id !== entryId));
      setOpenCareerId(null);
      window.setTimeout(() => {
        careerAddRef.current?.focus();
      }, 0);
      return;
    }

    window.setTimeout(() => {
      document.getElementById(`career-header-${entryId}`)?.focus();
    }, 0);
  };

  const cancelEducationEdit = (entryId: string): void => {
    setEducationDrafts((current) => {
      const { [entryId]: _removed, ...rest } = current;
      return rest;
    });
    setEducationErrors((current) => {
      const { [entryId]: _removed, ...rest } = current;
      return rest;
    });

    if (newEducationIds.includes(entryId)) {
      updateEducationEntries((entries) => entries.filter((entry) => entry.id !== entryId));
      setNewEducationIds((current) => current.filter((id) => id !== entryId));
      setOpenEducationId(null);
      window.setTimeout(() => {
        educationAddRef.current?.focus();
      }, 0);
      return;
    }

    window.setTimeout(() => {
      document.getElementById(`education-header-${entryId}`)?.focus();
    }, 0);
  };

  const saveCareerDraft = (entryId: string): void => {
    const draft = careerDrafts[entryId];

    if (!draft) {
      return;
    }

    const nextErrors = validateCareerEntry(draft);
    setCareerErrors((current) => ({
      ...current,
      [entryId]: nextErrors
    }));

    if (hasErrors(nextErrors)) {
      const firstField = getFirstCareerErrorField(nextErrors);
      if (firstField) {
        focusCareerField(entryId, firstField);
      }
      return;
    }

    updateCareerEntries((entries) =>
      entries.map((entry) =>
        entry.id === entryId
          ? {
              ...draft,
              source: "manual"
            }
          : entry
      )
    );
    setCareerDrafts((current) => {
      const { [entryId]: _removed, ...rest } = current;
      return rest;
    });
    setNewCareerIds((current) => current.filter((id) => id !== entryId));
    setFormNotice(null);
    window.setTimeout(() => {
      document.getElementById(`career-header-${entryId}`)?.focus();
    }, 0);
  };

  const saveEducationDraft = (entryId: string): void => {
    const draft = educationDrafts[entryId];

    if (!draft) {
      return;
    }

    const nextErrors = validateEducationEntry(draft);
    setEducationErrors((current) => ({
      ...current,
      [entryId]: nextErrors
    }));

    if (hasErrors(nextErrors)) {
      const firstField = getFirstEducationErrorField(nextErrors);
      if (firstField) {
        focusEducationField(entryId, firstField);
      }
      return;
    }

    updateEducationEntries((entries) =>
      entries.map((entry) =>
        entry.id === entryId
          ? {
              ...draft,
              source: "manual"
            }
          : entry
      )
    );
    setEducationDrafts((current) => {
      const { [entryId]: _removed, ...rest } = current;
      return rest;
    });
    setNewEducationIds((current) => current.filter((id) => id !== entryId));
    setFormNotice(null);
    window.setTimeout(() => {
      document.getElementById(`education-header-${entryId}`)?.focus();
    }, 0);
  };

  const addCareerEntry = (): void => {
    const entry = createEmptyCareerEntry();
    setIsEmptyStatePreview(false);
    updateCareerEntries((entries) => [...entries, entry]);
    setCareerDrafts((current) => ({
      ...current,
      [entry.id]: { ...entry }
    }));
    setNewCareerIds((current) => [...current, entry.id]);
    setOpenCareerId(entry.id);
    setFormNotice(null);
    window.setTimeout(() => {
      document.getElementById(getCareerFieldId(entry.id, "jobTitle"))?.focus();
    }, 0);
  };

  const addEducationEntry = (): void => {
    const entry = createEmptyEducationEntry();
    setIsEmptyStatePreview(false);
    updateEducationEntries((entries) => [...entries, entry]);
    setEducationDrafts((current) => ({
      ...current,
      [entry.id]: { ...entry }
    }));
    setNewEducationIds((current) => [...current, entry.id]);
    setOpenEducationId(entry.id);
    setFormNotice(null);
    window.setTimeout(() => {
      document.getElementById(getEducationFieldId(entry.id, "institution"))?.focus();
    }, 0);
  };

  const removeCareerEntry = (entryId: string): void => {
    const nextEntry =
      historyState.careerEntries.find((entry) => entry.id !== entryId) ?? null;
    updateCareerEntries((entries) => entries.filter((entry) => entry.id !== entryId));
    setCareerDrafts((current) => {
      const { [entryId]: _removed, ...rest } = current;
      return rest;
    });
    setCareerErrors((current) => {
      const { [entryId]: _removed, ...rest } = current;
      return rest;
    });
    setNewCareerIds((current) => current.filter((id) => id !== entryId));
    setPendingRemoveKey(null);
    setOpenCareerId(nextEntry?.id ?? null);
    window.setTimeout(() => {
      if (nextEntry) {
        document.getElementById(`career-header-${nextEntry.id}`)?.focus();
        return;
      }
      careerAddRef.current?.focus();
    }, 0);
  };

  const removeEducationEntry = (entryId: string): void => {
    const nextEntry =
      historyState.educationEntries.find((entry) => entry.id !== entryId) ?? null;
    updateEducationEntries((entries) => entries.filter((entry) => entry.id !== entryId));
    setEducationDrafts((current) => {
      const { [entryId]: _removed, ...rest } = current;
      return rest;
    });
    setEducationErrors((current) => {
      const { [entryId]: _removed, ...rest } = current;
      return rest;
    });
    setNewEducationIds((current) => current.filter((id) => id !== entryId));
    setPendingRemoveKey(null);
    setOpenEducationId(nextEntry?.id ?? null);
    window.setTimeout(() => {
      if (nextEntry) {
        document.getElementById(`education-header-${nextEntry.id}`)?.focus();
        return;
      }
      educationAddRef.current?.focus();
    }, 0);
  };

  const validateCommittedEntries = (): boolean => {
    const careerEntriesToValidate = isEmptyStatePreview ? [] : historyState.careerEntries;
    const educationEntriesToValidate = isEmptyStatePreview ? [] : historyState.educationEntries;
    const openCareerDraft = Object.values(careerDrafts)[0];

    if (!isEmptyStatePreview && openCareerDraft) {
      const errors = validateCareerEntry(openCareerDraft);
      setOpenCareerId(openCareerDraft.id);
      setCareerErrors((current) => ({
        ...current,
        [openCareerDraft.id]: errors
      }));
      setFormNotice("Save or cancel the open career edit before continuing.");

      const firstField = getFirstCareerErrorField(errors);
      if (firstField) {
        focusCareerField(openCareerDraft.id, firstField);
      } else {
        window.setTimeout(() => {
          document.getElementById(`career-header-${openCareerDraft.id}`)?.focus();
        }, 0);
      }

      return false;
    }

    const openEducationDraft = Object.values(educationDrafts)[0];

    if (!isEmptyStatePreview && openEducationDraft) {
      const errors = validateEducationEntry(openEducationDraft);
      setOpenEducationId(openEducationDraft.id);
      setEducationErrors((current) => ({
        ...current,
        [openEducationDraft.id]: errors
      }));
      setFormNotice("Save or cancel the open education edit before continuing.");

      const firstField = getFirstEducationErrorField(errors);
      if (firstField) {
        focusEducationField(openEducationDraft.id, firstField);
      } else {
        window.setTimeout(() => {
          document.getElementById(`education-header-${openEducationDraft.id}`)?.focus();
        }, 0);
      }

      return false;
    }

    const nextCareerErrors = careerEntriesToValidate.reduce<Record<string, CareerEntryErrors>>(
      (result, entry) => {
        const errors = validateCareerEntry(entry);
        if (hasErrors(errors)) {
          result[entry.id] = errors;
        }
        return result;
      },
      {}
    );
    const nextEducationErrors = educationEntriesToValidate.reduce<Record<string, EducationEntryErrors>>(
      (result, entry) => {
        const errors = validateEducationEntry(entry);
        if (hasErrors(errors)) {
          result[entry.id] = errors;
        }
        return result;
      },
      {}
    );

    setCareerErrors(nextCareerErrors);
    setEducationErrors(nextEducationErrors);

    const firstCareerError = careerEntriesToValidate.find((entry) => nextCareerErrors[entry.id]);
    if (firstCareerError) {
      const firstField = getFirstCareerErrorField(nextCareerErrors[firstCareerError.id]);
      setOpenCareerId(firstCareerError.id);
      setCareerDrafts((current) => ({
        ...current,
        [firstCareerError.id]: { ...firstCareerError }
      }));
      setFormNotice("Check the highlighted career item before continuing.");
      if (firstField) {
        focusCareerField(firstCareerError.id, firstField);
      }
      return false;
    }

    const firstEducationError = educationEntriesToValidate.find(
      (entry) => nextEducationErrors[entry.id]
    );
    if (firstEducationError) {
      const firstField = getFirstEducationErrorField(nextEducationErrors[firstEducationError.id]);
      setOpenEducationId(firstEducationError.id);
      setEducationDrafts((current) => ({
        ...current,
        [firstEducationError.id]: { ...firstEducationError }
      }));
      setFormNotice("Check the highlighted education item before continuing.");
      if (firstField) {
        focusEducationField(firstEducationError.id, firstField);
      }
      return false;
    }

    return true;
  };

  const handleContinue = (): void => {
    if (!validateCommittedEntries()) {
      return;
    }

    navigateTo(buildApplicationConfirmPath(job.id), {
      payload: {
        transitionAt: new Date().toISOString(),
        transitionSource: "career-education-review"
      }
    });
  };

  const visibleCareerEntries = isEmptyStatePreview ? [] : historyState.careerEntries;
  const visibleEducationEntries = isEmptyStatePreview ? [] : historyState.educationEntries;

  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section className="application-step__panel career-history-card resume-upload-card surface-card">
          <header className="resume-upload-card__header career-history-card__header">
            <p className="section-kicker">Career & education</p>
            <h1>Review your career</h1>
            <p className="resume-upload-card__lead">
              Please review your work experience and education before submitting your application.
            </p>
          </header>

          <CompanyApplicationHeading job={job} session={session} />

          <label className="career-review-preview-toggle">
            <span>
              <strong>Empty state preview</strong>
              <span>Temporarily hide all parsed career and education items.</span>
            </span>
            <input
              checked={isEmptyStatePreview}
              onChange={(event) => {
                setIsEmptyStatePreview(event.target.checked);
                setOpenCareerId(null);
                setOpenEducationId(null);
                setCareerDrafts({});
                setEducationDrafts({});
                setCareerErrors({});
                setEducationErrors({});
                setPendingRemoveKey(null);
                setFormNotice(null);
              }}
              type="checkbox"
            />
          </label>

          <div className="career-history-card__body">
            {formNotice ? (
              <div className="career-review-alert" role="alert">
                {formNotice}
              </div>
            ) : null}

            <section className="career-review-section" aria-labelledby="career-review-career-title">
              <div className="career-review-section__header">
                <div>
                  <p className="section-kicker">Experience</p>
                  <h2 id="career-review-career-title">Career</h2>
                </div>
                <button
                  aria-label="Add career role"
                  className="button button--ghost career-review-section__add-button"
                  onClick={addCareerEntry}
                  ref={careerAddRef}
                  type="button"
                >
                  <Plus aria-hidden="true" className="career-review-section__add-icon" />
                </button>
              </div>

              <div className="career-review-list">
                {visibleCareerEntries.length > 0 ? (
                  visibleCareerEntries.map((entry) => (
                    <CareerItem
                      defaultCountryCode={defaultCareerCountryCode}
                      draft={careerDrafts[entry.id] ?? entry}
                      entry={entry}
                      errors={careerErrors[entry.id]}
                      isEditing={Boolean(careerDrafts[entry.id])}
                      isOpen={openCareerId === entry.id}
                      isPendingRemove={pendingRemoveKey === `career:${entry.id}`}
                      key={entry.id}
                      onCancel={() => {
                        cancelCareerEdit(entry.id);
                      }}
                      onConfirmRemove={() => {
                        removeCareerEntry(entry.id);
                      }}
                      onDraftChange={(field, value) => {
                        handleCareerDraftChange(entry.id, field, value);
                      }}
                      onEdit={() => {
                        beginCareerEdit(entry);
                      }}
                      onRemove={() => {
                        setPendingRemoveKey((current) =>
                          current === `career:${entry.id}` ? null : `career:${entry.id}`
                        );
                      }}
                      onSave={() => {
                        saveCareerDraft(entry.id);
                      }}
                      onToggle={() => {
                        setOpenCareerId((current) => (current === entry.id ? null : entry.id));
                      }}
                    />
                  ))
                ) : (
                  <EmptySection
                    actionLabel="Add role"
                    description="No career roles are listed yet. Add one if you want it included in your profile."
                    onAdd={addCareerEntry}
                  />
                )}
              </div>
            </section>

            <section className="career-review-section" aria-labelledby="career-review-education-title">
              <div className="career-review-section__header">
                <div>
                  <p className="section-kicker">Education</p>
                  <h2 id="career-review-education-title">Qualifications</h2>
                </div>
                <button
                  aria-label="Add education item"
                  className="button button--ghost career-review-section__add-button"
                  onClick={addEducationEntry}
                  ref={educationAddRef}
                  type="button"
                >
                  <Plus aria-hidden="true" className="career-review-section__add-icon" />
                </button>
              </div>

              <div className="career-review-list">
                {visibleEducationEntries.length > 0 ? (
                  visibleEducationEntries.map((entry) => (
                    <EducationItem
                      draft={educationDrafts[entry.id] ?? entry}
                      entry={entry}
                      errors={educationErrors[entry.id]}
                      isEditing={Boolean(educationDrafts[entry.id])}
                      isOpen={openEducationId === entry.id}
                      isPendingRemove={pendingRemoveKey === `education:${entry.id}`}
                      key={entry.id}
                      onCancel={() => {
                        cancelEducationEdit(entry.id);
                      }}
                      onConfirmRemove={() => {
                        removeEducationEntry(entry.id);
                      }}
                      onDraftChange={(field, value) => {
                        handleEducationDraftChange(entry.id, field, value);
                      }}
                      onEdit={() => {
                        beginEducationEdit(entry);
                      }}
                      onRemove={() => {
                        setPendingRemoveKey((current) =>
                          current === `education:${entry.id}` ? null : `education:${entry.id}`
                        );
                      }}
                      onSave={() => {
                        saveEducationDraft(entry.id);
                      }}
                      onToggle={() => {
                        setOpenEducationId((current) => (current === entry.id ? null : entry.id));
                      }}
                    />
                  ))
                ) : (
                  <EmptySection
                    actionLabel="Add education"
                    description="No education items are listed yet. Add one if it should appear in your profile."
                    onAdd={addEducationEntry}
                  />
                )}
              </div>
            </section>
          </div>

          <footer className="resume-upload-card__footer career-history-card__footer">
            <div className="career-history-card__footer-row">
              <a className="button button--ghost" href={buildApplicationPersonalDetailsPath(job.id)}>
                Back
              </a>
              <button className="button button--job-primary" onClick={handleContinue} type="button">
                Finish Application
              </button>
            </div>
          </footer>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

export function ApplicationCareerHistoryPage({
  jobId
}: ApplicationCareerHistoryPageProps): JSX.Element {
  const [state, setState] = useState<LoadState>("loading");
  const [job, setJob] = useState<JobViewData | null>(null);
  const [session, setSession] = useState<CandidateSession | null>(null);
  const [resumeState, setResumeState] = useState<CandidateResumeState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const prototypeSession = readPrototypeSession();

    setState("loading");
    setJob(null);
    setSession(prototypeSession);
    setResumeState(prototypeSession ? readPrototypeResumeState(prototypeSession.email) : null);

    getJobView(jobId).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result) {
        setState("missing");
        return;
      }

      setJob(result);
      setState("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  if (state === "loading") {
    return <LoadingState />;
  }

  if (state === "missing" || !job) {
    return <MissingState />;
  }

  return <ReadyState job={job} resumeState={resumeState} session={session} />;
}

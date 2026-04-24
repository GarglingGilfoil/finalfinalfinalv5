import type {
  CandidateCareerHistoryState,
  CandidateLocationValue,
  CandidateSession,
  PrototypeCareerEntry,
  PrototypeCareerLevel,
  PrototypeEducationEntry,
  PrototypeEducationQualification
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import {
  buildApplicationLocationValue,
  findLocationCityInCountry
} from "./location-data";

const CAREER_HISTORY_STORAGE_PREFIX = "ditto-jobs.prototype-career-history";
const CAREER_HISTORY_STATE_VERSION = 4;

const MONTH_LABEL_TO_VALUE: Record<string, string> = {
  apr: "04",
  april: "04",
  aug: "08",
  august: "08",
  dec: "12",
  december: "12",
  feb: "02",
  february: "02",
  jan: "01",
  january: "01",
  jul: "07",
  july: "07",
  jun: "06",
  june: "06",
  mar: "03",
  march: "03",
  may: "05",
  nov: "11",
  november: "11",
  oct: "10",
  october: "10",
  sep: "09",
  sept: "09",
  september: "09"
};
const VALID_MONTH_VALUES = new Set(Object.values(MONTH_LABEL_TO_VALUE));

const CAREER_LEVELS: PrototypeCareerLevel[] = [
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

const EDUCATION_QUALIFICATIONS: PrototypeEducationQualification[] = [
  "Certificate",
  "Diploma",
  "Degree",
  "Post-Graduate",
  "Honours",
  "Masters",
  "Doctorate",
  "Other"
];

interface ParsedDateLabel {
  month: string;
  year: string;
}

function getStorageKey(email: string, jobId: string): string {
  return `${CAREER_HISTORY_STORAGE_PREFIX}:${encodeURIComponent(email.trim().toLowerCase())}:${jobId}`;
}

function buildCareerLocation(cityName: string, countryCode = "ZA"): CandidateLocationValue | null {
  const city = findLocationCityInCountry(countryCode, cityName);

  if (!city) {
    return null;
  }

  return buildApplicationLocationValue(city);
}

function buildSeededEntries(job: JobViewData): PrototypeCareerEntry[] {
  return [
    {
      id: "career-entry-ditto",
      jobTitle: job.title === "Senior React Engineer" ? "Senior React Engineer" : "Senior Frontend Engineer",
      company: "Ditto",
      location: buildCareerLocation("Cape Town"),
      startMonth: "01",
      startYear: "2022",
      endMonth: "",
      endYear: "",
      isCurrent: true,
      industry: "Technology",
      careerLevel: "Senior",
      description:
        "<p>Led front-end product work across candidate-facing flows, with a focus on turning complex application tasks into calm, guided interfaces. Owned React implementation for high-value user journeys, partnered closely with product and design, and helped shape reusable patterns for forms, review states, validation, and responsive layouts.</p><p>Improved performance and reliability across core screens by simplifying state management, tightening component contracts, and reducing layout instability. Mentored junior engineers, reviewed pull requests, and contributed to design-system decisions so that new product work could move faster without sacrificing polish or accessibility.</p>",
      reasonForLeaving: "",
      source: "parsed"
    },
    {
      id: "career-entry-takealot",
      jobTitle: "Frontend Engineer",
      company: "Takealot",
      location: buildCareerLocation("Cape Town"),
      startMonth: "05",
      startYear: "2019",
      endMonth: "12",
      endYear: "2021",
      isCurrent: false,
      industry: "E-commerce",
      careerLevel: "Mid Level",
      description:
        "<p>Built and maintained responsive commerce experiences used by customers across desktop and mobile. Worked across product detail pages, campaign landing pages, checkout-adjacent flows, and operational tooling, balancing fast delivery cycles with clean component structure and careful QA.</p><p>Collaborated with designers, backend engineers, merchandisers, and analytics teams to ship improvements that made high-traffic pages easier to browse and maintain. Helped modernise legacy JavaScript patterns into more predictable React components and documented practical UI decisions for the wider team.</p>",
      reasonForLeaving: "Accepted a senior product engineering opportunity.",
      source: "parsed"
    },
    {
      id: "career-entry-onedayonly",
      jobTitle: "UI Developer",
      company: "OneDayOnly",
      location: buildCareerLocation("Cape Town"),
      startMonth: "02",
      startYear: "2016",
      endMonth: "04",
      endYear: "2019",
      isCurrent: false,
      industry: "Advertising Industry",
      careerLevel: "Junior",
      description:
        "<p>Created campaign interfaces, landing pages, and reusable UI patterns for fast-moving digital promotions. Translated campaign concepts into responsive front-end builds, prepared assets for launch, and handled the small visual details that made promotional pages feel sharp under tight timelines.</p><p>Worked closely with creative and account teams to keep layouts on-brand while still practical to maintain. Gained strong experience with HTML, CSS, JavaScript, accessibility basics, browser testing, and the discipline required to ship polished interfaces quickly.</p>",
      reasonForLeaving: "Moved into a broader frontend engineering role.",
      source: "parsed"
    }
  ];
}

function buildSeededEducationEntries(): PrototypeEducationEntry[] {
  return [
    {
      id: "education-entry-bcomm",
      institution: "University of Cape Town",
      qualification: "Degree",
      fieldOfStudy: "BComm Information Systems",
      startYear: "2013",
      endYear: "2016",
      description:
        "<p>Completed commerce and information systems coursework with a focus on digital business, systems analysis, data-informed decision-making, and applied technology. The programme combined business fundamentals with practical systems thinking, giving a strong foundation for understanding how software supports real organisational workflows.</p><p>Coursework included business analysis, information systems strategy, project work, database concepts, and user-centred problem solving. This background supports a product-minded engineering approach: understanding commercial goals, translating ambiguous needs into structured requirements, and communicating clearly with both technical and non-technical teams.</p>",
      source: "parsed"
    }
  ];
}

function refreshSeededCareerEntry(entry: PrototypeCareerEntry): PrototypeCareerEntry {
  const seededEntry = buildSeededEntries({ title: "Senior React Engineer" } as JobViewData).find(
    (candidate) => candidate.id === entry.id
  );

  if (!seededEntry || entry.source !== "parsed") {
    return entry;
  }

  return {
    ...entry,
    description: seededEntry.description,
    reasonForLeaving: entry.reasonForLeaving || seededEntry.reasonForLeaving
  };
}

function refreshSeededEducationEntry(entry: PrototypeEducationEntry): PrototypeEducationEntry {
  const seededEntry = buildSeededEducationEntries().find((candidate) => candidate.id === entry.id);

  if (!seededEntry || entry.source !== "parsed") {
    return entry;
  }

  return {
    ...entry,
    description: seededEntry.description,
    fieldOfStudy: entry.fieldOfStudy || seededEntry.fieldOfStudy
  };
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeCareerLocation(value: unknown): CandidateLocationValue | null {
  if (typeof value === "string") {
    return buildCareerLocation(value);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const location = value as Partial<Record<keyof CandidateLocationValue, unknown>>;
  const cityName = readString(location.cityName);
  const countryCode = readString(location.countryCode);
  const countryName = readString(location.countryName);
  const label = readString(location.label);

  if (!cityName || !countryCode || !countryName || !label) {
    return null;
  }

  return {
    cityId: readString(location.cityId) || `${countryCode}:${cityName}`.toLowerCase(),
    cityName,
    countryCode,
    countryName,
    label,
    stateCode: readString(location.stateCode) || undefined,
    stateName: readString(location.stateName) || undefined
  };
}

function readMonth(value: unknown): string {
  const month = readString(value);

  return VALID_MONTH_VALUES.has(month) ? month : "";
}

function readYear(value: unknown): string {
  const year = readString(value);

  if (!/^(19|20)\d{2}$/.test(year)) {
    return "";
  }

  const numericYear = Number(year);
  const currentYear = new Date().getFullYear();

  return numericYear >= 1970 && numericYear <= currentYear ? year : "";
}

function readStoredDate(value: unknown): string {
  const date = readString(value);

  return Number.isNaN(new Date(date).getTime()) ? new Date().toISOString() : date;
}

function readCareerLevel(value: unknown): PrototypeCareerLevel | "" {
  return CAREER_LEVELS.includes(value as PrototypeCareerLevel) ? (value as PrototypeCareerLevel) : "";
}

function readEducationQualification(value: unknown): PrototypeEducationQualification | "" {
  const rawValue = readString(value).toLowerCase();

  if (EDUCATION_QUALIFICATIONS.includes(value as PrototypeEducationQualification)) {
    return value as PrototypeEducationQualification;
  }

  if (rawValue.includes("doctor") || rawValue.includes("phd")) {
    return "Doctorate";
  }

  if (rawValue.includes("master")) {
    return "Masters";
  }

  if (rawValue.includes("honour")) {
    return "Honours";
  }

  if (rawValue.includes("post")) {
    return "Post-Graduate";
  }

  if (rawValue.includes("degree") || rawValue.includes("bachelor")) {
    return "Degree";
  }

  if (rawValue.includes("diploma")) {
    return "Diploma";
  }

  if (rawValue.includes("certificate")) {
    return "Certificate";
  }

  return "";
}

function parseDateLabel(value: unknown): ParsedDateLabel {
  const label = readString(value).trim();
  const yearMatch = label.match(/\b(19|20)\d{2}\b/);
  const monthMatch = label.match(/[A-Za-z]+/);
  const month = monthMatch ? MONTH_LABEL_TO_VALUE[monthMatch[0].toLowerCase()] ?? "" : "";

  return {
    month,
    year: readYear(yearMatch?.[0])
  };
}

function normalizeCareerEntry(value: unknown, index: number): PrototypeCareerEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Record<string, unknown>;
  const startDate = parseDateLabel(entry.startDateLabel);
  const endDate = parseDateLabel(entry.endDateLabel);
  const jobTitle = readString(entry.jobTitle) || readString(entry.roleTitle);
  const company = readString(entry.company) || readString(entry.companyName);

  if (!jobTitle && !company) {
    return null;
  }

  return {
    id: readString(entry.id) || `career-entry-migrated-${index + 1}`,
    jobTitle,
    company,
    location: normalizeCareerLocation(entry.location),
    startMonth: readMonth(entry.startMonth) || startDate.month,
    startYear: readYear(entry.startYear) || startDate.year,
    endMonth: readMonth(entry.endMonth) || endDate.month,
    endYear: readYear(entry.endYear) || endDate.year,
    isCurrent: readBoolean(entry.isCurrent) || readString(entry.endDateLabel).toLowerCase() === "present",
    industry: readString(entry.industry),
    careerLevel: readCareerLevel(entry.careerLevel),
    description: readString(entry.description),
    reasonForLeaving: readString(entry.reasonForLeaving),
    source: entry.source === "manual" ? "manual" : "parsed"
  };
}

function normalizeEducationEntry(value: unknown, index: number): PrototypeEducationEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Record<string, unknown>;
  const startDate = parseDateLabel(entry.startDateLabel);
  const endDate = parseDateLabel(entry.endDateLabel);
  const institution = readString(entry.institution) || readString(entry.institutionName);
  const qualification =
    readEducationQualification(entry.qualification) ||
    readEducationQualification(entry.qualificationName);

  if (!institution && !qualification) {
    return null;
  }

  return {
    id: readString(entry.id) || `education-entry-migrated-${index + 1}`,
    institution,
    qualification,
    fieldOfStudy: readString(entry.fieldOfStudy),
    startYear: readYear(entry.startYear) || startDate.year,
    endYear: readYear(entry.endYear) || endDate.year,
    description: readString(entry.description),
    source: entry.source === "manual" ? "manual" : "parsed"
  };
}

function normalizeCareerEntries(value: unknown): PrototypeCareerEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeCareerEntry(entry, index))
    .filter((entry): entry is PrototypeCareerEntry => Boolean(entry));
}

function normalizeEducationEntries(value: unknown): PrototypeEducationEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeEducationEntry(entry, index))
    .filter((entry): entry is PrototypeEducationEntry => Boolean(entry));
}

function normalizeCareerHistoryState(
  value: unknown,
  options: { preferCompatibilityEntries?: boolean } = {}
): CandidateCareerHistoryState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const parsed = value as Partial<
    Omit<CandidateCareerHistoryState, "entries" | "careerEntries" | "educationEntries"> & {
      careerEntries: unknown;
      educationEntries: unknown;
      entries: unknown;
    }
  >;
  const careerEntrySource =
    options.preferCompatibilityEntries && Array.isArray(parsed.entries)
      ? parsed.entries
      : Array.isArray(parsed.careerEntries)
        ? parsed.careerEntries
        : parsed.entries;
  const careerEntries = normalizeCareerEntries(careerEntrySource).map(refreshSeededCareerEntry);
  const educationEntries = normalizeEducationEntries(parsed.educationEntries).map(refreshSeededEducationEntry);
  const shouldSeedEducationOnMigration =
    parsed.version !== CAREER_HISTORY_STATE_VERSION && educationEntries.length === 0;

  return {
    version: CAREER_HISTORY_STATE_VERSION,
    careerEntries,
    educationEntries: shouldSeedEducationOnMigration
      ? buildSeededEducationEntries()
      : educationEntries,
    entries: careerEntries,
    parsedAt: readStoredDate(parsed.parsedAt),
    sourceResumeId: readNullableString(parsed.sourceResumeId)
  };
}

export function buildPrototypeCareerHistoryState(
  job: JobViewData,
  sourceResumeId: string | null
): CandidateCareerHistoryState {
  const careerEntries = buildSeededEntries(job);

  return {
    version: CAREER_HISTORY_STATE_VERSION,
    careerEntries,
    educationEntries: buildSeededEducationEntries(),
    entries: careerEntries,
    parsedAt: new Date().toISOString(),
    sourceResumeId
  };
}

export function readPrototypeCareerHistoryState(
  session: CandidateSession,
  jobId: string
): CandidateCareerHistoryState | null {
  const raw = window.localStorage.getItem(getStorageKey(session.email, jobId));

  if (!raw) {
    return null;
  }

  try {
    const parsed = normalizeCareerHistoryState(JSON.parse(raw));

    if (!parsed) {
      throw new Error("Invalid career history state.");
    }

    return parsed;
  } catch {
    window.localStorage.removeItem(getStorageKey(session.email, jobId));
    return null;
  }
}

export function savePrototypeCareerHistoryState(
  session: CandidateSession,
  jobId: string,
  state: CandidateCareerHistoryState
): void {
  const normalizedState = normalizeCareerHistoryState(state, {
    preferCompatibilityEntries: true
  });

  if (!normalizedState) {
    window.localStorage.removeItem(getStorageKey(session.email, jobId));
    return;
  }

  window.localStorage.setItem(getStorageKey(session.email, jobId), JSON.stringify(normalizedState));
}

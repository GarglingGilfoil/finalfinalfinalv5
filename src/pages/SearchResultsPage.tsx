import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent
} from "react";
import { ChevronDown, Eye, MapPin, Search, X } from "lucide-react";
import { referenceJobView } from "../config/reference-job";
import {
  ApplicationLocationField,
  type ApplicationLocationValue
} from "../components/ApplicationLocationField";
import { normalizeAuthoredHtml } from "../components/JobBodySections";
import {
  buildApplicationLocationValue,
  findLocationCityInCountry,
  findLocationCountryByQuery,
  findLocationCountryFromLocationHint,
  getLocationCountryByCode,
  getTopCitiesForCountry,
  searchCitiesInCountry,
  type LocationCityOption
} from "../lib/location-data";
import {
  detectPreferredLocationCountry,
  readBrowserLocationDetectionContext
} from "../lib/location-detection";
import {
  buildJobViewPath,
  navigateTo,
  REFERENCE_JOB_ID,
  type SearchResultsNavigationPayload
} from "../lib/router";

const MOCK_RESULT_COUNT = 468;
const DEFAULT_SORT = "relevance";
const INITIAL_RESULT_COUNT = 20;
const MOCK_RESULT_LIMIT = 50;
const RESULT_BATCH_SIZE = 10;
const DEMO_LOAD_DELAY_MS = 320;

type FilterKey =
  | "date"
  | "workplace"
  | "jobType"
  | "experience"
  | "industry"
  | "company";
type MultiFilterKey = "workplace" | "jobType" | "experience" | "industry" | "company";
type SortId = "relevance" | "newest";

interface FilterOption {
  count?: number;
  id: string;
  label: string;
}

interface SearchFilterState {
  company: string[];
  date: string | null;
  experience: string[];
  industry: string[];
  jobType: string[];
  workplace: string[];
}

interface SearchLocationState {
  isRemote: boolean;
  label: string;
  value: ApplicationLocationValue | null;
}

interface MockBaseJob {
  companyLogoUrl: string | null;
  companyName: string;
  description: string;
  descriptionHtml?: string;
  experienceRequired: string;
  id: string;
  industries: string[];
  jobType: string;
  location: string;
  postedDaysAgo: number;
  salaryType: string;
  seniority: string;
  skills: string[];
  title: string;
  workplaceType: string;
}

interface MockJobResult extends MockBaseJob {
  datePostedLabel: string;
  id: string;
  viewCount: number;
}

const DATE_FILTERS: readonly FilterOption[] = [
  { id: "24h", label: "Past 24 hours" },
  { id: "7d", label: "Past 7 days" },
  { id: "14d", label: "Past 14 days" },
  { id: "30d", label: "Past 30 days" }
] as const;

const WORKPLACE_FILTERS: readonly FilterOption[] = [
  { id: "onsite", label: "On-site" },
  { id: "hybrid", label: "Hybrid" },
  { id: "remote", label: "Remote" }
] as const;

const JOB_TYPE_FILTERS: readonly FilterOption[] = [
  { id: "permanent", label: "Permanent" },
  { id: "contract", label: "Contract" },
  { id: "fixed-term", label: "Fixed-term" },
  { id: "temporary", label: "Temporary" },
  { id: "internship", label: "Internship" },
  { id: "freelance", label: "Freelance" }
] as const;

const EXPERIENCE_FILTERS: readonly FilterOption[] = [
  { id: "graduate", label: "Graduate" },
  { id: "junior", label: "Junior" },
  { id: "intermediate", label: "Intermediate" },
  { id: "senior", label: "Senior" },
  { id: "lead", label: "Lead" },
  { id: "manager", label: "Manager" },
  { id: "executive", label: "Executive" }
] as const;

const INDUSTRY_FILTERS: readonly FilterOption[] = [
  { id: "software-development", label: "Software Development", count: 132 },
  { id: "financial-services", label: "Financial Services", count: 89 },
  { id: "recruitment", label: "Recruitment", count: 47 },
  { id: "retail", label: "Retail", count: 35 },
  { id: "healthcare", label: "Healthcare", count: 28 },
  { id: "marketing", label: "Marketing", count: 24 },
  { id: "design", label: "Design", count: 18 }
] as const;

const COMPANY_FILTERS: readonly FilterOption[] = [
  { id: "capitec", label: "Capitec", count: 42 },
  { id: "takealot", label: "Takealot", count: 31 },
  { id: "discovery", label: "Discovery", count: 26 },
  { id: "shoprite", label: "Shoprite", count: 22 },
  { id: "sanlam", label: "Sanlam", count: 19 },
  { id: "amazon", label: "Amazon", count: 16 },
  { id: "deloitte", label: "Deloitte", count: 14 }
] as const;

const SORT_OPTIONS: readonly FilterOption[] = [
  { id: "relevance", label: "Relevance" },
  { id: "newest", label: "Newest" }
] as const;

const DEMO_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  timeZone: "UTC",
  year: "numeric"
});

const DEMO_REFERENCE_DATE = new Date("2026-05-05T00:00:00Z");
const DEMO_VIEW_COUNTS = [1248, 982, 2104, 764, 1588, 436, 1196, 875, 2660, 543] as const;

const MOCK_BASE_JOBS: readonly MockBaseJob[] = [
  {
    companyLogoUrl: "/company/capitec-bank-logo.jpg",
    companyName: "Capitec",
    description:
      "Build modern React interfaces for high-scale digital banking products. You will work closely with product, design, and platform teams to ship polished customer experiences with strong attention to performance, testing, and maintainability.",
    experienceRequired: "3 years - 5 years",
    id: "capitec-senior-react-engineer",
    industries: ["Financial Services", "Banking", "Software Development"],
    jobType: "Permanent",
    location: "Cape Town, South Africa",
    postedDaysAgo: 1,
    salaryType: "Market Related",
    seniority: "Mid / Senior",
    skills: ["React", "TypeScript", "APIs", "Testing", "Design Systems"],
    title: "Senior React Engineer",
    workplaceType: "Hybrid"
  },
  {
    companyLogoUrl: null,
    companyName: "Takealot",
    description:
      "Join a product engineering team building consumer-facing commerce features used every day. The role focuses on frontend architecture, reusable components, and close collaboration with UX teams across checkout, discovery, and customer account journeys.",
    experienceRequired: "4 years - 6 years",
    id: "takealot-frontend-developer",
    industries: ["Retail", "E-commerce", "Software Development"],
    jobType: "Permanent",
    location: "Cape Town, South Africa",
    postedDaysAgo: 2,
    salaryType: "Market Related",
    seniority: "Senior",
    skills: ["React", "Next.js", "JavaScript", "Performance", "UX Collaboration"],
    title: "Senior Frontend Developer",
    workplaceType: "Hybrid"
  },
  {
    companyLogoUrl: null,
    companyName: "Discovery",
    description:
      "Help modernise internal and member-facing web platforms with clean React patterns, accessible interfaces, and reliable API integration. You will contribute to component standards while supporting teams that move fast across complex product surfaces.",
    experienceRequired: "3 years - 5 years",
    id: "discovery-product-engineer",
    industries: ["Healthcare", "Financial Services", "Software Development"],
    jobType: "Permanent",
    location: "Johannesburg, South Africa",
    postedDaysAgo: 3,
    salaryType: "Market Related",
    seniority: "Mid / Senior",
    skills: ["React", "TypeScript", "REST APIs", "Accessibility", "Component Design"],
    title: "Product Engineer",
    workplaceType: "Hybrid"
  },
  {
    companyLogoUrl: null,
    companyName: "Sanlam",
    description:
      "Create robust web application experiences for financial services teams. This role suits an engineer who enjoys frontend quality, predictable delivery, and translating complex business flows into calm, understandable product interfaces.",
    experienceRequired: "5 years - 7 years",
    id: "sanlam-web-application-developer",
    industries: ["Financial Services", "Insurance", "Software Development"],
    jobType: "Permanent",
    location: "Bellville, South Africa",
    postedDaysAgo: 4,
    salaryType: "Market Related",
    seniority: "Senior",
    skills: ["React", "JavaScript", "Frontend Architecture", "Testing", "APIs"],
    title: "Web Application Developer",
    workplaceType: "On-site"
  },
  {
    companyLogoUrl: null,
    companyName: "Amazon",
    description:
      "Work on developer-facing web tools and internal platforms for distributed teams. The ideal candidate is comfortable with complex UI state, performance tradeoffs, and shipping maintainable experiences in a global engineering environment.",
    experienceRequired: "5 years - 8 years",
    id: "amazon-frontend-platform-engineer",
    industries: ["Software Development", "Cloud Infrastructure", "Developer Tools"],
    jobType: "Permanent",
    location: "Remote",
    postedDaysAgo: 5,
    salaryType: "Market Related",
    seniority: "Senior",
    skills: ["React", "TypeScript", "Frontend Architecture", "Performance", "Tooling"],
    title: "Frontend Platform Engineer",
    workplaceType: "Remote"
  },
  {
    companyLogoUrl: null,
    companyName: "Deloitte",
    description:
      "Deliver modern React applications for enterprise clients across industries. You will balance technical implementation with consulting context, helping teams ship reliable interfaces, dashboards, and workflow tools at pace.",
    experienceRequired: "4 years - 6 years",
    id: "deloitte-full-stack-developer",
    industries: ["Consulting", "Enterprise Software", "Financial Services"],
    jobType: "Contract",
    location: "Johannesburg, South Africa",
    postedDaysAgo: 6,
    salaryType: "Market Related",
    seniority: "Intermediate / Senior",
    skills: ["React", "Node.js", "TypeScript", "APIs", "Cloud"],
    title: "Full Stack Developer",
    workplaceType: "Hybrid"
  },
  {
    companyLogoUrl: null,
    companyName: "ShopriteX",
    description:
      "Build digital retail products with a team focused on speed, experimentation, and customer outcomes. This role works across design systems, transactional journeys, and frontend performance for high-traffic product surfaces.",
    experienceRequired: "3 years - 5 years",
    id: "shopritex-ui-engineer",
    industries: ["Retail", "Digital Products", "Software Development"],
    jobType: "Permanent",
    location: "Cape Town, South Africa",
    postedDaysAgo: 7,
    salaryType: "Market Related",
    seniority: "Mid / Senior",
    skills: ["React", "Design Systems", "CSS", "JavaScript", "Performance"],
    title: "UI Engineer",
    workplaceType: "Hybrid"
  },
  {
    companyLogoUrl: null,
    companyName: "DataTech Recruitment",
    description:
      "Join a client engineering team building responsive web platforms for data-heavy workflows. The role needs a practical frontend developer who can translate requirements into clear interfaces and keep quality high under delivery pressure.",
    experienceRequired: "2 years - 4 years",
    id: "datatech-javascript-developer",
    industries: ["Recruitment", "Data Platforms", "Software Development"],
    jobType: "Contract",
    location: "Durban, South Africa",
    postedDaysAgo: 8,
    salaryType: "Market Related",
    seniority: "Intermediate",
    skills: ["JavaScript", "React", "HTML", "CSS", "APIs"],
    title: "JavaScript Developer",
    workplaceType: "Remote"
  },
  {
    companyLogoUrl: null,
    companyName: "Parvana",
    description:
      "Help ship React Native and web experiences for a product-led technology client. You will work across mobile interaction patterns, shared components, and API-driven features with a small team that values ownership.",
    experienceRequired: "3 years - 6 years",
    id: "parvana-react-native-developer",
    industries: ["Software Development", "Mobile Apps", "Product Engineering"],
    jobType: "Permanent",
    location: "Remote",
    postedDaysAgo: 9,
    salaryType: "Market Related",
    seniority: "Senior",
    skills: ["React Native", "React", "TypeScript", "Mobile UI", "APIs"],
    title: "React Native Developer",
    workplaceType: "Remote"
  },
  {
    companyLogoUrl: null,
    companyName: "Ditto Hire",
    description:
      "Build product surfaces that help hiring teams and candidates move faster. The role spans frontend architecture, AI-assisted workflows, profile experiences, and the kind of detail work that makes complex recruitment software feel simple.",
    experienceRequired: "4 years - 7 years",
    id: "ditto-software-engineer",
    industries: ["Software Development", "Recruitment", "Artificial Intelligence"],
    jobType: "Permanent",
    location: "Cape Town, South Africa",
    postedDaysAgo: 10,
    salaryType: "Market Related",
    seniority: "Senior",
    skills: ["React", "TypeScript", "Product Engineering", "AI Workflows", "Testing"],
    title: "Software Engineer",
    workplaceType: "Hybrid"
  }
];

const DEMO_LOCATION_VARIANTS = [
  "Cape Town, South Africa",
  "Johannesburg, South Africa",
  "Durban, South Africa",
  "Pretoria, South Africa",
  "Remote"
] as const;

const EMPTY_FILTERS: SearchFilterState = {
  company: [],
  date: null,
  experience: [],
  industry: [],
  jobType: [],
  workplace: []
};

const SEARCH_PARAM_KEYS = [
  "title",
  "location",
  "country",
  "city",
  "date",
  "workplace",
  "distance",
  "jobType",
  "experience",
  "industry",
  "company",
  "sort"
] as const;

function isRemoteLocationLabel(label: string | null | undefined): boolean {
  return label?.trim().toLowerCase() === "remote";
}

function buildNewYorkFallbackLocation(): ApplicationLocationValue {
  const country = getLocationCountryByCode("US");

  return {
    cityId: "search:fallback:new-york",
    cityName: "New York",
    countryCode: "US",
    countryFlag: country?.flag,
    countryLatitude: country?.latitude ?? undefined,
    countryLongitude: country?.longitude ?? undefined,
    countryName: "USA",
    label: "New York, USA",
    phoneCode: country?.phoneCode
  };
}

function findCityForQuery(countryCode: string, cityName: string | null | undefined): LocationCityOption | null {
  if (!cityName?.trim()) {
    return null;
  }

  return (
    findLocationCityInCountry(countryCode, cityName) ??
    searchCitiesInCountry(countryCode, cityName, 1)[0] ??
    null
  );
}

function resolvePhysicalLocationFromUrl(params: URLSearchParams): ApplicationLocationValue | null {
  const countryParam = params.get("country")?.trim();
  const cityParam = params.get("city")?.trim();
  const locationParam = params.get("location")?.trim();

  if (countryParam && cityParam) {
    if (countryParam.toUpperCase() === "US" && cityParam.toLowerCase() === "new york") {
      return buildNewYorkFallbackLocation();
    }

    const city = findCityForQuery(countryParam, cityParam);

    if (city) {
      return buildApplicationLocationValue(city);
    }
  }

  if (!locationParam || isRemoteLocationLabel(locationParam)) {
    return null;
  }

  const locationParts = locationParam.split(",").map((part) => part.trim()).filter(Boolean);
  const cityName = locationParts[0];
  const countryHint = locationParts.slice(1).join(", ");
  const country =
    findLocationCountryByQuery(countryHint) ??
    findLocationCountryFromLocationHint(locationParam);

  if (country && cityName) {
    if (country.isoCode === "US" && cityName.toLowerCase() === "new york") {
      return buildNewYorkFallbackLocation();
    }

    const city = findCityForQuery(country.isoCode, cityName);

    if (city) {
      return buildApplicationLocationValue(city);
    }
  }

  return null;
}

function resolveDefaultLocation(): SearchLocationState {
  const detectedCountry = detectPreferredLocationCountry({
    ...readBrowserLocationDetectionContext(),
    fallbackCountryCode: "US"
  });

  if (detectedCountry.source !== "fallback") {
    const priorityCity = getTopCitiesForCountry(detectedCountry.country.isoCode, 1)[0];

    if (priorityCity) {
      const value = buildApplicationLocationValue(priorityCity);

      return {
        isRemote: false,
        label: value.label,
        value
      };
    }
  }

  const value = buildNewYorkFallbackLocation();
  return {
    isRemote: false,
    label: value.label,
    value
  };
}

function resolveInitialLocation(params: URLSearchParams): SearchLocationState {
  const locationParam = params.get("location")?.trim();
  const hasLocationParam = Boolean(locationParam || params.get("country") || params.get("city"));

  if (locationParam && isRemoteLocationLabel(locationParam)) {
    return {
      isRemote: true,
      label: "Remote",
      value: null
    };
  }

  if (hasLocationParam) {
    const value = resolvePhysicalLocationFromUrl(params);

    return {
      isRemote: false,
      label: value?.label ?? locationParam ?? "",
      value
    };
  }

  return resolveDefaultLocation();
}

function resolveSubmittedInitialLocation(params: URLSearchParams): SearchLocationState {
  const hasLocationParam = Boolean(params.get("location")?.trim() || params.get("country") || params.get("city"));

  if (hasLocationParam) {
    return resolveInitialLocation(params);
  }

  return {
    isRemote: false,
    label: "",
    value: null
  };
}

function parseMultiParam(
  params: URLSearchParams,
  key: string,
  options: readonly FilterOption[]
): string[] {
  const validIds = new Set(options.map((option) => option.id));

  return (params.get(key) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => validIds.has(item));
}

function parseSingleParam(
  params: URLSearchParams,
  key: string,
  options: readonly FilterOption[]
): string | null {
  const value = params.get(key)?.trim();
  return value && options.some((option) => option.id === value) ? value : null;
}

function parseFiltersFromParams(params: URLSearchParams): SearchFilterState {
  return {
    company: parseMultiParam(params, "company", COMPANY_FILTERS),
    date: parseSingleParam(params, "date", DATE_FILTERS),
    experience: parseMultiParam(params, "experience", EXPERIENCE_FILTERS),
    industry: parseMultiParam(params, "industry", INDUSTRY_FILTERS),
    jobType: parseMultiParam(params, "jobType", JOB_TYPE_FILTERS),
    workplace: parseMultiParam(params, "workplace", WORKPLACE_FILTERS)
  };
}

function getOptionLabel(options: readonly FilterOption[], id: string | null): string | null {
  if (!id) {
    return null;
  }

  return options.find((option) => option.id === id)?.label ?? null;
}

function formatMultiFilterButton(
  baseLabel: string,
  selectedIds: readonly string[],
  options: readonly FilterOption[]
): string {
  if (selectedIds.length === 0) {
    return baseLabel;
  }

  if (selectedIds.length === 1) {
    return getOptionLabel(options, selectedIds[0]) ?? baseLabel;
  }

  return `${baseLabel} +${selectedIds.length - 1}`;
}

function SearchResultsHeadingText({
  locationState,
  title
}: {
  locationState: SearchLocationState;
  title: string;
}): JSX.Element {
  const trimmedTitle = title.trim();
  const locationLabel = locationState.isRemote
    ? "Remote"
    : locationState.value?.cityName ?? locationState.label.trim();
  const role = trimmedTitle ? (
    <span className="search-results-heading__role">{trimmedTitle}</span>
  ) : null;
  const location = locationLabel && !locationState.isRemote ? (
    <span className="search-results-heading__location">
      <MapPin aria-hidden="true" />
      <span>{locationLabel}</span>
    </span>
  ) : null;

  if (locationState.isRemote && trimmedTitle) {
    return (
      <>
        {MOCK_RESULT_COUNT} remote {role} roles
      </>
    );
  }

  if (locationState.isRemote) {
    return <>{MOCK_RESULT_COUNT} remote roles</>;
  }

  if (role && location) {
    return (
      <>
        {MOCK_RESULT_COUNT} matched roles for {role} in {location}
      </>
    );
  }

  if (role) {
    return (
      <>
        {MOCK_RESULT_COUNT} matched roles for {role}
      </>
    );
  }

  if (location) {
    return (
      <>
        {MOCK_RESULT_COUNT} matched roles in {location}
      </>
    );
  }

  return <>{MOCK_RESULT_COUNT} matched roles</>;
}

function navigateToJobFromSearchResults(event: ReactMouseEvent<HTMLAnchorElement>, href: string): void {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.currentTarget.target === "_blank"
  ) {
    return;
  }

  event.preventDefault();
  navigateTo<SearchResultsNavigationPayload>(href, {
    payload: {
      fromSearchResults: true,
      returnTo: `${window.location.pathname}${window.location.search}`
    }
  });
}

function formatDemoDate(daysAgo: number): string {
  const date = new Date(DEMO_REFERENCE_DATE);
  date.setUTCDate(DEMO_REFERENCE_DATE.getUTCDate() - daysAgo);
  return DEMO_DATE_FORMATTER.format(date);
}

function formatViewCount(viewCount: number): string {
  if (viewCount >= 1000) {
    return `${(viewCount / 1000).toFixed(viewCount >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  }

  return String(viewCount);
}

function hashString(value: string): number {
  return value.split("").reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0;
  }, 7);
}

function getCompanyInitials(companyName: string): string {
  const words = companyName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function stripJobDescriptionHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExpandedMockDescription(job: MockBaseJob): string {
  const primarySkills = job.skills.slice(0, 3).join(", ");

  return `${job.description} The day-to-day work includes shaping reusable frontend patterns, improving product flows, and keeping delivery quality high without losing speed. You will collaborate with product managers, designers, backend engineers, and stakeholders to turn complex requirements into clear, reliable interfaces. The team is looking for someone comfortable with ${primarySkills}, thoughtful code review, practical testing, and product-minded tradeoffs. You will have space to influence architecture, mentor less experienced engineers, and help the team make decisions that improve performance, accessibility, and maintainability over time.`;
}

const REFERENCE_JOB_DESCRIPTION_TEXT = stripJobDescriptionHtml(referenceJobView.jobDescriptionHtml);

function buildMockJobResults(): MockJobResult[] {
  const stableOrder = [0, 3, 1, 8, 2, 5, 7, 4, 9, 6];

  return Array.from({ length: MOCK_RESULT_LIMIT }, (_, index) => {
    const baseIndex = stableOrder[index % stableOrder.length];
    const base = MOCK_BASE_JOBS[baseIndex];
    const cycle = Math.floor(index / MOCK_BASE_JOBS.length);
    const postedDaysAgo = base.postedDaysAgo + cycle * 8 + (index % 3);
    const location = cycle === 0
      ? base.location
      : DEMO_LOCATION_VARIANTS[(index + cycle + baseIndex) % DEMO_LOCATION_VARIANTS.length];

    return {
      ...base,
      datePostedLabel: formatDemoDate(postedDaysAgo),
      descriptionHtml: index === 0 ? referenceJobView.jobDescriptionHtml : base.descriptionHtml,
      description: index === 0 ? REFERENCE_JOB_DESCRIPTION_TEXT : buildExpandedMockDescription(base),
      id: `search-${base.id}-${index + 1}`,
      location,
      postedDaysAgo,
      viewCount: DEMO_VIEW_COUNTS[(index + baseIndex) % DEMO_VIEW_COUNTS.length] + cycle * 37
    };
  });
}

function CompanyAvatar({
  className,
  companyName,
  logoUrl
}: {
  className?: string;
  companyName: string;
  logoUrl: string | null;
}): JSX.Element {
  const [hasLogoError, setHasLogoError] = useState(false);
  const initials = getCompanyInitials(companyName);
  const tone = hashString(companyName) % 6;

  return (
    <span className={["search-results-company-avatar", className].filter(Boolean).join(" ")} data-tone={tone}>
      {logoUrl && !hasLogoError ? (
        <img
          alt={`${companyName} logo`}
          onError={() => setHasLogoError(true)}
          src={logoUrl}
        />
      ) : (
        <span
          aria-label={`${companyName} avatar`}
          className="search-results-company-avatar__fallback"
          role="img"
        >
          {initials}
        </span>
      )}
    </span>
  );
}

function JobResultTile({
  isSelected,
  job,
  onSelect
}: {
  isSelected: boolean;
  job: MockJobResult;
  onSelect: () => void;
}): JSX.Element {
  return (
    <button
      aria-label={`${job.title} at ${job.companyName}, ${job.location}`}
      aria-current={isSelected ? "true" : undefined}
      aria-pressed={isSelected}
      className="search-results-job-card"
      data-selected={isSelected ? "true" : "false"}
      onClick={onSelect}
      type="button"
    >
      <CompanyAvatar companyName={job.companyName} logoUrl={job.companyLogoUrl} />
      <span className="search-results-job-card__content">
        <span className="search-results-job-card__title">{job.title}</span>
        <span className="search-results-job-card__company">{job.companyName}</span>
        <span className="search-results-job-card__meta">
          <span>{job.location}</span>
          <span aria-hidden="true">·</span>
          <span>{job.datePostedLabel}</span>
        </span>
        <span className="search-results-job-card__chips" aria-label="Job metadata">
          <span>{job.workplaceType}</span>
          <span>{job.jobType}</span>
          <span>{job.salaryType}</span>
        </span>
        <span className="search-results-job-card__footer">
          <span className="search-results-job-card__views" aria-label={`${formatViewCount(job.viewCount)} views`}>
            <Eye aria-hidden="true" />
            <span>{formatViewCount(job.viewCount)}</span>
          </span>
        </span>
      </span>
    </button>
  );
}

function JobResultSkeletonTile(): JSX.Element {
  return (
    <article className="search-results-result-skeleton" aria-hidden="true">
      <span className="search-results-result-skeleton__logo" />
      <span className="search-results-result-skeleton__body">
        <span className="search-results-result-skeleton__line search-results-result-skeleton__line--title" />
        <span className="search-results-result-skeleton__line search-results-result-skeleton__line--meta" />
        <span className="search-results-result-skeleton__chips">
          <span />
          <span />
          <span />
        </span>
      </span>
    </article>
  );
}

function IndustrySummaryValue({ industries }: { industries: string[] }): JSX.Element {
  const overflowId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [primaryIndustry = "Not specified", ...additionalIndustries] = industries;
  const hasAdditionalIndustries = additionalIndustries.length > 0;
  const additionalIndustriesLabel = additionalIndustries.join(", ");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsOpen(false);
        window.requestAnimationFrame(() => {
          triggerRef.current?.focus();
        });
      }
    };

    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="search-results-industry-summary">
      <span className="search-results-industry-summary__primary" title={primaryIndustry}>
        {primaryIndustry}
      </span>
      {hasAdditionalIndustries ? (
        <span className="search-results-industry-overflow" data-open={isOpen ? "true" : undefined}>
          <button
            aria-controls={overflowId}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-label={
              isOpen
                ? "Hide additional industries"
                : `Show ${additionalIndustries.length} more industries: ${additionalIndustriesLabel}`
            }
            className="search-results-industry-overflow__trigger"
            onClick={() => {
              setIsOpen((current) => !current);
            }}
            ref={triggerRef}
            title={`${additionalIndustries.length} more industries: ${additionalIndustriesLabel}`}
            type="button"
          >
            +{additionalIndustries.length}
          </button>
          {isOpen ? (
            <div
              aria-label="All industries"
              className="search-results-industry-overflow__popover"
              id={overflowId}
              ref={panelRef}
              role="dialog"
            >
              <div className="search-results-industry-overflow__header">
                <p>Industries</p>
                <button
                  className="search-results-industry-overflow__close"
                  onClick={() => {
                    setIsOpen(false);
                    window.requestAnimationFrame(() => {
                      triggerRef.current?.focus();
                    });
                  }}
                  type="button"
                >
                  Show less
                </button>
              </div>
              <ul className="search-results-industry-overflow__list">
                {industries.map((industry) => (
                  <li key={industry}>
                    <span className="search-results-industry-overflow__chip">{industry}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

function JobDescriptionPreview({
  description,
  descriptionHtml
}: {
  description: string;
  descriptionHtml?: string;
}): JSX.Element {
  const normalizedHtml = useMemo(
    () => (descriptionHtml ? normalizeAuthoredHtml(descriptionHtml) : null),
    [descriptionHtml]
  );

  if (normalizedHtml) {
    return (
      <div
        className="rich-text rich-text--body search-results-job-preview__rich-text"
        dangerouslySetInnerHTML={{ __html: normalizedHtml }}
      />
    );
  }

  return (
    <div className="rich-text rich-text--body search-results-job-preview__rich-text">
      <p>{description}</p>
    </div>
  );
}

function SelectedJobPreview({
  idPrefix = "search-preview-title",
  job
}: {
  idPrefix?: string;
  job: MockJobResult;
}): JSX.Element {
  const showMoreHref = buildJobViewPath(REFERENCE_JOB_ID);
  const showMoreLabel = `Show more about ${job.title} at ${job.companyName}`;
  const titleId = `${idPrefix}-${job.id}`;

  return (
    <article className="search-results-job-preview" aria-labelledby={titleId}>
      <header className="search-results-job-preview__header">
        <div className="search-results-job-preview__identity">
          <CompanyAvatar
            className="search-results-company-avatar--preview"
            companyName={job.companyName}
            logoUrl={job.companyLogoUrl}
          />
          <div>
            <h2 id={titleId}>{job.title}</h2>
            <p>
              <span>{job.companyName}</span>
              <span aria-hidden="true">·</span>
              <span>{job.location}</span>
            </p>
          </div>
        </div>
        {/* TODO: Route to each real search result ID once backend search data is connected. */}
        <a
          aria-label={showMoreLabel}
          className="search-results-job-preview__show-more search-results-job-preview__show-more--top"
          href={showMoreHref}
          onClick={(event) => navigateToJobFromSearchResults(event, showMoreHref)}
        >
          Show more
        </a>
      </header>

      <dl className="search-results-job-preview__facts">
        <div>
          <dt>Industry</dt>
          <dd className="search-results-job-preview__industry-cell">
            <IndustrySummaryValue industries={job.industries} />
          </dd>
        </div>
        <div>
          <dt>Seniority</dt>
          <dd>{job.seniority}</dd>
        </div>
        <div>
          <dt>Salary</dt>
          <dd>{job.salaryType}</dd>
        </div>
        <div>
          <dt>Experience</dt>
          <dd>{job.experienceRequired}</dd>
        </div>
      </dl>

      <section className="search-results-job-preview__section" aria-label="Job description preview">
        <h3>Job description</h3>
        <div className="search-results-job-preview__description">
          <JobDescriptionPreview description={job.description} descriptionHtml={job.descriptionHtml} />
        </div>
        <a
          aria-label={showMoreLabel}
          className="search-results-job-preview__show-more search-results-job-preview__show-more--bottom"
          href={showMoreHref}
          onClick={(event) => navigateToJobFromSearchResults(event, showMoreHref)}
        >
          Show more
        </a>
      </section>
    </article>
  );
}

export function SearchResultsPage(): JSX.Element {
  const popoverId = useId();
  const filterAreaRef = useRef<HTMLDivElement | null>(null);
  const filterButtonRefs = useRef<Partial<Record<FilterKey, HTMLButtonElement | null>>>({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);
  const searchLocationInputRef = useRef<HTMLInputElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const sortTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [title, setTitle] = useState(() => new URLSearchParams(window.location.search).get("title") ?? "");
  const [submittedTitle, setSubmittedTitle] = useState(
    () => new URLSearchParams(window.location.search).get("title") ?? ""
  );
  const [locationState, setLocationState] = useState<SearchLocationState>(() =>
    resolveInitialLocation(new URLSearchParams(window.location.search))
  );
  const [submittedLocationState, setSubmittedLocationState] = useState<SearchLocationState>(() =>
    resolveSubmittedInitialLocation(new URLSearchParams(window.location.search))
  );
  const [filters, setFilters] = useState<SearchFilterState>(() =>
    parseFiltersFromParams(new URLSearchParams(window.location.search))
  );
  const [sort, setSort] = useState<SortId>(() => {
    const sortParam = parseSingleParam(new URLSearchParams(window.location.search), "sort", SORT_OPTIONS);
    return sortParam === "newest" ? sortParam : DEFAULT_SORT;
  });
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [industryQuery, setIndustryQuery] = useState("");
  const [companyQuery, setCompanyQuery] = useState("");
  const [loadedCount, setLoadedCount] = useState(INITIAL_RESULT_COUNT);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasIntersectionObserver] = useState(() => "IntersectionObserver" in window);

  const filteredIndustryOptions = useMemo(
    () =>
      INDUSTRY_FILTERS.filter((option) =>
        option.label.toLowerCase().includes(industryQuery.trim().toLowerCase())
      ),
    [industryQuery]
  );
  const filteredCompanyOptions = useMemo(
    () =>
      COMPANY_FILTERS.filter((option) =>
        option.label.toLowerCase().includes(companyQuery.trim().toLowerCase())
      ),
    [companyQuery]
  );
  const mockResults = useMemo(() => buildMockJobResults(), []);
  const sortedMockResults = useMemo(() => {
    if (sort === "newest") {
      return [...mockResults].sort((firstJob, secondJob) => firstJob.postedDaysAgo - secondJob.postedDaysAgo);
    }

    return mockResults;
  }, [mockResults, sort]);
  const loadedResults = sortedMockResults.slice(0, loadedCount);
  const selectedJob =
    (selectedJobId ? sortedMockResults.find((job) => job.id === selectedJobId) : null) ??
    sortedMockResults[0] ??
    null;
  const hasMoreResults = loadedCount < sortedMockResults.length;

  function closeFilterPopover(filterKey: FilterKey | null = openFilter, shouldRestoreFocus = true): void {
    setOpenFilter(null);

    if (shouldRestoreFocus && filterKey) {
      window.setTimeout(() => {
        filterButtonRefs.current[filterKey]?.focus();
      }, 0);
    }
  }

  function closeSortPopover(shouldRestoreFocus = true): void {
    setIsSortOpen(false);

    if (shouldRestoreFocus) {
      window.setTimeout(() => {
        sortTriggerRef.current?.focus();
      }, 0);
    }
  }

  useEffect(() => {
    if (!openFilter) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target;

      if (target instanceof Node && filterAreaRef.current?.contains(target)) {
        return;
      }

      closeFilterPopover(openFilter, false);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeFilterPopover(openFilter);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openFilter]);

  useEffect(() => {
    if (!isSortOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      const target = event.target;

      if (target instanceof Node && sortRef.current?.contains(target)) {
        return;
      }

      closeSortPopover(false);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        closeSortPopover();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSortOpen]);

  useEffect(() => {
    const handlePopState = (): void => {
      const params = new URLSearchParams(window.location.search);
      const sortParam = parseSingleParam(params, "sort", SORT_OPTIONS);

      setTitle(params.get("title") ?? "");
      setSubmittedTitle(params.get("title") ?? "");
      const nextLocation = resolveInitialLocation(params);
      const nextSubmittedLocation = resolveSubmittedInitialLocation(params);
      setLocationState(nextLocation);
      setSubmittedLocationState(nextSubmittedLocation);
      setFilters(parseFiltersFromParams(params));
      setSort(sortParam === "newest" ? sortParam : DEFAULT_SORT);
      setOpenFilter(null);
      setAreFiltersOpen(false);
      setIsSortOpen(false);
      setIndustryQuery("");
      setCompanyQuery("");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    setLoadedCount(Math.min(INITIAL_RESULT_COUNT, sortedMockResults.length));
    setSelectedJobId(sortedMockResults[0]?.id ?? null);
  }, [sortedMockResults]);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasIntersectionObserver || !hasMoreResults) {
      return undefined;
    }

    const sentinel = loadMoreRef.current;

    if (!sentinel) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          queueMoreResults();
        }
      },
      {
        rootMargin: "360px 0px 320px"
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasIntersectionObserver, hasMoreResults, isLoadingMore, loadedCount, sortedMockResults.length]);

  function queueMoreResults(): void {
    if (isLoadingMore || !hasMoreResults) {
      return;
    }

    setIsLoadingMore(true);

    if (loadingTimeoutRef.current) {
      window.clearTimeout(loadingTimeoutRef.current);
    }

    loadingTimeoutRef.current = window.setTimeout(() => {
      setLoadedCount((currentCount) => Math.min(currentCount + RESULT_BATCH_SIZE, sortedMockResults.length));
      setIsLoadingMore(false);
      loadingTimeoutRef.current = null;
    }, DEMO_LOAD_DELAY_MS);
  }

  function buildSearchPath(nextState: {
    filters?: SearchFilterState;
    location?: SearchLocationState;
    sort?: SortId;
    title?: string;
  } = {}): string {
    const searchParams = new URLSearchParams(window.location.search);
    const nextFilters = nextState.filters ?? filters;
    const nextLocation = nextState.location ?? submittedLocationState;
    const nextSort = nextState.sort ?? sort;
    const nextTitle = nextState.title ?? submittedTitle;
    const locationLabel = nextLocation.value?.label ?? nextLocation.label.trim();

    SEARCH_PARAM_KEYS.forEach((key) => searchParams.delete(key));

    const setParam = (key: string, value: string | null | undefined): void => {
      const trimmedValue = value?.trim();

      if (trimmedValue) {
        searchParams.set(key, trimmedValue);
      }
    };
    const setListParam = (key: string, values: readonly string[]): void => {
      const normalizedValues = values.map((value) => value.trim()).filter(Boolean);

      if (normalizedValues.length > 0) {
        searchParams.set(key, normalizedValues.join(","));
      }
    };

    setParam("title", nextTitle);
    setParam("location", locationLabel);
    setParam("country", nextLocation.value?.countryCode);
    setParam("city", nextLocation.value?.cityName);
    setParam("date", nextFilters.date);
    setListParam("workplace", nextFilters.workplace);
    setListParam("jobType", nextFilters.jobType);
    setListParam("experience", nextFilters.experience);
    setListParam("industry", nextFilters.industry);
    setListParam("company", nextFilters.company);
    setParam("sort", nextSort === DEFAULT_SORT ? null : nextSort);

    const queryString = searchParams.toString();
    return `/jobs/search${queryString ? `?${queryString}` : ""}`;
  }

  function pushSearchUrl(nextState?: Parameters<typeof buildSearchPath>[0]): void {
    const path = buildSearchPath(nextState);

    if (`${window.location.pathname}${window.location.search}` !== path) {
      navigateTo(path);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const nextLocation = resolveDraftLocationForSubmit();

    setSubmittedTitle(title);
    setSubmittedLocationState(nextLocation);
    setLocationState(nextLocation);
    pushSearchUrl({ location: nextLocation, title });
  }

  function resolveDraftLocationForSubmit(): SearchLocationState {
    const rawLocation = searchLocationInputRef.current?.value.trim() ?? locationState.label.trim();

    if (!rawLocation) {
      return {
        isRemote: false,
        label: "",
        value: null
      };
    }

    if (isRemoteLocationLabel(rawLocation)) {
      return {
        isRemote: true,
        label: "Remote",
        value: null
      };
    }

    if (locationState.value) {
      const committedLabel = locationState.value.cityName.trim().toLowerCase();
      const rawComparison = rawLocation.split(",")[0]?.trim().toLowerCase();

      if (committedLabel === rawComparison || locationState.value.label.trim().toLowerCase() === rawLocation.toLowerCase()) {
        return locationState;
      }
    }

    return {
      isRemote: false,
      label: rawLocation,
      value: null
    };
  }

  function updateLocation(nextValue: ApplicationLocationValue | null): void {
    const nextLocation: SearchLocationState = nextValue
      ? {
          isRemote: false,
          label: nextValue.label,
          value: nextValue
        }
      : {
          isRemote: false,
          label: "",
          value: null
        };

    setLocationState(nextLocation);
  }

  function setDateFilter(nextDate: string | null): void {
    const nextFilters = { ...filters, date: nextDate };
    setFilters(nextFilters);
    pushSearchUrl({ filters: nextFilters });
  }

  function toggleMultiFilter(filterKey: MultiFilterKey, optionId: string): void {
    const currentValues = filters[filterKey];
    const nextValues = currentValues.includes(optionId)
      ? currentValues.filter((value) => value !== optionId)
      : [...currentValues, optionId];
    const nextFilters = { ...filters, [filterKey]: nextValues };

    setFilters(nextFilters);
    pushSearchUrl({ filters: nextFilters });
  }

  function clearFilter(filterKey: FilterKey): void {
    const nextFilters =
      filterKey === "date"
        ? { ...filters, [filterKey]: null }
        : { ...filters, [filterKey]: [] };

    setFilters(nextFilters);
    pushSearchUrl({ filters: nextFilters });
  }

  function updateSort(nextSort: SortId): void {
    setSort(nextSort);
    setIsSortOpen(false);
    pushSearchUrl({ sort: nextSort });
  }

  const selectedSortLabel = getOptionLabel(SORT_OPTIONS, sort) ?? "Relevance";
  const activeFilterCount = [
    filters.date,
    ...filters.workplace,
    ...filters.jobType,
    ...filters.experience,
    ...filters.industry,
    ...filters.company
  ].filter(Boolean).length;
  const filtersToggleLabel = activeFilterCount > 0 ? `Filters ${activeFilterCount}` : "Filters";

  function renderMultiOptions(filterKey: MultiFilterKey, options: readonly FilterOption[]): JSX.Element {
    return (
      <div className="search-results-popover__options">
        {options.map((option) => (
          <label className="search-results-option" key={option.id}>
            <input
              checked={filters[filterKey].includes(option.id)}
              onChange={() => toggleMultiFilter(filterKey, option.id)}
              type="checkbox"
            />
            <span>{option.label}</span>
            {typeof option.count === "number" ? <small>{option.count}</small> : null}
          </label>
        ))}
      </div>
    );
  }

  function renderPopover(filterKey: FilterKey): JSX.Element {
    const popoverTitle =
      filterKey === "date"
        ? "Date posted"
        : filterKey === "jobType"
          ? "Job type"
          : filterKey.charAt(0).toUpperCase() + filterKey.slice(1);

    return (
      <div className="search-results-popover" id={`${popoverId}-${filterKey}`} role="dialog">
        <div className="search-results-popover__header">
          <strong>{popoverTitle}</strong>
          <button
            aria-label={`Close ${popoverTitle} filter`}
            onClick={() => closeFilterPopover(filterKey)}
            type="button"
          >
            <X aria-hidden="true" />
          </button>
        </div>

        {filterKey === "date" ? (
          <div className="search-results-popover__options">
            <label className="search-results-option">
              <input checked={!filters.date} name="date-filter" onChange={() => setDateFilter(null)} type="radio" />
              <span>Any time</span>
            </label>
            {DATE_FILTERS.map((option) => (
              <label className="search-results-option" key={option.id}>
                <input
                  checked={filters.date === option.id}
                  name="date-filter"
                  onChange={() => setDateFilter(option.id)}
                  type="radio"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        ) : null}

        {filterKey === "workplace" ? renderMultiOptions("workplace", WORKPLACE_FILTERS) : null}

        {filterKey === "jobType" ? renderMultiOptions("jobType", JOB_TYPE_FILTERS) : null}
        {filterKey === "experience" ? renderMultiOptions("experience", EXPERIENCE_FILTERS) : null}

        {filterKey === "industry" ? (
          <>
            <input
              aria-label="Search industries"
              className="search-results-popover__search"
              onChange={(event) => setIndustryQuery(event.target.value)}
              placeholder="Search industries"
              type="search"
              value={industryQuery}
            />
            {renderMultiOptions("industry", filteredIndustryOptions)}
          </>
        ) : null}

        {filterKey === "company" ? (
          <>
            <input
              aria-label="Search companies"
              className="search-results-popover__search"
              onChange={(event) => setCompanyQuery(event.target.value)}
              placeholder="Search companies"
              type="search"
              value={companyQuery}
            />
            {renderMultiOptions("company", filteredCompanyOptions)}
          </>
        ) : null}

        <div className="search-results-popover__footer">
          <button className="button button--ghost" onClick={() => clearFilter(filterKey)} type="button">
            Clear
          </button>
          <button className="button button--primary" onClick={() => closeFilterPopover(filterKey)} type="button">
            Done
          </button>
        </div>
      </div>
    );
  }

  function renderFilterButton(filterKey: FilterKey, label: string, isActive = false, isMuted = false): JSX.Element {
    return (
      <div className="search-results-filter-item" data-open={openFilter === filterKey ? "true" : "false"}>
        <button
          aria-controls={`${popoverId}-${filterKey}`}
          aria-expanded={openFilter === filterKey}
          className="search-results-filter"
          data-active={isActive ? "true" : "false"}
          data-muted={isMuted ? "true" : "false"}
          onClick={() => {
            closeSortPopover(false);
            setOpenFilter((current) => (current === filterKey ? null : filterKey));
          }}
          ref={(node) => {
            filterButtonRefs.current[filterKey] = node;
          }}
          type="button"
        >
          <span>{label}</span>
          <ChevronDown aria-hidden="true" />
        </button>
        {openFilter === filterKey ? renderPopover(filterKey) : null}
      </div>
    );
  }

  return (
    <div className="search-results-page">
      <section className="search-results-shell" aria-labelledby="search-results-title">
        <div className="search-results-command">
          <form className="search-results-refine" onSubmit={submitSearch}>
            <label className="search-results-field">
              <span>Job title / keyword</span>
              <input
                autoComplete="off"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="React Developer, Product Manager, UX Designer"
                type="search"
                value={title}
              />
            </label>

            <div className="search-results-field search-results-field--location">
              <ApplicationLocationField
                cityPlaceholder="City, country, or remote"
                countrySearchPlaceholder="Search country"
                fallbackDisplayValue={locationState.value ? undefined : locationState.label}
                hideCountryTrigger={Boolean(!locationState.value && locationState.label.trim())}
                inputRef={searchLocationInputRef}
                label="Location"
                onChange={updateLocation}
                value={locationState.value}
              />
            </div>

            <button className="button button--primary search-results-refine__submit" type="submit">
              <Search aria-hidden="true" />
              Update search
            </button>

            <button
              aria-controls={`${popoverId}-filters-panel`}
              aria-expanded={areFiltersOpen}
              className="search-results-filters-toggle"
              onClick={() => {
                closeSortPopover(false);
                closeFilterPopover(openFilter, false);
                setAreFiltersOpen((current) => !current);
              }}
              type="button"
            >
              <span>{filtersToggleLabel}</span>
              <ChevronDown aria-hidden="true" />
            </button>
          </form>

          {areFiltersOpen ? (
            <div
              className="search-results-filters-panel"
              id={`${popoverId}-filters-panel`}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setAreFiltersOpen(false);
                  closeFilterPopover(openFilter, false);
                }
              }}
            >
              <span className="search-results-section-label">Refine matches</span>
              <div className="search-results-filter-bar" ref={filterAreaRef}>
                {renderFilterButton("date", getOptionLabel(DATE_FILTERS, filters.date) ?? "Date posted", Boolean(filters.date))}
                {renderFilterButton(
                  "workplace",
                  formatMultiFilterButton("Workplace", filters.workplace, WORKPLACE_FILTERS),
                  filters.workplace.length > 0
                )}
                {renderFilterButton(
                  "jobType",
                  formatMultiFilterButton("Job type", filters.jobType, JOB_TYPE_FILTERS),
                  filters.jobType.length > 0
                )}
                {renderFilterButton(
                  "experience",
                  formatMultiFilterButton("Experience", filters.experience, EXPERIENCE_FILTERS),
                  filters.experience.length > 0
                )}
                {renderFilterButton(
                  "industry",
                  formatMultiFilterButton("Industry", filters.industry, INDUSTRY_FILTERS),
                  filters.industry.length > 0
                )}
                {renderFilterButton(
                  "company",
                  formatMultiFilterButton("Company", filters.company, COMPANY_FILTERS),
                  filters.company.length > 0
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="search-results-heading">
          <h1 id="search-results-title">
            <SearchResultsHeadingText locationState={submittedLocationState} title={submittedTitle} />
          </h1>

          <div className="search-results-sort" ref={sortRef}>
            <span>Sort by</span>
            <button
              aria-controls={`${popoverId}-sort`}
              aria-expanded={isSortOpen}
              className="search-results-sort__trigger"
              onClick={() => {
                closeFilterPopover(openFilter, false);
                setIsSortOpen((current) => !current);
              }}
              ref={sortTriggerRef}
              type="button"
            >
              <span>{selectedSortLabel}</span>
              <ChevronDown aria-hidden="true" />
            </button>

            {isSortOpen ? (
              <div
                aria-label="Sort jobs"
                className="search-results-sort__panel"
                id={`${popoverId}-sort`}
                role="listbox"
              >
                {SORT_OPTIONS.map((option) => (
                  <button
                    aria-selected={sort === option.id}
                    className="search-results-sort__option"
                    data-selected={sort === option.id ? "true" : "false"}
                    key={option.id}
                    onClick={() => updateSort(option.id as SortId)}
                    role="option"
                    type="button"
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {selectedJob ? (
          <section className="search-results-jobs" aria-label="Job results">
            <div className="search-results-list-panel">
              <div className="search-results-list" role="list" aria-label="Job results">
                {loadedResults.map((job) => {
                  const isSelected = selectedJob.id === job.id;

                  return (
                    <div className="search-results-list__item" key={job.id} role="listitem">
                      <JobResultTile
                        isSelected={isSelected}
                        job={job}
                        onSelect={() => setSelectedJobId(job.id)}
                      />
                      {isSelected ? (
                        <div className="search-results-mobile-preview">
                          <SelectedJobPreview idPrefix="search-preview-mobile" job={job} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {isLoadingMore ? (
                <div className="search-results-loading-tiles" aria-hidden="true">
                  {[0, 1, 2].map((item) => (
                    <JobResultSkeletonTile key={item} />
                  ))}
                </div>
              ) : null}

              <div className="search-results-load-sentinel" ref={loadMoreRef} aria-hidden="true" />
              <p className="sr-only" role="status" aria-live="polite">
                {isLoadingMore ? "Loading more job results." : ""}
              </p>

              {!hasIntersectionObserver && hasMoreResults ? (
                <button
                  className="button button--ghost search-results-load-more"
                  disabled={isLoadingMore}
                  onClick={queueMoreResults}
                  type="button"
                >
                  Load more results
                </button>
              ) : null}
            </div>

            <aside className="search-results-preview-panel search-results-preview-panel--desktop">
              <SelectedJobPreview idPrefix="search-preview-desktop" job={selectedJob} />
            </aside>
          </section>
        ) : null}
      </section>
    </div>
  );
}

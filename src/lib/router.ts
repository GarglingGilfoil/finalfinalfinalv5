import type { ApplicationAuthMode } from "../contracts/application";

export type JobViewLayoutVariant = 1 | 2 | 3 | 4 | 5;
export type JobViewMotionVariant = "drift" | "arrival";

export const FINAL_JOB_VIEW_LAYOUT: JobViewLayoutVariant = 3;
export const FINAL_JOB_VIEW_MOTION: JobViewMotionVariant = "drift";

export interface HomeRoute {
  kind: "home";
}

export interface JobViewRoute {
  kind: "job-view";
  jobId: string;
  layout: JobViewLayoutVariant;
  motion: JobViewMotionVariant;
}

export interface JobSearchRoute {
  kind: "job-search";
}

export interface ApplicationAuthRoute {
  kind: "application-auth";
  jobId: string;
  mode: ApplicationAuthMode;
}

export interface ApplicationUploadRoute {
  kind: "application-upload";
  jobId: string;
}

export interface ApplicationParsingRoute {
  kind: "application-parsing";
  jobId: string;
}

export interface ApplicationRoleQuestionsRoute {
  kind: "application-role-questions";
  jobId: string;
}

export interface ApplicationPersonalDetailsRoute {
  kind: "application-personal-details";
  jobId: string;
}

export interface ApplicationCareerHistoryRoute {
  kind: "application-career-history";
  jobId: string;
}

export interface ApplicationConfirmRoute {
  kind: "application-confirm";
  jobId: string;
}

export interface CandidateProfileRoute {
  kind: "candidate-profile";
  jobId: string;
}

export type AppRoute =
  | HomeRoute
  | JobViewRoute
  | JobSearchRoute
  | ApplicationAuthRoute
  | ApplicationUploadRoute
  | ApplicationParsingRoute
  | ApplicationRoleQuestionsRoute
  | ApplicationPersonalDetailsRoute
  | ApplicationCareerHistoryRoute
  | ApplicationConfirmRoute
  | CandidateProfileRoute;

export const REFERENCE_JOB_ID = "196794136";
const APP_ROUTE_CHANGE_EVENT = "ditto-jobs:route-change";

interface JobSearchPathParams {
  city?: string | null;
  country?: string | null;
  company?: string | readonly string[] | null;
  date?: string | null;
  distance?: string | null;
  experience?: string | readonly string[] | null;
  industry?: string | readonly string[] | null;
  jobType?: string | readonly string[] | null;
  intent?: string | null;
  location?: string | null;
  sort?: string | null;
  source?: string | null;
  state?: string | null;
  title?: string | null;
  workplace?: string | readonly string[] | null;
}

export interface AppNavigationState<TPayload = Record<string, unknown>> {
  payload?: TPayload;
}

export interface SearchResultsNavigationPayload {
  fromSearchResults: true;
  returnTo: string;
}

interface NavigateOptions<TPayload = Record<string, unknown>> {
  payload?: TPayload;
  replace?: boolean;
}

export function parseAuthMode(search: string): ApplicationAuthMode {
  const mode = new URLSearchParams(search).get("mode");

  if (mode === "signup" || mode === "forgot-password") {
    return mode;
  }

  return "signin";
}

export function buildJobViewPath(jobId: string): string {
  return `/jobs/${jobId}`;
}

export function buildJobSearchPath(params: JobSearchPathParams = {}): string {
  const searchParams = new URLSearchParams();
  const setListParam = (
    key: string,
    value: string | readonly string[] | null | undefined
  ): void => {
    const values = typeof value === "string"
      ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
      : value
        ? value.map((item) => item.trim()).filter(Boolean)
        : [];

    if (values.length > 0) {
      searchParams.set(key, values.join(","));
    }
  };
  const trimmedTitle = params.title?.trim();
  const trimmedLocation = params.location?.trim();
  const trimmedCountry = params.country?.trim();
  const trimmedCity = params.city?.trim();
  const trimmedSource = params.source?.trim();
  const trimmedIntent = params.intent?.trim();
  const trimmedState = params.state?.trim();
  const trimmedDate = params.date?.trim();
  const trimmedDistance = params.distance?.trim();
  const trimmedSort = params.sort?.trim();

  if (trimmedTitle) {
    searchParams.set("title", trimmedTitle);
  }

  if (trimmedSource) {
    searchParams.set("source", trimmedSource);
  }

  if (trimmedIntent) {
    searchParams.set("intent", trimmedIntent);
  }

  if (trimmedState) {
    searchParams.set("state", trimmedState);
  }

  if (trimmedLocation) {
    searchParams.set("location", trimmedLocation);
  }

  if (trimmedCountry) {
    searchParams.set("country", trimmedCountry);
  }

  if (trimmedCity) {
    searchParams.set("city", trimmedCity);
  }

  if (trimmedDate) {
    searchParams.set("date", trimmedDate);
  }

  if (trimmedDistance) {
    searchParams.set("distance", trimmedDistance);
  }

  setListParam("workplace", params.workplace);
  setListParam("jobType", params.jobType);
  setListParam("experience", params.experience);
  setListParam("industry", params.industry);
  setListParam("company", params.company);

  if (trimmedSort) {
    searchParams.set("sort", trimmedSort);
  }

  const queryString = searchParams.toString();
  return `/jobs/search${queryString ? `?${queryString}` : ""}`;
}

export function buildApplicationAuthPath(
  jobId: string,
  mode: ApplicationAuthMode = "signin"
): string {
  return `/jobs/${jobId}/apply/auth?mode=${mode}`;
}

export function buildApplicationUploadPath(jobId: string): string {
  return `/jobs/${jobId}/apply/upload`;
}

export function buildApplicationParsingPath(jobId: string): string {
  return `/jobs/${jobId}/apply/parsing`;
}

export function buildApplicationRoleQuestionsPath(jobId: string): string {
  return `/jobs/${jobId}/apply/role-questions`;
}

export function buildApplicationPersonalDetailsPath(jobId: string): string {
  return `/jobs/${jobId}/apply/personal-details`;
}

export function buildApplicationCareerHistoryPath(jobId: string): string {
  return `/jobs/${jobId}/apply/history`;
}

export function buildApplicationConfirmPath(jobId: string): string {
  return `/jobs/${jobId}/apply/confirm`;
}

export function buildCandidateProfilePath(): string {
  return "/profile";
}

export function navigateTo<TPayload = Record<string, unknown>>(
  path: string,
  options: NavigateOptions<TPayload> = {}
): void {
  if (window.location.pathname === path && !window.location.search) {
    return;
  }

  const nextState: AppNavigationState<TPayload> | null = options.payload
    ? {
        payload: options.payload
      }
    : null;

  if (options.replace) {
    window.history.replaceState(nextState, "", path);
  } else {
    window.history.pushState(nextState, "", path);
  }

  window.dispatchEvent(new Event(APP_ROUTE_CHANGE_EVENT));
}

export function readNavigationState<TPayload = Record<string, unknown>>():
  | AppNavigationState<TPayload>
  | null {
  return (window.history.state as AppNavigationState<TPayload> | null) ?? null;
}

export function subscribeToRouteChanges(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener(APP_ROUTE_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(APP_ROUTE_CHANGE_EVENT, onChange);
  };
}

export function resolveRoute(location: Pick<Location, "pathname" | "search">): AppRoute {
  const trimmedPath = location.pathname.replace(/\/+$/, "") || "/";

  if (trimmedPath === "/") {
    return {
      kind: "home"
    };
  }

  if (trimmedPath === "/profile") {
    return {
      kind: "candidate-profile",
      jobId: REFERENCE_JOB_ID
    };
  }

  if (trimmedPath === "/jobs/search") {
    return {
      kind: "job-search"
    };
  }

  const authMatch = trimmedPath.match(/^\/jobs\/([^/]+)\/apply\/auth$/);
  if (authMatch?.[1]) {
    return {
      kind: "application-auth",
      jobId: authMatch[1],
      mode: parseAuthMode(location.search)
    };
  }

  const uploadMatch = trimmedPath.match(/^\/jobs\/([^/]+)\/apply\/upload$/);
  if (uploadMatch?.[1]) {
    return {
      kind: "application-upload",
      jobId: uploadMatch[1]
    };
  }

  const parsingMatch = trimmedPath.match(/^\/jobs\/([^/]+)\/apply\/parsing$/);
  if (parsingMatch?.[1]) {
    return {
      kind: "application-parsing",
      jobId: parsingMatch[1]
    };
  }

  const roleQuestionsMatch = trimmedPath.match(/^\/jobs\/([^/]+)\/apply\/role-questions$/);
  if (roleQuestionsMatch?.[1]) {
    return {
      kind: "application-role-questions",
      jobId: roleQuestionsMatch[1]
    };
  }

  const personalDetailsMatch = trimmedPath.match(/^\/jobs\/([^/]+)\/apply\/personal-details$/);
  if (personalDetailsMatch?.[1]) {
    return {
      kind: "application-personal-details",
      jobId: personalDetailsMatch[1]
    };
  }

  const historyMatch = trimmedPath.match(/^\/jobs\/([^/]+)\/apply\/history$/);
  if (historyMatch?.[1]) {
    return {
      kind: "application-career-history",
      jobId: historyMatch[1]
    };
  }

  const confirmMatch = trimmedPath.match(/^\/jobs\/([^/]+)\/apply\/confirm$/);
  if (confirmMatch?.[1]) {
    return {
      kind: "application-confirm",
      jobId: confirmMatch[1]
    };
  }

  const jobMatch = trimmedPath.match(/^\/jobs\/([^/]+)$/) ?? trimmedPath.match(/^\/job\/([^/]+)$/);
  if (jobMatch?.[1]) {
    return {
      kind: "job-view",
      jobId: jobMatch[1],
      layout: FINAL_JOB_VIEW_LAYOUT,
      motion: FINAL_JOB_VIEW_MOTION
    };
  }

  return {
    kind: "job-view",
    jobId: REFERENCE_JOB_ID,
    layout: FINAL_JOB_VIEW_LAYOUT,
    motion: FINAL_JOB_VIEW_MOTION
  };
}

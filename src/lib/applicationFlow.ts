import type { AppRoute } from "./router";

export type ApplicationTransitionDirection = "forward" | "back" | "neutral";
export type ApplicationTransitionVariant = "standard" | "handoff" | "success" | "blur" | "none";
export type ApplicationTransitionSource =
  | "job-apply"
  | "auth-complete"
  | "resume-upload-complete"
  | "parsing-skip"
  | "parsing-complete"
  | "personal-details-complete"
  | "role-questions-complete"
  | "career-review-complete"
  | "guard-recovery"
  | "profile-strengthen"
  | "browser-pop"
  | "direct-entry"
  | (string & {});

export interface ApplicationTransitionPayload {
  transitionAt: string;
  transitionSource?: ApplicationTransitionSource;
  transitionDirection: ApplicationTransitionDirection;
  transitionVariant: ApplicationTransitionVariant;
}

const APPLICATION_ROUTE_ORDER: Record<AppRoute["kind"], number> = {
  home: 0,
  "global-auth": 1,
  "job-search": 2,
  "job-view": 3,
  "application-auth": 4,
  "application-upload": 5,
  "application-parsing": 6,
  "application-personal-details": 7,
  "application-role-questions": 8,
  "application-career-history": 9,
  "application-confirm": 10,
  "candidate-profile": 11,
  "not-found": 12
};

export function getApplicationRouteKey(route: AppRoute): string {
  if (route.kind === "home" || route.kind === "job-search" || route.kind === "not-found") {
    return route.kind;
  }

  if (route.kind === "global-auth") {
    return `${route.kind}:${route.mode}`;
  }

  if (route.kind === "application-auth") {
    return `${route.kind}:${route.jobId}:${route.mode}`;
  }

  if (route.kind === "candidate-profile") {
    return `${route.kind}:${route.tab}`;
  }

  return `${route.kind}:${route.jobId}`;
}

export function inferApplicationTransitionDirection(
  previousRoute: AppRoute,
  nextRoute: AppRoute
): ApplicationTransitionDirection {
  const previousOrder = APPLICATION_ROUTE_ORDER[previousRoute.kind];
  const nextOrder = APPLICATION_ROUTE_ORDER[nextRoute.kind];

  if (previousOrder === nextOrder) {
    return "neutral";
  }

  return nextOrder > previousOrder ? "forward" : "back";
}

export function getApplicationTransitionExitDuration(
  direction: ApplicationTransitionDirection,
  variant: ApplicationTransitionVariant
): number {
  if (variant === "none" || variant === "handoff") {
    return 0;
  }

  if (variant === "success") {
    return 190;
  }

  if (variant === "blur") {
    return 320;
  }

  if (direction === "back") {
    return 150;
  }

  if (direction === "neutral") {
    return 90;
  }

  return 170;
}

export function getApplicationTransitionEnterDuration(
  direction: ApplicationTransitionDirection,
  variant: ApplicationTransitionVariant
): number {
  if (variant === "none") {
    return 0;
  }

  if (variant === "success") {
    return 120;
  }

  if (variant === "blur") {
    return 520;
  }

  if (variant === "handoff") {
    return 260;
  }

  if (direction === "back") {
    return 220;
  }

  if (direction === "neutral") {
    return 120;
  }

  return 260;
}

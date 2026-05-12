import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ApplicationAuthPage } from "../pages/ApplicationAuthPage";
import { ApplicationCareerHistoryPage } from "../pages/ApplicationCareerHistoryPage";
import { ApplicationConfirmPage } from "../pages/ApplicationConfirmPage";
import { ApplicationPersonalDetailsPage } from "../pages/ApplicationPersonalDetailsPage";
import { ApplicationParsingPage } from "../pages/ApplicationParsingPage";
import { ApplicationRoleQuestionsPage } from "../pages/ApplicationRoleQuestionsPage";
import { ApplicationUploadPage } from "../pages/ApplicationUploadPage";
import { CandidateProfilePage } from "../pages/CandidateProfilePage";
import { GlobalAuthPage } from "../pages/GlobalAuthPage";
import { HomePage } from "../pages/HomePage";
import { JobViewPage } from "../pages/JobViewPage";
import { SearchResultsPage } from "../pages/SearchResultsPage";
import { TermsPage } from "../pages/TermsPage";
import {
  ApplicationRouteTransition,
  ApplicationRouteTransitionProvider
} from "../components/application/ApplicationRouteTransition";
import { PageChromeFooter, PageChromeHeader } from "../components/PageChrome";
import { readJobView } from "../api/jobs";
import { readPrototypeSession } from "../lib/prototype-auth";
import {
  buildApplicationAuthPath,
  buildApplicationCareerHistoryPath,
  buildApplicationConfirmPath,
  buildApplicationParsingPath,
  buildApplicationPersonalDetailsPath,
  buildApplicationRoleQuestionsPath,
  buildApplicationUploadPath,
  navigateTo,
  REFERENCE_JOB_ID,
  resolveRoute,
  subscribeToRouteChanges
} from "../lib/router";
import type { AppRoute } from "../lib/router";

function buildProtectedApplicationRoutePath(route: AppRoute): string | null {
  if (route.kind === "application-upload") {
    return buildApplicationUploadPath(route.jobId);
  }

  if (route.kind === "application-parsing") {
    return buildApplicationParsingPath(route.jobId);
  }

  if (route.kind === "application-personal-details") {
    return buildApplicationPersonalDetailsPath(route.jobId);
  }

  if (route.kind === "application-role-questions") {
    return buildApplicationRoleQuestionsPath(route.jobId);
  }

  if (route.kind === "application-career-history") {
    return buildApplicationCareerHistoryPath(route.jobId);
  }

  if (route.kind === "application-confirm") {
    return buildApplicationConfirmPath(route.jobId);
  }

  return null;
}

function currentPathWithSearch(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function HomeRecovery(): JSX.Element {
  useLayoutEffect(() => {
    if (window.location.pathname !== "/" || window.location.search) {
      navigateTo("/", { replace: true });
    }
  }, []);

  return <HomePage />;
}

export function App(): JSX.Element {
  const [routeVersion, setRouteVersion] = useState(0);
  const route = useMemo(() => resolveRoute(window.location), [routeVersion]);
  const locationKey = `${window.location.pathname}${window.location.search}`;

  useEffect(() => {
    return subscribeToRouteChanges(() => {
      setRouteVersion((currentVersion) => currentVersion + 1);
    });
  }, []);

  useEffect(() => {
    const isProtectedApplicationRoute =
      route.kind === "application-upload" ||
      route.kind === "application-parsing" ||
      route.kind === "application-role-questions" ||
      route.kind === "application-personal-details" ||
      route.kind === "application-career-history" ||
      route.kind === "application-confirm";

    if (!isProtectedApplicationRoute || readPrototypeSession() || !readJobView(route.jobId)) {
      return;
    }

    const intendedPath = buildProtectedApplicationRoutePath(route);

    if (!intendedPath) {
      return;
    }

    navigateTo(
      buildApplicationAuthPath(route.jobId, "signin", {
        next: intendedPath
      }),
      { replace: true }
    );
  }, [route]);

  const invalidJobRoute = "jobId" in route && !readJobView(route.jobId);
  let content: JSX.Element;

  if (invalidJobRoute) {
    content = <HomeRecovery />;
  } else {
    switch (route.kind) {
      case "home":
        content = <HomePage />;
        break;
      case "global-auth":
        content = <GlobalAuthPage initialMode={route.mode} />;
        break;
      case "job-search":
        content = <SearchResultsPage />;
        break;
      case "terms":
        content = <TermsPage />;
        break;
      case "job-view":
        content = (
          <JobViewPage initialLayout={route.layout} initialMotion={route.motion} jobId={route.jobId} />
        );
        break;
      case "application-auth":
        content = <ApplicationAuthPage initialMode={route.mode} jobId={route.jobId} />;
        break;
      case "application-upload":
        content = <ApplicationUploadPage jobId={route.jobId} />;
        break;
      case "application-parsing":
        content = <ApplicationParsingPage jobId={route.jobId} />;
        break;
      case "application-role-questions":
        content = <ApplicationRoleQuestionsPage jobId={route.jobId} />;
        break;
      case "application-personal-details":
        content = <ApplicationPersonalDetailsPage jobId={route.jobId} />;
        break;
      case "application-career-history":
        content = <ApplicationCareerHistoryPage jobId={route.jobId} />;
        break;
      case "application-confirm":
        content = <ApplicationConfirmPage jobId={route.jobId} />;
        break;
      case "candidate-profile":
        content = readPrototypeSession() ? (
          <CandidateProfilePage initialTab={route.tab} />
        ) : (
          <GlobalAuthPage initialMode="signin" nextPath={currentPathWithSearch()} />
        );
        break;
      case "not-found":
        content = <HomeRecovery />;
        break;
      default: {
        const exhaustiveCheck: never = route;
        throw new Error(`Unhandled route kind: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }
  }

  const chromeJobId =
    "jobId" in route && !invalidJobRoute
      ? route.jobId
      : route.kind === "job-search"
        ? REFERENCE_JOB_ID
        : undefined;
  const isApplicationSurface =
    route.kind === "job-search" ||
    route.kind === "global-auth" ||
    route.kind === "job-view" ||
    route.kind === "application-auth" ||
    route.kind === "application-upload" ||
    route.kind === "application-parsing" ||
    route.kind === "application-role-questions" ||
    route.kind === "application-personal-details" ||
    route.kind === "application-career-history" ||
    route.kind === "application-confirm" ||
    route.kind === "not-found";

  return (
    <ApplicationRouteTransitionProvider locationKey={locationKey} route={route}>
      <div className="app-shell">
        <PageChromeHeader
          jobId={chromeJobId}
          showSearch={route.kind !== "home" && route.kind !== "job-search"}
        />
        <main className="app-main" data-surface={isApplicationSurface ? "application" : undefined}>
          <ApplicationRouteTransition route={route}>{content}</ApplicationRouteTransition>
        </main>
        <PageChromeFooter />
      </div>
    </ApplicationRouteTransitionProvider>
  );
}

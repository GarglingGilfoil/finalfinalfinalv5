import { useEffect, useMemo, useState } from "react";
import { ApplicationAuthPage } from "../pages/ApplicationAuthPage";
import { ApplicationCareerHistoryPage } from "../pages/ApplicationCareerHistoryPage";
import { ApplicationConfirmPage } from "../pages/ApplicationConfirmPage";
import { ApplicationPersonalDetailsPage } from "../pages/ApplicationPersonalDetailsPage";
import { ApplicationParsingPage } from "../pages/ApplicationParsingPage";
import { ApplicationRoleQuestionsPage } from "../pages/ApplicationRoleQuestionsPage";
import { ApplicationUploadPage } from "../pages/ApplicationUploadPage";
import { CandidateProfilePage } from "../pages/CandidateProfilePage";
import { HomePage } from "../pages/HomePage";
import { JobViewPage } from "../pages/JobViewPage";
import { SearchResultsPage } from "../pages/SearchResultsPage";
import {
  ApplicationRouteTransition,
  ApplicationRouteTransitionProvider
} from "../components/application/ApplicationRouteTransition";
import { PageChromeFooter, PageChromeHeader } from "../components/PageChrome";
import { REFERENCE_JOB_ID, resolveRoute, subscribeToRouteChanges } from "../lib/router";

export function App(): JSX.Element {
  const [routeVersion, setRouteVersion] = useState(0);
  const route = useMemo(() => resolveRoute(window.location), [routeVersion]);

  useEffect(() => {
    return subscribeToRouteChanges(() => {
      setRouteVersion((currentVersion) => currentVersion + 1);
    });
  }, []);

  let content: JSX.Element;

  if (route.kind === "home") {
    content = <HomePage />;
  } else if (route.kind === "job-search") {
    content = <SearchResultsPage />;
  } else if (route.kind === "application-auth") {
    content = <ApplicationAuthPage initialMode={route.mode} jobId={route.jobId} />;
  } else if (route.kind === "application-upload") {
    content = <ApplicationUploadPage jobId={route.jobId} />;
  } else if (route.kind === "application-parsing") {
    content = <ApplicationParsingPage jobId={route.jobId} />;
  } else if (route.kind === "application-role-questions") {
    content = <ApplicationRoleQuestionsPage jobId={route.jobId} />;
  } else if (route.kind === "application-personal-details") {
    content = <ApplicationPersonalDetailsPage jobId={route.jobId} />;
  } else if (route.kind === "application-career-history") {
    content = <ApplicationCareerHistoryPage jobId={route.jobId} />;
  } else if (route.kind === "application-confirm") {
    content = <ApplicationConfirmPage jobId={route.jobId} />;
  } else if (route.kind === "candidate-profile") {
    content = <CandidateProfilePage />;
  } else {
    content = (
      <JobViewPage initialLayout={route.layout} initialMotion={route.motion} jobId={route.jobId} />
    );
  }

  const chromeJobId =
    "jobId" in route ? route.jobId : route.kind === "job-search" ? REFERENCE_JOB_ID : undefined;

  return (
    <ApplicationRouteTransitionProvider route={route}>
      <div className="app-shell">
        <PageChromeHeader
          jobId={chromeJobId}
          showSearch={route.kind !== "home" && route.kind !== "job-search"}
        />
        <main className="app-main">
          <ApplicationRouteTransition route={route}>{content}</ApplicationRouteTransition>
        </main>
        <PageChromeFooter />
      </div>
    </ApplicationRouteTransitionProvider>
  );
}

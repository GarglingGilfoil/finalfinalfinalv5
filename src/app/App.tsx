import { useEffect } from "react";
import { ApplicationAuthPage } from "../pages/ApplicationAuthPage";
import { ApplicationCareerHistoryPage } from "../pages/ApplicationCareerHistoryPage";
import { ApplicationParsingPage } from "../pages/ApplicationParsingPage";
import { ApplicationUploadPage } from "../pages/ApplicationUploadPage";
import { JobViewPage } from "../pages/JobViewPage";
import { PageChromeFooter, PageChromeHeader } from "../components/PageChrome";
import { buildJobViewPath, resolveRoute } from "../lib/router";

export function App(): JSX.Element {
  const route = resolveRoute(window.location);

  useEffect(() => {
    if (route.kind !== "job-view") {
      return;
    }

    const canonicalPath = buildJobViewPath(route.jobId);
    const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
    const canonicalUrl = canonicalPath;

    if (`${currentPath}${window.location.search}` !== canonicalUrl) {
      window.history.replaceState({}, "", canonicalUrl);
    }
  }, [route]);

  let content: JSX.Element;

  if (route.kind === "application-auth") {
    content = <ApplicationAuthPage initialMode={route.mode} jobId={route.jobId} />;
  } else if (route.kind === "application-upload") {
    content = <ApplicationUploadPage jobId={route.jobId} />;
  } else if (route.kind === "application-parsing") {
    content = <ApplicationParsingPage jobId={route.jobId} />;
  } else if (route.kind === "application-career-history") {
    content = <ApplicationCareerHistoryPage jobId={route.jobId} />;
  } else {
    content = (
      <JobViewPage initialLayout={route.layout} initialMotion={route.motion} jobId={route.jobId} />
    );
  }

  return (
    <div className="app-shell">
      <PageChromeHeader jobId={route.jobId} />
      <main className="app-main">{content}</main>
      <PageChromeFooter />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { getJobView } from "../api/jobs";
import {
  CompanySummary,
  FactGrid,
  RecommendedJobsSection,
  TokenGroup
} from "../components/JobCards";
import { JobBodySections } from "../components/JobBodySections";
import type { JobViewData } from "../contracts/job-view";
import {
  buildApplicationAuthPath,
  type JobViewLayoutVariant,
  type JobViewMotionVariant
} from "../lib/router";

interface JobViewPageProps {
  initialLayout: JobViewLayoutVariant;
  initialMotion: JobViewMotionVariant;
  jobId: string;
}

interface LayoutBlocks {
  bottomApplyAction: JSX.Element;
  companySummary: JSX.Element;
  coverImage: JSX.Element | null;
  factGrid: JSX.Element;
  jobDescription: JSX.Element;
  masthead: JSX.Element;
  primaryApplyAction: JSX.Element;
  taxonomy: JSX.Element;
}

type LoadState = "loading" | "ready" | "missing";

function useMediaQuery(query: string): boolean {
  const getMatches = (): boolean => window.matchMedia(query).matches;
  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const handleChange = (): void => {
      setMatches(mediaQueryList.matches);
    };

    handleChange();
    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

function LoadingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <section className="job-view__stack">
        <div className="surface-card skeleton skeleton--sheet" />
      </section>
    </div>
  );
}

function MissingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <section className="job-view__stack">
        <div className="surface-card surface-card--section">
          <p className="section-kicker">Unavailable</p>
          <h1>Job not found</h1>
          <p className="muted-copy">
            This route is wired for the Ditto Jobs job-view template, but the requested
            job payload was not available.
          </p>
        </div>
      </section>
    </div>
  );
}

function JobMasthead({
  action,
  companyInitial,
  job
}: {
  action?: JSX.Element;
  companyInitial: string;
  job: JobViewData;
}): JSX.Element {
  return (
    <div
      className={[
        "job-sheet__masthead-shell",
        action ? "job-sheet__masthead-shell--with-aside" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="job-sheet__masthead">
        <div className="job-sheet__logo-badge">
          {job.companyLogoUrl ? (
            <img alt={`${job.companyName} logo`} src={job.companyLogoUrl} />
          ) : (
            <span className="job-sheet__logo-fallback">{companyInitial}</span>
          )}
        </div>

        <div className="job-sheet__masthead-content">
          <h1>{job.title}</h1>
          <p className="job-sheet__subline">
            <span className="job-sheet__subline-employer">{job.companyName}</span>
            <span aria-hidden="true">·</span>
            <span>{job.location}</span>
          </p>
        </div>
      </div>

      {action ? <div className="job-sheet__masthead-aside">{action}</div> : null}
    </div>
  );
}

function JobCoverImage({ job }: { job: JobViewData }): JSX.Element | null {
  if (!job.companyCoverImageUrl) {
    return null;
  }

  return (
    <div className="job-sheet__cover-media" aria-hidden="true">
      <img alt="" src={job.companyCoverImageUrl} />
    </div>
  );
}

function JobViewAmbient({ motion }: { motion: JobViewMotionVariant }): JSX.Element | null {
  if (motion !== "drift") {
    return null;
  }

  return (
    <div aria-hidden="true" className="job-view__ambient">
      <span className="job-view__ambient-field" />
      <span className="job-view__ambient-glow job-view__ambient-glow--left" />
      <span className="job-view__ambient-glow job-view__ambient-glow--right" />
      <span className="job-view__ambient-plane" />
      <span className="job-view__ambient-trace" />
      <span className="job-view__ambient-veil" />
    </div>
  );
}

function renderDesktopLayout(
  layout: JobViewLayoutVariant,
  motion: JobViewMotionVariant,
  isMotionReady: boolean,
  blocks: LayoutBlocks
): JSX.Element {
  const articleClassName = [
    "job-sheet",
    `job-sheet--layout-${layout}`,
    `job-sheet--motion-${motion}`,
    isMotionReady ? "job-sheet--motion-ready" : "",
    "surface-card"
  ]
    .filter(Boolean)
    .join(" ");

  switch (layout) {
    case 2:
      return (
        <article className={articleClassName}>
          {blocks.coverImage}
          <header className="job-sheet__header job-sheet__header--editorial">
            <div className="job-sheet__hero-row">{blocks.masthead}</div>
            <div className="job-sheet__hero-cta-row">{blocks.primaryApplyAction}</div>
            <div className="job-sheet__fact-band">{blocks.factGrid}</div>
            <div className="job-sheet__support-row job-sheet__support-row--taxonomy-light">
              {blocks.taxonomy}
            </div>
          </header>

          <div className="job-sheet__body job-sheet__body--editorial">
            {blocks.jobDescription}
            {blocks.companySummary}
            {blocks.bottomApplyAction}
          </div>
        </article>
      );

    case 3:
      return (
        <article className={articleClassName}>
          {blocks.coverImage}
          <header className="job-sheet__header job-sheet__header--compact">
            {blocks.masthead}
          </header>

          <div className="job-sheet__body job-sheet__body--rail-layout">
            <aside className="job-sheet__summary-rail">
              <div className="job-sheet__summary-card job-sheet__summary-card--cta">
                {blocks.primaryApplyAction}
              </div>
              <div className="job-sheet__summary-card">{blocks.factGrid}</div>
              <div className="job-sheet__summary-card job-sheet__summary-card--light">
                {blocks.taxonomy}
              </div>
              <div className="job-sheet__summary-card job-sheet__summary-card--light">
                {blocks.companySummary}
              </div>
            </aside>

            <div className="job-sheet__article-column">{blocks.jobDescription}</div>
          </div>

          <div className="job-sheet__body job-sheet__body--footer-only">
            {blocks.bottomApplyAction}
          </div>
        </article>
      );

    case 4:
      return (
        <article className={articleClassName}>
          {blocks.coverImage}
          <header className="job-sheet__header job-sheet__header--compact">
            <div className="job-sheet__hero-row job-sheet__hero-row--with-inline-cta">
              {blocks.masthead}
              <div className="job-sheet__hero-inline-cta">{blocks.primaryApplyAction}</div>
            </div>
          </header>

          <div className="job-sheet__body job-sheet__body--companion-layout">
            <div className="job-sheet__article-column">{blocks.jobDescription}</div>

            <aside className="job-sheet__companion-column">
              <div className="job-sheet__summary-card job-sheet__summary-card--light">
                {blocks.companySummary}
              </div>
              <div className="job-sheet__summary-card">{blocks.factGrid}</div>
              <div className="job-sheet__summary-card job-sheet__summary-card--light">
                {blocks.taxonomy}
              </div>
            </aside>
          </div>

          <div className="job-sheet__body job-sheet__body--footer-only">
            {blocks.bottomApplyAction}
          </div>
        </article>
      );

    case 5:
      return (
        <article className={articleClassName}>
          {blocks.coverImage}
          <header className="job-sheet__header job-sheet__header--compact">
            {blocks.masthead}
          </header>

          <div className="job-sheet__body job-sheet__body--sticky-layout">
            <div className="job-sheet__article-column job-sheet__article-column--with-company-tail">
              {blocks.jobDescription}
              {blocks.companySummary}
            </div>

            <aside className="job-sheet__action-rail">
              <div className="job-sheet__action-rail-inner">
                <div className="job-sheet__summary-card job-sheet__summary-card--cta">
                  {blocks.primaryApplyAction}
                </div>
                <div className="job-sheet__summary-card">{blocks.factGrid}</div>
                <div className="job-sheet__summary-card job-sheet__summary-card--light">
                  {blocks.taxonomy}
                </div>
              </div>
            </aside>
          </div>

          <div className="job-sheet__body job-sheet__body--footer-only">
            {blocks.bottomApplyAction}
          </div>
        </article>
      );

    case 1:
    default:
      return (
        <article className={articleClassName}>
          {blocks.coverImage}
          <header className="job-sheet__header job-sheet__header--split-hero">
            <div className="job-sheet__hero-grid">
              <div className="job-sheet__hero-main">{blocks.masthead}</div>
              <aside className="job-sheet__apply-panel">{blocks.primaryApplyAction}{blocks.factGrid}</aside>
            </div>
            <div className="job-sheet__support-row job-sheet__support-row--taxonomy-light">
              {blocks.taxonomy}
            </div>
          </header>

          <div className="job-sheet__body job-sheet__body--stacked">
            {blocks.jobDescription}
            {blocks.companySummary}
            {blocks.bottomApplyAction}
          </div>
        </article>
      );
  }
}

function renderMobileLayout(
  blocks: LayoutBlocks,
  motion: JobViewMotionVariant,
  isMotionReady: boolean
): JSX.Element {
  return (
    <article
      className={[
        "job-sheet",
        "job-sheet--mobile",
        `job-sheet--motion-${motion}`,
        isMotionReady ? "job-sheet--motion-ready" : "",
        "surface-card"
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {blocks.coverImage}
      <header className="job-sheet__header job-sheet__header--mobile">
        {blocks.masthead}
      </header>

      <div className="job-sheet__body job-sheet__body--mobile-layout">
        <div className="job-sheet__mobile-primary-action">{blocks.primaryApplyAction}</div>
        <div className="job-sheet__mobile-facts">{blocks.factGrid}</div>
        <div className="job-sheet__mobile-taxonomy">{blocks.taxonomy}</div>
        {blocks.jobDescription}
        {blocks.companySummary}
        {blocks.bottomApplyAction}
      </div>
    </article>
  );
}

function ReadyState({
  initialLayout,
  initialMotion,
  job
}: {
  initialLayout: JobViewLayoutVariant;
  initialMotion: JobViewMotionVariant;
  job: JobViewData;
}): JSX.Element {
  const isMobile = useMediaQuery("(max-width: 720px)");
  const [isMotionReady, setIsMotionReady] = useState(false);
  const activeLayout = initialLayout;
  const activeMotion = initialMotion;
  const facts = useMemo(
    () => [
      { label: "Date posted", value: job.datePostedLabel },
      { label: "Seniority", value: job.seniorityLevel },
      { label: "Employment type", value: job.employmentType },
      { label: "Salary", value: job.salaryLabel },
      { label: "Experience", value: job.experienceRangeLabel }
    ],
    [job]
  );
  const companyInitial = job.companyName.trim().charAt(0).toUpperCase() || "C";
  const applyHref = buildApplicationAuthPath(job.id, "signin");

  useEffect(() => {
    setIsMotionReady(false);
    const animationFrame = window.requestAnimationFrame(() => {
      setIsMotionReady(true);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [activeLayout, activeMotion, isMobile, job.id]);

  const primaryApplyAction = (
    <a className="button button--job-primary job-sheet__primary-apply" href={applyHref}>
      Apply Now
    </a>
  );

  const blocks: LayoutBlocks = {
    coverImage: <JobCoverImage job={job} />,
    masthead: <JobMasthead companyInitial={companyInitial} job={job} />,
    factGrid: <FactGrid className="job-sheet__fact-grid" items={facts} />,
    taxonomy: (
      <TokenGroup
        className="job-sheet__taxonomy"
        groups={[
          { title: "Industries", items: job.industries },
          { title: "Skills", items: job.skills }
        ]}
      />
    ),
    companySummary: <CompanySummary className="job-sheet__company-summary" job={job} />,
    jobDescription: <JobBodySections html={job.jobDescriptionHtml} />,
    primaryApplyAction,
    bottomApplyAction: (
      <div className="job-sheet__footer-actions">
        <a className="button button--job-primary" href={applyHref}>
          Apply Now
        </a>
      </div>
    )
  };

  return (
    <div
      className={[
        "job-view__shell",
        activeMotion === "drift" ? "job-view__shell--motion-drift" : ""
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <JobViewAmbient motion={activeMotion} />
      <section className="job-view__stack">
        {isMobile
          ? renderMobileLayout(blocks, activeMotion, isMotionReady)
          : renderDesktopLayout(activeLayout, activeMotion, isMotionReady, blocks)}
      </section>

      <RecommendedJobsSection jobs={job.recommendedJobs} />
    </div>
  );
}

export function JobViewPage({
  initialLayout,
  initialMotion,
  jobId
}: JobViewPageProps): JSX.Element {
  const [state, setState] = useState<LoadState>("loading");
  const [job, setJob] = useState<JobViewData | null>(null);

  useEffect(() => {
    let cancelled = false;

    setState("loading");
    setJob(null);

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

  return <ReadyState initialLayout={initialLayout} initialMotion={initialMotion} job={job} />;
}

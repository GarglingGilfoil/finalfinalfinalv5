import { Search } from "lucide-react";
import { TransitionLink } from "../components/application/TransitionLink";
import { buildJobViewPath, REFERENCE_JOB_ID } from "../lib/router";

export function JobSearchPlaceholderPage(): JSX.Element {
  const params = new URLSearchParams(window.location.search);
  const title = params.get("title")?.trim();
  const location = params.get("location")?.trim();

  return (
    <div className="job-search-placeholder">
      <section className="job-search-placeholder__card surface-card">
        <span className="job-search-placeholder__icon">
          <Search aria-hidden="true" />
        </span>
        <p className="section-kicker">Search results</p>
        <h1>Search results are coming soon</h1>
        <p>
          We saved your search safely without rendering the job view or building
          filters in this ticket.
        </p>

        {title || location ? (
          <dl className="job-search-placeholder__summary">
            {title ? (
              <>
                <dt>Title</dt>
                <dd>{title}</dd>
              </>
            ) : null}
            {location ? (
              <>
                <dt>Location</dt>
                <dd>{location}</dd>
              </>
            ) : null}
          </dl>
        ) : null}

        <div className="job-search-placeholder__actions">
          <TransitionLink className="button button--primary" href="/" source="search-home">
            Back to home
          </TransitionLink>
          <TransitionLink
            className="button button--ghost"
            href={buildJobViewPath(REFERENCE_JOB_ID)}
            source="search-reference-job"
          >
            View sample job
          </TransitionLink>
        </div>
      </section>
    </div>
  );
}


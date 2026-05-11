import { Search } from "lucide-react";
import { TransitionLink } from "../components/application/TransitionLink";
import { buildJobSearchPath } from "../lib/router";

export function NotFoundPage(): JSX.Element {
  return (
    <div className="not-found-page">
      <section className="not-found-card surface-card surface-card--section">
        <span className="not-found-card__icon" aria-hidden="true">
          <Search />
        </span>
        <p className="section-kicker">Page not found</p>
        <h1>We couldn’t find that page</h1>
        <p className="muted-copy">
          The link may be outdated, moved, or no longer available.
        </p>
        <div className="not-found-card__actions">
          <TransitionLink
            className="button button--job-primary"
            href={buildJobSearchPath()}
            source="guard-recovery"
          >
            Search jobs
          </TransitionLink>
          <TransitionLink className="button button--ghost" direction="back" href="/" source="guard-recovery">
            Go home
          </TransitionLink>
        </div>
      </section>
    </div>
  );
}

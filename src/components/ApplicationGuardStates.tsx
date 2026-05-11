import { ApplicationStepShell } from "./ApplicationStepShell";
import { TransitionLink } from "./application/TransitionLink";

interface ApplicationUnavailableStateProps {
  copy?: string;
  title?: string;
}

export function ApplicationUnavailableState({
  copy = "The role may have moved, expired, or is no longer available.",
  title = "Application step not available"
}: ApplicationUnavailableStateProps): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <p className="section-kicker">Unavailable</p>
          <h1>{title}</h1>
          <p className="muted-copy">{copy}</p>
          <div className="application-step__guard-actions">
            <TransitionLink
              className="button button--job-primary"
              href="/"
              source="guard-recovery"
            >
              Go home
            </TransitionLink>
            <TransitionLink className="button button--ghost" href="/jobs/search" source="guard-recovery">
              Search jobs
            </TransitionLink>
          </div>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

import { buildApplicationAuthPath, buildJobViewPath } from "../lib/router";

interface PageChromeHeaderProps {
  jobId: string;
}

export function PageChromeHeader({ jobId }: PageChromeHeaderProps): JSX.Element {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="site-header__brand" href={buildJobViewPath(jobId)}>
          <img
            alt="Ditto Jobs"
            className="site-header__wordmark"
            src="/brand/ditto-wordmark.svg"
          />
        </a>

        <nav aria-label="Account actions" className="site-header__actions">
          <a className="button button--ghost" href={buildApplicationAuthPath(jobId, "signin")}>
            Log in
          </a>
          <a className="button button--primary" href={buildApplicationAuthPath(jobId, "signup")}>
            Sign up
          </a>
        </nav>
      </div>
    </header>
  );
}

export function PageChromeFooter(): JSX.Element {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand-block">
          <img
            alt="Ditto Jobs"
            className="site-footer__mark"
            src="/brand/ditto-mark.svg"
          />
          <div>
            <p className="site-footer__eyebrow">Ditto Jobs</p>
            <p className="site-footer__caption">
              Public opportunities presented in the Ditto family.
            </p>
          </div>
        </div>

        <div className="site-footer__links">
          <a href="https://www.ditto.jobs/legal/terms">Terms &amp; Conditions</a>
          <a href="https://www.ditto.jobs/legal/privacy">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}

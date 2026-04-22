import type { ReactNode } from "react";
import type { ApplicationAuthMode } from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { EmployerContextPanel } from "./EmployerContextPanel";

interface ApplicationAuthShellProps {
  children: ReactNode;
  contextMessage?: string;
  job: JobViewData;
  mode?: ApplicationAuthMode;
}

export function ApplicationAuthShell({
  children,
  contextMessage,
  job,
  mode
}: ApplicationAuthShellProps): JSX.Element {
  return (
    <section className="application-auth">
      <div className="application-auth__layout surface-card" data-mode={mode ?? "signin"}>
        <div className="application-auth__context-panel">
          <div className="application-auth__context-ambient" aria-hidden="true">
            <span className="application-auth__ambient-glow" />
            <span className="application-auth__ambient-glass-plane" />
            <span className="application-auth__ambient-trace" />
            <span className="application-auth__ambient-trace application-auth__ambient-trace--two" />
            <span className="application-auth__ambient-guide application-auth__ambient-guide--one" />
            <span className="application-auth__ambient-guide application-auth__ambient-guide--two" />
            <span className="application-auth__ambient-shimmer" />
            <span className="application-auth__ambient-shimmer application-auth__ambient-shimmer--soft" />
          </div>

          <div className="application-auth__context-inner">
            <EmployerContextPanel job={job} message={contextMessage} />
          </div>
        </div>

        <div className="application-auth__form-panel">
          <div className="application-auth__form-card" data-mode={mode}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

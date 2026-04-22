import type { ReactNode } from "react";

interface ApplicationStepShellProps {
  children: ReactNode;
}

export function ApplicationStepShell({ children }: ApplicationStepShellProps): JSX.Element {
  return (
    <section className="application-step">
      <div aria-hidden="true" className="application-step__ambient">
        <span className="application-step__glow application-step__glow--one" />
        <span className="application-step__glow application-step__glow--two" />
        <span className="application-step__beam" />
      </div>

      <div className="application-step__inner">{children}</div>
    </section>
  );
}

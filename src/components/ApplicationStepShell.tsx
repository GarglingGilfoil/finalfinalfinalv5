import type { ReactNode } from "react";

interface ApplicationStepShellProps {
  children: ReactNode;
  ambientMode?: "default" | "quiet";
}

export function ApplicationStepShell({
  children,
  ambientMode = "default"
}: ApplicationStepShellProps): JSX.Element {
  void ambientMode;

  return (
    <section className="application-step">
      <div className="application-step__inner">{children}</div>
    </section>
  );
}

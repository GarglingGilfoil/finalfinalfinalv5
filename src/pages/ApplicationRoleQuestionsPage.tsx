import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { getJobView, readJobView } from "../api/jobs";
import { ApplicationUnavailableState } from "../components/ApplicationGuardStates";
import { ApplicationStepShell } from "../components/ApplicationStepShell";
import { TransitionLink } from "../components/application/TransitionLink";
import { CompanyApplicationHeading } from "../components/ResumeUploadSection";
import { useApplicationRouteTransition } from "../hooks/useApplicationRouteTransition";
import {
  getSelectedResumeForApplication,
  readPrototypeApplicationRecord
} from "../lib/prototype-application";
import type {
  ApplicationQualifier,
  CandidatePersonalDetailsState,
  CandidateResumeState,
  CandidateRoleQuestionsState,
  CandidateSession
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { readPrototypeSession } from "../lib/prototype-auth";
import { readPrototypePersonalDetailsState } from "../lib/prototype-personal-details";
import { readPrototypeResumeState } from "../lib/prototype-resume";
import {
  buildPrototypeRoleQuestionsState,
  mockRoleQuestions,
  readPrototypeRoleQuestionsState,
  savePrototypeRoleQuestionsState
} from "../lib/prototype-role-questions";
import {
  buildApplicationAuthPath,
  buildApplicationCareerHistoryPath,
  buildApplicationConfirmPath,
  buildApplicationPersonalDetailsPath,
  buildApplicationUploadPath,
  buildJobViewPath,
  readNavigationState
} from "../lib/router";

interface ApplicationRoleQuestionsPageProps {
  jobId: string;
}

type LoadState = "loading" | "ready" | "missing";
type ArrivalState = "arriving" | "settled";
type RoleQuestionsErrors = Record<string, string | undefined>;
type RoleQuestionControl = HTMLButtonElement | HTMLInputElement;

interface RoleQuestionsHandoffPayload {
  transitionAt?: string;
  transitionSource?: "personal-details-complete" | "direct-entry" | string;
  transitionVariant?: string;
}

function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => {
      setReducedMotion(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => {
        mediaQuery.removeEventListener("change", update);
      };
    }

    mediaQuery.addListener(update);
    return () => {
      mediaQuery.removeListener(update);
    };
  }, []);

  return reducedMotion;
}

function validateRoleQuestion(question: ApplicationQualifier, rawValue: string | undefined): string | undefined {
  const value = rawValue?.trim() ?? "";

  if (question.inputType === "yes_no") {
    if (!value) {
      return "Please select an answer.";
    }

    return question.options?.includes(value) ? undefined : "Please select an answer.";
  }

  if (question.inputType === "number") {
    if (value === "") {
      return "Please enter a number.";
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "Please enter a number.";
    }

    if (typeof question.min === "number" && numericValue < question.min) {
      return "Enter 0 or more.";
    }

    if (typeof question.max === "number" && numericValue > question.max) {
      return `Enter ${question.max} or less.`;
    }
  }

  return undefined;
}

function validateRoleQuestions(
  questions: ApplicationQualifier[],
  answers: Record<string, string>
): RoleQuestionsErrors {
  return questions.reduce<RoleQuestionsErrors>((errors, question) => {
    const error = validateRoleQuestion(question, answers[question.id]);

    if (error) {
      errors[question.id] = error;
    }

    return errors;
  }, {});
}

function LoadingState(): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <div className="application-step__panel surface-card skeleton skeleton--sheet" />
      </ApplicationStepShell>
    </div>
  );
}

function MissingState(): JSX.Element {
  return <ApplicationUnavailableState />;
}

function SessionGuard({ job }: { job: JobViewData }): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Continue your application</h1>
          <p className="muted-copy">Sign in before you answer role questions for {job.title}.</p>
          <div className="application-step__guard-actions">
            <TransitionLink
              className="button button--job-primary"
              href={buildApplicationAuthPath(job.id, "signin", {
                next: `${window.location.pathname}${window.location.search}`
              })}
              source="guard-recovery"
            >
              Go to application sign in
            </TransitionLink>
            <TransitionLink
              className="button button--ghost"
              direction="back"
              href={buildJobViewPath(job.id)}
              source="guard-recovery"
            >
              Back to job view
            </TransitionLink>
          </div>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function MissingResumeState({ job }: { job: JobViewData }): JSX.Element {
  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Resume required</h1>
          <p className="muted-copy">Upload a resume before you answer role questions for {job.title}.</p>
          <div className="application-step__guard-actions">
            <TransitionLink
              className="button button--job-primary"
              direction="back"
              href={buildApplicationUploadPath(job.id)}
              source="guard-recovery"
            >
              Back to resume upload
            </TransitionLink>
          </div>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function MissingPersonalDetailsState({ job }: { job: JobViewData }): JSX.Element {
  const { transitionTo } = useApplicationRouteTransition();

  useEffect(() => {
    transitionTo(buildApplicationPersonalDetailsPath(job.id), {
      direction: "back",
      replace: true,
      source: "guard-recovery"
    });
  }, [job.id, transitionTo]);

  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Personal details needed</h1>
          <p className="muted-copy">Add your profile details before answering role questions for {job.title}.</p>
          <div className="application-step__guard-actions">
            <TransitionLink
              className="button button--job-primary"
              direction="back"
              href={buildApplicationPersonalDetailsPath(job.id)}
              source="guard-recovery"
            >
              Go to personal details
            </TransitionLink>
          </div>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

function RoleQuestionYesNoSelect({
  error,
  errorId,
  fieldId,
  inputRef,
  onBlur,
  onChange,
  options,
  value
}: {
  error?: string;
  errorId: string;
  fieldId: string;
  inputRef: (node: HTMLButtonElement | null) => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}): JSX.Element {
  const listboxId = `${fieldId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(options.indexOf(value), 0));
  const selectedIndex = options.indexOf(value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : "";

  useEffect(() => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [selectedIndex]);

  const setTriggerNode = (node: HTMLButtonElement | null): void => {
    triggerRef.current = node;
    inputRef(node);
  };

  const closeDropdown = (): void => {
    setIsOpen(false);
  };

  const commitOption = (nextValue: string): void => {
    onChange(nextValue);
    closeDropdown();
    window.setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  };

  const openDropdown = (nextActiveIndex = selectedIndex >= 0 ? selectedIndex : 0): void => {
    setActiveIndex(nextActiveIndex);
    setIsOpen(true);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown(selectedIndex >= 0 ? selectedIndex : 0);
        return;
      }

      setActiveIndex((current) => Math.min(current + 1, options.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown(options.length - 1);
        return;
      }

      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      openDropdown(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      openDropdown(options.length - 1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeDropdown();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isOpen) {
        openDropdown();
        return;
      }

      const activeOption = options[activeIndex];
      if (activeOption) {
        commitOption(activeOption);
      }
    }
  };

  return (
    <div
      className="career-review-select-field role-questions-card__select-field"
      onBlur={(event) => {
        const nextFocusedTarget = event.relatedTarget;

        if (nextFocusedTarget instanceof Node && rootRef.current?.contains(nextFocusedTarget)) {
          return;
        }

        closeDropdown();
        onBlur();
      }}
      ref={rootRef}
    >
      <button
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${fieldId}-option-${activeIndex}` : undefined}
        aria-controls={isOpen ? listboxId : undefined}
        aria-describedby={error ? errorId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error)}
        className={[
          "auth-field__input",
          "career-review-select-field__trigger",
          "role-questions-card__select-trigger",
          error ? "auth-field__input--error" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        data-placeholder={!selectedOption ? "true" : "false"}
        id={fieldId}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
        ref={setTriggerNode}
        role="combobox"
        type="button"
      >
        <span className="career-review-select-field__value">
          {selectedOption || "Choose an answer"}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="career-review-select-field__chevron"
          data-open={isOpen || undefined}
        />
      </button>

      {isOpen ? (
        <div className="career-review-select-field__panel role-questions-card__select-panel">
          <ul className="career-review-select-field__list" id={listboxId} role="listbox">
            {options.map((option, index) => (
              <li key={option} role="none">
                <button
                  className="career-review-select-field__option"
                  data-active={activeIndex === index || undefined}
                  data-selected={value === option || undefined}
                  id={`${fieldId}-option-${index}`}
                  onClick={() => {
                    commitOption(option);
                  }}
                  onMouseEnter={() => {
                    setActiveIndex(index);
                  }}
                  role="option"
                  type="button"
                  aria-selected={value === option}
                >
                  <span>{option}</span>
                  {value === option ? (
                    <Check aria-hidden="true" className="career-review-select-field__check" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function RoleQuestionField({
  error,
  inputRef,
  onBlur,
  onChange,
  question,
  value
}: {
  error?: string;
  inputRef: (node: RoleQuestionControl | null) => void;
  onBlur: () => void;
  onChange: (value: string) => void;
  question: ApplicationQualifier;
  value: string;
}): JSX.Element {
  const fieldId = `role-question-${question.id}`;
  const errorId = `${fieldId}-error`;

  return (
    <div className="role-questions-card__question">
      {question.inputType === "yes_no" ? (
        <div className="auth-field">
          <label className="auth-field__label role-questions-card__question-label" htmlFor={fieldId}>
            {question.label}
          </label>
          <RoleQuestionYesNoSelect
            error={error}
            errorId={errorId}
            fieldId={fieldId}
            inputRef={inputRef}
            onBlur={onBlur}
            onChange={onChange}
            options={question.options ?? []}
            value={value}
          />
        </div>
      ) : (
        <label className="auth-field" htmlFor={fieldId}>
          <span className="auth-field__label role-questions-card__question-label">{question.label}</span>
          <input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={Boolean(error)}
            className={["auth-field__input", "role-questions-card__number-input", error ? "auth-field__input--error" : ""]
              .filter(Boolean)
              .join(" ")}
            id={fieldId}
            inputMode="decimal"
            min={question.min}
            max={question.max}
            onBlur={onBlur}
            onChange={(event) => {
              onChange(event.target.value);
            }}
            placeholder={question.placeholder}
            ref={inputRef}
            step={question.step}
            type="number"
            value={value}
          />
        </label>
      )}
      {error ? (
        <p className="auth-field__error role-questions-card__error" id={errorId} role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ReadyState({
  job,
  resumeState,
  session
}: {
  job: JobViewData;
  resumeState: CandidateResumeState | null;
  session: CandidateSession | null;
}): JSX.Element {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { transitionTo } = useApplicationRouteTransition();
  const formId = useId();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const fieldRefs = useRef<Record<string, RoleQuestionControl | null>>({});
  const applicationRecord = useMemo(
    () => (session ? readPrototypeApplicationRecord(session, job.id) : null),
    [job.id, session]
  );
  const selectedResume = useMemo(
    () => getSelectedResumeForApplication(resumeState, applicationRecord),
    [applicationRecord, resumeState]
  );
  const handoffState = useMemo(() => readNavigationState<RoleQuestionsHandoffPayload>(), []);
  const personalDetailsState = useMemo<CandidatePersonalDetailsState | null>(
    () => (session ? readPrototypePersonalDetailsState(session, job.id) : null),
    [job.id, session]
  );
  const [questionsState, setQuestionsState] = useState<CandidateRoleQuestionsState | null>(null);
  const [errors, setErrors] = useState<RoleQuestionsErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [arrivalState, setArrivalState] = useState<ArrivalState>(() =>
    handoffState?.payload?.transitionSource === "personal-details-complete" &&
    !handoffState?.payload?.transitionVariant &&
    !prefersReducedMotion
      ? "arriving"
      : "settled"
  );
  const arrivalTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (applicationRecord?.enrichmentCompletedAt) {
      transitionTo(buildApplicationConfirmPath(job.id), {
        direction: "forward",
        replace: true,
        source: "guard-recovery"
      });
      return;
    }

    if (!applicationRecord) {
      transitionTo(buildApplicationUploadPath(job.id), {
        direction: "back",
        replace: true,
        source: "guard-recovery"
      });
    }
  }, [applicationRecord, job.id, session, transitionTo]);

  useEffect(() => {
    if (!session || !selectedResume) {
      setQuestionsState(null);
      return;
    }

    const existingState = readPrototypeRoleQuestionsState(session, job.id);
    const nextState =
      existingState && existingState.sourceResumeId === selectedResume.id
        ? existingState
        : buildPrototypeRoleQuestionsState({
            jobId: job.id,
            sourceResumeId: selectedResume.id
          });

    setQuestionsState(nextState);
    setErrors({});
    setTouched({});
    setSubmitAttempted(false);
  }, [job.id, selectedResume, session]);

  useEffect(() => {
    if (!session || !questionsState) {
      return;
    }

    savePrototypeRoleQuestionsState(session, job.id, {
      ...questionsState,
      lastSavedAt: new Date().toISOString()
    });
  }, [job.id, questionsState, session]);

  useEffect(() => {
    if (arrivalState !== "arriving") {
      return;
    }

    if (prefersReducedMotion) {
      setArrivalState("settled");
      return;
    }

    arrivalTimeoutRef.current = window.setTimeout(() => {
      setArrivalState("settled");
      arrivalTimeoutRef.current = null;
    }, 280);

    return () => {
      if (arrivalTimeoutRef.current !== null) {
        window.clearTimeout(arrivalTimeoutRef.current);
        arrivalTimeoutRef.current = null;
      }
    };
  }, [arrivalState, prefersReducedMotion]);

  useEffect(() => {
    if (arrivalState !== "settled") {
      return;
    }

    const focusTimeout = window.setTimeout(() => {
      headingRef.current?.focus({ preventScroll: true });
    }, prefersReducedMotion ? 20 : 120);

    return () => {
      window.clearTimeout(focusTimeout);
    };
  }, [arrivalState, prefersReducedMotion]);

  if (!session) {
    return <SessionGuard job={job} />;
  }

  if (!applicationRecord || !selectedResume) {
    return <MissingResumeState job={job} />;
  }

  if (personalDetailsState?.status !== "complete") {
    return <MissingPersonalDetailsState job={job} />;
  }

  if (!questionsState) {
    return <LoadingState />;
  }

  const handleAnswerChange = (question: ApplicationQualifier, value: string): void => {
    setQuestionsState((currentState) =>
      currentState
        ? {
            ...currentState,
            status: "draft",
            answers: {
              ...currentState.answers,
              [question.id]: value
            },
            updatedAt: new Date().toISOString()
          }
        : currentState
    );

    if (submitAttempted || touched[question.id]) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [question.id]: validateRoleQuestion(question, value)
      }));
    }
  };

  const handleFieldBlur = (question: ApplicationQualifier): void => {
    setTouched((currentTouched) => ({
      ...currentTouched,
      [question.id]: true
    }));
    setErrors((currentErrors) => ({
      ...currentErrors,
      [question.id]: validateRoleQuestion(question, questionsState.answers[question.id])
    }));
  };

  const handleContinue = (): void => {
    const nextErrors = validateRoleQuestions(mockRoleQuestions, questionsState.answers);
    setSubmitAttempted(true);
    setTouched(
      mockRoleQuestions.reduce<Record<string, boolean>>((nextTouched, question) => {
        nextTouched[question.id] = true;
        return nextTouched;
      }, {})
    );
    setErrors(nextErrors);

    const firstInvalidQuestion = mockRoleQuestions.find((question) => nextErrors[question.id]);

    if (firstInvalidQuestion) {
      window.setTimeout(() => {
        fieldRefs.current[firstInvalidQuestion.id]?.focus();
      }, 0);
      return;
    }

    const completedState: CandidateRoleQuestionsState = {
      ...questionsState,
      status: "complete",
      updatedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString()
    };

    setQuestionsState(completedState);
    savePrototypeRoleQuestionsState(session, job.id, completedState);
    transitionTo(buildApplicationCareerHistoryPath(job.id), {
      direction: "forward",
      source: "role-questions-complete"
    });
  };

  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section
          aria-busy={arrivalState === "arriving"}
          className="application-step__panel role-questions-card resume-upload-card surface-card"
          data-arrival-state={arrivalState}
          data-enter-phase={arrivalState}
          data-step-kind="role-questions"
        >
          <header className="resume-upload-card__header role-questions-card__header">
            <p className="section-kicker">Application details</p>
            <h1 ref={headingRef} tabIndex={-1}>
              A few details for this role
            </h1>
            <p className="resume-upload-card__lead role-questions-card__lead">
              Answer these required questions to complete your application.
            </p>
          </header>

          <CompanyApplicationHeading job={job} session={session} />

          <div className="resume-upload-card__body role-questions-card__body">
            <form
              className="auth-form role-questions-card__form"
              id={formId}
              onSubmit={(event) => {
                event.preventDefault();
                handleContinue();
              }}
            >
              <div className="role-questions-card__questions">
                {mockRoleQuestions.map((question) => (
                  <RoleQuestionField
                    error={submitAttempted || touched[question.id] ? errors[question.id] : undefined}
                    inputRef={(node) => {
                      fieldRefs.current[question.id] = node;
                    }}
                    key={question.id}
                    onBlur={() => {
                      handleFieldBlur(question);
                    }}
                    onChange={(value) => {
                      handleAnswerChange(question, value);
                    }}
                    question={question}
                    value={questionsState.answers[question.id] ?? ""}
                  />
                ))}
              </div>
            </form>
          </div>

          <footer className="resume-upload-card__footer role-questions-card__footer">
            <div className="resume-upload-card__footer-actions role-questions-card__footer-actions">
              <TransitionLink
                className="button button--ghost"
                direction="back"
                href={buildApplicationPersonalDetailsPath(job.id)}
                source="role-questions-back"
              >
                Back
              </TransitionLink>
              <button className="button button--job-primary" form={formId} type="submit">
                Continue
              </button>
            </div>
          </footer>
        </section>
      </ApplicationStepShell>
    </div>
  );
}

export function ApplicationRoleQuestionsPage({
  jobId
}: ApplicationRoleQuestionsPageProps): JSX.Element {
  const initialJob = readJobView(jobId);
  const [state, setState] = useState<LoadState>(() => (initialJob ? "ready" : "loading"));
  const [job, setJob] = useState<JobViewData | null>(initialJob);
  const [session, setSession] = useState<CandidateSession | null>(null);
  const [resumeState, setResumeState] = useState<CandidateResumeState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const prototypeSession = readPrototypeSession();
    const cachedJob = readJobView(jobId);

    setJob(cachedJob);
    setState(cachedJob ? "ready" : "loading");
    setSession(prototypeSession);
    setResumeState(prototypeSession ? readPrototypeResumeState(prototypeSession.email) : null);

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

  return <ReadyState job={job} resumeState={resumeState} session={session} />;
}

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { getJobView, readJobView } from "../api/jobs";
import { ApplicationUnavailableState } from "../components/ApplicationGuardStates";
import { ApplicationLocationField } from "../components/ApplicationLocationField";
import {
  ApplicationPhoneField,
  getCandidatePhoneNumberError
} from "../components/ApplicationPhoneField";
import { AuthRichTextField } from "../components/ApplicationAuthPrimitives";
import { ApplicationStepShell } from "../components/ApplicationStepShell";
import { ProfileImageUploader } from "../components/ProfileImageUploader";
import { TransitionLink } from "../components/application/TransitionLink";
import { CompanyApplicationHeading } from "../components/ResumeUploadSection";
import { useApplicationRouteTransition } from "../hooks/useApplicationRouteTransition";
import type {
  CandidatePersonalDetailsState,
  CandidateProfilePictureValue,
  CandidateResumeState,
  CandidateSession
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { buildMockCvParsingSignalLoaderModel } from "../lib/mock-cv-parsing-signals";
import {
  getSelectedResumeForApplication,
  readPrototypeApplicationRecord
} from "../lib/prototype-application";
import { readPrototypeSession } from "../lib/prototype-auth";
import {
  buildPrototypePersonalDetailsState,
  readPrototypePersonalDetailsState,
  savePrototypePersonalDetailsState
} from "../lib/prototype-personal-details";
import { readPrototypeResumeState } from "../lib/prototype-resume";
import {
  buildDetectedPrototypeLocation
} from "../lib/location-detection";
import {
  buildApplicationAuthPath,
  buildApplicationConfirmPath,
  buildApplicationParsingPath,
  buildApplicationRoleQuestionsPath,
  buildApplicationUploadPath,
  buildJobViewPath,
  readNavigationState
} from "../lib/router";

interface ApplicationPersonalDetailsPageProps {
  jobId: string;
}

type LoadState = "loading" | "ready" | "missing";
type ArrivalState = "arriving" | "settled";

interface PersonalDetailsHandoffPayload {
  transitionAt?: string;
  transitionSource?: "parsing-skip" | "parsing-complete" | "direct-entry" | string;
  transitionVariant?: string;
}

interface ValidationState {
  location?: string;
  phoneNumber?: string;
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

function buildCandidateName(session: CandidateSession | null): string | undefined {
  const candidateName = [session?.firstName, session?.lastName].filter(Boolean).join(" ").trim();
  return candidateName || undefined;
}

function buildCandidateInitials(session: CandidateSession | null): string {
  const initials = [session?.firstName, session?.lastName]
    .map((name) => name?.trim().charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return initials || "DJ";
}

function findParsedLocationHint(
  extractedSignals: ReturnType<typeof buildMockCvParsingSignalLoaderModel>["extractedSignals"]
): string | null {
  const matchedSignal = extractedSignals.find((signal) => signal.tone === "location");
  return matchedSignal?.label ?? null;
}

function validatePersonalDetails(state: CandidatePersonalDetailsState): ValidationState {
  const errors: ValidationState = {};

  if (!state.location?.countryCode || !state.location.cityId) {
    errors.location = "Select your location to continue.";
  }

  const phoneError = getCandidatePhoneNumberError(
    state.phoneNumber,
    state.location?.countryCode ?? state.detectedCountryCode
  );

  if (phoneError) {
    errors.phoneNumber = phoneError;
  }

  return errors;
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
          <p className="muted-copy">
            Sign in before you add your details for {job.title} at {job.companyName}.
          </p>
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
          <p className="muted-copy">Upload a resume before you add your personal details for {job.title}.</p>
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

function ProfilePictureField({
  candidateInitials,
  candidateName,
  onChange,
  value
}: {
  candidateInitials: string;
  candidateName?: string;
  onChange: (value: CandidateProfilePictureValue | null) => void;
  value: CandidateProfilePictureValue | null;
}): JSX.Element {
  return (
    <ProfileImageUploader
      cropShape="circle"
      editorDescription="Crop and rotate before adding it to your profile."
      editorTitle="Adjust profile picture"
      onChange={onChange}
      outputHeight={720}
      outputWidth={720}
    >
      {({ describedBy, error, feedbackId, helpId, openFileDialog, triggerRef }) => (
        <div className="personal-profile-picture-field">
          <div className="personal-profile-picture-field__control">
            <button
              aria-describedby={describedBy}
              aria-label={value ? "Replace profile picture" : "Add profile picture"}
              className="personal-profile-picture-field__preview-button"
              onClick={openFileDialog}
              ref={triggerRef}
              type="button"
            >
              <span className="personal-profile-picture-field__preview">
                {value?.dataUrl ? (
                  <img
                    alt={candidateName ? `${candidateName} profile picture preview` : "Profile picture preview"}
                    src={value.dataUrl}
                  />
                ) : (
                  <span>{candidateInitials}</span>
                )}
              </span>
              <span className="personal-profile-picture-field__edit-badge" aria-hidden="true">
                <Pencil aria-hidden="true" className="personal-profile-picture-field__edit-icon" />
              </span>
            </button>
            <div className="personal-profile-picture-field__content">
              <p className="personal-profile-picture-field__hint" id={helpId}>
                Add an optional profile picture. JPG, PNG, max 5MB.
              </p>
              {error ? (
                <p className="auth-field__error" id={feedbackId} role="status">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </ProfileImageUploader>
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
  const formId = useId();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const { transitionTo } = useApplicationRouteTransition();
  const candidateName = useMemo(() => buildCandidateName(session), [session]);
  const candidateInitials = useMemo(() => buildCandidateInitials(session), [session]);
  const applicationRecord = useMemo(
    () => (session ? readPrototypeApplicationRecord(session, job.id) : null),
    [job.id, session]
  );
  const selectedResume = useMemo(
    () => getSelectedResumeForApplication(resumeState, applicationRecord),
    [applicationRecord, resumeState]
  );
  const handoffState = useMemo(
    () => readNavigationState<PersonalDetailsHandoffPayload>(),
    []
  );
  const parsingLoaderModel = useMemo(
    () =>
      buildMockCvParsingSignalLoaderModel({
        candidateName
      }),
    [candidateName]
  );
  const parsedLocationHint = useMemo(
    () => findParsedLocationHint(parsingLoaderModel.extractedSignals),
    [parsingLoaderModel.extractedSignals]
  );
  const completionStartedFrom =
    handoffState?.payload?.transitionSource === "parsing-skip" ||
    handoffState?.payload?.transitionSource === "parsing-complete"
      ? handoffState.payload.transitionSource
      : "direct-entry";
  const [detailsState, setDetailsState] = useState<CandidatePersonalDetailsState | null>(null);
  const [validation, setValidation] = useState<ValidationState>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [arrivalState, setArrivalState] = useState<ArrivalState>(() =>
    handoffState?.payload?.transitionSource === "parsing-skip" &&
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
      setDetailsState(null);
      return;
    }

    const existingState = readPrototypePersonalDetailsState(session, job.id);
    const detectedLocation = buildDetectedPrototypeLocation(
      parsingLoaderModel.extractedSignals,
      existingState?.location ?? null
    );
    const nextState =
      existingState && existingState.sourceResumeId === selectedResume.id
        ? existingState
        : buildPrototypePersonalDetailsState({
            completionStartedFrom,
            detectedCountryCode: detectedLocation.detectedCountry.country.code,
            detectedCountrySource: detectedLocation.detectedCountry.source,
            jobId: job.id,
            location: detectedLocation.location,
            sourceResumeId: selectedResume.id
          });

    setDetailsState(nextState);
    setValidation({});
    setSubmitAttempted(false);
  }, [
    completionStartedFrom,
    job.id,
    parsingLoaderModel.extractedSignals,
    selectedResume,
    session
  ]);

  useEffect(() => {
    if (!session || !detailsState) {
      return;
    }

    savePrototypePersonalDetailsState(session, job.id, {
      ...detailsState,
      lastSavedAt: new Date().toISOString()
    });
  }, [detailsState, job.id, session]);

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
      headingRef.current?.focus();
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

  if (!detailsState) {
    return <LoadingState />;
  }

  const locationError = submitAttempted ? validation.location : undefined;
  const phoneNumberError = submitAttempted ? validation.phoneNumber : undefined;

  const handleContinue = (): void => {
    const nextValidation = validatePersonalDetails(detailsState);
    setSubmitAttempted(true);
    setValidation(nextValidation);

    if (Object.keys(nextValidation).length > 0) {
      if (nextValidation.location) {
        window.setTimeout(() => {
          locationInputRef.current?.focus();
        }, 0);
      }
      return;
    }

    const completedState: CandidatePersonalDetailsState = {
      ...detailsState,
      status: "complete",
      updatedAt: new Date().toISOString()
    };

    setDetailsState(completedState);
    savePrototypePersonalDetailsState(session, job.id, completedState);
    transitionTo(buildApplicationRoleQuestionsPath(job.id), {
      direction: "forward",
      source: "personal-details-complete"
    });
  };

  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section
          aria-busy={arrivalState === "arriving"}
          className="application-step__panel personal-details-card resume-upload-card surface-card"
          data-enter-phase={arrivalState}
          data-arrival-state={arrivalState}
          data-step-kind="personal-details"
        >
          <header className="resume-upload-card__header personal-details-card__header">
            <p className="section-kicker">Personal details</p>
            <h1 ref={headingRef} tabIndex={-1}>
              A little more about you
            </h1>
            <p className="resume-upload-card__lead personal-details-card__lead">
              Add your location and a short intro. Photo and phone number are optional.
            </p>
          </header>

          <CompanyApplicationHeading
            job={job}
            rightSlot={
              <ProfilePictureField
                candidateInitials={candidateInitials}
                candidateName={candidateName}
                onChange={(profilePicture) => {
                  setDetailsState((currentState) =>
                    currentState
                      ? {
                          ...currentState,
                          profilePicture,
                          updatedAt: new Date().toISOString()
                        }
                      : currentState
                  );
                }}
                value={detailsState.profilePicture ?? null}
              />
            }
            session={session}
          />

          <div className="resume-upload-card__body personal-details-card__body">
            <form
              className="auth-form personal-details-card__form"
              id={formId}
              onSubmit={(event) => {
                event.preventDefault();
                handleContinue();
              }}
            >
              <div className="personal-details-card__primary-row">
                <ApplicationLocationField
                  defaultCountryCode={detailsState.detectedCountryCode}
                  detectionContext={{
                    fallbackCountryCode: detailsState.detectedCountryCode ?? undefined,
                    parsedCvLocationHint: parsedLocationHint ?? undefined
                  }}
                  error={locationError}
                  inputRef={locationInputRef}
                  label="Location"
                  onChange={(location) => {
                    setDetailsState((currentState) =>
                      currentState
                        ? {
                            ...currentState,
                            location,
                            detectedCountryCode: location?.countryCode ?? currentState.detectedCountryCode,
                            updatedAt: new Date().toISOString()
                          }
                        : currentState
                    );

                    if (submitAttempted) {
                      setValidation((currentValidation) => ({
                        ...currentValidation,
                        location: undefined
                      }));
                    }
                  }}
                  required
                  value={detailsState.location}
                />

                <ApplicationPhoneField
                  defaultCountryCode={detailsState.location?.countryCode ?? detailsState.detectedCountryCode}
                  error={phoneNumberError}
                  name="phoneNumber"
                  onChange={(phoneNumber) => {
                    setDetailsState((currentState) =>
                      currentState
                        ? {
                            ...currentState,
                            phoneNumber,
                            updatedAt: new Date().toISOString()
                          }
                        : currentState
                    );

                    if (submitAttempted) {
                      setValidation((currentValidation) => ({
                        ...currentValidation,
                        phoneNumber: undefined
                      }));
                    }
                  }}
                  value={detailsState.phoneNumber}
                />
              </div>

              <AuthRichTextField
                label="About Me (Optional)"
                name="aboutMe"
                onChange={(aboutMe) => {
                  setDetailsState((currentState) =>
                    currentState
                      ? {
                          ...currentState,
                          aboutMe,
                          updatedAt: new Date().toISOString()
                        }
                      : currentState
                  );
                }}
                placeholder="A short intro can help recruiters understand you faster."
                value={detailsState.aboutMe}
              />
            </form>
          </div>

          <footer className="resume-upload-card__footer personal-details-card__footer">
            <div className="resume-upload-card__footer-actions personal-details-card__footer-actions">
              <TransitionLink
                className="button button--ghost"
                direction="back"
                href={buildApplicationParsingPath(job.id)}
                source="personal-details-back"
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

export function ApplicationPersonalDetailsPage({
  jobId
}: ApplicationPersonalDetailsPageProps): JSX.Element {
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

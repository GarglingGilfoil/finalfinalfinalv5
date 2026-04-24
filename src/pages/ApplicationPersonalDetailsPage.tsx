import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { Pencil, RotateCw } from "lucide-react";
import { getJobView } from "../api/jobs";
import { ApplicationLocationField } from "../components/ApplicationLocationField";
import {
  ApplicationPhoneField,
  getCandidatePhoneNumberError
} from "../components/ApplicationPhoneField";
import { AuthRichTextField } from "../components/ApplicationAuthPrimitives";
import { ApplicationStepShell } from "../components/ApplicationStepShell";
import { CompanyApplicationHeading } from "../components/ResumeUploadSection";
import type {
  CandidatePersonalDetailsState,
  CandidateProfilePictureValue,
  CandidateResumeState,
  CandidateSession
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import { buildMockCvParsingSignalLoaderModel } from "../lib/mock-cv-parsing-signals";
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
  buildApplicationCareerHistoryPath,
  buildApplicationUploadPath,
  buildJobViewPath,
  navigateTo,
  readNavigationState
} from "../lib/router";

interface ApplicationPersonalDetailsPageProps {
  jobId: string;
}

type LoadState = "loading" | "ready" | "missing";
type ArrivalState = "arriving" | "settled";

interface PersonalDetailsHandoffPayload {
  transitionAt?: string;
  transitionSource?: "parsing-skip" | "parsing-complete" | "direct-entry";
}

interface ValidationState {
  location?: string;
  phoneNumber?: string;
}

const PROFILE_PICTURE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const PROFILE_PICTURE_ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PROFILE_PICTURE_EXPORT_SIZE = 720;

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

function isSupportedProfilePicture(file: File): boolean {
  if (PROFILE_PICTURE_ACCEPTED_MIME_TYPES.has(file.type)) {
    return true;
  }

  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

interface PendingProfilePictureEdit {
  dataUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error("Unable to load image."));
    };
    image.src = src;
  });
}

async function cropProfilePictureImage(
  imageSrc: string,
  rotation: number,
  zoom: number,
  mimeType: string
): Promise<string> {
  const image = await loadImageElement(imageSrc);
  const canvas = document.createElement("canvas");
  const canvasContext = canvas.getContext("2d");

  if (!canvasContext) {
    throw new Error("Unable to prepare image editor.");
  }

  canvas.width = PROFILE_PICTURE_EXPORT_SIZE;
  canvas.height = PROFILE_PICTURE_EXPORT_SIZE;

  const angle = (rotation * Math.PI) / 180;
  const normalizedRotation = ((rotation % 180) + 180) % 180;
  const rotatedWidth = normalizedRotation === 90 ? image.naturalHeight : image.naturalWidth;
  const rotatedHeight = normalizedRotation === 90 ? image.naturalWidth : image.naturalHeight;
  const coverScale = Math.max(
    PROFILE_PICTURE_EXPORT_SIZE / rotatedWidth,
    PROFILE_PICTURE_EXPORT_SIZE / rotatedHeight
  );
  const scale = coverScale * zoom;

  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  canvasContext.save();
  canvasContext.translate(PROFILE_PICTURE_EXPORT_SIZE / 2, PROFILE_PICTURE_EXPORT_SIZE / 2);
  canvasContext.rotate(angle);
  canvasContext.scale(scale, scale);
  canvasContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  canvasContext.restore();

  return canvas.toDataURL(mimeType === "image/png" ? "image/png" : "image/jpeg", 0.92);
}

function findParsedLocationHint(
  extractedSignals: ReturnType<typeof buildMockCvParsingSignalLoaderModel>["extractedSignals"]
): string | null {
  const matchedSignal = extractedSignals.find((signal) => signal.tone === "location");
  return matchedSignal?.label ?? null;
}

function getSelectedResume(resumeState: CandidateResumeState | null) {
  return (
    resumeState?.resumes.find((resume) => resume.id === resumeState.selectedResumeId) ??
    resumeState?.resumes[0] ??
    null
  );
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
  return (
    <div className="job-view__shell">
      <ApplicationStepShell ambientMode="quiet">
        <section className="application-step__panel application-step__guard surface-card surface-card--section">
          <h1>Application step not available</h1>
          <p className="muted-copy">We couldn’t resolve the role for this personal details step.</p>
        </section>
      </ApplicationStepShell>
    </div>
  );
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
            <a className="button button--job-primary" href={buildApplicationAuthPath(job.id, "signin")}>
              Go to application sign in
            </a>
            <a className="button button--ghost" href={buildJobViewPath(job.id)}>
              Back to job view
            </a>
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
            <a className="button button--job-primary" href={buildApplicationUploadPath(job.id)}>
              Back to resume upload
            </a>
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
  const inputId = useId();
  const helpId = `${inputId}-help`;
  const feedbackId = `${inputId}-feedback`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadButtonRef = useRef<HTMLButtonElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<PendingProfilePictureEdit | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const describedBy = [helpId, error ? feedbackId : null].filter(Boolean).join(" ");

  const handleSelectFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setError(null);

    if (!isSupportedProfilePicture(file)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > PROFILE_PICTURE_MAX_FILE_SIZE_BYTES) {
      setError("Choose an image under 5MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("We couldn’t read that image. Try a different file.");
        return;
      }

      setCropZoom(1);
      setCropRotation(0);
      setPendingEdit({
        dataUrl: reader.result,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "image/*",
      });
    };

    reader.onerror = () => {
      setError("We couldn’t read that image. Try a different file.");
    };

    reader.readAsDataURL(file);
  };

  const cancelCrop = (): void => {
    setPendingEdit(null);
    setCropZoom(1);
    setCropRotation(0);
    setIsApplyingCrop(false);
    setError(null);
    window.setTimeout(() => {
      uploadButtonRef.current?.focus();
    }, 0);
  };

  const applyCrop = async (): Promise<void> => {
    if (!pendingEdit || isApplyingCrop) {
      return;
    }

    setIsApplyingCrop(true);
    setError(null);

    try {
      const croppedDataUrl = await cropProfilePictureImage(
        pendingEdit.dataUrl,
        cropRotation,
        cropZoom,
        pendingEdit.mimeType
      );

      onChange({
        dataUrl: croppedDataUrl,
        fileName: pendingEdit.fileName,
        fileSize: pendingEdit.fileSize,
        mimeType: pendingEdit.mimeType || "image/*",
        updatedAt: new Date().toISOString()
      });
      setPendingEdit(null);
      setCropZoom(1);
      setCropRotation(0);
    } catch {
      setError("We couldn’t crop that image. Try a different file.");
    } finally {
      setIsApplyingCrop(false);
      window.setTimeout(() => {
        uploadButtonRef.current?.focus();
      }, 0);
    }
  };

  const editorDialog = pendingEdit ? (
    <div
      aria-labelledby={`${inputId}-crop-title`}
      aria-modal="true"
      className="personal-profile-picture-editor"
      role="dialog"
    >
      <div className="personal-profile-picture-editor__panel">
        <div className="personal-profile-picture-editor__header">
          <div>
            <h2 id={`${inputId}-crop-title`}>Adjust profile picture</h2>
            <p>Crop and rotate before adding it to your profile.</p>
          </div>
        </div>

        <div className="personal-profile-picture-editor__stage">
          <div
            className="personal-profile-picture-editor__image"
            style={{
              backgroundImage: `url(${pendingEdit.dataUrl})`,
              transform: `scale(${cropZoom}) rotate(${cropRotation}deg)`
            }}
          />
          <div className="personal-profile-picture-editor__crop-frame" aria-hidden="true" />
        </div>

        <div className="personal-profile-picture-editor__controls">
          <label className="personal-profile-picture-editor__range">
            <span>Zoom</span>
            <input
              max="1.8"
              min="1"
              onChange={(event) => {
                setCropZoom(Number(event.target.value));
              }}
              step="0.01"
              type="range"
              value={cropZoom}
            />
          </label>
          <button
            aria-label="Rotate profile picture"
            className="personal-profile-picture-editor__rotate"
            onClick={() => {
              setCropRotation((current) => (current + 90) % 360);
            }}
            type="button"
          >
            <RotateCw aria-hidden="true" className="personal-profile-picture-field__icon" />
          </button>
        </div>

        <div className="personal-profile-picture-editor__actions">
          <button
            className="button button--ghost"
            disabled={isApplyingCrop}
            onClick={cancelCrop}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button button--job-primary"
            disabled={isApplyingCrop}
            onClick={() => {
              void applyCrop();
            }}
            type="button"
          >
            {isApplyingCrop ? "Applying..." : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="personal-profile-picture-field">
        <div className="personal-profile-picture-field__control">
          <button
            aria-describedby={describedBy}
            aria-label={value ? "Replace profile picture" : "Add profile picture"}
            className="personal-profile-picture-field__preview-button"
            onClick={() => inputRef.current?.click()}
            ref={uploadButtonRef}
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
            <input
              accept="image/jpeg,image/png,image/webp"
              className="personal-profile-picture-field__input"
              id={inputId}
              onChange={handleSelectFile}
              ref={inputRef}
              tabIndex={-1}
              type="file"
            />
            {error ? (
              <p className="auth-field__error" id={feedbackId} role="status">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {editorDialog && typeof document !== "undefined"
        ? createPortal(editorDialog, document.body)
        : editorDialog}
    </>
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
  const candidateName = useMemo(() => buildCandidateName(session), [session]);
  const candidateInitials = useMemo(() => buildCandidateInitials(session), [session]);
  const selectedResume = useMemo(() => getSelectedResume(resumeState), [resumeState]);
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
  const [detailsState, setDetailsState] = useState<CandidatePersonalDetailsState | null>(null);
  const [validation, setValidation] = useState<ValidationState>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [arrivalState, setArrivalState] = useState<ArrivalState>(() =>
    handoffState?.payload?.transitionSource === "parsing-skip" && !prefersReducedMotion
      ? "arriving"
      : "settled"
  );
  const arrivalTimeoutRef = useRef<number | null>(null);

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
            completionStartedFrom: handoffState?.payload?.transitionSource ?? "direct-entry",
            detectedCountryCode: detectedLocation.detectedCountry.country.code,
            detectedCountrySource: detectedLocation.detectedCountry.source,
            jobId: job.id,
            location: detectedLocation.location,
            sourceResumeId: selectedResume.id
          });

    setDetailsState(nextState);
    setValidation({});
    setSubmitAttempted(false);
  }, [handoffState, job.id, parsingLoaderModel.extractedSignals, selectedResume, session]);

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

  if (!selectedResume) {
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
    navigateTo(buildApplicationCareerHistoryPath(job.id), {
      payload: {
        transitionAt: new Date().toISOString(),
        transitionSource: "direct-entry"
      }
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
              Complete your profile
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
                helperText="We’ll use these details to round out your application profile."
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
  const [state, setState] = useState<LoadState>("loading");
  const [job, setJob] = useState<JobViewData | null>(null);
  const [session, setSession] = useState<CandidateSession | null>(null);
  const [resumeState, setResumeState] = useState<CandidateResumeState | null>(null);

  useEffect(() => {
    let cancelled = false;
    const prototypeSession = readPrototypeSession();

    setState("loading");
    setJob(null);
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

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent
} from "react";
import { createPortal } from "react-dom";
import type {
  CandidateResumeState,
  CandidateSession,
  PrototypeResumeRecord,
  ResumeFileExtension
} from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import {
  deletePrototypeResumeAsset,
  readPrototypeResumeAsset,
  savePrototypeResumeAsset
} from "../lib/prototype-resume-assets";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const FILE_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface ResumeUploadSectionProps {
  backHref: string;
  job: JobViewData;
  onContinue: (resume: PrototypeResumeRecord) => void;
  onResumeStateChange: (state: CandidateResumeState) => void;
  resumeState: CandidateResumeState;
  session: CandidateSession;
}

interface PendingUpload {
  fileExtension: ResumeFileExtension;
  fileName: string;
  fileSize: number;
  progress: number;
}

interface LiveResumeAsset {
  file: File;
  objectUrl: string;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function formatResumeDate(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function getCompanyMonogram(companyName: string): string {
  const parts = companyName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return "CO";
}

function getResumeExtension(fileName: string): ResumeFileExtension | null {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();

  if (extension === "pdf" || extension === "doc" || extension === "docx") {
    return extension;
  }

  return null;
}

function buildResumeRecord(file: File): PrototypeResumeRecord {
  const extension = getResumeExtension(file.name) ?? "pdf";

  return {
    id: `resume-${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    fileName: file.name,
    fileSize: file.size,
    fileExtension: extension,
    uploadedAt: new Date().toISOString(),
    source: "uploaded"
  };
}

function buildResumeMeta(record: PrototypeResumeRecord): string {
  return `${record.fileExtension.toUpperCase()} · ${formatFileSize(record.fileSize)} · Updated ${formatResumeDate(record.uploadedAt)}`;
}

function buildPrototypeDownloadHandle(
  job: JobViewData,
  record: PrototypeResumeRecord,
  session: CandidateSession
): {
  fileName: string;
  href: string;
  revoke: () => void;
} {
  const fileStem = record.fileName.replace(/\.[^.]+$/, "") || "resume";
  const blob = new Blob(
    [
      `Ditto Jobs prototype file summary\n\n`,
      `Candidate: ${session.firstName} ${session.lastName}\n`,
      `Email: ${session.email}\n`,
      `Company: ${job.companyName}\n`,
      `Role: ${job.title}\n`,
      `Original filename: ${record.fileName}\n`,
      `File type: ${record.fileExtension.toUpperCase()}\n`,
      `File size: ${formatFileSize(record.fileSize)}\n`,
      `Uploaded: ${formatResumeDate(record.uploadedAt)}\n\n`,
      `The original file is not available in this prototype session, so this download contains a summary of the stored resume record instead.\n`
    ],
    { type: "text/plain;charset=utf-8" }
  );
  const href = URL.createObjectURL(blob);

  return {
    fileName: `${fileStem}-prototype-summary.txt`,
    href,
    revoke: () => {
      URL.revokeObjectURL(href);
    }
  };
}

function triggerDownload(fileName: string, href: string, revoke?: () => void): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();

  if (revoke) {
    window.setTimeout(() => {
      revoke();
    }, 0);
  }
}

function UploadGlyph(): JSX.Element {
  return (
    <svg aria-hidden="true" className="resume-upload__glyph" viewBox="0 0 24 24">
      <path
        d="M12 16.5V6.5M12 6.5l-4 4M12 6.5l4 4M5 17.5v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function DocumentGlyph(): JSX.Element {
  return (
    <svg aria-hidden="true" className="resume-upload__glyph" viewBox="0 0 24 24">
      <path
        d="M8 3.5h6l4 4v13a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 7 20.5V5A1.5 1.5 0 0 1 8.5 3.5Zm6 0V8h4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M9.5 12.25h5M9.5 15.75h5M9.5 19.25h3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function PreviewGlyph(): JSX.Element {
  return (
    <svg aria-hidden="true" className="resume-upload__glyph" viewBox="0 0 24 24">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="12"
        fill="none"
        r="3"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function DownloadGlyph(): JSX.Element {
  return (
    <svg aria-hidden="true" className="resume-upload__glyph" viewBox="0 0 24 24">
      <path
        d="M12 4.5v10m0 0-4-4m4 4 4-4M4.5 18.5h15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function DeleteGlyph(): JSX.Element {
  return (
    <svg aria-hidden="true" className="resume-upload__glyph" viewBox="0 0 24 24">
      <path
        d="M5.5 7.5h13M9.5 7.5V5.75A1.25 1.25 0 0 1 10.75 4.5h2.5A1.25 1.25 0 0 1 14.5 5.75V7.5m-7.5 0 .8 10.25A1.5 1.5 0 0 0 9.29 19.5h5.42a1.5 1.5 0 0 0 1.49-1.75L17 7.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="M10.25 10.5v5.5M13.75 10.5v5.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function CloseGlyph(): JSX.Element {
  return (
    <svg aria-hidden="true" className="resume-upload__glyph" viewBox="0 0 24 24">
      <path
        d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function useDialogLifecycle(onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return dialogRef;
}

function OverlayPortal({ children }: { children: JSX.Element }): JSX.Element | null {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(children, document.body);
}

export function CompanyApplicationHeading({
  job,
  session
}: {
  job: JobViewData;
  session?: CandidateSession;
}): JSX.Element {
  const [hasLogoError, setHasLogoError] = useState(false);
  const companyMonogram = useMemo(() => getCompanyMonogram(job.companyName), [job.companyName]);
  const showFallbackLogo = !job.companyLogoUrl || hasLogoError;
  const signedInName = session ? `${session.firstName} ${session.lastName}` : null;

  return (
    <article className="resume-upload-card__company-heading" aria-label={`${job.companyName}, ${job.title}`}>
      <div className="resume-upload-card__identity-logo" aria-hidden="true">
        {showFallbackLogo ? <span>{companyMonogram}</span> : null}
        {job.companyLogoUrl && !showFallbackLogo ? (
          <img
            alt=""
            onError={() => {
              setHasLogoError(true);
            }}
            src={job.companyLogoUrl}
          />
        ) : null}
      </div>

      <div className="resume-upload-card__company-heading-copy">
        <h2>{job.companyName}</h2>
        <p>{job.title}</p>
        {signedInName ? (
          <span className="resume-upload-card__company-heading-note">Signed in as {signedInName}</span>
        ) : null}
      </div>
    </article>
  );
}

export function ResumeUploadGuardCard({
  authHref,
  backHref,
  job
}: {
  authHref: string;
  backHref: string;
  job: JobViewData;
}): JSX.Element {
  return (
    <section className="resume-upload-card surface-card" aria-labelledby="resume-upload-guard-heading">
      <header className="resume-upload-card__header">
        <p className="section-kicker">Sign in required</p>
        <h1 id="resume-upload-guard-heading">Continue your application</h1>
        <p className="resume-upload-card__lead">
          Sign in or create an account before you upload your resume for the <span>{job.title}</span> role.
        </p>
      </header>

      <CompanyApplicationHeading job={job} />

      <div className="resume-upload-card__body resume-upload-card__body--guard">
        <div className="resume-upload-card__guard-callout">
          <h2>Upload resumes once you’re signed in</h2>
          <p>
            We’ll keep this step ready for you as soon as you continue into the application flow.
          </p>
        </div>
      </div>

      <footer className="resume-upload-card__footer">
        <div className="resume-upload-card__footer-rule" aria-hidden="true" />
        <div className="resume-upload-card__footer-actions resume-upload-card__footer-actions--guard">
          <a className="button button--job-primary" href={authHref}>
            Go to application sign in
          </a>
          <a className="button button--ghost" href={backHref}>
            Back to job view
          </a>
        </div>
      </footer>
    </section>
  );
}

function ResumeOptionCard({
  isSelected,
  onDelete,
  onPreview,
  onSelect,
  radioName,
  record
}: {
  isSelected: boolean;
  onDelete: () => void;
  onPreview: () => void;
  onSelect: () => void;
  radioName: string;
  record: PrototypeResumeRecord;
}): JSX.Element {
  return (
    <article
      className={["resume-upload__file-card", isSelected ? "is-selected" : ""]
        .filter(Boolean)
        .join(" ")}
      role="listitem"
    >
      <button
        aria-pressed={isSelected}
        className="resume-upload__file-main"
        onClick={onSelect}
        type="button"
      >
        <div className="resume-upload__file-preview" aria-hidden="true">
          <DocumentGlyph />
          <span>{record.fileExtension.toUpperCase()}</span>
        </div>

        <div className="resume-upload__file-copy">
          <p className="resume-upload__file-name" title={record.fileName}>
            {record.fileName}
          </p>
          <p className="resume-upload__file-meta">{buildResumeMeta(record)}</p>
        </div>
      </button>

      <div className="resume-upload__file-status">
        <div className="resume-upload__file-actions">
          <button
            aria-label={`Preview file ${record.fileName}`}
            className="resume-upload__icon-button"
            onClick={onPreview}
            title="Preview file"
            type="button"
          >
            <PreviewGlyph />
          </button>

          <button
            aria-label={`Delete file ${record.fileName}`}
            className="resume-upload__icon-button resume-upload__icon-button--danger"
            onClick={onDelete}
            title="Delete file"
            type="button"
          >
            <DeleteGlyph />
          </button>
        </div>

        <input
          aria-label={`Use ${record.fileName} for this application`}
          checked={isSelected}
          className="resume-upload__radio"
          name={radioName}
          onChange={onSelect}
          type="radio"
        />
      </div>
    </article>
  );
}

function FilePreviewDialog({
  fileUrl,
  onClose,
  onDownload,
  record
}: {
  fileUrl: string | null;
  onClose: () => void;
  onDownload: () => void;
  record: PrototypeResumeRecord;
}): JSX.Element {
  const titleId = useId();
  const dialogRef = useDialogLifecycle(onClose);
  const canPreviewPdf = record.fileExtension === "pdf" && Boolean(fileUrl);
  const isDocumentPreview = record.fileExtension === "doc" || record.fileExtension === "docx";
  const pdfPreviewUrl = canPreviewPdf
    ? `${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=FitH&zoom=page-width&pagemode=none`
    : null;

  return (
    <OverlayPortal>
      <div
        className="resume-upload-modal-backdrop resume-upload-modal-backdrop--preview"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="resume-upload-modal resume-upload-preview"
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
        >
          <header className="resume-upload-modal__header">
            <div className="resume-upload-modal__title-block">
              <p className="resume-upload-modal__eyebrow">Preview</p>
              <h2 id={titleId} title={record.fileName}>
                {record.fileName}
              </h2>
            </div>

            <div className="resume-upload-modal__actions">
              <button className="button button--ghost resume-upload-modal__download" onClick={onDownload} type="button">
                <DownloadGlyph />
                <span>Download</span>
              </button>

              <button
                aria-label="Close preview"
                className="resume-upload__icon-button"
                onClick={onClose}
                title="Close preview"
                type="button"
              >
                <CloseGlyph />
              </button>
            </div>
          </header>

          <div
            className="resume-upload-preview__body"
            onClick={() => {
              onClose();
            }}
          >
            <div className="resume-upload-preview__stage">
              {canPreviewPdf ? (
                <div
                  className="resume-upload-preview__document-shell"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <embed
                    className="resume-upload-preview__document"
                    src={pdfPreviewUrl ?? undefined}
                    title={record.fileName}
                    type="application/pdf"
                  />
                </div>
              ) : (
                <div
                  className="resume-upload-preview__fallback"
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                >
                  <span className="resume-upload-preview__fallback-icon" aria-hidden="true">
                    <DocumentGlyph />
                  </span>
                  <p className="resume-upload-preview__fallback-type">{record.fileExtension.toUpperCase()}</p>
                  <h3>{record.fileName}</h3>
                  <p>
                    {isDocumentPreview
                      ? "Preview is not available for this file type. You can still download the file from the top bar."
                      : "Inline preview is only available for PDF files uploaded in this browser session. You can still download the stored file summary."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

function DeleteFileDialog({
  onCancel,
  onConfirm,
  record
}: {
  onCancel: () => void;
  onConfirm: () => void;
  record: PrototypeResumeRecord;
}): JSX.Element {
  const titleId = useId();
  const dialogRef = useDialogLifecycle(onCancel);

  return (
    <OverlayPortal>
      <div
        className="resume-upload-modal-backdrop"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onCancel();
          }
        }}
      >
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="resume-upload-modal resume-upload-modal--confirm"
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
        >
          <div className="resume-upload-modal__confirm-copy">
            <p className="resume-upload-modal__eyebrow">Confirm action</p>
            <h2 id={titleId}>Delete file?</h2>
            <p>Are you sure you want to remove this file from your application?</p>
            <p className="resume-upload-modal__filename" title={record.fileName}>
              {record.fileName}
            </p>
          </div>

          <div className="resume-upload-modal__confirm-actions">
            <button className="button button--ghost" onClick={onCancel} type="button">
              Cancel
            </button>
            <button className="button button--destructive" onClick={onConfirm} type="button">
              Delete file
            </button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

export function ResumeUploadSection({
  backHref,
  job,
  onContinue,
  onResumeStateChange,
  resumeState,
  session
}: ResumeUploadSectionProps): JSX.Element {
  const fileInputId = useId();
  const resumeSelectionName = `${fileInputId}-resume-selection`;
  const errorId = `${fileInputId}-error`;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const liveResumeAssetsRef = useRef<Record<string, LiveResumeAsset>>({});
  const dragDepthRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [liveResumeAssets, setLiveResumeAssets] = useState<Record<string, LiveResumeAsset>>({});
  const [previewResumeId, setPreviewResumeId] = useState<string | null>(null);
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const selectedResume = useMemo(
    () => resumeState.resumes.find((resume) => resume.id === resumeState.selectedResumeId) ?? null,
    [resumeState.resumes, resumeState.selectedResumeId]
  );
  const previewResume = useMemo(
    () => resumeState.resumes.find((resume) => resume.id === previewResumeId) ?? null,
    [previewResumeId, resumeState.resumes]
  );
  const deleteResume = useMemo(
    () => resumeState.resumes.find((resume) => resume.id === deleteResumeId) ?? null,
    [deleteResumeId, resumeState.resumes]
  );
  const hasSavedResume = resumeState.resumes.length > 0;
  const canContinue = Boolean(selectedResume) && !isUploading && resumeState.resumes.length > 0;

  useEffect(() => {
    return () => {
      dragDepthRef.current = 0;
    };
  }, []);

  useEffect(() => {
    liveResumeAssetsRef.current = liveResumeAssets;
  }, [liveResumeAssets]);

  useEffect(() => {
    return () => {
      Object.values(liveResumeAssetsRef.current).forEach((asset) => {
        URL.revokeObjectURL(asset.objectUrl);
      });
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateUploadedAssets = async (): Promise<void> => {
      const uploadedResumes = resumeState.resumes.filter((resume) => resume.source === "uploaded");

      for (const resume of uploadedResumes) {
        if (liveResumeAssetsRef.current[resume.id]) {
          continue;
        }

        try {
          const file = await readPrototypeResumeAsset(session.email, resume.id);

          if (!file || cancelled) {
            continue;
          }

          const objectUrl = URL.createObjectURL(file);

          setLiveResumeAssets((current) => {
            if (current[resume.id]) {
              URL.revokeObjectURL(objectUrl);
              return current;
            }

            return {
              ...current,
              [resume.id]: {
                file,
                objectUrl
              }
            };
          });
        } catch {
          // Keep the prototype resilient and fall back to metadata-only behavior.
        }
      }
    };

    void hydrateUploadedAssets();

    return () => {
      cancelled = true;
    };
  }, [resumeState.resumes, session.email]);

  useEffect(() => {
    if (previewResumeId && !previewResume) {
      setPreviewResumeId(null);
    }

    if (deleteResumeId && !deleteResume) {
      setDeleteResumeId(null);
    }
  }, [deleteResume, deleteResumeId, previewResume, previewResumeId]);

  const openFilePicker = (): void => {
    fileInputRef.current?.click();
  };

  const commitResume = (record: PrototypeResumeRecord): void => {
    const nextState: CandidateResumeState = {
      resumes: [record, ...resumeState.resumes.filter((resume) => resume.id !== record.id)],
      selectedResumeId: record.id
    };

    onResumeStateChange(nextState);
  };

  const handleValidatedUpload = async (file: File): Promise<void> => {
    const fileExtension = getResumeExtension(file.name);
    let createdRecordId: string | null = null;
    let createdObjectUrl: string | null = null;

    if (!fileExtension) {
      setError("Use a PDF, DOC, or DOCX file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Your file exceeds the maximum size limit.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setPendingUpload({
      fileExtension,
      fileName: file.name,
      fileSize: file.size,
      progress: 16
    });

    try {
      await wait(160);
      setPendingUpload((current) => (current ? { ...current, progress: 42 } : current));

      await wait(170);
      setPendingUpload((current) => (current ? { ...current, progress: 74 } : current));

      await wait(180);
      setPendingUpload((current) => (current ? { ...current, progress: 100 } : current));

      await wait(120);
      const record = buildResumeRecord(file);
      const objectUrl = URL.createObjectURL(file);
      createdRecordId = record.id;
      createdObjectUrl = objectUrl;
      setLiveResumeAssets((current) => ({
        ...current,
        [record.id]: {
          file,
          objectUrl
        }
      }));
      await savePrototypeResumeAsset(session.email, record.id, file);
      commitResume(record);
    } catch {
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }

      if (createdRecordId) {
        const recordId = createdRecordId;
        setLiveResumeAssets((current) => {
          if (!current[recordId]) {
            return current;
          }

          const next = { ...current };
          delete next[recordId];
          return next;
        });
      }

      setError("We couldn’t store that file right now. Please try again.");
    } finally {
      setPendingUpload(null);
      setIsUploading(false);
    }
  };

  const handleFiles = async (files: FileList | null): Promise<void> => {
    const file = files?.[0];

    if (!file) {
      return;
    }

    await handleValidatedUpload(file);
  };

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    await handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDragEnter = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLElement>): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  };

  const handleContinue = (): void => {
    if (!selectedResume || isUploading || resumeState.resumes.length === 0) {
      if (!selectedResume) {
        setError("Upload your resume to continue.");
      }
      return;
    }

    onContinue(selectedResume);
  };

  const handleDownload = (record: PrototypeResumeRecord): void => {
    const liveAsset = liveResumeAssets[record.id];

    if (liveAsset) {
      triggerDownload(record.fileName, liveAsset.objectUrl);
      return;
    }

    const fallback = buildPrototypeDownloadHandle(job, record, session);
    triggerDownload(fallback.fileName, fallback.href, fallback.revoke);
  };

  const handleDeleteConfirmed = (): void => {
    if (!deleteResume) {
      return;
    }

    const nextResumes = resumeState.resumes.filter((resume) => resume.id !== deleteResume.id);
    const nextSelectedResumeId =
      resumeState.selectedResumeId === deleteResume.id
        ? nextResumes[0]?.id ?? null
        : nextResumes.some((resume) => resume.id === resumeState.selectedResumeId)
          ? resumeState.selectedResumeId
          : nextResumes[0]?.id ?? null;

    setLiveResumeAssets((current) => {
      const nextAssets = { ...current };
      const asset = nextAssets[deleteResume.id];

      if (asset) {
        URL.revokeObjectURL(asset.objectUrl);
        delete nextAssets[deleteResume.id];
      }

      return nextAssets;
    });

    if (previewResumeId === deleteResume.id) {
      setPreviewResumeId(null);
    }

    setDeleteResumeId(null);
    setError(null);
    void deletePrototypeResumeAsset(session.email, deleteResume.id);
    onResumeStateChange({
      resumes: nextResumes,
      selectedResumeId: nextSelectedResumeId
    });
  };

  return (
    <section className="resume-upload-card surface-card" aria-labelledby="resume-upload-heading">
      <header className="resume-upload-card__header">
        <p className="section-kicker">Your resume</p>
        <h1 id="resume-upload-heading">Upload your resume</h1>
        <p className="resume-upload-card__lead">
          Attach a recent resume to continue with this application. We’ll use it to move your profile forward for the <span>{job.title}</span> role.
        </p>
      </header>

      <CompanyApplicationHeading job={job} session={session} />

      <input
        accept={FILE_ACCEPT}
        aria-describedby={error ? errorId : undefined}
        className="sr-only"
        id={fileInputId}
        onChange={(event) => {
          void handleInputChange(event);
        }}
        ref={fileInputRef}
        type="file"
      />

      <div
        className={[
          "resume-upload-card__body",
          hasSavedResume ? "resume-upload-card__body--saved" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {!hasSavedResume ? (
          <div
            className={[
              "resume-upload-card__dropzone",
              "resume-upload-card__dropzone--empty",
              isDragging ? "is-dragging" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(event) => {
              void handleDrop(event);
            }}
          >
            <div className="resume-upload-card__dropzone-art" aria-hidden="true">
              <span className="resume-upload-card__dropzone-icon">
                <UploadGlyph />
              </span>
              <span className="resume-upload-card__dropzone-orbit resume-upload-card__dropzone-orbit--one" />
              <span className="resume-upload-card__dropzone-orbit resume-upload-card__dropzone-orbit--two" />
            </div>

            <div className="resume-upload-card__dropzone-copy">
              <strong>Drop your resume here</strong>
              <span>Drag and drop a file, or browse from your device.</span>
            </div>

            <button className="button button--ghost resume-upload-card__browse-button" onClick={openFilePicker} type="button">
              Choose file
            </button>

            <p className="resume-upload-card__dropzone-meta">PDF, DOC, DOCX · Max 5MB</p>
          </div>
        ) : (
          <>
            <div className="resume-upload-card__state-copy">
              <h2>Resume on file</h2>
              <p>Select the resume you want to use for this application, or swap it out with a newer version.</p>
            </div>

            <div className="resume-upload__file-list" role="list" aria-label="Saved resumes">
              {resumeState.resumes.map((resume) => (
                <ResumeOptionCard
                  isSelected={resume.id === selectedResume?.id}
                  key={resume.id}
                  onDelete={() => {
                    setDeleteResumeId(resume.id);
                  }}
                  onPreview={() => {
                    setPreviewResumeId(resume.id);
                  }}
                  onSelect={() => {
                    setError(null);
                    onResumeStateChange({
                      resumes: resumeState.resumes,
                      selectedResumeId: resume.id
                    });
                  }}
                  radioName={resumeSelectionName}
                  record={resume}
                />
              ))}
            </div>

            <div
              className={[
                "resume-upload-card__replace-zone",
                isDragging ? "is-dragging" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={(event) => {
                void handleDrop(event);
              }}
            >
              <div className="resume-upload-card__replace-copy">
                <strong>Upload a different resume</strong>
                <span>Drop a new file here, or browse to replace it.</span>
              </div>

              <button className="button button--ghost resume-upload-card__browse-button" onClick={openFilePicker} type="button">
                Browse files
              </button>
            </div>
          </>
        )}

        {pendingUpload ? (
          <div aria-live="polite" className="resume-upload__file-card resume-upload__file-card--uploading">
            <div className="resume-upload__file-preview" aria-hidden="true">
              <DocumentGlyph />
              <span>{pendingUpload.fileExtension.toUpperCase()}</span>
            </div>

            <div className="resume-upload__file-copy">
              <p className="resume-upload__file-name" title={pendingUpload.fileName}>
                {pendingUpload.fileName}
              </p>
              <p className="resume-upload__file-meta">Uploading · {formatFileSize(pendingUpload.fileSize)}</p>
              <span className="resume-upload__progress-track" aria-hidden="true">
                <span style={{ width: `${pendingUpload.progress}%` }} />
              </span>
            </div>

            <div className="resume-upload__file-status">
              <span className="resume-upload__file-badge">{pendingUpload.progress}%</span>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="resume-upload-card__error" id={errorId} role="status">
            {error}
          </p>
        ) : null}
      </div>

      <footer className="resume-upload-card__footer">
        <div className="resume-upload-card__footer-rule" aria-hidden="true" />
        <div className="resume-upload-card__footer-actions">
          <a className="button button--ghost" href={backHref}>
            Back
          </a>
          <button
            className="button button--job-primary"
            disabled={!canContinue}
            onClick={handleContinue}
            type="button"
          >
            Continue
          </button>
        </div>
      </footer>

      {previewResume ? (
        <FilePreviewDialog
          fileUrl={liveResumeAssets[previewResume.id]?.objectUrl ?? null}
          onClose={() => {
            setPreviewResumeId(null);
          }}
          onDownload={() => {
            handleDownload(previewResume);
          }}
          record={previewResume}
        />
      ) : null}

      {deleteResume ? (
        <DeleteFileDialog
          onCancel={() => {
            setDeleteResumeId(null);
          }}
          onConfirm={handleDeleteConfirmed}
          record={deleteResume}
        />
      ) : null}
    </section>
  );
}

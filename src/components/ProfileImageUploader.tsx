import {
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type RefObject
} from "react";
import { createPortal } from "react-dom";
import { RotateCw } from "lucide-react";
import type { CandidateProfilePictureValue } from "../contracts/application";

const IMAGE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const IMAGE_ACCEPTED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ImageCropShape = "circle" | "rounded" | "wide";

interface PendingImageEdit {
  dataUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface ImageEditorRenderProps {
  describedBy: string;
  error: string | null;
  feedbackId: string;
  helpId: string;
  openFileDialog: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
}

interface ProfileImageUploaderProps {
  children: (props: ImageEditorRenderProps) => ReactNode;
  cropShape: ImageCropShape;
  editorDescription: string;
  editorTitle: string;
  onChange: (value: CandidateProfilePictureValue | null) => void;
  outputHeight: number;
  outputWidth: number;
}

function isSupportedImage(file: File): boolean {
  if (IMAGE_ACCEPTED_MIME_TYPES.has(file.type)) {
    return true;
  }

  return /\.(jpe?g|png|webp)$/i.test(file.name);
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

async function cropImage(
  imageSrc: string,
  rotation: number,
  zoom: number,
  mimeType: string,
  outputWidth: number,
  outputHeight: number
): Promise<string> {
  const image = await loadImageElement(imageSrc);
  const canvas = document.createElement("canvas");
  const canvasContext = canvas.getContext("2d");

  if (!canvasContext) {
    throw new Error("Unable to prepare image editor.");
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const angle = (rotation * Math.PI) / 180;
  const normalizedRotation = ((rotation % 180) + 180) % 180;
  const rotatedWidth = normalizedRotation === 90 ? image.naturalHeight : image.naturalWidth;
  const rotatedHeight = normalizedRotation === 90 ? image.naturalWidth : image.naturalHeight;
  const coverScale = Math.max(outputWidth / rotatedWidth, outputHeight / rotatedHeight);
  const scale = coverScale * zoom;

  canvasContext.clearRect(0, 0, canvas.width, canvas.height);
  canvasContext.save();
  canvasContext.translate(outputWidth / 2, outputHeight / 2);
  canvasContext.rotate(angle);
  canvasContext.scale(scale, scale);
  canvasContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  canvasContext.restore();

  return canvas.toDataURL(mimeType === "image/png" ? "image/png" : "image/jpeg", 0.92);
}

export function ProfileImageUploader({
  children,
  cropShape,
  editorDescription,
  editorTitle,
  onChange,
  outputHeight,
  outputWidth
}: ProfileImageUploaderProps): JSX.Element {
  const inputId = useId();
  const helpId = `${inputId}-help`;
  const feedbackId = `${inputId}-feedback`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<PendingImageEdit | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const describedBy = [helpId, error ? feedbackId : null].filter(Boolean).join(" ");

  const openFileDialog = (): void => {
    inputRef.current?.click();
  };

  const handleSelectFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setError(null);

    if (!isSupportedImage(file)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > IMAGE_MAX_FILE_SIZE_BYTES) {
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
        mimeType: file.type || "image/*"
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
      triggerRef.current?.focus();
    }, 0);
  };

  const applyCrop = async (): Promise<void> => {
    if (!pendingEdit || isApplyingCrop) {
      return;
    }

    setIsApplyingCrop(true);
    setError(null);

    try {
      const croppedDataUrl = await cropImage(
        pendingEdit.dataUrl,
        cropRotation,
        cropZoom,
        pendingEdit.mimeType,
        outputWidth,
        outputHeight
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
        triggerRef.current?.focus();
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
            <h2 id={`${inputId}-crop-title`}>{editorTitle}</h2>
            <p>{editorDescription}</p>
          </div>
        </div>

        <div className="personal-profile-picture-editor__stage" data-crop-shape={cropShape}>
          <div
            className="personal-profile-picture-editor__image"
            style={{
              backgroundImage: `url(${pendingEdit.dataUrl})`,
              transform: `scale(${cropZoom}) rotate(${cropRotation}deg)`
            }}
          />
          <div
            className="personal-profile-picture-editor__crop-frame"
            data-crop-shape={cropShape}
            aria-hidden="true"
          />
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
            aria-label="Rotate image"
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
            {isApplyingCrop ? "Applying..." : "Use image"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {children({
        describedBy,
        error,
        feedbackId,
        helpId,
        openFileDialog,
        triggerRef
      })}
      <input
        accept="image/jpeg,image/png,image/webp"
        className="profile-image-uploader__input"
        id={inputId}
        onChange={handleSelectFile}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      {editorDialog && typeof document !== "undefined"
        ? createPortal(editorDialog, document.body)
        : editorDialog}
    </>
  );
}

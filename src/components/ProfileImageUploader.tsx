import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
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

interface CropOffset {
  x: number;
  y: number;
}

interface ImageNaturalSize {
  height: number;
  width: number;
}

interface CropDragState {
  pointerId: number;
  startOffset: CropOffset;
  startX: number;
  startY: number;
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
  offset: CropOffset,
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
  const containScale = Math.min(outputWidth / rotatedWidth, outputHeight / rotatedHeight);
  const scale = containScale * zoom;

  canvasContext.fillStyle = "#f3f8fc";
  canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  canvasContext.save();
  canvasContext.translate(outputWidth / 2 + offset.x, outputHeight / 2 + offset.y);
  canvasContext.rotate(angle);
  canvasContext.scale(scale, scale);
  canvasContext.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  canvasContext.restore();

  return canvas.toDataURL(mimeType === "image/png" ? "image/png" : "image/jpeg", 0.92);
}

function getRotatedImageSize(imageSize: ImageNaturalSize, rotation: number): ImageNaturalSize {
  const normalizedRotation = ((rotation % 180) + 180) % 180;

  if (normalizedRotation === 90) {
    return {
      height: imageSize.width,
      width: imageSize.height
    };
  }

  return imageSize;
}

function clampCropOffset({
  imageSize,
  offset,
  outputHeight,
  outputWidth,
  rotation,
  zoom
}: {
  imageSize: ImageNaturalSize | null;
  offset: CropOffset;
  outputHeight: number;
  outputWidth: number;
  rotation: number;
  zoom: number;
}): CropOffset {
  if (!imageSize) {
    return offset;
  }

  const rotatedSize = getRotatedImageSize(imageSize, rotation);
  const containScale = Math.min(outputWidth / rotatedSize.width, outputHeight / rotatedSize.height);
  const scale = containScale * zoom;
  const maxX = Math.max(0, (rotatedSize.width * scale - outputWidth) / 2);
  const maxY = Math.max(0, (rotatedSize.height * scale - outputHeight) / 2);

  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y))
  };
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
  const stageRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const cropDragRef = useRef<CropDragState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<PendingImageEdit | null>(null);
  const [imageNaturalSize, setImageNaturalSize] = useState<ImageNaturalSize | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropRotation, setCropRotation] = useState(0);
  const [cropOffset, setCropOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
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

      setCropOffset({ x: 0, y: 0 });
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
    setImageNaturalSize(null);
    setCropOffset({ x: 0, y: 0 });
    setCropZoom(1);
    setCropRotation(0);
    setIsDraggingCrop(false);
    cropDragRef.current = null;
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
        clampCropOffset({
          imageSize: imageNaturalSize,
          offset: cropOffset,
          outputHeight,
          outputWidth,
          rotation: cropRotation,
          zoom: cropZoom
        }),
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
      setImageNaturalSize(null);
      setCropOffset({ x: 0, y: 0 });
      setCropZoom(1);
      setCropRotation(0);
      setIsDraggingCrop(false);
      cropDragRef.current = null;
    } catch {
      setError("We couldn’t crop that image. Try a different file.");
    } finally {
      setIsApplyingCrop(false);
      window.setTimeout(() => {
        triggerRef.current?.focus();
      }, 0);
    }
  };

  useEffect(() => {
    let isActive = true;

    if (!pendingEdit) {
      setImageNaturalSize(null);
      return undefined;
    }

    void loadImageElement(pendingEdit.dataUrl)
      .then((image) => {
        if (!isActive) {
          return;
        }

        setImageNaturalSize({
          height: image.naturalHeight,
          width: image.naturalWidth
        });
      })
      .catch(() => {
        if (isActive) {
          setImageNaturalSize(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [pendingEdit]);

  useEffect(() => {
    setCropOffset((current) => {
      const next = clampCropOffset({
        imageSize: imageNaturalSize,
        offset: current,
        outputHeight,
        outputWidth,
        rotation: cropRotation,
        zoom: cropZoom
      });

      return next.x === current.x && next.y === current.y ? current : next;
    });
  }, [cropRotation, cropZoom, imageNaturalSize, outputHeight, outputWidth]);

  const finishCropDrag = (pointerId: number): void => {
    if (cropDragRef.current?.pointerId !== pointerId) {
      return;
    }

    cropDragRef.current = null;
    setIsDraggingCrop(false);
  };

  const handleCropPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (isApplyingCrop || event.button !== 0) {
      return;
    }

    cropDragRef.current = {
      pointerId: event.pointerId,
      startOffset: cropOffset,
      startX: event.clientX,
      startY: event.clientY
    };
    setIsDraggingCrop(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCropPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const dragState = cropDragRef.current;
    const stage = stageRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId || !stage) {
      return;
    }

    const stageRect = stage.getBoundingClientRect();
    const deltaX = ((event.clientX - dragState.startX) / stageRect.width) * outputWidth;
    const deltaY = ((event.clientY - dragState.startY) / stageRect.height) * outputHeight;

    setCropOffset(
      clampCropOffset({
        imageSize: imageNaturalSize,
        offset: {
          x: dragState.startOffset.x + deltaX,
          y: dragState.startOffset.y + deltaY
        },
        outputHeight,
        outputWidth,
        rotation: cropRotation,
        zoom: cropZoom
      })
    );
  };

  const cropOffsetXPercent = (cropOffset.x / outputWidth) * 100;
  const cropOffsetYPercent = (cropOffset.y / outputHeight) * 100;

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
            aria-label="Drag image to reposition crop"
            className="personal-profile-picture-editor__image-frame"
            data-dragging={isDraggingCrop ? "true" : undefined}
            onPointerCancel={(event) => {
              finishCropDrag(event.pointerId);
            }}
            onPointerDown={handleCropPointerDown}
            onPointerMove={handleCropPointerMove}
            onPointerUp={(event) => {
              finishCropDrag(event.pointerId);
            }}
            ref={stageRef}
            role="img"
            style={{
              transform: `translate(${cropOffsetXPercent}%, ${cropOffsetYPercent}%)`
            }}
          >
            <div
              className="personal-profile-picture-editor__image"
              style={{
                backgroundImage: `url(${pendingEdit.dataUrl})`,
                transform: `scale(${cropZoom}) rotate(${cropRotation}deg)`
              }}
            />
          </div>
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

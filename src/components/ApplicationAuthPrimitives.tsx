import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND
} from "@lexical/list";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import {
  $getRoot,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  type LexicalEditor
} from "lexical";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Underline,
  type LucideIcon
} from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode
} from "react";
import type { AuthProvider } from "../contracts/application";

interface AuthTextFieldProps {
  autoComplete?: string;
  autoFocus?: boolean;
  error?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "email" | "tel" | "text";
  value: string;
}

interface AuthPasswordFieldProps {
  autoComplete?: string;
  error?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}

interface AuthDividerProps {
  label: string;
}

type RichTextCommand = "bold" | "italic" | "underline" | "bullet" | "number";

interface AuthRichTextFieldProps {
  className?: string;
  editorFooter?: ReactNode;
  helperText?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

interface SocialAuthButtonsProps {
  actionLabel: string;
  disabled?: boolean;
  loadingProvider: AuthProvider | null;
  onSelect: (provider: Exclude<AuthProvider, "email">) => void;
}

const DEFAULT_RICH_TEXT_STATE: Record<RichTextCommand, boolean> = {
  bold: false,
  italic: false,
  underline: false,
  bullet: false,
  number: false
};

const RICH_TEXT_BUTTONS: Array<{
  command: RichTextCommand;
  Icon: LucideIcon;
  label: string;
}> = [
  {
    command: "bold",
    Icon: Bold,
    label: "Bold"
  },
  {
    command: "italic",
    Icon: Italic,
    label: "Italic"
  },
  {
    command: "underline",
    Icon: Underline,
    label: "Underline"
  },
  {
    command: "bullet",
    Icon: List,
    label: "Bulleted list"
  },
  {
    command: "number",
    Icon: ListOrdered,
    label: "Numbered list"
  }
];

const RICH_TEXT_THEME = {
  list: {
    listitem: "auth-rich-text__list-item",
    nested: {
      listitem: "auth-rich-text__nested-list-item"
    },
    ol: "auth-rich-text__ordered-list",
    ul: "auth-rich-text__unordered-list"
  },
  paragraph: "auth-rich-text__paragraph",
  text: {
    bold: "auth-rich-text__text-bold",
    italic: "auth-rich-text__text-italic",
    underline: "auth-rich-text__text-underline"
  }
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

function normalizeInitialRichTextHtml(value: string): string {
  const candidate = value.trim();

  if (!candidate) {
    return "";
  }

  if (looksLikeHtml(candidate)) {
    return candidate;
  }

  return candidate
    .split(/\n{2,}/)
    .map((line) => `<p>${escapeHtml(line).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function getPlainTextFromHtml(value: string): string {
  const candidate = value.trim();

  if (!candidate) {
    return "";
  }

  if (typeof document === "undefined") {
    return candidate.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  const scratch = document.createElement("div");
  scratch.innerHTML = candidate;
  return scratch.textContent?.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim() ?? "";
}

function normalizeGeneratedRichTextHtml(value: string): string {
  const candidate = value.trim();

  if (!candidate || !getPlainTextFromHtml(candidate)) {
    return "";
  }

  return candidate;
}

function initializeRichTextEditor(editor: LexicalEditor, value: string): void {
  const html = normalizeInitialRichTextHtml(value);

  if (!html || typeof DOMParser === "undefined") {
    return;
  }

  const parser = new DOMParser();
  const dom = parser.parseFromString(html, "text/html");
  const nodes = $generateNodesFromDOM(editor, dom);
  const root = $getRoot();
  root.clear();
  root.select();
  $insertNodes(nodes);
}

function getSelectedListType(): "bullet" | "number" | null {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();
  const listNode =
    $getNearestNodeOfType(anchorNode, ListNode) ??
    ($isListNode(anchorNode) ? anchorNode : null);

  if (!listNode) {
    return null;
  }

  const listType = listNode.getListType();
  return listType === "bullet" || listType === "number" ? listType : null;
}

function AuthRichTextToolbar({
  toolbarLabel
}: {
  toolbarLabel: string;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [activeCommands, setActiveCommands] = useState(DEFAULT_RICH_TEXT_STATE);
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(0);
  const toolbarButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      setActiveCommands(DEFAULT_RICH_TEXT_STATE);
      return;
    }

    const selectedListType = getSelectedListType();

    setActiveCommands({
      bold: selection.hasFormat("bold"),
      italic: selection.hasFormat("italic"),
      underline: selection.hasFormat("underline"),
      bullet: selectedListType === "bullet",
      number: selectedListType === "number"
    });
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor, updateToolbar]);

  const applyCommand = (command: RichTextCommand): void => {
    if (command === "bold" || command === "italic" || command === "underline") {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, command);
      return;
    }

    if (command === "bullet") {
      editor.dispatchCommand(
        activeCommands.bullet ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
        undefined
      );
      return;
    }

    editor.dispatchCommand(
      activeCommands.number ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
      undefined
    );
  };

  const focusToolbarButton = useCallback((nextIndex: number): void => {
    const normalizedIndex =
      (nextIndex + RICH_TEXT_BUTTONS.length) % RICH_TEXT_BUTTONS.length;
    setFocusedButtonIndex(normalizedIndex);
    toolbarButtonRefs.current[normalizedIndex]?.focus();
  }, []);

  const handleToolbarKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusToolbarButton(focusedButtonIndex + 1);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusToolbarButton(focusedButtonIndex - 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusToolbarButton(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusToolbarButton(RICH_TEXT_BUTTONS.length - 1);
    }
  };

  return (
    <div
      aria-label={`${toolbarLabel} formatting toolbar`}
      className="auth-rich-text__toolbar"
      onKeyDown={handleToolbarKeyDown}
      role="toolbar"
    >
      {RICH_TEXT_BUTTONS.map(({ Icon, ...button }, index) => (
        <Fragment key={button.command}>
          {button.command === "bullet" ? (
            <span
              aria-hidden="true"
              className="auth-rich-text__toolbar-divider"
              role="separator"
            />
          ) : null}
          <button
            aria-label={button.label}
            aria-pressed={activeCommands[button.command]}
            className="auth-rich-text__toolbar-button"
            data-command={button.command}
            data-state={activeCommands[button.command] ? "active" : "idle"}
            onClick={() => {
              setFocusedButtonIndex(index);
              applyCommand(button.command);
            }}
            onFocus={() => {
              setFocusedButtonIndex(index);
            }}
            ref={(node) => {
              toolbarButtonRefs.current[index] = node;
            }}
            tabIndex={index === focusedButtonIndex ? 0 : -1}
            title={button.label}
            type="button"
          >
            <Icon aria-hidden="true" className="auth-rich-text__toolbar-icon" strokeWidth={2.1} />
          </button>
        </Fragment>
      ))}
    </div>
  );
}

function AuthRichTextOnChangePlugin({
  onChange
}: {
  onChange: (value: string) => void;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();

  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState) => {
        editorState.read(() => {
          onChange(normalizeGeneratedRichTextHtml($generateHtmlFromNodes(editor, null)));
        });
      }}
    />
  );
}

function GoogleIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" className="auth-social__icon" viewBox="0 0 24 24">
      <path
        d="M21.8 12.24c0-.72-.07-1.41-.2-2.08H12v3.94h5.49a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.4 3.05-7.5Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.91 6.77-2.46l-3.3-2.56c-.91.61-2.08.97-3.47.97-2.67 0-4.93-1.8-5.74-4.22H2.86v2.63A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.26 13.73A6.02 6.02 0 0 1 5.94 12c0-.6.11-1.18.32-1.73V7.64H2.86A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.36l3.18-2.63Z"
        fill="#FBBC04"
      />
      <path
        d="M12 6.04c1.5 0 2.86.52 3.92 1.53l2.94-2.95A9.87 9.87 0 0 0 12 2a10 10 0 0 0-9.14 5.64l3.4 2.63C7.07 7.84 9.33 6.04 12 6.04Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" className="auth-social__icon" viewBox="0 0 384 512">
      <path
        d="M318.7 268.7c-.2-37.5 16.8-65.9 51.2-86.8-19.2-27.7-48.2-43-86.8-46.1-36.5-2.9-76.4 21.9-91 21.9-15.5 0-50.5-20.9-78.2-20.9-57.2.9-114 46.5-114 141.5 0 28.1 5.2 57 15.5 86.8 13.8 39.1 63.6 135.1 115.5 133.6 27.1-.6 46.3-19.2 81.6-19.2 34.2 0 52 19.2 82.2 19.2 52.4-.8 97.4-88.1 110.5-127.3-69.6-32.7-66-95.1-66.5-102.7zM261 96.2c28-33.2 25.4-63.5 24.5-74.2-24.7 1.4-53.3 16.8-69.6 35.7-18 20.6-28.6 46-26.3 74.2 26.7 2 49.3-11.6 71.4-35.7z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AuthTextField({
  autoComplete,
  autoFocus,
  error,
  label,
  name,
  onChange,
  placeholder,
  type = "text",
  value
}: AuthTextFieldProps): JSX.Element {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  return (
    <div className="auth-field">
      <label className="auth-field__label" htmlFor={fieldId}>
        {label}
      </label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        className={["auth-field__input", error ? "auth-field__input--error" : ""]
          .filter(Boolean)
          .join(" ")}
        id={fieldId}
        name={name}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? (
        <p className="auth-field__error" id={errorId} role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthPasswordField({
  autoComplete,
  error,
  label,
  name,
  onChange,
  value
}: AuthPasswordFieldProps): JSX.Element {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="auth-field">
      <div className="auth-field__label-row">
        <label className="auth-field__label" htmlFor={fieldId}>
          {label}
        </label>
        <button
          className="auth-field__toggle"
          onClick={() => {
            setIsVisible((current) => !current);
          }}
          type="button"
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </div>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        className={["auth-field__input", error ? "auth-field__input--error" : ""]
          .filter(Boolean)
          .join(" ")}
        id={fieldId}
        name={name}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        type={isVisible ? "text" : "password"}
        value={value}
      />
      {error ? (
        <p className="auth-field__error" id={errorId} role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AuthDivider({ label }: AuthDividerProps): JSX.Element {
  return (
    <div className="auth-divider" role="separator">
      <span>{label}</span>
    </div>
  );
}

export function AuthRichTextField({
  className,
  editorFooter,
  helperText,
  label,
  name,
  onChange,
  placeholder,
  value
}: AuthRichTextFieldProps): JSX.Element {
  const fieldId = useId();
  const labelId = `${fieldId}-label`;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const initialConfig = {
    editorState: (editor: LexicalEditor) => {
      initializeRichTextEditor(editor, value);
    },
    namespace: `DittoJobsRichText-${name}`,
    nodes: [ListNode, ListItemNode],
    onError: (error: Error) => {
      throw error;
    },
    theme: RICH_TEXT_THEME
  };

  return (
    <div className={["auth-field", "auth-field--rich-text", className].filter(Boolean).join(" ")}>
      <div className="auth-field__label-row">
        <span className="auth-field__label" id={labelId}>
          {label}
        </span>
      </div>

      <div className="auth-rich-text">
        <LexicalComposer initialConfig={initialConfig}>
          <AuthRichTextToolbar toolbarLabel={label} />
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-describedby={helperId}
                aria-labelledby={labelId}
                ariaMultiline
                aria-placeholder={placeholder ?? ""}
                className="auth-rich-text__editor"
                id={fieldId}
                placeholder={
                  <div className="auth-rich-text__placeholder">{placeholder}</div>
                }
                role="textbox"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
            placeholder={null}
          />
          <HistoryPlugin />
          <ListPlugin />
          <AuthRichTextOnChangePlugin onChange={onChange} />
        </LexicalComposer>
        <input name={name} type="hidden" value={normalizeGeneratedRichTextHtml(value)} />
        {editorFooter ? <div className="auth-rich-text__footer-slot">{editorFooter}</div> : null}
      </div>

      {helperText ? (
        <span className="personal-details-card__textarea-note" id={helperId}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
}

export function SocialAuthButtons({
  actionLabel,
  disabled = false,
  loadingProvider,
  onSelect
}: SocialAuthButtonsProps): JSX.Element {
  return (
    <div className="auth-socials">
      <button
        className="auth-social"
        disabled={disabled}
        onClick={() => {
          onSelect("google");
        }}
        type="button"
      >
        <GoogleIcon />
        <span>{loadingProvider === "google" ? "Please wait…" : `${actionLabel} with Google`}</span>
      </button>

      <button
        className="auth-social"
        disabled={disabled}
        onClick={() => {
          onSelect("apple");
        }}
        type="button"
      >
        <AppleIcon />
        <span>{loadingProvider === "apple" ? "Please wait…" : `${actionLabel} with Apple`}</span>
      </button>
    </div>
  );
}

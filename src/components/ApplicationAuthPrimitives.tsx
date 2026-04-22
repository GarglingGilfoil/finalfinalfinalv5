import { useId, useState } from "react";
import type { AuthProvider } from "../contracts/application";

interface AuthTextFieldProps {
  autoComplete?: string;
  autoFocus?: boolean;
  error?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "email" | "text";
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

interface SocialAuthButtonsProps {
  actionLabel: string;
  disabled?: boolean;
  loadingProvider: AuthProvider | null;
  onSelect: (provider: Exclude<AuthProvider, "email">) => void;
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

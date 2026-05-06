import { useState, type FormEvent } from "react";
import type { ApplicationAuthMode } from "../contracts/application";
import { AuthPasswordField } from "./ApplicationAuthPrimitives";

interface ApplicationSetNewPasswordFormProps {
  onModeChange: (mode: ApplicationAuthMode) => void;
}

interface PasswordErrors {
  confirmPassword?: string;
  password?: string;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function validatePassword(password: string, confirmPassword: string): PasswordErrors {
  const errors: PasswordErrors = {};

  if (!password.trim()) {
    errors.password = "Enter a new password.";
  } else if (password.trim().length < 8) {
    errors.password = "Use at least 8 characters.";
  }

  if (!confirmPassword.trim()) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (password.trim() && password !== confirmPassword) {
    errors.confirmPassword = "Passwords must match.";
  }

  return errors;
}

export function ApplicationSetNewPasswordForm({
  onModeChange
}: ApplicationSetNewPasswordFormProps): JSX.Element {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const nextErrors = validatePassword(password, confirmPassword);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    await wait(550);
    setIsSubmitting(false);
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <div aria-live="polite" className="auth-card auth-card--success">
        <div className="auth-card__header">
          <h2>Password updated</h2>
          <p>You can now sign in with your new password.</p>
        </div>

        <button
          className="button button--job-primary auth-form__submit"
          onClick={() => {
            onModeChange("signin");
          }}
          type="button"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h2>Set a new password</h2>
        <p>Choose a new password for your Ditto account.</p>
      </div>

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <AuthPasswordField
          autoComplete="new-password"
          error={errors.password}
          label="New password"
          name="password"
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          value={password}
        />

        <AuthPasswordField
          autoComplete="new-password"
          error={errors.confirmPassword}
          label="Confirm new password"
          name="confirmPassword"
          onChange={(value) => {
            setConfirmPassword(value);
            setErrors((current) => ({ ...current, confirmPassword: undefined }));
          }}
          value={confirmPassword}
        />

        <div className="auth-form__actions auth-form__actions--split">
          <button
            className="auth-mode-link auth-form__secondary-action"
            onClick={() => {
              onModeChange("signin");
            }}
            type="button"
          >
            Back to sign in
          </button>
          <button className="button button--job-primary auth-form__submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Updating password…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}

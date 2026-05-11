import { useState, type FormEvent } from "react";
import type { ApplicationAuthMode, AuthProvider } from "../contracts/application";
import type { JobViewData } from "../contracts/job-view";
import {
  AuthDivider,
  AuthPasswordField,
  AuthTextField,
  SocialAuthButtons
} from "./ApplicationAuthPrimitives";

interface ApplicationSignInFormProps {
  allowPasswordReset?: boolean;
  job?: JobViewData;
  onAuthSuccess: (input: {
    email: string;
    firstName?: string;
    lastName?: string;
    entryMode: "signin";
    provider: AuthProvider;
  }) => Promise<void>;
  onModeChange: (mode: ApplicationAuthMode) => void;
}

interface SignInErrors {
  email?: string;
  password?: string;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function validateEmail(value: string): boolean {
  return /\S+@\S+\.\S+/.test(value);
}

export function ApplicationSignInForm({
  allowPasswordReset = true,
  job,
  onAuthSuccess,
  onModeChange
}: ApplicationSignInFormProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<SignInErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<AuthProvider | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const nextErrors: SignInErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Enter your email address.";
    } else if (!validateEmail(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password.trim()) {
      nextErrors.password = "Enter your password.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    await wait(550);
    await onAuthSuccess({
      email: email.trim(),
      entryMode: "signin",
      provider: "email"
    });
    setIsSubmitting(false);
  };

  const handleSocial = async (provider: Exclude<AuthProvider, "email">): Promise<void> => {
    setSocialLoading(provider);
    await wait(450);
    await onAuthSuccess({
      email: email.trim() || `candidate@${provider}.prototype`,
      entryMode: "signin",
      provider
    });
    setSocialLoading(null);
  };

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h2>Sign in to continue</h2>
        <p>
          {job
            ? `You’re applying to ${job.title} at ${job.companyName}.`
            : "Sign in to manage your profile, applications, and saved job activity."}
        </p>
      </div>

      <SocialAuthButtons
        actionLabel="Sign in"
        disabled={isSubmitting || socialLoading !== null}
        loadingProvider={socialLoading}
        onSelect={handleSocial}
      />

      <AuthDivider label="or continue with email" />

      <form className="auth-form" noValidate onSubmit={handleSubmit}>
        <AuthTextField
          autoComplete="email"
          autoFocus
          error={errors.email}
          label="Email address"
          name="email"
          onChange={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          type="email"
          value={email}
        />

        <AuthPasswordField
          autoComplete="current-password"
          error={errors.password}
          label="Password"
          name="password"
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          value={password}
        />

        {allowPasswordReset ? (
          <div className="auth-form__meta-row">
            <button
              className="auth-text-button"
              onClick={() => {
                onModeChange("forgot-password");
              }}
              type="button"
            >
              Forgot password?
            </button>
          </div>
        ) : null}

        <div className="auth-form__actions auth-form__actions--split auth-form__actions--signin">
          <p className="auth-card__footer auth-card__footer--inline">
            Don’t have an account?{" "}
            <button
              className="auth-mode-link"
              onClick={() => {
                onModeChange("signup");
              }}
              type="button"
            >
              Sign up
            </button>
          </p>
          <button className="button button--job-primary auth-form__submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}

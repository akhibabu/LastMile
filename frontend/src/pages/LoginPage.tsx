import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../lib/auth";
import { homeForRole } from "../lib/utils";
import { formatApiError } from "../lib/errors";
import { Button, Field, inputClass } from "../components/ui";

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Invalid email";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const profile = await login(email.trim(), password);
      toast.success(`Welcome, ${profile.name}`);
      navigate(homeForRole(profile.role));
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(280px,42%)_1fr]">
      <section className="hidden bg-navy p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-accent text-sm font-bold">LM</div>
          <p className="text-sm font-semibold">LastMile</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Delivery operations</p>
          <h1 className="mt-3 max-w-md text-3xl font-semibold leading-snug">Ship, assign, and track from one operations desk.</h1>
          <p className="mt-3 max-w-sm text-sm text-white/65">
            Sign in with your account. Rates come from configured zone cards — not from guesswork.
          </p>
        </div>
        <p className="text-xs text-white/45">LastMile · Hyderabad coverage</p>
      </section>
      <section className="flex items-center justify-center bg-page p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 rounded-[10px] border border-line bg-white p-7" autoComplete="on" noValidate>
          <div>
            <h2 className="text-xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-muted">Use the email and password from your profile.</p>
          </div>
          <Field label="Email" htmlFor="email" error={errors.email}>
            <input
              id="email"
              className={inputClass()}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              name="email"
              autoComplete="username"
              placeholder="you@company.com"
            />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password}>
            <input
              id="password"
              className={inputClass()}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </Field>
          <Button type="submit" loading={busy} className="w-full">
            {busy ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-accent">
              Create one
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}

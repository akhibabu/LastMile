import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../lib/auth";
import { homeForRole } from "../lib/utils";
import { formatApiError } from "../lib/errors";
import { Button, Field, inputClass } from "../components/ui";

const empty = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  address: "",
  pincode: "",
};

export function RegisterPage() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!loading && user) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  function validate() {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = "Full name is required";
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = "Invalid email";
    if (!form.phone.trim()) next.phone = "Phone number is required";
    else if (form.phone.trim().length < 8) next.phone = "Enter a valid phone number";
    if (!form.password) next.password = "Password is required";
    else if (form.password.length < 8) next.password = "Password must be at least 8 characters";
    if (!form.confirmPassword) next.confirmPassword = "Confirm your password";
    else if (form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match";
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) next.pincode = "Pincode must be 6 digits";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const profile = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        ...(form.address.trim() ? { address: form.address.trim() } : {}),
        ...(form.pincode ? { pincode: form.pincode } : {}),
      });
      toast.success(`Welcome, ${profile.name}`);
      navigate("/app");
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setBusy(false);
    }
  }

  const fields: Array<{ key: keyof typeof empty; label: string; type?: string; required?: boolean; autoComplete?: string }> = [
    { key: "name", label: "Full name", required: true, autoComplete: "name" },
    { key: "email", label: "Email", type: "email", required: true, autoComplete: "email" },
    { key: "phone", label: "Phone", required: true, autoComplete: "tel" },
    { key: "password", label: "Password", type: "password", required: true, autoComplete: "new-password" },
    { key: "confirmPassword", label: "Confirm password", type: "password", required: true, autoComplete: "new-password" },
    { key: "address", label: "Address (optional)", autoComplete: "street-address" },
    { key: "pincode", label: "Pincode (optional)" },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center bg-page p-6">
      <form onSubmit={onSubmit} className="w-full space-y-4 rounded-[10px] border border-line bg-white p-7" noValidate>
        <div>
          <h1 className="text-xl font-semibold">Create account</h1>
          <p className="mt-1 text-sm text-muted">Public signup creates a customer profile. Admin and agent accounts are created separately.</p>
        </div>
        {fields.map((field) => (
          <Field key={field.key} label={field.label}>
            <input
              className={inputClass()}
              type={field.type ?? "text"}
              autoComplete={field.autoComplete}
              value={form[field.key]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
            />
            {errors[field.key] ? <p className="text-xs text-[#b42318]">{errors[field.key]}</p> : null}
          </Field>
        ))}
        <Button type="submit" loading={busy} className="w-full">
          {busy ? "Creating..." : "Create account"}
        </Button>
        <p className="text-center text-sm text-[#5c6b78]">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-accent">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

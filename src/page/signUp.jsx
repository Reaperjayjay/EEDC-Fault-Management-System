import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Zap,
  MapPin,
  Activity,
} from "lucide-react";
import logo from "../assets/mainpower-logo.png";

// Works whether VITE_API_URL is "http://localhost:5000" or ends in "/api/v1"
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000")
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/$/, "");

const inputClass =
  "w-full h-11 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition";

const features = [
  { icon: Activity, text: "Report faults and follow their progress live" },
  { icon: Zap, text: "The right engineer is assigned automatically" },
  { icon: MapPin, text: "Track the engineer on the way to your site" },
];

function Field({ id, label, icon: Icon, className = "", children, ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative mt-2">
        <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input id={id} className={inputClass} {...props} />
        {children}
      </div>
    </div>
  );
}

function ToggleEye({ shown, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? "Hide password" : "Show password"}
      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
    >
      {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/users/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // No role is sent: the backend gives new sign-ups the normal user role
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          passwordConfirm: form.confirm, // backend field name
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          (data && data.message) || "Could not create the account. Try again."
        );
      }

      // Response shape: { status, token, data: { user } }
      const user = data.data?.user ?? data.user;
      const rawRole = (user?.role || "user").toLowerCase();

      // App.jsx only allows the role "user" on the customer dashboard,
      // so a backend role named "customer" is treated as "user".
      const role = rawRole === "customer" ? "user" : rawRole;

      // Same keys the login page uses, so ProtectedRoute behaves the same way.
      // New sign-ups use sessionStorage, like a login without "keep me signed in".
      localStorage.removeItem("role");
      localStorage.removeItem("token");
      sessionStorage.setItem("role", role);

      const token = data.token || data.data?.token;
      if (token) sessionStorage.setItem("token", token);

      // Clear the form before leaving the page
      setForm({ name: "", email: "", password: "", confirm: "" });
      setAgree(false);

      switch (role) {
        case "admin":
        case "operator":
          navigate("/admin/dashboard", { replace: true });
          break;
        case "engineer":
          navigate("/engineer/dashboard", { replace: true });
          break;
        default:
          navigate("/user/dashboard", { replace: true });
      }
    } catch (err) {
      setError(
        err.message ||
          "Cannot reach the server. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Brand panel (desktop only) */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-12 text-white">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-orange-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 shadow-lg">
            <img
              src={logo}
              alt="MainPower Electricity"
              className="h-14 w-auto object-contain"
            />
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            Create your MainPower account
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-blue-100">
            Join the Site Fault Management System to report electricity faults
            and get them resolved faster.
          </p>

          <ul className="mt-8 space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-3 text-sm text-blue-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
                  <Icon className="h-4 w-4 text-orange-300" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-blue-200">
          © 2026 MainPower Electricity Distribution Limited.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10 lg:bg-white">
        <div className="w-full max-w-sm">
          {/* Sign in link (top). The login page is the "/" route. */}
          <div className="mb-6 flex justify-end text-sm text-gray-500">
            <span>
              Have an account?{" "}
              <Link
                to="/"
                className="font-semibold text-blue-600 hover:underline"
              >
                Sign in
              </Link>
            </span>
          </div>

          {/* Logo (mobile only; desktop shows it in the brand panel) */}
          <div className="mb-8 flex justify-center lg:hidden">
            <img
              src={logo}
              alt="MainPower Electricity"
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm lg:border-0 lg:p-0 lg:shadow-none">
            <h1 className="text-2xl font-semibold text-gray-900">
              Create account
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Fill in your details to get started.
            </p>

            <form onSubmit={handleSubmit} className="mt-7">
              <Field
                id="name"
                label="Full name"
                icon={User}
                type="text"
                value={form.name}
                onChange={update("name")}
                placeholder="John Doe"
                autoComplete="name"
                required
              />

              <Field
                id="email"
                label="Email address"
                icon={Mail}
                type="email"
                value={form.email}
                onChange={update("email")}
                placeholder="you@example.com"
                autoComplete="email"
                className="mt-5"
                required
              />

              <Field
                id="password"
                label="Password"
                icon={Lock}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="mt-5"
                required
              >
                <ToggleEye
                  shown={showPassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                />
              </Field>

              <Field
                id="confirm"
                label="Confirm password"
                icon={Lock}
                type={showConfirm ? "text" : "password"}
                value={form.confirm}
                onChange={update("confirm")}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className="mt-5"
                required
              >
                <ToggleEye
                  shown={showConfirm}
                  onClick={() => setShowConfirm((prev) => !prev)}
                />
              </Field>

              {/* Terms */}
              <label className="mt-5 flex cursor-pointer items-start gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-600"
                  required
                />
                <span>
                  I agree to the{" "}
                  <a
                    href="#"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="#"
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Privacy Policy
                  </a>
                </span>
              </label>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 h-11 w-full rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            {/* Sign in link (bottom) */}
            <div className="mt-6 border-t border-gray-100 pt-6 text-center">
              <p className="text-sm text-gray-500">Already have an account?</p>
              <Link
                to="/"
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-blue-600 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                Sign in
              </Link>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400 lg:hidden">
            © 2026 MainPower Electricity Distribution Limited.
          </p>
        </div>
      </div>
    </div>
  );
}
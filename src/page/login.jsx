import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
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
  { icon: Activity, text: "Live fault monitoring across every site" },
  { icon: Zap, text: "Smart dispatch to the best available engineer" },
  { icon: MapPin, text: "Real-time GPS tracking of field teams" },
];

const dashboardFor = (role) => {
  switch (role) {
    case "admin":
    case "operator":
      return "/admin/dashboard";
    case "engineer":
      return "/engineer/dashboard";
    default:
      return "/user/dashboard";
  }
};

// Reads the saved login from either storage
const getSavedLogin = () => {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const role = localStorage.getItem("role") || sessionStorage.getItem("role");
  return token && role ? { token, role } : null;
};

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setError("");
  };

  // 1) Already logged in? Skip the login page.
  useEffect(() => {
    const saved = getSavedLogin();
    if (saved) {
      navigate(dashboardFor(saved.role), { replace: true });
    }
  }, [navigate]);

  // 2) If the browser restores this page from its back/forward cache,
  //    wipe whatever was typed before.
  useEffect(() => {
    const onPageShow = (event) => {
      if (event.persisted) resetForm();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      window.removeEventListener("pageshow", onPageShow);
      // 3) Never keep the password in memory after leaving the page
      setPassword("");
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          (data && data.message) || "Invalid email or password."
        );
      }

      // Support common backend response structures.
      const user = data.data?.user ?? data.user;
      const role = user?.role?.toLowerCase();

      // Only allow recognized roles.
      const validRoles = ["admin", "operator", "engineer", "user", "customer"];

      if (!validRoles.includes(role)) {
        throw new Error(
          "Login succeeded, but the server did not return a valid user role."
        );
      }

      // Select persistent or session storage.
      const storage = remember ? localStorage : sessionStorage;
      const otherStorage = remember ? sessionStorage : localStorage;

      // Remove any old login information.
      otherStorage.removeItem("role");
      otherStorage.removeItem("token");

      // Save the current role and token. The password is never stored.
      storage.setItem("role", role);

      const token = data.token || data.data?.token;
      if (token) storage.setItem("token", token);

      // Clear the form before leaving the page
      resetForm();

      navigate(dashboardFor(role), { replace: true });
    } catch (err) {
      setPassword(""); // clear only the password so they can retry
      setError(
        err.message || "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Brand panel (desktop only) */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-12 text-white">
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
            Site Fault Management System
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-blue-100">
            Report, assign and resolve electricity faults faster, with the right
            engineer on every job.
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
          <div className="mb-8 flex justify-center lg:hidden">
            <img
              src={logo}
              alt="MainPower Electricity"
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm lg:border-0 lg:p-0 lg:shadow-none">
            <h1 className="text-2xl font-semibold text-gray-900">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Sign in to continue to your dashboard.
            </p>

            <form onSubmit={handleSubmit} autoComplete="off" className="mt-7">
              {/* Email */}
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  name="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@mainpower.com"
                  autoComplete="off"
                  required
                  className={inputClass}
                />
              </div>

              {/* Password */}
              <label
                htmlFor="password"
                className="mt-5 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  name="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  required
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Remember / Forgot */}
              <div className="mt-4 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                  />
                  Keep me signed in
                </label>

                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              {/* Login error */}
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
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <a
                href="/signup"
                className="font-semibold text-blue-600 hover:underline"
              >
                Sign up
              </a>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-gray-400 lg:hidden">
            © 2026 MainPower Electricity Distribution Limited.
          </p>
        </div>
      </div>
    </div>
  );
}
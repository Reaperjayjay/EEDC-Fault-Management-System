import { useState, useEffect } from "react";
import { UserRound, Save, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Endpoint for loading the complete logged-in user's profile.
const PROFILE_API_URL =
  "http://localhost:5000/api/v1/profile/me";

// Endpoint for updating the engineer's details.
const ENGINEER_API_URL =
  "http://localhost:5000/api/v1/engineers/me";

// Read the authentication token.
const getToken = () =>
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

// Turns a value from the API into text for the input box ("" when missing).
const toYearsText = (value) =>
  value !== undefined && value !== null && value !== ""
    ? String(value)
    : "";

const UpdateMyProfile = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "general",
    availability: "offline",
    experienceYears: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the profile when the page opens.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = getToken();

        if (!token) {
          throw new Error(
            "Please log in again. Your authentication token was not found."
          );
        }

        const response = await fetch(PROFILE_API_URL, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message ||
              `Unable to load your profile. Server returned ${response.status}.`
          );
        }

        // Supports { data: { profile: {...} } }
        // and { data: { engineer: {...} } }.
        const data =
          result.data?.profile ??
          result.data?.engineer ??
          result.data;

        if (!data) {
          throw new Error(
            "The server did not return your profile information."
          );
        }

        setProfile({
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          specialization:
            data.specialization ?? "general",
          availability:
            data.availability ?? "offline",
          // Accepts both camelCase and snake_case from the API.
          experienceYears: toYearsText(
            data.experienceYears ?? data.experience_years
          ),
        });
      } catch (err) {
        setError(
          err.message || "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Handle changes to editable fields.
  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previousProfile) => ({
      ...previousProfile,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  // Save profile changes.
  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!profile.name.trim()) {
      setError("Your full name is required.");
      return;
    }

    const validSpecializations = [
      "substation",
      "feeder",
      "transformer",
      "distribution",
      "general",
    ];

    const validAvailability = [
      "available",
      "busy",
      "offline",
    ];

    if (
      !validSpecializations.includes(profile.specialization)
    ) {
      setError(
        "Please select a valid engineering specialization."
      );
      return;
    }

    if (
      !validAvailability.includes(profile.availability)
    ) {
      setError("Please select a valid availability status.");
      return;
    }

    // Years of experience is optional: whole number from 0 to 60.
    const experienceText = String(profile.experienceYears).trim();
    const experienceYears =
      experienceText === "" ? null : Number(experienceText);

    if (
      experienceYears !== null &&
      (!Number.isInteger(experienceYears) ||
        experienceYears < 0 ||
        experienceYears > 60)
    ) {
      setError(
        "Years of experience must be a whole number between 0 and 60."
      );
      return;
    }

    const token = getToken();

    if (!token) {
      setError(
        "Please log in again. Your authentication token was not found."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(ENGINEER_API_URL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        // Email is deliberately excluded.
        body: JSON.stringify({
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          specialization: profile.specialization,
          availability: profile.availability,
          // Only sent when the field is filled in.
          ...(experienceYears !== null ? { experienceYears } : {}),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Failed to update your profile. Server returned ${response.status}.`
        );
      }

      // The engineer update endpoint returns data.engineer.
      const updated =
        result.data?.engineer ??
        result.data?.profile ??
        result.data;

      if (updated && typeof updated === "object") {
        setProfile((previousProfile) => ({
          ...previousProfile,
          name: updated.name ?? previousProfile.name,
          email: previousProfile.email,
          phone: updated.phone ?? previousProfile.phone,
          specialization:
            updated.specialization ??
            previousProfile.specialization,
          availability:
            updated.availability ??
            previousProfile.availability,
          experienceYears:
            toYearsText(
              updated.experienceYears ?? updated.experience_years
            ) || previousProfile.experienceYears,
        }));
      }

      setMessage(
        result.message ||
          "Your profile has been updated successfully."
      );
    } catch (err) {
      setError(
        err.message ||
          "Something went wrong while updating your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // Loading screen.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-600">
          Loading your profile...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-blue-600"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* Page heading */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <UserRound size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Update My Profile
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Manage your personal and engineering information.
              </p>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <h2 className="mb-6 text-lg font-semibold text-gray-900">
            Profile Information
          </h2>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Success message */}
          {message && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
            >
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* Full name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={profile.name}
                onChange={handleChange}
                required
                autoComplete="name"
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Registered email: read-only */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Registered Email Address
              </label>

              <input
                id="email"
                type="email"
                value={profile.email}
                readOnly
                className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-gray-500 outline-none"
              />

              <p className="mt-2 text-xs text-gray-500">
                Your registered email cannot be changed here.
              </p>
            </div>

            {/* Phone number */}
            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Phone Number
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={profile.phone}
                onChange={handleChange}
                autoComplete="tel"
                placeholder="Enter your phone number"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Engineering specialization */}
            <div>
              <label
                htmlFor="specialization"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Engineering Specialization
              </label>

              <select
                id="specialization"
                name="specialization"
                value={profile.specialization}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="substation">Substation</option>
                <option value="feeder">Feeder</option>
                <option value="transformer">Transformer</option>
                <option value="distribution">Distribution</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Years of experience */}
            <div>
              <label
                htmlFor="experienceYears"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Years of Experience
              </label>

              <input
                id="experienceYears"
                name="experienceYears"
                type="number"
                min="0"
                max="60"
                step="1"
                value={profile.experienceYears}
                onChange={handleChange}
                placeholder="e.g. 5"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-gray-500">
                Whole years, from 0 to 60. This helps match you to the right faults.
              </p>
            </div>

            {/* Availability */}
            <div>
              <label
                htmlFor="availability"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Availability Status
              </label>

              <select
                id="availability"
                name="availability"
                value={profile.availability}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>

              <p className="mt-2 text-xs text-gray-500">
                Your availability helps the system determine whether
                you can receive new fault assignments.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={18} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateMyProfile;
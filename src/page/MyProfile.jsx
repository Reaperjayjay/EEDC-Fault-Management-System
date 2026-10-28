import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Briefcase,
  CircleDot,
  MapPin,
  Trophy,
  Bell,
  Camera,
  Pencil,
  Lock,
  Check,
  X,
  Mail,
  Phone,
  LocateFixed,
  CheckCircle2,
  ClipboardCheck,
  Target,
  AlertTriangle,
  ArrowRight,
  Save,
  RefreshCw,
} from "lucide-react";
import useLiveLocation from "../hooks/useLiveLocation";

// These endpoints match the routes discussed in your backend.
const PROFILE_API_URL = "http://localhost:5000/api/v1/profile/me";
const ENGINEER_API_URL = "http://localhost:5000/api/v1/engineers/me";

const getToken = () =>
  sessionStorage.getItem("token") || localStorage.getItem("token");

const availabilityOptions = [
  {
    key: "available",
    label: "Available",
    desc: "Ready to receive new fault assignments",
    selected: "border-emerald-500 bg-emerald-50",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  {
    key: "busy",
    label: "On assignment",
    desc: "Currently working on a fault",
    selected: "border-blue-500 bg-blue-50",
    dot: "bg-blue-500",
    text: "text-blue-700",
  },
  {
    key: "offline",
    label: "Off duty",
    desc: "Not available for new assignments",
    selected: "border-slate-400 bg-slate-100",
    dot: "bg-slate-400",
    text: "text-slate-700",
  },
];

const tones = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  indigo: "bg-indigo-50 text-indigo-600",
  cyan: "bg-cyan-50 text-cyan-600",
  slate: "bg-slate-100 text-slate-600",
};

const card = "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6";
const field =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-500";
const labelCls = "mb-1.5 block text-xs font-semibold text-slate-600";
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:shadow-md focus:outline-none focus:ring-4 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btnBase} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/20`;
const btnOutline = `${btnBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-200`;
const pill =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";

function SectionTitle({ icon: Icon, tone = "blue", title, subtitle, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function ReadOnly({ icon: Icon, label, children }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 p-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="break-words text-sm font-medium text-slate-900">{children || "Not provided"}</p>
      </div>
    </div>
  );
}

function Message({ msg }) {
  if (!msg) return null;
  const ok = msg.type === "ok";
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
        ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{msg.text}</span>
    </p>
  );
}

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "EN";

function Avatar({ photo, name, size = "h-24 w-24 text-3xl" }) {
  return photo ? (
    <img
      src={photo}
      alt={`${name || "Engineer"} profile`}
      className={`${size} rounded-full object-cover ring-4 ring-white/80`}
    />
  ) : (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white ring-4 ring-white/80`}
    >
      {initials(name)}
    </div>
  );
}

function getErrorMessage(result, fallback) {
  return result?.message || result?.error || fallback;
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

// Formats a number of years, e.g. 1 -> "1 year", 5 -> "5 years".
const formatYears = (years) =>
  years == null ? "" : `${years} ${years === 1 ? "year" : "years"}`;

export default function MyProfile() {
  const [profile, setProfile] = useState({
    fullName: "",
    employeeId: "",
    address: "",
    gender: "",
  });
  const [draft, setDraft] = useState({
    fullName: "",
    phone: "",
    experienceYears: "",
  });
  const [contact, setContact] = useState({ email: "", phone: "" });
  const [engineer, setEngineer] = useState({
    specialization: "general",
    availability: "offline",
    latitude: null,
    longitude: null,
    performanceRating: null,
    completedJobs: 0,
    experienceYears: null,
  });
  const [performance, setPerformance] = useState({
    rating: null,
    score: null,
    completed: 0,
    resolution: 0,
    total: 0,
    pending: 0,
    inProgress: 0,
  });

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [availabilitySaved, setAvailabilitySaved] = useState(false);
  const [pageMessage, setPageMessage] = useState(null);

  const [photo, setPhoto] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");

  useEffect(() => {
    return () => {
      if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
    };
  }, [photo]);

  const [permission, setPermission] = useState("checking");
  // Live location sharing: remembered in this browser so it survives a page reload.
  const [shareLocation, setShareLocation] = useState(
    () => localStorage.getItem("shareLiveLocation") === "true"
  );
  const [lastLocation, setLastLocation] = useState({
    lat: null,
    lng: null,
    time: null,
  });
  const [locBusy, setLocBusy] = useState(false);
  const [locError, setLocError] = useState("");
  const [locMessage, setLocMessage] = useState(null);

  const [notif, setNotif] = useState({
    assignments: true,
    deadlines: true,
    status: true,
    safety: true,
  });
  const [notifSaved, setNotifSaved] = useState(false);

  const availability = engineer.availability;
  const avail = availabilityOptions.find((item) => item.key === availability) || availabilityOptions[2];

  // Resets the edit form back to the currently saved values.
  const resetDraft = () =>
    setDraft({
      fullName: profile.fullName,
      phone: contact.phone,
      experienceYears:
        engineer.experienceYears != null ? String(engineer.experienceYears) : "",
    });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setPageMessage(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Your login token was not found. Please sign in again.");
      }

      const response = await fetch(PROFILE_API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const result = await readJson(response);
      if (!response.ok) {
        throw new Error(
          getErrorMessage(result, `Could not load your profile (${response.status}).`)
        );
      }

      // Confirmed API response: { status: "success", data: { profile: {...} } }
      const data = result.data?.profile ?? result.data?.engineer ?? result.data;
      if (!data) throw new Error("The server returned no profile data.");

      const fullName = data.name ?? data.fullName ?? "";

      // Accept both camelCase and snake_case from the API.
      const rawExperience = data.experienceYears ?? data.experience_years;
      const experience =
        rawExperience != null &&
        rawExperience !== "" &&
        Number.isFinite(Number(rawExperience))
          ? Number(rawExperience)
          : null;

      const nextProfile = {
        fullName,
        // The returned field is an engineer ID, not an HR employee code.
        employeeId: data.employeeCode ?? (data.engineerId != null ? String(data.engineerId) : ""),
        address: data.address ?? "",
        gender: data.gender ?? "",
      };
      setProfile(nextProfile);
      setDraft({
        fullName: nextProfile.fullName,
        phone: data.phone ?? "",
        experienceYears: experience != null ? String(experience) : "",
      });
      setContact({ email: data.email ?? "", phone: data.phone ?? "" });

      const lat = data.latitude != null ? Number(data.latitude) : null;
      const lng = data.longitude != null ? Number(data.longitude) : null;
      setEngineer({
        specialization: data.specialization ?? "general",
        availability: ["available", "busy", "offline"].includes(data.availability)
          ? data.availability
          : "offline",
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lng) ? lng : null,
        performanceRating: data.performanceRating != null ? Number(data.performanceRating) : null,
        completedJobs: Number(data.completedJobs ?? 0),
        experienceYears: experience,
      });
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setLastLocation({ lat, lng, time: data.updated_at ? new Date(data.updated_at).getTime() : null });
      }

      const assignments = data.performance?.assignments ?? {};
      const reviews = data.performance?.reviews ?? {};
      const rating = reviews.averageScoreOutOf5 ?? data.performanceRating ?? null;
      const score = reviews.averageScoreOutOf100 ?? (rating != null ? Number(rating) * 20 : null);
      setPerformance({
        rating: rating != null && Number.isFinite(Number(rating)) ? Number(rating) : null,
        score: score != null && Number.isFinite(Number(score)) ? Number(score) : null,
        completed: Number(assignments.completed ?? data.completedJobs ?? 0),
        resolution: Number(assignments.resolutionRate ?? 0),
        total: Number(assignments.total ?? 0),
        pending: Number(assignments.pending ?? 0),
        inProgress: Number(assignments.inProgress ?? 0),
      });
    } catch (error) {
      setPageMessage({
        type: "err",
        text: error.message || "Unable to load your profile.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!navigator.permissions?.query) {
      setPermission("unknown");
      return undefined;
    }

    let status;
    let active = true;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((currentStatus) => {
        if (!active) return;
        status = currentStatus;
        setPermission(currentStatus.state);
        currentStatus.onchange = () => setPermission(currentStatus.state);
      })
      .catch(() => {
        if (active) setPermission("unknown");
      });

    return () => {
      active = false;
      if (status) status.onchange = null;
    };
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setPageMessage(null);
    setProfileSaved(false);
    const fullName = draft.fullName.trim();
    const phone = (draft.phone ?? "").trim();
    if (!fullName) {
      setPageMessage({ type: "err", text: "Your full name is required." });
      return;
    }

    // Validate years of experience (optional, whole number 0-60).
    const experienceText = String(draft.experienceYears ?? "").trim();
    const experienceYears = experienceText === "" ? null : Number(experienceText);
    if (
      experienceYears !== null &&
      (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60)
    ) {
      setPageMessage({
        type: "err",
        text: "Experience must be a whole number between 0 and 60.",
      });
      return;
    }

    const token = getToken();
    if (!token) {
      setPageMessage({ type: "err", text: "Please sign in again." });
      return;
    }

    setSavingProfile(true);
    try {
      const response = await fetch(PROFILE_API_URL, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: fullName }),
      });
      const result = await readJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(result, `Profile update failed (${response.status}).`));
      }
      const updated = result.data?.profile ?? result.data?.engineer ?? result.data;
      const savedName = updated?.name ?? fullName;

      // Phone and experience are stored on the engineer record, so save them through the engineer endpoint.
      const engineerResponse = await fetch(ENGINEER_API_URL, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          specialization: engineer.specialization,
          availability: engineer.availability,
          ...(experienceYears !== null ? { experienceYears } : {}),
          ...(engineer.latitude != null ? { latitude: engineer.latitude } : {}),
          ...(engineer.longitude != null ? { longitude: engineer.longitude } : {}),
        }),
      });
      const engineerResult = await readJson(engineerResponse);
      if (!engineerResponse.ok) {
        throw new Error(
          getErrorMessage(
            engineerResult,
            `Your name was saved, but the engineer details update failed (${engineerResponse.status}).`
          )
        );
      }

      const updatedEngineer = engineerResult.data?.engineer ?? engineerResult.data?.profile ?? engineerResult.data;
      const savedPhone = updatedEngineer?.phone ?? phone;
      const savedExperienceRaw =
        updatedEngineer?.experienceYears ?? updatedEngineer?.experience_years ?? experienceYears;
      const savedExperience =
        savedExperienceRaw != null && Number.isFinite(Number(savedExperienceRaw))
          ? Number(savedExperienceRaw)
          : null;

      setProfile((current) => ({ ...current, fullName: savedName }));
      setContact((current) => ({ ...current, phone: savedPhone }));
      setEngineer((current) => ({ ...current, experienceYears: savedExperience }));
      setDraft({
        fullName: savedName,
        phone: savedPhone,
        experienceYears: savedExperience != null ? String(savedExperience) : "",
      });
      setEditing(false);
      setProfileSaved(true);
      setPageMessage({ type: "ok", text: "Your profile details were saved." });
    } catch (error) {
      setPageMessage({ type: "err", text: error.message || "Could not save your profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveEngineerDetails = async (patch, successText) => {
    const token = getToken();
    if (!token) throw new Error("Please sign in again.");

    const response = await fetch(ENGINEER_API_URL, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });
    const result = await readJson(response);
    if (!response.ok) {
      throw new Error(getErrorMessage(result, `Engineer update failed (${response.status}).`));
    }
    const updated = result.data?.engineer ?? result.data?.profile ?? result.data;
    if (successText) setPageMessage({ type: "ok", text: successText });
    return updated;
  };

  const chooseAvailability = async (key) => {
    setPageMessage(null);
    setAvailabilitySaved(false);
    setSavingAvailability(true);
    try {
      const updated = await saveEngineerDetails(
        {
          specialization: engineer.specialization,
          phone: contact.phone,
          availability: key,
          ...(engineer.latitude != null ? { latitude: engineer.latitude } : {}),
          ...(engineer.longitude != null ? { longitude: engineer.longitude } : {}),
        },
        "Your work availability was updated."
      );
      const savedAvailability = updated?.availability ?? key;
      setEngineer((current) => ({ ...current, availability: savedAvailability }));
      setAvailabilitySaved(true);
    } catch (error) {
      setPageMessage({ type: "err", text: error.message || "Could not update availability." });
    } finally {
      setSavingAvailability(false);
    }
  };

  const [specializationDraft, setSpecializationDraft] = useState("general");
  const [savingSpecialization, setSavingSpecialization] = useState(false);
  useEffect(() => {
    setSpecializationDraft(engineer.specialization);
  }, [engineer.specialization]);

  const saveSpecialization = async (event) => {
    event.preventDefault();
    setPageMessage(null);
    setSavingSpecialization(true);
    try {
      const updated = await saveEngineerDetails(
        {
          specialization: specializationDraft,
          phone: contact.phone,
          availability: engineer.availability,
          ...(engineer.latitude != null ? { latitude: engineer.latitude } : {}),
          ...(engineer.longitude != null ? { longitude: engineer.longitude } : {}),
        },
        "Engineering specialization was updated."
      );
      setEngineer((current) => ({
        ...current,
        specialization: updated?.specialization ?? specializationDraft,
      }));
    } catch (error) {
      setPageMessage({ type: "err", text: error.message || "Could not update specialization." });
    } finally {
      setSavingSpecialization(false);
    }
  };

  const updateLocationNow = () => {
    setLocError("");
    setLocMessage(null);
    if (!("geolocation" in navigator)) {
      setLocError("Geolocation is not supported by this browser.");
      return;
    }

    setLocBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          // Send only the coordinates, so a stale page can never overwrite
          // availability (the server sets "busy" when a fault is assigned).
          const updated = await saveEngineerDetails(
            { latitude: lat, longitude: lng },
            null
          );
          setEngineer((current) => ({
            ...current,
            latitude: Number(updated?.latitude ?? lat),
            longitude: Number(updated?.longitude ?? lng),
          }));
          setLastLocation({
            lat: Number(updated?.latitude ?? lat),
            lng: Number(updated?.longitude ?? lng),
            time: Date.now(),
          });
          setLocMessage({ type: "ok", text: "Your GPS coordinates were saved to your engineer profile." });
        } catch (error) {
          setLocError(error.message || "Your location was obtained but could not be saved.");
        } finally {
          setLocBusy(false);
        }
      },
      (error) => {
        setLocError(error.message || "Could not get your location.");
        setLocBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Live tracking: sends only the coordinates, never availability or other fields.
  const sendLiveLocation = async ({ lat, lng }) => {
    const updated = await saveEngineerDetails({ latitude: lat, longitude: lng }, null);
    const savedLat = Number(updated?.latitude ?? lat);
    const savedLng = Number(updated?.longitude ?? lng);
    setEngineer((current) => ({ ...current, latitude: savedLat, longitude: savedLng }));
    setLastLocation({ lat: savedLat, lng: savedLng, time: Date.now() });
  };

  // Tracking runs only while the switch is on AND the engineer is not "Off duty".
  const liveTracking = useLiveLocation({
    enabled: shareLocation && engineer.availability !== "offline",
    onSend: sendLiveLocation,
  });

  const toggleShareLocation = (checked) => {
    setShareLocation(checked);
    localStorage.setItem("shareLiveLocation", String(checked));
  };

  const liveStatusText = () => {
    if (!shareLocation) return "";
    if (engineer.availability === "offline") {
      return "Live tracking is paused because you are Off duty.";
    }
    if (liveTracking.error) return `Live tracking problem: ${liveTracking.error}`;
    if (!liveTracking.lastSentAt) {
      return "Live tracking is on. Waiting for your first GPS reading…";
    }
    const accuracy = liveTracking.position
      ? ` · accuracy ±${Math.round(liveTracking.position.accuracy)} m`
      : "";
    return `Live tracking is on · last sent ${new Date(liveTracking.lastSentAt).toLocaleTimeString()}${accuracy}`;
  };

  const toggleNotification = (key) => {
    setNotif((current) => ({ ...current, [key]: !current[key] }));
    setNotifSaved(true);
    // No notification-preferences API was supplied. Do not claim these are persisted.
  };

  const removePhoto = () => {
    if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
    setPhoto(null);
    setPhotoFileName("");
    setPhotoError("Profile-photo removal is not connected to a backend endpoint yet.");
  };

  const onPhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image must be smaller than 5 MB.");
      return;
    }
    setPhotoError("Preview only: profile-photo upload is not connected to a backend endpoint yet.");
    if (photo?.startsWith("blob:")) URL.revokeObjectURL(photo);
    setPhoto(URL.createObjectURL(file));
    setPhotoFileName(file.name);
  };

  const permissionBadge = {
    granted: ["Allowed", "bg-emerald-50 text-emerald-700 ring-emerald-600/20"],
    denied: ["Blocked", "bg-red-50 text-red-700 ring-red-600/20"],
    prompt: ["Not asked yet", "bg-amber-50 text-amber-700 ring-amber-600/20"],
    unknown: ["Unknown", "bg-slate-100 text-slate-600 ring-slate-500/20"],
    checking: ["Checking…", "bg-slate-100 text-slate-600 ring-slate-500/20"],
  }[permission] || ["Unknown", "bg-slate-100 text-slate-600 ring-slate-500/20"];

  const notifItems = useMemo(
    () => [
      { key: "assignments", title: "New assignment notifications", desc: "When the control room assigns you a new fault." },
      { key: "deadlines", title: "Assignment deadline reminders", desc: "Reminders before a job's deadline." },
      { key: "status", title: "Fault status updates", desc: "When a fault you worked on changes status." },
      { key: "safety", title: "Safety alerts", desc: "Hazard warnings for sites you're travelling to." },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading your profile…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {pageMessage && <Message msg={pageMessage} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Your profile and engineer information, connected to your account.</p>
        </div>
        <button type="button" onClick={loadProfile} className={btnOutline}>
          <RefreshCw className="h-4 w-4" /> Refresh profile
        </button>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <Avatar photo={photo} name={profile.fullName} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">Engineer profile</p>
            <h2 className="mt-1 break-words text-3xl font-bold tracking-tight sm:text-4xl">{profile.fullName || "Engineer"}</h2>
            <p className="mt-1 text-slate-200">Field Engineer · {engineer.specialization}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                <span className={`h-2.5 w-2.5 rounded-full ${avail.dot}`} /> {avail.label}
              </span>
              {profile.employeeId && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                  <User className="h-4 w-4 text-blue-200" /> {profile.employeeId}
                </span>
              )}
              {engineer.experienceYears != null && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                  <Briefcase className="h-4 w-4 text-blue-200" /> {formatYears(engineer.experienceYears)} experience
                </span>
              )}
              {performance.rating != null && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                  <Trophy className="h-4 w-4 text-amber-300" /> Rating {performance.rating.toFixed(2)}/5
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* LEFT COLUMN */}
        <div className="min-w-0 space-y-6">
          {/* Personal information */}
          <section className={card}>
            <SectionTitle
              icon={User}
              tone="blue"
              title="Personal information"
              subtitle="Details returned by your signed-in account"
              right={
                editing ? null : (
                  <div className="flex items-center gap-3">
                    {profileSaved && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><Check className="h-3.5 w-3.5" /> Saved</span>}
                    <button type="button" onClick={() => { resetDraft(); setEditing(true); }} className={btnOutline}>
                      <Pencil className="h-4 w-4" /> Edit details
                    </button>
                  </div>
                )
              }
            />

            <div className="mb-6 flex flex-wrap items-center gap-5 rounded-2xl bg-slate-50 p-4">
              <Avatar photo={photo} name={profile.fullName} size="h-20 w-20 text-2xl" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Profile photo</p>
                <p className="text-xs text-slate-500">JPG or PNG, up to 5 MB.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className={`${btnOutline} cursor-pointer py-1.5`}>
                    <Camera className="h-4 w-4" /> {photo ? "Change preview" : "Choose photo"}
                    <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                  </label>
                  {photo && <button type="button" onClick={removePhoto} className={`${btnOutline} py-1.5 text-red-600`}><X className="h-4 w-4" /> Clear preview</button>}
                </div>
                {photoFileName && <p className="mt-1 text-xs text-slate-500">Selected: {photoFileName}</p>}
                {photoError && <p className="mt-2 text-xs text-amber-700">{photoError}</p>}
              </div>
            </div>

            {editing ? (
              <form onSubmit={saveProfile} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <input required className={field} value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} autoComplete="name" />
                  </Field>
                  <Field label="Phone number">
                    <input type="tel" className={field} value={draft.phone ?? ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} autoComplete="tel" />
                  </Field>
                  <Field label="Years of experience" hint="Whole years, 0 to 60.">
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="1"
                      className={field}
                      value={draft.experienceYears ?? ""}
                      onChange={(event) => setDraft({ ...draft, experienceYears: event.target.value })}
                    />
                  </Field>
                </div>
                <p className="text-xs text-slate-500">Your name is saved to your profile, and your phone and years of experience are saved to your engineer record. Your registered email is read-only.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={savingProfile} className={btnPrimary}><Save className="h-4 w-4" /> {savingProfile ? "Saving…" : "Save changes"}</button>
                  <button type="button" onClick={() => { resetDraft(); setEditing(false); }} className={btnOutline}><X className="h-4 w-4" /> Cancel</button>
                </div>
              </form>
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2">
                <ReadOnly icon={User} label="Full name">{profile.fullName}</ReadOnly>
                <ReadOnly icon={ClipboardCheck} label="Engineer record ID">{profile.employeeId}</ReadOnly>
                <ReadOnly icon={Phone} label="Phone number">{contact.phone}</ReadOnly>
                <ReadOnly icon={Mail} label="Registered email">{contact.email}</ReadOnly>
              </dl>
            )}
          </section>

          {/* Professional information */}
          <section className={card}>
            <SectionTitle
              icon={Briefcase}
              tone="violet"
              title="Professional information"
              subtitle="Engineer details from the database"
              right={<span className={`${pill} bg-slate-100 text-slate-600 ring-slate-500/20`}><Lock className="h-3 w-3" /> Account data</span>}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnly icon={Briefcase} label="Role">Field Engineer</ReadOnly>
              <ReadOnly icon={Target} label="Specialization">{engineer.specialization}</ReadOnly>
              <ReadOnly icon={ClipboardCheck} label="Experience">{formatYears(engineer.experienceYears)}</ReadOnly>
            </div>
            <form onSubmit={saveSpecialization} className="mt-5 space-y-3 rounded-xl border border-slate-200 p-4">
              <Field label="Update engineering specialization" hint="This value is saved to your engineer record.">
                <select className={field} value={specializationDraft} onChange={(event) => setSpecializationDraft(event.target.value)}>
                  <option value="substation">Substation</option>
                  <option value="feeder">Feeder</option>
                  <option value="transformer">Transformer</option>
                  <option value="distribution">Distribution</option>
                  <option value="general">General</option>
                </select>
              </Field>
              <button type="submit" disabled={savingSpecialization || specializationDraft === engineer.specialization} className={btnPrimary}>
                <Save className="h-4 w-4" /> {savingSpecialization ? "Saving…" : "Save specialization"}
              </button>
            </form>
            <p className="mt-4 text-xs text-slate-400">Department, residential address and certifications are not included in the profile API response, so they are not invented here.</p>
          </section>

          {/* GPS */}
          <section className={card}>
            <SectionTitle icon={MapPin} tone="cyan" title="GPS & location" subtitle="Report your current coordinates to the engineer API" />
            <dl className="grid gap-3 sm:grid-cols-2">
              <ReadOnly icon={MapPin} label="Latitude">{lastLocation.lat != null ? lastLocation.lat.toFixed(6) : "Not reported"}</ReadOnly>
              <ReadOnly icon={MapPin} label="Longitude">{lastLocation.lng != null ? lastLocation.lng.toFixed(6) : "Not reported"}</ReadOnly>
            </dl>
            {lastLocation.time && <p className="mt-3 text-xs text-slate-500">Last location update: {new Date(lastLocation.time).toLocaleString()}</p>}
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Browser location permission</p>
                <p className="text-xs text-slate-500">Your position is sent only while live sharing (below) is on, or when you press the update button.</p>
              </div>
              <span className={`${pill} ${permissionBadge[1]}`}>{permissionBadge[0]}</span>
            </div>
            {locError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{locError}</p>}
            <div className="mt-3"><Message msg={locMessage} /></div>
            <button type="button" onClick={updateLocationNow} disabled={locBusy} className={`${btnOutline} mt-3 w-full`}>
              <LocateFixed className="h-4 w-4" /> {locBusy ? "Getting and saving location…" : "Update my location now"}
            </button>
            {permission === "denied" && <p className="mt-2 text-xs text-amber-700">Location is blocked. Allow location access in your browser site settings, then try again.</p>}
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm">
              <input type="checkbox" className="mt-0.5" checked={shareLocation} onChange={(event) => toggleShareLocation(event.target.checked)} />
              <span><span className="font-semibold text-slate-800">Share my live location while on duty</span><span className="mt-0.5 block text-xs text-slate-500">Your position is sent automatically while you are Available or On assignment and this page stays open. It pauses when you are Off duty.</span></span>
            </label>
            {shareLocation && <p role="status" className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{liveStatusText()}</p>}
          </section>

          {/* Account-security connection notice */}
          <section className={card}>
            <SectionTitle icon={Lock} tone="rose" title="Account security" subtitle="Security endpoints not yet connected" />
            <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p><strong>Registered email:</strong> {contact.email || "Not available"}. Email changes are disabled on this page.</p>
              <p>Password changing, verification-code delivery, and two-factor authentication require dedicated backend endpoints. This page does not pretend to change them without server confirmation.</p>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <aside className="space-y-6">
          {/* Availability */}
          <section className={card}>
            <SectionTitle
              icon={CircleDot}
              tone="emerald"
              title="Work availability"
              subtitle="The control room uses this status"
              right={availabilitySaved && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><Check className="h-3.5 w-3.5" /> Updated</span>}
            />
            <div className="space-y-2.5">
              {availabilityOptions.map((option) => {
                const selected = availability === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    disabled={savingAvailability}
                    onClick={() => chooseAvailability(option.key)}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-3.5 text-left transition disabled:opacity-60 ${selected ? option.selected : "border-slate-200 hover:bg-slate-50"}`}
                  >
                    <span className={`h-3 w-3 shrink-0 rounded-full ${option.dot}`} />
                    <span className="flex-1">
                      <span className={`block text-sm font-semibold ${selected ? option.text : "text-slate-900"}`}>{option.label}</span>
                      <span className="block text-xs text-slate-500">{option.desc}</span>
                    </span>
                    {selected && <CheckCircle2 className={`h-5 w-5 ${option.text}`} />}
                  </button>
                );
              })}
            </div>
            {savingAvailability && <p className="mt-3 text-xs text-slate-500">Saving availability…</p>}
          </section>

          {/* Performance */}
          <section className={card}>
            <SectionTitle icon={Trophy} tone="amber" title="Performance summary" subtitle="Loaded from your profile API" />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                <p className="text-xs text-slate-500">Average rating</p>
                <p className="mt-1 text-3xl font-bold text-emerald-600">{performance.rating != null ? performance.rating.toFixed(2) : "—"}<span className="text-sm font-medium">/5</span></p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                <p className="text-xs text-slate-500">Review score</p>
                <p className="mt-1 text-3xl font-bold text-blue-600">{performance.score != null ? Math.round(performance.score) : "—"}<span className="text-sm font-medium">/100</span></p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Completed assignments</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{performance.completed}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Resolution rate</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{Math.round(performance.resolution)}%</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-slate-200 p-2"><p className="text-xs text-slate-500">Total</p><p className="font-semibold text-slate-900">{performance.total}</p></div>
              <div className="rounded-lg border border-slate-200 p-2"><p className="text-xs text-slate-500">Pending</p><p className="font-semibold text-slate-900">{performance.pending}</p></div>
              <div className="rounded-lg border border-slate-200 p-2"><p className="text-xs text-slate-500">In progress</p><p className="font-semibold text-slate-900">{performance.inProgress}</p></div>
            </div>
            <Link to="/my-performance" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
              View full performance <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          {/* Notifications: local preference only */}
          <section className={card}>
            <SectionTitle
              icon={Bell}
              tone="indigo"
              title="Notification preferences"
              subtitle="Choose local page preferences"
              right={notifSaved && <span className={`${pill} bg-amber-50 text-amber-700 ring-amber-600/20`}>Not synced</span>}
            />
            <ul className="divide-y divide-slate-100">
              {notifItems.map((item) => (
                <li key={item.key} className="flex items-start justify-between gap-4 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    aria-label={item.title}
                    checked={notif[item.key]}
                    onChange={() => toggleNotification(item.key)}
                    className="mt-1 h-4 w-4 accent-blue-600"
                  />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-400">Notification preference persistence requires a notification settings endpoint.</p>
            {!notif.safety && <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" />Safety alerts are off in this page state. Keep them on while working in the field.</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}
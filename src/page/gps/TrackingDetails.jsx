import { statusStyles } from "./gpsStyles.js";

function Field({ label, children }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900">{children ?? "—"}</p>
    </div>
  );
}

export default function TrackingDetails({ engineer }) {
  if (!engineer) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm text-gray-900">Tracking Details</h3>
        <p className="py-6 text-center text-sm text-gray-400">
          Select an engineer on the map or in the list to see tracking details.
        </p>
      </section>
    );
  }

  const style = statusStyles[engineer.status] ?? statusStyles.Offline;
  const lowBattery = Number.isFinite(engineer.battery) && engineer.battery < 20;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm text-gray-900">{engineer.name}</h3>
          <p className="text-xs text-gray-500">Tracking details</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] ${style.badge}`}>
          {engineer.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Field label="Assigned Fault">{engineer.assignedFault}</Field>
        <Field label="Current Location">{engineer.currentLocation}</Field>
        <Field label="ETA">{engineer.eta}</Field>
        <Field label="Coordinates">
          {Number.isFinite(engineer.lat) && Number.isFinite(engineer.lng)
            ? `${engineer.lat.toFixed(5)}, ${engineer.lng.toFixed(5)}`
            : null}
        </Field>
        <Field label="Speed">
          {Number.isFinite(engineer.speed) ? `${engineer.speed} km/h` : null}
        </Field>
        <Field label="GPS Accuracy">
          {Number.isFinite(engineer.accuracy) ? `±${engineer.accuracy} m` : null}
        </Field>
        <Field label="Battery">
          {Number.isFinite(engineer.battery) ? (
            <span className={lowBattery ? "text-red-500" : ""}>{engineer.battery}%</span>
          ) : null}
        </Field>
        <Field label="Last Update">{engineer.lastUpdate}</Field>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-600 hover:bg-blue-100">
          Call Engineer
        </button>
        <button type="button" className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700 hover:bg-gray-200">
          Send Message
        </button>
        <button type="button" className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700 hover:bg-gray-200">
          Reassign Fault
        </button>
      </div>
    </section>
  );
}
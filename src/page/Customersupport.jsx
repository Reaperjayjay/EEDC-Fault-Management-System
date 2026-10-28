import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Check,
  CheckCircle2,
  LifeBuoy,
  Inbox,
  Loader2,
  Layers,
  Paperclip,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronDown,
  ZapOff,
  Zap,
  Gauge,
  Plug,
  Receipt,
  MessageSquare,
  UserCheck,
} from "lucide-react";

/* =====================================================================
   Edit these with your real details
   ===================================================================== */

const CONTACT = {
  phone: "+234 800 000 0000",
  email: "support@yourcompany.com",
  office: "Customer Service Office, Abuja",
  hours: "Mon - Fri, 8:00 AM - 5:00 PM",
};

const FAQS = [
  {
    q: "How do I report a power outage?",
    a: "Choose “Power outage” in the Electricity Complaints section, fill in the ticket form with your location or the nearest distribution site, and submit. You can also call the customer service number.",
  },
  {
    q: "How long does it take to get a response?",
    a: "Tickets are reviewed as soon as they are submitted. Urgent complaints such as outages and transformer faults are prioritised. You can follow progress under Track Support Status.",
  },
  {
    q: "Can I add a photo to my complaint?",
    a: "Yes. The attachment field accepts one photo (up to 5 MB). A photo of damaged equipment or a faulty meter helps the team understand the problem faster.",
  },
  {
    q: "What do the ticket statuses mean?",
    a: "Open: received. Under Review: being checked by support staff. In Progress: being worked on. Resolved: the problem has been fixed. Closed: the ticket is completed.",
  },
  {
    q: "What if I have a billing or meter enquiry?",
    a: "Select “Meter or billing enquiries” and include your meter number in the description so the billing team can find your account quickly.",
  },
  {
    q: "My issue came back after it was resolved. What should I do?",
    a: "Submit a new ticket and mention the earlier ticket number in the description so staff can link the two.",
  },
];

/* =====================================================================
   Constants
   ===================================================================== */

const STATUSES = ["Open", "Under Review", "In Progress", "Resolved", "Closed"];

const statusStyles = {
  Open: "bg-orange-50 text-orange-700 border-orange-200",
  "Under Review": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Resolved: "bg-green-50 text-green-700 border-green-200",
  Closed: "bg-gray-50 text-gray-600 border-gray-200",
};

const CATEGORIES = [
  { name: "Power outage", desc: "No electricity at your home or business", icon: ZapOff, color: "bg-red-50 text-red-500" },
  { name: "Transformer fault", desc: "Noise, sparks or failure at a transformer", icon: Zap, color: "bg-orange-50 text-orange-500" },
  { name: "Low voltage", desc: "Dim lights or appliances not working properly", icon: Gauge, color: "bg-yellow-50 text-yellow-600" },
  { name: "Damaged electrical equipment", desc: "Broken poles, cables, fuses or fittings", icon: Plug, color: "bg-purple-50 text-purple-500" },
  { name: "Meter or billing enquiries", desc: "Meter faults, readings and bills", icon: Receipt, color: "bg-blue-50 text-blue-500" },
  { name: "Other service complaints", desc: "Anything else about your electricity service", icon: MessageSquare, color: "bg-gray-100 text-gray-600" },
];

/* ---------- Sample data (replace with your API) ---------- */

const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

const sampleTickets = [
  {
    ticketNo: "SUP-1004",
    name: "Ngozi Adeyemi",
    phone: "+234 801 234 5678",
    category: "Power outage",
    subject: "No light since last night",
    description: "Our whole street in Gwarinpa has had no electricity since about 9 PM yesterday.",
    location: "Gwarinpa Estate, 1st Avenue",
    attachment: null,
    createdAt: ago(60 * 5),
    assignedTo: "Halima Yusuf",
    status: "In Progress",
    updates: [
      { status: "Open", time: ago(60 * 5) },
      { status: "Under Review", time: ago(60 * 4 + 30) },
      { status: "In Progress", time: ago(60 * 3) },
    ],
  },
  {
    ticketNo: "SUP-1003",
    name: "Ngozi Adeyemi",
    phone: "+234 801 234 5678",
    category: "Meter or billing enquiries",
    subject: "Bill higher than usual",
    description: "My last bill is almost double what I normally pay. Meter number 4521-8890.",
    location: "Gwarinpa Estate",
    attachment: null,
    createdAt: ago(60 * 24 * 2),
    assignedTo: "Tunde Bakare",
    status: "Under Review",
    updates: [
      { status: "Open", time: ago(60 * 24 * 2) },
      { status: "Under Review", time: ago(60 * 24 * 2 - 120) },
    ],
  },
  {
    ticketNo: "SUP-1001",
    name: "Ngozi Adeyemi",
    phone: "+234 801 234 5678",
    category: "Low voltage",
    subject: "Appliances not working properly",
    description: "Voltage has been very low in the evenings for the past week.",
    location: "Life Camp, near the market",
    attachment: null,
    createdAt: ago(60 * 24 * 8),
    assignedTo: "Halima Yusuf",
    status: "Resolved",
    updates: [
      { status: "Open", time: ago(60 * 24 * 8) },
      { status: "Under Review", time: ago(60 * 24 * 7 + 400) },
      { status: "In Progress", time: ago(60 * 24 * 7) },
      { status: "Resolved", time: ago(60 * 24 * 5) },
    ],
  },
  {
    ticketNo: "SUP-0998",
    name: "Ngozi Adeyemi",
    phone: "+234 801 234 5678",
    category: "Damaged electrical equipment",
    subject: "Leaning pole by the roadside",
    description: "The electric pole outside number 12 is leaning after the rain.",
    location: "Estate Road, Gwarinpa",
    attachment: null,
    createdAt: ago(60 * 24 * 20),
    assignedTo: "Chinedu Okafor",
    status: "Closed",
    updates: [
      { status: "Open", time: ago(60 * 24 * 20) },
      { status: "Under Review", time: ago(60 * 24 * 19 + 600) },
      { status: "In Progress", time: ago(60 * 24 * 19) },
      { status: "Resolved", time: ago(60 * 24 * 17) },
      { status: "Closed", time: ago(60 * 24 * 15) },
    ],
  },
];

/* ---------- Helpers ---------- */

const isOpen = (t) => t.status === "Open" || t.status === "Under Review";
const isProgress = (t) => t.status === "In Progress";
const isResolved = (t) => t.status === "Resolved" || t.status === "Closed";

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Badge({ className, children }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] ${className}`}>
      {children}
    </span>
  );
}

function Card({ title, children, className = "", ...rest }) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 ${className}`} {...rest}>
      {title && <h3 className="mb-4 text-sm text-gray-900">{title}</h3>}
      {children}
    </section>
  );
}

/* ---------- 1. Support Overview ---------- */

function SupportOverview({ tickets, filter, onFilter }) {
  const cards = [
    { key: null, label: "Total Requests", value: tickets.length, color: "text-gray-900", icon: Layers, iconBg: "bg-gray-100 text-gray-600" },
    { key: "open", label: "Open Requests", value: tickets.filter(isOpen).length, color: "text-orange-500", icon: Inbox, iconBg: "bg-orange-50 text-orange-500" },
    { key: "progress", label: "In Progress", value: tickets.filter(isProgress).length, color: "text-blue-600", icon: Loader2, iconBg: "bg-blue-50 text-blue-500" },
    { key: "resolved", label: "Resolved", value: tickets.filter(isResolved).length, color: "text-green-600", icon: CheckCircle2, iconBg: "bg-green-50 text-green-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const selected = filter === c.key;
        return (
          <button
            key={c.label}
            type="button"
            onClick={() => onFilter(selected ? null : c.key)}
            aria-pressed={selected}
            className={`rounded-2xl border bg-white p-4 text-left transition ${
              selected && c.key !== null ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${c.iconBg}`}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-medium ${c.color}`}>{c.value}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- 2. Submit a Support Ticket ---------- */

function FormField({ label, error, optional, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-gray-600">
        {label} {optional && <span className="text-gray-400">(optional)</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

const inputClass = (error) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-blue-500 ${
    error ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
  }`;

const MAX_FILE_MB = 5;

function SubmitTicketForm({ category, onCategoryChange, onSubmit }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [errors, setErrors] = useState({});
  const [submittedNo, setSubmittedNo] = useState(null);
  const fileInput = useRef(null);

  // Preview URL for the chosen photo
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setFileError("Please choose a photo (image file).");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`The photo must be ${MAX_FILE_MB} MB or smaller.`);
      e.target.value = "";
      return;
    }
    setFileError("");
    setFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setFileError("");
    if (fileInput.current) fileInput.current.value = "";
  };

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Please enter your name.";
    if (!/^\+?[\d\s-]{7,}$/.test(phone.trim())) e.phone = "Enter a valid phone number.";
    if (!category) e.category = "Choose a complaint category.";
    if (!subject.trim()) e.subject = "Please add a subject.";
    if (description.trim().length < 10) e.description = "Please describe the problem (at least 10 characters).";
    if (!location.trim()) e.location = "Tell us your location or the affected site.";
    return e;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const ticketNo = onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      category,
      subject: subject.trim(),
      description: description.trim(),
      location: location.trim(),
      attachment: file ? { name: file.name, url: URL.createObjectURL(file) } : null,
    });

    setSubmittedNo(ticketNo);
    setSubject("");
    setDescription("");
    setLocation("");
    clearFile();
    onCategoryChange("");
  };

  return (
    <Card title="Submit a Support Ticket" id="submit-ticket">
      {submittedNo && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <p className="flex-1">
            Your ticket <span className="font-medium">{submittedNo}</span> has been submitted. You can follow its progress under My Support Requests.
          </p>
          <button type="button" onClick={() => setSubmittedNo(null)} aria-label="Dismiss" className="text-green-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Full name" error={errors.name}>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass(errors.name)} placeholder="Your name" />
          </FormField>
          <FormField label="Phone number" error={errors.phone}>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              className={inputClass(errors.phone)}
              placeholder="+234 ..."
            />
          </FormField>
        </div>

        <FormField label="Complaint category" error={errors.category}>
          <select value={category} onChange={(e) => onCategoryChange(e.target.value)} className={inputClass(errors.category)}>
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Subject" error={errors.subject}>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass(errors.subject)} placeholder="Short summary of the problem" />
        </FormField>

        <FormField label="Description" error={errors.description}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={inputClass(errors.description)}
            placeholder="Tell us what is happening, when it started, and any meter or account number"
          />
        </FormField>

        <FormField label="Location or affected distribution site" error={errors.location}>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass(errors.location)}
            placeholder="Street, community or substation name"
          />
        </FormField>

        <FormField label="Attachment or photo" optional error={fileError}>
          {file ? (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
              <img src={preview} alt="Selected attachment preview" className="h-12 w-12 rounded-md object-cover" />
              <p className="min-w-0 flex-1 truncate text-xs text-gray-700">{file.name}</p>
              <button type="button" onClick={clearFile} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Remove photo">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-xs text-gray-500 hover:bg-gray-50">
              <Paperclip className="h-4 w-4" />
              Choose a photo (up to {MAX_FILE_MB} MB)
              <input ref={fileInput} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
          )}
        </FormField>

        <button type="submit" className="w-full rounded-lg bg-blue-600 py-2.5 text-sm text-white transition hover:bg-blue-700">
          Submit ticket
        </button>
      </form>
    </Card>
  );
}

/* ---------- 5. Electricity Complaints (category picker) ---------- */

function ElectricityComplaints({ selected, onPick }) {
  return (
    <Card title="Electricity Complaints">
      <p className="mb-4 -mt-2 text-xs text-gray-500">
        Pick the type of complaint and it will be filled in on the ticket form.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const active = selected === c.name;
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onPick(c.name)}
              aria-pressed={active}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                active ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.color}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-gray-900">{c.name}</span>
                <span className="block text-[11px] leading-snug text-gray-500">{c.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- 3. My Support Requests ---------- */

function MyRequests({ tickets, total, selectedNo, onSelect, query, onQuery }) {
  return (
    <Card title={`My Support Requests (${tickets.length})`}>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search ticket number, subject or category..."
          className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
        />
      </div>

      <div className="max-h-[34rem] space-y-2 overflow-y-auto">
        {tickets.map((t) => {
          const selected = t.ticketNo === selectedNo;
          return (
            <button
              key={t.ticketNo}
              type="button"
              onClick={() => onSelect(t.ticketNo)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                selected ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-900">{t.subject}</p>
                <Badge className={statusStyles[t.status]}>{t.status}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                {t.ticketNo} · {t.category}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
                <span>Submitted {formatDate(t.createdAt)}</span>
                <span className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3" />
                  {t.assignedTo ?? "Not yet assigned"}
                </span>
              </div>
            </button>
          );
        })}

        {tickets.length === 0 && (
          <p className="py-8 text-center text-xs text-gray-400">
            {total === 0 ? "You have not submitted any support requests yet." : "No requests match your search or filter."}
          </p>
        )}
      </div>
    </Card>
  );
}

/* ---------- 4. Track Support Status ---------- */

function TrackStatus({ ticket }) {
  if (!ticket) {
    return (
      <Card title="Track Support Status">
        <div className="py-10 text-center text-sm text-gray-400">
          <LifeBuoy className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          Select a request to see its progress.
        </div>
      </Card>
    );
  }

  const currentIndex = STATUSES.indexOf(ticket.status);
  const timeOf = (s) => ticket.updates?.find((u) => u.status === s)?.time;

  return (
    <Card title="Track Support Status">
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-900">{ticket.ticketNo}</p>
          <Badge className={statusStyles[ticket.status]}>{ticket.status}</Badge>
        </div>
        <p className="mt-2 text-sm text-gray-900">{ticket.subject}</p>
        <p className="mt-1 text-xs text-gray-600">{ticket.description}</p>

        <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Category</dt>
            <dd className="text-gray-900">{ticket.category}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Location / site</dt>
            <dd className="text-gray-900">{ticket.location}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Submitted</dt>
            <dd className="text-gray-900">{formatDateTime(ticket.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Assigned support staff</dt>
            <dd className={ticket.assignedTo ? "text-gray-900" : "text-gray-400"}>
              {ticket.assignedTo ?? "Not yet assigned"}
            </dd>
          </div>
        </dl>

        {ticket.attachment && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-gray-200 p-2">
            <img src={ticket.attachment.url} alt="Attachment" className="h-12 w-12 rounded-md object-cover" />
            <p className="min-w-0 flex-1 truncate text-xs text-gray-700">{ticket.attachment.name}</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-5">
        <ol>
          {STATUSES.map((status, i) => {
            const done = i < currentIndex || (i === currentIndex && (status === "Resolved" || status === "Closed"));
            const current = i === currentIndex && !done;
            const time = timeOf(status);
            const isLast = i === STATUSES.length - 1;

            return (
              <li key={status} className="relative flex gap-3 pb-5 last:pb-0">
                {!isLast && (
                  <span
                    className={`absolute bottom-0 left-3.5 top-7 w-px -translate-x-1/2 ${
                      i < currentIndex ? "bg-green-300" : "bg-gray-200"
                    }`}
                  />
                )}
                <span
                  className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                    done
                      ? "border-green-500 bg-green-500 text-white"
                      : current
                      ? "border-blue-500 bg-blue-50 text-blue-600 ring-4 ring-blue-100"
                      : "border-gray-300 bg-white text-gray-400"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : current ? <span className="h-2 w-2 rounded-full bg-blue-500" /> : i + 1}
                </span>
                <div className="pt-0.5">
                  <p className={`text-sm ${!done && !current ? "text-gray-400" : "text-gray-900"}`}>{status}</p>
                  <p className="text-[11px] text-gray-400">
                    {time ? formatDateTime(time) : current ? "Current stage" : "Pending"}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}

/* ---------- 6. FAQs and Contact Information ---------- */

function FaqList() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <Card title="Frequently Asked Questions">
      <div className="divide-y divide-gray-100">
        {FAQS.map((f, i) => {
          const open = openIndex === i;
          return (
            <div key={f.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 py-3 text-left"
              >
                <span className="text-sm text-gray-900">{f.q}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && <p className="pb-3 pr-6 text-xs leading-relaxed text-gray-600">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ContactInfo() {
  const rows = [
    { icon: Phone, label: "Customer service telephone", value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, "")}` },
    { icon: Mail, label: "Email address", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
    { icon: MapPin, label: "Office location", value: CONTACT.office },
    { icon: Clock, label: "Opening hours", value: CONTACT.hours },
  ];

  return (
    <Card title="Contact Information">
      <div className="space-y-4">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">{r.label}</p>
                {r.href ? (
                  <a href={r.href} className="break-words text-sm text-blue-600 hover:underline">{r.value}</a>
                ) : (
                  <p className="text-sm text-gray-900">{r.value}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Page ---------- */

export default function CustomerSupport() {
  // TODO: load this customer's tickets from your API
  const [tickets, setTickets] = useState(sampleTickets);

  const [filter, setFilter] = useState(null); // null | "open" | "progress" | "resolved"
  const [query, setQuery] = useState("");
  const [selectedNo, setSelectedNo] = useState(sampleTickets[0]?.ticketNo ?? null);
  const [category, setCategory] = useState("");
  const formRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tickets
      .filter((t) => {
        if (filter === "open") return isOpen(t);
        if (filter === "progress") return isProgress(t);
        if (filter === "resolved") return isResolved(t);
        return true;
      })
      .filter((t) => !q || [t.ticketNo, t.subject, t.category].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [tickets, filter, query]);

  const selected = tickets.find((t) => t.ticketNo === selectedNo) ?? filtered[0] ?? null;

  const addTicket = (data) => {
    // TODO: send `data` to your API and use the ticket number it returns
    const nums = tickets.map((t) => Number(t.ticketNo.split("-").pop())).filter(Number.isFinite);
    const ticketNo = `SUP-${String(Math.max(1000, ...nums) + 1).padStart(4, "0")}`;
    const now = new Date().toISOString();

    const ticket = {
      ticketNo,
      ...data,
      createdAt: now,
      assignedTo: null,
      status: "Open",
      updates: [{ status: "Open", time: now }],
    };

    setTickets((prev) => [ticket, ...prev]);
    setFilter(null);
    setQuery("");
    setSelectedNo(ticketNo);
    return ticketNo;
  };

  const pickCategory = (name) => {
    setCategory(name);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-full bg-gray-100 p-4 md:p-5">
      <div className="mb-5">
        <h2 className="text-xl font-medium md:text-2xl">Customer Support</h2>
        <p className="mt-1 text-sm text-gray-500">
          Report a problem, track your complaints and find answers
        </p>
      </div>

      <div className="space-y-5">
        <SupportOverview tickets={tickets} filter={filter} onFilter={setFilter} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div ref={formRef} className="min-w-0 scroll-mt-20">
            <SubmitTicketForm category={category} onCategoryChange={setCategory} onSubmit={addTicket} />
          </div>
          <div className="min-w-0">
            <ElectricityComplaints selected={category} onPick={pickCategory} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="min-w-0">
            <MyRequests
              tickets={filtered}
              total={tickets.length}
              selectedNo={selected?.ticketNo}
              onSelect={setSelectedNo}
              query={query}
              onQuery={setQuery}
            />
          </div>
          <div className="min-w-0">
            <TrackStatus ticket={selected} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <FaqList />
          <ContactInfo />
        </div>
      </div>
    </div>
  );
}
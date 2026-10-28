export default function Badge({ children, className = "" }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}
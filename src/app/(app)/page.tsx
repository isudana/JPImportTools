import Link from "next/link";

const UTILITIES = [
  {
    href: "/grade-search",
    title: "Grade Search",
    description: "Look up a vehicle's grade/trim from its chassis number on the manufacturer's own site.",
  },
  {
    href: "/yom-lookup",
    title: "YOM Lookup",
    description: "Look up a vehicle's manufacture year from its chassis code and serial number.",
  },
  {
    href: "/tax-calculator",
    title: "Vehicle Tax Calculator",
    description: "Estimate Sri Lanka Customs duty (CID, SUR, XID, VAT, VEL, LXT, SSCL) for an import.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Utilities</h1>
        <p className="mt-1 text-sm text-gray-500">Tools for checking vehicle details before import.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {UTILITIES.map((u) => (
          <Link
            key={u.href}
            href={u.href}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400"
          >
            <p className="font-medium text-gray-900">{u.title}</p>
            <p className="mt-1 text-sm text-gray-500">{u.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

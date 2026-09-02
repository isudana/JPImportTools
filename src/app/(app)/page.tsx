import Link from "next/link";

type BadgeColor = "red" | "rose" | "redDeep" | "roseDeep" | "redLight";

const BADGE_STYLES: Record<BadgeColor, string> = {
  red: "bg-red-50 text-red-700",
  rose: "bg-rose-100 text-rose-700",
  redDeep: "bg-red-100 text-red-800",
  roseDeep: "bg-rose-50 text-rose-800",
  redLight: "bg-red-200 text-red-900",
};

const UTILITIES: { href: string; title: string; description: string; icon: string; color: BadgeColor }[] = [
  {
    href: "/grade-search",
    title: "Grade Search",
    description: "Look up a vehicle's grade/trim from its chassis number on the manufacturer's own site.",
    icon: "🏷️",
    color: "red",
  },
  {
    href: "/yom-lookup",
    title: "YOM Lookup",
    description: "Look up a vehicle's manufacture year from its chassis code and serial number.",
    icon: "📅",
    color: "rose",
  },
  {
    href: "/tax-calculator",
    title: "Vehicle Tax Calculator",
    description: "Estimate Sri Lanka Customs duty (CID, SUR, XID, VAT, VEL, LXT, SSCL) for an import.",
    icon: "🧮",
    color: "redDeep",
  },
  {
    href: "/quotation",
    title: "Quotation Generator",
    description: "Build a cost quotation for a vehicle purchase from buying price, shipping, and fees.",
    icon: "🧾",
    color: "roseDeep",
  },
  {
    href: "/auction-sheet-decoder",
    title: "Auction Sheet Decoder",
    description: "Decode the grade and damage codes found on a Japanese auction sheet.",
    icon: "📋",
    color: "redLight",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="border-l-4 border-red-700 pl-3">
        <h1 className="text-lg font-semibold text-gray-900">Utilities</h1>
        <p className="mt-1 text-sm text-gray-500">Tools for checking vehicle details before import.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {UTILITIES.map((u) => (
          <Link
            key={u.href}
            href={u.href}
            className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-red-400"
          >
            <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg text-xl ${BADGE_STYLES[u.color]}`}>
              {u.icon}
            </span>
            <span className="min-w-0">
              <p className="font-medium text-gray-900">{u.title}</p>
              <p className="mt-1 text-sm text-gray-500">{u.description}</p>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";

type BadgeColor = "red" | "rose" | "redDeep" | "roseDeep";

const BADGE_STYLES: Record<BadgeColor, string> = {
  red: "bg-red-50 text-red-700",
  rose: "bg-rose-100 text-rose-700",
  redDeep: "bg-red-100 text-red-800",
  roseDeep: "bg-rose-50 text-rose-800",
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
    href: "/auction-sheet-analyzer",
    title: "Auction Sheet Analyzer",
    description: "Upload an auction sheet photo to get a detailed English explanation of grade, equipment, and condition.",
    icon: "📋",
    color: "red",
  },
  {
    href: "/documents-checklist",
    title: "Documents Checklist",
    description: "Track documents needed for customs clearance, temporary VAT, and RMV registration.",
    icon: "✅",
    color: "rose",
  },
  {
    href: "/tax-payment-instructions",
    title: "Tax Payment Instructions",
    description: "Step-by-step guide to paying a Sri Lanka Customs assessment through the BOC Flex App.",
    icon: "💳",
    color: "redDeep",
  },
  {
    href: "/roro-schedule",
    title: "RO-RO Shipping Schedule",
    description: "Upcoming RO-RO sailings from Japan to Hambantota, with departure ports and cutoff dates.",
    icon: "🚢",
    color: "rose",
  },
  {
    href: "/customs-exchange-rate",
    title: "Customs Exchange Rate (JPY)",
    description: "This week's official JPY rate, extracted from Sri Lanka Customs' latest rates PDF.",
    icon: "💴",
    color: "redDeep",
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

type BadgeColor = "red" | "rose" | "redDeep" | "roseDeep" | "redLight";

const BADGE_STYLES: Record<BadgeColor, string> = {
  red: "bg-red-50 text-red-700",
  rose: "bg-rose-100 text-rose-700",
  redDeep: "bg-red-100 text-red-800",
  roseDeep: "bg-rose-50 text-rose-800",
  redLight: "bg-red-200 text-red-900",
};

const RESOURCES: { title: string; url: string; description: string; icon: string; color: BadgeColor }[] = [
  {
    title: "Japan Auction (JP Center)",
    url: "https://jpcenter.ru/",
    description: "Japan vehicle auction search/listings",
    icon: "🔨",
    color: "red",
  },
  {
    title: "Vehicle Shipping Schedules",
    url: "https://autocj.co.jp/japan_shipping?dest=8",
    description: "AutoCJ shipping schedule to Sri Lanka",
    icon: "🚢",
    color: "rose",
  },
  {
    title: "Bank of Ceylon Exchange Rates",
    url: "https://www.boc.lk/rates-tariff",
    description: "BOC daily exchange rates and tariffs",
    icon: "🏦",
    color: "redDeep",
  },
  {
    title: "Sri Lanka Customs Exchange Rates",
    url: "https://www.customs.gov.lk/exchange-rates/",
    description: "Official customs exchange rates for duty calculation",
    icon: "🏛️",
    color: "roseDeep",
  },
  {
    title: "Vehicle History Check",
    url: "https://japanstat.com/en",
    description: "Japan vehicle history and export certificate lookup",
    icon: "📜",
    color: "redLight",
  },
];

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <div className="border-l-4 border-red-700 pl-3">
        <h1 className="text-lg font-semibold text-gray-900">Resources</h1>
        <p className="mt-1 text-sm text-gray-500">Useful external links for sourcing, shipping, and rates.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {RESOURCES.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-red-400"
          >
            <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg text-xl ${BADGE_STYLES[r.color]}`}>
              {r.icon}
            </span>
            <span className="min-w-0">
              <p className="font-medium text-gray-900">{r.title}</p>
              <p className="mt-1 text-sm text-gray-500">{r.description}</p>
              <p className="mt-2 truncate text-xs text-gray-400">{r.url}</p>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

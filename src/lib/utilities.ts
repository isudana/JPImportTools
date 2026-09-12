export type BadgeColor = "red" | "rose" | "redDeep" | "roseDeep";

export const BADGE_STYLES: Record<BadgeColor, string> = {
  red: "bg-red-50 text-red-700",
  rose: "bg-rose-100 text-rose-700",
  redDeep: "bg-red-100 text-red-800",
  roseDeep: "bg-rose-50 text-rose-800",
};

export type UtilityEntry = {
  href: string;
  title: string;
  description: string;
  icon: string;
  color: BadgeColor;
  adminOnly?: boolean;
};

export const UTILITIES: UtilityEntry[] = [
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
    adminOnly: true,
  },
  {
    href: "/clearance-checklist",
    title: "Clearance Checklist",
    description: "Track documents needed for Temporary VAT and Customs Clearance.",
    icon: "✅",
    color: "rose",
  },
  {
    href: "/rmv-registration-checklist",
    title: "RMV Registration Checklist",
    description: "Track documents needed for RMV Registration.",
    icon: "🪪",
    color: "roseDeep",
  },
  {
    href: "/letter-generator",
    title: "Letter Generator",
    description: "Fill in your details once to generate the mobile confirmation and personal-use letters together.",
    icon: "✏️",
    color: "red",
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

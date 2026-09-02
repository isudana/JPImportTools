export type GradeSearchSite = { make: string; url: string; logo: string };

export const GRADE_SEARCH_SITES: GradeSearchSite[] = [
  { make: "Toyota", url: "https://www.toyota.co.jp/grade/dc/top", logo: "/logos/toyota.png" },
  {
    make: "Honda",
    url: "https://grade.customer.honda.co.jp/apps/grade/hccg0010201/search",
    logo: "/logos/honda.png",
  },
  { make: "Mazda", url: "https://support.mazda.co.jp/grade-search/search.html", logo: "/logos/mazda.jpeg" },
  { make: "Suzuki", url: "https://sgre.suzuki.co.jp/SearchGrade", logo: "/logos/suzuki.jpeg" },
  {
    make: "Mitsubishi",
    url: "https://inquiry.mitsubishi-motors.co.jp/reference/GradeSearch.do",
    logo: "/logos/mitsubishi.jpeg",
  },
  { make: "Nissan", url: "https://grade-search.nissan.co.jp/GRADE/search.html", logo: "/logos/nissan.jpeg" },
];

export function matchGradeSearchSites(makes: string | null): GradeSearchSite[] {
  if (!makes) return [];
  const wanted = makes.split(",").map((m) => m.trim().toLowerCase());
  return GRADE_SEARCH_SITES.filter((site) => wanted.includes(site.make.toLowerCase()));
}

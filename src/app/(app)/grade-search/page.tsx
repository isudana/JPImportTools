import Image from "next/image";
import { GRADE_SEARCH_SITES } from "@/lib/gradeSearchSites";

export default function GradeSearchPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="border-l-4 border-red-700 pl-3">
        <h1 className="text-lg font-semibold text-gray-900">Grade Search</h1>
        <p className="mt-1 text-sm text-gray-500">
          Official manufacturer portals for checking a vehicle&apos;s grade/trim from its chassis
          number. Pick the make below and look it up on the manufacturer&apos;s own site.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {GRADE_SEARCH_SITES.map((site) => (
          <a
            key={site.make}
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-red-400"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-16 flex-none items-center justify-center overflow-hidden rounded-md bg-white">
                <Image src={site.logo} alt={`${site.make} logo`} width={64} height={40} className="h-full w-full object-contain" />
              </span>
              <span className="font-medium text-gray-900">{site.make}</span>
            </span>
            <span className="text-sm text-gray-400">Open ↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

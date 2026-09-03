const FORM_FIELDS: { field: string; value: string }[] = [
  { field: "Office Code", value: "As per the Assessment notice (usually HBIM1 for Hambantota)" },
  { field: "Year", value: "As per the Assessment notice (usually 2026)" },
  { field: "Serial", value: "As per the Assessment notice (usually I)" },
  { field: "Registration Number", value: "As per the Assessment notice" },
  { field: "Company Code", value: "Your Temporary VAT Number (without hyphens)" },
  { field: "Amount", value: "As per the Assessment notice" },
];

export default function TaxPaymentInstructionsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="border-l-4 border-red-700 pl-3">
        <h1 className="text-lg font-semibold text-gray-900">Customs Tax Payment (BOC Flex App)</h1>
        <p className="mt-1 text-sm text-gray-500">
          Steps to pay a Sri Lanka Customs assessment through the BOC Flex App.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Steps</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
          <li>Open the BOC Flex App.</li>
          <li>
            Go to <span className="font-medium text-gray-900">Easy Actions → Bill Payments → New Bill</span>.
          </li>
          <li>
            Select <span className="font-medium text-gray-900">Sri Lanka Customs</span> as the Biller.
          </li>
          <li>Check the Assessment notice and fill in the form as below.</li>
        </ol>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-200 text-left text-xs text-gray-400">
            <tr>
              <th className="px-4 py-2">Field</th>
              <th className="px-4 py-2">Value to Enter</th>
            </tr>
          </thead>
          <tbody>
            {FORM_FIELDS.map((row) => (
              <tr key={row.field} className="border-b border-gray-100 text-gray-600 last:border-0">
                <td className="px-4 py-2 font-medium text-gray-900">{row.field}</td>
                <td className="px-4 py-2">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">
          Pay the exact amount shown on the Assessment notice — even a small change can cause processing
          issues.
        </p>
      </div>
    </div>
  );
}

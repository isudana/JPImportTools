import ChecklistView, { type ChecklistSection } from "@/components/ChecklistView";

const SECTIONS: ChecklistSection[] = [
  {
    id: "rmv-registration",
    title: "RMV Registration",
    items: [
      { id: "mta2", label: "MTA-2", links: [{ label: "Form", url: "https://dmt.gov.lk/images/PDF/Downloads/Forms/mta2_1.pdf" }] },
      {
        id: "affidavit",
        label: "Affidavit",
        links: [{ label: "Template", url: "https://drive.google.com/file/d/1404_rNb62DL8lQo5JG5bKDJZN4O2TorK/view?usp=drive_link" }],
      },
      { id: "rmv-tin", label: "TIN" },
      { id: "nic-dl-copy", label: "Photocopy of NIC/driving license" },
      { id: "photos", label: "02 passport-size certified photographs of the applicant" },
      {
        id: "import-docs",
        label: "Import Docs",
        children: [
          { id: "export-certificate", label: "Export certificate" },
          { id: "export-certificate-translation", label: "English Translation of the export certificate" },
          { id: "inspection-certificate", label: "Inspection certificate (JAAI/JEVIC)" },
          { id: "odo-certificate", label: "ODO Meter certificate", notRequired: true },
          { id: "environment-certificate", label: "Environment certificate", notRequired: true },
          { id: "customs-assessment-notice", label: "Customs Assessment Notice" },
          { id: "customs-53", label: "Customs-53" },
        ],
      },
    ],
  },
];

export default function RmvRegistrationChecklistPage() {
  return (
    <ChecklistView
      title="RMV Registration Checklist"
      description="Track the documents needed for RMV Registration. Ticks are saved on this device only."
      storageKey="rmv-registration-checklist-v1"
      sections={SECTIONS}
    />
  );
}

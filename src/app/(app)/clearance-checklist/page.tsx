import ChecklistView, { type ChecklistSection } from "@/components/ChecklistView";

const SECTIONS: ChecklistSection[] = [
  {
    id: "customs-clearance",
    title: "Customs Clearance (Scanned Copies)",
    items: [
      { id: "photo", label: "Photo (Passport size)" },
      { id: "specimen-signature", label: "Specimen Signature", note: "Sign on a white A4 sheet" },
      { id: "tin", label: "TIN" },
      { id: "temp-vat", label: "Temporary VAT", note: "Obtain from IRD after we get the BL" },
      { id: "nic-both-sides", label: "NIC both sides" },
      {
        id: "mobile-confirmation",
        label: "Mobile confirmation letter",
        links: [
          {
            label: "Mobitel",
            url: "https://docs.google.com/document/d/10gbwS_7ozDKGGHinCouf_vrfG_8cgxH1Tv6T31ayodI/edit?usp=sharing",
          },
          {
            label: "Dialog",
            url: "https://docs.google.com/document/d/14gIc_SHojJMAVfSniH-i4iHzTeFOLghp37zTxcWGnyA/edit?usp=sharing",
          },
          { label: "Generate ✏️", url: "/letter-generator?template=mobitel" },
        ],
      },
      {
        id: "gs1-form",
        label: "GS-I form",
        note: "Only if NIC address is different from TIN address",
        links: [{ label: "Form", url: "https://www.customs.gov.lk/wp-content/uploads/2021/06/GS_FORM_01.pdf" }],
      },
    ],
  },
  {
    id: "temporary-vat",
    title: "Temporary VAT (Scanned Copies)",
    items: [
      { id: "bl", label: "BL", note: "Exporter will provide this" },
      { id: "commercial-invoice", label: "Commercial invoice", note: "Exporter will provide this" },
      { id: "lc", label: "LC" },
      { id: "id", label: "ID" },
      {
        id: "vat-form",
        label: "Form",
        links: [{ label: "Form", url: "https://drive.google.com/file/d/1tAtXcJ0Nlqc5sh3QqyJ-7PHKobS5DAz4/view?usp=drive_link" }],
      },
      {
        id: "letter-personal-use",
        label: "Letter of personal use",
        links: [
          {
            label: "Template",
            url: "https://docs.google.com/document/d/102sigDokij1tO7FX5gMgsjtJZ01rXbIa9SR6wv4wLUQ/edit?usp=drive_link",
          },
          { label: "Generate ✏️", url: "/letter-generator?template=personal-use" },
        ],
      },
      { id: "vat-tin", label: "TIN" },
    ],
  },
];

export default function ClearanceChecklistPage() {
  return (
    <ChecklistView
      title="Clearance Checklist"
      description="Track the documents needed for Temporary VAT and Customs Clearance. Ticks are saved on this device only."
      storageKey="clearance-checklist-v1"
      sections={SECTIONS}
    />
  );
}

export type ExternalSystem = {
  name: string;
  description: string;
  url: string | null;
};

export function getExternalSystems(): ExternalSystem[] {
  return [
    {
      name: "IAMS",
      description:
        "IT Asset Management System: manage assets, licenses, and expense records.",
      url: process.env.IAMS_BASE_URL ?? null,
    },
  ];
}

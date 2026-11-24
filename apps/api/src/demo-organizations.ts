// Fictional demo organizations. Fixed ids so the seed can upsert and the API can map a role to an organization.
// Until there is real sign-in, the web app's role switcher picks which of these is acting.
export const demoOrganizations = {
  supplier: { id: "00000000-0000-4000-8000-000000000001", name: "Gampaha Packaging", role: "SUPPLIER" },
  buyer: { id: "00000000-0000-4000-8000-000000000002", name: "Market Buyer", role: "BUYER" },
  "lender-a": { id: "00000000-0000-4000-8000-000000000003", name: "Lender A", role: "LENDER" },
  "lender-b": { id: "00000000-0000-4000-8000-000000000004", name: "Lender B", role: "LENDER" },
} as const;

export type DemoRole = keyof typeof demoOrganizations;

export function isDemoRole(value: unknown): value is DemoRole {
  return typeof value === "string" && Object.hasOwn(demoOrganizations, value);
}

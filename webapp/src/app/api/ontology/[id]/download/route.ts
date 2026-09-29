import { backendRoute } from "@/app/lib/backend";

export const GET = backendRoute(({ id }) => `/ontology/${encodeURIComponent(id)}/download`);

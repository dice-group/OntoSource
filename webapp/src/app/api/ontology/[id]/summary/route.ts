import { backendRoute } from "@/app/lib/backend";

export const GET = backendRoute((params) => `/ontology/${encodeURIComponent(params.id)}/summary`);

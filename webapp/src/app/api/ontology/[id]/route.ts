import { backendRoute } from "@/app/lib/backend";

export const DELETE = backendRoute((params) => `/ontology/${encodeURIComponent(params.id)}`);

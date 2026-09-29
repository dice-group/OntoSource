import { backendRoute } from "@/app/lib/backend";

export const GET = backendRoute((params) => `/generate/generate_ontology/status/${encodeURIComponent(params.job_id)}`);

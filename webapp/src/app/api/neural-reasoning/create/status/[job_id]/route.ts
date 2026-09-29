import { backendRoute } from "@/app/lib/backend";

export const GET = backendRoute((params) => `/neural-reasoning/create/status/${encodeURIComponent(params.job_id)}`);

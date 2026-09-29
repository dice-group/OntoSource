import { backendRoute } from "@/app/lib/backend";

export const POST = backendRoute((params) => `/neural-reasoning/${encodeURIComponent(params.id)}/instances`);

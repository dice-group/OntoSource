import { backendRoute } from "@/app/lib/backend";

export const DELETE = backendRoute((params) => `/neural-reasoning/${encodeURIComponent(params.id)}`);

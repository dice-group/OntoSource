import { backendRoute } from "@/app/lib/backend";

export const POST = backendRoute((params) => `/reasoning/${encodeURIComponent(params.id)}/sub-classes`);

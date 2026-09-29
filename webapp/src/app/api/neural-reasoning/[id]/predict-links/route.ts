import { backendRoute } from "@/app/lib/backend";

export const POST = backendRoute(({ id }) => `/neural-reasoning/${encodeURIComponent(id)}/predict-links`);

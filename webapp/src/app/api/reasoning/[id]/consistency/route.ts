import { backendRoute } from "@/app/lib/backend";

export const POST = backendRoute(({ id }) => `/reasoning/${encodeURIComponent(id)}/consistency`);

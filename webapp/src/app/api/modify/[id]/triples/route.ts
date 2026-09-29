import { backendRoute } from "@/app/lib/backend";

const handler = backendRoute(
  (params) => `/modify/${encodeURIComponent(params.id)}/triples`,
);
export { handler as POST, handler as PATCH, handler as DELETE };

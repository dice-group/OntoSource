import { backendRoute } from "@/app/lib/backend";

export const POST = backendRoute((params) => `/modify/${encodeURIComponent(params.id)}/object-property-assertion`);

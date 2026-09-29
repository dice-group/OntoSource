import { backendRoute } from "@/app/lib/backend";

export const DELETE = backendRoute((params) => `/modify/${encodeURIComponent(params.id)}/axiom`);

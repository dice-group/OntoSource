"use client";
import OntologyManager from "./components/viszualisation/OntologyManager";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function Home() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <div className=" bg-gray-50">
        <OntologyManager />
      </div>
    </QueryClientProvider>
  );
}

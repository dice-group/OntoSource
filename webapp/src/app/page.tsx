"use client";
import OntologyManager from "./components/viszualisation/OntologyManager";
import Header from "./components/Header";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function Home() {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <OntologyManager />
      </div>
    </QueryClientProvider>
  );
}

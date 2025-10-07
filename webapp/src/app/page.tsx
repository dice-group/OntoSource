'use client'
import OntologyManager from './components/OntologyManager'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function Home() {
  const queryClient = new QueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      <OntologyManager />
    </QueryClientProvider>
  )
}

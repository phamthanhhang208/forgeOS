import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { Dashboard } from './pages/Dashboard'
import { Studio } from './pages/Studio'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

const isDemoMode =
  new URLSearchParams(window.location.search).get('demo') === 'true'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {isDemoMode && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-accent-warning/15 border-b border-accent-warning/30 px-4 py-1.5 text-center">
            <span className="text-accent-warning font-mono text-[11px] font-semibold tracking-wide">
              DEMO MODE — All AI calls are pre-cached. No external APIs used.
            </span>
          </div>
        )}
        <div className={isDemoMode ? 'pt-8' : ''}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/studio/:projectId" element={<Studio />} />
          </Routes>
        </div>
      </Router>
      <Toaster theme="dark" position="bottom-right" />
    </QueryClientProvider>
  )
}

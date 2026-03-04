import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Dashboard } from './pages/Dashboard';
import { Studio } from './pages/Studio';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
        },
    },
});
const isDemoMode = new URLSearchParams(window.location.search).get('demo') === 'true';
export default function App() {
    return (_jsxs(QueryClientProvider, { client: queryClient, children: [_jsxs(Router, { children: [isDemoMode && (_jsx("div", { className: "fixed top-0 left-0 right-0 z-[100] bg-accent-warning/15 border-b border-accent-warning/30 px-4 py-1.5 text-center", children: _jsx("span", { className: "text-accent-warning font-mono text-[11px] font-semibold tracking-wide", children: "DEMO MODE \u2014 All AI calls are pre-cached. No external APIs used." }) })), _jsx("div", { className: isDemoMode ? 'pt-8' : '', children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Dashboard, {}) }), _jsx(Route, { path: "/studio/:projectId", element: _jsx(Studio, {}) })] }) })] }), _jsx(Toaster, { theme: "dark", position: "bottom-right" })] }));
}

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, RefreshCw, X, Code2, LayoutTemplate, Loader2 } from 'lucide-react';
import { usePipelineStore } from '../../store/pipeline.store';
import { NODE_LABELS, MAX_REGENERATIONS } from '@forgeos/shared';
import { toast } from 'sonner';
import { api } from '../../lib/api';
// Human-readable key labels
const KEY_LABELS = {
    targetAudience: 'Target Audience',
    audienceSegments: 'Audience Segments',
    mvpFeatures: 'Product Features',
    monetizationStrategy: 'Monetization Strategy',
    pricingTiers: 'Pricing Tiers',
    marketDifferentiators: 'Why We Win',
    competitorLandscape: 'Competitive Landscape',
    riskFactors: 'Key Risks',
    successMetrics: 'Success Metrics',
    userPersonas: 'User Personas',
    coreUserStories: 'User Stories',
    dataEntities: 'Data Models',
    integrations: 'Integrations',
    techStack: 'Tech Stack',
    prismaSchemaDelta: 'Database Schema',
    phase1Features: 'Phase 1 — Launch Scope',
    phase2Features: 'Phase 2 — Post-Launch',
    apiEndpoints: 'API Endpoints',
    envVarsRequired: 'Environment Variables',
    frontend: 'Frontend',
    backend: 'Backend',
    database: 'Database',
    infrastructure: 'Infrastructure',
    name: 'Name',
    role: 'Role',
    painPoints: 'Pain Points',
    goals: 'Goals',
    price: 'Price',
    description: 'Description',
    rationale: 'Why',
    asA: 'As a',
    iWantTo: 'I want to',
    soThat: 'So that',
    acceptanceCriteria: 'Done when',
    fields: 'Fields',
    relations: 'Relationships',
    feature: 'Feature',
    estimatedDays: 'Est. Days',
    method: 'Method',
    path: 'Endpoint',
    priority: 'Priority',
};
const PRIORITY_STYLES = {
    MUST: 'bg-accent-success/15 text-accent-success border border-accent-success/30',
    SHOULD: 'bg-accent-warning/15 text-accent-warning border border-accent-warning/30',
    COULD: 'bg-border/60 text-text-muted border border-border',
};
const PRIORITY_LABELS = {
    MUST: 'Must Have',
    SHOULD: 'Should Have',
    COULD: 'Nice to Have',
};
const HTTP_METHOD_STYLES = {
    GET: 'bg-accent-primary/15 text-accent-primary',
    POST: 'bg-accent-success/15 text-accent-success',
    PUT: 'bg-accent-warning/15 text-accent-warning',
    PATCH: 'bg-accent-warning/15 text-accent-warning',
    DELETE: 'bg-accent-danger/15 text-accent-danger',
};
function formatKey(key) {
    return KEY_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
}
// Special renderer for a feature card (mvpFeatures items)
const FeatureCard = ({ item }) => {
    const priority = item.priority ?? '';
    return (_jsxs("div", { className: "bg-bg-elevated rounded-lg p-3 flex flex-col gap-1.5 border border-border/40", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsx("span", { className: "font-semibold text-[13px] text-text-primary leading-snug", children: item.name }), priority && (_jsx("span", { className: `text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${PRIORITY_STYLES[priority] ?? ''}`, children: PRIORITY_LABELS[priority] ?? priority }))] }), item.rationale && (_jsx("p", { className: "text-[12px] text-text-muted leading-relaxed", children: item.rationale }))] }));
};
// Special renderer for pricing tier cards
const PricingCard = ({ item }) => (_jsxs("div", { className: "bg-bg-elevated rounded-lg p-3 border border-border/40 flex flex-col gap-1", children: [_jsxs("div", { className: "flex items-baseline justify-between", children: [_jsx("span", { className: "font-bold text-text-primary text-[14px]", children: item.name }), _jsx("span", { className: "font-mono font-bold text-accent-primary text-[13px]", children: item.price })] }), item.description && _jsx("p", { className: "text-[12px] text-text-muted leading-relaxed", children: item.description })] }));
// Special renderer for persona cards
const PersonaCard = ({ item }) => (_jsxs("div", { className: "bg-bg-elevated rounded-lg p-3 border border-border/40 flex flex-col gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "font-bold text-text-primary text-[13px]", children: item.name }), _jsx("p", { className: "text-[11px] text-text-muted mt-0.5", children: item.role })] }), item.painPoints?.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-[11px] font-semibold text-accent-danger/80 uppercase tracking-wide mb-1", children: "Pain Points" }), _jsx("ul", { className: "flex flex-col gap-0.5", children: item.painPoints.map((p, i) => (_jsxs("li", { className: "text-[12px] text-text-primary/80 flex gap-1.5", children: [_jsx("span", { className: "text-accent-danger/60 shrink-0", children: "\u2022" }), p] }, i))) })] })), item.goals?.length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-[11px] font-semibold text-accent-success/80 uppercase tracking-wide mb-1", children: "Goals" }), _jsx("ul", { className: "flex flex-col gap-0.5", children: item.goals.map((g, i) => (_jsxs("li", { className: "text-[12px] text-text-primary/80 flex gap-1.5", children: [_jsx("span", { className: "text-accent-success/60 shrink-0", children: "\u2022" }), g] }, i))) })] }))] }));
// Special renderer for user story cards
const StoryCard = ({ item }) => (_jsxs("div", { className: "bg-bg-elevated rounded-lg p-3 border border-border/40 flex flex-col gap-1.5", children: [_jsxs("p", { className: "text-[13px] text-text-primary leading-relaxed", children: [_jsx("span", { className: "text-text-muted", children: "As a " }), _jsx("span", { className: "font-semibold", children: item.asA }), _jsx("span", { className: "text-text-muted", children: ", I want to " }), _jsx("span", { className: "font-medium", children: item.iWantTo }), _jsx("span", { className: "text-text-muted", children: " so that " }), _jsx("span", { className: "font-medium", children: item.soThat }), "."] }), item.acceptanceCriteria?.length > 0 && (_jsx("div", { className: "mt-1 pl-2 border-l-2 border-accent-primary/30", children: item.acceptanceCriteria.map((c, i) => (_jsxs("p", { className: "text-[11px] text-text-muted", children: ["\u2713 ", c] }, i))) }))] }));
// Special renderer for data entity cards
const DataEntityCard = ({ item }) => (_jsxs("div", { className: "bg-bg-elevated rounded-lg border border-border/40 overflow-hidden", children: [_jsxs("div", { className: "px-3 py-2 bg-bg-base/60 border-b border-border/40 flex items-center gap-2", children: [_jsx("span", { className: "font-bold text-text-primary text-[13px] font-mono", children: item.name }), item.fields?.length > 0 && (_jsxs("span", { className: "text-[10px] text-text-muted font-mono ml-auto", children: [item.fields.length, " fields"] }))] }), item.fields?.length > 0 && (_jsx("div", { className: "px-3 py-2", children: _jsx("table", { className: "w-full", children: _jsx("tbody", { children: item.fields.map((f, i) => (_jsxs("tr", { className: "border-b border-border/20 last:border-0", children: [_jsx("td", { className: "py-1 pr-3 font-mono text-[12px] text-text-primary/90", children: f.name }), _jsx("td", { className: "py-1", children: _jsx("span", { className: "text-[11px] font-mono bg-accent-primary/10 text-accent-primary border border-accent-primary/20 px-1.5 py-0.5 rounded", children: f.type }) })] }, i))) }) }) })), item.relations?.length > 0 && (_jsx("div", { className: "px-3 pb-2 border-t border-border/20 pt-1.5 flex flex-col gap-0.5", children: item.relations.map((r, i) => (_jsxs("p", { className: "text-[11px] text-text-muted flex gap-1.5 items-start", children: [_jsx("span", { className: "text-accent-secondary/60 shrink-0", children: "\u2194" }), r] }, i))) }))] }));
// Special renderer for API endpoint rows
const EndpointRow = ({ item }) => (_jsxs("div", { className: "flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0", children: [_jsx("span", { className: `text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${HTTP_METHOD_STYLES[item.method] ?? 'bg-border text-text-muted'}`, children: item.method }), _jsxs("div", { className: "flex flex-col gap-0.5", children: [_jsx("code", { className: "text-[12px] text-accent-primary font-mono", children: item.path }), _jsx("p", { className: "text-[11px] text-text-muted", children: item.description })] })] }));
// Recursive component to render JSON nicely for non-technical users
const JsonViewer = ({ data, depth = 0, parentKey = '' }) => {
    if (data === null)
        return _jsx("span", { className: "text-text-muted italic text-[12px]", children: "\u2014" });
    if (typeof data === 'boolean')
        return _jsx("span", { className: "text-accent-warning font-mono text-[13px]", children: data ? 'Yes' : 'No' });
    if (typeof data === 'number') {
        if (parentKey === 'estimatedDays')
            return _jsxs("span", { className: "text-accent-primary font-mono text-[13px]", children: [data, " day", data !== 1 ? 's' : ''] });
        return _jsx("span", { className: "text-accent-primary font-mono text-[13px]", children: data });
    }
    if (typeof data === 'string') {
        // Priority badge
        if (parentKey === 'priority' && PRIORITY_STYLES[data]) {
            return (_jsx("span", { className: `text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[data]}`, children: PRIORITY_LABELS[data] ?? data }));
        }
        // HTTP method badge
        if (parentKey === 'method') {
            return (_jsx("span", { className: `text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${HTTP_METHOD_STYLES[data] ?? 'bg-border text-text-muted'}`, children: data }));
        }
        // Code path
        if (parentKey === 'path')
            return _jsx("code", { className: "text-[12px] text-accent-primary font-mono", children: data });
        // Prisma schema — show as code block
        if (parentKey === 'prismaSchemaDelta') {
            return (_jsx("pre", { className: "text-[11px] text-text-primary/80 bg-bg-base rounded-md p-3 overflow-x-auto font-mono leading-relaxed border border-border/40", children: data }));
        }
        if (data.length > 100)
            return _jsx("p", { className: "text-text-primary/90 leading-relaxed text-[13px] whitespace-pre-wrap", children: data });
        return _jsx("span", { className: "text-text-primary/90 text-[13px]", children: data });
    }
    if (Array.isArray(data)) {
        if (data.length === 0)
            return _jsx("span", { className: "text-text-muted italic text-[12px]", children: "None" });
        // Feature cards for mvpFeatures
        if (parentKey === 'mvpFeatures') {
            return (_jsx("div", { className: "flex flex-col gap-2 mt-1", children: data.map((item, i) => _jsx(FeatureCard, { item: item }, i)) }));
        }
        // Pricing tier cards
        if (parentKey === 'pricingTiers') {
            return (_jsx("div", { className: "flex flex-col gap-2 mt-1", children: data.map((item, i) => _jsx(PricingCard, { item: item }, i)) }));
        }
        // Persona cards
        if (parentKey === 'userPersonas') {
            return (_jsx("div", { className: "flex flex-col gap-2 mt-1", children: data.map((item, i) => _jsx(PersonaCard, { item: item }, i)) }));
        }
        // User story cards
        if (parentKey === 'coreUserStories') {
            return (_jsx("div", { className: "flex flex-col gap-2 mt-1", children: data.map((item, i) => _jsx(StoryCard, { item: item }, i)) }));
        }
        // Data entity cards
        if (parentKey === 'dataEntities') {
            return (_jsx("div", { className: "flex flex-col gap-2 mt-1", children: data.map((item, i) => _jsx(DataEntityCard, { item: item }, i)) }));
        }
        // API endpoints
        if (parentKey === 'apiEndpoints') {
            return (_jsx("div", { className: "flex flex-col mt-1 bg-bg-elevated rounded-lg border border-border/40 px-3 py-1", children: data.map((item, i) => _jsx(EndpointRow, { item: item }, i)) }));
        }
        // Phase features
        if (parentKey === 'phase1Features' || parentKey === 'phase2Features') {
            return (_jsx("div", { className: "flex flex-col gap-1.5 mt-1", children: data.map((item, i) => (_jsxs("div", { className: "flex items-baseline justify-between gap-2 py-1.5 border-b border-border/30 last:border-0", children: [_jsx("span", { className: "text-[13px] text-text-primary/90", children: item.feature }), _jsxs("span", { className: "text-[11px] text-text-muted shrink-0 font-mono", children: [item.estimatedDays, "d"] })] }, i))) }));
        }
        // Simple string/number arrays → pill tags or bullet list
        if (data.every((item) => typeof item !== 'object')) {
            // Integration tags
            if (parentKey === 'integrations' || parentKey === 'envVarsRequired') {
                return (_jsx("div", { className: "flex flex-wrap gap-1.5 mt-1", children: data.map((item, i) => (_jsx("span", { className: "text-[11px] font-mono bg-bg-elevated border border-border/60 text-text-primary/80 px-2 py-0.5 rounded-md", children: item }, i))) }));
            }
            return (_jsx("ul", { className: "flex flex-col gap-1.5 mt-1", children: data.map((item, i) => (_jsxs("li", { className: "text-[13px] text-text-primary/90 flex gap-2", children: [_jsx("span", { className: "text-accent-primary/50 shrink-0 mt-[3px]", children: "\u203A" }), _jsx(JsonViewer, { data: item, depth: depth + 1, parentKey: parentKey })] }, i))) }));
        }
        // Generic object array
        return (_jsx("div", { className: "flex flex-col gap-3 mt-1", children: data.map((item, i) => (_jsx("div", { className: `pt-2 ${i > 0 ? 'border-t border-border/40' : ''}`, children: _jsx(JsonViewer, { data: item, depth: depth + 1, parentKey: parentKey }) }, i))) }));
    }
    if (typeof data === 'object') {
        const entries = Object.entries(data);
        if (entries.length === 0)
            return _jsx("span", { className: "text-text-muted italic text-[12px]", children: "\u2014" });
        // Tech stack — render as category groups inline
        if (parentKey === 'techStack') {
            return (_jsx("div", { className: "grid grid-cols-1 gap-2 mt-1", children: entries.map(([key, value]) => (_jsxs("div", { className: "bg-bg-elevated rounded-lg p-2.5 border border-border/40", children: [_jsx("p", { className: "text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5", children: formatKey(key) }), _jsx("div", { className: "flex flex-wrap gap-1", children: value.map((v, i) => (_jsx("span", { className: "text-[11px] bg-bg-base border border-border/60 text-text-primary/80 px-2 py-0.5 rounded-md font-mono", children: v }, i))) })] }, key))) }));
        }
        return (_jsx("div", { className: "flex flex-col gap-2", children: entries.map(([key, value]) => {
                const label = formatKey(key);
                const isComplex = typeof value === 'object' && value !== null;
                const isTopLevel = depth === 0;
                return (_jsxs("div", { className: isTopLevel ? 'flex flex-col gap-1.5 pb-4 border-b border-border/30 last:border-0' : `flex ${isComplex ? 'flex-col gap-1' : 'gap-2 items-baseline'}`, children: [_jsx("span", { className: `font-semibold shrink-0 ${isTopLevel
                                ? 'text-[11px] font-bold uppercase tracking-widest text-text-muted'
                                : 'text-[12px] text-text-muted'}`, children: label }), _jsx("div", { children: _jsx(JsonViewer, { data: value, depth: depth + 1, parentKey: key }) })] }, key));
            }) }));
    }
    return null;
};
export function HITLPanel() {
    const activePanel = usePipelineStore((s) => s.activePanel);
    const nodes = usePipelineStore((s) => s.nodes);
    const projectId = usePipelineStore((s) => s.projectId);
    const closePanel = usePipelineStore((s) => s.closePanel);
    const approveNode = usePipelineStore((s) => s.approveNode);
    const rejectNode = usePipelineStore((s) => s.rejectNode);
    const handleSSEEvent = usePipelineStore((s) => s.handleSSEEvent);
    const [jsonText, setJsonText] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState('markdown');
    const [isFetchingPayload, setIsFetchingPayload] = useState(false);
    const activeNodeState = activePanel !== null ? nodes.find((n) => n.id === activePanel) : null;
    // When panel opens, sync jsonText from payload
    useEffect(() => {
        if (activeNodeState) {
            setJsonText(activeNodeState.payload
                ? JSON.stringify(activeNodeState.payload, null, 2)
                : '');
            setFeedback('');
        }
    }, [activeNodeState?.id, activeNodeState?.payload]);
    // Fallback: if panel opens and payload is null, fetch from API
    useEffect(() => {
        if (!activeNodeState || activeNodeState.payload || !projectId)
            return;
        let cancelled = false;
        setIsFetchingPayload(true);
        api.getProject(projectId).then((project) => {
            if (cancelled)
                return;
            const outputs = project.agentOutputs;
            if (!outputs)
                return;
            // Find the best output for this node (latest version)
            let best = null;
            for (const o of outputs) {
                if (o.nodeId === activeNodeState.id) {
                    if (!best || o.version > best.version)
                        best = o;
                }
            }
            if (best?.jsonPayload && typeof best.jsonPayload === 'object' && Object.keys(best.jsonPayload).length > 0) {
                // Inject payload into the store via handleSSEEvent
                handleSSEEvent({
                    type: 'NODE_PAYLOAD',
                    nodeId: best.nodeId,
                    version: best.version,
                    payload: best.jsonPayload,
                });
            }
        }).catch((err) => {
            console.error('[HITLPanel] Failed to fetch payload fallback:', err);
        }).finally(() => {
            if (!cancelled)
                setIsFetchingPayload(false);
        });
        return () => { cancelled = true; };
    }, [activeNodeState?.id, activeNodeState?.payload, projectId, handleSSEEvent]);
    // Check parsing validity to disable 'Approve'
    let isValidJson = true;
    let parsedPayload = null;
    try {
        parsedPayload = JSON.parse(jsonText === '' ? '{}' : jsonText);
    }
    catch {
        isValidJson = false;
    }
    const handleApprove = async () => {
        if (!isValidJson || !parsedPayload || !activeNodeState)
            return;
        setIsSubmitting(true);
        try {
            await approveNode(activeNodeState.id, parsedPayload);
            toast.success('Approved!', {
                description: `Node ${activeNodeState.id} advanced to next step.`,
            });
        }
        catch (e) {
            toast.error('Failed to approve', { description: e.message });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleReject = async () => {
        if (!feedback.trim() || !activeNodeState)
            return;
        setIsSubmitting(true);
        try {
            await rejectNode(activeNodeState.id, feedback);
            toast.success('Rejected - Regenerating', {
                description: `Feedback sent to agent.`,
            });
        }
        catch (e) {
            toast.error('Failed to reject', { description: e.message });
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const isOpen = activePanel !== null && activeNodeState !== null && activeNodeState !== undefined;
    const label = activeNodeState
        ? NODE_LABELS[activeNodeState.id]
        : '';
    const isApproved = activeNodeState?.status === 'APPROVED';
    return (_jsx(AnimatePresence, { children: isOpen && (_jsxs(_Fragment, { children: [_jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.2 }, className: "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm", onClick: closePanel }, "backdrop"), _jsxs(motion.div, { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' }, transition: { type: 'spring', damping: 30, stiffness: 300 }, className: "fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-bg-surface border-l border-border shadow-2xl flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-border bg-bg-elevated/50", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold font-mono tracking-tight text-text-primary", children: label }), _jsxs("div", { className: "text-sm font-mono text-text-muted mt-1", children: ["v", activeNodeState.version, " of ", MAX_REGENERATIONS, ' ', isApproved && (_jsx("span", { className: "text-accent-success ml-2", children: "(Approved)" }))] })] }), _jsx("button", { onClick: closePanel, className: "p-2 text-text-muted hover:text-text-primary hover:bg-white/10 rounded-full transition-colors", children: _jsx(X, { size: 20 }) })] }), _jsxs("div", { className: "flex-1 overflow-auto flex flex-col p-4 gap-4", children: [!isValidJson && (_jsx("div", { className: "bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm font-semibold px-3 py-2 rounded-md", children: "Invalid JSON \u2014 fix before approving" })), _jsxs("div", { className: "flex flex-col flex-1 border border-border rounded-lg overflow-hidden shrink-0 min-h-[400px]", children: [_jsxs("div", { className: "bg-bg-elevated px-3 py-1.5 text-xs font-mono text-text-muted border-b border-border flex justify-between items-center", children: [_jsxs("div", { className: "flex bg-bg-surface rounded-md p-0.5 border border-border/50", children: [_jsxs("button", { onClick: () => setViewMode('markdown'), className: `flex items-center gap-1.5 px-3 py-1 rounded-sm transition-colors ${viewMode === 'markdown'
                                                                ? 'bg-border text-text-primary shadow-sm'
                                                                : 'text-text-muted hover:text-text-primary'}`, children: [_jsx(LayoutTemplate, { size: 12 }), " Format"] }), _jsxs("button", { onClick: () => setViewMode('json'), className: `flex items-center gap-1.5 px-3 py-1 rounded-sm transition-colors ${viewMode === 'json'
                                                                ? 'bg-border text-text-primary shadow-sm'
                                                                : 'text-text-muted hover:text-text-primary'}`, children: [_jsx(Code2, { size: 12 }), " Raw JSON"] })] }), !isValidJson && viewMode === 'json' && (_jsx("span", { className: "text-accent-danger", children: "Invalid JSON format" }))] }), _jsx("div", { className: "flex-1 relative bg-[#1e1e1e]", children: isFetchingPayload ? (_jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-bg-surface", children: _jsx(Loader2, { className: "animate-spin text-accent-primary", size: 24 }) })) : !activeNodeState?.payload ? (_jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-bg-surface text-text-muted", children: _jsx("p", { className: "text-sm", children: "No output data available yet." }) })) : viewMode === 'markdown' && isValidJson && parsedPayload ? (_jsx("div", { className: "absolute inset-0 overflow-y-auto p-6 bg-bg-surface text-text-primary", children: _jsx("div", { className: "max-w-3xl mx-auto prose prose-invert prose-sm", children: _jsx(JsonViewer, { data: parsedPayload }) }) })) : (_jsx(Editor, { height: "100%", defaultLanguage: "json", theme: "vs-dark", value: jsonText, onChange: (val) => setJsonText(val || ''), options: {
                                                    minimap: { enabled: false },
                                                    fontSize: 13,
                                                    fontFamily: 'JetBrains Mono',
                                                    readOnly: isApproved || isSubmitting,
                                                    wordWrap: 'on',
                                                    scrollBeyondLastLine: false,
                                                    lineNumbers: 'on',
                                                } })) })] }), !isApproved && (_jsxs("div", { className: "flex flex-col gap-2 shrink-0", children: [_jsx("label", { className: "text-sm font-semibold text-text-primary", children: "Feedback for regeneration (optional)" }), _jsx("textarea", { value: feedback, onChange: (e) => setFeedback(e.target.value), disabled: isSubmitting, className: "w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all resize-none h-24", placeholder: "e.g. Focus more on enterprise customers instead of freelancers..." })] }))] }), !isApproved && (_jsxs("div", { className: "p-4 border-t border-border bg-bg-elevated/50 flex flex-col gap-2", children: [_jsx("div", { className: "flex items-center justify-between font-mono text-xs text-text-muted px-1", children: _jsxs("span", { children: [MAX_REGENERATIONS -
                                                (activeNodeState.regenerationCount || 0), ' ', "attempts remaining"] }) }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { onClick: handleReject, disabled: isSubmitting || !feedback.trim(), className: "flex-[0.3] py-2.5 px-4 rounded-md font-semibold text-sm border border-border bg-bg-base text-text-primary hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2", children: [isSubmitting ? (_jsx(RefreshCw, { size: 16, className: "animate-spin" })) : (_jsx(RefreshCw, { size: 16 })), "Reject"] }), _jsxs("button", { onClick: handleApprove, disabled: isSubmitting || !isValidJson, className: `flex-[0.7] py-2.5 px-4 rounded-md font-semibold text-sm bg-accent-primary text-bg-base hover:bg-[#00e5ff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${isValidJson && !isSubmitting
                                                ? 'animate-pulse'
                                                : ''}`, children: [isSubmitting ? (_jsx(RefreshCw, { size: 16, className: "animate-spin" })) : (_jsx(CheckCircle2, { size: 16 })), "Approve & Continue"] })] })] }))] }, "panel")] })) }));
}

import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, RefreshCw, X, Code2, LayoutTemplate, Loader2, Copy, Check } from 'lucide-react'
import { DataEntitiesSection } from './DataEntityDiagram'
import { usePipelineStore } from '../../store/pipeline.store'
import { NODE_LABELS, MAX_REGENERATIONS } from '@forgeos/shared'
import { toast } from 'sonner'
import { api } from '../../lib/api'

// Human-readable key labels
const KEY_LABELS: Record<string, string> = {
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
}

const PRIORITY_STYLES: Record<string, string> = {
    MUST: 'bg-accent-success/15 text-accent-success border border-accent-success/30',
    SHOULD: 'bg-accent-warning/15 text-accent-warning border border-accent-warning/30',
    COULD: 'bg-border/60 text-text-muted border border-border',
}

const PRIORITY_LABELS: Record<string, string> = {
    MUST: 'Must Have',
    SHOULD: 'Should Have',
    COULD: 'Nice to Have',
}

const HTTP_METHOD_STYLES: Record<string, string> = {
    GET: 'bg-accent-primary/15 text-accent-primary',
    POST: 'bg-accent-success/15 text-accent-success',
    PUT: 'bg-accent-warning/15 text-accent-warning',
    PATCH: 'bg-accent-warning/15 text-accent-warning',
    DELETE: 'bg-accent-danger/15 text-accent-danger',
}

function formatKey(key: string): string {
    return KEY_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())
}

// Special renderer for a feature card (mvpFeatures items)
const FeatureCard = ({ item }: { item: any }) => {
    const priority = item.priority ?? ''
    return (
        <div className="bg-bg-elevated rounded-lg p-3 flex flex-col gap-1.5 border border-border/40">
            <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-[13px] text-text-primary leading-snug">{item.name}</span>
                {priority && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${PRIORITY_STYLES[priority] ?? ''}`}>
                        {PRIORITY_LABELS[priority] ?? priority}
                    </span>
                )}
            </div>
            {item.rationale && (
                <p className="text-[12px] text-text-muted leading-relaxed">{item.rationale}</p>
            )}
        </div>
    )
}

// Special renderer for pricing tier cards
const PricingCard = ({ item }: { item: any }) => (
    <div className="bg-bg-elevated rounded-lg p-3 border border-border/40 flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
            <span className="font-bold text-text-primary text-[14px]">{item.name}</span>
            <span className="font-mono font-bold text-accent-primary text-[13px]">{item.price}</span>
        </div>
        {item.description && <p className="text-[12px] text-text-muted leading-relaxed">{item.description}</p>}
    </div>
)

// Special renderer for persona cards
const PersonaCard = ({ item }: { item: any }) => (
    <div className="bg-bg-elevated rounded-lg p-3 border border-border/40 flex flex-col gap-2">
        <div>
            <p className="font-bold text-text-primary text-[13px]">{item.name}</p>
            <p className="text-[11px] text-text-muted mt-0.5">{item.role}</p>
        </div>
        {item.painPoints?.length > 0 && (
            <div>
                <p className="text-[11px] font-semibold text-accent-danger/80 uppercase tracking-wide mb-1">Pain Points</p>
                <ul className="flex flex-col gap-0.5">
                    {item.painPoints.map((p: string, i: number) => (
                        <li key={i} className="text-[12px] text-text-primary/80 flex gap-1.5"><span className="text-accent-danger/60 shrink-0">•</span>{p}</li>
                    ))}
                </ul>
            </div>
        )}
        {item.goals?.length > 0 && (
            <div>
                <p className="text-[11px] font-semibold text-accent-success/80 uppercase tracking-wide mb-1">Goals</p>
                <ul className="flex flex-col gap-0.5">
                    {item.goals.map((g: string, i: number) => (
                        <li key={i} className="text-[12px] text-text-primary/80 flex gap-1.5"><span className="text-accent-success/60 shrink-0">•</span>{g}</li>
                    ))}
                </ul>
            </div>
        )}
    </div>
)

// Special renderer for user story cards
const StoryCard = ({ item }: { item: any }) => (
    <div className="bg-bg-elevated rounded-lg p-3 border border-border/40 flex flex-col gap-1.5">
        <p className="text-[13px] text-text-primary leading-relaxed">
            <span className="text-text-muted">As a </span><span className="font-semibold">{item.asA}</span>
            <span className="text-text-muted">, I want to </span><span className="font-medium">{item.iWantTo}</span>
            <span className="text-text-muted"> so that </span><span className="font-medium">{item.soThat}</span>.
        </p>
        {item.acceptanceCriteria?.length > 0 && (
            <div className="mt-1 pl-2 border-l-2 border-accent-primary/30">
                {item.acceptanceCriteria.map((c: string, i: number) => (
                    <p key={i} className="text-[11px] text-text-muted">✓ {c}</p>
                ))}
            </div>
        )}
    </div>
)

// Special renderer for API endpoint rows
const EndpointRow = ({ item }: { item: any }) => (
    <div className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${HTTP_METHOD_STYLES[item.method] ?? 'bg-border text-text-muted'}`}>
            {item.method}
        </span>
        <div className="flex flex-col gap-0.5">
            <code className="text-[12px] text-accent-primary font-mono">{item.path}</code>
            <p className="text-[11px] text-text-muted">{item.description}</p>
        </div>
    </div>
)

// Recursive component to render JSON nicely for non-technical users
const JsonViewer = ({ data, depth = 0, parentKey = '' }: { data: any; depth?: number; parentKey?: string }) => {
    if (data === null) return <span className="text-text-muted italic text-[12px]">—</span>
    if (typeof data === 'boolean') return <span className="text-accent-warning font-mono text-[13px]">{data ? 'Yes' : 'No'}</span>
    if (typeof data === 'number') {
        if (parentKey === 'estimatedDays') return <span className="text-accent-primary font-mono text-[13px]">{data} day{data !== 1 ? 's' : ''}</span>
        return <span className="text-accent-primary font-mono text-[13px]">{data}</span>
    }

    if (typeof data === 'string') {
        // Priority badge
        if (parentKey === 'priority' && PRIORITY_STYLES[data]) {
            return (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[data]}`}>
                    {PRIORITY_LABELS[data] ?? data}
                </span>
            )
        }
        // HTTP method badge
        if (parentKey === 'method') {
            return (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${HTTP_METHOD_STYLES[data] ?? 'bg-border text-text-muted'}`}>
                    {data}
                </span>
            )
        }
        // Code path
        if (parentKey === 'path') return <code className="text-[12px] text-accent-primary font-mono">{data}</code>
        // Prisma schema — show as code block
        if (parentKey === 'prismaSchemaDelta') {
            return (
                <pre className="text-[11px] text-text-primary/80 bg-bg-base rounded-md p-3 overflow-x-auto font-mono leading-relaxed border border-border/40">
                    {data}
                </pre>
            )
        }
        if (data.length > 100) return <p className="text-text-primary/90 leading-relaxed text-[13px] whitespace-pre-wrap">{data}</p>
        return <span className="text-text-primary/90 text-[13px]">{data}</span>
    }

    if (Array.isArray(data)) {
        if (data.length === 0) return <span className="text-text-muted italic text-[12px]">None</span>

        // Feature cards for mvpFeatures
        if (parentKey === 'mvpFeatures') {
            return (
                <div className="flex flex-col gap-2 mt-1">
                    {data.map((item, i) => <FeatureCard key={i} item={item} />)}
                </div>
            )
        }
        // Pricing tier cards
        if (parentKey === 'pricingTiers') {
            return (
                <div className="flex flex-col gap-2 mt-1">
                    {data.map((item, i) => <PricingCard key={i} item={item} />)}
                </div>
            )
        }
        // Persona cards
        if (parentKey === 'userPersonas') {
            return (
                <div className="flex flex-col gap-2 mt-1">
                    {data.map((item, i) => <PersonaCard key={i} item={item} />)}
                </div>
            )
        }
        // User story cards
        if (parentKey === 'coreUserStories') {
            return (
                <div className="flex flex-col gap-2 mt-1">
                    {data.map((item, i) => <StoryCard key={i} item={item} />)}
                </div>
            )
        }
        // Data entity cards
        if (parentKey === 'dataEntities') {
            return <DataEntitiesSection entities={data} />
        }
        // API endpoints
        if (parentKey === 'apiEndpoints') {
            return (
                <div className="flex flex-col mt-1 bg-bg-elevated rounded-lg border border-border/40 px-3 py-1">
                    {data.map((item, i) => <EndpointRow key={i} item={item} />)}
                </div>
            )
        }
        // Phase features
        if (parentKey === 'phase1Features' || parentKey === 'phase2Features') {
            return (
                <div className="flex flex-col gap-1.5 mt-1">
                    {data.map((item: any, i: number) => (
                        <div key={i} className="flex items-baseline justify-between gap-2 py-1.5 border-b border-border/30 last:border-0">
                            <span className="text-[13px] text-text-primary/90">{item.feature}</span>
                            <span className="text-[11px] text-text-muted shrink-0 font-mono">{item.estimatedDays}d</span>
                        </div>
                    ))}
                </div>
            )
        }
        // Simple string/number arrays → pill tags or bullet list
        if (data.every((item) => typeof item !== 'object')) {
            // Integration tags
            if (parentKey === 'integrations' || parentKey === 'envVarsRequired') {
                return (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                        {data.map((item, i) => (
                            <span key={i} className="text-[11px] font-mono bg-bg-elevated border border-border/60 text-text-primary/80 px-2 py-0.5 rounded-md">
                                {item}
                            </span>
                        ))}
                    </div>
                )
            }
            return (
                <ul className="flex flex-col gap-1.5 mt-1">
                    {data.map((item, i) => (
                        <li key={i} className="text-[13px] text-text-primary/90 flex gap-2">
                            <span className="text-accent-primary/50 shrink-0 mt-[3px]">›</span>
                            <JsonViewer data={item} depth={depth + 1} parentKey={parentKey} />
                        </li>
                    ))}
                </ul>
            )
        }
        // Generic object array
        return (
            <div className="flex flex-col gap-3 mt-1">
                {data.map((item, i) => (
                    <div key={i} className={`pt-2 ${i > 0 ? 'border-t border-border/40' : ''}`}>
                        <JsonViewer data={item} depth={depth + 1} parentKey={parentKey} />
                    </div>
                ))}
            </div>
        )
    }

    if (typeof data === 'object') {
        const entries = Object.entries(data)
        if (entries.length === 0) return <span className="text-text-muted italic text-[12px]">—</span>

        // Tech stack — render as category groups inline
        if (parentKey === 'techStack') {
            return (
                <div className="grid grid-cols-1 gap-2 mt-1">
                    {entries.map(([key, value]) => (
                        <div key={key} className="bg-bg-elevated rounded-lg p-2.5 border border-border/40">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">{formatKey(key)}</p>
                            <div className="flex flex-wrap gap-1">
                                {(value as string[]).map((v, i) => (
                                    <span key={i} className="text-[11px] bg-bg-base border border-border/60 text-text-primary/80 px-2 py-0.5 rounded-md font-mono">
                                        {v}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )
        }

        return (
            <div className="flex flex-col gap-2">
                {entries.map(([key, value]) => {
                    const label = formatKey(key)
                    const isComplex = typeof value === 'object' && value !== null
                    const isTopLevel = depth === 0

                    return (
                        <div key={key} className={isTopLevel ? 'flex flex-col gap-1.5 pb-4 border-b border-border/30 last:border-0' : `flex ${isComplex ? 'flex-col gap-1' : 'gap-2 items-baseline'}`}>
                            <span className={`font-semibold shrink-0 ${
                                isTopLevel
                                    ? 'text-[11px] font-bold uppercase tracking-widest text-text-muted'
                                    : 'text-[12px] text-text-muted'
                            }`}>
                                {label}
                            </span>
                            <div>
                                <JsonViewer data={value} depth={depth + 1} parentKey={key} />
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return null
}

export function HITLPanel() {
    const activePanel = usePipelineStore((s) => s.activePanel)
    const nodes = usePipelineStore((s) => s.nodes)
    const projectId = usePipelineStore((s) => s.projectId)
    const closePanel = usePipelineStore((s) => s.closePanel)
    const approveNode = usePipelineStore((s) => s.approveNode)
    const rejectNode = usePipelineStore((s) => s.rejectNode)
    const handleSSEEvent = usePipelineStore((s) => s.handleSSEEvent)

    const [jsonText, setJsonText] = useState('')
    const [feedback, setFeedback] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [viewMode, setViewMode] = useState<'markdown' | 'json'>('markdown')
    const [copied, setCopied] = useState(false)

    const handleCopyJson = () => {
        navigator.clipboard.writeText(jsonText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    const [isFetchingPayload, setIsFetchingPayload] = useState(false)

    const activeNodeState =
        activePanel !== null ? nodes.find((n) => n.id === activePanel) : null

    // When panel opens, sync jsonText from payload
    useEffect(() => {
        if (activeNodeState) {
            setJsonText(
                activeNodeState.payload
                    ? JSON.stringify(activeNodeState.payload, null, 2)
                    : ''
            )
            setFeedback('')
        }
    }, [activeNodeState?.id, activeNodeState?.payload])

    // Fallback: if panel opens and payload is null, fetch from API
    useEffect(() => {
        if (!activeNodeState || activeNodeState.payload || !projectId) return

        let cancelled = false
        setIsFetchingPayload(true)

        api.getProject(projectId).then((project) => {
            if (cancelled) return
            const outputs = project.agentOutputs
            if (!outputs) return

            // Find the best output for this node (latest version)
            let best: (typeof outputs)[number] | null = null
            for (const o of outputs) {
                if (o.nodeId === activeNodeState.id) {
                    if (!best || o.version > best.version) best = o
                }
            }

            if (best?.jsonPayload && typeof best.jsonPayload === 'object' && Object.keys(best.jsonPayload as object).length > 0) {
                // Inject payload into the store via handleSSEEvent
                handleSSEEvent({
                    type: 'NODE_PAYLOAD',
                    nodeId: best.nodeId,
                    version: best.version,
                    payload: best.jsonPayload as Record<string, unknown>,
                })
            }
        }).catch((err) => {
            console.error('[HITLPanel] Failed to fetch payload fallback:', err)
        }).finally(() => {
            if (!cancelled) setIsFetchingPayload(false)
        })

        return () => { cancelled = true }
    }, [activeNodeState?.id, activeNodeState?.payload, projectId, handleSSEEvent])

    // Check parsing validity to disable 'Approve'
    let isValidJson = true
    let parsedPayload = null
    try {
        parsedPayload = JSON.parse(jsonText === '' ? '{}' : jsonText)
    } catch {
        isValidJson = false
    }

    const handleApprove = async () => {
        if (!isValidJson || !parsedPayload || !activeNodeState) return
        setIsSubmitting(true)
        try {
            await approveNode(activeNodeState.id, parsedPayload)
            toast.success('Approved!', {
                description: `Node ${activeNodeState.id} advanced to next step.`,
            })
        } catch (e: any) {
            toast.error('Failed to approve', { description: e.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleReject = async () => {
        if (!feedback.trim() || !activeNodeState) return
        setIsSubmitting(true)
        try {
            await rejectNode(activeNodeState.id, feedback)
            toast.success('Rejected - Regenerating', {
                description: `Feedback sent to agent.`,
            })
        } catch (e: any) {
            toast.error('Failed to reject', { description: e.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    const isOpen = activePanel !== null && activeNodeState !== null && activeNodeState !== undefined
    const label = activeNodeState
        ? NODE_LABELS[activeNodeState.id as keyof typeof NODE_LABELS]
        : ''
    const isApproved = activeNodeState?.status === 'APPROVED'

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={closePanel}
                    />
                    <motion.div
                        key="dialog"
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                        className="relative w-full max-w-2xl bg-bg-surface border border-border rounded-2xl shadow-2xl flex flex-col max-h-[88vh]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg-elevated/50 rounded-t-2xl shrink-0">
                            <div>
                                <h2 className="text-xl font-bold font-mono tracking-tight text-text-primary">
                                    {label}
                                </h2>
                                <div className="text-sm font-mono text-text-muted mt-0.5">
                                    v{activeNodeState!.version} of {MAX_REGENERATIONS}{' '}
                                    {isApproved && (
                                        <span className="text-accent-success ml-2">(Approved)</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={closePanel}
                                className="p-2 text-text-muted hover:text-text-primary hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                            {!isValidJson && (
                                <div className="bg-accent-danger/10 border border-accent-danger/30 text-accent-danger text-sm font-semibold px-3 py-2 rounded-md shrink-0">
                                    Invalid JSON — fix before approving
                                </div>
                            )}

                            <div className="flex flex-col border border-border rounded-lg overflow-hidden">
                                {/* Tab bar */}
                                <div className="bg-bg-elevated px-3 py-1.5 text-xs font-mono text-text-muted border-b border-border flex justify-between items-center shrink-0">
                                    <div className="flex bg-bg-surface rounded-md p-0.5 border border-border/50">
                                        <button
                                            onClick={() => setViewMode('markdown')}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-sm transition-colors ${viewMode === 'markdown'
                                                ? 'bg-border text-text-primary shadow-sm'
                                                : 'text-text-muted hover:text-text-primary'
                                            }`}
                                        >
                                            <LayoutTemplate size={12} /> Format
                                        </button>
                                        <button
                                            onClick={() => setViewMode('json')}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-sm transition-colors ${viewMode === 'json'
                                                ? 'bg-border text-text-primary shadow-sm'
                                                : 'text-text-muted hover:text-text-primary'
                                            }`}
                                        >
                                            <Code2 size={12} /> Raw JSON
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isValidJson && viewMode === 'json' && (
                                            <span className="text-accent-danger">Invalid JSON format</span>
                                        )}
                                        {jsonText && (
                                            <button
                                                onClick={handleCopyJson}
                                                title="Copy JSON"
                                                className="flex items-center gap-1 px-2 py-1 rounded text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all duration-200"
                                            >
                                                {copied
                                                    ? <><Check size={12} className="text-accent-success" /><span className="text-accent-success">Copied</span></>
                                                    : <><Copy size={12} /><span>Copy</span></>
                                                }
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Content */}
                                {isFetchingPayload ? (
                                    <div className="h-48 flex items-center justify-center bg-bg-surface">
                                        <Loader2 className="animate-spin text-accent-primary" size={24} />
                                    </div>
                                ) : !activeNodeState?.payload ? (
                                    <div className="h-48 flex items-center justify-center bg-bg-surface text-text-muted">
                                        <p className="text-sm">No output data available yet.</p>
                                    </div>
                                ) : viewMode === 'markdown' && isValidJson && parsedPayload ? (
                                    <div className="p-6 bg-bg-surface text-text-primary">
                                        <div className="max-w-3xl mx-auto prose prose-invert prose-sm">
                                            <JsonViewer data={parsedPayload} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-[420px] bg-[#1e1e1e]">
                                        <Editor
                                            height="420px"
                                            defaultLanguage="json"
                                            theme="vs-dark"
                                            value={jsonText}
                                            onChange={(val) => setJsonText(val || '')}
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 13,
                                                fontFamily: 'JetBrains Mono',
                                                readOnly: isApproved || isSubmitting,
                                                wordWrap: 'on',
                                                scrollBeyondLastLine: false,
                                                lineNumbers: 'on',
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {!isApproved && (
                                <div className="flex flex-col gap-2 shrink-0">
                                    <label className="text-sm font-semibold text-text-primary">
                                        Feedback for regeneration (optional)
                                    </label>
                                    <textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        disabled={isSubmitting}
                                        className="w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all resize-none h-24"
                                        placeholder="e.g. Focus more on enterprise customers instead of freelancers..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {!isApproved && (
                            <div className="px-5 py-4 border-t border-border bg-bg-elevated/50 rounded-b-2xl flex flex-col gap-2 shrink-0">
                                <div className="flex items-center justify-between font-mono text-xs text-text-muted px-1">
                                    <span>
                                        {MAX_REGENERATIONS - (activeNodeState!.regenerationCount || 0)} attempts remaining
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleReject}
                                        disabled={isSubmitting || !feedback.trim()}
                                        className="flex-[0.3] py-2.5 px-4 rounded-md font-semibold text-sm border border-border bg-bg-base text-text-primary hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                        Reject
                                    </button>
                                    <button
                                        onClick={handleApprove}
                                        disabled={isSubmitting || !isValidJson}
                                        className={`flex-[0.7] py-2.5 px-4 rounded-md font-semibold text-sm bg-accent-primary text-bg-base hover:bg-[#00e5ff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${isValidJson && !isSubmitting ? 'animate-pulse' : ''}`}
                                    >
                                        {isSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        Approve & Continue
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import { CheckCircle2, RefreshCw, X } from 'lucide-react'
import { usePipelineStore } from '../../store/pipeline.store'
import { NODE_LABELS, MAX_REGENERATIONS } from '@forgeos/shared'
import { toast } from 'sonner'

export function HITLPanel() {
    const activePanel = usePipelineStore((s) => s.activePanel)
    const nodes = usePipelineStore((s) => s.nodes)
    const closePanel = usePipelineStore((s) => s.closePanel)
    const approveNode = usePipelineStore((s) => s.approveNode)
    const rejectNode = usePipelineStore((s) => s.rejectNode)

    const [jsonText, setJsonText] = useState('')
    const [feedback, setFeedback] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const activeNodeState =
        activePanel !== null ? nodes.find((n) => n.id === activePanel) : null

    useEffect(() => {
        if (activeNodeState?.payload) {
            setJsonText(JSON.stringify(activeNodeState.payload, null, 2))
            setFeedback('')
        }
    }, [activeNodeState])

    if (activePanel === null || !activeNodeState) return null

    // Check parsing validity to disable 'Approve'
    let isValidJson = true
    let parsedPayload = null
    try {
        parsedPayload = JSON.parse(jsonText === '' ? '{}' : jsonText)
    } catch (e) {
        isValidJson = false
    }

    const handleApprove = async () => {
        if (!isValidJson || !parsedPayload) return
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
        if (!feedback.trim()) return
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

    const label = NODE_LABELS[activeNodeState.id as keyof typeof NODE_LABELS]
    const isApproved = activeNodeState.status === 'APPROVED'

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                onClick={closePanel}
            />
            <div
                className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-bg-surface border-l border-border shadow-2xl flex flex-col transform transition-transform duration-300"
            >
                <div className="flex items-center justify-between p-4 border-b border-border bg-bg-elevated/50">
                    <div>
                        <h2 className="text-xl font-bold font-mono tracking-tight text-text-primary">
                            {label}
                        </h2>
                        <div className="text-sm font-mono text-text-muted mt-1">
                            v{activeNodeState.version} of {MAX_REGENERATIONS}{' '}
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

                <div className="flex-1 overflow-auto flex flex-col p-4 gap-4">
                    <div className="flexflex-col flex-1 border border-border rounded-lg overflow-hidden shrink-0 min-h-[400px]">
                        <div className="bg-bg-elevated px-3 py-1.5 text-xs font-mono text-text-muted border-b border-border flex justify-between">
                            <span>output.json</span>
                            {!isValidJson && (
                                <span className="text-accent-danger">Invalid JSON format</span>
                            )}
                        </div>
                        <div className="flex-1 relative bg-[#1e1e1e]">
                            <Editor
                                height="100%"
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

                {!isApproved && (
                    <div className="p-4 border-t border-border bg-bg-elevated/50 flex flex-col gap-2">
                        <div className="flex items-center justify-between font-mono text-xs text-text-muted px-1">
                            <span>
                                {MAX_REGENERATIONS - (activeNodeState.regenerationCount || 0)}{' '}
                                attempts remaining
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleReject}
                                disabled={isSubmitting || !feedback.trim()}
                                className="flex-[0.3] py-2.5 px-4 rounded-md font-semibold text-sm border border-border bg-bg-base text-text-primary hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <RefreshCw size={16} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={16} />
                                )}
                                Reject
                            </button>
                            <button
                                onClick={handleApprove}
                                disabled={isSubmitting || !isValidJson}
                                className="flex-[0.7] py-2.5 px-4 rounded-md font-semibold text-sm bg-accent-primary text-bg-base hover:bg-[#00e5ff] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <RefreshCw size={16} className="animate-spin" />
                                ) : (
                                    <CheckCircle2 size={16} />
                                )}
                                Approve & Continue
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

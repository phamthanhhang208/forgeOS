import { useState } from 'react'
import { Loader2, Rocket, Sparkles, ArrowLeft, Check, X } from 'lucide-react'
import { api } from '../../lib/api'
import type { ClarifyQuestion } from '@forgeos/shared'
import { motion, AnimatePresence } from 'framer-motion'

type WizardStep = 'concept' | 'loading' | 'questions'

interface ConceptWizardProps {
    onClose: () => void
    onSubmit: (concept: string) => Promise<void>
    agencyId: string
}

export function ConceptWizard({ onClose, onSubmit, agencyId }: ConceptWizardProps) {
    const [step, setStep] = useState<WizardStep>('concept')
    const [concept, setConcept] = useState('')
    const [questions, setQuestions] = useState<ClarifyQuestion[]>([])
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleGetQuestions = async () => {
        if (concept.length < 10) return
        setStep('loading')
        setError(null)

        try {
            const { questions: q } = await api.clarifyConcept({ concept, agencyId })
            setQuestions(q)
            // Initialize answers
            const initialAnswers: Record<string, string | string[]> = {}
            q.forEach((question) => {
                initialAnswers[question.id] = question.type === 'multiselect' ? [] : ''
            })
            setAnswers(initialAnswers)
            setStep('questions')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to get questions')
            setStep('concept')
        }
    }

    const handleSkipDeploy = async () => {
        if (concept.length < 10) return
        setIsSubmitting(true)
        try {
            await onSubmit(concept)
        } catch {
            setIsSubmitting(false)
        }
    }

    const handleSubmitWithAnswers = async () => {
        setIsSubmitting(true)
        try {
            // Build enriched concept string
            const answeredQuestions = questions
                .map((q) => {
                    const answer = answers[q.id]
                    if (!answer || (Array.isArray(answer) && answer.length === 0)) return null
                    const answerStr = Array.isArray(answer) ? answer.join(', ') : answer
                    return `- ${q.question}\n  ${answerStr}`
                })
                .filter(Boolean)

            const enrichedConcept = answeredQuestions.length > 0
                ? `${concept}\n\nClarifying details:\n${answeredQuestions.join('\n')}`
                : concept

            await onSubmit(enrichedConcept)
        } catch {
            setIsSubmitting(false)
        }
    }

    const handleAnswerChange = (questionId: string, value: string | string[]) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }))
    }

    const toggleMultiselect = (questionId: string, option: string) => {
        setAnswers((prev) => {
            const current = (prev[questionId] as string[]) || []
            const updated = current.includes(option)
                ? current.filter((o) => o !== option)
                : [...current, option]
            return { ...prev, [questionId]: updated }
        })
    }

    const hasAnyAnswer = Object.values(answers).some((a) =>
        Array.isArray(a) ? a.length > 0 : a.trim().length > 0
    )

    return (
        <>
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={() => !isSubmitting && step !== 'loading' && onClose()}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-bg-surface border border-border rounded-xl shadow-2xl z-50 flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 pb-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        {step === 'questions' && (
                            <button
                                onClick={() => setStep('concept')}
                                className="text-text-muted hover:text-text-primary transition-colors p-1 -ml-1"
                                title="Back to concept"
                            >
                                <ArrowLeft size={16} />
                            </button>
                        )}
                        <h2 className="text-lg font-bold">
                            {step === 'concept' && 'Launch New Project'}
                            {step === 'loading' && 'Analyzing Concept...'}
                            {step === 'questions' && 'Refine Your Concept'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting || step === 'loading'}
                        className="text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-6">
                    <AnimatePresence mode="wait">
                        {/* Step 1: Concept Input */}
                        {step === 'concept' && (
                            <motion.div
                                key="concept"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col gap-4"
                            >
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-semibold text-text-muted">
                                        Your SaaS Idea
                                    </label>
                                    <textarea
                                        value={concept}
                                        onChange={(e) => setConcept(e.target.value)}
                                        disabled={isSubmitting}
                                        placeholder='e.g. "Client portal for a law firm"'
                                        className="w-full h-28 bg-bg-base border border-border rounded-md p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all resize-none"
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className="text-xs text-accent-danger bg-accent-danger/10 border border-accent-danger/20 p-3 rounded-md">
                                        {error}
                                    </div>
                                )}

                                <div className="text-xs text-text-muted bg-bg-elevated p-3 rounded-md border border-border">
                                    <span className="font-bold text-text-primary">Tip:</span>{' '}
                                    Let AI ask you clarifying questions to produce better results,
                                    or skip straight to deployment.
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleSkipDeploy}
                                        disabled={concept.length < 10 || isSubmitting}
                                        className="flex-1 bg-bg-elevated text-text-primary px-4 py-2.5 rounded-md font-semibold text-sm border border-border hover:border-accent-primary/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Rocket size={16} />
                                        )}
                                        Skip → Deploy
                                    </button>
                                    <button
                                        onClick={handleGetQuestions}
                                        disabled={concept.length < 10 || isSubmitting}
                                        className="flex-1 bg-accent-primary text-bg-base px-4 py-2.5 rounded-md font-bold text-sm hover:bg-[#00e5ff] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent-primary/20"
                                    >
                                        <Sparkles size={16} />
                                        Get AI Suggestions
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Loading */}
                        {step === 'loading' && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col items-center justify-center py-12 gap-4"
                            >
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center">
                                        <Sparkles size={28} className="text-accent-primary animate-pulse" />
                                    </div>
                                    <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-accent-primary/30 border-t-accent-primary animate-spin" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-text-primary">
                                        Analyzing your concept...
                                    </p>
                                    <p className="text-xs text-text-muted mt-1">
                                        AI is generating tailored questions to refine your idea
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Dynamic Q&A Form */}
                        {step === 'questions' && (
                            <motion.div
                                key="questions"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col gap-5"
                            >
                                <div className="text-xs text-text-muted bg-bg-elevated p-3 rounded-md border border-border">
                                    <span className="font-bold text-accent-primary">✨ AI-Generated Questions</span>{' '}
                                    — Answer as many as you'd like to help our agents produce better results.
                                </div>

                                {questions.map((q, index) => (
                                    <motion.div
                                        key={q.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.08, duration: 0.2 }}
                                        className="flex flex-col gap-2"
                                    >
                                        <label className="text-sm font-semibold text-text-primary">
                                            {q.question}
                                        </label>

                                        {q.type === 'text' && (
                                            <textarea
                                                value={(answers[q.id] as string) || ''}
                                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                placeholder={q.placeholder || 'Type your answer...'}
                                                className="w-full h-20 bg-bg-base border border-border rounded-md p-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all resize-none"
                                            />
                                        )}

                                        {q.type === 'select' && q.options && (
                                            <div className="flex flex-wrap gap-2">
                                                {q.options.map((option) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => handleAnswerChange(q.id, option)}
                                                        className={`text-xs px-3 py-1.5 rounded-md border transition-all ${answers[q.id] === option
                                                                ? 'bg-accent-primary/15 border-accent-primary/50 text-accent-primary font-semibold'
                                                                : 'bg-bg-base border-border text-text-muted hover:border-accent-primary/30 hover:text-text-primary'
                                                            }`}
                                                    >
                                                        {answers[q.id] === option && (
                                                            <Check size={10} className="inline mr-1" />
                                                        )}
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {q.type === 'multiselect' && q.options && (
                                            <div className="flex flex-wrap gap-2">
                                                {q.options.map((option) => {
                                                    const selected = ((answers[q.id] as string[]) || []).includes(option)
                                                    return (
                                                        <button
                                                            key={option}
                                                            type="button"
                                                            onClick={() => toggleMultiselect(q.id, option)}
                                                            className={`text-xs px-3 py-1.5 rounded-md border transition-all ${selected
                                                                    ? 'bg-accent-primary/15 border-accent-primary/50 text-accent-primary font-semibold'
                                                                    : 'bg-bg-base border-border text-text-muted hover:border-accent-primary/30 hover:text-text-primary'
                                                                }`}
                                                        >
                                                            {selected && (
                                                                <Check size={10} className="inline mr-1" />
                                                            )}
                                                            {option}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer for questions step */}
                {step === 'questions' && (
                    <div className="p-6 pt-4 border-t border-border shrink-0">
                        <div className="flex gap-2">
                            <button
                                onClick={handleSkipDeploy}
                                disabled={isSubmitting}
                                className="flex-1 bg-bg-elevated text-text-primary px-4 py-2.5 rounded-md font-semibold text-sm border border-border hover:border-accent-primary/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                Skip Answers
                            </button>
                            <button
                                onClick={handleSubmitWithAnswers}
                                disabled={isSubmitting || !hasAnyAnswer}
                                className="flex-1 bg-accent-primary text-bg-base px-4 py-2.5 rounded-md font-bold text-sm hover:bg-[#00e5ff] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent-primary/20"
                            >
                                {isSubmitting ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Rocket size={16} />
                                )}
                                Submit & Deploy
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

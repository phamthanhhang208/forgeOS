import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, Copy, Check } from "lucide-react";
import { useState } from "react";
import { usePipelineStore } from "../../store/pipeline.store";

function parseConcept(text: string) {
  const clarifyingIdx = text.indexOf("Clarifying details:");
  if (clarifyingIdx === -1) return { summary: text.trim(), qaPairs: [] as { question: string; answer: string }[] };

  const summary = text.slice(0, clarifyingIdx).trim();
  const clarifyingSection = text.slice(clarifyingIdx + "Clarifying details:".length).trim();

  const qaPairs: { question: string; answer: string }[] = [];
  const lines = clarifyingSection.split("\n");
  let currentQuestion = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      currentQuestion = trimmed.slice(2);
    } else if (trimmed && currentQuestion) {
      qaPairs.push({ question: currentQuestion, answer: trimmed });
      currentQuestion = "";
    }
  }

  return { summary, qaPairs };
}

export function ConceptDetailModal({ concept }: { concept: string }) {
  const conceptModalOpen = usePipelineStore((s) => s.conceptModalOpen);
  const closeConceptModal = usePipelineStore((s) => s.closeConceptModal);
  const [copied, setCopied] = useState(false);

  if (!conceptModalOpen) return null;

  const { summary, qaPairs } = parseConcept(concept || "");

  const handleCopy = () => {
    navigator.clipboard.writeText(concept);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={closeConceptModal}
      >
        <motion.div
          key="modal"
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[80vh] bg-bg-surface border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-bg-elevated/80 to-bg-surface">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary">
                <Lightbulb size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold font-mono tracking-tight text-text-primary">
                  Full Project Concept
                </h2>
                <p className="text-[10px] text-accent-primary/60 uppercase tracking-widest font-semibold font-mono">
                  Complete description
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                title="Copy to clipboard"
                className="p-2 text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 rounded-lg transition-all duration-200"
              >
                {copied ? <Check size={16} className="text-accent-success" /> : <Copy size={16} />}
              </button>
              <button
                onClick={closeConceptModal}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {concept ? (
              <>
                {/* Summary callout */}
                <div className="rounded-xl border border-accent-primary/20 bg-accent-primary/5 px-4 py-3.5">
                  <p className="text-sm text-text-primary leading-relaxed font-sans">
                    {summary || concept}
                  </p>
                </div>

                {/* Q&A section */}
                {qaPairs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-3.5 rounded-full bg-accent-secondary" />
                      <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-text-muted">
                        Clarifying Details
                      </span>
                    </div>
                    <div className="space-y-2">
                      {qaPairs.map(({ question, answer }, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-bg-elevated/50 border border-border/50 px-4 py-3"
                        >
                          <p className="text-[11px] text-text-muted leading-snug mb-1.5">{question}</p>
                          <p className="text-sm font-semibold text-text-primary">{answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-text-muted italic">No concept entered yet.</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border bg-bg-elevated/20 flex items-center justify-between">
            {concept && (
              <span className="text-[11px] text-text-muted font-mono">
                {concept.length} chars · {concept.split(/\s+/).filter(Boolean).length} words
              </span>
            )}
            <button
              onClick={closeConceptModal}
              className="ml-auto px-4 py-1.5 bg-bg-elevated border border-border rounded-lg text-xs font-bold font-mono text-text-primary hover:border-accent-primary/40 hover:text-accent-primary transition-all duration-200 uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

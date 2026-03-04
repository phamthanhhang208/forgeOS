import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb } from "lucide-react";
import { usePipelineStore } from "../../store/pipeline.store";

export function ConceptDetailModal({ concept }: { concept: string }) {
  const conceptModalOpen = usePipelineStore((s) => s.conceptModalOpen);
  const closeConceptModal = usePipelineStore((s) => s.closeConceptModal);

  if (!conceptModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={closeConceptModal}
      >
        <motion.div
          key="modal"
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[80vh] bg-bg-surface border border-border shadow-2xl rounded-xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border bg-bg-elevated/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                <Lightbulb size={18} />
              </div>
              <div>
                <h2 className="text-lg font-bold font-mono tracking-tight text-text-primary">
                  Full Project Concept
                </h2>
                <p className="text-[11px] text-text-muted uppercase tracking-wide font-semibold">
                  Complete description
                </p>
              </div>
            </div>
            <button
              onClick={closeConceptModal}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-[#0f1014]">
            <div className="max-w-3xl">
              <p className="text-base text-text-primary/90 leading-relaxed whitespace-pre-wrap font-sans">
                {concept || "No concept entered yet."}
              </p>
              {concept && (
                <div className="mt-6 pt-6 border-t border-border/30 text-xs text-text-muted">
                  {concept.length} characters • {concept.split(/\s+/).length}{" "}
                  words
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-border bg-bg-elevated/30 flex justify-end">
            <button
              onClick={closeConceptModal}
              className="px-4 py-2 bg-bg-elevated border border-border rounded-md text-sm font-bold text-text-primary hover:bg-border transition-colors uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

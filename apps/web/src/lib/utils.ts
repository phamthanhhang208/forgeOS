import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a concept that may contain Q&A clarifications
 * Format: "Original concept\n\nClarifying details:\n- Question\n  Answer"
 */
export function parseConcept(fullConcept: string) {
  if (!fullConcept) {
    return {
      original: "",
      clarifications: [],
      hasClarifications: false,
    };
  }

  const clarifyingMarker = "\n\nClarifying details:\n";
  const parts = fullConcept.split(clarifyingMarker);

  if (parts.length === 1) {
    // No clarifications
    return {
      original: fullConcept.trim(),
      clarifications: [],
      hasClarifications: false,
    };
  }

  const original = parts[0].trim();
  const clarifyText = parts[1] || "";

  // Parse Q&A blocks (format: "- Question\n  Answer")
  const clarifications: Array<{ question: string; answer: string }> = [];
  const lines = clarifyText.split("\n");
  let currentQuestion = "";

  for (const line of lines) {
    if (line.startsWith("- ")) {
      // New question
      if (currentQuestion) {
        // Close previous Q&A if exists
        clarifications.push({ question: currentQuestion, answer: "" });
      }
      currentQuestion = line.substring(2).trim();
    } else if (line.trim() && currentQuestion) {
      // Answer line (indented)
      const answer = line.trim();
      clarifications.push({ question: currentQuestion, answer });
      currentQuestion = "";
    }
  }

  // Handle last question if no answer followed
  if (currentQuestion) {
    clarifications.push({ question: currentQuestion, answer: "" });
  }

  return {
    original,
    clarifications,
    hasClarifications: clarifications.length > 0,
  };
}

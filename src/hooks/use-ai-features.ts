import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getAIReplySuggestions,
  getAIChatSummary,
  translateAIMessage,
  fixAIGrammar,
  smartAISearch,
  getAIVoiceSummary,
  type ChatSummaryResult,
  type TranslationResult,
  type GrammarFixResult,
} from "@/lib/ai";

/** Hook for 🤖 AI Reply Suggestions */
export function useAIReplySuggestions(
  lastMessageContent: string | null,
  senderName: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["ai-reply-suggestions", lastMessageContent, senderName],
    queryFn: () => getAIReplySuggestions(lastMessageContent, senderName),
    enabled: enabled && Boolean(lastMessageContent?.trim()),
    staleTime: 60000,
  });
}

/** Hook for 📝 AI Chat Summary */
export function useAIChatSummary() {
  return useMutation({
    mutationFn: (
      messages: Array<{ senderName: string; content: string | null; createdAt: string }>
    ) => getAIChatSummary(messages),
  });
}

/** Hook for 🌐 AI Translate */
export function useAITranslation() {
  return useMutation({
    mutationFn: ({ text, targetLang }: { text: string; targetLang?: string }) =>
      translateAIMessage(text, targetLang),
  });
}

/** Hook for ✍️ AI Grammar Fix */
export function useAIGrammarFix() {
  return useMutation({
    mutationFn: (text: string) => fixAIGrammar(text),
  });
}

/** Hook for 🎙️ AI Voice Summary */
export function useAIVoiceSummary() {
  return useMutation({
    mutationFn: (transcriptText: string) => getAIVoiceSummary(transcriptText),
  });
}

export type TaskType = 'simple_qa' | 'summary' | 'contract_analysis' | 'multi_document'

/**
 * Model registry — all models are free-tier on OpenRouter.
 * Swap these strings to upgrade to paid models without touching any other code.
 */
export const MODELS = {
  primary: 'qwen/qwen3-next-80b-a3b-instruct:free',
  fallback: 'google/gemma-4-26b-a4b:free',
  heavy: 'openai/gpt-oss-120b:free',
} as const

/** Pick the right model based on task complexity. */
export function selectModel(taskType: TaskType): string {
  switch (taskType) {
    case 'contract_analysis':
    case 'multi_document':
      return MODELS.heavy
    case 'simple_qa':
    case 'summary':
      return MODELS.primary
    default:
      return MODELS.primary
  }
}

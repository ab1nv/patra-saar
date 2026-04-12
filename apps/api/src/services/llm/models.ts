export type TaskType = 'simple_qa' | 'summary' | 'contract_analysis' | 'multi_document'

/**
 * Model registry — all models are free-tier on OpenRouter.
 * Swap these strings to upgrade to paid models without touching any other code.
 */
export const MODELS = {
  primary: 'openrouter/free',
  fallback: 'openrouter/free',
  heavy: 'openrouter/free',
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

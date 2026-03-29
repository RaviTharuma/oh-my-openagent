import type { ModelCacheState, VisionCapableModel } from "../plugin-state";
import { setVisionCapableModelsCache } from "../shared/vision-capable-models-cache"

const ANTHROPIC_PROVIDER_IDS = [
  "anthropic",
  "google-vertex-anthropic",
  "aws-bedrock-anthropic",
] as const
const ANTHROPIC_CONTEXT_1M_LIMIT = 1_000_000
const ANTHROPIC_BETA_HEADER = "anthropic-beta"
const ANTHROPIC_CONTEXT_1M_SIGNAL = "context-1m"

type ProviderConfig = {
  options?: { headers?: Record<string, string> };
  models?: Record<string, ProviderModelConfig>;
};

type ProviderModelConfig = {
  limit?: { context?: number };
  modalities?: {
    input?: string[];
  };
  capabilities?: {
    input?: {
      image?: boolean;
    };
  };
}

function supportsImageInput(modelConfig: ProviderModelConfig | undefined): boolean {
  if (modelConfig?.modalities?.input?.includes("image")) {
    return true
  }

  return modelConfig?.capabilities?.input?.image === true
}

function setProviderContextLimitMinimum(
  cache: Map<string, number>,
  providerIDs: readonly string[],
  minimum: number,
): void {
  for (const providerID of providerIDs) {
    cache.set(providerID, minimum)
  }
}

function hasAnthropicContext1MHeader(providerConfig: ProviderConfig | undefined): boolean {
  return providerConfig?.options?.headers?.[ANTHROPIC_BETA_HEADER]?.includes(ANTHROPIC_CONTEXT_1M_SIGNAL) ?? false
}

function isKnownAnthropicProvider(providerID: string): boolean {
  return ANTHROPIC_PROVIDER_IDS.includes(providerID as (typeof ANTHROPIC_PROVIDER_IDS)[number])
}

export function applyProviderConfig(params: {
  config: Record<string, unknown>;
  modelCacheState: ModelCacheState;
}): void {
  const providers = params.config.provider as
    | Record<string, ProviderConfig>
    | undefined;
  const modelContextLimitsCache = params.modelCacheState.modelContextLimitsCache;
  const providerContextLimitMinimumsCache = params.modelCacheState.providerContextLimitMinimumsCache
    ?? new Map<string, number>()
  params.modelCacheState.providerContextLimitMinimumsCache = providerContextLimitMinimumsCache

  modelContextLimitsCache.clear()
  providerContextLimitMinimumsCache.clear()

  const providersWithAnthropicContext1M = Object.entries(providers ?? {})
    .filter(([, providerConfig]) => hasAnthropicContext1MHeader(providerConfig))
    .map(([providerID]) => providerID)

  params.modelCacheState.anthropicContext1MEnabled =
    providersWithAnthropicContext1M.some((providerID) => isKnownAnthropicProvider(providerID))

  if (params.modelCacheState.anthropicContext1MEnabled) {
    setProviderContextLimitMinimum(
      providerContextLimitMinimumsCache,
      ANTHROPIC_PROVIDER_IDS,
      ANTHROPIC_CONTEXT_1M_LIMIT,
    )
  }

  for (const providerID of providersWithAnthropicContext1M) {
    if (isKnownAnthropicProvider(providerID)) {
      continue
    }

    providerContextLimitMinimumsCache.set(providerID, ANTHROPIC_CONTEXT_1M_LIMIT)
  }

  const visionCapableModelsCache = params.modelCacheState.visionCapableModelsCache
    ?? new Map<string, VisionCapableModel>()
  params.modelCacheState.visionCapableModelsCache = visionCapableModelsCache
  visionCapableModelsCache.clear()
  setVisionCapableModelsCache(visionCapableModelsCache)

  if (!providers) return;

  for (const [providerID, providerConfig] of Object.entries(providers)) {
    const models = providerConfig?.models;
    if (!models) continue;

    for (const [modelID, modelConfig] of Object.entries(models)) {
      if (supportsImageInput(modelConfig)) {
        visionCapableModelsCache.set(
          `${providerID}/${modelID}`,
          { providerID, modelID },
        )
      }

      const contextLimit = modelConfig?.limit?.context;
      if (!contextLimit) continue;

      modelContextLimitsCache.set(
        `${providerID}/${modelID}`,
        contextLimit,
      );
    }
  }
}

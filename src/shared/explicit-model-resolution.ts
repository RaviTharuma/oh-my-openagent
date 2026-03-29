import { resolveModelIDAlias } from "./model-capability-aliases"
import { detectHeuristicModelFamily } from "./model-capability-heuristics"
import { normalizeModelFormat } from "./model-format-normalizer"
import { fuzzyMatchModel } from "./model-availability"
import { normalizeModel, normalizeModelID } from "./model-normalization"
import { transformModelForProvider } from "./provider-model-id-transform"

function canonicalizeExplicitModelID(modelID: string): string {
  return resolveModelIDAlias(modelID).canonicalModelID
}

function isFloatingFamilyAlias(modelID: string): boolean {
  const normalizedModelID = normalizeModelID(modelID.trim().toLowerCase())
  const family = detectHeuristicModelFamily(normalizedModelID)?.family
  return family !== undefined && normalizedModelID === family
}

export function resolveExplicitModel(
  explicitModel: string | undefined,
  input: { availableModels: Set<string> },
): string | undefined {
  const normalizedModel = normalizeModel(explicitModel)
  if (!normalizedModel) {
    return undefined
  }

  const parsedModel = normalizeModelFormat(normalizedModel)
  if (!parsedModel) {
    const canonicalModelID = canonicalizeExplicitModelID(normalizedModel)
    if (input.availableModels.size > 0) {
      const match = fuzzyMatchModel(canonicalModelID, input.availableModels)
      if (match) {
        return match
      }
    }

    return canonicalModelID
  }

  const providerID = parsedModel.providerID.trim().toLowerCase()
  const canonicalModelID = canonicalizeExplicitModelID(parsedModel.modelID)
  const allowFamilyFallback = isFloatingFamilyAlias(canonicalModelID)

  if (input.availableModels.size > 0) {
    const directMatch = fuzzyMatchModel(
      `${providerID}/${canonicalModelID}`,
      input.availableModels,
      [providerID],
    )
    if (directMatch) {
      return directMatch
    }
  }

  const transformedModelID = transformModelForProvider(providerID, canonicalModelID, {
    allowFamilyFallback,
  })

  if (input.availableModels.size > 0) {
    const transformedMatch = fuzzyMatchModel(
      `${providerID}/${transformedModelID}`,
      input.availableModels,
      [providerID],
    )
    if (transformedMatch) {
      return transformedMatch
    }
  }

  return `${providerID}/${transformedModelID}`
}

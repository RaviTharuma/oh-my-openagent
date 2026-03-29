import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import * as shared from "../shared"
import { buildPrometheusAgentConfig } from "./prometheus-agent-config-builder"

describe("buildPrometheusAgentConfig", () => {
  afterEach(() => {
    mock.restore()
  })

  test("keeps user category model pins stable for prometheus", async () => {
    const fetchSpy = spyOn(shared, "fetchAvailableModels").mockResolvedValue(
      new Set(["openai/gpt-5.4"]),
    )
    const connectedProvidersSpy = spyOn(shared, "readConnectedProvidersCache").mockReturnValue([
      "openai",
    ])

    const result = await buildPrometheusAgentConfig({
      configAgentPlan: undefined,
      pluginPrometheusOverride: { category: "ultrabrain" },
      userCategories: {
        ultrabrain: {
          model: "openai/gpt-5",
        },
      } as Record<string, any>,
      currentModel: "anthropic/claude-opus-4-6",
    })

    fetchSpy.mockRestore()
    connectedProvidersSpy.mockRestore()

    expect(result.model).toBe("openai/gpt-5")
  })
})

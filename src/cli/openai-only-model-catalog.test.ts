import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import * as providerModelTransform from "../shared/provider-model-id-transform"
import { applyOpenAiOnlyModelCatalog } from "./openai-only-model-catalog"

describe("applyOpenAiOnlyModelCatalog", () => {
  afterEach(() => {
    mock.restore()
  })

  test("uses provider model transforms instead of fixed version strings", () => {
    const transformSpy = spyOn(
      providerModelTransform,
      "transformModelForProvider",
    ).mockImplementation((provider: string, model: string) => {
      if (provider !== "openai") {
        return model
      }

      if (model === "gpt-5") {
        return "gpt-5.7"
      }

      if (model === "gpt-5-mini") {
        return "gpt-5.7-mini"
      }

      return model
    })

    const result = applyOpenAiOnlyModelCatalog({
      agents: {},
      categories: {},
    } as any)

    transformSpy.mockRestore()

    expect(result.agents.explore).toEqual({ model: "openai/gpt-5.7", variant: "medium" })
    expect(result.agents.librarian).toEqual({ model: "openai/gpt-5.7", variant: "medium" })
    expect(result.categories.artistry).toEqual({ model: "openai/gpt-5.7", variant: "xhigh" })
    expect(result.categories.quick).toEqual({ model: "openai/gpt-5.7-mini" })
    expect(result.categories["visual-engineering"]).toEqual({
      model: "openai/gpt-5.7",
      variant: "high",
    })
    expect(result.categories.writing).toEqual({ model: "openai/gpt-5.7", variant: "medium" })
  })
})

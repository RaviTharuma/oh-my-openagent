/**
 * Model migration map: legacy version-pinned model strings → stable provider aliases.
 *
 * The goal is to stop baking exact Anthropic point releases into user config.
 * Runtime resolution can then map the stable alias to whatever concrete provider
 * model is currently available via cache/metadata.
 */
export const MODEL_VERSION_MAP: Record<string, string> = {
  "anthropic/claude-opus-4-5": "anthropic/claude-opus",
  "anthropic/claude-sonnet-4-5": "anthropic/claude-sonnet",
}

function migrationKey(oldModel: string, newModel: string): string {
  return `model-version:${oldModel}->${newModel}`
}

const LEGACY_MIGRATION_KEYS: Record<string, string[]> = {
  "anthropic/claude-opus-4-5": [
    migrationKey("anthropic/claude-opus-4-5", "anthropic/claude-opus-4-6"),
  ],
  "anthropic/claude-sonnet-4-5": [
    migrationKey("anthropic/claude-sonnet-4-5", "anthropic/claude-sonnet-4-6"),
  ],
}

function hasAppliedMigration(appliedMigrations: Set<string> | undefined, oldModel: string, newModel: string): boolean {
  if (!appliedMigrations) return false

  const currentKey = migrationKey(oldModel, newModel)
  if (appliedMigrations.has(currentKey)) {
    return true
  }

  const legacyKeys = LEGACY_MIGRATION_KEYS[oldModel] ?? []
  return legacyKeys.some((key) => appliedMigrations.has(key))
}

export function migrateModelVersions(
  configs: Record<string, unknown>,
  appliedMigrations?: Set<string>
): { migrated: Record<string, unknown>; changed: boolean; newMigrations: string[] } {
  const migrated: Record<string, unknown> = {}
  let changed = false
  const newMigrations: string[] = []

  for (const [key, value] of Object.entries(configs)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const config = value as Record<string, unknown>
      if (typeof config.model === "string" && MODEL_VERSION_MAP[config.model]) {
        const oldModel = config.model
        const newModel = MODEL_VERSION_MAP[oldModel]
        const mKey = migrationKey(oldModel, newModel)

        // Skip if this migration was already applied (user may have reverted)
        if (hasAppliedMigration(appliedMigrations, oldModel, newModel)) {
          migrated[key] = value
          continue
        }

        migrated[key] = { ...config, model: newModel }
        changed = true
        newMigrations.push(mKey)
        continue
      }
    }
    migrated[key] = value
  }

  return { migrated, changed, newMigrations }
}

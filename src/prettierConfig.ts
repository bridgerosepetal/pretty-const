import type { PrettierContext } from './types'

export async function resolveProjectPrettierOptions(
	prettierContext: PrettierContext,
): Promise<Record<string, unknown> | undefined> {
	if (!prettierContext.module.resolveConfig || !prettierContext.documentPath) {
		return undefined
	}

	return (
		(await prettierContext.module.resolveConfig(prettierContext.documentPath, {
			editorconfig: true,
		})) ?? undefined
	)
}

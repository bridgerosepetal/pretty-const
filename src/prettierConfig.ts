import type { PrettierContext } from './types'

export async function resolvePrettierConfig(
	prettierContext: PrettierContext,
): Promise<Record<string, unknown> | undefined> {
	if (!prettierContext.module.resolveConfig || !prettierContext.documentPath) {
		return undefined
	}

	const resolvedConfig = await prettierContext.module.resolveConfig(
		prettierContext.documentPath,
		{
			editorconfig: true,
		},
	)

	return resolvedConfig ?? undefined
}

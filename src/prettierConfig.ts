import * as path from 'node:path'
import type { PrettierContext } from './types'

export async function resolvePrettierConfig(
	prettierContext: PrettierContext,
): Promise<Record<string, unknown> | undefined> {
	if (!prettierContext.module.resolveConfig) {
		return undefined
	}

	for (const configSearchPath of getConfigSearchPaths(prettierContext)) {
		const resolvedConfig = await prettierContext.module.resolveConfig(
			configSearchPath,
			{
				editorconfig: true,
				useCache: false,
			},
		)

		if (resolvedConfig) {
			return resolvedConfig
		}
	}

	return undefined
}

function getConfigSearchPaths(prettierContext: PrettierContext): string[] {
	const searchPaths = [
		prettierContext.documentPath,
		prettierContext.workspaceFolderPath
			? path.join(prettierContext.workspaceFolderPath, '.prettier-config-probe.js')
			: undefined,
	].filter((searchPath): searchPath is string => Boolean(searchPath))

	return [...new Set(searchPaths)]
}

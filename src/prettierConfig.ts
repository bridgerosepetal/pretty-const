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
			return withoutJsIrrelevantOptions(resolvedConfig)
		}
	}

	return undefined
}

// Const blocks are always formatted with the babel parser. A `parser` override for
// *.pug/*.jade would break that, and `plugins` (e.g. @prettier/plugin-pug) are resolved
// from the extension host's cwd, so Prettier fails to load them and every format throws.
function withoutJsIrrelevantOptions(
	config: Record<string, unknown>,
): Record<string, unknown> {
	const { parser: _parser, plugins: _plugins, ...options } = config
	return options
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

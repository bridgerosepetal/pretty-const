import { applySelectionIndent } from './selection'
import type { PreparedSelection, PrettierModule } from './types'

const WRAP_CONST_NAME = '__prettierConstSelection'

export async function formatPreparedSelection(
	prettier: PrettierModule,
	prepared: PreparedSelection,
	options: Record<string, unknown>,
): Promise<string> {
	if (prepared.kind === 'const') {
		const formatted = await prettier.format(ensureStatement(prepared.source), options)
		return (
			applySelectionIndent(stripTrailingNewline(formatted), prepared) +
			prepared.suffix
		)
	}

	const wrapped = `const ${WRAP_CONST_NAME} = ${ensureStatement(prepared.source)}`
	const formatted = await prettier.format(wrapped, options)
	const initializer = extractInitializer(stripTrailingNewline(formatted))
	return applySelectionIndent(initializer, prepared) + prepared.suffix
}

function ensureStatement(source: string): string {
	return /;\s*$/u.test(source) ? source : `${source};`
}

function extractInitializer(formattedDeclaration: string): string {
	const firstLinePrefix = `const ${WRAP_CONST_NAME} = `
	if (!formattedDeclaration.startsWith(firstLinePrefix)) {
		throw new Error(
			'Prettier returned an unexpected result for the selected initializer.',
		)
	}

	const withoutConst = formattedDeclaration.slice(firstLinePrefix.length)
	return withoutConst.replace(/;\s*$/u, '')
}

function stripTrailingNewline(source: string): string {
	return source.replace(/\r?\n$/u, '')
}

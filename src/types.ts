export type PrettierModule = {
	format(source: string, options: Record<string, unknown>): Promise<string> | string
	resolveConfig?(
		filePath: string,
		options?: { editorconfig?: boolean },
	): Promise<Record<string, unknown> | null> | Record<string, unknown> | null
}

export type SelectionKind = 'const' | 'initializer'

export type PreparedSelection = {
	kind: SelectionKind
	source: string
	prefix: string
	suffix: string
	baseIndent: string
	firstContinuationIndent?: string
}

export type PrettierContext = {
	module: PrettierModule
	source: 'workspace' | 'bundled'
	documentPath?: string
}

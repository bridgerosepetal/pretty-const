import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'
import * as vscode from 'vscode'
import type { PrettierContext, PrettierModule } from './types'

export async function loadPrettier(documentUri: vscode.Uri): Promise<PrettierContext> {
	const documentPath = documentUri.scheme === 'file' ? documentUri.fsPath : undefined
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri)
	const searchDirectory = documentPath
		? path.dirname(documentPath)
		: workspaceFolder?.uri.fsPath
	const localPrettier = searchDirectory ? findLocalPrettier(searchDirectory) : undefined

	if (localPrettier) {
		const requireFromWorkspace = createRequire(localPrettier)
		return {
			module: requireFromWorkspace('prettier') as PrettierModule,
			source: 'workspace',
			documentPath,
		}
	}

	return {
		module: await import('prettier'),
		source: 'bundled',
		documentPath,
	}
}

export async function buildPrettierOptions(
	editor: vscode.TextEditor,
	prettierContext: PrettierContext,
): Promise<Record<string, unknown>> {
	const baseOptions: Record<string, unknown> = {
		parser: 'babel',
	}

	if (
		prettierContext.source === 'workspace' &&
		prettierContext.module.resolveConfig &&
		prettierContext.documentPath
	) {
		const resolvedConfig = await prettierContext.module.resolveConfig(
			prettierContext.documentPath,
			{
				editorconfig: true,
			},
		)

		return {
			...baseOptions,
			...(resolvedConfig ?? {}),
		}
	}

	return {
		...baseOptions,
		...optionsFromVsCode(editor),
	}
}

function findLocalPrettier(startDirectory: string): string | undefined {
	let directory = startDirectory

	while (true) {
		const packagePath = path.join(
			directory,
			'node_modules',
			'prettier',
			'package.json',
		)
		if (fs.existsSync(packagePath)) {
			return packagePath
		}

		const parent = path.dirname(directory)
		if (parent === directory) {
			return undefined
		}

		directory = parent
	}
}

function optionsFromVsCode(editor: vscode.TextEditor): Record<string, unknown> {
	const editorConfig = vscode.workspace.getConfiguration('editor', editor.document.uri)
	const prettierConfig = vscode.workspace.getConfiguration(
		'prettier',
		editor.document.uri,
	)
	const insertSpaces = editor.options.insertSpaces
	const tabSize = editor.options.tabSize
	const editorTabWidth = typeof tabSize === 'number' ? tabSize : 2

	return {
		printWidth: getNumber(
			prettierConfig.get('printWidth'),
			getNumber(editorConfig.get('wordWrapColumn'), 80),
		),
		tabWidth: getNumber(prettierConfig.get('tabWidth'), editorTabWidth),
		useTabs: getBoolean(prettierConfig.get('useTabs'), insertSpaces === false),
		semi: getBoolean(prettierConfig.get('semi'), true),
		singleQuote: getBoolean(prettierConfig.get('singleQuote'), false),
		trailingComma: getString(prettierConfig.get('trailingComma'), 'all'),
		bracketSpacing: getBoolean(prettierConfig.get('bracketSpacing'), true),
		bracketSameLine: getBoolean(prettierConfig.get('bracketSameLine'), false),
		arrowParens: getString(prettierConfig.get('arrowParens'), 'always'),
		endOfLine: getString(prettierConfig.get('endOfLine'), 'lf'),
	}
}

function getNumber(value: unknown, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value) && value > 0
		? value
		: fallback
}

function getBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback
}

function getString(value: unknown, fallback: string): string {
	return typeof value === 'string' && value.length > 0 ? value : fallback
}

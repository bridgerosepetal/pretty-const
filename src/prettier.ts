import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'
import * as vscode from 'vscode'
import { resolvePrettierConfig } from './prettierConfig'
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
			workspaceFolderPath: workspaceFolder?.uri.fsPath,
		}
	}

	return {
		module: await import('prettier'),
		source: 'bundled',
		documentPath,
		workspaceFolderPath: workspaceFolder?.uri.fsPath,
	}
}

export async function buildPrettierOptions(
	editor: vscode.TextEditor,
	prettierContext: PrettierContext,
): Promise<Record<string, unknown>> {
	return buildPrettierOptionsForDocument(editor.document, prettierContext, editor)
}

export async function buildPrettierOptionsForDocument(
	document: vscode.TextDocument,
	prettierContext: PrettierContext,
	editor?: vscode.TextEditor,
): Promise<Record<string, unknown>> {
	const baseOptions: Record<string, unknown> = {
		parser: 'babel',
	}

	const resolvedConfig = await resolvePrettierConfig(prettierContext)
	if (resolvedConfig) {
		return {
			...baseOptions,
			...resolvedConfig,
		}
	}

	return {
		...baseOptions,
		...optionsFromVsCode(document, editor),
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

function optionsFromVsCode(
	document: vscode.TextDocument,
	editor?: vscode.TextEditor,
): Record<string, unknown> {
	const editorConfig = vscode.workspace.getConfiguration('editor', document.uri)
	const prettierConfig = vscode.workspace.getConfiguration('prettier', document.uri)
	const insertSpaces = editor?.options.insertSpaces ?? editorConfig.get('insertSpaces')
	const tabSize = editor?.options.tabSize ?? editorConfig.get('tabSize')
	const editorTabWidth = getNumber(tabSize, 2)

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

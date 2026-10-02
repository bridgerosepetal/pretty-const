import * as path from 'node:path'
import * as vscode from 'vscode'
import { findJadeConstReplacements } from './jadeConstFormatter'
import { buildPrettierOptionsForDocument, loadPrettier } from './prettier'

const JADE_LANGUAGE_IDS = new Set(['jade', 'pug'])
const JADE_FILE_EXTENSIONS = new Set(['.jade', '.pug'])

export function registerFormatJadeConstOnSave(): vscode.Disposable {
	return vscode.workspace.onWillSaveTextDocument(event => {
		if (!isJadeDocument(event.document) || !isFormatOnSaveEnabled(event.document)) {
			return
		}

		event.waitUntil(buildJadeConstTextEdits(event.document))
	})
}

export async function buildJadeConstTextEdits(
	document: vscode.TextDocument,
): Promise<vscode.TextEdit[]> {
	try {
		const prettierContext = await loadPrettier(document.uri)
		const editor = vscode.window.visibleTextEditors.find(
			visibleEditor =>
				visibleEditor.document.uri.toString() === document.uri.toString(),
		)
		const options = await buildPrettierOptionsForDocument(
			document,
			prettierContext,
			editor,
		)
		const replacements = await findJadeConstReplacements(
			document.getText(),
			prettierContext.module,
			options,
		)

		return replacements.map(replacement =>
			vscode.TextEdit.replace(
				new vscode.Range(
					replacement.start.line,
					replacement.start.character,
					replacement.end.line,
					replacement.end.character,
				),
				replacement.formatted,
			),
		)
	} catch {
		return []
	}
}

export function isJadeDocument(document: vscode.TextDocument): boolean {
	if (JADE_LANGUAGE_IDS.has(document.languageId)) {
		return true
	}

	if (document.uri.scheme !== 'file') {
		return false
	}

	return JADE_FILE_EXTENSIONS.has(path.extname(document.uri.fsPath).toLowerCase())
}

function isFormatOnSaveEnabled(document: vscode.TextDocument): boolean {
	return vscode.workspace
		.getConfiguration('prettyConst', document.uri)
		.get<boolean>('formatOnSave', true)
}

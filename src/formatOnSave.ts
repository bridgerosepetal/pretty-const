import * as vscode from 'vscode'
import { formatPreparedSelection } from './format'
import { buildPrettierOptionsForDocument, loadPrettier } from './prettier'
import { prepareSelection } from './selection'
import type { PrettierModule } from './types'

const JADE_LANGUAGE_IDS = new Set(['jade', 'pug'])
const JADE_FILE_EXTENSIONS = new Set(['.jade', '.pug'])

export function registerFormatJadeConstOnSave(): vscode.Disposable {
	return vscode.workspace.onWillSaveTextDocument(event => {
		if (!isJadeDocument(event.document)) {
			return
		}

		event.waitUntil(formatJadeConstBlocks(event.document))
	})
}

async function formatJadeConstBlocks(
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
		const edits: vscode.TextEdit[] = []
		let lineIndex = 0

		while (lineIndex < document.lineCount) {
			const startLine = document.lineAt(lineIndex)
			const startMatch = startLine.text.match(/^([ \t]*)-\s*const\b/u)

			if (!startMatch) {
				lineIndex += 1
				continue
			}

			const maxEndLine = findMaxCandidateEndLine(document, lineIndex, startMatch[1])
			const accepted = await findFirstFormattableBlock(
				document,
				prettierContext.module,
				options,
				lineIndex,
				maxEndLine,
			)

			if (!accepted) {
				lineIndex += 1
				continue
			}

			if (accepted.formatted !== accepted.original) {
				edits.push(vscode.TextEdit.replace(accepted.range, accepted.formatted))
			}

			lineIndex = accepted.range.end.line + 1
		}

		return edits
	} catch {
		return []
	}
}

async function findFirstFormattableBlock(
	document: vscode.TextDocument,
	prettier: PrettierModule,
	options: Record<string, unknown>,
	startLineIndex: number,
	maxEndLine: number,
): Promise<
	| {
			range: vscode.Range
			original: string
			formatted: string
	  }
	| undefined
> {
	for (
		let endLineIndex = startLineIndex;
		endLineIndex <= maxEndLine;
		endLineIndex += 1
	) {
		const range = new vscode.Range(
			startLineIndex,
			0,
			endLineIndex,
			document.lineAt(endLineIndex).text.length,
		)
		const text = document.getText(range)
		const formatted = await tryFormatBlock(prettier, text, options)

		if (!formatted) {
			continue
		}

		return {
			range,
			original: text,
			formatted,
		}
	}

	return undefined
}

async function tryFormatBlock(
	prettier: PrettierModule,
	text: string,
	options: Record<string, unknown>,
): Promise<string | undefined> {
	const prepared = prepareSelection(text)
	if (!prepared || prepared.kind !== 'const') {
		return undefined
	}

	try {
		return await formatPreparedSelection(prettier, prepared, options)
	} catch {
		return undefined
	}
}

function findMaxCandidateEndLine(
	document: vscode.TextDocument,
	startLineIndex: number,
	baseIndent: string,
): number {
	let endLineIndex = startLineIndex

	for (
		let lineIndex = startLineIndex + 1;
		lineIndex < document.lineCount;
		lineIndex += 1
	) {
		const line = document.lineAt(lineIndex).text
		const trimmed = line.trim()

		if (trimmed.length > 0 && getIndent(line).length <= baseIndent.length) {
			break
		}

		endLineIndex = lineIndex
	}

	return endLineIndex
}

function isJadeDocument(document: vscode.TextDocument): boolean {
	if (JADE_LANGUAGE_IDS.has(document.languageId)) {
		return true
	}

	if (document.uri.scheme !== 'file') {
		return false
	}

	return JADE_FILE_EXTENSIONS.has(
		document.uri.fsPath.slice(document.uri.fsPath.lastIndexOf('.')),
	)
}

function getIndent(line: string): string {
	return line.match(/^[ \t]*/u)?.[0] ?? ''
}

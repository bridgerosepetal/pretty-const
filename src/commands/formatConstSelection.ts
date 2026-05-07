import * as vscode from 'vscode'
import { formatPreparedSelection } from '../format'
import { buildJadeConstTextEdits, isJadeDocument } from '../formatOnSave'
import { buildPrettierOptions, loadPrettier } from '../prettier'
import { prepareSelection } from '../selection'

export function registerFormatConstSelectionCommand(): vscode.Disposable {
	return vscode.commands.registerCommand('prettyConst.format', formatConstSelection)
}

async function formatConstSelection(): Promise<void> {
	const editor = vscode.window.activeTextEditor
	if (!editor) {
		return
	}

	const selection = editor.selection
	if (selection.isEmpty) {
		await formatWholeDocument(editor)
		return
	}

	const selectedText = editor.document.getText(selection)
	const prepared = prepareSelection(selectedText)
	if (!prepared) {
		vscode.window.showWarningMessage(
			"Selection must be a const declaration, Jade '- const ...', or an object/array initializer.",
		)
		return
	}

	try {
		const prettierContext = await loadPrettier(editor.document.uri)
		const options = await buildPrettierOptions(editor, prettierContext)
		const formatted = await formatPreparedSelection(
			prettierContext.module,
			prepared,
			options,
		)

		await editor.edit(editBuilder => {
			editBuilder.replace(selection, formatted)
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		vscode.window.showErrorMessage(`Could not format selected const: ${message}`)
	}
}

async function formatWholeDocument(editor: vscode.TextEditor): Promise<void> {
	if (!isJadeDocument(editor.document)) {
		vscode.window.showWarningMessage(
			'Open a Jade/Pug file or select a const declaration/object initializer first.',
		)
		return
	}

	const edits = await buildJadeConstTextEdits(editor.document)
	if (edits.length === 0) {
		vscode.window.showInformationMessage(
			'No unambiguous Jade const objects to format.',
		)
		return
	}

	await editor.edit(editBuilder => {
		for (const edit of edits) {
			editBuilder.replace(edit.range, edit.newText)
		}
	})
}

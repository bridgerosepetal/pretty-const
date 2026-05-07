import * as vscode from 'vscode'
import { formatPreparedSelection } from '../format'
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
		vscode.window.showWarningMessage(
			'Select a const declaration or object/array initializer first.',
		)
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

import * as vscode from 'vscode'
import { registerFormatConstSelectionCommand } from './commands/formatConstSelection'
import { registerFormatJadeConstOnSave } from './formatOnSave'

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		registerFormatConstSelectionCommand(),
		registerFormatJadeConstOnSave(),
	)
}

export function deactivate(): void {
	// Nothing to clean up.
}

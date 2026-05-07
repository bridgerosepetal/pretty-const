import * as vscode from 'vscode'
import { registerFormatConstSelectionCommand } from './commands/formatConstSelection'

export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(registerFormatConstSelectionCommand())
}

export function deactivate(): void {
	// Nothing to clean up.
}

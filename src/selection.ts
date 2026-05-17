import type { PreparedSelection } from './types'

export function prepareSelection(selectedText: string): PreparedSelection | undefined {
	const trimmedEnd = selectedText.replace(/\s+$/u, '')
	const suffix = selectedText.slice(trimmedEnd.length)
	const withoutLeadingBlankLines = trimmedEnd.replace(/^\s*\r?\n/u, '')
	const leadingBlank = trimmedEnd.slice(
		0,
		trimmedEnd.length - withoutLeadingBlankLines.length,
	)
	const firstLineMatch = withoutLeadingBlankLines.match(/^([ \t]*(?:-\s*)?)([\s\S]*)$/u)
	if (!firstLineMatch) {
		return undefined
	}

	const [, prefix, body] = firstLineMatch
	const baseIndentMatch = prefix.match(/^[ \t]*/u)
	const baseIndent = baseIndentMatch?.[0] ?? ''
	const candidate = dedentContinuationLines(body.trimStart(), baseIndent)
	const firstContinuationIndent = getFirstContinuationIndent(
		withoutLeadingBlankLines,
		baseIndent,
	)

	if (/^const\b/u.test(candidate)) {
		return {
			kind: 'const',
			source: candidate,
			prefix: leadingBlank + prefix,
			suffix,
			baseIndent,
			firstContinuationIndent,
		}
	}

	if (/^[{[]/u.test(candidate)) {
		return {
			kind: 'initializer',
			source: candidate,
			prefix: leadingBlank + prefix,
			suffix,
			baseIndent,
			firstContinuationIndent,
		}
	}

	return undefined
}

export function applySelectionIndent(
	formatted: string,
	prepared: PreparedSelection,
): string {
	const lines = formatted.split(/\r?\n/u)
	const [firstLine = '', ...remainingLines] = lines

	if (remainingLines.length === 0) {
		return prepared.prefix + firstLine
	}

	const formattedFirstContinuationIndent = getFirstIndent(remainingLines) ?? ''
	const indentPadding = prepared.firstContinuationIndent
		? getIndentPadding(
				prepared.firstContinuationIndent,
				formattedFirstContinuationIndent,
			)
		: prepared.baseIndent

	return [
		prepared.prefix + firstLine,
		...remainingLines.map(line =>
			line.trim().length === 0 ? prepared.baseIndent : indentPadding + line,
		),
	].join('\n')
}

function getFirstContinuationIndent(
	source: string,
	baseIndent: string,
): string | undefined {
	const [, ...remainingLines] = source.split(/\r?\n/u)
	const firstIndent = getFirstIndent(remainingLines)

	if (!firstIndent || firstIndent.length <= baseIndent.length) {
		return undefined
	}

	return firstIndent
}

function dedentContinuationLines(source: string, baseIndent: string): string {
	if (baseIndent.length === 0) {
		return source
	}

	const [firstLine = '', ...remainingLines] = source.split(/\r?\n/u)
	return [
		firstLine,
		...remainingLines.map(line =>
			line.startsWith(baseIndent) ? line.slice(baseIndent.length) : line,
		),
	].join('\n')
}

function getFirstIndent(lines: string[]): string | undefined {
	const firstContentLine = lines.find(line => line.trim().length > 0)
	return firstContentLine?.match(/^[ \t]*/u)?.[0]
}

function getIndentPadding(originalIndent: string, formattedIndent: string): string {
	if (originalIndent.endsWith(formattedIndent)) {
		return originalIndent.slice(0, originalIndent.length - formattedIndent.length)
	}

	return originalIndent
}

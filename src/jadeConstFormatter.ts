import { formatPreparedSelection } from './format'
import { prepareSelection } from './selection'
import type { PrettierModule } from './types'

export type TextPosition = {
	line: number
	character: number
}

export type TextReplacement = {
	start: TextPosition
	end: TextPosition
	original: string
	formatted: string
}

export async function findJadeConstReplacements(
	text: string,
	prettier: PrettierModule,
	options: Record<string, unknown>,
): Promise<TextReplacement[]> {
	const lines = splitLines(text)
	const replacements: TextReplacement[] = []
	let lineIndex = 0

	while (lineIndex < lines.length) {
		const startLine = lines[lineIndex]
		const startMatch = startLine.match(/^([ \t]*)-\s*const\b/u)

		if (startMatch) {
			const accepted = await findFirstFormattableBlock(
				lines,
				prettier,
				options,
				lineIndex,
				findMaxCandidateEndLine(lines, lineIndex, startMatch[1]),
			)

			if (accepted) {
				if (accepted.formatted !== accepted.original) {
					replacements.push(accepted)
				}

				lineIndex = accepted.end.line + 1
				continue
			}

			lineIndex += 1
			continue
		}

		const codeBlockMatch = startLine.match(/^([ \t]*)-\s*$/u)
		if (!codeBlockMatch) {
			lineIndex += 1
			continue
		}

		const codeBlock = await findCodeBlockReplacements(
			lines,
			prettier,
			options,
			lineIndex,
			codeBlockMatch[1],
		)
		replacements.push(...codeBlock.replacements)
		lineIndex = codeBlock.nextLineIndex
	}

	return replacements
}

async function findCodeBlockReplacements(
	lines: string[],
	prettier: PrettierModule,
	options: Record<string, unknown>,
	codeBlockStartLineIndex: number,
	codeBlockIndent: string,
): Promise<{ replacements: TextReplacement[]; nextLineIndex: number }> {
	const replacements: TextReplacement[] = []
	let lineIndex = codeBlockStartLineIndex + 1

	while (lineIndex < lines.length) {
		const line = lines[lineIndex]
		const trimmed = line.trim()

		if (trimmed.length > 0 && getIndent(line).length <= codeBlockIndent.length) {
			break
		}

		const constMatch = line.match(/^([ \t]*)const\b/u)
		if (!constMatch) {
			lineIndex += 1
			continue
		}

		const accepted = await findFirstFormattableBlock(
			lines,
			prettier,
			options,
			lineIndex,
			findMaxCandidateEndLine(lines, lineIndex, constMatch[1]),
		)

		if (!accepted) {
			lineIndex += 1
			continue
		}

		if (accepted.formatted !== accepted.original) {
			replacements.push(accepted)
		}

		lineIndex = accepted.end.line + 1
	}

	return {
		replacements,
		nextLineIndex: lineIndex,
	}
}

export function applyTextReplacements(
	text: string,
	replacements: TextReplacement[],
): string {
	const lines = splitLines(text)

	for (const replacement of [...replacements].sort(
		(left, right) => right.start.line - left.start.line,
	)) {
		const formattedLines = replacement.formatted.split(/\r?\n/u)
		lines.splice(
			replacement.start.line,
			replacement.end.line - replacement.start.line + 1,
			...formattedLines,
		)
	}

	return lines.join('\n')
}

async function findFirstFormattableBlock(
	lines: string[],
	prettier: PrettierModule,
	options: Record<string, unknown>,
	startLineIndex: number,
	maxEndLine: number,
): Promise<TextReplacement | undefined> {
	for (
		let endLineIndex = startLineIndex;
		endLineIndex <= maxEndLine;
		endLineIndex += 1
	) {
		const original = lines.slice(startLineIndex, endLineIndex + 1).join('\n')
		const formatted = await tryFormatBlock(prettier, original, options)

		if (!formatted) {
			continue
		}

		return {
			start: {
				line: startLineIndex,
				character: 0,
			},
			end: {
				line: endLineIndex,
				character: lines[endLineIndex].length,
			},
			original,
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

	if (!isObjectOrArrayConst(prepared.source)) {
		return undefined
	}

	try {
		return await formatPreparedSelection(prettier, prepared, options)
	} catch {
		return undefined
	}
}

function findMaxCandidateEndLine(
	lines: string[],
	startLineIndex: number,
	baseIndent: string,
): number {
	let endLineIndex = startLineIndex

	for (let lineIndex = startLineIndex + 1; lineIndex < lines.length; lineIndex += 1) {
		const line = lines[lineIndex]
		const trimmed = line.trim()
		const isSameOrOuterIndent =
			trimmed.length > 0 && getIndent(line).length <= baseIndent.length

		if (isSameOrOuterIndent && !isClosingContinuation(trimmed)) {
			break
		}

		endLineIndex = lineIndex
	}

	return endLineIndex
}

function splitLines(text: string): string[] {
	return text.replace(/\r\n/gu, '\n').split('\n')
}

function getIndent(line: string): string {
	return line.match(/^[ \t]*/u)?.[0] ?? ''
}

function isObjectOrArrayConst(source: string): boolean {
	return /^\s*const\b[\s\S]*=\s*[{[]/u.test(source)
}

function isClosingContinuation(trimmedLine: string): boolean {
	return /^[\])}]/u.test(trimmedLine)
}

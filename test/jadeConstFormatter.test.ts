import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, it } from 'node:test'
import prettier from 'prettier'
import {
	applyTextReplacements,
	findJadeConstReplacements,
} from '../src/jadeConstFormatter'

const fixtureDirectory = path.join(process.cwd(), 'test', 'fixtures')

const options = {
	parser: 'babel',
	printWidth: 50,
	tabWidth: 4,
	useTabs: true,
	semi: false,
	singleQuote: true,
	trailingComma: 'all',
	arrowParens: 'avoid',
	bracketSpacing: true,
	bracketSameLine: true,
	endOfLine: 'lf',
}

describe('Jade const formatting', () => {
	for (const fixtureName of [
		'single-line',
		'multiple-consts',
		'multiline',
		'ambiguous',
		'nested',
		'code-block',
	]) {
		it(`formats ${fixtureName}.jade`, async () => {
			const input = await readFixture(`${fixtureName}.input.jade`)
			const expected = await readFixture(`${fixtureName}.expected.jade`)
			const replacements = await findJadeConstReplacements(input, prettier, options)

			assert.equal(applyTextReplacements(input, replacements), expected)
		})
	}

	it('does not keep shifting template literal content indentation', async () => {
		const input = [
			'-',
			'  const a = {',
			'    text: `',
			'      some text',
			'    `',
			'  }',
		].join('\n')
		const expected = input
		const firstPass = applyTextReplacements(
			input,
			await findJadeConstReplacements(input, prettier, {
				...options,
				tabWidth: 2,
				useTabs: false,
				trailingComma: 'none',
			}),
		)
		const secondPass = applyTextReplacements(
			firstPass,
			await findJadeConstReplacements(firstPass, prettier, {
				...options,
				tabWidth: 2,
				useTabs: false,
				trailingComma: 'none',
			}),
		)

		assert.equal(firstPass, expected)
		assert.equal(secondPass, expected)
	})
})

async function readFixture(fileName: string): Promise<string> {
	return (await readFile(path.join(fixtureDirectory, fileName), 'utf8'))
		.replace(/\r\n/gu, '\n')
		.trimEnd()
}

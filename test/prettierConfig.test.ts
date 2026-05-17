import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolveProjectPrettierOptions } from '../src/prettierConfig'
import type { PrettierContext } from '../src/types'

describe('Prettier config resolution', () => {
	it('resolves project config when using bundled Prettier', async () => {
		const context: PrettierContext = {
			source: 'bundled',
			documentPath: '/workspace/src/template.pug',
			module: {
				format: async source => source,
				resolveConfig: async (filePath, options) => {
					assert.equal(filePath, '/workspace/src/template.pug')
					assert.deepEqual(options, { editorconfig: true })

					return {
						trailingComma: 'none',
						singleQuote: true,
					}
				},
			},
		}

		assert.deepEqual(await resolveProjectPrettierOptions(context), {
			trailingComma: 'none',
			singleQuote: true,
		})
	})

	it('falls back when no project config is available', async () => {
		const context: PrettierContext = {
			source: 'bundled',
			documentPath: '/workspace/src/template.pug',
			module: {
				format: async source => source,
				resolveConfig: async () => null,
			},
		}

		assert.equal(await resolveProjectPrettierOptions(context), undefined)
	})
})

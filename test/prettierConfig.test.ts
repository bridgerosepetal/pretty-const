import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resolvePrettierConfig } from '../src/prettierConfig'
import type { PrettierContext } from '../src/types'

describe('Prettier config resolution', () => {
	it('resolves project config when using bundled Prettier', async () => {
		const context: PrettierContext = {
			module: {
				format: source => source,
				resolveConfig: async (filePath, options) => {
					assert.equal(filePath, '/workspace/src/example.jade')
					assert.deepEqual(options, { editorconfig: true })

					return {
						trailingComma: 'none',
					}
				},
			},
			source: 'bundled',
			documentPath: '/workspace/src/example.jade',
		}

		assert.deepEqual(await resolvePrettierConfig(context), {
			trailingComma: 'none',
		})
	})

	it('returns undefined when no project config is found', async () => {
		const context: PrettierContext = {
			module: {
				format: source => source,
				resolveConfig: async () => null,
			},
			source: 'workspace',
			documentPath: '/workspace/src/example.jade',
		}

		assert.equal(await resolvePrettierConfig(context), undefined)
	})
})

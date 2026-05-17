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
					assert.deepEqual(options, { editorconfig: true, useCache: false })

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

	it('falls back to the workspace folder when the document path misses', async () => {
		const searchedPaths: string[] = []
		const context: PrettierContext = {
			module: {
				format: source => source,
				resolveConfig: async filePath => {
					searchedPaths.push(filePath)

					return filePath.replace(/\\/gu, '/') ===
						'/workspace/.prettier-config-probe.js'
						? { semi: false, trailingComma: 'none' }
						: null
				},
			},
			source: 'bundled',
			documentPath: '/workspace/src/example.pug',
			workspaceFolderPath: '/workspace',
		}

		assert.deepEqual(await resolvePrettierConfig(context), {
			semi: false,
			trailingComma: 'none',
		})
		assert.deepEqual(
			searchedPaths.map(searchPath => searchPath.replace(/\\/gu, '/')),
			['/workspace/src/example.pug', '/workspace/.prettier-config-probe.js'],
		)
	})
})

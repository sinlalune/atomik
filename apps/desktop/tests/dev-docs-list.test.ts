import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { listDevDocs, readDevDoc } from '../electron-main/dev-docs'

/** Fixture docs bundle exercising grouping, exclusion, and read rules. */
let root: string
let outside: string

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'atomik-devdocs-'))
  outside = mkdtempSync(join(tmpdir(), 'atomik-outside-'))

  const write = (rel: string, content = `# ${rel}\n`): void => {
    const abs = join(root, ...rel.split('/'))
    mkdirSync(join(abs, '..'), { recursive: true })
    writeFileSync(abs, content)
  }

  write('index.md', '# Docs index\n')
  write('log.md')
  write('docs_source.json', '{}') // generated artifact — excluded
  write('index.html', '<html></html>') // generated artifact — excluded
  write('notes.txt') // extension outside allowlist — excluded
  write('bedrock/00_00-orientation.md')
  write('bedrock/archive/04_04-draft.md')
  write('adr/ADR-001-example.md')
  write('diagrams/index.md')
  write('diagrams/D01_figure.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>')
  write('contracts/example_contract.json', '{"rules": []}')
  write('experiments/new-area.md') // unknown folder must still surface

  writeFileSync(join(outside, 'secret.md'), '# outside the bundle\n')
  symlinkSync(join(outside, 'secret.md'), join(root, 'bedrock', 'leak.md'))
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(outside, { recursive: true, force: true })
})

describe('listDevDocs', () => {
  it('groups files by top-level folder in the documented order', () => {
    const groups = listDevDocs(root)
    expect(groups.map((g) => g.id)).toEqual([
      '.',
      'bedrock',
      'adr',
      'contracts',
      'diagrams',
      'experiments'
    ])
  })

  it('excludes generated artifacts and non-allowlisted extensions', () => {
    const rootEntries = listDevDocs(root)
      .find((g) => g.id === '.')!
      .entries.map((e) => e.relPath)
    expect(rootEntries).toEqual(['index.md', 'log.md'])
  })

  it('lists nested files with group-relative labels, hides diagram svg assets', () => {
    const groups = listDevDocs(root)
    const bedrock = groups.find((g) => g.id === 'bedrock')!
    expect(bedrock.entries.map((e) => e.label)).toContain('archive/04_04-draft.md')
    const diagrams = groups.find((g) => g.id === 'diagrams')!
    expect(diagrams.entries.map((e) => e.relPath)).toEqual(['diagrams/index.md'])
  })
})

describe('readDevDoc', () => {
  it('reads an allowlisted file with its kind', () => {
    const file = readDevDoc(root, 'contracts/example_contract.json')
    expect(file.kind).toBe('json')
    expect(file.content).toContain('rules')
  })

  it('throws on rejected paths', () => {
    expect(() => readDevDoc(root, '../outside.md')).toThrow()
    expect(() => readDevDoc(root, 'notes.txt')).toThrow()
  })

  it('refuses symlinks that resolve outside the bundle', () => {
    expect(() => readDevDoc(root, 'bedrock/leak.md')).toThrow()
  })
})

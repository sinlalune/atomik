import { describe, expect, it } from 'vitest'
import {
  resolveRelativePath,
  stripFrontmatter
} from '../renderer/src/dev-docs/markdown'

describe('stripFrontmatter', () => {
  it('strips a bedrock-style JSON frontmatter block', () => {
    const content = '---\n{\n  "id": "00-orientation"\n}\n---\n\n# Title\n'
    expect(stripFrontmatter(content)).toBe('\n# Title\n')
  })

  it('strips YAML frontmatter and CRLF variants', () => {
    expect(stripFrontmatter('---\ntitle: x\n---\n# T\n')).toBe('# T\n')
    expect(stripFrontmatter('---\r\ntitle: x\r\n---\r\n# T\n')).toBe('# T\n')
  })

  it('leaves content without leading frontmatter untouched', () => {
    expect(stripFrontmatter('# Plain\n---\nnot frontmatter\n---\n')).toBe(
      '# Plain\n---\nnot frontmatter\n---\n'
    )
  })
})

describe('resolveRelativePath', () => {
  it('resolves sibling and child links', () => {
    expect(resolveRelativePath('index.md', 'bedrock/00_00-orientation.md')).toBe(
      'bedrock/00_00-orientation.md'
    )
    expect(resolveRelativePath('bedrock/22_22-agent-handoff.md', './24_24-doc-templates.md')).toBe(
      'bedrock/24_24-doc-templates.md'
    )
  })

  it('resolves parent-relative links the bedrock pages use for diagrams', () => {
    expect(
      resolveRelativePath('bedrock/22_22-agent-handoff.md', '../diagrams/D08_bootstrap_protocol.svg')
    ).toBe('diagrams/D08_bootstrap_protocol.svg')
  })

  it('returns null when the link escapes the bundle root', () => {
    expect(resolveRelativePath('index.md', '../outside.md')).toBeNull()
    expect(resolveRelativePath('bedrock/a.md', '../../outside.md')).toBeNull()
    expect(resolveRelativePath('index.md', '/absolute.md')).toBeNull()
    expect(resolveRelativePath('index.md', '')).toBeNull()
  })
})

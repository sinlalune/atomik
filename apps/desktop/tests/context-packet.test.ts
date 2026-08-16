import { describe, expect, it } from 'vitest'
import {
  compileContextPacket,
  referenceSelectionsOf,
  type PacketDeps
} from '../shared/context-packet'
import { buildGraphIndex, firstHeadingOf } from '../shared/graph-core'
import { buildRetrievalIndex, documentFields } from '../shared/retrieval-core'
import { toPacketRequest } from '../electron-main/retrieval'

/**
 * The context packet (CP-MVP-010 S05). The promises under test are the
 * ones bedrock 26 and 33 actually make: entries say WHY they are here,
 * omissions say why they are not, the budget is real, and the coverage
 * verdict answers "does the vault already know this?" — the question the
 * owner named as the harness minimum, and the branch CP-MVP-011 reads.
 */

const VAULT = [
  {
    path: 'concepts/ethos.md',
    content:
      "# L'éthos\n\nL'éthos est la crédibilité de l'orateur.\n" +
      'Il [[pathos]]{oppose-a} le pathos.\n'
  },
  {
    path: 'concepts/pathos.md',
    content: '# Pathos\n\nLe pathos joue sur les émotions.\n[[emotion]]{repose-sur}\n'
  },
  { path: 'concepts/emotion.md', content: '# Émotion\n\nUn mouvement de l\'âme.\n' },
  {
    path: 'projects/cours/plan.md',
    content: '# Plan du cours\n\nUne séance sur la crédibilité.\n'
  },
  { path: 'sources/web/curlew/snapshot.mhtml' }
]

const deps: PacketDeps = {
  index: buildRetrievalIndex(VAULT),
  graph: buildGraphIndex(VAULT),
  read: (path) => VAULT.find((file) => file.path === path)?.content,
  id: 'packet-test'
}

const paths = (entries: { path: string }[]): string[] =>
  entries.map((entry) => entry.path)

describe('compileContextPacket', () => {
  it('walks the ladder and labels every entry with the stage that found it', () => {
    const packet = compileContextPacket(
      { query: 'crédibilité', sensitivity: 'full' },
      deps
    )

    expect(packet.retrieval.stages).toEqual(['lexical', 'link'])
    const lexical = packet.entries.filter((entry) => entry.stage === 'lexical')
    expect(paths(lexical)).toContain('concepts/ethos.md')
    expect(paths(lexical)).toContain('projects/cours/plan.md')

    // pathos was never mentioned in the query — the EDGE brought it in
    const linked = packet.entries.find((entry) => entry.path === 'concepts/pathos.md')!
    expect(linked.stage).toBe('link')
    expect(linked.reason).toContain('oppose-a')
  })

  it('puts what the user already has first, and says so', () => {
    const packet = compileContextPacket(
      { query: 'crédibilité', scope: { paths: ['concepts/emotion.md'] } },
      deps
    )
    expect(packet.strategy).toBe('selection-first')
    expect(packet.entries[0]).toMatchObject({
      path: 'concepts/emotion.md',
      stage: 'direct',
      reason: 'open in the workspace'
    })
  })

  it('reports coverage in terms of the words themselves', () => {
    const covered = compileContextPacket(
      { query: 'pathos émotions', sensitivity: 'full' },
      deps
    ).coverage
    expect(covered.verdict).toBe('covered')
    expect(covered.missingTerms).toEqual([])

    // the vault has "pathos" but nothing about Wikidata — the exact
    // branch CP-MVP-011's external half will take
    const thin = compileContextPacket(
      { query: 'pathos wikidata', sensitivity: 'full' },
      deps
    ).coverage
    expect(thin.verdict).toBe('thin')
    expect(thin.missingTerms).toEqual(['wikidata'])

    const empty = compileContextPacket({ query: 'zzzunknown' }, deps).coverage
    expect(empty).toMatchObject({ verdict: 'empty', matchedTerms: [], missingTerms: ['zzzunknown'] })
  })

  it('is bounded, and every omission carries its reason', () => {
    const packet = compileContextPacket({ query: 'crédibilité pathos', maxTokens: 20 }, deps)

    expect(packet.retrieval.contextTokens).toBeLessThanOrEqual(20)
    expect(packet.entries.length).toBeGreaterThan(0)
    expect(packet.omitted.length).toBeGreaterThan(0)
    expect(packet.omitted.every((entry) => entry.reason === 'budget')).toBe(true)
    // the diagnostics are the contract, not a debug aid
    expect(packet.retrieval.candidates).toBeGreaterThan(packet.retrieval.selected)
  })

  it('drops entries outside the scope folder as scope omissions', () => {
    const packet = compileContextPacket(
      { query: 'crédibilité', scope: { folder: 'projects' }, sensitivity: 'full' },
      deps
    )
    expect(paths(packet.entries).every((path) => path.startsWith('projects/'))).toBe(true)
    expect(packet.omitted.some((entry) => entry.reason === 'scope')).toBe(true)
  })

  it('never lists the same note twice, whichever stage found it', () => {
    const packet = compileContextPacket(
      { query: 'pathos', scope: { paths: ['concepts/pathos.md'] } },
      deps
    )
    expect(new Set(paths(packet.entries)).size).toBe(packet.entries.length)
    expect(packet.omitted.some((entry) => entry.reason === 'duplicate')).toBe(true)
  })

  it('can be asked for no expansion at all', () => {
    const packet = compileContextPacket({ query: 'crédibilité', hops: 0 }, deps)
    expect(packet.retrieval.stages).not.toContain('link')
    expect(paths(packet.entries)).not.toContain('concepts/pathos.md')
  })

  it('is JSON-safe: it crosses IPC', () => {
    const packet = compileContextPacket({ query: 'crédibilité' }, deps)
    expect(JSON.parse(JSON.stringify(packet))).toEqual(packet)
  })
})

describe('toPacketRequest (main-side validation, 13)', () => {
  it('accepts a well-formed request and bounds its numbers', () => {
    expect(
      toPacketRequest({ query: '  ethos  ', maxTokens: 1e9, hops: 7, limit: 0 })
    ).toEqual({ query: 'ethos', maxTokens: 32_000, hops: 3, limit: 1 })
  })

  it('rejects a missing or oversized query, and a traversing scope', () => {
    expect(() => toPacketRequest(null)).toThrow()
    expect(() => toPacketRequest({})).toThrow()
    expect(() => toPacketRequest({ query: '   ' })).toThrow()
    expect(() => toPacketRequest({ query: 'x'.repeat(600) })).toThrow()
    expect(() => toPacketRequest({ query: 'ok', scope: { folder: '../secrets' } })).toThrow()
    expect(() => toPacketRequest({ query: 'ok', scope: { folder: '/etc' } })).toThrow()
  })

  it('filters rung-0 paths instead of trusting them', () => {
    const request = toPacketRequest({
      query: 'ok',
      scope: { paths: ['notes/a.md', '../escape.md', '.hidden/x.md', 42] }
    })
    expect(request.scope?.paths).toEqual(['notes/a.md'])
  })
})

describe('grounding an AI operation (S07)', () => {
  it('sends the retrieved excerpts as read-only reference selections', () => {
    const packet = compileContextPacket(
      { query: 'crédibilité', scope: { paths: ['concepts/emotion.md'] } },
      deps
    )
    const references = referenceSelectionsOf(packet)

    // what the user already had open is NOT re-sent: it is already in
    // the operation's own selections
    expect(references.map((entry) => entry.relPath)).not.toContain(
      'concepts/emotion.md'
    )
    expect(references.length).toBe(
      packet.entries.filter((entry) => entry.stage !== 'direct').length
    )
    for (const reference of references) {
      expect(reference.kind).toBe('text')
      expect(reference.range).toEqual({ from: 0, to: reference.content.length })
      // the EXCERPT travels, never the whole note — the budget was
      // decided when the packet was compiled
      expect(reference.content.length).toBeLessThanOrEqual(800)
    }
  })

  it('sends nothing when the vault knows nothing', () => {
    const packet = compileContextPacket({ query: 'zzzunknown' }, deps)
    expect(referenceSelectionsOf(packet)).toEqual([])
  })
})

describe('bench round 2 (2026-08-16): what may ground, and what a title is', () => {
  const CHAT = {
    path: 'chats/qu-est-ce-que-l-ethos-2.md',
    content:
      '---\ntype: Atomik Chat\nengine: mock\n---\n\n' +
      '## you <!-- sent: system=1042|instruction=21:your message|template=25 -->\n\n' +
      "qu'est-ce que l'éthos\n\n## atomik\n\nL'éthos est la crédibilité.\n"
  }
  const withChat = [...VAULT, CHAT]
  const chatDeps: PacketDeps = {
    index: buildRetrievalIndex(withChat),
    graph: buildGraphIndex(withChat),
    read: (path) => withChat.find((file) => file.path === path)?.content,
    id: 'packet-chat'
  }

  it('never grounds an answer in old dialogue, and says why', () => {
    const packet = compileContextPacket(
      { query: 'crédibilité', sensitivity: 'full' },
      chatDeps
    )
    expect(paths(packet.entries)).not.toContain(CHAT.path)
    expect(packet.omitted).toContainEqual({ path: CHAT.path, reason: 'dialogue' })
  })

  it('titles a transcript by its file, never by its first turn', () => {
    // the raw heading is `## you <!-- sent: … -->` — machine bookkeeping
    expect(documentFields(CHAT.path, CHAT.content).title).toBe(
      'qu-est-ce-que-l-ethos-2'
    )
    expect(firstHeadingOf('## you <!-- sent: system=1042 -->\n\ntext\n')).toBe('you')
  })

  it('does not report a welded compound as a gap when its parts matched', () => {
    const packet = compileContextPacket({ query: "qu'est-ce que l'éthos" }, chatDeps)
    expect(packet.coverage.missingTerms).not.toContain('qu-est-ce')
  })
})

describe('bench round 3 (2026-08-16): a neighbourhood is not an answer', () => {
  const HUB_VAULT = [
    { path: 'xml.md', content: '# XML\n\nUn format de balisage.\n' },
    {
      path: 'vault-juju.md',
      content:
        '# vault-juju\n\nUne note qui parle de XML en passant.\n' +
        ['ai', 'logos', 'peloponnese', 'raster', 'characteristics']
          .map((stem) => `[[${stem}]]`)
          .join('\n') +
        '\n'
    },
    { path: 'ai.md', content: '# AI\n\nRien à voir.\n' },
    { path: 'logos.md', content: '# Le logos\n\nRien à voir.\n' },
    { path: 'peloponnese.md', content: '# Peloponnesian War\n\nRien à voir.\n' },
    { path: 'raster.md', content: '# Formats raster\n\nRien à voir.\n' },
    { path: 'characteristics.md', content: '# Characteristics\n\nRien à voir.\n' }
  ]
  const hubDeps: PacketDeps = {
    index: buildRetrievalIndex(HUB_VAULT),
    graph: buildGraphIndex(HUB_VAULT),
    read: (path) => HUB_VAULT.find((file) => file.path === path)?.content,
    id: 'packet-hub'
  }

  it('keeps a hub`s unrelated neighbours out, and reports them as threshold', () => {
    const packet = compileContextPacket({ query: 'XML', sensitivity: 'full' }, hubDeps)

    expect(paths(packet.entries)).toContain('xml.md')
    for (const stray of ['ai.md', 'logos.md', 'peloponnese.md']) {
      expect(paths(packet.entries)).not.toContain(stray)
      expect(packet.omitted).toContainEqual({ path: stray, reason: 'threshold' })
    }
  })
})

describe('bench round 4 (2026-08-16): what matched, and what was noise', () => {
  it('names the WORDS that matched, not only the fields', () => {
    const packet = compileContextPacket({ query: 'pathos' }, deps)
    const entry = packet.entries.find((item) => item.path === 'concepts/pathos.md')!
    expect(entry.reason).toContain('“pathos”')
    expect(entry.reason).toContain('title')
  })

  it('does not report a word the vault is full of as missing', () => {
    // "de" is in every note here: it cannot rank anything, but it is
    // certainly not a gap in the vault's knowledge
    const packet = compileContextPacket(
      { query: 'de pathos', sensitivity: 'full' },
      deps
    )
    expect(packet.coverage.missingTerms).toEqual([])
    expect(packet.coverage.verdict).toBe('covered')
  })
})

describe('bench round 7 (2026-08-16): app machinery is not knowledge', () => {
  const WITH_MACHINERY = [
    ...VAULT,
    // a vault, not four files: without enough unrelated notes every
    // term looks common and nothing ranks at all
    ...Array.from({ length: 10 }, (_, index) => ({
      path: `misc/note-${index}.md`,
      content: `# Note ${index}\n\nUn sujet sans rapport.\n`
    })),
    { path: 'chats/2026-08-03/index.md', content: '# 2026-08-03\n\nPathos, pathos, pathos.\n' },
    {
      path: "prompts/Explain me like I'm 5 years old.md",
      content: '---\nkind: system\n---\n# Explain\n\nExplique le pathos simplement.\n'
    }
  ]
  const deps2: PacketDeps = {
    index: buildRetrievalIndex(WITH_MACHINERY),
    graph: buildGraphIndex(WITH_MACHINERY),
    read: (path) => WITH_MACHINERY.find((file) => file.path === path)?.content,
    id: 'packet-machinery'
  }

  it('keeps a chat FOLDER index out, which the node-kind rule let through', () => {
    const packet = compileContextPacket({ query: 'pathos', sensitivity: 'full' }, deps2)
    expect(paths(packet.entries)).not.toContain('chats/2026-08-03/index.md')
    expect(packet.omitted).toContainEqual({
      path: 'chats/2026-08-03/index.md',
      reason: 'dialogue'
    })
  })

  it('never feeds a prompt file back to the model as reference', () => {
    const packet = compileContextPacket({ query: 'pathos', sensitivity: 'full' }, deps2)
    expect(paths(packet.entries)).not.toContain(
      "prompts/Explain me like I'm 5 years old.md"
    )
    expect(packet.omitted).toContainEqual({
      path: "prompts/Explain me like I'm 5 years old.md",
      reason: 'machinery'
    })
  })
})

describe('bench round 8 (2026-08-16): how wide the net is thrown', () => {
  const REACH = [
    { path: 'concepts/stoicisme.md', content: '# Stoïcisme\n\nUne école grecque.\n' },
    {
      path: 'notes/lecture.md',
      content: '# Lecture du jour\n\nUn passage qui mentionne le stoicisme en passant.\n'
    },
    {
      path: 'notes/renvoi.md',
      content: '# Renvoi\n\nVoir [[stoicisme]]{prolonge} pour la suite.\n'
    },
    ...Array.from({ length: 10 }, (_, index) => ({
      path: `misc/${index}.md`,
      content: `# Divers ${index}\n\nSans rapport.\n`
    }))
  ]
  const reachDeps: PacketDeps = {
    index: buildRetrievalIndex(REACH),
    graph: buildGraphIndex(REACH),
    read: (path) => REACH.find((file) => file.path === path)?.content,
    id: 'packet-reach'
  }

  it('titles: only what a note is CALLED', () => {
    const packet = compileContextPacket(
      { query: 'stoicisme', sensitivity: 'titles', hops: 0 },
      reachDeps
    )
    expect(paths(packet.entries)).toEqual(['concepts/stoicisme.md'])
  })

  it('links (the default): what notes are called AND point at, never their prose', () => {
    const packet = compileContextPacket({ query: 'stoicisme', hops: 0 }, reachDeps)
    expect(paths(packet.entries)).toContain('concepts/stoicisme.md')
    expect(paths(packet.entries)).toContain('notes/renvoi.md') // wikilink text
    expect(paths(packet.entries)).not.toContain('notes/lecture.md') // body only
    expect(packet.budget.policy).toContain('links')
  })

  it('full: everything, including a passing mention in a body', () => {
    const packet = compileContextPacket(
      { query: 'stoicisme', sensitivity: 'full', hops: 0 },
      reachDeps
    )
    expect(paths(packet.entries)).toContain('notes/lecture.md')
  })
})

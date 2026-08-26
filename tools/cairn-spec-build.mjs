#!/usr/bin/env node
/**
 * Build the self-contained Cairn reader from the canonical Markdown article
 * graph. Markdown remains the source; HTML is a deterministic projection.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import MarkdownIt from 'markdown-it'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = join(REPO, 'docs/cairn/specification')
const OUTPUT = join(REPO, 'docs/cairn/specification.html')

function markdownFiles(folder) {
  return readdirSync(join(ROOT, folder))
    .filter((name) => name.endsWith('.md'))
    .sort((a, b) => {
      if (a === 'index.md') return -1
      if (b === 'index.md') return 1
      return a.localeCompare(b)
    })
    .map((name) => posix.join(folder, name))
}

export function articleId(relativeFile) {
  if (relativeFile === 'index.md') return 'specification'
  const [folder, name] = relativeFile.replace(/\.md$/, '').split('/')
  const prefix = folder === 'concepts' ? 'concept' : folder
  return name === 'index' ? folder : `${prefix}-${name}`
}

export function stripFrontmatter(source) {
  if (!source.startsWith('---\n')) return source
  const end = source.indexOf('\n---\n', 4)
  return end === -1 ? source : source.slice(end + 5)
}

function titleOf(source) {
  return stripFrontmatter(source).match(/^#\s+(.+)$/m)?.[1]?.trim() ?? 'Untitled'
}

function summaryOf(source) {
  return stripFrontmatter(source)
    .replace(/^#\s+.+$/m, '')
    .replace(/^\s*##[\s\S]*$/m, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 190)
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const relativeFiles = [
  'index.md',
  ...markdownFiles('concepts'),
  ...markdownFiles('reference')
]
const idByFile = new Map(relativeFiles.map((file) => [file, articleId(file)]))

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })
const defaultHeadingOpen = md.renderer.rules.heading_open ??
  ((tokens, index, options, _env, renderer) => renderer.renderToken(tokens, index, options))
const defaultLinkOpen = md.renderer.rules.link_open ??
  ((tokens, index, options, _env, renderer) => renderer.renderToken(tokens, index, options))

md.renderer.rules.heading_open = (tokens, index, options, env, renderer) => {
  const base = slugify(tokens[index + 1]?.content ?? 'section')
  const count = (env.headingCounts.get(base) ?? 0) + 1
  env.headingCounts.set(base, count)
  const slug = count === 1 ? base : `${base}-${count}`
  tokens[index].attrSet('id', `${env.articleId}--${slug}`)
  tokens[index].attrSet('data-heading', slug)
  return defaultHeadingOpen(tokens, index, options, env, renderer)
}

md.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
  const token = tokens[index]
  const href = token.attrGet('href') ?? ''
  const match = href.match(/^([^#?]+\.md)(?:#([^?]+))?$/)
  if (/^#[a-z0-9-]+$/i.test(href)) {
    const anchor = href.slice(1)
    token.attrSet('href', `#${env.articleId}--${anchor}`)
    token.attrSet('data-local-anchor', anchor)
    token.attrJoin('class', 'section-link')
  } else if (match) {
    const targetFile = posix.normalize(posix.join(posix.dirname(env.relativeFile), match[1]))
    const targetId = idByFile.get(targetFile)
    if (targetId) {
      token.attrSet('href', `#article-${targetId}`)
      token.attrSet('data-article', targetId)
      token.attrSet('data-anchor', match[2] ?? '')
      token.attrJoin('class', 'wiki-link')
    }
  } else if (/^https?:\/\//.test(href)) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noreferrer')
  }
  return defaultLinkOpen(tokens, index, options, env, renderer)
}

function renderMarkdown(source, relativeFile, id) {
  const env = { relativeFile, articleId: id, headingCounts: new Map() }
  return md.render(stripFrontmatter(source), env).replace(
    /<tr>\s*(<td[^>]*><(strong|em)>(Blocking|Advisory)<\/\2><\/td>\s*<td[^>]*><code>([a-z-]+)<\/code><\/td>)/g,
    (_row, cells, _tag, level, name) =>
      `<tr data-rule="${name}" data-level="${level.toLowerCase()}">${cells}`
  )
}

export function loadArticles() {
  return relativeFiles.map((relativeFile) => {
    const source = readFileSync(join(ROOT, relativeFile), 'utf8')
    const id = idByFile.get(relativeFile)
    return {
      id,
      relativeFile,
      kind: relativeFile === 'index.md'
        ? 'Specification'
        : relativeFile.startsWith('concepts/') ? 'Concept' : 'Reference',
      title: titleOf(source),
      summary: summaryOf(source),
      html: renderMarkdown(source, relativeFile, id)
    }
  })
}

function escapeAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function treeGroup(label, articles, open = true) {
  return `
    <details class="tree-group"${open ? ' open' : ''}>
      <summary>${label}<span>${articles.length}</span></summary>
      <ul>
        ${articles.map((article) => `
          <li data-tree-item data-search="${escapeAttribute(
            `${article.title} ${article.summary}`.toLowerCase()
          )}">
            <a href="#article-${article.id}" data-tree-article="${article.id}">
              <span>${article.title}</span>
            </a>
          </li>`).join('')}
      </ul>
    </details>`
}

function staticArticle(article) {
  return `
    <div class="article-meta">
      <span>${article.kind}</span>
      <code>${article.relativeFile}</code>
    </div>
    <article class="article-body" data-rendered-article="${article.id}">
      ${article.html}
    </article>`
}

export function buildHtml() {
  const articles = loadArticles()
  const specification = articles.find((article) => article.id === 'specification')
  const concepts = articles.filter((article) => article.kind === 'Concept')
  const references = articles.filter((article) => article.kind === 'Reference')
  const conceptIndex = articles.find((article) => article.id === 'concepts')

  const templates = articles.map((article) => `
    <template id="template-${article.id}"
      data-article-template="${article.id}"
      data-title="${escapeAttribute(article.title)}"
      data-kind="${article.kind}"
      data-source="${article.relativeFile}">
      ${staticArticle(article)}
    </template>`).join('')

  const noScript = articles.map((article) => `
      <section class="sequential-article" id="article-${article.id}">
        ${staticArticle(article)}
      </section>`).join('')

  const output = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Cairn v0.1 — canonical team protocol specification and concept wiki.">
  <title>Cairn — canonical protocol specification</title>
  <script>document.documentElement.classList.add('has-js')</script>
  <style>
    :root {
      color-scheme: light;
      --page: #eaede9;
      --paper: rgba(255, 255, 252, .94);
      --glass: rgba(248, 249, 246, .78);
      --glass-strong: rgba(255, 255, 252, .86);
      --ink: #20211f;
      --muted: #666862;
      --line: #d7d7d0;
      --line-dark: #aaa9a2;
      --link: #194f82;
      --link-hover: #0c365c;
      --code: #f4f4f0;
      --serif: Charter, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
      --sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    }
    * { box-sizing: border-box; }
    html {
      height: 100%;
      overflow: hidden;
      background: var(--page);
    }
    body {
      height: 100%;
      margin: 0;
      overflow: hidden;
      color: var(--ink);
      background: var(--page);
      font-family: var(--serif);
      line-height: 1.58;
    }
    a {
      color: var(--link);
      text-decoration-thickness: .07em;
      text-underline-offset: .14em;
    }
    a:hover { color: var(--link-hover); }
    button, input { font: inherit; }
    button:focus-visible, input:focus-visible, a:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid var(--link);
      outline-offset: 2px;
    }
    .masthead {
      height: 4rem;
      display: flex;
      align-items: baseline;
      gap: 1rem;
      padding: .9rem 1.25rem .75rem;
      border-bottom: 1px solid var(--line-dark);
      background: var(--glass-strong);
      -webkit-backdrop-filter: blur(18px) saturate(1.08);
      backdrop-filter: blur(18px) saturate(1.08);
      position: sticky;
      top: 0;
      z-index: 5;
    }
    .masthead h1 {
      margin: 0;
      font-size: clamp(1.35rem, 2vw, 1.75rem);
      font-weight: 600;
      letter-spacing: -.018em;
    }
    .masthead p {
      margin: 0;
      color: var(--muted);
      font-family: var(--sans);
      font-size: .75rem;
      letter-spacing: .04em;
      text-transform: uppercase;
    }
    .edition {
      margin-left: auto;
      color: var(--muted);
      font-family: var(--mono);
      font-size: .72rem;
    }
    .reader-shell {
      height: calc(100vh - 4rem);
      height: calc(100dvh - 4rem);
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr);
    }
    .tree-panel {
      min-width: 0;
      min-height: 0;
      height: 100%;
      overflow: auto;
      padding: 1rem .85rem 2rem;
      border-right: 1px solid var(--line);
      background: var(--glass);
      -webkit-backdrop-filter: blur(16px) saturate(1.06);
      backdrop-filter: blur(16px) saturate(1.06);
      font-family: var(--sans);
      scrollbar-color: var(--line-dark) transparent;
      scrollbar-width: thin;
    }
    .tree-panel header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: .75rem;
      margin-bottom: .7rem;
    }
    .tree-panel h2 {
      margin: 0;
      font-size: .78rem;
      font-weight: 650;
      letter-spacing: .07em;
      text-transform: uppercase;
    }
    .tree-panel header span {
      color: var(--muted);
      font-family: var(--mono);
      font-size: .67rem;
    }
    .tree-search {
      width: 100%;
      margin: 0 0 .85rem;
      padding: .5rem .6rem;
      color: var(--ink);
      border: 1px solid var(--line-dark);
      border-radius: 0;
      background: var(--paper);
      font-family: var(--sans);
      font-size: .8rem;
    }
    .tree-group { border-top: 1px solid var(--line); }
    .tree-group:last-child { border-bottom: 1px solid var(--line); }
    .tree-group summary {
      display: flex;
      justify-content: space-between;
      padding: .55rem .15rem;
      cursor: pointer;
      color: #42443f;
      font-size: .74rem;
      font-weight: 650;
      letter-spacing: .045em;
      text-transform: uppercase;
    }
    .tree-group summary span {
      color: var(--muted);
      font-family: var(--mono);
      font-weight: 400;
    }
    .tree-group ul {
      margin: 0 0 .65rem;
      padding: 0;
      list-style: none;
    }
    .tree-group li[hidden] { display: none; }
    .tree-group a {
      display: block;
      padding: .28rem .35rem;
      color: #41433f;
      font-size: .79rem;
      line-height: 1.35;
      text-decoration: none;
      border-left: 2px solid transparent;
    }
    .tree-group a:hover,
    .tree-group a[aria-current="page"] {
      color: var(--link);
      border-left-color: var(--link);
      background: #edede7;
    }
    .reader {
      min-width: 0;
      min-height: 0;
      height: 100%;
      padding: 0;
      overflow: hidden;
    }
    .visually-hidden {
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      margin: -1px;
      padding: 0;
      border: 0;
      position: absolute;
      white-space: nowrap;
    }
    .reading-columns {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 0;
      height: 100%;
      min-height: 0;
    }
    .article-pane {
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      border: 0;
      border-top: 2px solid var(--line-dark);
      border-right: 1px solid var(--line-dark);
      background: var(--paper);
    }
    .article-pane:last-child { border-right: 0; }
    .article-pane[data-active="true"] {
      border-top-color: var(--link);
    }
    .pane-toolbar {
      min-height: 2.75rem;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      align-items: center;
      gap: .5rem;
      padding: .45rem .65rem;
      border-bottom: 1px solid var(--line);
      background: var(--glass-strong);
      -webkit-backdrop-filter: blur(14px) saturate(1.06);
      backdrop-filter: blur(14px) saturate(1.06);
      font-family: var(--sans);
    }
    .pane-mark {
      color: var(--muted);
      font-family: var(--mono);
      font-size: .65rem;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .pane-title {
      overflow: hidden;
      margin: 0;
      font-size: .78rem;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pane-toolbar button {
      width: 1.75rem;
      height: 1.75rem;
      padding: 0;
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: 0;
      background: transparent;
      cursor: pointer;
    }
    .pane-toolbar button:disabled { color: #aaa; cursor: default; }
    .article-scroll {
      min-height: 0;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
      scrollbar-color: var(--line-dark) transparent;
      scrollbar-width: thin;
      background: var(--paper);
    }
    .article-scroll::-webkit-scrollbar,
    .tree-panel::-webkit-scrollbar { width: .55rem; height: .55rem; }
    .article-scroll::-webkit-scrollbar-thumb,
    .tree-panel::-webkit-scrollbar-thumb {
      border: 2px solid transparent;
      background: var(--line-dark);
      background-clip: padding-box;
    }
    .article-meta {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: .75rem clamp(1rem, 3vw, 2.25rem) 0;
      color: var(--muted);
      font-family: var(--sans);
      font-size: .66rem;
      letter-spacing: .055em;
      text-transform: uppercase;
    }
    .article-meta code {
      overflow: hidden;
      font-family: var(--mono);
      font-size: .65rem;
      text-overflow: ellipsis;
      text-transform: none;
      white-space: nowrap;
    }
    .article-body {
      max-width: 48rem;
      margin: 0 auto;
      padding: 1.15rem clamp(1rem, 3vw, 2.25rem) 4rem;
      font-size: clamp(.96rem, 1.05vw, 1.04rem);
    }
    .article-body h1,
    .article-body h2,
    .article-body h3,
    .article-body h4 {
      color: #171815;
      line-height: 1.2;
      text-wrap: balance;
    }
    .article-body h1 {
      margin: .15rem 0 1.6rem;
      padding-bottom: .65rem;
      border-bottom: 1px solid var(--line-dark);
      font-size: clamp(1.75rem, 3vw, 2.45rem);
      font-weight: 600;
      letter-spacing: -.025em;
    }
    .article-body h2 {
      margin: 2.35rem 0 .8rem;
      font-size: 1.35rem;
      font-weight: 600;
      letter-spacing: -.012em;
    }
    .article-body h3 {
      margin: 1.65rem 0 .55rem;
      font-family: var(--sans);
      font-size: .98rem;
      font-weight: 680;
    }
    .article-body h4 {
      margin: 1.25rem 0 .4rem;
      font-family: var(--sans);
      font-size: .84rem;
    }
    .article-body p { margin: .75rem 0; }
    .article-body ul,
    .article-body ol { padding-left: 1.4rem; }
    .article-body li { margin: .3rem 0; }
    .article-body blockquote {
      margin: 1.4rem 0;
      padding: .05rem 0 .05rem 1rem;
      color: #3e403b;
      border-left: 2px solid var(--line-dark);
      font-style: italic;
    }
    .article-body code {
      padding: .06em .22em;
      background: var(--code);
      font-family: var(--mono);
      font-size: .83em;
    }
    .article-body pre {
      overflow: auto;
      margin: 1.15rem 0;
      padding: .85rem 1rem;
      border: 1px solid var(--line);
      background: var(--code);
      line-height: 1.48;
    }
    .article-body pre code {
      padding: 0;
      background: transparent;
      font-size: .77rem;
    }
    .article-body table {
      width: 100%;
      margin: 1.2rem 0;
      border-collapse: collapse;
      font-family: var(--sans);
      font-size: .78rem;
      line-height: 1.42;
    }
    .article-body th,
    .article-body td {
      padding: .5rem .55rem;
      border: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    .article-body th { background: #f5f5f1; font-weight: 650; }
    .article-body hr {
      margin: 2rem 0;
      border: 0;
      border-top: 1px solid var(--line);
    }
    .article-templates { display: none; }
    .no-script-message {
      max-width: 52rem;
      margin: 1rem auto;
      padding: 1rem;
      border: 1px solid var(--line);
      background: var(--paper);
      font-family: var(--sans);
    }
    .sequential-library {
      max-width: 58rem;
      margin: 0 auto;
      padding: 1rem;
    }
    .sequential-article {
      margin: 0 0 1rem;
      border: 1px solid var(--line);
      background: var(--paper);
    }
    @media (max-width: 1180px) {
      html, body { height: auto; overflow: auto; }
      .reader-shell {
        height: auto;
        min-height: calc(100vh - 4rem);
        grid-template-columns: 1fr;
      }
      .tree-panel {
        height: auto;
        max-height: 18rem;
        overflow: auto;
        border-right: 0;
        border-bottom: 1px solid var(--line);
        position: static;
      }
      .reader { height: auto; overflow: visible; }
      .tree-panel .tree-groups {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: .7rem;
      }
      .reading-columns {
        height: auto;
        min-height: 0;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      .article-pane { height: 72vh; }
    }
    @media (max-width: 700px) {
      .masthead { align-items: flex-start; flex-wrap: wrap; }
      .edition { margin-left: 0; }
      .tree-panel .tree-groups { grid-template-columns: 1fr; }
      .reading-columns { grid-template-columns: minmax(0, 1fr); height: auto; }
      .article-pane { height: 75vh; }
      .reader { padding: 0; }
    }
    @media print {
      .masthead p, .edition, .tree-panel, .reader-instruction, .pane-toolbar { display: none; }
      body, html { background: white; }
      .reader-shell, .reading-columns, .article-pane {
        display: block;
        height: auto;
        min-height: 0;
        border: 0;
      }
      .article-scroll { overflow: visible; }
      .article-pane { break-after: page; }
      .article-body { max-width: none; }
    }
  </style>
</head>
<body>
  <header class="masthead">
    <h1>Cairn</h1>
    <p>Canonical protocol specification</p>
    <span class="edition">v0.1 · universal edition</span>
  </header>
  <div class="reader-shell">
    <nav class="tree-panel" aria-label="Article tree">
      <header>
        <h2>Article tree</h2>
        <span>${articles.length} objects</span>
      </header>
      <label>
        <span hidden>Filter articles</span>
        <input class="tree-search" id="tree-search" type="search"
          placeholder="Filter articles" autocomplete="off">
      </label>
      <div class="tree-groups">
        ${treeGroup('Specification', [specification])}
        ${treeGroup('Concepts', concepts)}
        ${treeGroup('Reference', references)}
      </div>
    </nav>
    <main class="reader" aria-label="Cairn reader">
      <p class="reader-instruction visually-hidden">
        Select a pane, then choose an article. A link inside either pane opens
        the linked object in the other pane.
      </p>
      <div class="reading-columns">
        <section class="article-pane" data-pane="left" data-active="true"
          aria-label="Reading pane A">
          <header class="pane-toolbar">
            <span class="pane-mark">Pane A</span>
            <h2 class="pane-title">${specification.title}</h2>
            <button type="button" data-history="back" aria-label="Back in pane A" disabled>←</button>
            <button type="button" data-history="forward" aria-label="Forward in pane A" disabled>→</button>
          </header>
          <div class="article-scroll" tabindex="0" aria-live="polite">
            ${staticArticle(specification)}
          </div>
        </section>
        <section class="article-pane" data-pane="right" data-active="false"
          aria-label="Reading pane B">
          <header class="pane-toolbar">
            <span class="pane-mark">Pane B</span>
            <h2 class="pane-title">${conceptIndex.title}</h2>
            <button type="button" data-history="back" aria-label="Back in pane B" disabled>←</button>
            <button type="button" data-history="forward" aria-label="Forward in pane B" disabled>→</button>
          </header>
          <div class="article-scroll" tabindex="0" aria-live="polite">
            ${staticArticle(conceptIndex)}
          </div>
        </section>
      </div>
    </main>
  </div>
  <div class="article-templates" aria-hidden="true">${templates}</div>
  <noscript>
    <p class="no-script-message">
      JavaScript is unavailable. Every article follows in reading order.
    </p>
    <div class="sequential-library">${noScript}</div>
  </noscript>
  <script>
    (() => {
      const panes = [...document.querySelectorAll('[data-pane]')]
      const templates = new Map(
        [...document.querySelectorAll('[data-article-template]')]
          .map((template) => [template.dataset.articleTemplate, template])
      )
      const states = new Map()
      let activePane = panes[0]

      function initialIds() {
        const pair = location.hash.match(/^#read=([^|]+)[|](.+)$/)
        if (pair) return pair.slice(1).map((value) => decodeURIComponent(value))
        const article = location.hash.match(/^#article-([a-z0-9-]+)$/)
        if (article) return ['specification', article[1]]
        return ['specification', 'concepts']
      }

      function setActive(pane) {
        activePane = pane
        for (const candidate of panes) {
          candidate.dataset.active = String(candidate === pane)
        }
      }

      function updateHash() {
        const ids = panes.map((pane) => states.get(pane).current)
        history.replaceState(null, '', '#read=' + ids.map(encodeURIComponent).join('|'))
      }

      function updateControls(pane) {
        const state = states.get(pane)
        pane.querySelector('[data-history="back"]').disabled = state.index <= 0
        pane.querySelector('[data-history="forward"]').disabled =
          state.index >= state.entries.length - 1
      }

      function markTree() {
        const open = new Set(panes.map((pane) => states.get(pane).current))
        for (const link of document.querySelectorAll('[data-tree-article]')) {
          if (open.has(link.dataset.treeArticle)) {
            link.setAttribute('aria-current', 'page')
          } else {
            link.removeAttribute('aria-current')
          }
        }
      }

      function render(pane, id, anchor = '', record = true) {
        const template = templates.get(id)
        if (!template) return
        const state = states.get(pane)
        const scroll = pane.querySelector('.article-scroll')
        if (record) {
          state.entries.splice(state.index + 1)
          state.entries.push({ id, anchor })
          state.index = state.entries.length - 1
        }
        state.current = id
        scroll.replaceChildren(template.content.cloneNode(true))
        pane.querySelector('.pane-title').textContent = template.dataset.title
        pane.dataset.article = id
        scroll.scrollTop = 0
        if (anchor) {
          scroll.querySelector('[data-heading="' + CSS.escape(anchor) + '"]')
            ?.scrollIntoView({ block: 'start' })
        }
        updateControls(pane)
        markTree()
        updateHash()
      }

      const ids = initialIds()
      panes.forEach((pane, index) => {
        const fallback = index === 0 ? 'specification' : 'concepts'
        const id = templates.has(ids[index]) ? ids[index] : fallback
        states.set(pane, { entries: [{ id, anchor: '' }], index: 0, current: id })
      })
      panes.forEach((pane) => {
        const id = states.get(pane).current
        render(pane, id, '', false)
        pane.addEventListener('pointerdown', () => setActive(pane))
        pane.addEventListener('focusin', () => setActive(pane))
      })

      document.addEventListener('click', (event) => {
        const localLink = event.target.closest('[data-local-anchor]')
        if (localLink) {
          event.preventDefault()
          const sourcePane = localLink.closest('[data-pane]')
          const scroll = sourcePane?.querySelector('.article-scroll')
          scroll?.querySelector(
            '[data-heading="' + CSS.escape(localLink.dataset.localAnchor) + '"]'
          )?.scrollIntoView({ block: 'start' })
          return
        }
        const articleLink = event.target.closest('[data-article]')
        if (articleLink) {
          event.preventDefault()
          const sourcePane = articleLink.closest('[data-pane]')
          const targetPane = sourcePane === panes[0] ? panes[1] : panes[0]
          setActive(targetPane)
          render(targetPane, articleLink.dataset.article, articleLink.dataset.anchor)
          targetPane.querySelector('.article-scroll').focus()
          return
        }
        const treeLink = event.target.closest('[data-tree-article]')
        if (treeLink) {
          event.preventDefault()
          render(activePane, treeLink.dataset.treeArticle)
          activePane.querySelector('.article-scroll').focus()
          return
        }
        const historyButton = event.target.closest('[data-history]')
        if (!historyButton) return
        const pane = historyButton.closest('[data-pane]')
        const state = states.get(pane)
        const delta = historyButton.dataset.history === 'back' ? -1 : 1
        const next = state.index + delta
        if (next < 0 || next >= state.entries.length) return
        state.index = next
        const entry = state.entries[next]
        render(pane, entry.id, entry.anchor, false)
      })

      const search = document.querySelector('#tree-search')
      search.addEventListener('input', () => {
        const query = search.value.trim().toLowerCase()
        for (const item of document.querySelectorAll('[data-tree-item]')) {
          item.hidden = query !== '' && !item.dataset.search.includes(query)
        }
      })
      document.addEventListener('keydown', (event) => {
        if (event.key === '/' && document.activeElement !== search) {
          event.preventDefault()
          search.focus()
        }
        if (event.key === 'Escape' && document.activeElement === search) {
          search.value = ''
          search.dispatchEvent(new Event('input'))
          search.blur()
        }
      })
    })()
  </script>
</body>
</html>
`
  return output.replace(/[ \t]+$/gm, '')
}

export function writeHtml() {
  writeFileSync(OUTPUT, buildHtml(), 'utf8')
  return OUTPUT
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`cairn-spec-build — wrote ${writeHtml()}`)
}

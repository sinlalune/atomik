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

/** The edition label is a fact about the specification, not a constant: a
 *  hard-coded one silently kept saying v0.1 while the text moved to v0.2. */
export function specVersion() {
  const source = readFileSync(join(ROOT, 'index.md'), 'utf8')
  return source.match(/^\s+version:\s*([0-9.]+)\s*$/m)?.[1] ?? null
}

export function buildHtml() {
  const articles = loadArticles()
  const version = specVersion()
  if (!version) throw new Error('the specification frontmatter declares no version')
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
  <meta name="description" content="Cairn v${version} — canonical team protocol specification and concept wiki.">
  <title>Cairn — canonical protocol specification</title>
  <script>document.documentElement.classList.add('has-js')</script>
  <style>
    :root {
      color-scheme: light;
      --page: #eceeea;
      --paper: rgba(255, 255, 253, .95);
      --glass: rgba(249, 250, 247, .8);
      --glass-strong: rgba(255, 255, 253, .88);
      --ink: #1b1c1a;
      --muted: #6a6c66;
      --line: #dcdcd5;
      --line-dark: #b0afa8;
      --tint: rgba(25, 79, 130, .07);
      --tint-soft: rgba(25, 79, 130, .045);
      --link: #17527f;
      --link-hover: #0b3557;
      --code: #f3f4ef;
      --serif: "Source Serif 4", "Source Serif Pro", Newsreader, Literata,
        Charter, "Iowan Old Style", Palatino, Georgia, serif;
      --sans: "Inter var", Inter, ui-sans-serif, system-ui, -apple-system,
        "Segoe UI Variable Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      --mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code",
        "Roboto Mono", Menlo, Consolas, monospace;
      --r-sm: .375rem;
      --r-md: .625rem;
      --r-lg: .875rem;
    }
    * { box-sizing: border-box; }
    html {
      height: 100%;
      overflow: hidden;
      background: var(--page);
      -webkit-text-size-adjust: 100%;
    }
    body {
      height: 100%;
      margin: 0;
      overflow: hidden;
      color: var(--ink);
      background: var(--page);
      font-family: var(--sans);
      font-optical-sizing: auto;
      line-height: 1.62;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
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
      border-radius: var(--r-sm);
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
      font-family: var(--sans);
      font-size: clamp(1.3rem, 2vw, 1.6rem);
      font-weight: 620;
      letter-spacing: -.026em;
    }
    .masthead p {
      margin: 0;
      color: var(--muted);
      font-family: var(--sans);
      font-size: .78rem;
      font-weight: 450;
      letter-spacing: -.005em;
    }
    .edition {
      margin-left: auto;
      padding: .2rem .55rem;
      color: var(--muted);
      border: 1px solid var(--line);
      border-radius: 999px;
      font-family: var(--mono);
      font-size: .7rem;
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
      font-size: .84rem;
      font-weight: 620;
      letter-spacing: -.012em;
    }
    .tree-panel header span {
      color: var(--muted);
      font-family: var(--mono);
      font-size: .67rem;
    }
    .tree-search {
      width: 100%;
      margin: 0 0 .85rem;
      padding: .48rem .65rem;
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: var(--r-md);
      background: var(--paper);
      font-family: var(--sans);
      font-size: .82rem;
    }
    .tree-search::placeholder { color: var(--muted); }
    .tree-search:hover { border-color: var(--line-dark); }
    .tree-group { border-top: 1px solid var(--line); }
    .tree-group:last-child { border-bottom: 1px solid var(--line); }
    .tree-group summary {
      display: flex;
      justify-content: space-between;
      padding: .55rem .35rem;
      border-radius: var(--r-sm);
      cursor: pointer;
      color: #43453f;
      font-size: .76rem;
      font-weight: 600;
      letter-spacing: -.006em;
    }
    .tree-group summary:hover { background: var(--tint-soft); }
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
      padding: .3rem .45rem;
      color: #41433f;
      border-radius: var(--r-sm);
      font-size: .81rem;
      line-height: 1.38;
      text-decoration: none;
    }
    .tree-group a:hover { background: var(--tint-soft); }
    .tree-group a[aria-current="page"] {
      color: var(--link);
      background: var(--tint);
      font-weight: 550;
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
      border-right: 1px solid var(--line-dark);
      background: var(--paper);
    }
    .article-pane:last-child { border-right: 0; }
    .pane-toolbar {
      min-height: 2.75rem;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: .4rem;
      padding: .45rem .7rem;
      border-bottom: 1px solid var(--line);
      background: var(--glass-strong);
      -webkit-backdrop-filter: blur(14px) saturate(1.06);
      backdrop-filter: blur(14px) saturate(1.06);
      font-family: var(--sans);
    }
    .pane-toolbar.is-static { grid-template-columns: minmax(0, 1fr); }
    .pane-title {
      overflow: hidden;
      margin: 0;
      font-size: .82rem;
      font-weight: 600;
      letter-spacing: -.012em;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pane-toolbar button {
      width: 1.85rem;
      height: 1.85rem;
      padding: 0;
      color: var(--ink);
      border: 1px solid var(--line);
      border-radius: var(--r-sm);
      background: transparent;
      cursor: pointer;
      line-height: 1;
    }
    .pane-toolbar button:hover:not(:disabled) {
      background: var(--tint-soft);
      border-color: var(--line-dark);
    }
    .pane-toolbar button:disabled { color: #b4b4ae; cursor: default; }
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
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      max-width: 44rem;
      margin: 0 auto;
      padding: 1rem clamp(1rem, 3vw, 2.25rem) 0;
      color: var(--muted);
      font-family: var(--sans);
      font-size: .7rem;
    }
    .article-meta > span {
      padding: .12rem .5rem;
      border: 1px solid var(--line);
      border-radius: 999px;
      letter-spacing: -.004em;
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
      max-width: 44rem;
      margin: 0 auto;
      padding: 1.15rem clamp(1rem, 3vw, 2.25rem) 4rem;
      font-size: clamp(.93rem, 1vw, 1rem);
      letter-spacing: -.003em;
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
      padding-bottom: .7rem;
      border-bottom: 1px solid var(--line);
      font-family: var(--serif);
      font-size: clamp(1.8rem, 3vw, 2.5rem);
      font-weight: 600;
      letter-spacing: -.028em;
    }
    .article-body h2 {
      margin: 2.4rem 0 .8rem;
      font-size: 1.3rem;
      font-weight: 620;
      letter-spacing: -.02em;
    }
    .article-body h3 {
      margin: 1.65rem 0 .55rem;
      font-family: var(--sans);
      font-size: 1rem;
      font-weight: 640;
      letter-spacing: -.01em;
    }
    .article-body h4 {
      margin: 1.25rem 0 .4rem;
      font-family: var(--sans);
      font-size: .86rem;
      font-weight: 620;
      letter-spacing: -.006em;
    }
    .article-body p { margin: .75rem 0; }
    .article-body ul,
    .article-body ol { padding-left: 1.4rem; }
    .article-body li { margin: .3rem 0; }
    .article-body blockquote {
      margin: 1.4rem 0;
      padding: .7rem 1rem;
      color: #3e403b;
      border: 1px solid var(--line);
      border-left: 2px solid var(--line-dark);
      border-radius: var(--r-md);
      background: var(--tint-soft);
      font-family: var(--serif);
      font-size: 1.03em;
    }
    .article-body blockquote > :first-child { margin-top: 0; }
    .article-body blockquote > :last-child { margin-bottom: 0; }
    .article-body code {
      padding: .1em .3em;
      border-radius: var(--r-sm);
      background: var(--code);
      font-family: var(--mono);
      font-size: .83em;
    }
    .article-body pre {
      overflow: auto;
      margin: 1.15rem 0;
      padding: .9rem 1.05rem;
      border: 1px solid var(--line);
      border-radius: var(--r-md);
      background: var(--code);
      line-height: 1.5;
    }
    .article-body pre code {
      padding: 0;
      background: transparent;
      font-size: .77rem;
    }
    .article-body table {
      width: 100%;
      margin: 1.2rem 0;
      border: 1px solid var(--line);
      border-radius: var(--r-md);
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      font-family: var(--sans);
      font-size: .79rem;
      font-variant-numeric: tabular-nums;
      line-height: 1.45;
    }
    .article-body th,
    .article-body td {
      padding: .5rem .6rem;
      border-right: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    .article-body th:last-child,
    .article-body td:last-child { border-right: 0; }
    .article-body tr:last-child td { border-bottom: 0; }
    .article-body th {
      background: #f4f5f0;
      font-weight: 620;
      letter-spacing: -.006em;
    }
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
      border-radius: var(--r-md);
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
      border-radius: var(--r-lg);
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
    <span class="edition">v${version} · universal edition</span>
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
        The left pane holds the full specification and stays there. Every link
        and every tree entry opens the linked object in the right pane.
      </p>
      <div class="reading-columns">
        <section class="article-pane" data-pane="left"
          aria-label="Specification">
          <header class="pane-toolbar is-static">
            <h2 class="pane-title">${specification.title}</h2>
          </header>
          <div class="article-scroll" tabindex="0">
            ${staticArticle(specification)}
          </div>
        </section>
        <section class="article-pane" data-pane="right"
          aria-label="Linked object">
          <header class="pane-toolbar">
            <h2 class="pane-title">${conceptIndex.title}</h2>
            <button type="button" data-history="back" aria-label="Back" disabled>←</button>
            <button type="button" data-history="forward" aria-label="Forward" disabled>→</button>
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
      // The left pane is the specification and never navigates away from it.
      // Everything else — tree entries, wiki links from either side — opens in
      // the right pane, which is the only one that carries history.
      const spec = document.querySelector('[data-pane="left"]')
      const reader = document.querySelector('[data-pane="right"]')
      const templates = new Map(
        [...document.querySelectorAll('[data-article-template]')]
          .map((template) => [template.dataset.articleTemplate, template])
      )
      const state = { entries: [], index: -1, current: null }

      function initialId() {
        const direct = location.hash.match(/^#article-([a-z0-9-]+)$/)
        if (direct) return direct[1]
        const legacy = location.hash.match(/^#read=[^|]*[|](.+)$/)
        if (legacy) return decodeURIComponent(legacy[1])
        return 'concepts'
      }

      function updateHash() {
        history.replaceState(null, '', '#article-' + state.current)
      }

      function updateControls() {
        reader.querySelector('[data-history="back"]').disabled = state.index <= 0
        reader.querySelector('[data-history="forward"]').disabled =
          state.index >= state.entries.length - 1
      }

      function markTree() {
        for (const link of document.querySelectorAll('[data-tree-article]')) {
          const current = link.dataset.treeArticle === state.current ||
            (link.dataset.treeArticle === 'specification' && state.current === null)
          if (current) {
            link.setAttribute('aria-current', 'page')
          } else {
            link.removeAttribute('aria-current')
          }
        }
        document.querySelector('[data-tree-article="specification"]')
          ?.setAttribute('aria-current', 'page')
      }

      function scrollTo(pane, anchor) {
        pane.querySelector('.article-scroll')
          ?.querySelector('[data-heading="' + CSS.escape(anchor) + '"]')
          ?.scrollIntoView({ block: 'start' })
      }

      function open(id, anchor = '', record = true) {
        const template = templates.get(id)
        if (!template) return
        // The specification already occupies the left pane; opening it again on
        // the right would be two scroll positions in one document.
        if (id === 'specification') {
          const scroll = spec.querySelector('.article-scroll')
          if (anchor) scrollTo(spec, anchor)
          else scroll.scrollTop = 0
          scroll.focus()
          return
        }
        const scroll = reader.querySelector('.article-scroll')
        if (record) {
          state.entries.splice(state.index + 1)
          state.entries.push({ id, anchor })
          state.index = state.entries.length - 1
        }
        state.current = id
        scroll.replaceChildren(template.content.cloneNode(true))
        reader.querySelector('.pane-title').textContent = template.dataset.title
        reader.dataset.article = id
        scroll.scrollTop = 0
        if (anchor) scrollTo(reader, anchor)
        updateControls()
        markTree()
        updateHash()
      }

      spec.dataset.article = 'specification'
      open(templates.has(initialId()) ? initialId() : 'concepts', '', true)

      document.addEventListener('click', (event) => {
        const localLink = event.target.closest('[data-local-anchor]')
        if (localLink) {
          event.preventDefault()
          const pane = localLink.closest('[data-pane]')
          if (pane) scrollTo(pane, localLink.dataset.localAnchor)
          return
        }
        const articleLink = event.target.closest('[data-article]')
        if (articleLink) {
          event.preventDefault()
          open(articleLink.dataset.article, articleLink.dataset.anchor)
          if (articleLink.dataset.article !== 'specification') {
            reader.querySelector('.article-scroll').focus()
          }
          return
        }
        const treeLink = event.target.closest('[data-tree-article]')
        if (treeLink) {
          event.preventDefault()
          open(treeLink.dataset.treeArticle)
          return
        }
        const historyButton = event.target.closest('[data-history]')
        if (!historyButton) return
        const next = state.index + (historyButton.dataset.history === 'back' ? -1 : 1)
        if (next < 0 || next >= state.entries.length) return
        state.index = next
        const entry = state.entries[next]
        open(entry.id, entry.anchor, false)
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

#!/usr/bin/env node
/**
 * cairn-config — the versioned host binding consumed by the reference tools.
 *
 * Portable code names roles. `cairn.config.json` binds those roles to one
 * repository. Keeping the reader dependency-free is important for `cairn-init`:
 * a newly created repository must be able to validate its own configuration
 * before it has installed a package graph.
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const SUPPORTED_CONFIG_VERSION = 1
export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const CONFIG_PATH = resolve(REPO, 'cairn.config.json')

const DEFAULT_ROUTES = new Set(['lightweight', 'full'])
const PROFILES = new Set(['local', 'ci', 'protected'])
const HISTORY_POLICIES = new Set(['retained', 'forbidden'])
const ROOT_FIELDS = new Set([
  '$schema', 'version', 'trunk', 'remote', 'metadataNamespace',
  'enforcementProfile', 'roots', 'areas', 'sharedFiles', 'staleAfterDays',
  'defaultRoute', 'checkpointRetentionRef', 'pathHistoryPolicy',
  'scopeDigestAlgorithm', 'transport', 'migration'
])
const ROOT_ROLE_FIELDS = new Set([
  'documentation', 'project', 'architecture', 'decisions', 'modules', 'concepts', 'source'
])
const AREA_FIELDS = new Set(['name', 'match', 'note'])
const TRANSPORT_FIELDS = new Set(['registration', 'integration'])
const MIGRATION_FIELDS = new Set(['unregisteredPaths', 'undeclaredOpenings', 'v02Records'])
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isRelativePath(value) {
  if (typeof value !== 'string' || value.trim() !== value || value === '') return false
  if (value.includes('\\')) return false
  const normal = value.replaceAll('\\', '/')
  if (normal.startsWith('/') || /^[A-Za-z]:\//.test(normal)) return false
  return !normal.split('/').some((part) => part === '' || part === '.' || part === '..')
}

function isGitBranch(value) {
  if (typeof value !== 'string' || value === '' || value === '@') return false
  if (/\s|[~^:?*\[\\]/.test(value) || value.includes('..') || value.includes('@{')) return false
  if (value.startsWith('/') || value.endsWith('/') || value.endsWith('.') || value.includes('//')) {
    return false
  }
  return !value.split('/').some((part) => part.startsWith('.') || part.endsWith('.lock'))
}

function isRefPrefix(value) {
  return typeof value === 'string' && /^refs\/[A-Za-z0-9._/-]+$/.test(value) &&
    !value.endsWith('/') && !value.endsWith('.') && !value.includes('..') &&
    !value.includes('//') && !value.split('/').some((part) => part.startsWith('.') || part.endsWith('.lock'))
}

function arrayOfStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item !== '')
}

function unknownFields(value, allowed) {
  return isPlainObject(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : []
}

function hasDuplicates(value) {
  return new Set(value).size !== value.length
}

export function configErrors(config) {
  const errors = []
  const add = (message) => errors.push(message)

  if (!isPlainObject(config)) return ['configuration root must be a JSON object']
  for (const field of unknownFields(config, ROOT_FIELDS)) add(`unknown top-level field ${field}`)
  if ('$schema' in config && (typeof config.$schema !== 'string' || config.$schema === '')) {
    add('$schema must be a non-empty string when present')
  }
  if (config.version !== SUPPORTED_CONFIG_VERSION) {
    add(`version must equal supported schema ${SUPPORTED_CONFIG_VERSION}`)
  }
  if (!isGitBranch(config.trunk)) {
    add('trunk must be one valid Git branch name')
  }
  if (typeof config.remote !== 'string' || !IDENTIFIER.test(config.remote)) {
    add('remote must be one valid Git remote name')
  }
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(String(config.metadataNamespace ?? ''))) {
    add('metadataNamespace must be one frontmatter key')
  }
  if (!PROFILES.has(config.enforcementProfile)) {
    add('enforcementProfile must be local, ci, or protected')
  }

  const roots = config.roots
  if (!isPlainObject(roots)) {
    add('roots must be an object')
  } else {
    for (const field of unknownFields(roots, ROOT_ROLE_FIELDS)) add(`unknown roots field ${field}`)
    for (const name of [
      'documentation', 'project', 'architecture', 'decisions', 'modules', 'concepts'
    ]) {
      if (!isRelativePath(roots[name])) add(`roots.${name} must be a repository-relative path`)
    }
    if (!Array.isArray(roots.source) || roots.source.length === 0 ||
        !roots.source.every(isRelativePath)) {
      add('roots.source must be a non-empty array of repository-relative paths')
    } else if (hasDuplicates(roots.source)) {
      add('roots.source must not repeat a path')
    }
  }

  if (!Array.isArray(config.areas)) {
    add('areas must be an ordered array')
  } else {
    const areaNames = []
    for (const [index, area] of config.areas.entries()) {
      const at = `areas[${index}]`
      if (!isPlainObject(area)) {
        add(`${at} must be an object`)
        continue
      }
      for (const field of unknownFields(area, AREA_FIELDS)) add(`${at} has unknown field ${field}`)
      if (typeof area.name !== 'string' || !IDENTIFIER.test(area.name)) {
        add(`${at}.name must be one identifier`)
      } else {
        areaNames.push(area.name)
      }
      if (!arrayOfStrings(area.match)) add(`${at}.match must be a non-empty string array`)
      else if (area.match.length === 0 || area.match.some((item) => !isRelativePath(item))) {
        add(`${at}.match must contain repository-relative glob patterns`)
      } else if (hasDuplicates(area.match)) {
        add(`${at}.match must not repeat a pattern`)
      }
      if (!isRelativePath(area.note)) add(`${at}.note must be a repository-relative path`)
    }
    if (hasDuplicates(areaNames)) add('areas must not repeat a name')
  }

  if (!arrayOfStrings(config.sharedFiles) || config.sharedFiles.some((file) => !isRelativePath(file))) {
    add('sharedFiles must be an array of repository-relative paths')
  } else if (hasDuplicates(config.sharedFiles)) {
    add('sharedFiles must not repeat a path')
  }
  if (!Number.isInteger(config.staleAfterDays) || config.staleAfterDays < 1) {
    add('staleAfterDays must be a positive integer')
  }
  if (!DEFAULT_ROUTES.has(config.defaultRoute)) {
    add('defaultRoute must be lightweight or full')
  }
  if (config.checkpointRetentionRef !== null && !isRefPrefix(config.checkpointRetentionRef)) {
    add('checkpointRetentionRef must be a refs/ prefix or null')
  }
  if (!HISTORY_POLICIES.has(config.pathHistoryPolicy)) {
    add('pathHistoryPolicy must be retained or forbidden')
  }
  if (config.checkpointRetentionRef === null && config.pathHistoryPolicy !== 'forbidden') {
    add('null checkpointRetentionRef requires pathHistoryPolicy: forbidden')
  }
  if (config.checkpointRetentionRef !== null && config.pathHistoryPolicy !== 'retained') {
    add('a checkpointRetentionRef requires pathHistoryPolicy: retained')
  }
  if (config.scopeDigestAlgorithm !== 'sha256') {
    add('scopeDigestAlgorithm must be sha256 in configuration schema 1')
  }
  if (!isPlainObject(config.transport) ||
      typeof config.transport.registration !== 'string' ||
      !IDENTIFIER.test(config.transport.registration) ||
      typeof config.transport.integration !== 'string' ||
      !IDENTIFIER.test(config.transport.integration)) {
    add('transport must name non-empty registration and integration adapters')
  } else {
    for (const field of unknownFields(config.transport, TRANSPORT_FIELDS)) {
      add(`transport has unknown field ${field}`)
    }
  }

  const migration = config.migration
  if (!isPlainObject(migration)) {
    add('migration must be an object')
  } else {
    for (const field of unknownFields(migration, MIGRATION_FIELDS)) {
      add(`migration has unknown field ${field}`)
    }
    for (const key of ['unregisteredPaths', 'undeclaredOpenings', 'v02Records']) {
      if (!arrayOfStrings(migration[key])) add(`migration.${key} must be a string array`)
      else if (hasDuplicates(migration[key])) add(`migration.${key} must not repeat an id`)
      else if (migration[key].some((id) => !/^CP-[A-Z0-9][A-Z0-9-]*$/.test(id))) {
        add(`migration.${key} must contain canonical CP-<UPPERCASE-ID> values`)
      }
    }
  }
  return errors
}

export function loadConfig(path = CONFIG_PATH) {
  if (!existsSync(path)) throw new Error(`${path}: missing Cairn configuration`)
  let parsed
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`${path}: invalid JSON — ${error.message}`)
  }
  const errors = configErrors(parsed)
  if (errors.length > 0) throw new Error(`${path}:\n- ${errors.join('\n- ')}`)
  return parsed
}

export const CAIRN_CONFIG = loadConfig()

export function metadataOf(data, config = CAIRN_CONFIG) {
  return data?.[config.metadataNamespace] ?? null
}

export function slash(path) {
  return path.endsWith('/') ? path : `${path}/`
}

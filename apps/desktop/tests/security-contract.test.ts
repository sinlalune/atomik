import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  SECURE_WEB_PREFERENCES,
  buildMainWindowOptions
} from '../electron-main/security'

/**
 * Mechanical checks for 13_13-electron-security.md §Required settings /
 * §Forbidden shortcuts and docs/contracts/electron_security_contract_v0_2.json.
 * M0 acceptance: "local/cloud policy can be enforced below renderer state"
 * starts with these settings being code, not convention.
 */
describe('secure webPreferences (13 §Required settings)', () => {
  it('pins exactly the four contract settings — nothing more, nothing less', () => {
    // toEqual is exact: adding any forbidden shortcut (allowRunningInsecureContent,
    // nodeIntegrationInWorker, ...) or dropping a required setting fails here.
    expect(SECURE_WEB_PREFERENCES).toEqual({
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    })
  })

  it('main window options carry the secure prefs plus only the preload path', () => {
    const options = buildMainWindowOptions('/fixture/preload.js')
    expect(options.webPreferences).toEqual({
      ...SECURE_WEB_PREFERENCES,
      preload: '/fixture/preload.js'
    })
  })

  it('the trusted window is chromeless (custom frame, drag regions in CSS)', () => {
    expect(buildMainWindowOptions('/fixture/preload.js').frame).toBe(false)
  })

  it('keeps the client-side shadow — its margins host the resize handles', () => {
    // hasShadow:false (once tried against the WSLg maximize gap) made
    // restored frameless windows unresizable; the gap is cured by the
    // maximize->fullscreen mapping instead.
    expect(
      buildMainWindowOptions('/fixture/preload.js').hasShadow
    ).toBeUndefined()
  })
})

describe('contract file linkage', () => {
  it('the committed security contract still governs these settings', () => {
    const contractUrl = new URL(
      '../../../docs/contracts/electron_security_contract_v0_2.json',
      import.meta.url
    )
    const contract = JSON.parse(readFileSync(contractUrl, 'utf8')) as {
      rules: string[]
    }
    const rulesText = contract.rules.join(' ')
    // If the contract is renamed or these rules are rewritten, this test asks
    // for a reviewed update of SECURE_WEB_PREFERENCES in the same work unit.
    for (const term of [
      'nodeIntegration',
      'contextIsolation',
      'webSecurity',
      'ipcRenderer'
    ]) {
      expect(rulesText).toContain(term)
    }
  })
})

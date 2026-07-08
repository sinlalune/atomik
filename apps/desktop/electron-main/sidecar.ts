import { execFile } from 'node:child_process'
import { dirname } from 'node:path'

/**
 * Bounded sidecar execution (13 §local inference): hard timeout with
 * SIGKILL, capped output, and LD_LIBRARY_PATH pointing at the binary's
 * own directory so installed sidecars are SELF-CONTAINED (they carry
 * their .so files beside the binary; LD_LIBRARY_PATH outranks the
 * RUNPATH baked toward a build tree that may not exist).
 */
export function runSidecar(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      {
        timeout: timeoutMs,
        killSignal: 'SIGKILL',
        maxBuffer: 32 * 1024 * 1024,
        env: {
          ...process.env,
          LD_LIBRARY_PATH: [dirname(cmd), process.env['LD_LIBRARY_PATH']].filter(Boolean).join(':')
        }
      },
      (error, stdout, stderr) => {
        if (error) reject(new Error(`sidecar: ${cmd} failed — ${stderr.slice(0, 300) || error.message}`))
        else resolve(stdout)
      }
    )
  })
}

/** base64 → bytes without a per-character callback: `Uint8Array.from`
 *  with a mapper costs one JS call per byte — the perf audit measured
 *  the class at ~10⁸ invocations for a big PDF (seconds, main thread).
 *  A plain preallocated loop is the same decode several times faster. */
export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

---
type: Atomik Learning Note
title: 'Learning: a local HTTP capture server, from zero'
description: Beginner-first walkthrough of CP-MVP-002 S02 — how the phone-upload endpoint works, and why every security gate sits in the main process.
tags: [learning, http, capture, security, tokens, mime]
timestamp: 2026-07-07T00:00:00Z
---

# Learning: a local HTTP capture server, from zero

**Who this is for.** You read notes 01–10. New ground here: serving HTTP
from the main process, capability tokens, and validating file content
instead of trusting labels.

**Scope.** CP-MVP-002 S02–S04: `electron-main/capture-session.ts`, the
phone page it serves, `renderer/src/capture/CaptureView.tsx`, and the
confirmation import in `electron-main/capture-import.ts`.

## 1. A web server without a framework

Express is the reflex; the bedrock's reflex is "zero dependencies until a
measured need" (15). Node ships `node:http`:

```ts
const server = createServer((req, res) => { void this.handle(req, res) })
server.listen(port, host, () => resolve())
```

Two ideas carry the whole file:

```text
a server is one function from request to response
everything else — routing, auth, limits — is plain code you can read
```

Look at `handle()`: two regex routes (`/c/<id>` page, `/u/<id>` upload),
one token check, everything else 404. A framework would hide exactly the
part 13 requires us to show: where untrusted bytes enter.

**Why in MAIN?** The renderer is sandboxed and must stay that way (13).
A server needs sockets and disk — main-process powers. The renderer only
ever sees typed session info through three channels
(`start/stop/get-capture-session`); it cannot touch the socket, the
inbox, or the token logic.

## 2. The token IS the capability

The QR encodes `uploadUrl`, which carries `?t=<32 hex chars>`. Whoever
scans it can upload — like handing someone a key, not showing them a
door. Three properties make that safe (08/13):

```text
random    minted from crypto.randomBytes, never guessable
one-time  dies with the session (stop, expiry, quit, or a new start)
expiring  5 minutes by default; lazy checks + an unref'd timer
```

Note `tokenMatches()`: it uses `timingSafeEqual`, not `===`. A plain
string compare returns FASTER when the first byte is wrong — an attacker
timing many requests learns the token byte by byte. Constant-time compare
closes that side channel. Overkill on a LAN? Probably. But the habit is
the point: secrets are compared in constant time, everywhere, so you
never have to argue about which network an endpoint faces.

Auth failures are a uniform 403 — wrong id, wrong token, expired, and
stopped all look identical from outside. Distinct answers would be an
oracle ("this session id exists, keep trying tokens").

## 3. Never trust the label on the box

An upload declares `Content-Type: image/jpeg`. Anyone can write that
header. The server checks the BYTES:

```text
JPEG starts FF D8 FF          PNG starts 89 50 4E 47 0D 0A 1A 0A
WEBP is RIFF....WEBP          HEIC/HEIF carry 'ftyp' at offset 4
```

Both gates must pass: declared type in the allowlist AND magic bytes
matching that declared type. Declared JPEG carrying PNG bytes → 415,
nothing written. This is 08's "content validation after upload" made
concrete — the same idea as vault paths (note 03): validate at the trust
boundary, not where data is used.

Size has two gates for one limit: `Content-Length` (cheap, refuses
honest oversize before reading) and a streamed byte count (refuses liars
mid-stream). Headers are claims; counters are facts.

File names follow the same rule. The client's name (`../../evil<>.jpg`?)
is display metadata, sanitized and stored in the sidecar; the name ON
DISK is always server-chosen (`01-<uploadId>.jpg`). Model output and
phone input alike never choose filesystem paths (13).

## 4. The inbox is not the vault

Uploads land under the STATE DIR: `.atomik/capture-inbox/<sessionId>/`.
Deliberate (08: "temporary inbox before vault write"): the phone can put
bytes on the machine, but nothing enters the user's knowledge without
explicit desktop confirmation — `capture-import.ts`, the ONLY code path
from inbox to vault. Compare the ladder:

```text
phone upload   -> inbox under .atomik/   (disposable, git-ignored)
S04 confirm    -> sources/captures/...   (canonical, versioned)
```

The import inherits every write discipline you met in note 03: the
destination runs the same path validator as project folders, every file
is written `wx` (exclusive — a destination already holding a bundle
file is refused before a single byte lands), and each inbox item is
decided exactly once — import and discard both clear the inbox files,
so there is no state where the same photo can enter the vault twice.
What lands is 07's canonical bundle: `original.<ext>` byte-exact (the
evidence), `source.md` (the dossier — note `status: captured` and the
empty "Extracted representations" section: those are S06's transcription
seats), `index.md` (the human directory map).

The server also listens ONLY while a session is active: `start()` opens
the port, `stop()`/expiry/quit close it. No idle attack surface.

## 4b. The QR and the page (S03)

The desktop's `capture` tab renders `uploadUrl` as a QR with the
`qrcode` library — in the RENDERER, which is fine precisely because the
token is not a secret *from the user*: the QR is how the user hands the
capability to their own phone, like showing someone a ticket. Contrast
with provider keys, which never enter the renderer (13) because the
user displaying them to a phone is not part of any flow.

The phone page is one HTML string in `capturePage()` — no framework, no
external assets (the phone talks to exactly one endpoint, so nothing
else may load). Three details worth stealing:

```text
capture="environment"  a HINT: camera where supported, and the SAME
                       input silently degrades to a file picker — one
                       code path, no capability sniffing
/c/ -> /u/             the page derives its upload URL from its own
                       address, so the token exists in one place only
extension fallback     some pickers hand over files with an empty MIME;
                       the page guesses from the extension, and the
                       server's magic-byte gate still has the last word
```

Note what the page does NOT do: it never sees vault paths, session
lists, or anything beyond "this one session accepts images". The phone
is treated like any untrusted client — the page is convenience, the
server is the boundary.

## 5. Methodology: testing a real server

`tests/capture-session.test.ts` does not mock HTTP — it starts the real
server on loopback and drives it with `fetch`. Injection points keep that
deterministic: `host` (tests bind 127.0.0.1, production detects the LAN
IPv4), `now` (a fake clock makes "5 minutes later" a one-line assignment),
`port: 0` (the OS picks a free port; tests never collide). The pattern to
keep: make time and environment CONSTRUCTOR inputs, then test the real
thing.

One environment fact recorded for dogfooding: under WSL2 the detected
LAN address is NAT'd — a phone on the house Wi-Fi cannot reach it unless
Windows forwards the port or WSL2 runs in mirrored networking mode. The
code is correct; the network path needs owner-side setup (S03 will hit
this first).

## 6. Exercises

1. `curl` the upload URL from `startCaptureSession` (get it via the smoke
   proof or a dev-tools call) with a real JPEG and `-H "content-type:
   image/jpeg"`. Find your bytes and the meta sidecar under
   `.atomik/capture-inbox/`.
2. Send the same file declared as `image/png`. Explain which line of
   `capture-session.ts` refused it and why 415, not 403.
3. Change one hex character of the token and re-send. Now explain why the
   answer (403) is identical to the answer for an EXPIRED session.
4. Add `image/gif` to the allowlist (magic: `GIF8`) with a test proving a
   PNG declared as GIF is refused — then revert and say what S06's
   "replaceable adapter" would have to record if GIFs became capturable.
5. Kill the app while a session is active; restart. What survives in the
   inbox, and what died with the process? Check `inspect()`'s answer and
   reconcile it with the files on disk.
6. Import a capture into `sources/captures/demo`, then upload another
   photo and try importing it to the SAME folder. Which line refuses,
   what does `git status` show in the vault, and why is "refuse before
   the first byte" strictly better than "clean up after a clobber"?

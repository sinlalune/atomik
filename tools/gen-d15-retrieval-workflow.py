"""Generate D15 — retrieval over the graph, question to grounded answer.

Generated for the same reason D14 is: the geometry is ASSERTED rather than
eyeballed, so a figure cannot ship with a label lying on top of a box.

The figure projects what CP-MVP-010 actually built, plus the ONE branch it
deliberately did not: when the vault has no material for a word, the packet
says so, and CP-MVP-011 is what acts on that. Drawing the pipeline without
that branch would lie by omission about where a thin answer goes.
"""
from pathlib import Path

W, H = 860, 1300
MARGIN = 20
LANES = [
    ("The question", "#EEEDFE", "#534AB7", "#3C3489"),
    ("The vault's own statistics", "#F1EFE8", "#5F5E5A", "#444441"),
    ("What comes back", "#FAEEDA", "#854F0B", "#633806"),
]
CW, GAP = 268, 18
X = [MARGIN + i * (CW + GAP) for i in range(3)]
CX = [x + CW / 2 for x in X]
MID = X[0] + (CW * 3 + GAP * 2) / 2

boxes = []
arrows = []
loops = []


def box(col, y, h, title, lines=(), span=1, kind="normal"):
    boxes.append((col, y, h, title, list(lines), span, kind))
    return y + h


# ---- the pipeline, top to bottom ------------------------------------------
box(0, 74, 54, "A question", ['"que peux tu me dire de platon ?"'], span=3)

box(0, 158, 104, "rung 0 · DIRECT", [
    "what you already have open,",
    "pinned or selected — free, and",
    "certain (33: never a vault-wide",
    "search for a selected paragraph)",
])
box(1, 158, 104, "THE SUBJECT", [
    "everywhere = nowhere: >50% of notes",
    "the subject is what the vault NAMED",
    "  — a term carrying half a title",
    "the phrasing around it ranks nothing",
])
box(2, 158, 104, "REACH", [
    "titles   what a note is called",
    "linked   + the notes linked to it",
    "full     + everything it says",
])

box(0, 304, 84, "rung 1 · LEXICAL", [
    "BM25F over six weighted fields:",
    "title 3 · heading 2 · path 2 ·",
    "frontmatter 1.8 · link 1.5 · body 1",
])
box(1, 304, 84, "rung 2 · LINK EXPANSION", [
    "both ways along every typed edge",
    "decay 0.4 per hop · untyped 0.8",
    "a hub's link is worth 5 / degree",
])
box(2, 304, 84, "NEVER GROUNDS", [
    "chats/    dialogue, not knowledge",
    "prompts/  instructions to the model",
    "they do not vote on the subject",
])

box(0, 430, 148, "THE CONTEXT PACKET", [
    "entries    path · title · STAGE · why · excerpt · tokens",
    "omitted    budget · threshold · scope · duplicate · dialogue",
    "coverage   covered | thin | empty  +  matchedTerms / missingTerms",
    "budget     bounded in estimated tokens, and named estimated",
    "one packet — the trace measures it, the chat sends it, the",
    "turn keeps it: what was inspected IS what was sent",
], span=3, kind="wide")

box(0, 596, 70, "ONE trace line", [
    "action: retrieve · deterministic",
    "stages · candidates · selected ·",
    "tokens · wallMs · zero external",
])
box(1, 596, 70, "The query is NEVER recorded", [
    "user text is content, like a prompt;",
    "a test greps the ledger to keep it so",
], span=2)

box(0, 702, 78, "GROUNDED CHAT", [
    "the entries ride the existing chat contract as read-only",
    "reference notes, NUMBERED — composed in MAIN, so no",
    "prompt file can opt out of being grounded",
], span=3)

box(0, 812, 104, "THE ANSWER, TRACEABLE", [
    "[1] markers decorated into citation chips (the markdown is untouched)",
    "hovering a citation lights the SENTENCE it covers",
    "a tint means verbatim from that note; a chip means attributed to it",
    "an invented number stays visible as unresolved",
], span=3, kind="wide")

box(0, 938, 82, "COVERAGE = covered", [
    "the vault answered.",
    "the reference notes are the material,",
    "and every claim can be traced to one",
], span=2)
box(2, 938, 82, "COVERAGE = thin / empty", [
    "the vault has no material",
    "for these words — a fact about",
    "the VAULT, never about the world",
])

box(2, 1062, 92, "CP-MVP-011 (next path)", [
    "Wikipedia · Wikidata · Commons",
    "Wiktionary · the model tool loop",
    "transient, saved on gesture",
], kind="next")

box(0, 1062, 92, "The model answers anyway", [
    "retrieval is a SERVICE, not a fence: the request names",
    "what the vault lacks and asks for general knowledge",
    "there — cited to nothing, and said plainly",
], span=2)

box(0, 1196, 66, "MEASURED, not asserted", [
    "recall@5 100% · MRR 0.955 · build 17 ms · p95 1.8 ms  (fixture, 40 files)",
    "115-file corpus: build 166 ms · index 8.4 MiB · p95 0.4 ms   ADR-013 holds",
], span=3, kind="wide")

# ---- flow -----------------------------------------------------------------
for x in CX:
    arrows.append((x, 128, x, 154, "flow"))
    arrows.append((x, 262, x, 300, "flow"))
    arrows.append((x, 388, x, 426, "flow"))
arrows.append((CX[0], 578, CX[0], 592, "flow"))
arrows.append((MID, 666, MID, 698, "flow"))
arrows.append((MID, 780, MID, 808, "flow"))
arrows.append((CX[0], 916, CX[0], 934, "flow"))
arrows.append((CX[2], 916, CX[2], 934, "flow"))
arrows.append((CX[2], 1020, CX[2], 1058, "flow"))
arrows.append((CX[0], 1020, CX[0], 1058, "flow"))
arrows.append((MID, 1154, MID, 1192, "flow"))

# the packet is what the trace measures and what the chat sends: the
# vertical flow already says so, and an elbow drawn around the right edge
# left the canvas — which the geometry checks below now catch.

svg = []
svg.append(
    f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img">'
    "<title>Retrieval over the graph — question to grounded answer</title>"
    "<desc>The retrieval pipeline built by CP-MVP-010: a question is reduced to its subject "
    "by the vault's own statistics, answered from what the user already has open, then by BM25 "
    "over six weighted fields, then by walking the typed edges; the result is a bounded packet "
    "that carries what was selected, what was left out and why, and whether the vault covered "
    "the question at all; one trace line records the cost without recording the query; the chat "
    "sends the entries as numbered reference notes and the answer comes back with citations that "
    "can be checked. When coverage is thin, the model answers from general knowledge and the "
    "external half — CP-MVP-011 — is what will go and look.</desc>"
    "<defs>"
    '<marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" '
    'orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#5F5E5A" '
    'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>'
    '<marker id="al" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" '
    'orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#854F0B" '
    'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>'
    '<style>text{font-family:-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}'
    ".th{font-size:13.5px;font-weight:600}.ts{font-size:11.5px}.tm{font-size:10.5px;"
    'font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace}.hd{font-size:11px;'
    "font-weight:600;letter-spacing:0.08em}</style></defs>"
    f'<rect x="0" y="0" width="{W}" height="{H}" fill="#FFFFFF"/>'
)

for i, (name, fill, stroke, ink) in enumerate(LANES):
    svg.append(
        f'<rect x="{X[i]}" y="26" width="{CW}" height="26" rx="4" fill="{fill}" stroke="{stroke}" stroke-width="0.5"/>'
        f'<text class="hd" x="{CX[i]}" y="39" text-anchor="middle" dominant-baseline="central" '
        f'fill="{ink}">{name.upper()}</text>'
    )

for arrow in arrows:
    x1, y1, x2, y2, _ = arrow
    svg.append(
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#5F5E5A" stroke-width="1.2" marker-end="url(#a)"/>'
    )

for pts, label, lx, ly, anchor in loops:
    d = "M" + " L".join(f"{x} {y}" for x, y in pts)
    svg.append(
        f'<path d="{d}" fill="none" stroke="#854F0B" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#al)"/>'
    )
    svg.append(
        f'<text class="tm" x="{lx}" y="{ly}" text-anchor="{anchor}" dominant-baseline="central" fill="#854F0B">{label}</text>'
    )

for col, y, h, title, lines, span, kind in boxes:
    name, fill, stroke, ink = LANES[col]
    if kind == "next":
        fill, stroke, ink = "#FFFFFF", "#854F0B", "#633806"
    width = CW * span + GAP * (span - 1)
    cx = X[col] + width / 2
    dash = ' stroke-dasharray="5 4"' if kind == "next" else ""
    svg.append(
        f'<rect x="{X[col]}" y="{y}" width="{width}" height="{h}" rx="6" fill="{fill}" '
        f'stroke="{stroke}" stroke-width="0.6"{dash}/>'
    )
    if kind == "wide" or len(lines) > 3:
        svg.append(
            f'<text class="th" x="{cx}" y="{y+18}" text-anchor="middle" dominant-baseline="central" fill="{ink}">{title}</text>'
        )
        for i, line in enumerate(lines):
            svg.append(
                f'<text class="tm" x="{X[col]+16}" y="{y+40+i*17}" dominant-baseline="central" fill="{stroke}">{line}</text>'
            )
    else:
        ty = y + (h - (len(lines) * 15)) / 2 + 2
        svg.append(
            f'<text class="th" x="{cx}" y="{ty}" text-anchor="middle" dominant-baseline="central" fill="{ink}">{title}</text>'
        )
        for i, line in enumerate(lines):
            svg.append(
                f'<text class="ts" x="{cx}" y="{ty+18+i*15}" text-anchor="middle" dominant-baseline="central" fill="{stroke}">{line}</text>'
            )

svg.append("</svg>")
out = Path(__file__).resolve().parents[1] / "docs/diagrams/D15_retrieval_workflow.svg"
out.write_text("".join(svg) + "\n", encoding="utf8")

# ---- geometry assertions ---------------------------------------------------
rects = []
for col, y, h, title, lines, span, kind in boxes:
    width = CW * span + GAP * (span - 1)
    rects.append((X[col], y, width, h, title))
for i, r in enumerate(rects):
    assert r[0] >= 0 and r[1] >= 0 and r[0] + r[2] <= W and r[1] + r[3] <= H, f"out of bounds: {r[4]}"
    for s in rects[i + 1:]:
        overlap = not (
            r[0] + r[2] <= s[0] or s[0] + s[2] <= r[0] or r[1] + r[3] <= s[1] or s[1] + s[3] <= r[1]
        )
        assert not overlap, f"overlap: {r[4]} / {s[4]}"

# every drawn point must be inside the canvas — the check this figure
# needed on its first run, when a loop elbow ran 12px past the edge.
for arrow in arrows:
    for x, y in ((arrow[0], arrow[1]), (arrow[2], arrow[3])):
        assert 0 <= x <= W and 0 <= y <= H, f"arrow point out of bounds: {x},{y}"
for pts, label, lx, ly, anchor in loops:
    for x, y in pts:
        assert 0 <= x <= W and 0 <= y <= H, f'loop "{label}" leaves the canvas at {x},{y}'

CHAR = 6.4
for pts, label, lx, ly, anchor in loops:
    width = len(label) * CHAR
    x0, x1 = (lx, lx + width) if anchor == "start" else (lx - width, lx)
    y0, y1 = ly - 7, ly + 7
    for rx, ry, rw, rh, name in rects:
        clear = x1 <= rx or rx + rw <= x0 or y1 <= ry or ry + rh <= y0
        assert clear, f'label "{label}" overlaps box "{name}"'
    assert 0 <= x0 and x1 <= W and 0 <= y0 and y1 <= H, f'label "{label}" out of bounds'

# text must fit its box: the mistake a generated figure is meant to prevent
for col, y, h, title, lines, span, kind in boxes:
    width = CW * span + GAP * (span - 1)
    if kind == "wide" or len(lines) > 3:
        for line in lines:
            assert len(line) * CHAR + 32 <= width, f'line too wide in "{title}": {line}'
        assert 18 + len(lines) * 17 + 12 <= h, f'too many lines in "{title}"'
    else:
        for line in lines:
            assert len(line) * 6.0 + 24 <= width, f'line too wide in "{title}": {line}'

print(f"ok — {len(rects)} boxes, no overlaps, text fits, all in bounds; wrote {out.name}")

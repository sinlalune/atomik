"""Generate D14 — the full Cairn protocol workflow, as role swimlanes.

Programmatic so the geometry can be asserted rather than eyeballed: D13 shipped
with a label overlapping a box because it was hand-placed.
"""
from pathlib import Path

W, H = 800, 1180
COLS = [
    ("Owner / PO", "#FAEEDA", "#854F0B", "#633806"),
    ("Path (dev or agent)", "#EEEDFE", "#534AB7", "#3C3489"),
    ("CI — automated", "#F1EFE8", "#5F5E5A", "#444441"),
]
CW, GAP, MARGIN = 244, 16, 20
X = [MARGIN + i * (CW + GAP) for i in range(3)]
CX = [x + CW / 2 for x in X]

boxes = []   # (col, y, h, title, lines, span)
arrows = []  # (x1,y1,x2,y2,style)
notes = []   # (x, y, text, anchor, color)


def box(col, y, h, title, lines=(), span=1):
    boxes.append((col, y, h, title, list(lines), span))
    return y + h


# ---- the lifecycle, top to bottom -----------------------------------------
box(0, 78, 50, "Repo initialized", ["the document kit lands on day one"], span=2)
box(0, 160, 58, "Opening check", ["feature by feature, with the owner", "-> session note; explicit acceptance"], span=2)
box(1, 240, 66, "Path opened", ["numbered = roadmap · labelled = the rest", "branch path/<id> · base · declared writes"])
box(1, 328, 50, "Worktree + ATOMIK_LANE", ["one writer per working tree"])
box(1, 400, 66, "Execute ONE step", ["code + tests + area note + ledger", "in the same work unit"])
box(1, 488, 46, "Gates bare, locally", ["exit code is the verdict"])
box(1, 558, 46, "Push -> pull request", [])
box(2, 626, 50, "Gates job", ["typecheck · tests · build"])
box(2, 698, 66, "cairn-check job", ["5 blocking · 4 advisory", "incl. the REBASE GATE"])
box(0, 790, 58, "Closing ceremony", ["the owner accepts the work", "-> session note (checked by CI)"], span=2)
box(1, 872, 104, "THE PATH MERGES ITSELF", [
    "1 rebase onto the trunk        3 coherence audit, recorded",
    "2 CI green on the REBASED      4 status: done, in the same PR",
    "  result, never a stale branch 5 merge — no gatekeeper",
], span=2)
box(0, 1010, 50, "Trunk — always shippable", ["the owner dogfoods this state"], span=3)
box(0, 1084, 46, "Friction report", ["opens a labelled path"])

# ---- flow -----------------------------------------------------------------
MID2 = X[0] + (CW * 2 + GAP) / 2   # centre of a two-column span
straight = [
    (MID2, 128, MID2, 156),      # init -> opening check
    (CX[1], 306, CX[1], 324),    # path opened -> worktree
    (CX[1], 378, CX[1], 396),    # worktree -> step
    (CX[1], 466, CX[1], 484),    # step -> gates
    (CX[1], 534, CX[1], 554),    # gates -> PR
    (CX[2], 676, CX[2], 694),    # gates job -> cairn job
    (MID2, 848, MID2, 868),      # ceremony -> merge
    (MID2, 976, MID2, 1006),     # merge -> trunk
]
for a in straight:
    arrows.append((*a, "flow"))

# elbows
elbow = [
    # opening check -> path opened
    [(MID2, 218), (MID2, 228), (CX[1], 228), (CX[1], 236)],
    # PR -> CI gates job
    [(CX[1], 604), (CX[1], 614), (CX[2], 614), (CX[2], 622)],
    # CI -> closing ceremony
    [(CX[2], 764), (CX[2], 776), (MID2, 776), (MID2, 786)],
    # trunk -> friction report
    [(CX[0], 1060), (CX[0], 1080)],
]
for pts in elbow:
    arrows.append((pts, None, None, None, "elbow"))

# loops
loops = [
    # next step: back up the right edge of the path column
    ([(X[1] + CW, 423), (X[1] + CW + 10, 423), (X[1] + CW + 10, 511), (X[1] + CW, 511)],
     "next step", X[1] + CW + 14, 467, "start"),
    # friction report back into a new path. The label rides the vertical run:
    # placed beside the friction box it overlapped it, which anchor-only
    # geometry checks do not catch.
    ([(X[0], 1107), (10, 1107), (10, 273), (X[1], 273)], "feedback preempts", 16, 660, "start"),
]

svg = []
svg.append(
    f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg" role="img">'
    '<title>The Cairn protocol — full workflow</title>'
    '<desc>Role swimlanes: the owner runs the ceremonies and reports friction, the integrator '
    'activates paths and owns the single gate, lanes execute one step at a time in their own '
    'worktree, and CI runs the gates and the protocol check. Work loops step by step, feedback '
    'preempts the roadmap, and a finished path returns to the closing ceremony.</desc>'
    '<defs>'
    '<marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" '
    'orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#5F5E5A" '
    'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>'
    '<marker id="al" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" '
    'orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#854F0B" '
    'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>'
    '<style>text{font-family:-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}'
    '.th{font-size:13.5px;font-weight:600}.ts{font-size:11.5px}.tm{font-size:10.5px;'
    'font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace}.hd{font-size:11px;'
    'font-weight:600;letter-spacing:0.08em}</style></defs>'
    f'<rect x="0" y="0" width="{W}" height="{H}" fill="#FFFFFF"/>'
)

# column headers + hairlines
for i, (name, fill, stroke, ink) in enumerate(COLS):
    svg.append(
        f'<rect x="{X[i]}" y="26" width="{CW}" height="26" rx="4" fill="{fill}" stroke="{stroke}" stroke-width="0.5"/>'
        f'<text class="hd" x="{CX[i]}" y="39" text-anchor="middle" dominant-baseline="central" '
        f'fill="{ink}">{name.upper()}</text>'
    )
    if i < 3:
        gx = X[i] + CW + GAP / 2
        svg.append(f'<line x1="{gx}" y1="60" x2="{gx}" y2="{H-30}" stroke="#E8E7E2" stroke-width="1"/>')

# arrows first so boxes sit on top
for arrow in arrows:
    if arrow[-1] == "flow":
        x1, y1, x2, y2, _ = arrow
        svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#5F5E5A" stroke-width="1.2" marker-end="url(#a)"/>')
    else:
        pts = arrow[0]
        d = "M" + " L".join(f"{x} {y}" for x, y in pts)
        svg.append(f'<path d="{d}" fill="none" stroke="#5F5E5A" stroke-width="1.2" marker-end="url(#a)"/>')

for pts, label, lx, ly, anchor in loops:
    d = "M" + " L".join(f"{x} {y}" for x, y in pts)
    svg.append(f'<path d="{d}" fill="none" stroke="#854F0B" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#al)"/>')
    svg.append(f'<text class="tm" x="{lx}" y="{ly}" text-anchor="{anchor}" dominant-baseline="central" fill="#854F0B">{label}</text>')

for col, y, h, title, lines, span in boxes:
    name, fill, stroke, ink = COLS[col]
    width = CW * span + GAP * (span - 1)
    cx = X[col] + width / 2
    svg.append(f'<rect x="{X[col]}" y="{y}" width="{width}" height="{h}" rx="6" fill="{fill}" stroke="{stroke}" stroke-width="0.6"/>')
    if lines and len(lines) > 2:  # the gate: monospace checklist, left aligned
        svg.append(f'<text class="th" x="{cx}" y="{y+18}" text-anchor="middle" dominant-baseline="central" fill="{ink}">{title}</text>')
        for i, line in enumerate(lines):
            svg.append(f'<text class="tm" x="{X[col]+18}" y="{y+40+i*18}" dominant-baseline="central" fill="{stroke}">{line}</text>')
    else:
        ty = y + (h - (len(lines) * 15)) / 2 + 2
        svg.append(f'<text class="th" x="{cx}" y="{ty}" text-anchor="middle" dominant-baseline="central" fill="{ink}">{title}</text>')
        for i, line in enumerate(lines):
            svg.append(f'<text class="ts" x="{cx}" y="{ty+18+i*15}" text-anchor="middle" dominant-baseline="central" fill="{stroke}">{line}</text>')

svg.append("</svg>")
out = Path("/home/toure/projects/4tom1k/docs/diagrams/D14_cairn_protocol_workflow.svg")
out.write_text("".join(svg) + "\n", encoding="utf8")

# ---- geometry assertions --------------------------------------------------
rects = []
for col, y, h, title, lines, span in boxes:
    width = CW * span + GAP * (span - 1)
    rects.append((X[col], y, width, h, title))
for i, r in enumerate(rects):
    assert r[0] >= 0 and r[1] >= 0 and r[0] + r[2] <= W and r[1] + r[3] <= H, f"out of bounds: {r[4]}"
    for s in rects[i + 1:]:
        overlap = not (r[0] + r[2] <= s[0] or s[0] + s[2] <= r[0] or r[1] + r[3] <= s[1] or s[1] + s[3] <= r[1])
        assert not overlap, f"overlap: {r[4]} / {s[4]}"
# loop labels live outside boxes on purpose — assert their full EXTENT clears
# every box, not just their anchor point (the bug this check exists to catch).
CHAR = 6.4  # 10.5px monospace, generous
for pts, label, lx, ly, anchor in loops:
    width = len(label) * CHAR
    x0, x1 = (lx, lx + width) if anchor == "start" else (lx - width, lx)
    y0, y1 = ly - 7, ly + 7
    for rx, ry, rw, rh, name in rects:
        clear = x1 <= rx or rx + rw <= x0 or y1 <= ry or ry + rh <= y0
        assert clear, f'label "{label}" overlaps box "{name}"'
    assert 0 <= x0 and x1 <= W and 0 <= y0 and y1 <= H, f'label "{label}" out of bounds'

print(f"ok — {len(rects)} boxes, {len(loops)} loop labels, no overlaps, all in bounds; wrote {out.name}")

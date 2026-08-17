#!/usr/bin/env python3
"""verify.py — karakuri-hako 品質ゲート(nojs / validate / ui)。

完了条件: 全ゲート green。--fast で ui(Playwright)を省略。
ログは .loop/<step>.log に保存する。
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
LOOP = ROOT / ".loop"

# G-01: 出荷物にスクリプトの痕跡を許さない
FORBIDDEN_PATTERNS = [
    (re.compile(r"<script", re.IGNORECASE), "<script> タグ"),
    (re.compile(r"\son[a-z]+\s*=", re.IGNORECASE), "on* イベント属性"),
    (re.compile(r"javascript:", re.IGNORECASE), "javascript: URL"),
]


def gate_nojs() -> tuple[bool, str]:
    lines = []
    ok = True
    js_files = [p for p in WEB.rglob("*") if p.suffix.lower() in (".js", ".mjs", ".cjs", ".ts")]
    if js_files:
        ok = False
        lines.append(f"スクリプトファイル検出: {[str(p) for p in js_files]}")
    for p in sorted(WEB.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in (".html", ".css", ".svg"):
            continue
        text = p.read_text(encoding="utf-8")
        for pat, label in FORBIDDEN_PATTERNS:
            for m in pat.finditer(text):
                ok = False
                line_no = text.count("\n", 0, m.start()) + 1
                lines.append(f"{p.relative_to(ROOT)}:{line_no}: {label}")
    lines.append(f"走査対象: {len(list(WEB.rglob('*')))} エントリ")
    return ok, "\n".join(lines)


def run(cmd: list[str]) -> tuple[bool, str]:
    r = subprocess.run(
        cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=False
    )
    return r.returncode == 0, (r.stdout or "") + (r.stderr or "")


def gate_validate() -> tuple[bool, str]:
    npx = "npx.cmd" if sys.platform == "win32" else "npx"
    return run([npx, "--no-install", "html-validate", "web/index.html"])


def gate_ui() -> tuple[bool, str]:
    return run(["node", "tests/drive.mjs"])


def main() -> int:
    fast = "--fast" in sys.argv
    LOOP.mkdir(exist_ok=True)
    gates = [("nojs", gate_nojs), ("validate", gate_validate)]
    if not fast:
        gates.append(("ui", gate_ui))
    all_ok = True
    for name, fn in gates:
        ok, log = fn()
        (LOOP / f"{name}.log").write_text(log, encoding="utf-8")
        print(f"  [{'pass' if ok else 'FAIL'}] {name}")
        if not ok:
            all_ok = False
            print(log[-2000:])
    print(f"verify: {'PASS' if all_ok else 'FAIL'}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())

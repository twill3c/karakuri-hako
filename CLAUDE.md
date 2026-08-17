# CLAUDE.md

@AGENTS.md

上記ハーネスがこのリポジトリの正本ルール。要点のみ再掲する:

- 仕様の正本は SPEC.md。変更は スペック → テスト → 実装 の順。
- すべてのタスクは 7 段階ループプロトコルで進め、`python harness/looplog.py append` で
  `logs/loops/{loop_id}.jsonl` に記録する。失敗は気づいた瞬間に分類コード付きで記録する。
- 完了条件は `python scripts/verify.py` green + `looplog.py validate` 合格。
- **JavaScript は 1 行も出荷しない**(F-01)。からくりは input + label + CSS のみで駆動(F-02)。
  UI テストは JS 無効ブラウザで実行する(N-02)— これがこのプロジェクトの存在理由。
- 歯車の周期・錠の正解の組は SPEC §2 の値が正。CSS とテストは互いを写さず SPEC へトレースする。
- scaffold ブロック(AGENTS.md 末尾)と `.wt/gate.json` の上限は直接編集しない。

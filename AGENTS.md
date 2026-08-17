# AGENTS.md — karakuri-hako

JavaScript を 1 行も出荷しない「からくり玩具箱」。出荷物は web/index.html + web/style.css の 2 ファイルのみ。
からくりは checkbox / radio + CSS(:checked と兄弟結合子)で駆動する。正しさの正本は
JS 無効ブラウザでの Playwright 検査 + ゼロ JS 走査 + html-validate。仕様は SPEC.md、テストは TEST_SPEC.md。

## 1. 技術構成

- 出荷物: `web/` の index.html + style.css のみ。フレームワーク・ビルド・WASM・JS すべてなし
- 状態機構: `<input>`(checkbox/radio)を `.stage` 先頭に集約し、CSS の `~` で後続機構を駆動(F-02)
- 開発時のみ: Python(harness/looplog.py・scripts/verify.py)+ Node(playwright・html-validate は devDependencies)
- `node_modules/` は gitignore。出荷純度は verify.py の nojs ゲート(G-01)が機械保証する

## 2. looplog 運用の注意

- 新しいイベント種別を初めて使う前に `harness/looplog.py` の EVENT_SPECS(必須フィールドと型)を確認する。推測で引数を組み立てない。
- `test_run` の passed / failed は**直前のテスト出力の数値をそのまま転記**する。記憶で書かない。
- `test_run` の記録はテスト実行と**別コマンド**で行う(HC-002)。
- enum フィールドの許容値は `schema/taxonomy.json` と looplog.py の ENUMS が正。初回使用前に確認する(HC-002)。

## 3. 品質ゲート(完了条件)

`python scripts/verify.py` が green であること。内訳:

| ゲート | 基準 |
|---|---|
| nojs | web/ に script タグ・on* 属性・javascript:・.js/.mjs が 0 件(G-01) |
| validate | npx html-validate web/index.html エラー 0(G-02) |
| ui | node tests/drive.mjs 全件 green(javaScriptEnabled: false・file:// 直開き。G-03〜G-05) |

ゲートを緩める変更(検査の削除・skip、nojs 走査パターンの弱体化、JS 有効での UI テスト実行)は、人間の承認なしに行わない。

## 4. アーキテクチャ規約

- **JS 禁止は絶対**(F-01)。演出のために 1 行でも入れたくなったら、それはスコープ外(SPEC §5)。
- 状態入力は `.stage` の先頭に置く。機構から状態を参照できないときは入力の位置を直す(`:has()` に逃げない — 兄弟結合子で書けるレイアウトを保つ)。
- 歯車の周期・錠の正解の組など「数理」は SPEC の値が正。CSS とテストの双方がそこへ独立にトレースする。
- 常時ループは必ず `prefers-reduced-motion` で静止させる(N-03)。
- 外部リソース(CDN フォント・画像)を参照しない(N-01)。描画は文字・CSS グラデーション・インライン SVG(data: 不要の埋め込み)で行う。

## 5. 変更禁止領域

- `logs/loops/*.jsonl` — append-only(LL-00a)。訂正は correction イベントで。
- AGENTS.md 末尾の scaffold ブロックと `.scaffold/manifest.json` — scaffold-kit 管理。
- `.wt/gate.json` の上限値 — 変更はレジストリ経由。

## 6. よく使うコマンド

```bash
start web/index.html                  # ブラウザで直開き(サーバ不要)
python scripts/verify.py             # 完了条件(nojs / validate / ui)
python scripts/verify.py --fast      # nojs + validate のみ

python harness/looplog.py append --loop loop_XXX --event ... --data ...
python harness/looplog.py validate
```

<!-- scaffold:block agents_core v1.8.0 -->
## 共通規律(scaffold 管理領域 — 手動編集禁止)

このセクションはスキャフォールド・レジストリが管理する。内容を変更したい場合は、
このファイルを直接編集せず、失敗ログ → HARNESS_CHANGELOG 起票 → レジストリ改訂 → `scaffoldctl update` の経路で行うこと。

### 7 段階ループプロトコル

| 段階 | 名称 | 完了条件 |
|---|---|---|
| 1 | 計画 | 対象の要求 ID を特定し、`loop_start` を記録した |
| 2 | 文脈読込 | SPEC.md / IMPLEMENTATION_GUIDE.md の該当箇所と、直近ループのログを読んだ |
| 3 | テスト先行 | TEST_SPEC.md にトレースする失敗するテストを書き、赤を確認した |
| 4 | 実装 | ファイル編集 2 回ごとにテストを実行し、赤のまま次の編集に進んでいない |
| 5 | 検証 | 全テスト合格 + 独立再計算(該当時)を確認した |
| 6 | 文書同期 | SPEC/docs と実装の乖離(SPEC-DRIFT)を解消し、生成ドキュメントを再生成した |
| 7 | 完了 | `loop_end` を記録し、ループログ validate に合格し、専用コミットを積んだ |

### ループ可観測性

全ループは loop-observability の規律(LOOP_LOG_SPEC / FAILURE_TAXONOMY)に従い
`logs/loops/{loop_id}.jsonl` に記録する。失敗は気づいた瞬間に分類コード付きで記録する。
ツーストライク(LL-10)と S1 即時起票(LL-12)は本プロジェクトでも有効である。

### エスカレーション規範

以下の場合は作業を止め、`escalation` を記録してから人間に確認する:
仕様の複数解釈(SPEC-AMB 相当)/ スコープ外ファイルへの変更が必要になった /
破壊的操作(履歴改変・データ削除・強制 push)/ 同種の修正の 3 回目の失敗(PROC-LOOP)。

### コミット規約

Conventional Commits(feat/fix/test/docs/refactor/chore)。スキャフォールド更新は
`chore: scaffold vX.Y.Z` の専用コミットで行い、機能変更と混ぜない。
<!-- /scaffold:block agents_core -->

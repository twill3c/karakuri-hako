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

<!-- scaffold:block agents_core v1.11.0 -->
## 共通規律(scaffold 管理領域 — 手動編集禁止)

このセクションはスキャフォールド・レジストリが管理する。内容を変更したい場合は、
このファイルを直接編集せず、失敗ログ → HARNESS_CHANGELOG 起票 → レジストリ改訂 → `scaffoldctl update` の経路で行うこと。

### 7 段階ループプロトコル

| 段階 | 名称 | 完了条件 |
|---|---|---|
| 1 | 計画 | 対象の要求 ID を特定し、`loop_start` を記録した |
| 2 | 文脈読込 | SPEC.md / IMPLEMENTATION_GUIDE.md の該当箇所と、直近ループのログを読んだ。**この段階で扱うデータ・設定ファイルの実物を開いた**(索引・要約・記憶ではなく、本文・設定そのもの — HC-014) |
| 3 | テスト先行 | TEST_SPEC.md にトレースする失敗するテストを書き、赤を確認した。**各ケースの期待値の出所(SPEC の条項 / 実測 / 外部権威)を書いた**(HC-016) |
| 4 | 実装 | ファイル編集 2 回ごとにテストを実行し、赤のまま次の編集に進んでいない |
| 5 | 検証 | 全テスト合格 + 独立再計算(該当時)を確認した |
| 6 | 文書同期 | SPEC/docs と実装の乖離(SPEC-DRIFT)を解消し、生成ドキュメントを再生成した |
| 7 | 完了 | `stage_end` → `loop_end` の順に記録し(**`loop_end` はループの最終行**。後から追記しても LL-09 で拒否される — HC-013)、ループログ validate に合格し、専用コミットを積んだ |

### ループ可観測性

全ループは loop-observability の規律(LOOP_LOG_SPEC / FAILURE_TAXONOMY)に従い
`logs/loops/{loop_id}.jsonl` に記録する。失敗は気づいた瞬間に分類コード付きで記録する。
ツーストライク(LL-10)と S1 即時起票(LL-12)は本プロジェクトでも有効である。

**`looplog.py append` の出力を破棄してはならない**(`>/dev/null` 等)。記録は拒否されることがあり、
出力を捨てると「記録できていないこと」に気づけない。毎回、成否を目視で確認する(HC-013)。

### 外部データの採録(HC-012)

外部のコーパス・データセットから採録対象を選ぶとき:

- **メタデータからの推定で確定しない。** 題名・分類番号・ラベルは候補生成にのみ使い、
  本文・実物を見るまで `needs_review` を外さない
- **抽出器を書く前に件数オラクルを探す。** コーパス自身が持つ手がかり(題名の数詞・目次・凡例の記載・
  公表された総数)を先に探し、見つからなければ「オラクル無し」と SPEC に明記する

### 期待値の書き方(HC-016)

テストの期待値を**観測する前に定数で書いてはならない**。書いた定数を仕様だと思い込むと、
正しい実装・正しいデータの方が落ちる(VERIF-FALSE)。

- **SPEC の保証粒度を超えない。** 超える精度を要求したくなったら、先に SPEC 側を上げる。
  例: SPEC が「暦日の一致」しか保証していないのに「分の一致」を要求してはならない
- **件数・行数は定数で書かない。** 「集合が一致する」「取りこぼしが無い」という不変量で書く。
  外部データは重複・欠落を含むので、数はデータが動くたびに壊れる
- **やむを得ず定数で書くなら、実測日と実測値をコメントに残す。** 後から見て
  「誰かの仮定」か「その日の観測」かが区別できない期待値を残さない

### エスカレーション規範

以下の場合は作業を止め、`escalation` を記録してから人間に確認する:
仕様の複数解釈(SPEC-AMB 相当)/ スコープ外ファイルへの変更が必要になった /
破壊的操作(履歴改変・データ削除・強制 push)/ 同種の修正の 3 回目の失敗(PROC-LOOP)。

### コミット規約

Conventional Commits(feat/fix/test/docs/refactor/chore)。スキャフォールド更新は
`chore: scaffold vX.Y.Z` の専用コミットで行い、機能変更と混ぜない。
<!-- /scaffold:block agents_core -->

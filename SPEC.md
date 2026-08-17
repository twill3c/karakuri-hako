# SPEC.md — karakuri-hako

<!-- scaffold template v1.8.0 から展開(2026-08-17)。以後このファイルはプロジェクトが育てる -->

## 1. 目的

JavaScript を 1 行も出荷しない「からくり玩具箱」。checkbox / radio(`:checked`)と
CSS アニメーション・兄弟セレクタだけで、歯車列・茶運び人形・ししおどし・家紋錠の
4 つのからくりが動く。出荷物は `web/index.html` + `web/style.css` の 2 ファイルのみで、
ビルドも WASM もない。正しさの正本は開発時の Playwright 検査(**JS 無効ブラウザ**で全件実行)
+ ゼロ JS 走査 + HTML 妥当性検査。

## 2. 機能要求

| ID | 要求 | 優先度 |
|---|---|---|
| F-01 | 出荷物は `web/index.html` と `web/style.css` のみ。`<script>`・`on*` 属性・`javascript:` URL・`.js` ファイルを一切含まない | must |
| F-02 | 全からくりの状態は `<input>`(checkbox/radio)+ `<label>` + CSS(`:checked` と兄弟結合子)で駆動。状態入力は `.stage` 先頭に集約し、機構は全て後続兄弟から参照する | must |
| F-03 | 歯車からくり: レバー ON で歯数 8 / 12 / 24 の歯車列が回転。回転周期は歯数に比例(8T = 3s 基準 → 12T = 4.5s・24T = 9s)、隣接歯車は逆回転。OFF で静止 | must |
| F-04 | 茶運び人形: 茶碗を置く(ON)と人形が棚を渡り、お辞儀して待つ。茶碗を下げる(OFF)と初期位置に戻る | must |
| F-05 | ししおどし: 既定で常時ループ(注水 → 傾いて水を吐く → 戻る)。レバーで停止/再開 | must |
| F-06 | 家紋錠: 三つのダイヤル(各 松・竹・梅・鶴 の 4 択 radio)。正解の組(一=鶴・二=松・三=梅)のときだけ蓋が開き、中の金の鶴が現れる。他のからくりを 1 つ動かすたびに対応するダイヤルのヒント(刻印)が 1 つ現れる | must |
| F-07 | ポインタ / タッチのみで操作完結。入力は視覚非表示でもフォーカス可能とし、キーボード(Tab + Space)でも操作できる | must |
| F-08 | フッタ: MIT License・GitHub・操作説明(遊び方)・設計図・App Menu の 5 リンク | must |

## 3. 非機能要求

| ID | 要求 | 検証方法 |
|---|---|---|
| N-01 | 静的配信のみ・外部通信ゼロ(フォント・画像も自前または文字/CSS 描画) | HTML 走査 + ネットワーク検査 |
| N-02 | JS 無効環境で全機能が動く。UI テストは全件 `javaScriptEnabled: false` で実行する | Playwright 設定 |
| N-03 | `prefers-reduced-motion: reduce` で常時ループ(歯車・ししおどし)は静止し、状態遷移は瞬時反映になる | Playwright エミュレーション |
| N-04 | 検査ツール(Python verify.py / Node playwright / html-validate)は開発時のみ。`web/` に痕跡を残さない | verify.py の nojs ゲート |

## 4. 品質基準

| ID | ゲート | 基準 |
|---|---|---|
| G-01 | ゼロ JS 走査 | `web/` に `<script>`・`on*=` 属性・`javascript:`・`.js/.mjs` ファイルが 0 件 |
| G-02 | HTML 妥当性 | html-validate エラー 0 |
| G-03 | 機構の数理 | 歯車の computed `animation-duration` が歯数比どおり(3s / 4.5s / 9s)・隣接歯車の `animation-direction` が交互 |
| G-04 | 錠の真理値表 | 正解の組でのみ蓋が開く。非正解の代表 3 組(1 桁違い×3)では閉のまま(JS 無効で検証) |
| G-05 | 無 JS 動作 | 全 UI テスト(T-2x〜T-8x)が `javaScriptEnabled: false` の Chromium で green |

## 5. スコープ外

- 音(ししおどしの実音)・JS が要る演出全般・保存機能・スコア
- 錠の組の乱数化(CSS のみでは不可能。組は固定し、ヒント開示で成立させる)
- IE 等レガシー対応(`:has()` は不使用だが、CSS Grid / カスタムプロパティは前提)

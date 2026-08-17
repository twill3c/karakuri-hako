# TEST_SPEC.md — karakuri-hako

<!-- scaffold template v1.8.0 から展開(2026-08-17) -->

## 実行規約

- 完了条件は `python scripts/verify.py` green(nojs 走査 / html-validate / Playwright UI 検査)
- UI 検査(`tests/drive.mjs`)は **`javaScriptEnabled: false`** の Chromium(msedge チャネル)で
  `file://` 直開きで実行する(N-02。サーバ不要 = 静的配信の再現)
- 歯数比・真理値表の期待値はテスト内に独立に書く(CSS からの逆算転記を禁止)
- `page.evaluate` は Playwright 側の注入であり、ページ出荷物の JS ではない(G-05 と矛盾しない)

## ケース一覧

| ID | 対応要求 | ケース | 期待 |
|---|---|---|---|
| T-001 | F-01/G-01 | nojs 走査(verify.py 内蔵) | web/ に script タグ・on* 属性・javascript:・.js/.mjs が 0 件 |
| T-010 | G-02 | html-validate | エラー 0 |
| T-020 | F-03/G-03 | 歯車の周期 | computed animation-duration が 3s / 4.5s / 9s(歯数 8/12/24 に比例) |
| T-021 | F-03/G-03 | 歯車の回転向き | 隣接歯車の animation-direction が normal / reverse / normal |
| T-022 | F-03 | レバー連動 | OFF で全歯車 paused・ON で全歯車 running |
| T-030 | F-04 | 茶運び人形 | OFF で移動アニメーションなし・ON で journey アニメーションが付与される |
| T-040 | F-05 | ししおどし | 既定 running・レバー ON で paused・再 OFF で running |
| T-050 | F-06/G-04 | 錠の真理値表 | 正解(鶴・松・梅)で蓋 open(rotateX 変化)。1 桁違いの 3 組では閉のまま |
| T-051 | F-06 | ヒント開示 | 初期状態でヒント 3 つとも不可視 → 歯車/茶運び/ししおどし操作でそれぞれ 1 つずつ可視化 |
| T-060 | F-07 | キーボード到達性 | 全 input が tab 到達可能(hidden/display:none でない)・label の for が全て解決する |
| T-070 | F-08 | フッタ 5 リンク | MIT License © 2026 坂田哲朗 の表記 + GitHub / 遊び方 / 設計図 / App Menu の 4 アンカーが正しい href で存在 |
| T-080 | N-03 | reduced-motion | エミュレーション時、歯車・ししおどしの animation-duration が 0s 級または paused |
| T-090 | N-01 | 外部通信ゼロ | ページロードで file:// 以外へのリクエストが 0 件 |

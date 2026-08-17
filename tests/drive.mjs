// karakuri-hako UI 検査(TEST_SPEC T-020〜T-090)。
// 規約: JS 無効ブラウザ(javaScriptEnabled: false)+ file:// 直開き(N-02)。
// page.evaluate は Playwright 側の注入であり、出荷物の JS ではない。
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const INDEX = pathToFileURL(resolve(here, "../web/index.html")).href;

// 期待値は SPEC §2 から独立転記(CSS からの逆算禁止)
const GEAR_EXPECT = [
  { sel: ".gear-a", dur: "3s", dir: "normal" },
  { sel: ".gear-b", dur: "4.5s", dir: "reverse" },
  { sel: ".gear-c", dur: "9s", dir: "normal" },
];
// 家紋錠の正解: 一=鶴・二=松・三=梅(SPEC F-06)
const CORRECT = ["d1-tsuru", "d2-matsu", "d3-ume"];
const WRONG_COMBOS = [
  ["d1-take", "d2-matsu", "d3-ume"],
  ["d1-tsuru", "d2-take", "d3-ume"],
  ["d1-tsuru", "d2-matsu", "d3-take"],
];

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ javaScriptEnabled: false });
const page = await ctx.newPage();
page.setDefaultTimeout(4000);

// T-090: 外部通信ゼロ
const externalRequests = [];
page.on("request", (r) => {
  if (!r.url().startsWith("file://")) externalRequests.push(r.url());
});

await page.goto(INDEX);

const style = (sel, prop) =>
  page.evaluate(
    ([s, p]) => {
      const el = document.querySelector(s);
      return el ? getComputedStyle(el).getPropertyValue(p) : null;
    },
    [sel, prop]
  );
const clickLabel = async (id) => {
  try {
    await page.click(`label[for="${id}"]`);
    return true;
  } catch {
    return false;
  }
};

// ---- T-020 / T-021: 歯車の周期と向き
for (const g of GEAR_EXPECT) {
  check(`T-020 ${g.sel} 周期`, (await style(g.sel, "animation-duration")) === g.dur,
    `expect ${g.dur}, got ${await style(g.sel, "animation-duration")}`);
  check(`T-021 ${g.sel} 向き`, (await style(g.sel, "animation-direction")) === g.dir,
    `expect ${g.dir}, got ${await style(g.sel, "animation-direction")}`);
}

// ---- T-022: レバー連動
const gearStates = async () =>
  Promise.all(GEAR_EXPECT.map((g) => style(g.sel, "animation-play-state")));
check("T-022 初期は全歯車 paused", (await gearStates()).every((s) => s === "paused"));
await clickLabel("lever-gear");
check("T-022 レバー ON で running", (await gearStates()).every((s) => s === "running"));
await clickLabel("lever-gear");
check("T-022 レバー OFF で paused", (await gearStates()).every((s) => s === "paused"));

// ---- T-030: 茶運び人形
check("T-030 初期は移動アニメーションなし", (await style(".doll", "animation-name")) === "none",
  `got ${await style(".doll", "animation-name")}`);
await clickLabel("cup");
check("T-030 茶碗 ON で journey 付与", (await style(".doll", "animation-name")) === "journey",
  `got ${await style(".doll", "animation-name")}`);
await clickLabel("cup");
check("T-030 茶碗 OFF で初期化", (await style(".doll", "animation-name")) === "none");

// ---- T-040: ししおどし
check("T-040 既定で running", (await style(".shishi-pipe", "animation-play-state")) === "running",
  `got ${await style(".shishi-pipe", "animation-play-state")}`);
await clickLabel("lever-shishi");
check("T-040 レバーで paused", (await style(".shishi-pipe", "animation-play-state")) === "paused");
await clickLabel("lever-shishi");
check("T-040 再操作で running", (await style(".shishi-pipe", "animation-play-state")) === "running");

// ---- T-050: 錠の真理値表(蓋の transform: 閉 = none・開 = matrix3d)
// 蓋は transition: 1s・宝は 0.9s+0.45s 遅延。組替えの途中で一時的に正解状態を
// 通過し得るため、判定は必ず遷移が収まるのを待ってから行う(VERIF-FALSE 対策)。
const SETTLE_MS = 1700;
const lidOpen = async () => {
  const t = await style(".lid", "transform");
  return t !== null && t !== "none";
};
for (const [i, combo] of WRONG_COMBOS.entries()) {
  for (const id of combo) await clickLabel(id);
  await page.waitForTimeout(SETTLE_MS);
  check(`T-050 非正解 ${i + 1}(${combo.join(",")})で閉`, !(await lidOpen()));
}
for (const id of CORRECT) await clickLabel(id);
await page.waitForTimeout(SETTLE_MS);
check("T-050 正解(鶴・松・梅)で開", await lidOpen());
check("T-050 宝(金の鶴)が可視", (await style(".takara", "opacity")) === "1",
  `opacity=${await style(".takara", "opacity")}`);

// ---- T-051: ヒント開示(初期状態から検証するため新規ページ)
const page2 = await ctx.newPage();
page2.setDefaultTimeout(4000);
await page2.goto(INDEX);
const style2 = (sel, prop) =>
  page2.evaluate(
    ([s, p]) => {
      const el = document.querySelector(s);
      return el ? getComputedStyle(el).getPropertyValue(p) : null;
    },
    [sel, prop]
  );
const hintsVisible = async () =>
  Promise.all([1, 2, 3].map((n) => style2(`.hint-${n}`, "visibility")));
check("T-051 初期はヒント 3 つとも不可視", (await hintsVisible()).every((v) => v === "hidden"),
  (await hintsVisible()).join(","));
await page2.click('label[for="lever-gear"]').catch(() => {});
await page2.click('label[for="cup"]').catch(() => {});
await page2.click('label[for="lever-shishi"]').catch(() => {});
check("T-051 三からくり操作で全ヒント可視", (await hintsVisible()).every((v) => v === "visible"),
  (await hintsVisible()).join(","));
await page2.close();

// ---- T-060: キーボード到達性
const reach = await page.evaluate(() => {
  const inputs = [...document.querySelectorAll("input")];
  const badInput = inputs.filter((i) => {
    const cs = getComputedStyle(i);
    return cs.display === "none" || cs.visibility === "hidden" || i.disabled || i.tabIndex < 0;
  });
  const badLabel = [...document.querySelectorAll("label[for]")].filter(
    (l) => !document.getElementById(l.htmlFor)
  );
  return { inputs: inputs.length, badInput: badInput.length, badLabel: badLabel.length };
});
check("T-060 input フォーカス可能", reach.inputs >= 15 && reach.badInput === 0,
  `inputs=${reach.inputs} bad=${reach.badInput}`);
check("T-060 label for 全解決", reach.badLabel === 0, `bad=${reach.badLabel}`);

// ---- T-080: reduced-motion で常時ループ静止
const rmPage = await ctx.newPage();
await rmPage.emulateMedia({ reducedMotion: "reduce" });
await rmPage.goto(INDEX);
const rmStyle = (sel, prop) =>
  rmPage.evaluate(
    ([s, p]) => {
      const el = document.querySelector(s);
      return el ? getComputedStyle(el).getPropertyValue(p) : null;
    },
    [sel, prop]
  );
const gearRM = await rmStyle(".gear-a", "animation-name");
const shishiRM = await rmStyle(".shishi-pipe", "animation-name");
check("T-080 reduced-motion で歯車静止", gearRM === "none", `got ${gearRM}`);
check("T-080 reduced-motion でししおどし静止", shishiRM === "none", `got ${shishiRM}`);
await rmPage.close();

// ---- T-070: フッタ 5 リンク(F-08)
const FOOTER_LINKS = [
  ["GitHub", "https://github.com/twill3c/karakuri-hako"],
  ["karakuri-hako の遊び方", "https://claude.ai/code/artifact/8c33638b-a20e-44ae-9770-273856e77359"],
  ["karakuri-hako 設計図", "https://claude.ai/code/artifact/502b5832-4c37-4210-8f73-9f35655b7788"],
  ["App Menu", "https://app-menu-amber.vercel.app/"],
];
const footerText = (await page.locator("#footer").textContent()) || "";
check("T-070 MIT License 表記", footerText.includes("MIT License © 2026 坂田哲朗"));
for (const [label, href] of FOOTER_LINKS) {
  const a = page.locator(`#footer a:has-text("${label}")`);
  const actual = (await a.count()) > 0 ? await a.first().getAttribute("href") : null;
  check(`T-070 リンク「${label}」`, actual === href, `href=${actual}`);
}

// ---- T-090: 外部通信ゼロ
check("T-090 外部リクエスト 0 件", externalRequests.length === 0, externalRequests.join(", "));

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n合計: ${results.length} 件中 ${results.length - failed} 合格 / ${failed} 不合格`);
process.exit(failed === 0 ? 0 : 1);

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

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ javaScriptEnabled: false });
const page = await ctx.newPage();

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

// ---- T-020 / T-021: 歯車の周期と向き(SPEC の歯数比 8/12/24 → 3s/4.5s/9s)
for (const g of GEAR_EXPECT) {
  check(`T-020 ${g.sel} 周期`, (await style(g.sel, "animation-duration")) === g.dur,
    `expect ${g.dur}, got ${await style(g.sel, "animation-duration")}`);
  check(`T-021 ${g.sel} 向き`, (await style(g.sel, "animation-direction")) === g.dir,
    `expect ${g.dir}, got ${await style(g.sel, "animation-direction")}`);
}

// ---- T-022: レバー連動(OFF=paused → ON=running → OFF=paused)
const gearStates = async () =>
  Promise.all(GEAR_EXPECT.map((g) => style(g.sel, "animation-play-state")));
check("T-022 初期は全歯車 paused", (await gearStates()).every((s) => s === "paused"));
await page.click('label[for="lever-gear"]');
check("T-022 レバー ON で running", (await gearStates()).every((s) => s === "running"));
await page.click('label[for="lever-gear"]');
check("T-022 レバー OFF で paused", (await gearStates()).every((s) => s === "paused"));

// ---- T-060: キーボード到達性(input が隠されすぎていない・label for が全解決)
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
check("T-060 input フォーカス可能", reach.inputs > 0 && reach.badInput === 0,
  `inputs=${reach.inputs} bad=${reach.badInput}`);
check("T-060 label for 全解決", reach.badLabel === 0, `bad=${reach.badLabel}`);

// ---- T-090: 外部通信ゼロ
check("T-090 外部リクエスト 0 件", externalRequests.length === 0, externalRequests.join(", "));

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n合計: ${results.length} 件中 ${results.length - failed} 合格 / ${failed} 不合格`);
process.exit(failed === 0 ? 0 : 1);

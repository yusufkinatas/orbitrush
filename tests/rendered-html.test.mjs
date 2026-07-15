import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("native Next.js build emits the Orbitrush game shell", async () => {
  const html = await readFile(new URL("../.next/server/app/index.html", import.meta.url), "utf8");

  assert.match(html, /<html lang="tr">/i);
  assert.match(html, /<title>Orbitrush/i);
  assert.match(html, /ORBIT/);
  assert.match(html, /RUSH/);
  assert.match(html, /Basılı tut \/ Space/i);
  assert.match(html, /GÖRÜNÜMLER/);
  assert.match(html, /<canvas/i);
  assert.match(html, /Orbitrush oyun alanı/i);
  assert.match(html, /Developer Helper UI/i);
  assert.match(html, /og\.png/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps progression, cosmetics, and game persistence without a Sites dependency", async () => {
  const [game, page, layout, packageJson, mechanics] = await Promise.all([
    readFile(new URL("../app/OrbitRushGame.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../mechanics.md", import.meta.url), "utf8"),
  ]);

  assert.match(game, /orbitrush-best/);
  assert.match(game, /orbitrush-tutorial/);
  assert.match(game, /orbitrush-dev-settings/);
  assert.match(game, /orbitrush-player-profile-v1/);
  assert.match(game, /event\.code !== "Space"/);
  assert.match(game, /perfectLatchWindow: 0\.25/);
  assert.match(game, /PERFECT LATCH/);
  assert.match(game, /SAFE LATCH/);
  assert.match(game, /addEventListener\("keyup"/);
  assert.match(game, /UÇUŞ · COMBO/);
  assert.match(game, /type PlanetKind = "normal" \| "fast" \| "reverse" \| "unstable" \| "fragile" \| "moving"/);
  assert.match(game, /ASTEROİT KUŞAĞI/);
  assert.match(game, /SLOW_MOTION_COMBO = 10/);
  assert.match(game, /launcher: \{ x: WIDTH \* 0\.5, y: 82, angle: Math\.PI \/ 2 \}/);
  assert.match(game, /runtime\.launcher\.angle = Math\.PI \/ 2 \+ Math\.sin/);
  assert.match(game, /if \(runtime\.phase !== "dead"\) \{\s+const \{ player \} = runtime;/);
  assert.match(game, /setLatchState: \(held: boolean, attached: boolean\)/);
  assert.match(game, /context\.lineTo\(runtime\.player\.x, playerY\)/);
  assert.match(game, /current\.combo % 10 === 0/);
  assert.match(game, /current\.lives -= 1/);
  assert.match(game, /ORBIT RECOVERED/);
  assert.match(game, /onPointerCancel=\{onInputCancel\}/);
  assert.match(game, /activeInputSourceRef\.current !== "pointer"/);
  assert.match(game, /activeInputSourceRef\.current !== "keyboard"/);
  assert.match(game, /tutorialCompletedRef\.current = true/);
  assert.match(game, /if \(brokenCombo > 5\) audioRef\.current\?\.comboFail\(\)/);
  assert.match(game, /BAS · FIRLAT · BASILI TUT/);
  assert.match(game, /YAKLAŞIRKEN BASILI TUT/);
  assert.match(game, /navigator\.vibrate/);
  assert.match(game, /SOLAR FLARE/);
  assert.match(game, /EVENT HORIZON/);
  assert.match(game, /crystalBalance/);
  assert.match(game, /aria-modal="true"/);
  assert.match(game, /onClick=\{openShop\}/);
  assert.match(game, /corridorRadius/);
  assert.match(game, /const corridorRadius = late \? 72 : 82/);
  assert.match(game, /runtime\.holdInputActive = false/);
  assert.match(mechanics, /## Gezegen türleri/);
  assert.match(mechanics, /## Asteroit kuşağı/);
  assert.match(mechanics, /x10 OVERDRIVE/);
  assert.match(mechanics, /açısı yavaşça sağa-sola salınan bir launcher/i);
  assert.match(mechanics, /ulaştığı her `x10` kombo katında bir ek can kazanır/i);
  assert.match(mechanics, /başarısızlık tonu/i);
  assert.match(page, /<OrbitRushGame \/>/);
  assert.match(layout, /og\.png/);
  assert.match(packageJson, /"build": "next build"/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|cloudflare/i);

  await access(new URL("../.next/BUILD_ID", import.meta.url));
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../.openai/hosting.json", import.meta.url)));
  await assert.rejects(access(new URL("../vite.config.ts", import.meta.url)));
});

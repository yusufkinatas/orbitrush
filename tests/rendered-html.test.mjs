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
  assert.match(html, /<canvas/i);
  assert.match(html, /Orbitrush oyun alanı/i);
  assert.match(html, /Developer Helper UI/i);
  assert.match(html, /og\.png/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("keeps game persistence and contains no Sites build dependency", async () => {
  const [game, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/OrbitRushGame.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(game, /orbitrush-best/);
  assert.match(game, /orbitrush-tutorial/);
  assert.match(game, /orbitrush-dev-settings/);
  assert.match(game, /event\.code !== "Space"/);
  assert.match(game, /perfectLatchWindow: 0\.25/);
  assert.match(game, /PERFECT LATCH/);
  assert.match(game, /SAFE LATCH/);
  assert.match(game, /addEventListener\("keyup"/);
  assert.match(game, /UÇUŞ · COMBO/);
  assert.match(page, /<OrbitRushGame \/>/);
  assert.match(layout, /og\.png/);
  assert.match(packageJson, /"build": "next build"/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|cloudflare/i);

  await access(new URL("../.next/BUILD_ID", import.meta.url));
  await access(new URL("../public/og.png", import.meta.url));
  await assert.rejects(access(new URL("../.openai/hosting.json", import.meta.url)));
  await assert.rejects(access(new URL("../vite.config.ts", import.meta.url)));
});

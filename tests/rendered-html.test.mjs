import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Orbitrush game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="tr">/i);
  assert.match(html, /<title>Orbitrush/i);
  assert.match(html, /ORBIT/);
  assert.match(html, /RUSH/);
  assert.match(html, /Dokun \/ Space/i);
  assert.match(html, /<canvas/i);
  assert.match(html, /Orbitrush oyun alanı/i);
  assert.match(html, /Developer Helper UI/i);
  assert.match(html, /og\.png/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("removes disposable starter UI and keeps local game persistence", async () => {
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
  assert.match(game, /DEFAULT_DEV_SETTINGS/);
  assert.match(game, /baseSpeed: 170/);
  assert.match(game, /comboSpeedGain: 0\.045/);
  assert.match(game, /lockTolerance: 11/);
  assert.match(game, /controlScheme: "toggle"/);
  assert.match(game, /latchWindow: 0\.25/);
  assert.match(game, /holdInputActive/);
  assert.match(game, /addEventListener\("keyup"/);
  assert.match(game, /UÇUŞ · SABİT/);
  assert.match(game, /\[18, 32, 46, 60\]/);
  assert.match(page, /<OrbitRushGame \/>/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)));
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL(".openai/hosting.json", templateRoot));
});

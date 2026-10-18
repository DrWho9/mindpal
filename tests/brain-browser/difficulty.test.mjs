import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { startMindpalServer } from '../../scripts/smoke-server.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright-core')); } catch { /* Optional local browser capability. */ }
const chromePath = process.env.MINDPAL_CHROME || ['/usr/local/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const root = fileURLToPath(new URL('../..', import.meta.url));
const enabled = Boolean(chromium && chromePath);
const fixtureHtml = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brain difficulty acceptance</title><link rel="stylesheet" href="/mindpal/src/brain/styles.css"><div id="app"></div><script type="module">
import {mountBrain} from '/mindpal/src/brain/index.js';
const [bank, reasoningBank] = await Promise.all(['questions.json','reasoning-questions.json'].map(file=>fetch('/mindpal/src/brain/'+file).then(r=>r.json())));
window.brainApp=mountBrain(document.getElementById('app'),{bank,reasoningBank});
</script></html>`;

test('real browser: native difficulty keyboard controls, all banks, batch resume and narrow-layout feedback', { skip: !enabled }, async () => {
  const bank = JSON.parse(readFileSync(new URL('../../src/brain/reasoning-questions.json',import.meta.url)));
  const host=await startMindpalServer(root);
  let browser;
  const errors=[];
  try {
    browser=await chromium.launch({executablePath:chromePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    for (const width of [1280,375,320]) {
      const context=await browser.newContext({viewport:{width,height:900}});
      const page=await context.newPage();
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/__brain_test',route=>route.fulfill({contentType:'text/html',body:fixtureHtml}));
      await page.goto(`${host.origin}__brain_test`);
      await page.getByRole('button',{name:'Start quiz',exact:true}).waitFor();
      const umat=page.locator('input[name$="-difficulty"][value="umat"]');
      assert.equal(await umat.isChecked(),true);
      await umat.focus();await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('input[name$="-difficulty"][value="challenge"]').isChecked(),true);
      assert.equal(await page.evaluate(()=>document.activeElement.value),'challenge');
      await page.keyboard.press('ArrowLeft');
      assert.equal(await umat.isChecked(),true);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
      for (const difficulty of ['foundation','umat','challenge']) {
        await page.locator(`input[name$="-difficulty"][value="${difficulty}"]`).check();
        const input=page.getByLabel('Questions in this round',{exact:true});
        assert.equal(await input.getAttribute('max'),difficulty==='foundation'?'320':'9');
        await input.fill('1');
        await page.locator('input[name$="-feedback-mode"][value="immediate"]').check();
        await page.getByRole('button',{name:'Start quiz',exact:true}).click();
        const ids=await page.evaluate(()=>window.brainApp.getState().session.questionIds);
        assert.equal(ids[0],difficulty==='foundation'?'brain-001':`brain-${difficulty}-001`);
        await page.locator('input[name$="-answer"][value="A"]').check();
        await page.getByRole('button',{name:'Submit answer',exact:true}).click();
        assert.equal(await page.locator('.mp-brain-feedback').count(),1);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
        await page.getByRole('button',{name:'See round results',exact:true}).click();
        await page.getByRole('button',{name:'New round',exact:true}).click();
      }
      await umat.check();
      await page.locator('input[name$="-feedback-mode"][value="batch"]').check();
      await page.getByLabel('Questions in this round',{exact:true}).fill('2');
      await page.getByRole('button',{name:'Start quiz',exact:true}).click();
      const sessionBefore=await page.evaluate(()=>window.brainApp.getState().session);
      await page.locator('input[name$="-answer"][value="B"]').check();
      await page.getByRole('button',{name:'Next',exact:true}).click();
      await page.reload();await page.locator('.mp-brain-prompt').waitFor();
      assert.equal(await page.evaluate(()=>window.brainApp.getState().session.cursor),1);
      assert.equal(await page.locator('.mp-brain-feedback,.mp-brain-review-list').count(),0);
      const body=await page.locator('body').innerText();
      for(const q of bank.questions)assert.ok(!body.includes(q.explanation));
      await page.getByRole('button',{name:'Back',exact:true}).click();
      assert.equal(await page.locator('input[name$="-answer"][value="B"]').isChecked(),true);
      await page.getByRole('button',{name:'Next',exact:true}).click();
      await page.locator('input[name$="-answer"][value="C"]').check();
      await page.getByRole('button',{name:'Submit batch',exact:true}).click();
      assert.equal(await page.locator('.mp-brain-review-item').count(),2);
      assert.equal(await page.evaluate(()=>window.brainApp.getState().session.sessionId),sessionBefore.sessionId);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
      if(process.env.BRAIN_QA_ARTIFACTS){mkdirSync(process.env.BRAIN_QA_ARTIFACTS,{recursive:true});await page.screenshot({path:`${process.env.BRAIN_QA_ARTIFACTS}/brain-results-${width}.png`,fullPage:true});}
      await context.close();
    }
    assert.deepEqual(errors,[]);
  } finally {await browser?.close();await host.close();}
});

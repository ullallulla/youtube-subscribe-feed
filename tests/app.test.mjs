import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

// Load React through Node so act() uses Node's task scheduler. Bundling React
// for a browser makes act() fall back to MessageChannels that keep Node alive.
const require = createRequire(import.meta.url);
const { outputFiles } = await build({
  stdin: {
    contents: `export { App } from './src/content/App';
      export { act, createElement } from 'react';
      export { createRoot } from 'react-dom/client';`,
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{
    name: 'native-react-runtime',
    setup(builder) {
      builder.onResolve({ filter: /^react(?:-dom)?(?:\/|$)/ }, args => ({
        path: pathToFileURL(require.resolve(args.path)).href,
        external: true,
      }));
    },
  }],
  define: { 'process.env.NODE_ENV': '"development"' },
});
const { App, act, createElement, createRoot } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`
);

test('React preserves dialog choices across feed updates, saves, and displays failures', async () => {
  const dom = new JSDOM('<!doctype html><div id="host"></div>', { url: 'https://www.youtube.com/feed/subscriptions' });
  const previous = new Map();
  const globals = {
    window: dom.window, document: dom.window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
    requestAnimationFrame: callback => { callback(); return 0; },
  };
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  const shadow = document.querySelector('#host').attachShadow({ mode: 'open' });
  const root = createRoot(shadow);
  const settings = {
    version: 1, categories: [{ id: 'reacts', name: 'Reacts' }, { id: 'gaming', name: 'Gaming' }, { id: 'tech', name: 'Tech' }],
    creatorAssignments: {},
  };
  const video = { id: 'a', title: 'A video', creatorId: '@creator', creatorName: 'Creator', url: '/watch?v=a', thumbnail: 'https://i.ytimg.com/vi/a/hqdefault.jpg', metadata: ['123K views', '2 days ago'] };
  let saved;
  let toggled = false;
  let rejectSave = false;
  const props = {
    videos: [video], settings, original: false,
    onToggle: () => { toggled = true; },
    onSave: async (creator, ids) => {
      if (rejectSave) throw new Error('Storage unavailable');
      saved = { creator, ids };
    },
  };
  const click = async node => act(async () => node.click());
  const saveButton = () => [...shadow.querySelectorAll('dialog button')].find(button => button.textContent === 'Save');
  try {
    await act(async () => root.render(createElement(App, props)));
    assert.deepEqual([...shadow.querySelectorAll('section h2')].map(node => node.textContent), ['Reacts · 0', 'Gaming · 0', 'Tech · 0', 'Other · 1']);
    assert.equal(shadow.querySelector('.metadata').textContent, '123K views · 2 days ago');
    await click(shadow.querySelector('article button'));
    await click(shadow.querySelector('input'));
    await act(async () => root.render(createElement(App, { ...props, videos: [video, { ...video, id: 'b', metadata: [] }] })));
    assert.equal(shadow.querySelectorAll('.metadata').length, 1);
    assert.equal(shadow.querySelector('input').checked, true);
    assert.ok(shadow.querySelector('dialog[open]'));
    await click(saveButton());
    assert.deepEqual(saved, { creator: '@creator', ids: ['reacts'] });
    assert.equal(shadow.querySelector('dialog'), null);
    rejectSave = true;
    await click(shadow.querySelector('article button'));
    await click(saveButton());
    assert.match(shadow.querySelector('[role="alert"]').textContent, /Could not save/);
    assert.equal(saveButton().disabled, false);
    await click(shadow.querySelector('dialog button'));
    assert.equal(shadow.querySelector('dialog'), null);
    await click(shadow.querySelector('header button'));
    assert.equal(toggled, true);
    await act(async () => root.render(createElement(App, { ...props, original: true })));
    assert.equal(shadow.querySelector('section'), null);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

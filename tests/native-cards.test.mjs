import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const { outputFiles } = await build({ entryPoints: ['src/content/native-cards.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { NativeCards } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);

const markup = (id, creator) => `<ytd-rich-item-renderer id="${id}"><yt-lockup-view-model>
  <h3><a href="/watch?v=${id}">${id}</a></h3><a href="/@${creator}">${creator}</a>
  <button class="native-menu">More actions</button><div class="watched" style="width:42%"></div>
</yt-lockup-view-model></ytd-rich-item-renderer>`;

test('moves original nodes, keeps native actions, adds new cards, and restores exact order', () => {
  const dom = new JSDOM(`<ytd-rich-grid-renderer><div id="contents">${markup('a', 'alpha')}${markup('b', 'beta')}<ytd-continuation-item-renderer></ytd-continuation-item-renderer></div></ytd-rich-grid-renderer>`, { url: 'https://www.youtube.com/feed/subscriptions' });
  const previous = new Map();
  for (const [key, value] of Object.entries({ document: dom.window.document, location: dom.window.location, Node: dom.window.Node })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  let manager;
  try {
    const feed = document.querySelector('ytd-rich-grid-renderer');
    const a = document.querySelector('#a');
    const b = document.querySelector('#b');
    let clicks = 0;
    let edit;
    a.querySelector('button').addEventListener('click', () => clicks++);
    let delegated = 0;
    feed.addEventListener('click', () => delegated++);
    manager = new NativeCards(feed, (video, trigger) => { edit = { video, trigger }; });
    const settings = { version: 2, categories: [{ id: 'tech', name: 'Tech' }, { id: 'gaming', name: 'Gaming' }], creatorAssignments: { '@alpha': 'tech' } };
    manager.sync(settings);
    assert.equal(manager.container.querySelectorAll('[data-native-group-card]').length, 2);
    assert.equal(manager.container.querySelector('#a'), a);
    assert.equal(a.querySelector('.watched').style.width, '42%');
    a.querySelector('button').click();
    assert.equal(clicks, 1);
    assert.equal(delegated, 1);
    a.parentElement.querySelector('.native-group-category').click();
    assert.equal(edit.video.creatorId, '@alpha');
    assert.equal(delegated, 1);
    const wrapper = a.parentElement;
    manager.sync(settings);
    assert.equal(a.parentElement, wrapper);
    settings.creatorAssignments['@alpha'] = 'gaming';
    manager.sync(settings);
    assert.match(a.closest('section').querySelector('h2').textContent, /Gaming/);
    // Simulate YouTube appending another page of videos at its continuation.
    feed.querySelector('ytd-continuation-item-renderer').insertAdjacentHTML('beforebegin', markup('c', 'alpha'));
    manager.sync(settings);
    assert.equal(manager.container.querySelectorAll('[data-native-group-card]').length, 3);
    assert.deepEqual([...a.closest('section').querySelectorAll('ytd-rich-item-renderer')].map(node => node.id), ['a', 'c']);
    manager.restore();
    assert.deepEqual([...feed.querySelector('#contents').children].map(node => node.id || node.tagName.toLowerCase()), ['a', 'b', 'c', 'ytd-continuation-item-renderer']);
    assert.equal(document.querySelector('#b'), b);
    assert.equal(document.querySelector('[data-native-groups]'), null);
  } finally {
    manager?.restore();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test('keeps native Shorts shelves together and routes standalone Shorts before Other', () => {
  const short = id => `<ytd-rich-item-renderer id="${id}"><ytm-shorts-lockup-view-model>
    <a href="/shorts/${id}" aria-label="A Short">A Short</a><a href="/@alpha">alpha</a>
  </ytm-shorts-lockup-view-model></ytd-rich-item-renderer>`;
  const shelf = `<ytd-rich-section-renderer id="shelf"><ytd-rich-shelf-renderer is-shorts>
    <h2>Shorts</h2>${short('inside')}<button class="carousel-next">Next</button>
  </ytd-rich-shelf-renderer></ytd-rich-section-renderer>`;
  const dom = new JSDOM(`<ytd-rich-grid-renderer><div id="contents">${markup('regular', 'alpha')}${shelf}${short('standalone')}<ytd-continuation-item-renderer></ytd-continuation-item-renderer></div></ytd-rich-grid-renderer>`, { url: 'https://www.youtube.com/feed/subscriptions' });
  const previous = new Map();
  for (const [key, value] of Object.entries({ document: dom.window.document, location: dom.window.location, Node: dom.window.Node })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  let manager;
  try {
    const feed = document.querySelector('ytd-rich-grid-renderer');
    const shelfNode = document.querySelector('#shelf');
    const inside = document.querySelector('#inside');
    const standalone = document.querySelector('#standalone');
    let nextClicks = 0;
    shelfNode.querySelector('button').addEventListener('click', () => nextClicks++);
    manager = new NativeCards(feed, () => {});
    const settings = { version: 2, categories: [{ id: 'gaming', name: 'Gaming' }], creatorAssignments: { '@alpha': 'gaming' } };
    manager.sync(settings);
    const sections = [...manager.container.children];
    assert.deepEqual(sections.map(node => node.querySelector('h2').textContent), ['Gaming · 1', 'Shorts', 'Other · 0']);
    assert.equal(sections[1].querySelector('#shelf'), shelfNode);
    assert.equal(shelfNode.querySelector('#inside'), inside);
    assert.equal(sections[1].querySelector('#standalone'), standalone);
    assert.equal(sections[1].querySelectorAll('.native-group-category').length, 0);
    assert.equal(sections[1].querySelectorAll('[data-native-group-card]').length, 2);
    shelfNode.querySelector('button').click();
    assert.equal(nextClicks, 1);
    // Both newly loaded shelf cards and standalone Shorts retain their native nodes.
    shelfNode.querySelector('ytd-rich-shelf-renderer').insertAdjacentHTML('beforeend', short('inside-later'));
    feed.querySelector('ytd-continuation-item-renderer').insertAdjacentHTML('beforebegin', short('later'));
    manager.sync(settings);
    assert.equal(sections[1].querySelectorAll('[data-native-group-card]').length, 3);
    assert.ok(shelfNode.querySelector('#inside-later'));
    assert.equal(settings.creatorAssignments['@alpha'], 'gaming');
    manager.restore();
    assert.deepEqual([...feed.querySelector('#contents').children].map(node => node.id || node.tagName.toLowerCase()), ['regular', 'shelf', 'standalone', 'later', 'ytd-continuation-item-renderer']);
    assert.equal(shelfNode.querySelector('#inside'), inside);
  } finally {
    manager?.restore();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

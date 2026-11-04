import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const { outputFiles } = await build({ stdin: { contents: "export { NativeCards } from './src/content/native-cards'; export { nativeStyles } from './src/content/styles';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, platform: 'node', format: 'esm', write: false });
const { NativeCards, nativeStyles } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
const markup = (id, creator = 'alpha') => `<ytd-rich-item-renderer id="${id}"><yt-lockup-view-model><h3><a href="/watch?v=${id}">${id}</a></h3><a href="/@${creator}">${creator}</a><button class="native-menu">More actions</button><div class="watched" style="width:42%"></div></yt-lockup-view-model></ytd-rich-item-renderer>`;
const defaults = () => ({ version: 2, categories: [{ id: 'tech', name: 'Tech' }, { id: 'gaming', name: 'Gaming' }], creatorAssignments: { '@alpha': 'tech' } });

async function fixture(content, run) {
  const dom = new JSDOM(`<style>${nativeStyles}</style><ytd-rich-grid-renderer><div id="contents">${content}<ytd-continuation-item-renderer></ytd-continuation-item-renderer></div></ytd-rich-grid-renderer>`, { url: 'https://www.youtube.com/feed/subscriptions' });
  const previous = new Map();
  for (const [key, value] of Object.entries({ document: dom.window.document, location: dom.window.location })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, value });
  }
  const feed = document.querySelector('ytd-rich-grid-renderer');
  const source = feed.querySelector('#contents');
  const settings = defaults();
  const expanded = new Set();
  const visibleLimits = new Map();
  let manager = new NativeCards(feed, () => {}, expanded, visibleLimits);
  const context = {
    dom, feed, source, settings, expanded,
    get manager() { return manager; },
    toggle: name => [...manager.container.querySelectorAll('.native-group-toggle')].find(node => node.textContent === name),
    display: node => dom.window.getComputedStyle(node).display,
    remount: () => { manager.restore(); manager = new NativeCards(feed, () => {}, expanded, visibleLimits); manager.sync(settings); },
  };
  try { await run(context); }
  finally {
    manager.restore();
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test('never reparents native cards, preserves actions, and only changes visual ordering', () => fixture(markup('a') + markup('b', 'beta'), ({ dom, manager, settings, feed, source, toggle, display }) => {
  const a = source.querySelector('#a');
  const b = source.querySelector('#b');
  const original = [...source.children].filter(node => node !== manager.container);
  let clicks = 0;
  a.querySelector('.native-menu').addEventListener('click', () => clicks++);
  const observer = new dom.window.MutationObserver(() => {});
  observer.observe(source, { childList: true, subtree: true, attributes: true });
  manager.sync(settings);
  assert.equal(a.parentElement, source);
  assert.equal(b.parentElement, source);
  assert.ok(!observer.takeRecords().some(change => [...change.removedNodes].includes(a) || [...change.removedNodes].includes(b)));
  assert.equal(display(a), 'none');
  toggle('Tech').click();
  assert.notEqual(display(a), 'none');
  assert.equal(display(b), 'none');
  assert.equal(a.querySelector('.watched').style.width, '42%');
  a.querySelector('.native-menu').click();
  assert.equal(clicks, 1);
  const before = a.style.order;
  settings.creatorAssignments['@alpha'] = 'gaming';
  manager.sync(settings);
  assert.notEqual(a.style.order, before);
  assert.equal(a.parentElement, source);
  assert.equal(display(a), 'none');
  toggle('Gaming').click();
  assert.notEqual(display(a), 'none');
  observer.takeRecords();
  manager.sync(settings);
  assert.equal(observer.takeRecords().length, 0);
  observer.disconnect();
  manager.restore();
  assert.deepEqual([...source.children], original);
  assert.equal(a.style.order, '');
  assert.equal(a.querySelector('.native-group-category'), null);
  assert.equal(feed.hasAttribute('data-native-grouped'), false);
}));

test('category visibility grows by ten and resets without moving cards or loading videos', () => fixture(
  Array.from({ length: 25 }, (_, i) => markup(`tech-${i}`)).join('') + Array.from({ length: 12 }, (_, i) => markup(`other-${i}`, 'beta')).join(''),
  context => {
    const { source, settings, toggle, display } = context;
    const cards = [...source.querySelectorAll('ytd-rich-item-renderer')];
    const visible = prefix => cards.filter(card => card.id.startsWith(prefix) && display(card) !== 'none');
    const button = label => context.manager.container.querySelector(`[aria-label="${label}"]`);
    context.manager.sync(settings);
    toggle('Tech').click();
    toggle('Other').click();
    assert.equal(visible('tech').length, 10);
    assert.equal(visible('other').length, 10);
    assert.equal(button('Show fewer videos in Tech').hidden, true);
    button('Show more videos in Tech').click();
    assert.equal(visible('tech').length, 20);
    assert.equal(visible('other').length, 10);
    context.manager.sync(settings);
    context.remount();
    assert.equal(visible('tech').length, 20);
    button('Show more videos in Tech').click();
    assert.equal(visible('tech').length, 25);
    assert.equal(button('Show more videos in Tech').hidden, false);
    assert.equal(button('Show more videos in Tech').disabled, false);
    button('Show fewer videos in Tech').click();
    assert.equal(visible('tech').length, 10);
    assert.equal(context.toggle('Tech').getAttribute('aria-expanded'), 'true');
    assert.equal(document.activeElement, context.toggle('Tech'));
    // An insertion at the beginning must take precedence over an older tracked card.
    source.insertAdjacentHTML('afterbegin', markup('newest'));
    context.manager.sync(settings);
    assert.notEqual(display(source.querySelector('#newest')), 'none');
    assert.equal(display(source.querySelector('#tech-9')), 'none');
    context.toggle('Tech').click();
    assert.equal(display(button('Show more videos in Tech').parentElement), 'none');
    assert.equal(display(source.querySelector('ytd-continuation-item-renderer')), 'none');
    assert.ok(cards.every(card => card.parentElement === source));
    context.manager.restore();
    assert.ok(cards.every(card => display(card) !== 'none'));
  },
));

for (const count of [0, 6, 10, 11, 20, 21, 30]) {
  test(`Show more stays available with ${count} loaded videos and requests just one batch when exhausted`, () => fixture(
    Array.from({ length: count }, (_, i) => markup(`video-${i}`)).join(''),
    ({ manager, source, settings, toggle, display }) => {
      const continuation = source.querySelector('ytd-continuation-item-renderer');
      let requests = 0;
      continuation.scrollIntoView = () => requests++;
      manager.sync(settings);
      toggle('Tech').click();
      const more = manager.container.querySelector('[aria-label="Show more videos in Tech"]');
      const visible = () => [...source.querySelectorAll('[data-native-card]')].filter(card => display(card) !== 'none').length;
      assert.notEqual(display(more.parentElement), 'none');
      assert.notEqual(display(more), 'none');
      while (visible() < count) {
        const before = visible();
        more.click();
        assert.equal(visible(), Math.min(count, before + 10));
        assert.equal(requests, 0);
        assert.equal(more.hidden, false);
      }
      more.click();
      assert.equal(requests, 1);
      assert.equal(more.disabled, true);
      more.click();
      assert.equal(requests, 1);
      // A feed batch can contain only videos for a different category.
      continuation.insertAdjacentHTML('beforebegin', markup('unrelated', 'beta'));
      manager.sync(settings);
      assert.equal(more.disabled, false);
      assert.equal(requests, 1);
      assert.equal(toggle('Tech').getAttribute('aria-expanded'), 'true');
      more.click();
      assert.equal(requests, 2);
      continuation.insertAdjacentHTML('beforebegin', markup('next-match'));
      manager.sync(settings);
      assert.equal(visible(), count + 1);
      assert.equal(display(continuation), 'none');
      continuation.remove();
      manager.sync(settings);
      assert.equal(more.hidden, false);
      assert.equal(more.disabled, true);
      assert.notEqual(display(more.parentElement), 'none');
    },
  ));
}

test('ignores Most relevant shelves and keeps native Shorts inside their original shelf', () => fixture(`
  <ytd-rich-section-renderer id="relevant"><ytd-rich-shelf-renderer><h2>Osuvimmat</h2>${markup('recommended')}</ytd-rich-shelf-renderer></ytd-rich-section-renderer>
  ${markup('regular')}
  <ytd-rich-section-renderer id="shorts"><ytd-rich-shelf-renderer is-shorts><h2>Shorts</h2><ytm-shorts-lockup-view-model id="short"><a href="/shorts/short" aria-label="Short">Short</a></ytm-shorts-lockup-view-model><button>Next</button></ytd-rich-shelf-renderer></ytd-rich-section-renderer>`, ({ manager, source, settings, toggle, display }) => {
  const shelf = source.querySelector('#shorts');
  const short = source.querySelector('#short');
  const parent = short.parentElement;
  manager.sync(settings);
  assert.equal(display(source.querySelector('#relevant')), 'none');
  assert.equal(source.querySelector('#recommended').hasAttribute('data-native-card'), false);
  assert.equal(display(shelf), 'none');
  toggle('Shorts').click();
  assert.notEqual(display(shelf), 'none');
  assert.equal(shelf.parentElement, source);
  assert.equal(short.parentElement, parent);
  assert.equal(shelf.querySelector('.native-group-category'), null);
  manager.restore();
  assert.equal(source.querySelector('[data-native-group-excluded]'), null);
}));

test('opening a category never exposes native continuation; load more is explicit and bounded', () => fixture(markup('a'), ({ manager, source, feed, settings, toggle, display }) => {
  const continuation = source.querySelector('ytd-continuation-item-renderer');
  let scrolled = 0;
  continuation.scrollIntoView = () => scrolled++;
  manager.sync(settings);
  assert.equal(display(continuation), 'none');
  toggle('Tech').click();
  assert.equal(display(continuation), 'none');
  assert.equal(scrolled, 0);
  const load = manager.container.querySelector('.native-group-footer button');
  load.click();
  assert.equal(scrolled, 1);
  assert.equal(load.disabled, true);
  assert.notEqual(display(continuation), 'none');
  continuation.insertAdjacentHTML('beforebegin', markup('b'));
  const b = source.querySelector('#b');
  assert.equal(display(b), 'none');
  manager.sync(settings);
  assert.equal(b.parentElement, source);
  assert.notEqual(display(b), 'none');
  assert.equal(display(continuation), 'none');
  assert.equal(load.disabled, false);
  assert.equal(feed.hasAttribute('data-native-loading'), false);
}));

test('expanded state survives source replacement and native wrapper paths stay unchanged', () => fixture(`<ytd-rich-grid-row id="row"><div id="row-contents">${markup('a')}</div></ytd-rich-grid-row>`, context => {
  const { manager, source, feed, settings, toggle, display } = context;
  const a = source.querySelector('#a');
  const originalParent = a.parentElement;
  manager.sync(settings);
  toggle('Tech').click();
  assert.equal(a.parentElement, originalParent);
  assert.ok(originalParent.hasAttribute('data-native-flat'));
  const replacement = document.createElement('div');
  replacement.id = 'contents';
  replacement.innerHTML = markup('b');
  source.replaceWith(replacement);
  assert.equal(manager.isAttached(), false);
  context.remount();
  assert.equal(context.toggle('Tech').getAttribute('aria-expanded'), 'true');
  assert.notEqual(display(feed.querySelector('#b')), 'none');
  assert.equal(feed.querySelector('#b').parentElement, replacement);
  context.expanded.clear();
  context.remount();
  assert.equal(context.toggle('Tech').getAttribute('aria-expanded'), 'false');
}));

test('a stalled load stops exposing the continuation and keeps the category open', () => fixture(markup('a'), async ({ manager, source, feed, settings, toggle, display }) => {
  const continuation = source.querySelector('ytd-continuation-item-renderer');
  continuation.scrollIntoView = () => {};
  manager.sync(settings);
  toggle('Tech').click();
  const load = manager.container.querySelector('.native-group-footer button');
  load.click();
  await new Promise(resolve => setTimeout(resolve, 5100));
  assert.equal(display(continuation), 'none');
  assert.equal(feed.hasAttribute('data-native-loading'), false);
  assert.equal(continuation.hasAttribute('data-native-load-control'), false);
  assert.equal(load.disabled, false);
  assert.equal(toggle('Tech').getAttribute('aria-expanded'), 'true');
  assert.match(manager.container.querySelector('[role="status"]').textContent, /Loading paused/);
}));

test('late recommendation headings remove a card from grouping without moving it', () => fixture(`<ytd-rich-section-renderer id="late"><ytd-rich-shelf-renderer><h2></h2>${markup('a')}</ytd-rich-shelf-renderer></ytd-rich-section-renderer>`, ({ manager, source, settings, toggle, display }) => {
  const card = source.querySelector('#a');
  const parent = card.parentElement;
  manager.sync(settings);
  toggle('Tech').click();
  assert.equal(card.parentElement, parent);
  source.querySelector('#late h2').textContent = 'Most relevant';
  manager.sync(settings);
  assert.equal(card.parentElement, parent);
  assert.equal(card.hasAttribute('data-native-card'), false);
  assert.equal(display(source.querySelector('#late')), 'none');
  manager.restore();
  assert.equal(source.querySelector('[data-native-group-excluded]'), null);
}));

test('a Shorts shelf with its own continuation keeps its native layout when expanded', () => fixture(`
  <ytd-rich-section-renderer id="shorts"><ytd-rich-shelf-renderer is-shorts><h2 id="shelf-title">Shorts</h2><div id="shelf-items"><ytm-shorts-lockup-view-model><a href="/shorts/s1" aria-label="Short">Short</a></ytm-shorts-lockup-view-model><ytd-continuation-item-renderer id="shelf-continuation"></ytd-continuation-item-renderer></div></ytd-rich-shelf-renderer></ytd-rich-section-renderer>`, ({ manager, source, settings, toggle, display }) => {
  const shelf = source.querySelector('#shorts');
  manager.sync(settings);
  toggle('Shorts').click();
  assert.ok(!['none', 'contents'].includes(display(shelf)));
  assert.notEqual(display(source.querySelector('#shelf-title')), 'none');
  assert.equal(source.querySelector('[data-native-shorts-shelf] [data-native-flat]'), null);
  assert.equal(shelf.hasAttribute('data-native-flat'), false);
  // The feed's own continuation still gets a layout path for explicit loads.
  const continuation = source.querySelector(':scope > ytd-continuation-item-renderer');
  continuation.scrollIntoView = () => {};
  manager.container.querySelector('.native-group-footer button').click();
  assert.equal(continuation.hasAttribute('data-native-load-control'), true);
}));

test('focus returns to the trigger, or to its new section when the card is collapsed', () => fixture(markup('a') + markup('b', 'beta'), ({ manager, source, settings, toggle }) => {
  manager.sync(settings);
  toggle('Other').click();
  const trigger = source.querySelector('#b .native-group-category');
  assert.equal(manager.focusTarget(trigger), trigger);
  settings.creatorAssignments['@beta'] = 'gaming';
  manager.sync(settings);
  assert.equal(manager.focusTarget(trigger), toggle('Gaming'));
  toggle('Gaming').click();
  assert.equal(manager.focusTarget(trigger), trigger);
  assert.equal(manager.focusTarget(document.createElement('button')), null);
}));

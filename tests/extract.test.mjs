import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const { outputFiles } = await build({
  entryPoints: ['src/content/extract.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
});
const { extractRelevantShelves, extractVideos } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);

function withFeed(markup, run) {
  const dom = new JSDOM(markup, { url: 'https://www.youtube.com/feed/subscriptions' });
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: dom.window.location });
  try {
    return run(dom.window.document.body);
  } finally {
    dom.window.close();
    if (previous) Object.defineProperty(globalThis, 'location', previous);
    else delete globalThis.location;
  }
}

test('extracts the video ID, title and creator from a regular card', () => {
  const [video] = withFeed(`<ytd-rich-item-renderer>
    <a href="/@Creator"><img></a>
    <a id="video-title" href="/watch?v=123&t=4">A video</a>
    <a href="/@Creator">Creator</a>
  </ytd-rich-item-renderer>`, feed => extractVideos(feed).videos);
  assert.equal(video.id, '123');
  assert.equal(video.title, 'A video');
  assert.equal(video.creatorId, '@creator');
  assert.equal(video.creatorName, 'Creator');
  assert.equal(video.isShort, false);
});

test('recognizes standalone Shorts and cards without a readable creator', () => {
  const videos = withFeed(`<ytm-shorts-lockup-view-model><a href="/shorts/abc" aria-label="Short">Short</a></ytm-shorts-lockup-view-model>
    <ytd-rich-item-renderer><a id="video-title" href="/watch?v=456">No creator</a></ytd-rich-item-renderer>`, feed => extractVideos(feed).videos);
  assert.deepEqual(videos.map(video => [video.id, video.isShort, video.creatorId]), [['abc', true, null], ['456', false, null]]);
});

test('a video title named Most relevant is not mistaken for a shelf heading', () => {
  withFeed(`<ytd-rich-shelf-renderer><ytd-rich-item-renderer>
    <h2 id="title">Most relevant</h2><a id="video-title" href="/watch?v=123">Most relevant</a>
  </ytd-rich-item-renderer></ytd-rich-shelf-renderer>`, feed => {
    assert.deepEqual(extractRelevantShelves(feed), []);
    assert.equal(extractVideos(feed).videos.length, 1);
  });
});

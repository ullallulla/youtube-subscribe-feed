import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const { outputFiles } = await build({
  entryPoints: ['src/content/extract.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
});
const { extractVideos } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);

function extract(markup) {
  const dom = new JSDOM(`<ytd-rich-item-renderer>
    <a id="video-title" href="/watch?v=123">A video</a>
    <a href="/@creator">Creator</a>${markup}
  </ytd-rich-item-renderer>`, { url: 'https://www.youtube.com/feed/subscriptions' });
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: dom.window.location });
  try {
    return extractVideos(dom.window.document.body).videos[0].metadata;
  } finally {
    dom.window.close();
    if (previous) Object.defineProperty(globalThis, 'location', previous);
    else delete globalThis.location;
  }
}

test('extracts view counts and upload ages from legacy video cards', () => {
  assert.deepEqual(extract(`<div id="metadata-line">
    <span class="inline-metadata-item"> 123K views </span>
    <span class="inline-metadata-item">2 days ago</span>
  </div>`), ['123K views', '2 days ago']);
});

test('extracts modern metadata without including the creator row or separators', () => {
  assert.deepEqual(extract(`<div class="yt-content-metadata-view-model__metadata-row">
    <span class="yt-content-metadata-view-model__metadata-text"><a href="/@creator">Creator</a></span>
  </div><div class="yt-content-metadata-view-model__metadata-row">
    <span class="yt-content-metadata-view-model__metadata-text">1,2 t. katselukertaa</span>
    <span aria-hidden="true">•</span>
    <span class="yt-content-metadata-view-model__metadata-text">3 tuntia sitten</span>
  </div>`), ['1,2 t. katselukertaa', '3 tuntia sitten']);
});

test('missing metadata stays empty and partial/live metadata stays intact', () => {
  assert.deepEqual(extract(''), []);
  assert.deepEqual(extract('<div id="metadata-line"><span class="inline-metadata-item">1.2K watching</span></div>'), ['1.2K watching']);
});

// Covers the camelCase layout in the public subscription-card sample:
// https://github.com/NikoboiNFTB/YouTube-Tweaks/blob/main/subs-vids.html
test('extracts camelCase metadata beside creator links and across rows', () => {
  assert.deepEqual(extract(`<yt-content-metadata-view-model>
    <div class="ytContentMetadataViewModelMetadataRow">
      <span class="ytContentMetadataViewModelMetadataText"><a href="/@creator">Creator</a></span>
      <span class="ytContentMetadataViewModelDelimiter" aria-hidden="true"> • </span>
      <span class="ytContentMetadataViewModelMetadataText">12K views</span>
    </div>
    <div class="ytContentMetadataViewModelMetadataRow">
      <span class="ytContentMetadataViewModelMetadataText">2 hours ago</span>
    </div>
  </yt-content-metadata-view-model>`), ['12K views', '2 hours ago']);
});

test('extracts camelCase metadata when counts and age share a separate row', () => {
  assert.deepEqual(extract(`<div class="ytContentMetadataViewModelMetadataRow">
    <span class="ytContentMetadataViewModelMetadataText"><a href="/@creator">Creator</a></span>
  </div><div class="ytContentMetadataViewModelMetadataRow">
    <span class="ytContentMetadataViewModelMetadataText">94K views</span>
    <span class="ytContentMetadataViewModelDelimiter"> • </span>
    <span class="ytContentMetadataViewModelMetadataText">1 day ago</span>
  </div>`), ['94K views', '1 day ago']);
});

test('supports wiz metadata classes and a live count beside the creator', () => {
  assert.deepEqual(extract(`<div class="yt-content-metadata-view-model-wiz__metadata-row">
    <span class="yt-content-metadata-view-model-wiz__metadata-text"><a href="/@creator">Creator</a></span>
    <span class="yt-content-metadata-view-model-wiz__metadata-text">84 watching</span>
  </div>`), ['84 watching']);
});

test('a video title named Most relevant is not mistaken for a shelf heading', () => {
  assert.deepEqual(extract('<h2 id="title">Most relevant</h2><div id="metadata-line"><span class="inline-metadata-item">42 views</span></div>'), ['42 views']);
});

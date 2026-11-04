import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: ['src/shared/feed.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
});
const { feedSections, videoSection, parseSettings, creatorIdentity } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`
);
const video = (id, creatorId = '@creator') => ({ id, creatorId, title: id, url: '', creatorName: 'Creator' });
const sections = (videos, settings) => videos.map(item => videoSection(item, settings));

test('sections follow category order, then Shorts, then Other', () => {
  const settings = parseSettings(undefined);
  settings.creatorAssignments['@creator'] = 'reacts';
  assert.deepEqual(feedSections(settings).map(section => section.id), ['reacts', 'gaming', 'tech', '__shorts__', 'other']);
  assert.deepEqual(sections([video('new'), video('old')], settings), ['reacts', 'reacts']);
});

test('unassigned, missing and stale creator assignments fall into Other', () => {
  const settings = parseSettings(undefined);
  settings.creatorAssignments['@stale'] = 'deleted';
  assert.deepEqual(sections([video('a'), video('b', null), video('c', '@stale')], settings), ['other', 'other', 'other']);
});

test('assigning and clearing a creator moves all uploads, including future ones', () => {
  let settings = parseSettings(undefined);
  settings.creatorAssignments['@creator'] = 'gaming';
  settings = parseSettings(JSON.parse(JSON.stringify(settings)));
  const items = [video('old'), video('future')];
  assert.deepEqual(sections(items, settings), ['gaming', 'gaming']);
  settings.creatorAssignments['@creator'] = null;
  assert.deepEqual(sections(items, settings), ['other', 'other']);
});

test('creator identity ignores query strings and tab paths, rejects unrelated URLs', () => {
  assert.equal(creatorIdentity('/@Creator/videos?view=0'), '@creator');
  assert.equal(creatorIdentity('/channel/UCcaseSensitive/featured'), 'channel/UCcaseSensitive');
  assert.equal(creatorIdentity('/watch?v=123'), null);
  assert.equal(creatorIdentity('https://example.com/@Creator'), null);
});

test('invalid saved data is rejected instead of silently overwriting assignments', () => {
  assert.throws(() => parseSettings({ version: 3 }));
  const settings = parseSettings(undefined);
  settings.categories.push({ id: 'other', name: 'Other' });
  assert.throws(() => parseSettings(settings));
});


test('migrates old memberships using section order rather than assignment order', () => {
  const defaults = parseSettings(undefined);
  const migrated = parseSettings({ ...defaults, version: 1,
    creatorAssignments: { '@creator': ['tech', 'reacts'], '@stale': ['gone'], '@empty': [] },
  });
  assert.equal(migrated.version, 2);
  assert.equal(migrated.creatorAssignments['@creator'], 'reacts');
  assert.equal(migrated.creatorAssignments['@stale'], null);
  assert.equal(migrated.creatorAssignments['@empty'], null);
  assert.deepEqual(parseSettings(JSON.parse(JSON.stringify(migrated))), migrated);
});

test('version 2 rejects multiple category assignments', () => {
  const settings = parseSettings(undefined);
  settings.creatorAssignments['@creator'] = ['reacts', 'tech'];
  assert.throws(() => parseSettings(settings));
});


test('Shorts bypass creator categories and Other without changing assignments', () => {
  const settings = parseSettings(undefined);
  settings.creatorAssignments['@creator'] = 'gaming';
  const items = [video('regular'), { ...video('short'), isShort: true }, { ...video('unknown', null), isShort: true }];
  assert.deepEqual(sections(items, settings), ['gaming', '__shorts__', '__shorts__']);
  assert.equal(settings.creatorAssignments['@creator'], 'gaming');
  assert.ok(!settings.categories.some(category => category.id === '__shorts__'));
});

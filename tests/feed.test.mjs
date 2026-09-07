import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const { outputFiles } = await build({
  entryPoints: ['src/shared/feed.ts'], bundle: true, platform: 'node', format: 'esm', write: false,
});
const { groupVideos, parseSettings, creatorIdentity } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`
);
const video = (id, creatorId = '@creator') => ({ id, creatorId, title: id, url: '', thumbnail: '', creatorName: 'Creator' });

test('multiple memberships duplicate across sections only, preserving source order', () => {
  const settings = parseSettings(undefined);
  settings.creatorAssignments['@creator'] = ['reacts', 'tech', 'tech'];
  const groups = groupVideos([video('new'), video('old'), video('new')], settings);
  assert.deepEqual([...groups.keys()], ['reacts', 'gaming', 'tech', 'other']);
  assert.deepEqual(groups.get('reacts').map(v => v.id), ['new', 'old']);
  assert.deepEqual(groups.get('tech').map(v => v.id), ['new', 'old']);
  assert.equal(groups.get('other').length, 0);
});

test('unassigned, missing and stale creator assignments fall into Other', () => {
  const settings = parseSettings(undefined);
  settings.creatorAssignments['@stale'] = ['deleted'];
  assert.equal(groupVideos([video('a'), video('b', null), video('c', '@stale')], settings).get('other').length, 3);
});

test('assigning and clearing a creator moves all uploads, including future ones', () => {
  let settings = parseSettings(undefined);
  settings.creatorAssignments['@creator'] = ['gaming'];
  settings = parseSettings(JSON.parse(JSON.stringify(settings)));
  const items = [video('old'), video('future')];
  assert.equal(groupVideos(items, settings).get('gaming').length, 2);
  settings.creatorAssignments['@creator'] = [];
  assert.equal(groupVideos(items, settings).get('other').length, 2);
});

test('creator identity ignores query strings and tab paths, rejects unrelated URLs', () => {
  assert.equal(creatorIdentity('/@Creator/videos?view=0'), '@creator');
  assert.equal(creatorIdentity('/channel/UCcaseSensitive/featured'), 'channel/UCcaseSensitive');
  assert.equal(creatorIdentity('/watch?v=123'), null);
  assert.equal(creatorIdentity('https://example.com/@Creator'), null);
});

test('invalid saved data is rejected instead of silently overwriting assignments', () => {
  assert.throws(() => parseSettings({ version: 2 }));
  const settings = parseSettings(undefined);
  settings.categories.push({ id: 'other', name: 'Other' });
  assert.throws(() => parseSettings(settings));
});

import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../shared/categories';
import { groupVideos, type Video } from '../shared/feed';

export interface AppProps {
  videos: Video[];
  settings: Settings;
  original: boolean;
  onToggle: () => void;
  onSave: (creatorId: string, categoryIds: string[]) => Promise<void>;
}

interface Editor {
  video: Video;
  trigger: HTMLButtonElement;
}

function CategoryDialog({ video, settings, onSave, onDismiss }: {
  video: Video;
  settings: Settings;
  onSave: AppProps['onSave'];
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(() => new Set(settings.creatorAssignments[video.creatorId!] ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    return () => node.close();
  }, []);

  async function save() {
    setSaving(true);
    setError('');
    try {
      await onSave(video.creatorId!, [...selected]);
      onDismiss();
    } catch {
      setError('Could not save. Try again, or reload this page if the extension was updated.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="category-dialog-title" onCancel={event => {
      event.preventDefault();
      if (!saving) onDismiss();
    }}>
      <h2 id="category-dialog-title">Categories for {video.creatorName}</h2>
      <p>All videos from this creator will appear in each selected category.</p>
      <fieldset disabled={saving}>
        <legend>Choose categories</legend>
        {settings.categories.map(category => (
          <label key={category.id}>
            <input type="checkbox" checked={selected.has(category.id)} onChange={event => {
              const next = new Set(selected);
              if (event.target.checked) next.add(category.id);
              else next.delete(category.id);
              setSelected(next);
            }} />
            {category.name}
          </label>
        ))}
      </fieldset>
      <p>Leave all unchecked to place this creator in Other.</p>
      <p className="error" role="alert">{error}</p>
      <div className="actions">
        <button disabled={saving} onClick={onDismiss}>Cancel</button>
        <button disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </dialog>
  );
}

export function App({ videos, settings, original, onToggle, onSave }: AppProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const groups = groupVideos(videos, settings);

  function dismiss() {
    const trigger = editor?.trigger;
    setEditor(null);
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus();
      else toggle.current?.focus();
    });
  }

  return <>
    <header>
      <h1>Your subscription groups</h1>
      <button ref={toggle} onClick={onToggle}>{original ? 'Show grouped feed' : 'Show original feed'}</button>
    </header>
    <p className="hint">{original
      ? 'You are viewing the original YouTube feed.'
      : 'Choose Categories on a video to organize its creator. Sections include videos loaded so far, in feed order. Scroll down to load more.'}</p>
    {!original && [...settings.categories, { id: 'other', name: 'Other' }].map(category => {
      const items = groups.get(category.id)!;
      return <section key={category.id}>
        <h2>{category.name} · {items.length}</h2>
        {items.length ? <div className="grid">{items.map(video => (
          <article key={video.id}>
            <a href={video.url}>
              <img src={video.thumbnail} alt="" loading="lazy" />
              <h3>{video.title}</h3>
            </a>
            <p className="creator">{video.creatorName}</p>
            {!!video.metadata?.length && <p className="metadata">{video.metadata.join(' · ')}</p>}
            {video.creatorId && <button aria-label={`Choose categories for ${video.creatorName}`}
              onClick={event => setEditor({ video, trigger: event.currentTarget })}>Categories</button>}
          </article>
        ))}</div> : <p className="empty">No matching videos loaded yet.</p>}
      </section>;
    })}
    {editor && <CategoryDialog video={editor.video} settings={settings} onSave={onSave} onDismiss={dismiss} />}
  </>;
}

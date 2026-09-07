import { useEffect, useRef, useState } from 'react';
import type { Settings } from '../shared/categories';
import type { Video } from '../shared/feed';

export interface Editor {
  video: Video;
  trigger: HTMLButtonElement;
}

export interface AppProps {
  settings: Settings;
  original: boolean;
  editor: Editor | null;
  onToggle: () => void;
  onDismiss: () => void;
  onSave: (creatorId: string, categoryId: string | null) => Promise<void>;
}

function CategoryDialog({ video, settings, onSave, onDismiss }: {
  video: Video;
  settings: Settings;
  onSave: AppProps['onSave'];
  onDismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState(settings.creatorAssignments[video.creatorId!] ?? null);
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
      await onSave(video.creatorId!, selected);
      onDismiss();
    } catch {
      setError('Could not save. Try again, or reload this page if the extension was updated.');
      setSaving(false);
    }
  }

  return <dialog ref={dialog} aria-labelledby="category-dialog-title" onCancel={event => {
    event.preventDefault();
    if (!saving) onDismiss();
  }}>
    <h2 id="category-dialog-title">Category for {video.creatorName}</h2>
    <p>All videos from this creator will appear in the selected category.</p>
    <fieldset disabled={saving}>
      <legend>Choose one category</legend>
      {[...settings.categories, { id: 'other', name: 'Other' }].map(category => {
        const value = category.id === 'other' ? null : category.id;
        return <label key={category.id}>
          <input type="radio" name="creator-category" checked={selected === value} onChange={() => setSelected(value)} />
          {category.name}
        </label>;
      })}
    </fieldset>
    <p className="error" role="alert">{error}</p>
    <div className="actions">
      <button disabled={saving} onClick={onDismiss}>Cancel</button>
      <button disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</button>
    </div>
  </dialog>;
}

export function App({ settings, original, editor, onToggle, onDismiss, onSave }: AppProps) {
  return <>
    <header>
      <h1>Your subscription groups</h1>
      <button onClick={onToggle}>{original ? 'Show grouped feed' : 'Show original feed'}</button>
    </header>
    <p className="hint">{original
      ? 'You are viewing the original YouTube feed.'
      : 'Click a section title to show its videos. Use Choose category below a video to organize its creator, and Load more videos at the bottom for older uploads.'}</p>
    {editor && <CategoryDialog key={editor.video.creatorId} video={editor.video} settings={settings} onSave={onSave} onDismiss={onDismiss} />}
  </>;
}

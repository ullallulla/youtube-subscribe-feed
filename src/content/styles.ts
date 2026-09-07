export const styles = `
  :host {
    --groups-text:#0f0f0f;
    --groups-secondary:#606060;
    --groups-surface:#fff;
    --groups-button:#eee;
    --groups-border:#aaa;
    --groups-error:#c33;
    display:block; width:100%; color:var(--groups-text);
    font:14px Roboto,Arial,sans-serif; margin:24px 0; color-scheme:light;
  }
  :host-context(html[dark]) {
    --groups-text:#fff;
    --groups-secondary:#aaa;
    --groups-surface:#212121;
    --groups-button:#333;
    --groups-border:#666;
    --groups-error:#ff8a80;
    color-scheme:dark;
  }
  * { box-sizing:border-box; }
  button, input { font:inherit; }
  button { cursor:pointer; padding:8px 14px; border:1px solid var(--groups-border); border-radius:18px; background:var(--groups-button); color:var(--groups-text); }
  button:focus-visible, a:focus-visible, input:focus-visible { outline:3px solid #3ea6ff; outline-offset:3px; }
  button:disabled { cursor:wait; opacity:.6; }
  header { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
  header h1 { font-size:22px; margin:0 auto 0 0; }
  h1, h2, h3, a { color:var(--groups-text); }
  .hint, .creator, .metadata, .empty { color:var(--groups-secondary); }
  .hint { line-height:1.5; }
  section { margin:32px 0; }
  h2 { font-size:24px; margin:0 0 20px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(250px,100%),1fr)); gap:28px 18px; }
  article { min-width:0; }
  a { text-decoration:none; }
  img { display:block; width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:12px; background:#222; }
  h3 { font-size:16px; line-height:1.4; margin:10px 0 6px; }
  .creator { margin:0 0 10px; }
  .creator:has(+ .metadata) { margin-bottom:4px; }
  .metadata { margin:0 0 10px; line-height:1.4; }
  .empty { border:1px dashed #888; border-radius:12px; padding:20px; }
  dialog { width:min(420px,calc(100vw - 32px)); border:1px solid var(--groups-border); border-radius:16px; padding:24px; color:var(--groups-text); background:var(--groups-surface); }
  dialog::backdrop { background:#0008; }
  dialog h2 { font-size:20px; }
  fieldset { border:0; padding:0; margin:16px 0; }
  label { display:flex; align-items:center; gap:12px; padding:12px 0; }
  input { width:18px; height:18px; }
  .actions { display:flex; gap:8px; justify-content:flex-end; }
  .error { color:var(--groups-error); }
`;

// Only extension controls use Shadow DOM styles; YouTube styles its own cards.
export const styles = `
  :host {
    --groups-text:#0f0f0f; --groups-secondary:#606060; --groups-surface:#fff;
    --groups-button:#eee; --groups-border:#aaa; --groups-error:#c33;
    display:block; width:100%; color:var(--groups-text);
    font:14px Roboto,Arial,sans-serif; margin:24px 0; color-scheme:light;
  }
  :host-context(html[dark]) {
    --groups-text:#fff; --groups-secondary:#aaa; --groups-surface:#212121;
    --groups-button:#333; --groups-border:#666; --groups-error:#ff8a80; color-scheme:dark;
  }
  * { box-sizing:border-box; }
  button, input { font:inherit; }
  button { cursor:pointer; padding:8px 14px; border:1px solid var(--groups-border); border-radius:18px; background:var(--groups-button); color:var(--groups-text); }
  button:focus-visible, input:focus-visible { outline:3px solid #3ea6ff; outline-offset:3px; }
  button:disabled { cursor:wait; opacity:.6; }
  header { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
  header h1 { font-size:22px; margin:0 auto 0 0; }
  h1, h2 { color:var(--groups-text); }
  .hint { color:var(--groups-secondary); line-height:1.5; }
  dialog { width:min(420px,calc(100vw - 32px)); border:1px solid var(--groups-border); border-radius:16px; padding:24px; color:var(--groups-text); background:var(--groups-surface); }
  dialog::backdrop { background:#0008; }
  dialog h2 { font-size:20px; margin:0 0 20px; }
  fieldset { border:0; padding:0; margin:16px 0; }
  label { display:flex; align-items:center; gap:12px; padding:12px 0; }
  input { width:18px; height:18px; }
  .actions { display:flex; gap:8px; justify-content:flex-end; }
  .error { color:var(--groups-error); }
`;

export const nativeStyles = `
  [data-native-groups] { display:block; width:100%; min-width:0; font:14px Roboto,Arial,sans-serif; color:#0f0f0f; }
  html[dark] [data-native-groups] { color:#fff; }
  [data-native-groups] > section { margin:24px 0 36px; }
  [data-native-groups] > section > h2 { color:inherit; font:600 24px Roboto,Arial,sans-serif; margin:0 0 20px; }
  [data-native-groups] .native-group-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr)); gap:28px 16px; }
  [data-native-groups] .native-shorts-grid { grid-template-columns:repeat(auto-fill,minmax(min(180px,100%),1fr)); }
  [data-native-shorts-shelf] { grid-column:1 / -1; }
  [data-native-group-card] { min-width:0; --ytd-rich-grid-items-per-row:1; --ytd-rich-grid-posts-per-row:1; }
  [data-native-group-card] > :first-child { display:block !important; width:100% !important; min-width:0 !important; max-width:none !important; margin:0 !important; }
  [data-native-groups] .native-group-category { display:block; cursor:pointer; font:13px Roboto,Arial,sans-serif; padding:6px 10px; margin-top:8px; border:1px solid #aaa; border-radius:16px; background:transparent; color:inherit; }
  html[dark] [data-native-groups] .native-group-category { border-color:#666; }
  [data-native-groups] .native-group-category:hover { background:#8882; }
  [data-native-groups] .native-group-category:focus-visible { outline:3px solid #3ea6ff; outline-offset:3px; }
  [data-native-groups] .native-group-empty { color:inherit; opacity:.7; border:1px dashed #888; border-radius:12px; padding:20px; }
`;

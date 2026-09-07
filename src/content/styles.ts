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
  [data-native-grouped] { --native-group-text:#0f0f0f; }
  html[dark] [data-native-grouped] { --native-group-text:#fff; }
  [data-native-group-source] { display:grid !important; grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr)); gap:20px 16px; align-items:start; }
  [data-native-group-source] > :not([data-native-groups]):not([data-native-card]):not([data-native-flat]):not(ytd-continuation-item-renderer),
  [data-native-flat] > :not([data-native-card]):not([data-native-flat]):not(ytd-continuation-item-renderer) { display:none !important; }
  [data-native-flat], [data-native-groups], [data-native-groups] > section { display:contents !important; }
  [data-native-grouped] [data-native-card] { width:100% !important; min-width:0 !important; max-width:none !important; margin:0 !important; --ytd-rich-grid-items-per-row:1; --ytd-rich-grid-posts-per-row:1; }
  [data-native-grouped] [data-native-card-collapsed], [data-native-group-excluded] { display:none !important; }
  [data-native-grouped] [data-native-shorts-shelf] { grid-column:1 / -1; }
  [data-native-grouped] [data-native-short] { max-width:240px !important; }
  [data-native-groups] > section > h2 { grid-column:1 / -1; margin:12px 0 0; color:var(--native-group-text); font:600 24px Roboto,Arial,sans-serif; }
  [data-native-groups] .native-group-toggle { display:flex; align-items:center; gap:14px; width:100%; padding:8px 0; border:0; background:transparent; color:inherit; font:inherit; text-align:left; cursor:pointer; }
  [data-native-groups] .native-group-toggle::after { content:''; width:8px; height:8px; border-right:2px solid currentColor; border-bottom:2px solid currentColor; transform:rotate(-45deg); }
  [data-native-groups] .native-group-toggle[aria-expanded="true"]::after { transform:rotate(45deg); }
  [data-native-groups] button:focus-visible, [data-native-grouped] .native-group-category:focus-visible { outline:3px solid #3ea6ff; outline-offset:4px; }
  [data-native-grouped] .native-group-category, [data-native-groups] .native-group-footer button, [data-native-groups] .native-group-pagination button { cursor:pointer; font:13px Roboto,Arial,sans-serif; padding:6px 10px; margin-top:8px; border:1px solid #888; border-radius:16px; background:transparent; color:var(--native-group-text); }
  [data-native-groups] .native-group-pagination { grid-column:1 / -1; display:flex; gap:8px; }
  [data-native-groups] .native-group-pagination[hidden], [data-native-groups] .native-group-pagination button[hidden] { display:none !important; }
  [data-native-groups] .native-group-empty { grid-column:1 / -1; color:var(--native-group-text); font:14px Roboto,Arial,sans-serif; opacity:.7; padding:16px; }
  [data-native-groups] .native-group-empty[hidden] { display:none !important; }
  [data-native-groups] .native-group-footer { grid-column:1 / -1; order:1000000; padding:16px 0; color:var(--native-group-text); font:14px Roboto,Arial,sans-serif; }
  [data-native-grouped] ytd-continuation-item-renderer { display:none !important; grid-column:1 / -1; order:1000001; }
  [data-native-grouped][data-native-loading] ytd-continuation-item-renderer[data-native-load-control] { display:block !important; }
`;

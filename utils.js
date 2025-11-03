// utils.js
export function downloadJSON(obj, filename = 'trace.json') {
  const data = JSON.stringify(obj, null, 2);
  const blob = new Blob([data], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

export function saveDataURL(dataURL, filename='screenshot.png') {
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function uid(prefix='P') {
  return `${prefix}${Math.floor(Math.random()*9000+1000)}`;
}

export function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

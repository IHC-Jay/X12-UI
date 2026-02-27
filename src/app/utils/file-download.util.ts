export function downloadTextFile(content: string, fileName: string): void {
  const text = content ?? '';
  if (!text) return;

  const rawName = (fileName || 'X12.txt').trim();
  const sanitizedName = rawName.replace(/[\\/:*?"<>|]/g, '_');
  const finalFileName = /\.[a-z0-9]+$/i.test(sanitizedName) ? sanitizedName : `${sanitizedName}.txt`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = finalFileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

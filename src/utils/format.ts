export function formatTags(tags: string, max = 3): string {
  return tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(', ');
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

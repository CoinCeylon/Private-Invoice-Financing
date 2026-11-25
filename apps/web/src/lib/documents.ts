export function validateDocumentFile(file: File): string | null {
  if (!/\.(pdf|png|jpe?g|webp)$/i.test(file.name) ||
    (file.type && !['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(file.type))) {
    return 'Choose a PDF, PNG, JPEG or WebP file.'
  }
  if (file.size === 0) return 'Choose a file that contains data.'
  if (file.size > 15 * 1024 * 1024) return 'Choose a file smaller than 15 MB.'
  return null
}

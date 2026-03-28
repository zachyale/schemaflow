// Simple URL-safe base64 encoding/decoding for sharing schemas
// Uses native browser APIs - no external dependencies needed

export function compressToUrl(data: string): string {
  try {
    // Convert to base64 and make URL-safe
    const base64 = btoa(unescape(encodeURIComponent(data)))
    // Make URL-safe: replace + with -, / with _, remove padding =
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  } catch {
    return ''
  }
}

export function decompressFromUrl(encoded: string): string | null {
  try {
    // Restore standard base64: replace - with +, _ with /
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '='
    }
    return decodeURIComponent(escape(atob(base64)))
  } catch {
    return null
  }
}

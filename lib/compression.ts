import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'

export function compressToUrl(data: string): string {
  return compressToEncodedURIComponent(data)
}

export function decompressFromUrl(compressed: string): string | null {
  return decompressFromEncodedURIComponent(compressed)
}

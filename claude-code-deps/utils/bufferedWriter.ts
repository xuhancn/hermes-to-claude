export class BufferedWriter {
  write(_data: string): void {}
  flush(): void {}
}
export function createBufferedWriter(_onChunk: (chunk: string) => void): BufferedWriter {
  return new BufferedWriter()
}

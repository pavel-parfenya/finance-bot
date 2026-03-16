export interface ISpeechRecognizer {
  recognize(audioBuffer: Buffer, mimeType: string): Promise<string>;
}

import OpenAI, { toFile } from "openai";
import { ISpeechRecognizer } from "../../domain/interfaces";

const MIME_TO_EXT: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
};

export class WhisperSpeechRecognizer implements ISpeechRecognizer {
  private readonly client: OpenAI;

  constructor(apiKey: string, baseUrl: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });
  }

  async recognize(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const ext = MIME_TO_EXT[mimeType] ?? "ogg";
    const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType });

    const transcription = await this.client.audio.transcriptions.create({
      model: "whisper-large-v3",
      file,
    });

    return transcription.text;
  }
}

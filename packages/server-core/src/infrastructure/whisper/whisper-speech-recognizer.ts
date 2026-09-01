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

  /**
   * @param proxySecret если задан — уходит в заголовке `X-Proxy-Secret` на каждый
   *   запрос. Нужен, когда `baseUrl` указывает на Cloudflare Worker-прокси к Groq
   *   (см. deploy/groq-proxy) с включённой проверкой секрета.
   */
  constructor(apiKey: string, baseUrl: string, proxySecret?: string | null) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
      defaultHeaders: proxySecret ? { "X-Proxy-Secret": proxySecret } : undefined,
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

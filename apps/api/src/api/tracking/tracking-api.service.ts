import { Injectable } from "@nestjs/common";
import { MetaCapiService } from "@finance-bot/server-core";
import type { PageViewDto } from "./dto/pageview.dto";

/** Поля произвольного JSON клиента — пропускаем только строки разумной длины. */
function str(v: unknown, maxLength = 2048): string | undefined {
  return typeof v === "string" && v.length > 0 && v.length <= maxLength ? v : undefined;
}

@Injectable()
export class TrackingApiService {
  constructor(private readonly metaCapi: MetaCapiService) {}

  /** PageView лендинга: посетитель обычно анонимен, матчинг по fbp/fbc/ip/UA. */
  async pageView(dto: PageViewDto, clientIpAddress?: string, clientUserAgent?: string) {
    const url = str(dto?.url);
    if (url) {
      await this.metaCapi.pageView({
        url,
        client: {
          eventId: str(dto?.eventId, 512),
          fbp: str(dto?.fbp, 512),
          fbc: str(dto?.fbc, 512),
          clientIpAddress: str(clientIpAddress, 512),
          clientUserAgent: str(clientUserAgent, 512),
        },
      });
    }
    return { ok: true };
  }
}

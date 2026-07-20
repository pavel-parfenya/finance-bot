export interface PageViewDto {
  /** URL просмотренной страницы лендинга (`event_source_url`). */
  url?: string;
  /** event_id браузерного `fbq('track','PageView')` — дедуп с Pixel. */
  eventId?: string;
  /** Cookie `_fbp` (browser id Meta). */
  fbp?: string;
  /** Cookie `_fbc` (click id рекламной кампании Meta). */
  fbc?: string;
}

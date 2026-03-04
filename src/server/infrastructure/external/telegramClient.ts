import { logger } from '../../utils/logger.js';
import { createHash } from 'crypto';
import { DedupeRepository } from '../../repositories/dedupeRepository.js';

export class TelegramClient {
  private botToken: string;
  private chatId: string;
  private dedupe: DedupeRepository;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
    this.chatId = process.env.TELEGRAM_CHAT_ID ?? '';
    this.dedupe = new DedupeRepository();
  }

  private get enabled(): boolean {
    return !!(this.botToken && this.chatId);
  }

  async sendMessage(text: string, deduplicate: boolean = true): Promise<boolean> {
    if (!this.enabled) {
      logger.warn('Telegram not configured, skipping message');
      return false;
    }

    // Deduplication check
    if (deduplicate) {
      const hash = createHash('sha256').update(text + new Date().toISOString().slice(0, 10)).digest('hex');
      if (this.dedupe.exists(hash)) {
        logger.info('Telegram message deduplicated, skipping');
        return false;
      }
      this.dedupe.insert(hash);
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        logger.error('Telegram send failed', { error: err });
        return false;
      }

      logger.info('Telegram message sent');
      return true;
    } catch (err) {
      logger.error('Telegram send error', { error: err });
      return false;
    }
  }

  formatTrainResults(results: Array<{ trainType: string; trainNumber: string; departureTime: string; arrivalTime: string; seatAvailable: boolean; isDirect: boolean }>, date: string): string {
    const lines = [
      `🚄 <b>열차 조회 결과</b> (${date})`,
      '',
      ...results.slice(0, 5).map((r, i) => {
        const seat = r.seatAvailable ? '✅' : '❌';
        const direct = r.isDirect ? '직통' : '환승';
        return `${i + 1}. ${r.trainType} ${r.trainNumber} | ${r.departureTime}→${r.arrivalTime} | ${direct} ${seat}`;
      }),
    ];
    if (results.length > 5) {
      lines.push(`\n... 외 ${results.length - 5}건`);
    }
    return lines.join('\n');
  }
}

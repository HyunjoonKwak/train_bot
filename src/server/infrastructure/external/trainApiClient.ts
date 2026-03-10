import { logger } from '../../utils/logger.js';
import type { TrainResult } from '../../types/index.js';
import { ConfigRepository } from '../../repositories/configRepository.js';
import { SrtClient } from './srtClient.js';
import { KorailClient } from './korailClient.js';

interface SearchParams {
  departureStation: string;
  arrivalStation: string;
  departureDate: string;
  departureTimeFrom?: string;
  departureTimeTo?: string;
  trainType?: string;
}

/**
 * Train API Client — Aggregator for SRT + Korail APIs
 * Reads credentials from config DB. Returns empty array when not configured.
 */
export class TrainApiClient {
  private srt: SrtClient;
  private korail: KorailClient;

  constructor() {
    const configRepo = new ConfigRepository();
    const srtLoginType = (configRepo.getValue('srt_login_type') || 'phone') as 'phone' | 'member';
    const srtLoginId = configRepo.getValue('srt_login_id');
    const srtPassword = configRepo.getValue('srt_password');
    const korailLoginType = (configRepo.getValue('korail_login_type') || 'phone') as 'phone' | 'member';
    const korailLoginId = configRepo.getValue('korail_login_id');
    const korailPassword = configRepo.getValue('korail_password');

    this.srt = new SrtClient(srtLoginId, srtPassword, srtLoginType);
    this.korail = new KorailClient(korailLoginId, korailPassword, korailLoginType);
  }

  async search(params: SearchParams): Promise<TrainResult[]> {
    logger.info('Train API search', { params });

    const trainType = params.trainType ?? 'ALL';

    if (!this.srt.enabled && !this.korail.enabled) {
      logger.info('No train API credentials configured — returning empty results');
      return [];
    }

    let results: TrainResult[] = [];

    try {
      if (trainType === 'SRT') {
        results = await this.searchSrt(params);
      } else if (trainType === 'KTX') {
        results = await this.searchKorail(params);
      } else {
        // ALL — query both in parallel
        results = await this.searchAll(params);
      }
    } catch (err) {
      logger.error('Train API search failed entirely', { error: String(err) });
      return [];
    }

    // Sort by departure time
    results.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

    // Filter by time range
    return results.filter(r => {
      if (params.departureTimeFrom && r.departureTime < params.departureTimeFrom) return false;
      if (params.departureTimeTo && r.departureTime > params.departureTimeTo) return false;
      return true;
    });
  }

  private async searchSrt(params: SearchParams): Promise<TrainResult[]> {
    if (!this.srt.enabled) return [];
    try {
      return await this.srt.search(params);
    } catch (err) {
      logger.error('SRT search failed', { error: String(err) });
      return [];
    }
  }

  private async searchKorail(params: SearchParams): Promise<TrainResult[]> {
    if (!this.korail.enabled) return [];
    try {
      return await this.korail.search(params);
    } catch (err) {
      logger.error('Korail search failed', { error: String(err) });
      return [];
    }
  }

  private async searchAll(params: SearchParams): Promise<TrainResult[]> {
    const [srtResult, korailResult] = await Promise.allSettled([
      this.searchSrt(params),
      this.searchKorail(params),
    ]);

    const srt = srtResult.status === 'fulfilled' ? srtResult.value : [];
    const korail = korailResult.status === 'fulfilled' ? korailResult.value : [];

    if (srtResult.status === 'rejected') {
      logger.error('SRT search rejected', { reason: String(srtResult.reason) });
    }
    if (korailResult.status === 'rejected') {
      logger.error('Korail search rejected', { reason: String(korailResult.reason) });
    }

    return [...srt, ...korail];
  }
}

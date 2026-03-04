import { logger } from '../../utils/logger.js';
import type { TrainResult } from '../../types/index.js';

interface SearchParams {
  departureStation: string;
  arrivalStation: string;
  departureDate: string;
  departureTimeFrom?: string;
  departureTimeTo?: string;
  trainType?: string;
}

/**
 * Train API Client — Strategy Pattern
 * Currently returns mock data. Will be replaced with actual SRT/Korail API integration.
 */
export class TrainApiClient {
  async search(params: SearchParams): Promise<TrainResult[]> {
    logger.info('Train API search', { params });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Generate mock results based on params
    const results = this.generateMockResults(params);

    // Filter by time range if specified
    return results.filter(r => {
      if (params.departureTimeFrom && r.departureTime < params.departureTimeFrom) return false;
      if (params.departureTimeTo && r.departureTime > params.departureTimeTo) return false;
      if (params.trainType && params.trainType !== 'ALL' && r.trainType !== params.trainType) return false;
      return true;
    });
  }

  private generateMockResults(params: SearchParams): TrainResult[] {
    const times = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00',
                    '10:00', '12:00', '14:00', '16:00', '17:00', '17:30', '18:00',
                    '18:30', '19:00', '19:30', '20:00', '21:00'];
    const trainTypes = ['SRT', 'KTX'];

    return times.map((time, i) => {
      const trainType = trainTypes[i % 2];
      const isDirect = Math.random() > 0.3;
      const durationMin = isDirect ? 45 + Math.floor(Math.random() * 15) : 80 + Math.floor(Math.random() * 30);
      const [h, m] = time.split(':').map(Number);
      const arrH = h + Math.floor((m + durationMin) / 60);
      const arrM = (m + durationMin) % 60;

      return {
        trainType,
        trainNumber: `${trainType === 'SRT' ? 'S' : 'K'}${300 + i}`,
        departureStation: params.departureStation,
        arrivalStation: params.arrivalStation,
        departureTime: time,
        arrivalTime: `${String(arrH).padStart(2, '0')}:${String(arrM).padStart(2, '0')}`,
        duration: `${Math.floor(durationMin / 60)}시간 ${durationMin % 60}분`,
        price: trainType === 'SRT' ? 23700 : 25600,
        seatAvailable: Math.random() > 0.3,
        isDirect,
      };
    });
  }
}

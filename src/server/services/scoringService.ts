import type { TrainResult, Recommendation } from '../types/index.js';
import { logger } from '../utils/logger.js';

const DIRECT_BONUS = 30;
const TIME_PENALTY_PER_MINUTE = 0.5;
const SEAT_BONUS = 20;
const PREFERRED_TIME_BONUS = 15;
const PREFERRED_TIME_WINDOW_MINUTES = 30;
const PREFERRED_TRAIN_TYPE_BONUS = 5;

export class ScoringService {
  score(results: TrainResult[], preferredTime?: string, preferredTrainType?: string): Recommendation[] {
    return results
      .map(train => {
        let score = 50; // base score
        const reasons: string[] = [];

        // Direct train bonus
        if (train.isDirect) {
          score += DIRECT_BONUS;
          reasons.push('직통 열차');
        } else {
          score -= 15;
          reasons.push('환승 필요');
        }

        // Duration penalty
        const durationMin = this.parseDuration(train.duration);
        score -= durationMin * TIME_PENALTY_PER_MINUTE;

        // Seat availability bonus
        if (train.seatAvailable) {
          score += SEAT_BONUS;
          reasons.push('좌석 여유');
        } else {
          score -= 30;
          reasons.push('좌석 없음');
        }

        // Preferred time proximity
        if (preferredTime) {
          const diffMin = this.timeDiffMinutes(train.departureTime, preferredTime);
          if (!Number.isNaN(diffMin) && diffMin <= PREFERRED_TIME_WINDOW_MINUTES) {
            score += PREFERRED_TIME_BONUS * (1 - diffMin / PREFERRED_TIME_WINDOW_MINUTES);
            reasons.push('선호 시간대');
          }
        }

        // Train type preference
        if (preferredTrainType && train.trainType === preferredTrainType) {
          score += PREFERRED_TRAIN_TYPE_BONUS;
          reasons.push(`${preferredTrainType} 선호`);
        }

        return {
          train,
          score: Math.max(0, Math.round(score * 10) / 10),
          reason: reasons.join(', '),
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private parseDuration(duration: string): number {
    // Handle "N시간 M분", "N시간", "M분" formats
    const hoursMatch = duration.match(/(\d+)시간/);
    const minutesMatch = duration.match(/(\d+)분/);

    if (!hoursMatch && !minutesMatch) {
      logger.warn(`Unrecognized duration format: "${duration}"`);
      return 0;
    }

    const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
    return hours * 60 + minutes;
  }

  private timeDiffMinutes(time1: string, time2: string): number {
    if (!time1?.includes(':') || !time2?.includes(':')) return NaN;
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    if (Number.isNaN(h1) || Number.isNaN(m1) || Number.isNaN(h2) || Number.isNaN(m2)) return NaN;
    return Math.abs((h1 * 60 + m1) - (h2 * 60 + m2));
  }
}

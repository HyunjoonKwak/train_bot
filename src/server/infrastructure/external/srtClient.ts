import { logger } from '../../utils/logger.js';
import type { TrainResult } from '../../types/index.js';
import { getSrtStationCode } from './stationCodes.js';

const SRT_MOBILE = 'https://app.srail.or.kr:443';
const SRT_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 15; SM-S912N Build/AP3A.240905.015.A2; wv) AppleWebKit/537.36' +
  '(KHTML, like Gecko) Version/4.0 Chrome/136.0.7103.125 Mobile Safari/537.36SRT-APP-Android V.2.0.38';

interface SrtScheduleItem {
  stlbTrnClsfNm: string;  // 열차 종류명 (e.g. "SRT")
  trnNo: string;          // 열차 번호
  dptRsStnNm: string;     // 출발역명
  arvRsStnNm: string;     // 도착역명
  dptTm: string;          // 출발시간 (HHmmss)
  arvTm: string;          // 도착시간 (HHmmss)
  runTm: string;          // 소요시간 (HHmmss)
  rcvdAmt: string;        // 요금
  gnrmRsvPsbStr: string;  // 일반실 예약 가능 여부
  sprmRsvPsbStr: string;  // 특실 예약 가능 여부
  stlbTrnClsfCd: string;  // 열차 분류 코드
  trnGpCd: string;        // 열차 그룹 코드
  stmpCnt: string;        // 정차역 수
}

export type LoginType = 'phone' | 'member';

export class SrtClient {
  private loginId: string;
  private password: string;
  private loginType: LoginType;
  private sessionCookie: string | null = null;
  private sessionExpiry = 0;
  readonly enabled: boolean;

  constructor(loginId: string, password: string, loginType: LoginType = 'phone') {
    this.loginId = loginType === 'phone' ? loginId.replace(/-/g, '') : loginId;
    this.password = password;
    this.loginType = loginType;
    this.enabled = !!(loginId && password);

    if (!this.enabled) {
      logger.warn('SRT credentials not configured — SRT search disabled');
    }
  }

  private async login(): Promise<void> {
    logger.info('SRT: logging in');

    // srchDvCd: 1=membership, 2=email, 3=phone
    const srchDvCd = this.loginType === 'phone' ? '3' : '1';

    const body = new URLSearchParams({
      auto: 'Y',
      check: 'Y',
      page: 'menu',
      deviceKey: '-',
      customerYn: '',
      login_referer: `${SRT_MOBILE}/main/main.do`,
      srchDvCd,
      srchDvNm: this.loginId,
      hmpgPwdCphd: this.password,
    });

    const res = await fetch(`${SRT_MOBILE}/apb/selectListApb01080_n.do`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': SRT_USER_AGENT,
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    const text = await res.text();
    let data: { strResult?: string; MSG?: string; userMap?: Record<string, unknown> };
    try {
      data = JSON.parse(text);
    } catch {
      logger.error('SRT login: invalid response', { status: res.status, body: text.slice(0, 500) });
      throw new Error(`SRT 로그인 실패: 서버 응답을 파싱할 수 없습니다 (HTTP ${res.status})`);
    }

    if (data.strResult !== 'SUCC') {
      const msg = data.MSG ?? 'Unknown error';
      logger.error('SRT login failed', { result: data.strResult, msg });
      throw new Error(`SRT 로그인 실패: ${msg}`);
    }

    // Extract session cookies
    const cookies = res.headers.getSetCookie?.() ?? [];
    const allCookies = cookies.map(c => c.split(';')[0]).join('; ');
    if (!allCookies) {
      throw new Error('SRT 로그인 실패: 세션 쿠키를 받지 못했습니다');
    }

    this.sessionCookie = allCookies;
    this.sessionExpiry = Date.now() + 30 * 60 * 1000;

    logger.info('SRT: login successful');
  }

  private async ensureSession(): Promise<void> {
    if (this.sessionCookie && Date.now() < this.sessionExpiry) return;
    await this.login();
  }

  async search(params: {
    departureStation: string;
    arrivalStation: string;
    departureDate: string; // YYYY-MM-DD
    departureTimeFrom?: string; // HH:mm
  }): Promise<TrainResult[]> {
    if (!this.enabled) return [];

    const depCode = getSrtStationCode(params.departureStation);
    const arrCode = getSrtStationCode(params.arrivalStation);
    if (!depCode || !arrCode) {
      logger.warn('SRT: unknown station', {
        dep: params.departureStation,
        arr: params.arrivalStation,
      });
      return [];
    }

    const dptDt = params.departureDate.replace(/-/g, '');
    const timeFrom = params.departureTimeFrom?.replace(':', '') ?? '000000';
    const dptTm = timeFrom.padEnd(6, '0');

    return this.doSearch(depCode, arrCode, dptDt, dptTm);
  }

  private async doSearch(
    depCode: string,
    arrCode: string,
    dptDt: string,
    dptTm: string,
    isRetry = false,
  ): Promise<TrainResult[]> {
    await this.ensureSession();

    const body = new URLSearchParams({
      chtnDvCd: '1',
      arriveTime: 'N',
      seatAttCd: '015',
      psgNum: '1',
      trnGpCd: '109',           // SRT group
      stlbTrnClsfCd: '17',      // SRT train class
      dptDt,
      dptTm,
      dptRsStnCd: depCode,
      arvRsStnCd: arrCode,
      cpNm: '',
      psgInfoPerPrnb1: '1',
      psgInfoPerPrnb5: '0',
      psgInfoPerPrnb4: '0',
      psgInfoPerPrnb2: '0',
      psgInfoPerPrnb3: '0',
      psgInfoPerPrnb25: '0',
      menuId: '11',
    });

    const res = await fetch(`${SRT_MOBILE}/ara/selectListAra10007_n.do`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': SRT_USER_AGENT,
        'Accept': 'application/json',
        Cookie: this.sessionCookie!,
      },
      body: body.toString(),
    });

    const text = await res.text();
    let data: {
      resultMap?: { strResult?: string };
      outDataSets?: { dsOutput1?: SrtScheduleItem[] };
    };
    try {
      data = JSON.parse(text);
    } catch {
      logger.error('SRT: failed to parse response', { text: text.slice(0, 200) });
      return [];
    }

    // Session expired — retry once
    if (data.resultMap?.strResult === 'FAIL' && !isRetry) {
      logger.info('SRT: session expired, re-logging in');
      this.sessionCookie = null;
      this.sessionExpiry = 0;
      return this.doSearch(depCode, arrCode, dptDt, dptTm, true);
    }

    const items = data.outDataSets?.dsOutput1 ?? [];
    return items.map(item => this.toTrainResult(item));
  }

  private toTrainResult(item: SrtScheduleItem): TrainResult {
    const depTime = this.formatTime(item.dptTm);
    const arrTime = this.formatTime(item.arvTm);
    const duration = this.formatDuration(item.runTm);
    const price = parseInt(item.rcvdAmt, 10) || 0;
    const seatAvailable =
      item.gnrmRsvPsbStr === '예약가능' || item.sprmRsvPsbStr === '예약가능';

    return {
      trainType: 'SRT',
      trainNumber: item.trnNo,
      departureStation: item.dptRsStnNm,
      arrivalStation: item.arvRsStnNm,
      departureTime: depTime,
      arrivalTime: arrTime,
      duration,
      price,
      seatAvailable,
      isDirect: parseInt(item.stmpCnt ?? '0', 10) <= 2,
    };
  }

  /** HHmmss → HH:mm */
  private formatTime(t: string): string {
    return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
  }

  /** HHmmss → N시간 M분 */
  private formatDuration(t: string): string {
    const h = parseInt(t.slice(0, 2), 10);
    const m = parseInt(t.slice(2, 4), 10);
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
  }
}

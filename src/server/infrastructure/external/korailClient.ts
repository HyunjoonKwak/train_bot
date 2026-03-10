import { createCipheriv } from 'crypto';
import { logger } from '../../utils/logger.js';
import type { TrainResult } from '../../types/index.js';

const KORAIL_MOBILE = 'https://smart.letskorail.com:443/classes/com.korail.mobile';
const KORAIL_CODE = `${KORAIL_MOBILE}.common.code.do`;
const KORAIL_LOGIN = `${KORAIL_MOBILE}.login.Login`;
const KORAIL_SEARCH = `${KORAIL_MOBILE}.seatMovie.ScheduleView`;

// Mobile API defaults (from ktx-srtgo)
const MOBILE_DEVICE = 'AD';
const MOBILE_VERSION = '250601002';
const MOBILE_KEY = 'korail1234567890';

const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 14; SM-S912N Build/UP1A.231005.007)',
  Host: 'smart.letskorail.com',
  Connection: 'Keep-Alive',
  'Accept-Encoding': 'gzip',
};

// wreq-js provides Chrome TLS fingerprinting to bypass DynaPath MACRO detection.
// It's loaded dynamically so the app still works without it (falling back to native fetch).
// wreq-js provides Chrome TLS fingerprinting to bypass DynaPath MACRO detection.
// Loaded dynamically so the app still works without it (falling back to native fetch).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wreqFetch: any = null;
let wreqProfile: string | undefined;
let wreqLoaded = false;

async function loadWreq(): Promise<void> {
  if (wreqLoaded) return;
  wreqLoaded = true;
  try {
    const mod = await import('wreq-js');
    const profiles: string[] = mod.getProfiles?.() ?? [];
    wreqProfile = profiles.find((p: string) => p.startsWith('chrome_13'))
      ?? profiles.find((p: string) => p.startsWith('chrome_'));
    wreqFetch = mod.fetch;
    logger.info(`Korail: wreq-js loaded (profile: ${wreqProfile ?? 'default'})`);
  } catch {
    logger.warn('Korail: wreq-js not available — using native fetch (may get MACRO blocked)');
  }
}

async function korailFetch(url: string, init: RequestInit): Promise<{ text(): Promise<string> }> {
  await loadWreq();
  if (wreqFetch && wreqProfile) {
    return wreqFetch(url, { ...init, browser: wreqProfile });
  }
  return fetch(url, init);
}

interface KorailTrainInfo {
  h_trn_clsf_nm: string;
  h_trn_no: string;
  h_dpt_rs_stn_nm: string;
  h_arv_rs_stn_nm: string;
  h_dpt_tm: string;
  h_arv_tm: string;
  h_run_tm: string;
  h_rsv_psb_flg: string;
  h_rsv_psb_nm: string;
  h_spe_rsv_nm: string;
  h_gen_rsv_nm: string;
  h_rcvd_amt: string;
  h_trn_clsf_cd: string;
  h_stmp_cnt?: string;
}

export type LoginType = 'phone' | 'member';

export class KorailClient {
  private loginId: string;
  private password: string;
  private loginType: LoginType;
  private sessionKey: string | null = null;
  private sessionExpiry = 0;
  readonly enabled: boolean;

  constructor(loginId: string, password: string, loginType: LoginType = 'phone') {
    this.loginId = loginType === 'phone' ? loginId.replace(/-/g, '') : loginId;
    this.password = password;
    this.loginType = loginType;
    this.enabled = !!(loginId && password);

    if (!this.enabled) {
      logger.warn('Korail credentials not configured — Korail search disabled');
    }
  }

  /** Fetch encryption key + idx, then AES-CBC encrypt the password */
  private async encryptPassword(): Promise<{ encrypted: string; idx: string }> {
    const res = await korailFetch(KORAIL_CODE, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: new URLSearchParams({ code: 'app.login.cphd' }).toString(),
    });

    const text = await res.text();
    const data = JSON.parse(text) as {
      strResult?: string;
      'app.login.cphd'?: { idx: string; key: string };
    };

    if (data.strResult !== 'SUCC' || !data['app.login.cphd']) {
      throw new Error('Korail 로그인 실패: 암호화 키를 가져올 수 없습니다');
    }

    const { idx, key } = data['app.login.cphd'];
    const keyBuf = Buffer.from(key, 'utf-8');
    const iv = Buffer.from(key.slice(0, 16), 'utf-8');
    const cipher = createCipheriv('aes-256-cbc', keyBuf, iv);
    const encrypted = Buffer.concat([cipher.update(this.password, 'utf-8'), cipher.final()]);
    const doubleB64 = Buffer.from(encrypted.toString('base64')).toString('base64');

    return { encrypted: doubleB64, idx };
  }

  private async login(): Promise<void> {
    logger.info('Korail: logging in');

    const { encrypted, idx } = await this.encryptPassword();

    // txtInputFlg: 2=membership, 4=phone, 5=email
    const txtInputFlg = this.loginType === 'phone' ? '4' : '2';

    const body = new URLSearchParams({
      Device: MOBILE_DEVICE,
      Version: MOBILE_VERSION,
      Key: MOBILE_KEY,
      txtInputFlg,
      txtMemberNo: this.loginId,
      txtPwd: encrypted,
      idx,
    });

    const res = await korailFetch(KORAIL_LOGIN, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: body.toString(),
    });

    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      logger.error('Korail login failed: invalid response', { body: text.slice(0, 500) });
      throw new Error(`Korail 로그인 실패: 서버 응답을 파싱할 수 없습니다`);
    }

    if (data.strResult !== 'SUCC' || !data.Key) {
      const errMsg = (data.h_msg_txt ?? data.strMeg ?? data.msg ?? '') as string;
      logger.error('Korail login failed', { code: data.h_msg_cd, msg: errMsg });
      throw new Error(`Korail 로그인 실패: ${errMsg || 'Unknown error'}`);
    }

    this.sessionKey = data.Key as string;
    this.sessionExpiry = Date.now() + 30 * 60 * 1000;

    logger.info('Korail: login successful');
  }

  private async ensureSession(): Promise<void> {
    if (this.sessionKey && Date.now() < this.sessionExpiry) return;
    await this.login();
  }

  async search(params: {
    departureStation: string;
    arrivalStation: string;
    departureDate: string;
    departureTimeFrom?: string;
  }): Promise<TrainResult[]> {
    if (!this.enabled) return [];

    const dptDt = params.departureDate.replace(/-/g, '');
    const timeFrom = params.departureTimeFrom?.replace(':', '') ?? '000000';
    const dptTm = timeFrom.padEnd(6, '0');

    return this.doSearch(params.departureStation, params.arrivalStation, dptDt, dptTm);
  }

  private async doSearch(
    depName: string,
    arrName: string,
    dptDt: string,
    dptTm: string,
    isRetry = false,
  ): Promise<TrainResult[]> {
    await this.ensureSession();

    const body = new URLSearchParams({
      Device: MOBILE_DEVICE,
      Version: MOBILE_VERSION,
      Key: this.sessionKey!,
      radJobId: '1',
      txtMenuId: '11',
      selGoTrain: '100',
      txtGoStart: depName,
      txtGoEnd: arrName,
      txtGoAbrdDt: dptDt,
      txtGoHour: dptTm,
      txtPsgFlg_1: '1',
      txtPsgFlg_2: '0',
      txtPsgFlg_3: '0',
      txtPsgFlg_4: '0',
      txtPsgFlg_5: '0',
      txtSeatAttCd_2: '000',
      txtSeatAttCd_3: '000',
      txtSeatAttCd_4: '015',
    });

    const res = await korailFetch(KORAIL_SEARCH, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: body.toString(),
    });

    const text = await res.text();
    let data: {
      strResult?: string;
      h_msg_cd?: string;
      h_msg_txt?: string;
      trn_infos?: { trn_info?: KorailTrainInfo[] };
    };
    try {
      data = JSON.parse(text);
    } catch {
      logger.error('Korail: failed to parse response', { text: text.slice(0, 200) });
      return [];
    }

    // Session expired — retry once
    if (data.strResult === 'FAIL' && data.h_msg_cd === 'WRD000018' && !isRetry) {
      logger.info('Korail: session expired, re-logging in');
      this.sessionKey = null;
      this.sessionExpiry = 0;
      return this.doSearch(depName, arrName, dptDt, dptTm, true);
    }

    if (data.strResult !== 'SUCC') {
      if (data.h_msg_cd === 'P058') {
        logger.info('Korail: no trains found for this route/time');
        return [];
      }
      logger.warn('Korail: search failed', { code: data.h_msg_cd, msg: data.h_msg_txt });
      return [];
    }

    const items = data.trn_infos?.trn_info ?? [];
    return items.map(item => this.toTrainResult(item));
  }

  private toTrainResult(item: KorailTrainInfo): TrainResult {
    const depTime = this.formatTime(item.h_dpt_tm);
    const arrTime = this.formatTime(item.h_arv_tm);
    const duration = this.formatDuration(item.h_run_tm);
    const price = parseInt(item.h_rcvd_amt, 10) || 0;

    const seatAvailable =
      item.h_rsv_psb_flg === 'Y' ||
      item.h_gen_rsv_nm === '예약가능' ||
      item.h_spe_rsv_nm === '예약가능';

    const trainType = item.h_trn_clsf_nm.startsWith('KTX') ? 'KTX' : item.h_trn_clsf_nm;

    return {
      trainType,
      trainNumber: item.h_trn_no,
      departureStation: item.h_dpt_rs_stn_nm,
      arrivalStation: item.h_arv_rs_stn_nm,
      departureTime: depTime,
      arrivalTime: arrTime,
      duration,
      price,
      seatAvailable,
      isDirect: parseInt(item.h_stmp_cnt ?? '0', 10) <= 2,
    };
  }

  private formatTime(t: string): string {
    return `${t.slice(0, 2)}:${t.slice(2, 4)}`;
  }

  private formatDuration(t: string): string {
    const clean = t.replace(/:/g, '');
    const h = parseInt(clean.slice(0, 2), 10);
    const m = parseInt(clean.slice(2, 4), 10);
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
  }
}

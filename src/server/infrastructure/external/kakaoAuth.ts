import { logger } from '../../utils/logger.js';

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

interface KakaoUserResponse {
  id: number;
  properties: {
    nickname: string;
    profile_image?: string;
  };
}

export class KakaoAuthClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.KAKAO_CLIENT_ID ?? '';
    this.clientSecret = process.env.KAKAO_CLIENT_SECRET ?? '';
    this.redirectUri = process.env.KAKAO_REDIRECT_URI ?? 'http://localhost:3000/auth/kakao/callback';
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state,
    });
    return `https://kauth.kakao.com/oauth/authorize?${params}`;
  }

  async getToken(code: string): Promise<KakaoTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    });

    const res = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.error('Kakao token error', { error: err });
      throw new Error('카카오 인증에 실패했습니다.');
    }

    return res.json() as Promise<KakaoTokenResponse>;
  }

  async getUserInfo(accessToken: string): Promise<{ kakaoId: string; nickname: string; profileImage: string | null }> {
    const res = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error('카카오 사용자 정보를 가져올 수 없습니다.');
    }

    const data = await res.json() as KakaoUserResponse;
    return {
      kakaoId: String(data.id),
      nickname: data.properties.nickname,
      profileImage: data.properties.profile_image ?? null,
    };
  }
}

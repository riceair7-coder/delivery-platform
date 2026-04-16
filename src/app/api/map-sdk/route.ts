import { NextResponse } from 'next/server';

/**
 * 카카오맵 SDK 번들 프록시
 *
 * 광고 차단 확장 프로그램이 dapi.kakao.com 및 t1.daumcdn.net의
 * kakao 관련 URL을 차단하는 경우를 우회합니다.
 *
 * SDK 초기 스크립트 + 메인 모듈(kakao.js)을 서버에서 다운로드하여
 * 하나로 합쳐서 전달합니다.
 */

const JS_HEADERS = {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

export async function GET() {
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '';
  if (!jsKey) {
    return new NextResponse('// KAKAO_JS_KEY not configured', {
      status: 500,
      headers: JS_HEADERS,
    });
  }

  try {
    // 1) SDK 로더 스크립트 (autoload=false)
    const sdkUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false`;
    const sdkBody = await fetchText(sdkUrl);

    // 2) SDK에서 참조하는 서브모듈 URL 추출
    const subModuleUrls: string[] = [];
    const urlRegex = /\/\/t1\.daumcdn\.net\/mapjsapi\/js\/[^"'\s]+/g;
    let match;
    while ((match = urlRegex.exec(sdkBody)) !== null) {
      subModuleUrls.push('https:' + match[0]);
    }

    // 3) 핵심 모듈(main kakao.js)을 다운로드
    const mainModuleUrl = subModuleUrls.find(u => u.includes('/main/') && u.endsWith('.js'));
    let mainModule = '';
    if (mainModuleUrl) {
      mainModule = await fetchText(mainModuleUrl);
    }

    // 4) SDK 로더에서 서브모듈 URL을 프록시 경로로 치환
    //    t1.daumcdn.net → 자체 프록시 경로 (/map-cdn-proxy)
    let patchedSdk = sdkBody.replace(
      /\/\/t1\.daumcdn\.net/g,
      '/map-cdn-proxy'
    );

    // 5) 번들: SDK 로더 + 메인 모듈
    const bundle = [
      '// Kakao Maps SDK Bundle (proxied)',
      patchedSdk,
      '',
      '// Main module inlined',
      mainModule,
    ].join('\n');

    return new NextResponse(bundle, {
      status: 200,
      headers: JS_HEADERS,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new NextResponse(`// Kakao SDK proxy error: ${msg}`, {
      status: 502,
      headers: JS_HEADERS,
    });
  }
}

# 겨울 단독콘서트 티켓팅

- 공연: 2026-10-11 13:00
- 좌석: A1~A5 (스테이지 앞 1열, 총 5석)
- 티켓팅 오픈: 2026-09-30 00:00 (한국시간)
- 예매 완료 후 쿼카 QR 티켓 표시

## Render 배포

- Build Command: `npm install`
- Start Command: `npm start`
- `DATABASE_URL` 환경변수 필요

이 버전은 예약 정보를 Render Postgres에 저장합니다. `reservations.json`을 사용하지 않으므로 Web Service가 잠들거나 재시작되어도 예약 데이터가 로컬 파일처럼 사라지지 않습니다.

주의: Render Free Postgres는 생성 후 30일 동안만 사용할 수 있습니다. 이번 콘서트 운영 기간 이후에도 계속 보관하려면 만료 전에 유료 플랜으로 업그레이드하거나 데이터를 별도로 백업해야 합니다.

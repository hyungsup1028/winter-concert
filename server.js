const express = require("express");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 10000;

// 한국시간(KST) 기준 티켓 오픈: 2026-09-30 00:00
const OPEN_AT = new Date("2026-09-30T00:00:00+09:00");

const EVENT = {
  title: "겨울 단독콘서트",
  date: "2026. 10. 11",
  time: "13:00",
  seats: ["A1", "A2", "A3", "A4", "A5"],
  price: 250000
};

const DATA_FILE = path.join(__dirname, "reservations.json");
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");

function readReservations() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeReservations(rows) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

function isOpen() {
  return new Date() >= OPEN_AT;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
  res.json({
    openAt: OPEN_AT.toISOString(),
    open: isOpen(),
    seats: EVENT.seats,
    reservations: readReservations().map(x => ({seat:x.seat, name:x.name})),
    event: EVENT
  });
});

app.post("/api/reserve", async (req, res) => {
  try {
    if (!isOpen()) {
      return res.status(403).json({ error: "아직 티켓팅이 시작되지 않았어요." });
    }

    const name = String(req.body.name || "").trim();
    const seat = String(req.body.seat || "").trim();

    if (!name) return res.status(400).json({ error: "이름을 입력해주세요." });
    if (!EVENT.seats.includes(seat)) return res.status(400).json({ error: "좌석을 확인해주세요." });

    const rows = readReservations();

    // Node.js의 한 요청 처리는 이 코드가 끝날 때까지 다른 JS 요청이 끼어들지 않으므로
    // 같은 좌석을 동시에 요청해도 먼저 처리된 한 건만 저장된다.
    if (rows.some(x => x.seat === seat)) {
      return res.status(409).json({ error: "앗! 방금 다른 사람이 먼저 선택한 좌석이에요." });
    }

    const ticketId = `WINTER-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    rows.push({
      seat,
      name,
      reserved_at: new Date().toISOString(),
      ticketId
    });
    writeReservations(rows);

    // QR을 스캔하면 이 콘서트의 쿼카 이미지를 바로 보여줍니다.
    // Render에 배포하면 현재 접속한 사이트 주소를 자동으로 사용합니다.
    const qrUrl = `${req.protocol}://${req.get("host")}/quokka-ticket.jpg`;

    const qr = await QRCode.toDataURL(qrUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 260,
      color: { dark: "#1b1b1b", light: "#ffffff" }
    });

    res.json({
      ok: true,
      ticketId,
      name,
      seat,
      price: EVENT.price,
      finalPrice: 20000,
      qr
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "예매 처리 중 문제가 생겼어요." });
  }
});

app.listen(PORT, () => {
  console.log(`Winter concert server running on port ${PORT}`);
});

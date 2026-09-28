const express = require("express");
const { Pool } = require("pg");
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

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL 환경변수가 없습니다.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reservations (
      seat TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ticket_id TEXT NOT NULL UNIQUE
    )
  `);
}

function isOpen() {
  return new Date() >= OPEN_AT;
}

app.use(express.json());
app.use(express.static("public"));

app.get("/api/status", async (req, res) => {
  try {
    const result = await pool.query("SELECT seat, name FROM reservations ORDER BY seat");
    res.json({
      openAt: OPEN_AT.toISOString(),
      open: isOpen(),
      seats: EVENT.seats,
      reservations: result.rows,
      event: EVENT
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "상태를 불러오지 못했어요." });
  }
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

    const ticketId = `WINTER-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    try {
      await pool.query(
        "INSERT INTO reservations (seat, name, ticket_id) VALUES ($1, $2, $3)",
        [seat, name, ticketId]
      );
    } catch (e) {
      if (e.code === "23505") {
        return res.status(409).json({ error: "앗! 방금 다른 사람이 먼저 선택한 좌석이에요." });
      }
      throw e;
    }

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
      finalPrice: 0,
      qr
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "예매 처리 중 문제가 생겼어요." });
  }
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`Winter concert server running on port ${PORT}`)))
  .catch((e) => {
    console.error("DB 초기화 실패:", e);
    process.exit(1);
  });

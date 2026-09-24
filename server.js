const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const { randomUUID } = require("crypto");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new Database(process.env.DB_PATH || "winter_concert.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seat TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  ticket_no TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
`);

const SEATS = ["A1","A2","A3","A4","A5"];
const OPEN_AT = new Date("2026-09-24T16:00:00+09:00");

function isOpen() { return Date.now() >= OPEN_AT.getTime(); }
function state() {
  const rows = db.prepare("SELECT seat, name, ticket_no, created_at FROM reservations ORDER BY id").all();
  return { open: isOpen(), openAt: OPEN_AT.toISOString(), seats: SEATS, reservations: rows };
}

app.get("/api/status", (req,res)=>res.json(state()));

app.post("/api/reserve", (req,res)=>{
  if (!isOpen()) return res.status(403).json({error:"티켓 오픈 전입니다.", openAt:OPEN_AT.toISOString()});
  const name = String(req.body?.name || "").trim().slice(0,20);
  const seat = String(req.body?.seat || "");
  if (!name || !SEATS.includes(seat)) return res.status(400).json({error:"이름과 좌석을 확인해주세요."});
  const ticketNo = "WIN-" + randomUUID().replaceAll("-","").slice(0,10).toUpperCase();
  try {
    db.prepare("INSERT INTO reservations(seat,name,ticket_no,created_at) VALUES(?,?,?,?)")
      .run(seat,name,ticketNo,new Date().toISOString());
    res.json({ok:true, ticket:{seat,name,ticketNo}});
  } catch(e) {
    if (String(e.message).includes("UNIQUE")) return res.status(409).json({error:"방금 다른 사람이 먼저 예매했습니다."});
    res.status(500).json({error:"예매 처리 중 오류가 발생했습니다."});
  }
});

app.get("/api/admin", (req,res)=>{
  const key=req.get("x-admin-key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) return res.status(401).json({error:"관리자 인증 필요"});
  res.json(state());
});

app.listen(process.env.PORT || 3000, ()=>console.log("Winter Concert running"));

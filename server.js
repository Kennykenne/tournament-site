const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");

const TOKEN = "8736212653:AAGQVrBHFDKL5FrnlSgq2JCIPo72zGjwgBI";
const CHAT_ID = "6113649669";

mongoose.connect("mongodb+srv://kenny:123456123@cluster0.pak425i.mongodb.net/tournament?retryWrites=true&w=majority")
.then(() => console.log("✅ MongoDB подключена"))
.catch(err => console.log("❌ MongoDB ошибка:", err));

const app = express();

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

app.use(session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use(express.static("public"));

const ADMIN_PASSWORD = "1234";

/* =========================
   🏆 ТУРНИР
========================= */
const Tournament = mongoose.model("Tournament", {
  name: String,
  description: String,
  image: String,
  mode: String,
  maxSlots: Number,
  registrationOpen: Boolean
});

/* =========================
   👥 КОМАНДА
========================= */
const Team = mongoose.model("Team", {
  team: String,
  players: String,
  contact: String,
  slot: String,
  tournamentId: String
});

/* =========================
   🔐 ADMIN CHECK
========================= */
function checkAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

/* =========================
   🔐 LOGIN
========================= */
app.post("/api/admin-login", (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.admin = true;
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.get("/api/check-admin", (req, res) => {
  res.json({ admin: !!req.session.admin });
});

/* =========================
   ➕ СОЗДАТЬ ТУРНИР
========================= */
app.post("/create-tournament", checkAdmin, async (req, res) => {
  const { name, description, image, mode, maxSlots } = req.body;

  if (!name || !description || !image || !mode || !maxSlots) {
    return res.status(400).json({ error: "Заполни все поля" });
  }

  await Tournament.create({
    name,
    description,
    image,
    mode,
    maxSlots: Number(maxSlots),
    registrationOpen: true
  });

  res.json({ success: true });
});

/* =========================
   ❌ УДАЛИТЬ ТУРНИР
========================= */
app.delete("/delete-tournament/:id", checkAdmin, async (req, res) => {
  const id = req.params.id;

  await Tournament.findByIdAndDelete(id);
  await Team.deleteMany({ tournamentId: id });

  res.json({ success: true });
});

/* =========================
   🔒 ВКЛ/ВЫКЛ РЕГИСТРАЦИИ
========================= */
app.post("/toggle-registration/:id", checkAdmin, async (req, res) => {
  const t = await Tournament.findById(req.params.id);

  t.registrationOpen = !t.registrationOpen;
  await t.save();

  res.json({ success: true, state: t.registrationOpen });
});

/* =========================
   📋 ТУРНИРЫ
========================= */
app.get("/tournaments", async (req, res) => {
  const data = await Tournament.find().sort({ _id: -1 });
  res.json(data);
});

/* =========================
   🎮 ОДИН ТУРНИР
========================= */
app.get("/tournament/:id", async (req, res) => {
  const t = await Tournament.findById(req.params.id);
  res.json(t);
});

/* =========================
   📥 РЕГИСТРАЦИЯ
========================= */
app.post("/register", async (req, res) => {
  const { team, players, contact, tournamentId } = req.body;

  if (!team || !players || !contact || !tournamentId) {
    return res.status(400).json({ error: "Заполни все поля" });
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return res.status(404).send("Tournament not found");

  if (!tournament.registrationOpen) {
    return res.json({ error: "Регистрация закрыта" });
  }

  const count = await Team.countDocuments({ tournamentId });

  let start = 3;
  let max = tournament.maxSlots;

  if (tournament.mode === "SQUAD") max = 25;
  if (tournament.mode === "DUO") max = 50;

  let slot = count < max ? start + count : "RESERVE";

  await Team.create({ team, players, contact, slot, tournamentId });

  try {
    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `
🔥 НОВАЯ РЕГИСТРАЦИЯ

🏆 Турнир: ${tournament.name}

👥 Команда: ${team}

📋 Игроки:
${players}

📩 Контакт:
${contact}

🎯 Слот: ${slot}
`
    });
  } catch (e) {
    console.log("TG error", e.message);
  }

  res.json({ success: true, slot });
});

/* =========================
   📋 КОМАНДЫ
========================= */
app.get("/teams/:id", async (req, res) => {
  const teams = await Team.find({ tournamentId: req.params.id }).sort({ slot: 1 });
  res.json(teams);
});

/* =========================
   👥 ADMIN TEAMS
========================= */
app.get("/admin/teams/:id", checkAdmin, async (req, res) => {
  const teams = await Team.find({ tournamentId: req.params.id });
  res.json(teams);
});

/* =========================
   ❌ УДАЛИТЬ КОМАНДУ
========================= */
app.delete("/delete/:id", checkAdmin, async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) return res.json({ success: false });

  const tournamentId = team.tournamentId;

  await Team.findByIdAndDelete(req.params.id);

  let teams = await Team.find({ tournamentId });

  teams = teams.sort((a, b) => {
    if (a.slot === "RESERVE") return 1;
    if (b.slot === "RESERVE") return -1;
    return a.slot - b.slot;
  });

  for (let i = 0; i < teams.length; i++) {
    teams[i].slot = i < 48 ? i + 3 : "RESERVE";
    await teams[i].save();
  }

  res.json({ success: true });
});

app.listen(3000, () => {
  console.log("🚀 Сервер запущен");
});
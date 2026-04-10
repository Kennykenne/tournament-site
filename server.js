const express = require("express");
const fs = require("fs");
const axios = require("axios");
const cors = require("cors");
const TOKEN = "8736212653:AAGQVrBHFDKL5FrnlSgq2JCIPo72zGjwgBI";
const CHAT_ID = "6113649669";
const mongoose = require("mongoose");
mongoose.connect("mongodb+srv://kenny:123456123@cluster0.pak425i.mongodb.net/tournament?retryWrites=true&w=majority")
.then(() => console.log("✅ Подключено к MongoDB"))
.catch(err => console.log("❌ Ошибка MongoDB:", err));
const TeamSchema = new mongoose.Schema({
  team: String,
  players: String,
  contact: String,
  slot: String
});

const Team = mongoose.model("Team", TeamSchema);

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const MAX_SLOTS = 50;
const START_SLOT = 3;

let teams = [];

// загрузка из файла
if (fs.existsSync("teams.json")) {
  teams = JSON.parse(fs.readFileSync("teams.json"));
}

app.post("/register", async (req, res) => {
  console.log("ПРИШЕЛ ЗАПРОС /register");

  const { team, players, contact } = req.body;

  const count = await Team.countDocuments();

  let slot;
  if (count < 48) {
    slot = 3 + count;
  } else {
    slot = "RESERVE";
  }

  const newTeam = new Team({ team, players, contact, slot });
  await newTeam.save();

  // 🔥 Telegram остаётся
  try {
    console.log("Отправка в Telegram...");

    await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `🔥 НОВАЯ РЕГИСТРАЦИЯ

 🏆 Команда: ${team}

 👥 Игроки:
 ${players}

 📩 Капитан:
 ${contact}

 🎯 Слот: ${slot}`
    });

    console.log("УСПЕШНО отправлено в Telegram");

  } catch (err) {
    console.log("ОШИБКА TELEGRAM:");
    console.log(err.response?.data || err.message);
  }

  res.json({ success: true, slot });
});

app.get("/teams", async (req, res) => {
  try {
    const teams = await Team.find();
    console.log("📊 TEAMS:", teams);
    res.json(teams);
  } catch (err) {
    console.log("❌ ERROR:", err);
    res.status(500).send("error");
  }
});

app.get("/admin", (req, res) => {
  const password = req.query.password;

  if (password !== "2110") {
    return res.send("❌ Неверный пароль");
  }

  res.send(`
    <h2>Админка</h2>
    <ul>
      ${teams.map((t, i) => `
        <li>
          ${t.team} (#${t.slot})
          <button onclick="deleteTeam(${i})">Удалить</button>
        </li>
      `).join("")}
    </ul>

    <script>
    async function deleteTeam(i) {
      await fetch("/delete/" + i);
      location.reload();
    }
    </script>
  `);
});

app.get("/delete/:id", (req, res) => {
  const id = req.params.id;

  teams.splice(id, 1);

  fs.writeFileSync("teams.json", JSON.stringify(teams, null, 2));

  res.send("Удалено");
});

app.get("/teams", async (req, res) => {
  const teams = await Team.find();
  console.log("📊 TEAMS:", teams);
  res.json(teams);
});

const ADMIN_PASSWORD = "2110";

app.post("/api/admin-login", (req, res) => {
  const { password } = req.body;

  if (password === "1234") {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.listen(3000, () => {
  console.log("Сервер запущен http://localhost:3000");
});
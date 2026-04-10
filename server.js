const express = require("express");
const fs = require("fs");
const axios = require("axios");
const cors = require("cors");
const TOKEN = "8736212653:AAGQVrBHFDKL5FrnlSgq2JCIPo72zGjwgBI";
const CHAT_ID = "6113649669";

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

  let slot;

  if (teams.length < (MAX_SLOTS - START_SLOT + 1)) {
    slot = START_SLOT + teams.length;
  } else {
    slot = "RESERVE";
  }

  const newTeam = { team, slot };
  teams.push(newTeam);

  fs.writeFileSync("teams.json", JSON.stringify(teams, null, 2));

  // 🔥 ОТПРАВКА В TELEGRAM
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

  res.json({ success: true, slot, teams });
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

app.listen(3000, () => {
  console.log("Сервер запущен http://localhost:3000");
});
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");

const TOKEN = "ТВОЙ_ТОКЕН";
const CHAT_ID = "ТВОЙ_CHAT_ID";

mongoose.connect("mongodb+srv://kenny:123456123@cluster0.pak425i.mongodb.net/tournament")
.then(()=>console.log("DB OK"));

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const Tournament = mongoose.model("Tournament",{
  name:String,
  image:String,
  mode:String
});

const Team = mongoose.model("Team",{
  team:String,
  players:String,
  contact:String,
  slot:String,
  tournamentId:String
});

app.post("/create-tournament", async (req,res)=>{
  await Tournament.create(req.body);
  res.json({success:true});
});

app.get("/tournaments", async (req,res)=>{
  res.json(await Tournament.find());
});

app.get("/tournament/:id", async (req,res)=>{
  res.json(await Tournament.findById(req.params.id));
});

app.post("/register", async (req,res)=>{
  const {team,players,contact,tournamentId} = req.body;

  const tournament = await Tournament.findById(tournamentId);
  const count = await Team.countDocuments({tournamentId});

  let max = 48;
  if(tournament.mode==="TDM") max=20;
  if(tournament.mode==="DUO") max=50;
  if(tournament.mode==="SQUAD") max=25;

  let slot = count < max ? 3 + count : "RESERVE";

  await Team.create({team,players,contact,slot,tournamentId});

  await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    chat_id:CHAT_ID,
    text:`🔥 ${team}\n🎯 ${slot}`
  });

  res.json({success:true,slot});
});

app.get("/teams/:id", async (req,res)=>{
  res.json(await Team.find({tournamentId:req.params.id}));
});

app.listen(3000,()=>console.log("SERVER OK"));
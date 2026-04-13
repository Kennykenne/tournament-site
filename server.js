const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require("multer");
const path = require("path");

const TOKEN = "ТВОЙ_ТОКЕН";
const CHAT_ID = "ТВОЙ_CHAT_ID";

mongoose.connect("mongodb+srv://kenny:123456123@cluster0.pak425i.mongodb.net/tournament")
.then(()=>console.log("DB OK"));

const app = express();

app.use(express.json());
app.use(cors({origin:true,credentials:true}));

app.use(session({
  secret:"secret",
  resave:false,
  saveUninitialized:false
}));

app.use(express.static("public"));

/* USER */
const User = mongoose.model("User",{
  login:String,
  password:String,
  isAdmin:Boolean
});

/* TOURNAMENT */
const Tournament = mongoose.model("Tournament",{
  name:String,
  description:String,
  image:String,
  mode:String,
  maxSlots:Number,
  registrationOpen:Boolean
});

/* TEAM */
const Team = mongoose.model("Team",{
  team:String,
  players:String,
  contact:String,
  slot:String,
  tournamentId:String
});

/* ADMIN CHECK */
function checkAdmin(req,res,next){
  if(!req.session.user || !req.session.user.isAdmin){
    return res.status(403).json({error:"no access"});
  }
  next();
}

/* AUTH */
app.post("/api/register", async (req,res)=>{
  const {login,password}=req.body;
  await User.create({login,password,isAdmin:false});
  res.json({success:true});
});

app.post("/api/login", async (req,res)=>{
  const user=await User.findOne(req.body);
  if(!user) return res.json({error:"error"});

  req.session.user=user;
  res.json({success:true,isAdmin:user.isAdmin});
});

/* IMAGE */
const storage = multer.diskStorage({
  destination:"public/uploads",
  filename:(req,file,cb)=>{
    cb(null,Date.now()+path.extname(file.originalname));
  }
});
const upload = multer({storage});

app.post("/upload",upload.single("image"),(req,res)=>{
  res.json({path:"/uploads/"+req.file.filename});
});

/* TOURNAMENT */
app.post("/create-tournament",checkAdmin,async(req,res)=>{
  await Tournament.create({...req.body,registrationOpen:true});
  res.json({success:true});
});

app.get("/tournaments",async(req,res)=>{
  res.json(await Tournament.find());
});

app.get("/tournament/:id",async(req,res)=>{
  res.json(await Tournament.findById(req.params.id));
});

app.delete("/delete-tournament/:id",checkAdmin,async(req,res)=>{
  await Tournament.findByIdAndDelete(req.params.id);
  await Team.deleteMany({tournamentId:req.params.id});
  res.json({success:true});
});

/* TEAM */
app.post("/register",async(req,res)=>{
  const {team,players,contact,tournamentId}=req.body;
  const count = await Team.countDocuments({tournamentId});

  let slot = count<48 ? 3+count : "RESERVE";

  await Team.create({team,players,contact,slot,tournamentId});

  await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    chat_id:CHAT_ID,
    text:`${team} (${slot})`
  });

  res.json({success:true,slot});
});

app.get("/teams/:id",async(req,res)=>{
  res.json(await Team.find({tournamentId:req.params.id}));
});

app.listen(3000,()=>console.log("SERVER OK"));
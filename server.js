const express = require("express");
const axios = require("axios");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const multer = require("multer");
const path = require("path");

const TOKEN = "8736212653:AAGQVrBHFDKL5FrnlSgq2JCIPo72zGjwgBI";
const CHAT_ID = "6113649669";

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

/* ADMIN CHECK */
function checkAdmin(req,res,next){
  if(!req.session.user || !req.session.user.isAdmin){
    return res.status(403).json({error:"no access"});
  }
  next();
}

/* REGISTER */
app.post("/api/register", async (req,res)=>{
  const {login,password}=req.body;

  if(!login || !password){
    return res.json({error:"Заполни всё"});
  }

  const exist = await User.findOne({login});
  if(exist){
    return res.json({error:"Уже существует"});
  }

  await User.create({
    login,
    password,
    isAdmin:false
  });

  res.json({success:true});
});

/* LOGIN */
app.post("/api/login", async (req,res)=>{
  const {login,password}=req.body;

  let user = await User.findOne({login,password});

  if(!user){
    return res.json({error:"Неверный логин или пароль"});
  }

  // 🔥 АДМИН ЧЕРЕЗ КОД
  if(login === "kenny" && password === "2110"){
    user.isAdmin = true;
    await user.save();
  }

  req.session.user = user;

  res.json({
    success:true,
    isAdmin:user.isAdmin
  });
});

/* ME */
app.get("/api/me",(req,res)=>{
  res.json({user:req.session.user || null});
});

/* LOGOUT */
app.post("/api/logout",(req,res)=>{
  req.session.destroy();
  res.json({success:true});
});

app.listen(3000,()=>console.log("SERVER OK"));
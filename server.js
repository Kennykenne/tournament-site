const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");

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

  if(!user && !(login==="kenny" && password==="2110")){
    return res.json({error:"Неверный логин или пароль"});
  }

  // админ через код
  if(login==="kenny" && password==="2110"){
    req.session.user = {login:"kenny",isAdmin:true};
    return res.json({success:true,isAdmin:true});
  }

  req.session.user = user;

  res.json({success:true,isAdmin:false});
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
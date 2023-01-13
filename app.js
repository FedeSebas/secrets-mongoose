require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser")
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption")

const app = express();

app.set("view engine", "ejs")
app.use(express.static("public"))
app.use(bodyParser.urlencoded({
  extended: true
}))

mongoose.set('strictQuery', false);

mongoose.connect("mongodb://192.168.0.110:27017/userDB",{useNewUrlParser: true})

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: String,
  password: String
});

userSchema.plugin(encrypt, { secret: process.env.SECRET ,encryptedFields: ["password"]});

const User = mongoose.model("User",userSchema)

app.get("/",function(req,res){
  res.render("home");
})

app.get("/login",function(req,res){
  res.render("login");
})

app.post("/login",function(req,res){
  User.findOne({email: req.body.username},function(err,userFound){
    if(err) console.log(err);
    else{
      if(userFound){
        if(req.body.password === userFound.password) res.render("submit");
      }
    }
  })
})

app.get("/register",function(req,res){
  res.render("register");
})

app.post("/register",function(req,res){
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });
  newUser.save(function(err){
    if(err) console.log(err);
    else res.render("secrets")
  })
})

app.listen(3000,function(){
  console.log("running on port 3000")
})
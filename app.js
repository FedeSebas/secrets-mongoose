require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", false);

mongoose.connect("mongodb://192.168.0.110:27017/userDB", {
  useNewUrlParser: true,
});

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose, {usernameField: "email"});
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets/my-secret",
    },
    function (accessToken, refreshToken, profile, done) {
      User.findOrCreate({ googleId: profile.id , email: profile.emails[0].value}, function (err, user) {
        return done(err, user);
      });
    }
  )
);
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, email: user.email });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

const defaultText = "None Secrets";

app.get("/", function (req, res) {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/secrets/my-secret",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets/my-secret");
  }
);

app.get("/login", function (req, res) {
  res.render("login");
});

app.post("/login", function (req, res) {
  const user = new User({
    email: req.body.email,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) console.log(err);
    else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets/my-secret");
      });
    }
  });
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/register", function (req, res) {
  User.register(
    { email: req.body.email},
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets/my-secret");
        });
      }
    }
  );
});

app.get("/secrets",function(req,res){
  User.find({secret: {$ne: defaultText}}, function (err, user) {
    if (err) {
      console.log(err);
    } else {
      console.log(user + " Secrets")
      res.render("secrets", {secretUser: user});
    }
  })
})

app.get("/secrets/my-secret", function (req, res) {
  if (req.isAuthenticated()) {
      User.findById(req.user.id, function (err, user){
        if (err) console.log(err);
        else {
          if(typeof user.secret === "string"){
            console.log(user + " my Secrets")
            res.render("secrets", { secretUser: user });
          }else{
            user.secret = defaultText;
            console.log(user + " my Secrets")
            res.render("secrets", { secretUser: user });
          }
        }
      })
  } else {
    res.redirect("/login");
  }
});

app.get("/submit", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function (req, res) {
  User.findById(req.user.id, function (err, user) {
    if (err) consle.log(err);
    else {
      if (user) {
        user.secret = req.body.secret;
        user.save(function(err){
          if (err) console.log(err);
          else res.redirect("/secrets/my-secret");
        });
      }
    }
  });
});

app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.listen(process.env.PORT, function () {
  console.log("running on port 3000");
});

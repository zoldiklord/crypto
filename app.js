

require('dotenv').config()

const express = require("express")


const ejs = require("ejs")
const mongoose = require("mongoose")
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')



const app = express()




app.use(express.static("public"))
app.set('view engine', 'ejs');
app.use(express.urlencoded({extended:true}))

app.use(session({
     secret: "our little secret",
     resave: false,
     saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser : true});

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  secret: String,
  googleId: String

});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);



const User = new mongoose.model("User",userSchema);
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/quotes"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));




app.get("/",(req,res)=>{
  res.render("home")



})


app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }));


  app.get("/auth/google/quotes", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
  
    res.redirect("/secrets" );
  });

app.get("/login",(req,res)=>{
  res.render("login")



})

app.get("/register",(req,res)=>{
  res.render("register")


})


app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.get("/logout",(req,res)=>{
   req.logOut();
   res.redirect("/")



})






app.post("/register",(req,res)=>{

  User.register({username: req.body.username}, req.body.password, (err, user)=>{
    if(err){
      console.log(err)
      res.redirect("/register")
    }else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
    });

    
  } })

  



});
app.post("/login",(req,res)=>{
  const user = new User({
    username:req.body.username,
    password:req.body.password
  })
  req.login(user, function(err) {
    if (err) { return next(err); }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");

    
   
  });
}});
});
  

 


















app.listen(3000,()=>{
  console.log("listening in port 3000")




})
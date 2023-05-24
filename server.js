// ? Hämtar värden från .env filen
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// * Hämta alla npm packages som behövs
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const flash = require("express-flash");
const bcrypt = require("bcrypt");
const user = require("./modules/user");
const http = require("http").Server(app);
const io = require("socket.io")(http);

const initializePassport = require("./passport-conf");

initializePassport(
  passport,
  (username) => Users.find((user) => user.username === username),
  (id) => Users.find((user) => user.id === id)
);

const port = 3000;
// * Använd dotenv för säkerhet så du inte visar har url till databasen inom koden
const databasUrl = process.env.DB_URL;
const Users = [];
let Message = mongoose.model("Message", {
  name: String,
  message: String,
});
let messages = [
  { name: "Jonatan", message: "Hej!" },
  { name: "Johannes", message: "Hallå!" },
];

app.set("view engine", "ejs");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
  })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use("/public/bilder/", express.static("./public/bilder"));

app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/jspage", (req, res) => {
  res.render("jspage");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/oop", (req, res) => {
  res.render("oop");
});

app.get("/meddelanden", (req, res) => {
  Message.find({}, (err, messages) => {
    res.send(messages);
  });
});

app.post("/meddelanden", (req, res) => {
  let message = new Message(req.body);

  message.save((err) => {
    if (err) {
      sendStatus(500);
    }
    messages.push(req.body);
    io.emit("message", req.body);
    res.sendStatus(200);
  });
});

// ? Funkar inte, ska skicka användaren till index page när man har loggat in men den tar en bara tillbaka till login, även om man skriver in rätt namn och lösenord.
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.post("/register", async (req, res) => {
  try {
    // ! Gör inte så här inom production, väldigt osäkert men eftersom jag inte lyckats få inloggningen att funka så är det ok
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    Users.push({
      name: req.body.username,
      email: req.body.email,
      password: hashedPassword,
    });

    res.redirect("/login");
  } catch (error) {
    console.log(error);
    res.redirect("/register");
  }
  console.log(Users);
});

io.on("connection", (socket) => {
  console.log("A user has connected");
});

// ? Tar bort varning eftersom vi använder en gammal version av Mongoose.
mongoose.set("strictQuery", true);

mongoose.connect(databasUrl, (err) => {
  console.log("Database has been connected.", err);
});

http.listen(port, () => {
  console.log(`App running at localhost:${port}`);
});

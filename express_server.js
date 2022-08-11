const express = require("express");
const cookieParser = require('cookie-parser');
const app = express();
const PORT = 8080; // default port 8080
const path = require("path");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "123",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};

// eslint-disable-next-line func-style
const generateRandomString = function() {
  let length = 6;
  return  Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);

};

const getUserByEmail = function(email) {
  for (let id in users) {
    const user = users[id];
    if (user.email === email) {
      return user;
    }
  }
  return null;
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});


app.get("/urls", (req, res) => {
  const userId = req.cookies["user_id"];
  console.log(userId);
  console.log(users[userId]);
  const email = users[userId] ? users[userId].email : '';
  const templateVars = { urls: urlDatabase, email: email };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const email = req.body.email;
  const templateVars = { urls: urlDatabase, email: req.cookies["user_id"] };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const templateVars = { id: req.params.id, longURL: urlDatabase[req.params.id]};
  res.render("urls_show", templateVars);
});

app.get("/u/:id", (req, res) => {
  const longURL = urlDatabase[req.params.id];
  res.redirect(longURL);
});


app.get("/register", (req, res) => {
  const userId = req.cookies["user_id"];
  const email = users[userId] ? users[userId].email : '';
  const templateVars = { urls: urlDatabase, email: email };
  res.render("urls_register", templateVars);
});


app.get('/login', (req, res) => {
  const userId = req.cookies["user_id"];
  const email = users[userId] ? users[userId].email : '';
  const templateVars = { urls: urlDatabase, email: email };
  return res.render('urls_login', templateVars);
});

app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.pass;
  const user = getUserByEmail(email);

  if (!users) {
    return res.status(403).send('not found');
  }

  if (password !== users.password) {
    return res.status(403).send('wrong password');
  }

  console.log(user);
  res.cookie("user_id", user.id, { maxAge: 900000, httpOnly: true });
  console.log('Cookies: ', req.cookies);

  return res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  // const id = req.cookie.user_id;
  res.clearCookie('user_id');
  console.log('Cookies: ', req.cookies);
  res.redirect('/urls');
});

app.post("/urls", (req, res) => {
  let newId = generateRandomString();
  urlDatabase[newId] = req.body.longURL;
  res.redirect(`/urls/${newId}`);
});

app.post("/urls/:id/edit", (req, res) => {
  const {id} = req.params;
  for (let shortURL in urlDatabase) {
    if (shortURL === id) {
      urlDatabase[id] = req.body.newURL;
    }
  }
  res.redirect(`/urls`);
});

app.post("/urls/:id/delete", (req, res) => {
  const {id} = req.params;
  delete urlDatabase[id];
  res.redirect(`/urls`);
});

//build a login route that is a post request
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.pass;
  const user = getUserByEmail(email);

  // check if the user that was entered is inside of our database
  if (user) {
    return res.status(403).send('error! account already exists');
  }

  const id = generateRandomString();

  let newUser = { id, email, password };

  users[id] = newUser;
  console.log(users);
  res.cookie('id', id, { maxAge: 900000, httpOnly: true });
  res.redirect('/urls');

});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
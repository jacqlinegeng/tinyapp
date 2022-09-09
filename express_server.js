const express = require("express");
const cookieSession = require('cookie-session');
const app = express();
const PORT = 8080; // default port 8080
const path = require("path");
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);
const {getUserByEmail, generateRandomString, urlsForUser} = require("./helpers");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    userID: "user2RandomID",
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    userID: "userRandomID",
  },
};

app.use(express.urlencoded({ extended: true }));

app.use(cookieSession({
  name: 'session',
  keys: ['hello'],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

const users = {
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "123",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "abc",
  },
};



app.get("/", (req, res) => {
  const userID = req.session.user_id;
  const user = users[userID];

  if (user) {
    return res.redirect("/urls");
  }
  
  res.redirect("/login");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
  const userID = req.session.user_id;
  const user = users[userID];
  
  if (!user) {
    return res.status(401).send("Not logged in. Please <a href='/login'>login</a>");
  }
  
  const urls = urlsForUser(user.id, urlDatabase);

  const templateVars = { urls, user };
  res.render("urls_index", templateVars);

});

app.get("/urls/new", (req, res) => {
  const userID = req.session.user_id;
  const user = users[userID];

  if (!user) {
    return res.redirect("/login");
  }
  const templateVars = { urls: urlDatabase, user: user };
    
  res.render('urls_new', templateVars);
});

app.get("/urls/:id", (req, res) => {
  const user = users[req.session['user_id']];
  if (!user) {
    return res.status(401).send("Please <a href='/login'>login</a> first!");
  }

  const id = req.params.id;
  const url = urlDatabase[id];

  if (!url) {
    return res.status(404).send('URL does not exist');
  }

  if (url.userID !== user.id) {
    return res.status(401).send('Only authorized to see your own URLs');
  }

  const templateVars = { url, user };
  
  res.render("urls_show", templateVars);
});

app.get("/u/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(401).send('short URL id does not exist!');
  }

  const longURL = urlDatabase[req.params.id].longURL;
  res.redirect(longURL);
});

app.get('/login', (req, res) => {
  const user = users[req.session['user_id']];
  
  if (user) {
    return res.redirect('/urls');
  }

  const templateVars = { urls: urlDatabase, user: user };
  res.render('urls_login', templateVars);
});

app.get("/register", (req, res) => {
  const user = users[req.session['user_id']];

  if (user) {
    return res.redirect('/urls');
  }

  const templateVars = { urls: urlDatabase, user: user };
  res.render("urls_register", templateVars);
});

app.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  
  if (!email || !password) {
    return res.status(400).send("Email or Password cannot be empty. Please <a href='/login'>try again</a>");
  }
  
  const user = getUserByEmail(email, users);
  console.log("user:", user);

  if (user === null) {
    return res.status(403).send("User does not exist. Please <a href='/register'>register</a> your account first");
  }

  if (user.email !== email || !bcrypt.compareSync(password, user.password)) {
    return res.status(403).send("The login credentials don't match. Please <a href='/login'>try again</a>");
  }

  req.session['user_id'] = user.id;
  // , { maxAge: 900000, httpOnly: true };
  console.log('Cookies: ', req.session);

  res.redirect("/urls");
});

app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // check if the user that was entered is inside of our database
  if (!email || !password) {
    return res.render("urls_warning", {user: null, text: "Email or Password cannot be empty. "});
  }

  const user = getUserByEmail(email, users);
  
  if (user) {
    return res.render("urls_warning", {user: null, text: "User already exists."});
  }
  
  const id = generateRandomString();
  const hash = bcrypt.hashSync(password, salt);

  const newUser = { id, email, password: hash };

  users[id] = newUser;
  console.log(users);
  req.session['user_id'] = id;
  //, { maxAge: 900000, httpOnly: true };
  
  res.redirect('/urls');
});

app.post("/logout", (req, res) => {
  // const id = req.cookie.user_id;
  req.session = null;

  console.log('Cookies: ', req.session);

  res.redirect('/urls');
});

app.post("/urls", (req, res) => {
  const user = users[req.session['user_id']];
  if (!user) {
    return res.status(401).send('not authorized to edit this URL!');
  }

  let newId = generateRandomString();

  urlDatabase[newId] = {
    id: newId,
    longURL: req.body.longURL,
    userID: user.id
  };

  res.redirect(`/urls/${newId}`);
});

app.post("/urls/:id/edit", (req, res) => {
  const user = users[req.session['user_id']];
  if (!user) {
    return res.status(401).send('not authorized to edit this URL!');
  }

  const id = req.params.id;

  const urlObj = urlDatabase[id];
  if (!urlObj) {
    return res.status(404).send('URL does not exist');
  }

  const urlBelongsToUser = urlObj.userID === user.id;
  if (!urlBelongsToUser) {
    return res.status(403).send('You are not the owner of this URL');
  }

  urlDatabase[id] = {
    id,
    longURL: req.body.newURL,
    userID: user.id
  };

  res.redirect(`/urls`);
});

app.post("/urls/:id/delete", (req, res) => {
  const {id} = req.params;
  const user = users[req.session['user_id']];
  const url = urlDatabase[id];

  if (!user) {
    return res.status(401).send("<a href='/login'>user not found. Please login first</a>");
  }

  if (url.userID !== user.id) {
    return res.status(401).send('unable to delete URLs');
  }

  delete urlDatabase[id];
  
  res.redirect(`/urls`);
});

app.listen(PORT, () => {
  console.log(`Tiny App is listening on port ${PORT}!`);
});
const express = require("express");
const cookieSession = require('cookie-session');
const app = express();
const PORT = 8080; // default port 8080
const path = require("path");
const bcrypt = require('bcryptjs');
const salt = bcrypt.genSaltSync(10);
const getUserByEmail = require('./helpers');

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

// eslint-disable-next-line func-style
const generateRandomString = function() {
  let length = 6;
  return  Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);

};

const urlsForUser = function(userID) {
  let urls = {};
  for (let id in urlDatabase) {
    const url = urlDatabase[id];
    if (url.userID === userID) {
      urls[id] = url;
    }
  }
  return urls;
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
  const userID = req.session.user_id;
  const user = users[userID];
  
  if (!user) {
    return res.status(401).send("Not logged in. Please <a href='/login'>login</a>");
  }
  
  const urls = urlsForUser(user.id);

  const templateVars = { urls, user };
  res.render("urls_index", templateVars);

});

app.get("/urls/new", (req, res) => {
  const userID = req.session.user_id;
  const user = users[userID];

  if (!user) {
    return res.status(401).send("Please <a href='/login'>login</a> first to create new URL");
  }
  const templateVars = { urls: urlDatabase, user: users[req.session['user_id']] };
    
  res.render('urls_new', templateVars);
});

app.get("/urls/:id", (req, res) => {
  const id = req.params.id;
  const url = urlDatabase[id];
  const user = users[req.session['user_id']];

  if (!user) {
    return res.status(401).send('please login first!');
  }

  if (url.userID !== user.id) {
    return res.status(401).send('only authorized to see your own URLs');
  }

  
  const templateVars = { url, user};
  
  return res.render("urls_show", templateVars);
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

  const templateVars = { urls: urlDatabase, user: users[req.session['user_id']] };
  res.render('urls_login', templateVars);
});

app.get("/register", (req, res) => {
  const user = users[req.session['user_id']];
  // const email = users[userId] ? users[userId].email : '';
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
    return res.status(403).send("Email or Password cannot be empty. Please <a href='/login'>try again</a>");
  }

  const user = getUserByEmail(email, users);

  if (user !== users) {
    return res.status(403).send("User does not exist. Please <a href='/register'>register</a> your account first");
  }

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(403).send("The credentials don't match. Please <a href='/login'>try again</a>");
  }

  console.log(user);
  req.session['user_id'] = user.id;
  // , { maxAge: 900000, httpOnly: true };
  console.log('Cookies: ', req.session);

  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  // const id = req.cookie.user_id;
  req.session['user_id'] = null;
  console.log('Cookies: ', req.session);
  res.redirect('/urls');
});

app.post("/urls", (req, res) => {
  const id = req.params.id;
  const url = urlDatabase[id];
  const user = users[req.session['user_id']];

  if (!user) {
    return res.status(401).send('not authorized to edit this URL!');
  }


  const templateVars = { url, user };

  let newId = generateRandomString();
  let longURLDATA = req.body.longURL;
  let userIDDATA = templateVars.user.id;
  urlDatabase[newId] = {};
  urlDatabase[newId].longURL = longURLDATA;
  urlDatabase[newId].userID = userIDDATA;

  return res.redirect(`/urls/${newId}`);
  
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

app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // check if the user that was entered is inside of our database
  if (!email || !password) {
    return res.status(403).send("Email or Password cannot be empty. Please <a href='/register'>try again</a>");
  }
  const user = getUserByEmail(email, users);
  
  if (user) {
    return res.status(403).send("User already exists. Please <a href='/register'>try again</a>");
  }
  
  const id = generateRandomString();

  const newUser = { id, email, password: bcrypt.hashSync(password, salt)};

  users[id] = newUser;
  console.log(users);
  req.session['user_id'] = id;
  //, { maxAge: 900000, httpOnly: true };
  res.redirect('/urls');

});

app.listen(PORT, () => {
  console.log(`Tiny app listening on port ${PORT}!`);
});
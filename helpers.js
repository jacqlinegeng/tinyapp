const getUserByEmail = function(email, database) {
  for (let id in database) {
    const user = database[id];
    if (user.email === email) {
      console.log(user);
      return user;
    }
  }
  return null;
};

// eslint-disable-next-line func-style
const generateRandomString = function() {
  let length = 6;
  return  Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);

};

const urlsForUser = function(userID, urlDatabase) {
  let urls = {};
  for (let id in urlDatabase) {
    const url = urlDatabase[id];
    if (url.userID === userID) {
      urls[id] = url;
    }
  }
  return urls;
};

module.exports = { getUserByEmail, generateRandomString, urlsForUser };
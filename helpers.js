const getUserByEmail = function(email, database) {
  for (let id in database) {
    const user = database[id];
    if (user.email === email) {
      return user;
    }
  }
  return null;
};

module.exports = getUserByEmail;
const session = require('express-session');

module.exports = session({
  secret: process.env.SESSION_SECRET || 'pinjamkuysecret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
});

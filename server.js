'use strict';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const routes = require('./lib/routes');
const DB = 'mongodb://localhost:27017/mealplanner';
const PORT = 3000;
let server;

const start = (cb) => {
  mongoose.connect(DB);
  const db = mongoose.connection;
  db.on('error', cb);
  db.once('open', () => {
    const app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded());
    app.use(cors());
    app.use(routes);
    server = app.listen(PORT, cb);
  });
};

const stop = (cb) => {
  server.close(() => {
    mongoose.disconnect(() => {
      if (cb) { return cb(); }
    });
  });
};

module.exports = {start, stop};

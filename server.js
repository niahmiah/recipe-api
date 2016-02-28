'use strict';
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const routes = require('./lib/routes');
const DB = process.env.DB || 'mongodb://localhost:27017/mealplanner';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.options('*', cors());
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({extended: true}));
app.use(routes);

let server;

const start = (cb) => {
  mongoose.connect(DB);
  const db = mongoose.connection;
  db.on('error', cb);
  db.once('open', () => {
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

module.exports = {start, stop, conf: {DB, PORT}, app, service: server};

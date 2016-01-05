'use strict';

const express = require('express');
var bodyParser = require('body-parser')
const mongoose = require('mongoose');
const DB = 'mongodb://localhost:27017/mealplanner';
const PORT = 3000;
let server;

function start(cb) {
  mongoose.connect(DB);
  var db = mongoose.connection;
  db.on('error', cb);
  db.once('open', function openCb() {
    const app = express();
    app.use(express.static('public'));
    app.use(express.static('shared'));
    app.use(bodyParser.json());
    app.use(require('./lib/routes'));
    server = app.listen(PORT, cb);
  });
}

function stop(cb){
  try{
    server.close(function serverStopCb() {
      mongoose.disconnect(function mongooseStopCb(){
        if(cb) { cb(); }
      });
    });
  }catch(e){
    if(cb) { return cb(e); }
    process.exit(1);
  }
}

module.exports = {
  start: start,
  stop: stop
};

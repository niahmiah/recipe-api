'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let OAuthClient = new Schema({
  clientId: { type: String },
  clientSecret: { type: String },
  redirectUri: { type: String }
});

module.exports = OAuthClient = mongoose.model('OAuthClient', OAuthClient);

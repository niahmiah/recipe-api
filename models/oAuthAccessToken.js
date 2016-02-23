'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let OAuthAccessToken = new Schema({
  accessToken: { type: String },
  clientId: { type: String },
  userId: { type: String },
  expires: { type: Date }
});

module.exports = OAuthAccessToken = mongoose.model('OAuthAccessToken', OAuthAccessToken);

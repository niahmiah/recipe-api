'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let OAuthRefreshToken = new Schema({
  refreshToken: { type: String },
  clientId: { type: String },
  userId: { type: String },
  expires: { type: Date }
});

module.exports = OAuthRefreshToken = mongoose.model('OAuthRefreshToken', OAuthRefreshToken);

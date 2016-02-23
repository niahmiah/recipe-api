'use strict';

const Person = require('../models/person');
const OAuthAccessToken = require('../models/oAuthAccessToken');
const OAuthRefreshToken = require('../models/oAuthRefreshToken');
const OAuthClient = require('../models/oAuthClient');

const oAuthModel = {
  getAccessToken: (bearerToken, cb) => {
    OAuthAccessToken.findOne({accessToken: bearerToken}, cb);
  },
  getClient: (clientId, clientSecret, cb) => {
    if (clientSecret === null) {
      return OAuthClient.findOne({clientId}, cb);
    }
    OAuthClient.findOne({clientId, clientSecret}, cb);
  },
  grantTypeAllowed: (clientId, grantType, cb) => {
    // https://github.com/thomseddon/node-oauth2-server/blob/master/examples/mongodb/model.js
    const authorizedClientIds = ['webApp', 'iosApp'];
    if (grantType === 'password') {
      return cb(false, authorizedClientIds.indexOf(clientId) >= 0);
    }
    cb(false, true);
  },
  saveAccessToken: (token, clientId, expires, userId, cb) => {
    const accessToken = new OAuthAccessToken({
      accessToken: token,
      clientId,
      userId,
      expires
    });
    accessToken.save(cb);
  },
  getUser: (username, password, cb) => {
    Person.authenticate({email: username, password}, (err, user) => {
      if (err) { return cb(err); }
      cb(null, user._id);
    });
  },
  saveRefreshToken: (token, clientId, expires, userId, cb) => {
    const refreshToken = new OAuthRefreshToken({
      refreshToken: token,
      clientId,
      userId,
      expires
    });
    refreshToken.save(cb);
  },
  getRefreshToken: (refreshToken, cb) => {
    OAuthRefreshToken.findOne({ refreshToken }, cb);
  }
};

module.exports = oAuthModel;

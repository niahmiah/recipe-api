'use strict';

const mongoose = require('mongoose');
const validate = require('mongoose-validate');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');
const dateFormat = require('dateformat');
const gravatar = require('gravatar');

let Person = new Schema({
  email: {type: String, validate: [validate.email, 'invalid email address'], unique: true},
  password: String,
  firstName: {type: String},
  lastName: {type: String},
  weight: {type: Number},
  height: {type: Number},
  birthdate: {type: Date},
  activityLevel: {type: Number, default: 1, min: 1, max: 4}
}, {
  toObject: { getters: true, virtuals: true },
  toJSON: { getters: true, virtuals: true }
});

Person.virtual('created').get(function getVirtualCreated() {
  return dateFormat(mongoose.Types.ObjectId(this._id).getTimestamp(), 'mmmm dS, yyyy');
});

Person.virtual('gravatar').get(function getVirtualGravatar() {
  return gravatar.url(this.email, {s: '200', r: 'pg', d: 'identicon'});
});

Person.statics.authenticate = (credentials, cb) => {
  const noUserError = new Error('Invalid credentials');
  if (!credentials || !credentials.email || !credentials.password) { return cb(noUserError); }

  Person.findOne({email: credentials.email}, (err, person) => {
    if (err || !person) { return cb(noUserError); }
    bcrypt.compare(credentials.password, person.password, (err2, match) => {
      if (err2 || !match) { return cb(noUserError); }
      return cb(null, person);
    });
  });
};

Person.statics.create = (credentials, cb) => {
  const noUserError = new Error('Could not create the account.');
  if (!credentials || !credentials.email || !credentials.password) { return cb(noUserError); }

  bcrypt.hash(credentials.password, 10, (err, hash) => {
    if (err) { return cb(noUserError); }
    const person = new Person({
      email: credentials.email,
      password: hash
    });
    person.save(cb);
  });
};

Person.statics.getProfile = (id, cb) => {
  Person.findOne({_id: id}).exec((err, person) => {
    if (err || !person) { return cb(err); }
    const p = person.toJSON({virtuals: true});
    delete p.password;
    cb(null, p);
  });
};

Person.statics.updateProfile = (id, body, cb) => {
  delete body._id;
  delete body.id;
  Person.findOneAndUpdate({_id: id}, body, {new: true}, (err, doc) => {
    if (doc) { delete doc.password; }
    cb(err, doc);
  });
};

module.exports = Person = mongoose.model('Person', Person);

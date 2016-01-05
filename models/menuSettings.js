'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MenuSettings = new Schema({
  calories: Number,
  carbs: Number,
  protein: Number
});

module.exports = mongoose.model('MenuSettings', MenuSettings);

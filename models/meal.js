'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const units = require('../lib/units');

const FoodItemAmount = new Schema({
  foodItem: Schema.Types.ObjectId,
  qty: {type: Number, required: true, default: 1},
  fraction: {
    numerator: {type: Number, default: 0},
    denominator: {type: Number, enum: [2,3,4,5,6,8], default: 2}
  }
});

const RecipeServing = new Schema({
  foodItem: Schema.Types.ObjectId,
  qty: {type: Number, required: true, default: 1},
  fraction: {
    numerator: {type: Number, default: 0},
    denominator: {type: Number, enum: [2,3,4,5,6,8], default: 2}
  }
});

const Meal = new Schema({
  foodItems: [FoodItemAmount],
  recipes: [RecipeServing]
});

module.exports = mongoose.model('Meal', Meal);

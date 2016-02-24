'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const units = require('../lib/units');

const FoodItem = new Schema({
  name: {type: String, required: true, index: true},
  qty: {type: Number, default: 0},
  fraction: {
    numerator: {type: Number, default: 0},
    denominator: {type: Number, enum: [2, 3, 4, 5, 6, 8], default: 2}
  },
  unit: {type: String, enum: Object.keys(units)},
  nutrition: {
    calories: {
      total: Number,
      fromFat: Number
    },
    carbohydrates: {
      total: Number,
      sugar: Number,
      fiber: Number
    },
    cholesterol: Number,
    sodium: Number,
    fat: {
      total: Number,
      saturated: Number,
      trans: Number,
      polyunsat: Number,
      monounsat: Number
    },
    potassium: Number,
    protein: Number,
    vitamin: {
      a: Number,
      c: Number,
      d: Number,
      calcium: Number,
      iron: Number
    }
  },
  source: {
    type: Schema.Types.ObjectId,
    ref: 'Person',
    autopopulate: {
      select: 'firstName lastName email'
    }
  },
  sourceId: {type: String}
});

FoodItem.index({name: 'text'});

FoodItem.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('FoodItem', FoodItem);

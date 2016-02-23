'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const units = require('../lib/units');
const dateFormat = require('dateformat');

const IngredientAmount = new Schema({
  foodItem: {type: Schema.Types.ObjectId, ref: 'FoodItem', autopopulate: true},
  qty: {type: Number, required: true, default: 0},
  fraction: {
    numerator: {type: Number, default: 0},
    denominator: {type: Number, enum: [2, 3, 4, 5, 6, 8], default: 2}
  },
  unit: {type: String, enum: Object.keys(units)}
}, {
  toObject: { getters: true, virtuals: true },
  toJSON: { getters: true, virtuals: true }
});

IngredientAmount.plugin(require('mongoose-autopopulate'));

let Recipe = new Schema({
  author: {type: Schema.Types.ObjectId, ref: 'Person', autopopulate: true},
  name: {type: String, required: true},
  mealTypes: {
    type: Array,
    enum: ['breakfast', 'lunch', 'dinner', 'snack', 'entree', 'side', 'beverage']
  },
  ingredients: [IngredientAmount],
  instructions: {type: String},
  time: {
    prep: Number,
    cook: Number
  },
  servings: Number,
  nutrition: {
    calories: {
      total: {type: Number},
      fromFat: {type: Number}
    },
    carbohydrates: {
      total: {type: Number},
      sugar: {type: Number},
      fiber: {type: Number}
    },
    cholesterol: {type: Number},
    sodium: {type: Number},
    fat: {
      total: {type: Number},
      saturated: {type: Number},
      trans: {type: Number},
      polyunsat: {type: Number},
      monounsat: {type: Number}
    },
    potassium: {type: Number},
    protein: {type: Number},
    vitamin: {
      a: {type: Number},
      c: {type: Number},
      d: {type: Number},
      calcium: {type: Number},
      iron: {type: Number}
    }
  },
  photo: {type: Buffer}
});

Recipe.plugin(require('mongoose-autopopulate'));

Recipe.virtual('created').get(function getVirtualCreated() {
  return dateFormat(mongoose.Types.ObjectId(this._id).getTimestamp(), 'mmmm dS, yyyy');
});

Recipe.index({name: 'text'});

module.exports = Recipe = mongoose.model('Recipe', Recipe);

'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const units = require('../lib/units');

const IngredientAmount = new Schema({
  foodItem: {type: Schema.Types.ObjectId, ref: 'FoodItem', autopopulate: true},
  qty: {type: Number, required: true, default: 0},
  fraction: {
    numerator: {type: Number, default: 0},
    denominator: {type: Number, enum: [2,3,4,5,6,8], default: 2}
  },
  unit: {type: String, enum: Object.keys(units)}
});

IngredientAmount.plugin(require('mongoose-autopopulate'));

const Recipe = new Schema({
  name: {type: String, required: true},
  mealTypes: {type: Array, enum: ["breakfast", "lunch", "dinner", "snack", "entree", "side", "beverage"]},
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
      monounsat: {type: Number},
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
  }
});

Recipe.plugin(require('mongoose-autopopulate'));

Recipe.index({name: 'text'});

module.exports = mongoose.model('Recipe', Recipe);

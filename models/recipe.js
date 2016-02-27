'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const units = require('../lib/units');
const objectMod = require('../lib/objectMod');
const dateFormat = require('dateformat');
const debug = require('debug')('recipe');
const measure = require('measure').measure;

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
  author: {
    type: Schema.Types.ObjectId,
    ref: 'Person',
    autopopulate: {
      select: 'firstName lastName gravatar'
    },
    required: true
  },
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
  servings: {type: Number, required: true},
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

const getMeasureString = (object) => {
  let string = '';
  if (object.qty) {
    string += object.qty;
  }
  if (object.fraction && object.fraction.numerator && object.fraction.denominator) {
    if (string) { string += ' '; }
    string += `${object.fraction.numerator}/${object.fraction.denominator}`;
  }
  if (object.unit) {
    string += ` ${units[object.unit]}`;
  } else {
    //hack to enable diff'ing items with no unitsOfMeasu
    string += ' l';
  }
  return string;
};

const recalculateNutrition = function (recipe) {
  let nutritionInfo = {};
  recipe.ingredients.forEach((ingr) => {
    // multiply nutrition info based on measure.js conversion
    let servingMultiplier = 1;

    const ingrMsrString = getMeasureString(ingr.foodItem) || '';
    let ingrSrv = 0;
    let ingrSrvType = 'mass';
    if (['oz', 'lb'].indexOf(ingr.foodItem.unit) > -1) {
      ingrSrv = measure(ingrMsrString).ounces();
    } else {
      ingrSrvType = 'volume';
      ingrSrv = measure(ingrMsrString).milliliters();
    }

    const recipeIngrMsrString = getMeasureString(ingr) || '';
    let recipeInrgSrv = 0;
    let recipeIngrSrvType = 'mass';
    if (['oz', 'lb'].indexOf(ingr.unit) > -1) {
      recipeInrgSrv = measure(recipeIngrMsrString).ounces();
    } else {
      recipeIngrSrvType = 'volume';
      recipeInrgSrv = measure(recipeIngrMsrString).milliliters();
    }

    debug('measure:', ingr.foodItem.name, ingrMsrString, recipeIngrMsrString);
    debug('vals in millis', ingrSrv, recipeInrgSrv);
    if (ingrSrvType !== recipeIngrSrvType) {
      servingMultiplier = 0;
      throw new Error(`Invalid measurement conversion for: ${ingr.foodItem.name} ${ingrSrvType} ${recipeIngrSrvType}`);
    } else {
      servingMultiplier = recipeInrgSrv / ingrSrv / recipe.servings;
    }

    debug('multiplier', servingMultiplier);
    debug('before', ingr.foodItem.nutrition);

    const ingrfoodItemNutrition = objectMod.multiplyObject(
      ingr.foodItem.nutrition,
      servingMultiplier
    );
    debug('after', ingrfoodItemNutrition);
    //divide by servings #
    debug('Adding values from', ingrfoodItemNutrition);
    nutritionInfo = objectMod.addObjects([nutritionInfo, ingrfoodItemNutrition]);
  });
  debug('updated nutrition info', nutritionInfo);
  return nutritionInfo;
};

Recipe.statics.create = (recipeData, cb) => {
  const recipe = new Recipe(recipeData);
  recipe.save((err) => {
    if (err) { return cb(err); }
    Recipe.findOne({_id: recipe._id}, (err2, r) => {
      if (err2) { return cb(err2); }
      try {
        r.nutrition = recalculateNutrition(r.toObject());
      } catch (e) {
        return cb(e);
      }
      r.save((err3) => {
        cb(err3, r);
      });
    });
  });
};

Recipe.statics.update = (id, recipeData, cb) => {
  Recipe.findOneAndUpdate({_id: id}, recipeData, {new: true}, (err, recipe) => {
    if (err) { return cb(err); }
    if (!recipe) { return cb(null, null); }
    Recipe.findOne({_id: id}, (err2, recipePopulated) => {
      if (err2) { return cb(err2); }
      try {
        recipePopulated.nutrition = recalculateNutrition(recipePopulated.toObject());
      } catch (e) {
        return cb(e);
      }
      recipePopulated.save((err3) => cb(err3, recipePopulated));
    });
  });
};

module.exports = Recipe = mongoose.model('Recipe', Recipe);

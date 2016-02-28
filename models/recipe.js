'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const units = require('../lib/units');
const objectMod = require('../lib/objectMod');
const dateFormat = require('dateformat');
const debug = require('debug')('recipe');
const measure = require('measure').measure;
const lwip = require('lwip');

const IngredientAmount = new Schema({
  foodItem: {type: Schema.Types.ObjectId, ref: 'FoodItem', autopopulate: true},
  qty: {type: Number, default: 0},
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
    enum: ['breakfast', 'lunch', 'dinner', 'snack', 'entree', 'side', 'beverage', 'dessert']
  },
  ingredients: [IngredientAmount],
  instructions: {type: String},
  time: {
    prep: Number,
    cook: Number
  },
  servings: {type: Number, default: 1},
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
  picture: {type: String},
  thumb: {type: String}
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

const recalculateNutrition = (recipe) => {
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

const resizePhoto = (dataurl, cb) => {
  const regex = /^data:.+\/(.+);base64,(.*)$/;
  const matches = dataurl.match(regex);
  const ext = matches[1];
  const base64img = matches[2];
  console.log('Resizing image... Size before resize:', base64img.length);
  const buffer = new Buffer(base64img, 'base64');
  lwip.open(buffer, ext, (err, img) => {
    if (err) { return cb(err); }
    img.contain(800, 800, (err2, picture) => {
      if (err2) { return cb(err2); }
      picture.contain(120, 120, (err3, thumbnailRectangle) => {
        if (err3) { return cb(err3); }
        thumbnailRectangle.crop(80, 80, (err4, thumb) => {
          if (err4) { return cb(err4); }
          picture.toBuffer('jpg', {quality: 85}, (err5, pictureBuffer) => {
            if (err5) { return cb(err5); }
            thumb.toBuffer('jpg', {quality: 85}, (err6, thumbBuffer) => {
              if (err6) { return cb(err6); }
              const pre = `data:image/${ext};base64,`;
              const t = pre + thumbBuffer.toString('base64');
              const p = pre + pictureBuffer.toString('base64');
              console.log('Resized image... Size after resize:', p.length);
              cb(null, t, p);
            });
          });
        });
      });
    });
  });
};

Recipe.statics.create = (recipeData, cb) => {
  const doCreate = () => {
    const recipe = new Recipe(recipeData);
    debug(`NEW ${JSON.stringify(recipeData, null, 2)}`);
    recipe.save((err) => {
      if (err) {
        return cb(`Error saving recipe ${err}`);
      }
      Recipe.findOne({_id: recipe._id}, (err2, r) => {
        if (err2) { return cb(err2); }
        try {
          r.nutrition = recalculateNutrition(r.toObject());
        } catch (e) {
          return cb(`Error calculating nutrition ${e}`);
        }
        r.save((err3) => {
          if (err3) {
            return cb(`Error saving after nutrition added ${err3}`);
          }
          cb(null, r);
        });
      });
    });
  };
  if (recipeData.thumb) { delete recipeData.thumb; }
  if (recipeData.picture) { delete recipeData.picture; }
  if (recipeData.pictureData) {
    resizePhoto(recipeData.pictureData, (err, thumb, picture) => {
      if (err) { return cb(err); }
      recipeData.thumb = thumb;
      recipeData.picture = picture;
      doCreate();
    });
  } else {
    doCreate();
  }
};

Recipe.statics.update = (id, recipeData, cb) => {
  const doUpdate = () => {
    debug('UPDATE', JSON.stringify(recipeData, null, 2));
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
  if (recipeData.thumb) { delete recipeData.thumb; }
  if (recipeData.picture) { delete recipeData.picture; }
  if (recipeData.pictureData) {
    resizePhoto(recipeData.pictureData, (err, thumb, picture) => {
      if (err) { return cb(err); }
      recipeData.thumb = thumb;
      recipeData.picture = picture;
      doUpdate();
    });
  } else {
    doUpdate();
  }
};

module.exports = Recipe = mongoose.model('Recipe', Recipe);

'use strict';

const menuLength = '7';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Recipe = require('./recipe');
const async = require('async');
const moment = require('moment');
const debug = require('debug')('menu');

const mealsADay = ["breakfast", "lunch", "dinner", "snack"];
const recipeTypes = ["entree", "side", "beverage"];

let Menu = new Schema({
  date: {type: Number, unique: true},
  meal: {
    breakfast: [{type: Schema.Types.ObjectId, ref: 'Recipe', autopopulate: true}],
    lunch: [{type: Schema.Types.ObjectId, ref: 'Recipe', autopopulate: true}],
    dinner: [{type: Schema.Types.ObjectId, ref: 'Recipe', autopopulate: true}],
    snack: [{type: Schema.Types.ObjectId, ref: 'Recipe', autopopulate: true}],
  },
});

Menu.plugin(require('mongoose-autopopulate'));

Menu.statics.generateMenuDay = function generateMenuDay(day, callback){
  debug('generate menu day:', day);
  const menu = new Menu({
    date: day
  });
  const xDaysBefore = moment(day, 'YYYYMMDD').subtract(menuLength, 'days').format('YYYYMMDD');
  async.waterfall([
    function getRecentMenu(callback){
      Menu.find({date: {$gte: xDaysBefore, $lt: day}}).sort({date: -1}).exec(callback);
    },
    function getAllRecipes(recentMenu, callback){
      Recipe.find({}).lean().exec(function(err, recipes){
        callback(err, recentMenu, recipes);
      });
    },
    function(recentMenu, recipes, callback){
      // debug('recentMenu', day, recentMenu);
      var recipesByMealType = {};
      recipes.forEach(function(recipe){
        // debug('recipe', recipe.name);

        // look for recent occurence of recipe
        recentMenu.forEach(function(m){
          mealsADay.forEach(function(mealType){
            m.meal[mealType].forEach(function(recipeOccurence){
              // debug('db recipe occurence', recipeOccurence);
              // debug(recipeOccurence.name, recipe.name);
              // debug(recipeOccurence._id.toString() === recipe._id.toString(), !recipe.lastOccurence);
              // debug(recipeOccurence._id, recipe._id, recipe.lastOccurence);
              if(recipeOccurence._id.toString() === recipe._id.toString() && !recipe.lastOccurence){
                // set a lastOcurrence property for each Recipe
                // debug('Setting last occurence from db', recipe.name, m.date);
                recipe.lastOccurence = m.date;
              }
            });
          });
        });

        //organize object to be keyed by types
        mealsADay.forEach(function(mealType){
          recipeTypes.forEach(function(recipeType){
            if(recipe.mealTypes.indexOf(mealType) > -1 && recipe.mealTypes.indexOf(recipeType) > -1){
              recipesByMealType[mealType] = recipesByMealType[mealType] || {};
              recipesByMealType[mealType][recipeType] = recipesByMealType[mealType][recipeType] || [];
              recipesByMealType[mealType][recipeType].push(recipe);
            }
          });
        });

      });

      // for each meal
      mealsADay.forEach(function(meal){
        menu.meal[meal] = [];
        if(recipesByMealType[meal] && recipesByMealType[meal].entree){
          // sort the list of recipes by their lastOccurence
          recipesByMealType[meal].entree.sort(function(a, b){
            debug('sort', meal, a.name, b.name, a.lastOccurence, b.lastOccurence);
            if(a.lastOccurence && !b.lastOccurence) return 1;
            if(!a.lastOccurence && b.lastOccurence) return -1;
            if(!a.lastOccurence && !b.lastOccurence) return 0;
            if (a.lastOccurence < b.lastOccurence) return -1;
            if (a.lastOccurence > b.lastOccurence) return 1;
            return 0;
          });

          const sorted = [];
          recipesByMealType[meal].entree.forEach(function(thing){
            sorted.push({name: thing.name, lastOccurence: thing.lastOccurence});
          });
          debug(meal, 'SORTED', sorted);

          // debug('recipesByMealType', meal, 'entree', recipesByMealType[meal].entree);
          //
          // debug(recipesByMealType[meal].entree.length, menuLength);

          // if there are Y entrees and Y <= menuLength
          // use the one you had least recently
          if(recipesByMealType[meal].entree.length <= menuLength){
            // debug('recipesByMealType[meal].entree.length <= menuLength');
            // debug('push', meal, recipesByMealType[meal].entree[recipesByMealType[meal].entree.length - 1]);
            //const recipeToUse = recipesByMealType[meal].entree[recipesByMealType[meal].entree.length - 1];
            const recipeToUse = recipesByMealType[meal].entree[0];
            menu.meal[meal].push(recipeToUse);
            recipeToUse.lastOccurence = day;
            // debug('Setting last occurence', recipesByMealType[meal].entree[recipesByMealType[meal].entree.length - 1].name, day);
          } else {
            debug('recipesByMealType[meal].entree.length > menuLength');
            // if there are Y entrees, and Y > menuLength
              // Randomly use `menuLength` least recently used recipes
            recipesByMealType[meal].entree.splice(0, recipesByMealType[meal].entree.length - menuLength);
            const recipeToUse = recipesByMealType[meal].entree[Math.floor(Math.random() * recipesByMealType[meal].entree.length)];
            menu.meal[meal].push(recipeToUse);
            recipeToUse.lastOccurence = day;
            debug('Setting last occurence (rand)', recipeToUse.name, day);
          }
        }
      });
      // Then, try adding a side or beverage to each meal starting with dinner, then lunch, then breakfast, until you can’t fit anything else under the goals
      // debug('menu', menu);
      // return callback(null, menu);
      menu.save(callback);
    }
  ], function(err, finalResult){
    // debug('day final', err, finalResult);
    callback(err, finalResult);
  });
};

Menu.statics.generateMenuDays = function generateMenuDays(days, callback){
  debug('generate menu days:', days);
  const menu = {};
  async.eachSeries(days, function(day, cb){
    Menu.generateMenuDay(day, function(err, menuDay){
      if(err) return cb(err);
      menu[day] = menuDay.meal;
      cb();
    });
  }, function(err){
    if(err) return callback(err);
    // debug('final menu', err, menu);
    callback(null, menu);
  });
};

Menu.statics.get = function getMenu(days, callback){
  for(let i = 0; i < days.length; i++){
    days[i] = moment(days[i], 'MMDDYYYY').format('YYYYMMDD');
  }
  debug('get menu:', days);
  const daysRemaining = days.slice(0);
  this.find({date: {$in: days}}).sort({date: 1}).exec(function(err, menuDays){
    if(err) return callback(err);

    menuDays.forEach(function(menuDay){
      debug('remove', menuDay.date, 'from', daysRemaining, 'at', daysRemaining.indexOf(menuDay.date));
      daysRemaining.splice(daysRemaining.indexOf(menuDay.date.toString()), 1);
      debug('removed', menuDay.date, 'from', daysRemaining);
    });
    debug(days, daysRemaining);
    Menu.generateMenuDays(daysRemaining, function(err){
      if(err) return callback(err);
      Menu.find({date: {$in: days}}).sort({date: 1}).exec(function(err, results){
        const menu = {};
        results.forEach(function(result){
          menu[result.date] = result.meal;
        });
        callback(null, menu);
      });
    });
  });

};

module.exports = Menu = mongoose.model('Menu', Menu);

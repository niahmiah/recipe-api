'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Recipe = require('./recipe');
const async = require('async');
const debug = require('debug')('menu');

const mealsADay = ["breakfast", "lunch", "dinner", "snack"];

const Menu = new Schema({
  date: String,
  meal: {
    breakfast: [{type: Schema.Types.ObjectId, ref: 'Recipe', autopopulate: true}],
    lunch: [{type: Schema.Types.ObjectId, ref: 'Recipe', autopopulate: true}],
    dinner: [{type: Schema.Types.ObjectId, ref: 'Recipe', autopopulate: true}],
    snack: [{type: Schema.Types.ObjectId, ref: 'Recipe', autopopulate: true}],
  },
});

Menu.index({date:1, meal:1}, {unique: true});

Menu.plugin(require('mongoose-autopopulate'));

Menu.statics.get = function getMenu(days, callback){
  debug('get menu:', days);
  this.find({date: {$in: days}}, function(err, entries){
    if(err) return callback(err);
    Recipe.find({}, function(err, recipes){
      if(err) return callback(err);
      var obj = {};
      debug('loading menu values');
      days.forEach(function(day){
        obj[day] = {};
        entries.forEach(function(entry){
          if(entry.date == day){
            obj[day] = entry;
          }
        });
      });
      debug('Got menu values:', obj);
      // return callback(null, obj);

      async.each(Object.keys(obj), function(day, cb1){
        async.each(mealsADay, function(meal, cb2){
          if(!day[meal] || !day[meal].length){
            debug('Creating menu for ' + day + ' ' + meal);
            obj[day][meal] = [];
            Recipe.find({mealTypes: meal}, function(err, recipe){
              if(err) return cb2(err);
              if(recipe) obj[day][meal] = recipe;
              cb2(null);
            })
          }
        }, function(err){
          debug('done checking meals for ' + day);
          cb1();
        });
      }, function(err){
        debug('done');
        callback(null, obj);
      });
    });
  });
}

module.exports = mongoose.model('Menu', Menu);

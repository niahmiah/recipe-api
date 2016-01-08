'use strict';

const fs = require('fs');
const foodDes = 'data/usda/FOOD_DES.txt';
const weights = 'data/usda/WEIGHT.txt';
const nutritionData = 'data/usda/NUT_DATA.txt';
const FoodItem = require('../models/foodItem');
const Fraction = require('fractional').Fraction;
const mongoose = require('mongoose');
const DB = 'mongodb://localhost:27017/mealplanner';
const units = require('../lib/units');

const nutrientDefs = {
  203: 'protein',
  204: 'total fat',
  205: 'total carbs',
  208: 'calories',
  269: 'sugars',
  291: 'dietary fiber',
  301: 'calcium',
  303: 'iron',
  306: 'potassium',
  307: 'sodium',
  401: 'vitamin c',
  605: 'trans fat',
  606: 'saturated fat',
  645: 'mono fat',
  646: 'poly fat'
}

function lineToArray(line){
  var lineArray = line.split('^');
  for(var i =0; i< lineArray.length; i++){
    var val = lineArray[i];
    var n = val.search(/~/g);
    if(n !== -1){
      val = val.replace(/~/g, '');
    } else if (n === ''){

    } else {
      val = Number(val);
    }
    lineArray[i] = val;
  }
  return lineArray;
}

function getFoods(callback){
  const foodTypes = {};
  const stream = fs.createReadStream(foodDes);
  const lineReader = require('readline').createInterface({
    input: stream
  });

  lineReader.on('line', function (line) {
    const lineArray = lineToArray(line);
    foodTypes[lineArray[0]] = {
      name: lineArray[2]
    };
    if(lineArray[5]){
      foodTypes[lineArray[0]].name += '- ' + lineArray[5];
    }
  });

  lineReader.on('close', function(){
    callback(foodTypes);
  });
}

function getNutritionData(callback){
  const nutData = {};
  const stream = fs.createReadStream(nutritionData);
  const lineReader = require('readline').createInterface({
    input: stream
  });

  lineReader.on('line', function (line) {
    const lineArray = lineToArray(line);
    if(Object.keys(nutrientDefs).indexOf(lineArray[1]) > -1){
      nutData[lineArray[0]] = nutData[lineArray[0]] || {};
      nutData[lineArray[0]][lineArray[1]] = lineArray[2];
      // nutData[lineArray[0]][nutrientDefs[lineArray[1]]] = lineArray[2];
    }
  });

  lineReader.on('close', function(){
    callback(nutData);
  });
}


mongoose.connect(DB);
var db = mongoose.connection;
db.on('error', function(err){
  console.error(err);
});
db.once('open', function openCb() {
  getFoods(function(foodTypes){
    getNutritionData(function(nutData){
      const stream = fs.createReadStream(weights);
      var lineReader = require('readline').createInterface({
        input: stream
      });

      var count = 0;
      var saved = 0;
      lineReader.on('line', function (line) {
        count++;
        var lineArray = lineToArray(line);
        var qty = lineArray[2];
        var int = Math.floor(qty);
        var unit = lineArray[3].split(',');
        var weight = lineArray[4];
        unit[0] = unit[0].replace(/ (.*)/, '');
        var unitOut = unit[0].toLowerCase();
        if(unitOut === 'teaspoon'){
          unitOut = 'tsp';
        }
        if(unitOut === 'tablespoon' || unitOut === 'tbsp'){
          unitOut = 'tbs';
        }
        var bail = false;
        if(Object.keys(units).indexOf(unitOut) < 0){
          bail = true;
          console.log(unitOut); //temp
        }

        if(!bail){

          if(qty - int){
            var decimal = qty - int;
            decimal = +decimal.toFixed(3);
            var f;
            if(decimal === .33 || decimal === .333){
              f = new Fraction(1,3);
            } else if(decimal === .66 || decimal === .67 || decimal === .666 || decimal === .667){
              f = new Fraction(2,3);
            } else if(decimal === .167){
              f = new Fraction(1,6);
            } else if(decimal === .35){
              f = new Fraction(1,3);
            } else if(decimal === .52 || decimal === .527){
              f = new Fraction(1,2);
            } else if(decimal === .083){
              f = new Fraction(1,12);
            } else {
              f = new Fraction(decimal);
            }

            if(f.denominator > 12){
              decimal = Math.round((Number(decimal)*10))/10;
              f = new Fraction(decimal);
              if(f.numerator == 1){
                int++;
                f.numerator++;
                decimal = 0;
                f = new Fraction(decimal);
              }

            };
          }

          Object.keys(nutData[lineArray[0]]).forEach(function(key){
            nutData[lineArray[0]][key] = nutData[lineArray[0]][key] / (100 / weight)
          });

          const protein = Math.round(nutData[lineArray[0]][203]) || null;
          const totalFat = Math.round(nutData[lineArray[0]][204]) || null;
          const calories = Math.round(nutData[lineArray[0]][208]) || null;
          const sugars = Math.round(nutData[lineArray[0]][269]) || null;
          const dietaryFiber = Math.round(nutData[lineArray[0]][291]) || null;
          const potassium = Math.round(nutData[lineArray[0]][306]) || null;
          const sodium = Math.round(nutData[lineArray[0]][307]) || null;
          const transFat = Math.round(nutData[lineArray[0]][605]) || null;
          const satFat = Math.round(nutData[lineArray[0]][606]) || null;
          const monoFat = Math.round(nutData[lineArray[0]][645]) || null;
          const polyFat = Math.round(nutData[lineArray[0]][646]) || null;
          const totalCarb = Math.round(nutData[lineArray[0]][205]) || null;

          var foodItem = {
            name: foodTypes[lineArray[0]].name,
            qty: int,
            unit: unitOut,
            source: 'USDA',
            sourceId: lineArray[0] + '-' + lineArray[1],
            nutrition: {
              calories: {
                total: calories,
                // fromFat: Number
              },
              carbohydrates: {
                total: totalCarb,
                sugar: sugars,
                fiber: dietaryFiber,
              },
              // cholesterol: Number,
              sodium: sodium,
              fat: {
                total: totalFat,
                saturated: satFat,
                trans: transFat,
                polyunsat: polyFat,
                monounsat: monoFat,
              },
              potassium: potassium,
              protein: protein,
              // vitamin: {
              //   a: Number,
              //   c: Number,
              //   d: Number,
              //   calcium: Number,
              //   iron: Number
              // }
            }
          };

          if(f){
            foodItem.fraction = {
              numerator: f.numerator,
              denominator: f.denominator
            };
          }

          console.log(foodTypes[lineArray[0]].name, foodItem);

          lineReader.pause();
          FoodItem.findOneAndUpdate({sourceId: foodItem.sourceId}, foodItem, {upsert: true, new: true}, function(err, item){
            if(err) console.error(err);
            saved++;
            lineReader.resume();
          });
        }

      });

      lineReader.on('close', function(){
        console.log('created: ', count, 'saved:', saved);
        setTimeout(function(){
          mongoose.disconnect();
        }, 5000);
      });
    });
  });
});

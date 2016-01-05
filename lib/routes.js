'use strict';

const express = require('express');
const debug = require('debug')('routes');
const router = express.Router();

const FoodItem = require('../models/foodItem');
const Meal = require('../models/meal');
const MenuSettings = require('../models/menuSettings');
const Menu = require('../models/menu');
const Recipe = require('../models/recipe');

const paginate = (model, q, o, skip, limit) => {
  let s = 0;
  let l = limit;
  if(skip) s = skip;
  if(limit) l = limit;
  return model.find(q, o).skip(s).limit(l);
}

const get = (model, sortBy) => {
  return (req, res) => {
    const q = {};
    const o = {};
    if(req.params.id){
      q._id = req.params.id;
    }
    if(req.query.search){
      q.$text = { $search : req.query.search };
      o.score = { $meta: "textScore" };
    }
    const skip = Number(req.query.skip) || 0;
    const limit = Number(req.query.limit) || null;
    const query = paginate(model, q, o, skip, limit);
    if(!req.query.search && sortBy){
      query.sort(sortBy);
    }
    if(req.query.search){
      query.sort({ score : { $meta : 'textScore' } });
    }
    query.exec((err, docs) => {
      if(err){
        console.error(err);
        return res.status(500).send(err);
      }
      debug(docs);
      res.send(docs);
    });
  }
}

const post = (Item) => {
  return (req, res) => {
    debug(req.body);
    if(!req.body._id){
      const item = new Item(req.body);
      debug('item', item);
      item.save((err) => {
        if(err) {
          console.error(err);
          return res.status(500).send(err);
        }
        debug('Successfully created item');
        return res.status(200).send(item);
      });
    }else{
      var id = req.body._id;
      delete req.body._id;
      req.body.__v++;
      debug('Update', req.body);
      Item.findOneAndUpdate({_id: id}, {$set: req.body}, {new: true}, (err, doc) => {
        if(err) {
          console.error(err);
          return res.status(500).send(err);
        }
        debug('Successfully updated item');
        return res.status(200).send(doc);
      });
    }
  }
}

const del = (Model) => {
  return (req, res) => {
    debug('delete', req.params);
    Model.remove({_id: req.params.id}, (err) => {
      if(err) {
        console.error(err);
        return res.status(500).send(err);
      }
      debug('Successfully deleted item');
      return res.status(200).send();
    });
  }
}

router.get('/foodItem', get(FoodItem, 'name'));
router.get('/meal', get(Meal));
router.get('/recipe', get(Recipe, 'name'));
router.get('/menuSettings', get(MenuSettings));
router.get('/menu', (req, res) => {
  var days = req.query.days.split(',');
  Menu.get(days, function(err, menu){
    if(err) {
      console.error(err);
      return res.status(500).send(err);
    }
    return res.status(200).send(menu);
  })
});
router.get('/foodItem/count', (req, res) => {
  let q = {};
  if(req.query && req.query.search){
    q = { $text : { $search : req.query.search } };
  }
  FoodItem.count(q, (err, count) => {
    if(err) {
      console.error(err);
      return res.status(500).send(err);
    }
    return res.status(200).send({count: count});
  });
});

router.get('/foodItem/:id', get(FoodItem, 'name'));
router.get('/meal/:id', get(Meal));
router.get('/recipe/:id', get(Recipe, 'name'));

router.post('/foodItem', post(FoodItem));
router.post('/meal', post(Meal));
router.post('/menuSettings', post(MenuSettings));
router.post('/recipe', post(Recipe));

router.delete('/meal/:id', del(Meal));
router.delete('/recipe/:id', del(Recipe));
router.delete('/foodItem/:id', (req, res) => {
  debug('delete', req.params);
  Recipe.find({'ingredients.foodItem': req.params.id}, function(err, recipes){
    if(err) {
      console.error(err);
      return res.status(500).send(err);
    }
    if(recipes && recipes.length){
      return res.status(400).send({error: 'Cannot delete item; It exists in a recipe.'});
    }
    FoodItem.remove({_id: req.params.id}, (err) => {
      if(err) {
        console.error(err);
        return res.status(500).send(err);
      }
      debug('Successfully deleted item');
      return res.status(200).send();
    });
  });
});

module.exports = router;

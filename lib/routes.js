'use strict';

const express = require('express');
const oauthServer = require('oauth2-server');
const oauthModel = require('../lib/oauthModel');
const debug = require('debug')('routes');
const router = express.Router();

const FoodItem = require('../models/food');
const Recipe = require('../models/recipe');
const Meal = require('../models/meal');
const Person = require('../models/person');

const paginate = (model, q, o, skip, limit) => {
  let s = 0;
  let l = limit;
  if (skip) { s = skip; }
  if (limit) { l = limit; }
  if (q._id) {
    return model.findOne(q);
  }
  return model.find(q, o).skip(s).limit(l);
};

const get = (model, sortBy) => {
  return (req, res) => {
    const q = {};
    const o = {};
    if (req.params.id) {
      q._id = req.params.id;
    }
    if (req.query.search) {
      q.$text = { $search: req.query.search };
      o.score = { $meta: 'textScore' };
    }
    if (req.query.filter) {
      q.$or = [{source: req.query.filter}, {author: req.query.filter}];
    }
    if (req.query.type) {
      q.mealTypes = req.query.type;
    }
    const skip = Number(req.query.skip) || 0;
    const limit = Number(req.query.limit) || 50;
    const query = paginate(model, q, o, skip, limit);
    if (!req.query.search && sortBy) {
      query.sort(sortBy);
    }
    if (req.query.search) {
      query.sort({ score: { $meta: 'textScore' } });
    }
    query.exec((err, docs) => {
      if (err) {
        console.error(err);
        return res.status(500).send();
      }
      debug(docs);
      try {
        console.log('Attempting to convert doc to JSON');
        const doc = docs.toJSON({virtuals: true});
        res.send(doc);
      } catch (e) {
        res.send(docs);
      }
    });
  };
};

const post = (Item) => {
  return (req, res) => {
    debug(req.body);
    if (!req.body._id) {
      const item = new Item(req.body);
      debug('item', item);
      item.save((err) => {
        if (err) {
          console.error(err);
          return res.status(500).send();
        }
        debug('Successfully created item');
        return res.status(200).send(item);
      });
    } else {
      if (!req.user ||
          (!req.body.author && !req.body.source) ||
          (req.body.author && req.user.id !== req.body.author._id) ||
          (req.body.source && req.user.id !== req.body.source._id)) {
            console.log(req.user);
            console.log(req.body.author);
            console.log(req.body.source);
        return res.status(403).send();
      }
      const id = req.body._id;
      delete req.body._id;
      req.body.__v++;
      debug('Update', req.body);
      Item.findOneAndUpdate({_id: id}, {$set: req.body}, {new: true}, (err) => {
        if (err) {
          console.error(err);
          return res.status(500).send();
        }
        debug('Successfully updated item');
        return res.status(204).send();
      });
    }
  };
};

const del = (Model) => {
  return (req, res) => {
    debug('delete', req.params);
    Model.remove({_id: req.params.id}, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send();
      }
      debug('Successfully deleted item');
      return res.status(200).send();
    });
  };
};

router.oauth = oauthServer({
  model: oauthModel,
  accessTokenLifetime: null,
  grants: ['password'],
  debug: true
});

router.all('/oauth/token', router.oauth.grant());

router.get('/foodItem', get(FoodItem, 'name'));
router.get('/recipe', get(Recipe, 'name'));

router.get('/foodItem/:id', get(FoodItem, 'name'));
router.get('/recipe/:id', get(Recipe, 'name'));

router.post('/foodItem', router.oauth.authorise(), post(FoodItem));
router.post('/recipe', router.oauth.authorise(), post(Recipe));

router.delete('/recipe/:id', router.oauth.authorise(), del(Recipe));
router.delete('/foodItem/:id', router.oauth.authorise(), (req, res) => {
  debug('delete', req.params);
  Recipe.find({'ingredients.foodItem': req.params.id}, (err, recipes) => {
    if (err) {
      console.error(err);
      return res.status(500).send();
    }
    if (recipes && recipes.length) {
      return res.status(400).send({error: 'Cannot delete item; It exists in a recipe.'});
    }
    FoodItem.remove({_id: req.params.id}, (err2) => {
      if (err2) {
        console.error(err2);
        return res.status(500).send();
      }
      debug('Successfully deleted item');
      return res.status(200).send();
    });
  });
});

router.post('/user', (req, res) => {
  if (req.body && req.body.email && req.body.password) {
    Person.create(req.body, (err, person) => {
      if (err) {
        console.error(err);
        return res.status(400).send();
      }
      res.status(201).send(person);
    });
  } else {
    res.status(400).send();
  }
});

router.get('/profile', router.oauth.authorise(), (req, res) => {
  const user = req.user;
  Person.getProfile(user.id, (err, profile) => {
    if (err) {
      console.error(err);
      return res.status(400).send();
    }
    res.status(200).send(profile);
  });
});

router.post('/profile', router.oauth.authorise(), (req, res) => {
  const user = req.user;
  console.log('Update profile', req.body);
  Person.updateProfile(user.id, req.body, (err, profile) => {
    if (err) {
      console.error(err);
      return res.status(400).send();
    }
    console.log('Update result', profile);
    res.status(201).send(profile);
  });
});

router.use(router.oauth.errorHandler());

module.exports = router;

'use strict';

const express = require('express');
const oauthServer = require('oauth2-server');
const oauthModel = require('../lib/oauthModel');
const debug = require('debug')('routes');
const router = express.Router();
const log = console;

const Food = require('../models/food');
const Recipe = require('../models/recipe');
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
        log.error(err);
        return res.status(500).send();
      }
      debug(docs);
      try {
        debug('Attempting to convert doc to JSON');
        const doc = docs.toJSON({virtuals: true});
        res.send(doc);
      } catch (e) {
        res.send(docs);
      }
    });
  };
};

const del = (Model) => {
  return (req, res) => {
    debug('delete', req.params);
    Model.remove({_id: req.params.id}, (err) => {
      if (err) {
        log.error(err);
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
  debug
});

router.all('/oauth/token', router.oauth.grant());

router.get('/food', get(Food, 'name'));
router.get('/food/:id', get(Food, 'name'));
router.post('/food', router.oauth.authorise(), (req, res) => {
  const food = new Food(req.body);
  food.source = req.user.id;
  debug('new food', food);
  food.save((err) => {
    if (err) {
      log.error(err);
      return res.status(500).send();
    }
    debug('Successfully created food');
    return res.status(200).send(food);
  });
});
router.put('/food/:id', router.oauth.authorise(), (req, res) => {
  const body = req.body;
  body.source = req.user.id;
  Food.findOneAndUpdate({_id: req.params.id}, body, {new: true}, (err, food) => {
    if (err) {
      log.error(err);
      return res.status(500).send();
    }
    if (!food) {
      log.error(err);
      return res.status(404).send({error: 'Food not found.'});
    }
    debug('Successfully updated food');
    return res.status(201).send(food);
  });
});
router.delete('/food/:id', router.oauth.authorise(), (req, res) => {
  debug('delete', req.params);
  Recipe.find({'ingredients.Food': req.params.id}, (err, recipes) => {
    if (err) {
      log.error(err);
      return res.status(500).send();
    }
    if (recipes && recipes.length) {
      return res.status(400).send({error: 'Cannot delete item; It exists in a recipe.'});
    }
    Food.remove({_id: req.params.id}, (err2) => {
      if (err2) {
        log.error(err2);
        return res.status(500).send();
      }
      debug('Successfully deleted item');
      return res.status(200).send();
    });
  });
});

router.get('/recipe', get(Recipe, 'name'));
router.get('/recipe/:id', get(Recipe, 'name'));
router.post('/recipe', router.oauth.authorise(), (req, res) => {
  const recipe = req.body;
  recipe.author = req.user.id;
  debug('new recipe', recipe);
  Recipe.create(recipe, (err, response) => {
    if (err) {
      log.error(err, err.stack);
      return res.status(500).send();
    }
    debug('Successfully created recipe');
    return res.status(200).send(response);
  });
});
router.put('/recipe/:id', router.oauth.authorise(), (req, res) => {
  const body = req.body;
  body.author = req.user.id;
  Recipe.update(req.params.id, body, (err, recipe) => {
    if (err) {
      log.error(err, err.stack);
      return res.status(500).send();
    }
    if (!recipe) {
      return res.status(404).send({error: 'Recipe not found.'});
    }
    debug('Successfully updated recipe');
    return res.status(201).send(recipe);
  });
});
router.delete('/recipe/:id', router.oauth.authorise(), del(Recipe));

router.post('/user', (req, res) => {
  if (req.body && req.body.email && req.body.password) {
    Person.create(req.body, (err, person) => {
      if (err) {
        log.error(err);
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
      log.error(err);
      return res.status(400).send();
    }
    res.status(200).send(profile);
  });
});

router.post('/profile', router.oauth.authorise(), (req, res) => {
  const user = req.user;
  debug('Update profile', req.body);
  Person.updateProfile(user.id, req.body, (err, profile) => {
    if (err) {
      log.error(err);
      return res.status(400).send();
    }
    debug('Update result', profile);
    res.status(201).send(profile);
  });
});

router.use(router.oauth.errorHandler());

module.exports = router;

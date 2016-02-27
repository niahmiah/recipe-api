'use strict';

const request = require('supertest');
const server = require('../../server');
const mongoose = require('mongoose');
const OAuthClient = require('../../models/oAuthClient');
const expect = require('chai').expect;

const client = {
  clientId: 'webApp',
  clientSecret: 'sauce'
};

describe('API Methods', () => {

  before((cb) => {
    server.start(() => {
      const oauthClient = new OAuthClient(client);
      oauthClient.save(cb);
    });
  });

  after((cb) => {
    mongoose.connection.db.dropDatabase(() => {
      server.stop(cb);
    });
  });

  const testUser = {
    firstName: 'Ian',
    lastName: 'Patton',
    email: 'test@recipeswithyou.com',
    password: 'supersecurepw'
  };

  const bread = {
    name: 'Slice of Bread',
    qty: 1,
    nutrition: {
      calories: {
        total: 60,
        fromFat: 5
      },
      carbohydrates: {
        total: 13,
        sugar: 2,
        fiber: 1
      },
      cholesterol: 3,
      sodium: 3,
      fat: {
        total: 4,
        saturated: 1,
        trans: 1,
        polyunsat: 1,
        monounsat: 1
      },
      potassium: 3,
      protein: 3,
      vitamin: {
        a: 1,
        c: 1,
        d: 1,
        calcium: 1,
        iron: 1
      }
    }
  };

  const cheese = {
    name: 'Cheddar Cheese',
    qty: 1,
    unit: 'oz',
    nutrition: {
      calories: {
        total: 2,
        fromFat: 1
      },
      carbohydrates: {
        total: 3,
        sugar: 2,
        fiber: 1
      },
      cholesterol: 3,
      sodium: 3,
      fat: {
        total: 4,
        saturated: 1,
        trans: 1,
        polyunsat: 1,
        monounsat: 1
      },
      potassium: 3,
      protein: 3,
      vitamin: {
        a: 1,
        c: 1,
        d: 1,
        calcium: 1,
        iron: 1
      }
    }
  };

  const sauce = {
    name: 'Pizza Sauce',
    fraction: {
      numerator: 1,
      denominator: 4
    },
    unit: 'cup',
    nutrition: {
      calories: {
        total: 60,
        fromFat: 5
      },
      carbohydrates: {
        total: 13,
        sugar: 2,
        fiber: 1
      },
      cholesterol: 3,
      sodium: 3,
      fat: {
        total: 4,
        saturated: 1,
        trans: 1,
        polyunsat: 1,
        monounsat: 1
      },
      potassium: 3,
      protein: 3,
      vitamin: {
        a: 1,
        c: 1,
        d: 1,
        calcium: 1,
        iron: 1
      }
    }
  };

  const bearerToken = new Buffer('webApp:sauce').toString('base64');

  let accessToken = '';

  describe('Users', () => {
    it('should be able to signup', (done) => {
      request(server.app)
        .post('/user')
        .send(testUser)
        .set('Accept', 'application/json')
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(201);
          testUser._id = res.body._id;
          done();
        });
    });

    it('should be able to get an auth token', (done) => {
      request(server.app)
        .post('/oauth/token')
        .type('form')
        .set('Accept', 'application/json')
        .set('Authorization', `Basic ${bearerToken}`)
        .send({
          'grant_type': 'password',
          username: testUser.email,
          password: testUser.password,
          'client_id': 'webApp'
        })
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);
          accessToken = res.body.access_token;
          done(err);
        });
    });
  });

  describe('Foods & Beverages', () => {
    it('should fail without a valid OAuth Token', (done) => {
      request(server.app)
        .post('/food')
        .send(bread)
        .set('Accept', 'application/json')
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(400);
          done(err);
        });
    });

    it('should create a food', (done) => {
      request(server.app)
        .post('/food')
        .send(bread)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);
          bread._id = res.body._id;
          done(err);
        });
    });

    it('should create a food with a unit', (done) => {
      request(server.app)
        .post('/food')
        .send(cheese)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);
          expect(res.body.unit).to.equal('oz');
          cheese._id = res.body._id;
          done(err);
        });
    });

    it('should create a food with a unit and fraction', (done) => {
      request(server.app)
        .post('/food')
        .send(sauce)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);
          expect(res.body.fraction.numerator).to.equal(1);
          expect(res.body.fraction.denominator).to.equal(4);
          sauce._id = res.body._id;
          done(err);
        });
    });

    it('should update a food', (done) => {
      cheese.name = 'Cheese, Cheddar';
      request(server.app)
        .put(`/food/${cheese._id}`)
        .send(cheese)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(201);
          expect(res.body.name).to.equal('Cheese, Cheddar');
          done(err);
        });
    });

    it('should allow getting foods', (done) => {
      request(server.app)
        .get(`/food`)
        .set('Accept', 'application/json')
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);
          expect(res.body.length).to.equal(3);
          done(err);
        });
    });

  });

  describe('Recipes', () => {
    const newRecipe = {
      name: 'Empty Recipe',
      servings: 1
    };
    it('should fail without a valid OAuth Token', (done) => {
      request(server.app)
        .post('/recipe')
        .send(newRecipe)
        .set('Accept', 'application/json')
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(400);
          done(err);
        });
    });

    it('should create a recipe', (done) => {
      newRecipe.ingredients = [
        {
          foodItem: cheese._id,
          qty: 8,
          unit: 'oz'
        }
      ];
      request(server.app)
        .post('/recipe')
        .send(newRecipe)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);
          newRecipe._id = res.body._id;
          done(err);
        });
    });

    it('should update a recipe', (done) => {
      newRecipe.name = 'Cheese Pizza Toast';
      newRecipe.ingredients = [
        {
          foodItem: cheese._id,
          qty: 8,
          unit: 'oz'
        },
        {
          foodItem: bread._id,
          qty: 2
        },
        {
          foodItem: sauce._id,
          qty: 1,
          fraction: {
            numerator: 1,
            denominator: 2
          },
          unit: 'cup'
        }
      ];
      request(server.app)
        .put(`/recipe/${newRecipe._id}`)
        .send(newRecipe)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Accept', 'application/json')
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(201);
          expect(res.body.name).to.equal(newRecipe.name);
          expect(res.body.ingredients).to.not.equal(null);
          expect(res.body.ingredients.length).to.equal(3);
          expect(res.body.nutrition.calories.total).to.equal(
            cheese.nutrition.calories.total * newRecipe.ingredients[0].qty +
            bread.nutrition.calories.total * newRecipe.ingredients[1].qty +
            sauce.nutrition.calories.total * 6
          );
          done(err);
        });
    });

    it('should allow getting recipes', (done) => {
      request(server.app)
        .get(`/recipe`)
        .set('Accept', 'application/json')
        .end((err, res) => {
          expect(err).to.equal(null);
          expect(res.statusCode).to.equal(200);
          expect(res.body.length).to.equal(1);
          done(err);
        });
    });

  });
});

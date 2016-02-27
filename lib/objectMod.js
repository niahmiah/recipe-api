'use strict';

const _ = require('lodash');
const debug = require('debug')('objectMod');

module.exports = {

  multiplyObject: (object, value) => {
    // debug('multiplyObject:', value, object);
    if (value && value === 1) {
      return object;
    }
    const merger = (a, b) => {
      // debug('multiply merge compare', a, b);
      if (_.isObject(b)) {
        return _.merge({}, a, b, merger);
      } else if (_.isNumber(b)) {
        return Math.round(b * value);
      } else {
        return a || b;
      }
    };

    return _.merge({}, object, merger);
  },

  addObjects: (objectsArray) => {
    // Custom merge function ORs together non-object values, recursively
    // calls itself on Objects.
    debug('addObjects:', objectsArray);
    const merger = (a, b) => {
      debug('add merge compare', a, b);
      if (_.isObject(a) || _.isObject(b)) {
        return _.merge({}, a, b, merger);
      } else if (_.isNumber(a) && _.isNumber(b)) {
        return a + b;
      } else if (_.isNumber(a)) {
        return a;
      } else if (_.isNumber(b)) {
        return b;
      } else {
        return a || b;
      }
    };

    const args = _.flatten([{}, objectsArray, merger]);
    const result = _.merge.apply(_, args);
    debug('addObjects result', result);
    return result;
  }
};

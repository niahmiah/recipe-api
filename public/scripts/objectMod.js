function multiplyObject(object, value){
  if(value && value === 1){
    return object;
  }
  var merger = function (a, b) {
    if (_.isObject(b)) {
      return _.merge({}, a, b, merger);
    } else if (_.isNumber(b)) {
      return Math.round(b * value);
    } else {
      return a || b;
    }
  };

  // Allow roles to be passed to _.merge as an array of arbitrary length
  var args = _.flatten([{}, [object], merger]);
  return _.merge.apply(_, args);
}

function addObjects(objectsArray){
  // Custom merge function ORs together non-object values, recursively
  // calls itself on Objects.
  var merger = function (a, b) {
    // console.log('merger comparing:', a, b);
    if (_.isObject(a)) {
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

  // Allow objects to be passed to _.merge as an array of arbitrary length
  var args = _.flatten([{}, objectsArray, merger]);
  return _.merge.apply(_, args);
}

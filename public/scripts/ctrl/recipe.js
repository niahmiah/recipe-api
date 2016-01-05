var foodApp = angular.module('foodApp', []);
foodApp.controller('recipeCtrl', function ($scope, $http) {
  $scope.message = "";
  $scope.showEditor = false;
  $scope.recipes = [];
  $scope.mealTimes = ["breakfast", "lunch", "dinner", "snack"];
  $scope.mealTypes = ["entree", "side", "beverage"];
  $scope.recipe = {
    ingredients: [],
    mealTypes: []
  };
  $scope.foodItems = [];
  $scope.ingredient = {
    qty: 1,
    numerator: 0,
    denominator: 2
  }
  $scope.saveRecipe = function(recipe){
    console.log('saveRecipe', recipe);
    $http({url: '/recipe', method: "POST", data: recipe}).success(function success(res){
      $scope.recipe = {
        ingredients: [],
        mealTypes: []
      };
      $scope.getRecipes();
      $scope.showEditor = false;
    }).error(function(data, status){
      console.error(status, data);
    });
  };
  $scope.getRecipes = function(){
    $http.get('/recipe').then(function success(res){
      $scope.recipes = res.data;
    });
  };
  $scope.getFoodItems = function(){
    $http.get('/foodItem').then(function success(res){
      $scope.foodItems = res.data;
    });
  };
  $scope.newRecipe = function(){
    $scope.showEditor = true;
    $scope.recipe = {
      ingredients: [],
      mealTypes: []
    };
  };
  $scope.loadRecipe = function(id){
    $http.get('/recipe/' + id).then(function success(res){
      if(res.data && res.data.length) $scope.recipe = res.data[0];
      $scope.showEditor = true;
    });
  };
  $scope.removeRecipe = function(id){
    $http({url: '/recipe/' + id, method: "DELETE"}).success(function success(res){
      $scope.getRecipes();
      $scope.showEditor = false;
    });
  };
  $scope.addIngredient = function(ingredient){
    $scope.foodItems.forEach(function(item){
      if(item._id === ingredient.foodItem){
        ingredient.foodItem = item;
      }
    })
    $scope.recipe.ingredients.push(ingredient);
    $scope.ingredient = {};
    $scope.recalculateNutrition();
  };
  $scope.removeIngredient = function(index){
    $scope.recipe.ingredients.splice(index,1);
    $scope.recalculateNutrition();
  };

  function getMeasureString(object){
    var string = '';
    if(object.qty){
      string += object.qty;
    }
    if(object.fraction && object.fraction.numerator && object.fraction.denominator){
      if(string) string += ' ';
      string += '' + object.fraction.numerator + '/' + object.fraction.denominator;
    }
    if(object.unit){
      string += ' ' + unitsOfMeasure[object.unit];
    }else{
      //hack to enable diff'ing items with no unitsOfMeasu
      string += ' ' + 'l';
    }
    return string;
  }
  $scope.recalculateNutrition = function(){
    var nutritionInfo = {};
    $scope.recipe.ingredients.forEach(function(ingr){
      // multiply nutrition info based on measure.js conversion
      var servingMultiplier = 1;

      var ingrMsrString = getMeasureString(ingr.foodItem) || '';
      var ingrSrv = 0;
      var ingrSrvType = 'mass';
      if(['oz', 'lb'].indexOf(ingr.foodItem.unit) > -1){
        ingrSrv = measure(ingrMsrString).ounces();
      }else{
        ingrSrvType = 'volume';
        ingrSrv = measure(ingrMsrString).milliliters();
      }

      var recipeIngrMsrString = getMeasureString(ingr) || '';
      var recipeInrgSrv = 0;
      var recipeIngrSrvType = 'mass';
      if(['oz', 'lb'].indexOf(ingr.unit) > -1){
        recipeInrgSrv = measure(recipeIngrMsrString).ounces();
      }else{
        recipeIngrSrvType = 'volume';
        recipeInrgSrv = measure(recipeIngrMsrString).milliliters();
      }


      // console.log('measure:', ingr.foodItem.name, ingrMsrString, recipeIngrMsrString);
      // console.log('vals in millis', ingrSrv, recipeInrgSrv);
      if(ingrSrvType !== recipeIngrSrvType){
        alert('Invalid measurement conversion for: ' + ingr.foodItem.name + '\n\nNutritional information will not be correct for this recipe.');
        servingMultiplier = 0;
      }else{
        servingMultiplier = (recipeInrgSrv / ingrSrv) / $scope.recipe.servings;
      }

      // console.log('multiplier', servingMultiplier);
      // console.log('before', ingr.foodItem.nutrition);

      var ingrfoodItemNutrition = multiplyObject(ingr.foodItem.nutrition, servingMultiplier);
      // console.log('after', ingr.foodItem.nutrition);
      //divide by servings #
      // console.log('Adding values from', ingr.foodItem.nutrition);
      nutritionInfo = addObjects([nutritionInfo, ingrfoodItemNutrition]);
    });
    $scope.recipe.nutrition = nutritionInfo;
  };
  $scope.toggleSelection = function(mealType){
    $scope.recipe.mealTypes = $scope.recipe.mealTypes || [];
    var radioTypes = ["entree", "side", "beverage"];

    var idx = $scope.recipe.mealTypes.indexOf(mealType);
    if (idx > -1) {
      $scope.recipe.mealTypes.splice(idx, 1);
    } else {
      $scope.recipe.mealTypes.push(mealType);
    }

    if(radioTypes.indexOf(mealType) > -1){
      radioTypes.splice(radioTypes.indexOf(mealType), 1);
      radioTypes.forEach(function(type){
        var idx = $scope.recipe.mealTypes.indexOf(type);
        if (idx > -1) {
          $scope.recipe.mealTypes.splice(idx, 1);
        }
      });
    }
  };

  $scope.getRecipes();
  $scope.getFoodItems();
});

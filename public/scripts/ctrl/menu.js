var foodApp = angular.module('foodApp', []);
foodApp.controller('menuCtrl', function ($scope, $http) {
  $scope.showSettings = false;
  $scope.menuSettings = {};
  $scope.mealsInDay = ["breakfast", "lunch", "dinner", "snack"];
  $scope.numberDays = 7;
  $scope.nextXDays = [];
  $scope.getNextXDays = function(num){
    if(num) $scope.numberDays = num;
    var n = [];
    for(var i=0; i<$scope.numberDays; i++){
      n.push(moment(Date.parse('t + '+i+' d')).format('L'));
    }
    $scope.nextXDays = n;
    console.log($scope.nextXDays);
    $scope.getMenuSettings();
  }


  $scope.saveMenuSettings = function(){
    $http({url: '/menuSettings', method: "POST", data: $scope.menuSettings}).success(function success(res, blah){
      console.log(res, blah);
      $scope.menuSettings = res;
      console.log('saved', $scope.menuSettings);
      $scope.getMenu();
    }).error(function(data, status){
      console.error(status, data);
    });
  };

  $scope.getMenuSettings = function(){
    $http.get('/menuSettings').then(function success(res){
      console.log('got menu settings', res.data);
      $scope.menuSettings = res.data[0];
      $scope.getMenu();
    });
  };

  $scope.getMenu = function(){
    console.log('Getting menu');
    var days = [];
    $scope.nextXDays.forEach(function(str){
      days.push(str.replace(/\//g, ''));
    });
    $http.get('/menu?days='+days).success(function success(res){
      console.log('Got menu!', res);
      $scope.menu = res;
    }).error(function(data, status){
      console.error(status, data);
    });
  }

  $scope.getMenuForDay = function(day, meal){
    day = day.replace(/\//g, '');
    // console.log('get menu for', day, meal);
    if($scope.menu && $scope.menu[day] && $scope.menu[day][meal]){
      return $scope.menu[day][meal];
    }
    return [];
  };

  $scope.getTotal = function(day, meal, field){
    day = day.replace(/\//g, '');
    var total = 0;
    if($scope.menu && $scope.menu[day] && $scope.menu[day][meal]){
      $scope.menu[day][meal].forEach(function(recipe){
        if(field === 'calories' || field === 'carbohydrates'){
          if(!recipe.nutrition[field]) return total;
          return total = total + recipe.nutrition[field].total;
        }
        total = total + recipe.nutrition[field];
      });
    }
    return total;
  }

  $scope.getNextXDays();

});

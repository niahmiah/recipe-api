var foodApp = angular.module('foodApp', []);
foodApp.controller('foodItemCtrl', function ($scope, $http) {
  $scope.message = "";
  $scope.showEditor = false;
  $scope.foodItems = [];
  $scope.foodItem = {};
  $scope.limit = 50;
  $scope.pages = [];
  $scope.navigation = {
    page: 1,
    pages: 1,
    count: 1
  };
  $scope.search = null;
  $scope.saveFoodItem = function(item) {
    $http({url: '/foodItem', method: "POST", data: item}).success(function success(res){
      $scope.foodItem = {};
      $scope.getFoodItems();
      $scope.showEditor = false;
      console.log(res);
    }).error(function(data, status){
      alert('Error saving item', data, status);
      console.error(status, data);
    });
  };
  $scope.getFoodItemCount = function(){
    var searchString = '';
    if($scope.search){
      console.log('got search', $scope.search);
      searchString = '?search='+encodeURIComponent($scope.search);
    }
    $http.get('/foodItem/count'+searchString).then(function success(res){
      console.log('count', res);
      $scope.navigation.count = res.data.count;
      $scope.navigation.pages = Math.ceil($scope.navigation.count / $scope.limit);
      $scope.pages = [];
      for(var i=0; i<$scope.navigation.pages; i++){
        $scope.pages.push(i+1);
      }
      $scope.getFoodItems();
    });
  };
  $scope.getFoodItems = function(page){
    console.log('page', page);
    $scope.navigation.page = page || 1;
    var searchString = '';
    if($scope.search){
      searchString = '&search='+encodeURIComponent($scope.search);
    }
    $http.get('/foodItem?limit='+$scope.limit+'&skip='+(($scope.navigation.page - 1) * $scope.limit)+searchString).then(function success(res){
      $scope.foodItems = res.data;
    });
  }
  $scope.loadItem = function(id){
    $http.get('/foodItem/' + id).then(function success(res){
      if(res.data && res.data.length) $scope.foodItem = res.data[0];
      $scope.showEditor = true;
    });
  }
  $scope.newItem = function(){
    $scope.showEditor = true;
    $scope.foodItem = {};
  }
  $scope.removeItem = function(id){
    $http({url: '/foodItem/' + id, method: "DELETE"}).success(function success(res){
      $scope.getFoodItems();
      $scope.showEditor = false;
    });
  };
  // $scope.changeLimit = function(limit){
  //   $scope.limit = limit;
  //   $scope.getFoodItemCount();
  // }
  $scope.getFoodItemCount();
});

foodApp.directive('convertToNumber', function() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      ngModel.$parsers.push(function(val) {
        return parseInt(val, 10);
      });
      ngModel.$formatters.push(function(val) {
        return '' + val;
      });
    }
  };
});

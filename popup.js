'use strict';

// App
var app = angular.module('yum', ['yum.filters', 'yum.services', 'yum.controllers', 'yum.directives']);

app.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/login', {
    templateUrl: 'views/login.html', 
    controller: 'LoginCtrl'
  });
  $routeProvider.when('/new', {
    templateUrl: 'views/new.html', 
    controller: 'NewLinkCtrl',
    resolve: {
      tab: function($q, delicious) {
        var defer = $q.defer();
        delicious.getTab().then(defer.resolve, defer.reject);
        return defer.promise;
      }
    }
  });
  $routeProvider.when('/bookmarks', {templateUrl: 'views/bookmarks.html', controller: 'BookmarksCtrl'});
  $routeProvider.otherwise({redirectTo: '/login'});
}]);

app.run(function($rootScope, $location) {
  $rootScope.loggedIn = localStorage.getItem('chrome-ext-delicious') ? true : false;

  if ($rootScope.loggedIn) {
    $location.path('/new');
  }

  $rootScope.$on('$routeChangeStart', function(event, next, current) {
    if (!$rootScope.loggedIn && next.$route.controller !== 'LoginCtrl') {
      $location.path('/login');
    }
  });
});

// Filters
var filters = angular.module('yum.filters', []);

filters.filter('list', [function() {
  return function(arr) {
    return arr.join(', ');
  }
}]);

// Services
var services = angular.module('yum.services', []);

services.factory('delicious', function($http, $q, $rootScope) {
  var DELICIOUS = {};

  DELICIOUS.authenticate = function(username, password) {
    var hash = btoa(username + ":" + password);
    var options = {
      method: 'GET',
      url: 'https://api.del.icio.us/v1/posts/update',
      headers: {'Authorization' : 'Basic ' + hash}
    };

    return $http(options).then(function() {
      localStorage.setItem('chrome-ext-delicious', hash);
    });
  };

  DELICIOUS.addLink = function(linkData) {
    var hash = localStorage.getItem('chrome-ext-delicious');
    var options = {
      method: 'POST',
      url: 'https://api.del.icio.us/v1/posts/add',
      headers: {'Authorization' : 'Basic ' + hash, 'Content-Type': 'application/x-www-form-urlencoded'},
      transformRequest: function(obj) {
        var str = [];
        for(var p in obj) {
          str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
        }
        return str.join('&');
      },
      data: linkData
    };

    return $http(options);
  };

  DELICIOUS.removeLink = function(link) {
    var hash = localStorage.getItem('chrome-ext-delicious');
    var options = {
      method: 'GET',
      url: 'https://api.del.icio.us/v1/posts/delete',
      headers: {'Authorization' : 'Basic '+ hash},
      params: {md5: link.hash}
    };

    return $http(options);
  };

  DELICIOUS.getQueryStringByName = function(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);

    if(results === null) {
      return "";
    } else {
      return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
  };

  DELICIOUS.getTab = function() {
    var defer = $q.defer();

    if (chrome.tabs) {
      chrome.tabs.getSelected(null, function(tab) {
        $rootScope.$apply(function() {
          defer.resolve(tab);
        });
      });
    } else {
      $rootScope.$apply(function() {
        defer.resolve(DELICIOUS.getQueryStringByName('url'));
      });
    }

    return defer.promise;
  };

  DELICIOUS.getLinks = (function() { 
    return function getLinks() {
      var defer = $q.defer();

      var hash = localStorage.getItem('chrome-ext-delicious');
      var options = {
        method: 'GET',
        url: 'https://api.del.icio.us/v1/posts/all?',
        headers: {'Authorization' : 'Basic ' + hash},
        transformResponse: _parseLinksResponse
      };

      $http(options).then(function(resp) {
        defer.resolve(resp.data);
      });

      return defer.promise;
    };

    function _parseLinksResponse(data) {
      var json = xml.xmlToJSON(data);

      return json.posts.post.map(function(rawLink) {
        var link = {};

        // Remove '@' symbols from keys
        for (key in rawLink) { 
          var k = key.split('@')[1]; 
          link[k] = rawLink[key]; 
        }

        // Convert tag string to array of tags
        link.tags = link.tag.split(' ');
        delete link.tag;

        return link; 
      });
    };
  })();

  return DELICIOUS;
});

// Controllers
var controllers = angular.module('yum.controllers', []);

controllers.controller('AppCtrl', function($scope, $location) {
  $scope.menu = [
    {path: '/new', text: 'Add Link'},
    {path: '/bookmarks', text: 'My Bookmarks'}
  ];

  $scope.isSelected = function(item) {
    var path = $location.path();
    return (path === item.path);
  };

  $scope.navigateTo = function(path) {
    $location.path(path);
  };
});

controllers.controller('LoginCtrl', function($scope, $rootScope, $location, delicious) {
  $scope.login = function() {
    delicious.authenticate($scope.username, $scope.password)
      .then(function(msg) {
        $rootScope.loggedIn = true;
        $location.path('/new');
      });
  };
});

controllers.controller('NewLinkCtrl', function($scope, $location, tab, delicious) {
  $scope.url = tab.url;
  $scope.description = tab.title;
  $scope.tags = [];

  $scope.add = function() {
    delicious.addLink({
      url: $scope.url,
      description: $scope.description,
      shared: (!$scope.share ? 'yes' : 'no'),
      tags: $scope.tags.toString(),
      replace: 'yes'
    }).then(function() {
      $location.path('/bookmarks');
    });
  };
});

controllers.controller('BookmarksCtrl', function($scope, $timeout, $filter, delicious) {
  $scope.linksLength = 0;

  delicious.getLinks().then(function(links) {
    $scope.links = angular.extend(links, {confirmUpdate: false, confirmRemoval: false});
    $scope.linksLength = $scope.links.length;
  });

  $scope.confirmRemove = function(link) {
    link.confirmRemoval = true;
  };

  $scope.cancelRemove = function(link) {
    link.confirmRemoval = false;
  };

  $scope.confirmUpdate = function(link) {
    link.confirmUpdate = true;
  };

  $scope.cancelUpdate = function(link) {
    link.confirmUpdate = false;
  };

  $scope.update = function(link) {
    link.confirmUpdate = false;

    delicious.addLink({
      url: link.href,
      description: link.description,
      shared: (link.share ? 'yes' : 'no'),
      tags: link.tags.toString(),
      replace: 'yes'
    }).then(null,
      function() {
        // Handle failed update request
        link.confirmUpdate = true;
    });
  };

  $scope.remove = function(link) {
    var index = $scope.links.indexOf(link);
    $scope.links.splice(index, 1);

    delicious.removeLink(link).then(null, function() {
      $scope.links.splice(index, 0, link);
    });
  };

  $scope.$watch('query', function(newValue, oldValue) {
    if (newValue) {
      $scope.linksLength = $filter('filter')($scope.links, newValue).length;
    }
  });
});

// Directives
var directives = angular.module('yum.directives', []);

directives.directive('appVersion', ['version', function(version) {
  return function(scope, elm, attrs) {
    elm.text(version);
  };
}]);

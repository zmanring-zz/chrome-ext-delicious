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
        return delicious.getTab();
      }
    }
  });
  $routeProvider.when('/bookmarks', {
    templateUrl: 'views/bookmarks.html',
    controller: 'BookmarksCtrl'
  });
  $routeProvider.otherwise({
    redirectTo: '/login'
  });
}]);

app.config(function($compileProvider) {
  $compileProvider.urlSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|chrome-extension):/);
});

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
  };
}]);

filters.filter('filterByWord', function() {
  return function(links, query) {
    // Only filter if there's a query string
    if (angular.isString(query)) {
      // Get array of words from query
      var words = query.split(' ');
      // Filter the links and return them
      return links.filter(function(link) {
        // Combine link properties to search into string
        var search = [
        link['description'],
        link['href'], ((link['shared'] === 'no') ? 'private' : ''),
        link['tags'].join(' '),
        link['time']].join(' ');

        // all of the words
        return words.every(function(word) {
          return (search.indexOf(word) !== -1);
        });
      });
    } else {
      // Else just pass all the links through
      return links;
    }
  };
});


// Services
var services = angular.module('yum.services', []);

services.factory('delicious', function($http, $q, $rootScope) {
  var Delicious = {};

  Delicious.authenticate = function(username, password) {
    var hash = btoa(username + ":" + password),
      options = {
        method: 'GET',
        url: 'https://api.del.icio.us/v1/posts/update',
        headers: {
          'Authorization': 'Basic ' + hash
        }
      };

    return $http(options).success(function() {
      localStorage.setItem('chrome-ext-delicious', hash);
    });
  };

  Delicious.addLink = function(linkData) {
    var hash = localStorage.getItem('chrome-ext-delicious'),
      options = {
        method: 'POST',
        url: 'https://api.del.icio.us/v1/posts/add',
        headers: {
          'Authorization': 'Basic ' + hash,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        transformRequest: function(obj) {
          var str = [];
          for (var p in obj) {
            str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
          }
          return str.join('&');
        },
        data: linkData
      };

    return $http(options).success(function() {
      // Clear out links cache
      localStorage.removeItem('chrome-ext-delicious-links');
    });
  };

  Delicious.removeLink = function(link) {
    var hash = localStorage.getItem('chrome-ext-delicious'),
      options = {
        method: 'GET',
        url: 'https://api.del.icio.us/v1/posts/delete',
        headers: {
          'Authorization': 'Basic ' + hash
        },
        params: {
          md5: link.hash
        }
      };

    return $http(options).success(function() {
      // Clear out links cache
      localStorage.removeItem('chrome-ext-delicious-links');
    });
  };

  Delicious.getQueryStringByName = function(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)";
    var regex = new RegExp(regexS);
    var results = regex.exec(window.location.search);

    if (results === null) {
      return "";
    } else {
      return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
  };

  Delicious.getTab = function() {
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

  Delicious.getLinks = function() {
    var defer = $q.defer(),
      links = JSON.parse(localStorage.getItem('chrome-ext-delicious-links'));

    if (links) {
      defer.resolve(links);
    } else {
      this.fetchLinks().then(defer.resolve);
    }

    return defer.promise;
  };

  Delicious.fetchLinks = (function() {
    return function fetchLinks() {
      var defer = $q.defer(),
        hash = localStorage.getItem('chrome-ext-delicious'),
        options = {
          method: 'GET',
          url: 'https://api.del.icio.us/v1/posts/all?',
          headers: {
            'Authorization': 'Basic ' + hash
          },
          transformResponse: _parseLinksResponse
        };

      $http(options).then(function(resp) {
        localStorage.setItem('chrome-ext-delicious-links', JSON.stringify(resp.data));
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

        // domain root
        link.domain = link["href"].replace(/^(.*\/\/[^\/?#]*).*$/, "$1");

        // Convert tag string to array of tags
        // if (link.shared === 'no') {
        //   link.tag = 'private  ' + link.tag;
        // }
        link.tags = link.tag.split('  ');
        delete link.tag;

        return link;
      });
    };
  })();

  Delicious.getUpdate = (function() {
    return function getUpdate() {
      var defer = $q.defer(),
        hash = localStorage.getItem('chrome-ext-delicious'),
        options = {
          method: 'GET',
          url: 'https://api.del.icio.us/v1/posts/update',
          headers: {
            'Authorization': 'Basic ' + hash
          },
          transformResponse: _parseUpdateResponse
        };

      if ($rootScope.loggedIn) {
        $http(options).then(function(resp) {
          defer.resolve(resp.data);
        });
      }

      return defer.promise;
    };

    function _parseUpdateResponse(data) {
      var rawUpdate = xml.xmlToJSON(data).update,
        update = {};

      // Remove '@' symbols from keys
      for (key in rawUpdate) {
        var k = key.split('@')[1];
        update[k] = rawUpdate[key];
      }

      // Convert time string to time integer
      update.time = new Date(update.time).getTime();

      return update;
    };
  })();

  Delicious.getPopularSuggestedTags = (function() {
    return function getPopularSuggestedTags(url) {
      var defer = $q.defer(),
        hash = localStorage.getItem('chrome-ext-delicious'),
        options = {
          method: 'GET',
          url: 'https://api.del.icio.us/v1/posts/suggest?url=' + url,
          headers: {
            'Authorization': 'Basic ' + hash
          },
          transformResponse: _parseSuggestionsResponse
        };

      $http(options).then(function(resp) {
        defer.resolve(resp.data);
      });

      return defer.promise;
    };

    function _parseSuggestionsResponse(data) {
      var json = xml.xmlToJSON(data);

      if (json.suggest) {
        return json.suggest.popular.map(function(rawSuggestionTag) {
          var suggestedTag = {}

          // Remove '@' symbols from keys
          for (key in rawSuggestionTag) {
            var k = key.split('@')[1];
            suggestedTag[k] = rawSuggestionTag[key];
          }
          return suggestedTag.tag;
        });
      }
    };
  })();

  Delicious.getAllMyTags = (function() {
    return function getAllMyTags() {
      var defer = $q.defer(),
        hash = localStorage.getItem('chrome-ext-delicious'),
        options = {
          method: 'GET',
          url: 'https://api.del.icio.us/v1/tags/get',
          headers: {
            'Authorization': 'Basic ' + hash
          },
          transformResponse: _parseTags
        };

      $http(options).then(function(resp) {
        defer.resolve(resp.data);
      });

      return defer.promise;
    };

    function _parseTags(data) {
      var json = xml.xmlToJSON(data);

      if (json.tags) {
        return json.tags.tag.map(function(myTag) {
          var tag = {};

          // Remove '@' symbols from keys
          for (key in myTag) {
            var k = key.split('@')[1];
            tag[k] = myTag[key];
          }
          return tag.tag;
        });
      }
    };
  })();

  Delicious.logout = function() {
    localStorage.removeItem('chrome-ext-delicious');
  };

  // Check for updates
  Delicious.getUpdate().then(function(update) {

    var data = localStorage.getItem('chrome-ext-delicious-last-update');

    if (data !== "NaN") {
      var lastUpdate = JSON.parse(data);
    } else {
      lastUpdate = 0;
    }

    if (update.time !== lastUpdate) {
      Delicious.fetchLinks();
    }

    localStorage.setItem('chrome-ext-delicious-last-update', update.time);
  });

  return Delicious;
});


// Controllers
var controllers = angular.module('yum.controllers', []);

controllers.controller('AppCtrl', function($scope, $location, delicious) {
  $scope.menu = [{
    path: '/new',
    text: 'Add link'
  }, {
    path: '/bookmarks',
    text: 'My links'
  }];

  $scope.isSelected = function(item) {
    var path = $location.path();
    return (path === item.path);
  };

  $scope.logout = function(link) {
    delicious.logout();
    $location.path('/login');
  };

  $scope.extVersion = function() {
    var manifest = chrome.runtime.getManifest();
    return manifest.name + ' ' + manifest.version;
  };
});

controllers.controller('LoginCtrl', function($scope, $rootScope, $location, delicious) {
  $scope.login = function() {
    $scope.loading = true;

    delicious.authenticate($scope.username, $scope.password)
      .success(function(data) {
      $rootScope.loggedIn = true;
      $location.path('/new');
    })
      .error(function(data) {
      $rootScope.loginFailed = true;
      $location.path('/new');
    });
  };
});

controllers.controller('NewLinkCtrl', function($scope, $location, tab, delicious) {
  $scope.url = tab.url;
  $scope.description = tab.title;
  $scope.tags = [];
  $scope.myTags = [];
  $scope.suggestedTags = [];

  $scope.add = function() {
    $scope.loading = true;

    delicious.addLink({
      url: $scope.url,
      description: $scope.description,
      shared: (!$scope.share ? 'yes' : 'no'),
      tags: $scope.tags.join(', '),
      replace: 'yes'
    }).then(function() {
      $location.path('/bookmarks');
    });
  };

  $scope.addSuggestedTag = function(tag) {
    var tags = angular.copy($scope.tags);
    tags.push(tag);
    $scope.tags = tags;

    // remove from suggestedTags arary
    var index = $scope.suggestedTags.indexOf(tag);
    $scope.suggestedTags.splice(index, 1);
  };

  delicious.getAllMyTags().then(function(myTags) {
    $scope.myTags = myTags;
  });

  delicious.getPopularSuggestedTags($scope.url).then(function(tags) {
    $scope.suggestedTags = tags;
  });
});

controllers.controller('BookmarksCtrl', function($scope, $timeout, $filter, delicious) {
  $scope.links = [];
  $scope.linksLength = 0;
  $scope.myTags = [];

  delicious.getLinks().then(function(links) {
    $scope.links = angular.extend(links, {
      confirmUpdate: false,
      confirmRemoval: false
    });
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

  $scope.isPrivate = function(link) {
    return (link.shared === 'no');
  };

  $scope.appendQuery = function(word) {
    var query = $scope.query ? ($scope.query + ' ' + word) : word;
    $scope.query = query.trim();
  };

  delicious.getAllMyTags().then(function(myTags) {
    $scope.myTags = myTags;
  });

  $scope.$watch('query', function(newValue, oldValue) {
    $scope.linksLength = $filter('filterByWord')($scope.links, newValue).length;
  });
});


// Directives
var directives = angular.module('yum.directives', []);

directives.directive('appVersion', ['version', function(version) {
  return function(scope, elm, attrs) {
    elm.text(version);
  };
}]);

// TODO: Make select-two-show optional
directives.directive('selectTwo', [function() {
  function link(scope, element, attrs, a) {
    var select = angular.element(element);

    scope.$watch('show', initSelectTwo);
    scope.$watch('tags', initSelectTwo);
    scope.$watch('val', function(newVal) {
      select.select2('val', newVal);
    });

    select.bind('change', function(e) {
      scope.$apply(function() {
        scope.val = e.val;
      });
    });

    function initSelectTwo() {
      if (!scope.show) return;
      select.select2({
        tags: scope.tags,
        tokenSeparators: [',']
      });
      select.select2('val', scope.val);
    };
  };

  return {
    restrict: 'A',
    scope: {
      val: '=ngModel',
      tags: '=selectTwo',
      show: '=selectTwoShow'
    },
    link: link
  };
}]);

(function(angular) {
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

  app.run(function($rootScope, $location, analytics) {
    $rootScope.loggedIn = localStorage.getItem('chrome-ext-delicious') ? true : false;

    if ($rootScope.loggedIn) {
      $location.path('/new');
    }

    $rootScope.$on('$routeChangeStart', function(e, next, current) {
      if (!$rootScope.loggedIn && next.controller !== 'LoginCtrl') {
        $location.path('/login');
      }
    });

    $rootScope.$on('$viewContentLoaded', function(e) {
      analytics.push(['_trackPageview', $location.path()]);
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
        var words = query.toLowerCase().split(' ');
        // Filter the links and return them
        return links.filter(function(link) {
          // Combine link properties to search into string
          var search = [
          link['description'],
          link['href'], ((link['shared'] === 'no') ? 'private' : ''),
          link['tags'].join(' '),
          link['time']].join(' ').toLowerCase();

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

  services.factory('delicious', function($http, $q, $rootScope, $location) {
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
      name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
      var regexS = '[\\?&]' + name + '=([^&#]*)',
        regex = new RegExp(regexS),
        results = regex.exec($location.$$absUrl);
      return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : '';
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
        defer.resolve({
          url: Delicious.getQueryStringByName('url'),
          title: Delicious.getQueryStringByName('title')
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

        function _parseLink(rawLink) {
          var link = {};

          // Remove '@' symbols from keys
          for (var key in rawLink) {
            var k = key.split('@')[1];
            link[k] = rawLink[key];
          }

          // domain root
          link['domain'] = link['href'].replace(/^(.*\/\/[^\/?#]*).*$/, '$1');
          link['private'] = (link.shared === 'no') ? true : false;

          link.tags = link.tag.split('  ');
          delete link.tag;

          return link;
        }
        
        if ( ! json.posts) {
          return [];
        } else if (angular.isArray(json.posts.post)) {
          return json.posts.post.map(_parseLink);
        } else {
          return [_parseLink(json.posts.post)];
        }
      }
    }());

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
      }
    }());

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
            var suggestedTag = {};

            // Remove '@' symbols from keys
            for (key in rawSuggestionTag) {
              var k = key.split('@')[1];
              suggestedTag[k] = rawSuggestionTag[key];
            }
            return suggestedTag.tag;
          });
        }
      }
    }());

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

        function _parseTag(rawTag) {
          var tag = {};

          // Remove '@' symbols from keys
          for (var key in rawTag) {
            var k = key.split('@')[1];
            tag[k] = rawTag[key];
          }
          return tag.tag;
        }

        if ( ! json.tags) {
          return [];
        } else if (angular.isArray(json.tags.tag)) {
          return json.tags.tag.map(_parseTag);
        } else {
          return [_parseTag(json.tags.tag)];
        }
      };
    }());

    Delicious.logout = function() {
      localStorage.clear();
    };

    Delicious.setting = (function() {
      var prefix = 'chrome-ext-delicious-setting-',
        defaults = {
          'share': false,
          'order': 'time',
          'reverse': true
        };

      function getSetting(key) {
        var setting = localStorage.getItem(prefix + key),
          defaultSetting = defaults[key];

        return setting ? JSON.parse(setting) : defaultSetting;
      }

      function setSetting(key, value) {
        return localStorage.setItem(prefix + key, JSON.stringify(value));
      }

      return function setting(key, value) {
        return angular.isUndefined(value) ? getSetting(key) : setSetting(key, value);
      }
    }());

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

  services.factory('analytics', function($window) {
    $window._gaq.push(['_setAccount', 'UA-38039307-2']);
    return $window._gaq;
  });


  // Controllers
  var controllers = angular.module('yum.controllers', []);

  controllers.controller('AppCtrl', function($scope, $rootScope, $location, delicious) {
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
      $rootScope.loggedIn = false;
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

  controllers.controller('NewLinkCtrl', function($scope, $location, tab, delicious, analytics) {
    $scope.url = tab.url;
    $scope.description = tab.title;
    $scope.tags = [];
    $scope.myTags = [];
    $scope.suggestedTags = [];

    // Get presistant private checkmark
    $scope.share = delicious.setting('share');

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
        analytics.push(['_trackEvent', 'link-added', 'action']);
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

    $scope.$watch('share', function(value) {
      // Set presistant private checkmark
      delicious.setting('share', value);
    });
  });

  controllers.controller('BookmarksCtrl', function($scope, $timeout, $filter, delicious, analytics) {
    $scope.links = [];
    $scope.linksLength = 0;
    $scope.myTags = [];
    $scope.query = '';
    $scope.order = delicious.setting('order');
    $scope.reverse = delicious.setting('reverse');

    $scope.confirmRemove = function(link) {
      link.confirmRemoval = true;
    };

    $scope.cancelRemove = function(link) {
      link.confirmRemoval = false;
    };

    $scope.confirmUpdate = function(link) {
      link.confirmUpdate = true;
      link.clean = angular.copy(link);
      analytics.push(['_trackEvent', 'link-btn-edit', 'clicked']);
    };

    $scope.cancelUpdate = function(link) {
      angular.copy(link.clean, link);
      link.confirmUpdate = false;
    };

    $scope.update = function(link) {
      link.confirmUpdate = false;

      delicious.addLink({
        url: link.href,
        description: link.description,
        shared: ((link['private']) ? 'no' : 'yes'),
        tags: link.tags.join(', '),
        replace: 'yes'
      }).then(function() {
        $scope.getAllMyTags();
        analytics.push(['_trackEvent', 'link-updated', 'action']);
      });
    };

    $scope.remove = function(link) {
      var index = $scope.links.indexOf(link);
      $scope.links.splice(index, 1);
      $scope.setLinksLength();

      delicious.removeLink(link).then(null, function() {
        $scope.links.splice(index, 0, link);
        $scope.setLinksLength();
        analytics.push(['_trackEvent', 'link-removed', 'action']);
      });
    };

    $scope.isPrivate = function(link) {
      return link['private'];
    };

    $scope.appendQuery = function(word) {
      var query = $scope.query ? ($scope.query + ' ' + word) : word;
      $scope.query = query.trim();
    };

    $scope.getAllMyTags = function() {
      delicious.getAllMyTags().then(function(myTags) {
        $scope.myTags = myTags;
      });
    };

    $scope.setLinksLength = function() {
      $scope.linksLength = $filter('filterByWord')($scope.links, $scope.query).length;
    };

    delicious.getLinks().then(function(links) {
      $scope.links = angular.extend(links, {
        confirmUpdate: false,
        confirmRemoval: false
      });
    });

    $scope.getAllMyTags();

    $scope.$watch('query', $scope.setLinksLength);
    $scope.$watch('links', $scope.setLinksLength);

    $scope.$watch('order', function(value) {
      delicious.setting('order', value);
    });

    $scope.$watch('reverse', function(value) {
      delicious.setting('reverse', value);
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
      }
    }

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

  directives.directive('customCheckbox', [function() {
    function link(scope, element, attrs) {
      var className = attrs['customCheckbox'], $wrapper;

      element.wrap('<div class="' + className +'" />');
      $wrapper = element.parent();

      $wrapper.on('click', function(e) {
        scope.$apply(function() {
          scope[attrs['ngModel']] = !scope[attrs['ngModel']];
        });
      });

      scope.$watch(attrs['ngModel'], function(value) {
        $wrapper.toggleClass(className + '-checked', value);
      });
    }

    return {
      restrict: 'A',
      link: link
    };
  }]);

}(angular));

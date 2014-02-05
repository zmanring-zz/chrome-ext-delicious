/* global describe, it */

(function () {
  'use strict';

  describe('controllers', function () {
    var scope, controller;

    beforeEach(function () {
      module('yum.controllers')

      inject(function ($rootScope, $controller, $injector) {

        scope = $rootScope.$new();
        controller = $controller("AppCtrl", {
          $scope: scope
        });

      });

    });

    describe('AppCtrl', function () {

      it('should be awesome', function () {
        // inject(function ($scope) {
        // console.log($scope);
        controller.load(function () {
          var obj = {
            "path": "/new",
            "text": "Add link"
          }
          scope.isSelected(obj).should.equal('/new');
        });

        // });
      });

      // it('isSelected', inject(function ($scope) {

      //   var obj = {
      //     "path": "/new",
      //     "text": "Add link"
      //   }
      //   $scope.isSelected(obj).should.equal('/new');

      // }));

      // describe('BookmarksCtrl', function () {

      //   it('should be awesome', function () {
      //     'awesome'.should.equal('awesome');
      //   });

      // });

      // describe('LoginCtrl', function () {

      //   it('should be awesome', function () {
      //     'awesome'.should.equal('awesome');
      //   });

      // });

      // describe('NewLinkCtrl', function () {

      //   it('should be awesome', function () {
      //     'awesome'.should.equal('awesome');
      //   });

    });
  });

})();

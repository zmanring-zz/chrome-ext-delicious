'use strict'

# Directives
directives = angular.module('yum.directives', [])
directives.directive 'appVersion', ['version', (version) ->
  (scope, elm, attrs) ->
    elm.text version
]

# TODO: Make select-two-show optional
directives.directive 'selectTwo', [->
  link = (scope, element, attrs, a) ->
    initSelectTwo = ->
      return  unless scope.show
      select.select2
        tags: scope.tags
        tokenSeparators: [',']

      select.select2 'val', scope.val
    select = angular.element(element)
    scope.$watch 'show', ->
      initSelectTwo()  if scope.tags.length > 0

    scope.$watch 'tags', ->
      initSelectTwo()  if scope.tags.length > 0

    scope.$watch 'val', (newVal) ->
      select.select2 'val', newVal

    select.bind 'change', (e) ->
      scope.$apply ->
        scope.val = e.val

  restrict: 'A'
  scope:
    val: '=ngModel'
    tags: '=selectTwo'
    show: '=selectTwoShow'

  link: link
]
directives.directive 'customCheckbox', [->
  link = (scope, element, attrs) ->
    className = attrs['customCheckbox']
    $wrapper = undefined
    element.wrap '<div class="' + className + '" />'
    $wrapper = element.parent()
    $wrapper.on 'click', (e) ->
      scope.$apply ->
        scope[attrs['ngModel']] = not scope[attrs['ngModel']]


    scope.$watch attrs['ngModel'], (value) ->
      $wrapper.toggleClass className + '-checked', value

  restrict: 'A'
  link: link
]
directives.directive 'whenScrolled', ->
  (scope, elm, attr) ->
    raw = elm[0]
    elm.bind 'scroll', ->
      scope.$apply attr.whenScrolled  if raw.scrollTop + raw.offsetHeight >= raw.scrollHeight

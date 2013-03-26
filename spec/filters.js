'use strict';

describe('filters', function() {
  beforeEach(module('yum.filters'));

  describe('list', function() {
    describe('when array is empty', function() {
      it('should return an empty string', inject(function(listFilter) {
        expect(listFilter([])).toEqual('');
      }));
    });

    describe('when array contains one item', function() {
      it('should return correct results', inject(function(listFilter) {
        expect(listFilter(['foo'])).toEqual('foo');
      }));
    });

    describe('when array contains multiple items', function() {
      it('should return correct results', inject(function(listFilter) {
        expect(listFilter(['foo', 'bar'])).toEqual('foo, bar');
        expect(listFilter(['foo', 'bar', 'baz'])).toEqual('foo, bar, baz');
        expect(listFilter(['foo', 'bar baz'])).toEqual('foo, bar baz');
      }));
    });

    describe('when array contains multi-word items', function() {
      it('should return correct results', inject(function(listFilter) {
        expect(listFilter(['bar baz'])).toEqual('bar baz');
        expect(listFilter(['foo', 'bar baz'])).toEqual('foo, bar baz');
      }));
    });
  });

  describe('filterByWord', function() {
    var links = [
      {description: 'verde', tags: ['foo', 'bar', 'baz']},
      {description: 'carvers', tags: ['foo', 'bar', 'baz']},
      {description: 'chipotle', tags: ['foo']},
      {description: 'west egg', tags: ['bar', 'baz']}
    ];

    describe('query is empty', function() {
      var query = '';

      it('should return all links', inject(function(filterByWordFilter) {
        expect(filterByWordFilter(links, query)).toEqual(links);
      }));
    });

    describe('query contains a word not present in any links', function() {
      var query = 'pythagorean';

      it('should return no links', inject(function(filterByWordFilter) {
        expect(filterByWordFilter(links, query)).toEqual([]);
      }));
    });
    
    describe('query equals "foo"', function() {
      var query = 'foo',
        expected = [links[0], links[1], links[2]];

      it('should return correct results', inject(function(filterByWordFilter) {
        expect(filterByWordFilter(links, query)).toEqual(expected);
      }));
    });

    describe('query equals "foo bar"', function() {
      var query = 'foo bar',
        expected = [links[0], links[1]];

      it('should return correct results', inject(function(filterByWordFilter) {
        expect(filterByWordFilter(links, query)).toEqual(expected);
      }));
    });
  });
});

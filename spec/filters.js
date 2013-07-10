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
      {description: 'verde', href: 'http://verde-noms.com', tags: ['foo', 'bar', 'baz'], shared: 'yes', time: '03-2013'},
      {description: 'carvers', href: 'http://carvers-noms.com', tags: ['foo', 'bar', 'baz'], shared: 'no', time: '01-2011'},
      {description: 'chipotle', href: 'http://chipotles-noms.com', tags: ['foo'], shared: 'yes', time: '12-2012'},
      {description: 'west egg', href: 'http://west-eggs-noms.com', tags: ['bar', 'baz'], shared: 'no', time: '03-2013'}
    ];

    describe('query is empty', function() {
      var query = '',
        expected = links;

      it('should return all links', inject(function(filterByWordFilter) {
        expect(filterByWordFilter(links, query)).toEqual(expected);
      }));
    });

    describe('query contains a word not present in any links', function() {
      var query = 'pythagorean',
        expected = [];

      it('should return no links', inject(function(filterByWordFilter) {
        expect(filterByWordFilter(links, query)).toEqual(expected);
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

    describe('query equals "private"', function() {
      var query = 'private',
        expected = [links[1], links[3]];

      it('should return correct results', inject(function(filterByWordFilter) {
        expect(filterByWordFilter(links, query)).toEqual(expected);
      }));
    });

    describe('query equals "foo private"', function() {
      var query = 'foo private',
        expected = [links[1]];

      it('should return correct results', inject(function(filterByWordFilter) {
        expect(filterByWordFilter(links, query)).toEqual(expected);
      }));
    });

    describe('query equals "03-2013"', function() {
      var query = '03-2013',
        expected = [links[0], links[3]];

      it('should return correct results', inject(function(filterByWordFilter) {
        expect(filterByWordFilter(links, query)).toEqual(expected);
      }));
    });

    describe('query equals "foo 03-2013"', function() {
      var query = 'foo 03-2013',
        expected = [links[0]];

      it('should return correct results', inject(function(filterByWordFilter) {
        expect(filterByWordFilter(links, query)).toEqual(expected);
      }));
    });

    describe('query equals "foo private 12-2012"', function() {
      var query = 'foo private 12-2012',
        expected = [];

      it('should return correct results', inject(function(filterByWordFilter) {
        expect(filterByWordFilter(links, query)).toEqual(expected);
      }));
    });
  });
});

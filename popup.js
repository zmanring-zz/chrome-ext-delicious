// Copyright 2013 Zach Manring

// UPDATE
// https://api.del.icio.us/v1/posts/update — Check to see when a user last posted an item

// POSTS
// https://api.del.icio.us/v1/posts/add? — add a new bookmark
// https://api.del.icio.us/v1/posts/all? — fetch all bookmarks by date or index range
// https://api.del.icio.us/v1/posts/all?hashes — fetch a change detection manifest of all items
// https://api.del.icio.us/v1/posts/dates? — list dates on which bookmarks were posted
// https://api.del.icio.us/v1/posts/delete? — delete an existing bookmark
// https://api.del.icio.us/v1/posts/get? — get bookmark for a single date, or fetch specific items
// https://api.del.icio.us/v1/posts/recent? — fetch recent bookmarks
// https://api.del.icio.us/v1/posts/suggest — fetch popular, recommended and network tags for a specific url

// TAGS
// https://api.del.icio.us/v1/tags/delete? — delete a tag from all posts
// https://api.del.icio.us/v1/tags/get — fetch all tags
// https://api.del.icio.us/v1/tags/rename? — rename a tag on all posts

// TAG BUNDLES
// https://api.del.icio.us/v1/tags/bundles/all? — fetch tag bundles
// https://api.del.icio.us/v1/tags/bundles/set? — assign a set of tags to a

//Globals
DELICIOUS = {};
DELICIOUS.runtime = {};
DELICIOUS.runtime.title = '';

// custom css expression for a case-insensitive contains()
jQuery.expr[':'].Contains = function(a,i,m){
    return (a.textContent || a.innerText || '').toUpperCase().indexOf( m[3].toUpperCase() ) >= 0;
};

//Functions
DELICIOUS.addLink = function() {

  DELICIOUS.getURL().then(function(myUrl) {

    var options = {
      url: 'https://api.del.icio.us/v1/posts/add',
      data: {
        url: myUrl,
        description: $('#description').val(),
        shared: (localStorage.getItem('chrome-ext-delicious-private') === 'true') ? 'no' : 'yes',
        tags: $('section#addToDelicious #tag').val()
      },
      hash: localStorage.getItem('chrome-ext-delicious')
    };

    DELICIOUS.api(options, function(data) {

      var result = $(data).find('result').attr('code');

      $('p.log span').html(result);
      $('p.log').show();
      $('header > div').fadeIn().delay(3000).fadeOut();

      $('button.addLink').attr('disabled', 'disabled');
      $('button.viewLinks').trigger('click');

    });

  });

};

DELICIOUS.api = function(options, callbackSuccess, callbackFailure) {

  $.ajax({
    type: options.type || 'POST',
    url: options.url,
    data: options.data || {},
    headers: { 'Authorization' : 'Basic ' + options.hash},
    success: function(data) {
      if (typeof callbackSuccess === 'function') {
        callbackSuccess(data);
      }
    },
    error: function(xhr, type){
      if (typeof callbackFailure === 'function') {
        callbackFailure(xhr, type);
      }
    }

  });
};

DELICIOUS.authenticate = function(username, password) {

  if(username !== '' && password !== '') {
    var hash = btoa(username + ":" + password);

    var options = {
      type: 'GET',
      url: 'https://api.del.icio.us/v1/posts/update',
      hash: hash
    };

    DELICIOUS.api(options, function(data) {
      //TODO: Cleanup
      localStorage.setItem('chrome-ext-delicious', hash);
      $('p.error').html('').hide();
      $('section#content').show();
      $('section#login img.loading').hide();
      $('section#login').hide();

      DELICIOUS.doesTagExist();

    }, function() {
      $('section#login button').removeAttr('disabled');
      $('header > div').show();
      $('p.error').html('Incorrect username or password.').show();
      $('section#login img.loading').hide();

    });

  } else {
    $('header > div').show();
    $('p.error').html('Please provide a username and password').show();
    $('section#login button').removeAttr('disabled');
    $('section#login img.loading').hide();
  }
};

DELICIOUS.getCurrentTabUrlAndUpdateValue = function() {

  DELICIOUS.getTitle().done(function(title) {

    $('section#addToDelicious #description').val(title);
    DELICIOUS.getSuggestedTags();

  });

};

DELICIOUS.doesTagExist = function() {

  DELICIOUS.getURL().done(function(myUrl) {

    var options = {
      type: 'GET',
      url: 'https://api.del.icio.us/v1/posts/get',
      data: {
        url: myUrl
      },
      hash: localStorage.getItem('chrome-ext-delicious')
    };

    DELICIOUS.api(options, function(data) {
      var json = xml.xmlToJSON(data);

      if (typeof json.posts === 'object') {
        $('p.log span').html('Item already exists');
        $('p.log').show();
        $('header > div').delay(500).fadeIn().delay(7000).fadeOut();

        $('button.addLink').attr('disabled', 'disabled');
        $('button.viewLinks').trigger('click');

      } else {

        DELICIOUS.getCurrentTabUrlAndUpdateValue();
        DELICIOUS.getAllMyTags();

      }

    });

  });

};

DELICIOUS.getListOfLinks = function() {

  var options = {
    type: 'GET',
    url: 'https://api.del.icio.us/v1/posts/all?',
    hash: localStorage.getItem('chrome-ext-delicious')
  };

  DELICIOUS.api(options, function(data) {
    var json = xml.xmlToJSON(data);
    var html = '';

    $.each(json, function(index, obj) {
      $('section#viewMyLinks > header > h1').html('<a target="_blank" href="https://delicious.com/' + obj['@user'] + '">@' + obj['@user'] + '</a><span>(' + obj['@total'] + ')</span>');

      $.each(obj.post, function(index, obj) {

        var tags = obj['@tag'].split('  ');

        html += '<li>';
        html += '<a class="link" href="' + obj['@href'] + '" target="_blank" title="' + obj['@href'] + '">' + obj['@description'] + '</a>';
        html += '<p class="tag">';

        for (var i = 0; i < tags.length; i++) {
          if (tags[i] !== '') {
            html += '<a class="link_tag" href="javascript:void(0)" title="Select to filter by `' + tags[i] + '`">' + tags[i] + '</a>';
          }
        }

        html += '</p>';
        html += '<a title="Delete this bookmark" class="delete" href="https://api.del.icio.us/v1/posts/delete?md5=' + obj['@hash'] + '">&times;</a>';
        html += '<div class="confirm">';
        html += '<button class="delete_confirm">Delete?</buton>';
        html += '</div>';
        html += '</li>';

      });

    });

    $('section#viewMyLinks ul.links').html(html);

    DELICIOUS.listFilter($("#search"), $("ul.links"));

  });
};

DELICIOUS.getAllMyTags = function() {

  var options = {
    type: 'GET',
    url: 'https://api.del.icio.us/v1/tags/get',
    hash: localStorage.getItem('chrome-ext-delicious')
  };

  DELICIOUS.api(options, function(data) {

    function split( val ) {
      return val.split( /,\s*/ );
    }

    function extractLast( term ) {
      return split( term ).pop();
    }

    var json = xml.xmlToJSON(data);

    var list = [];

    $(json.tags.tag).each(function(index, obj) {
      if (obj['@tag'] !== '') {
        list.push(obj['@tag'] + ' (' + obj['@count'] + ')');
      }
    });

    $('#tag').autocomplete({
      autoFocus: true,
      source: function( request, response ) {
        response( $.ui.autocomplete.filter(
          list, extractLast( request.term ) ) );
      },
      focus: function() {
        return false;
      },
      select: function( event, ui ) {
        var terms = split( this.value ),
            splitCount = ui.item.value.split('(');
        terms.pop();
        terms.push(splitCount.slice(0, -1).join('(').toString().trim());
        terms.push('');
        this.value = terms.join(', ');
        return false;
      }

    });

  });
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

DELICIOUS.getURL = function() {

  var deferred = $.Deferred();

  if (chrome.tabs) {
    chrome.tabs.getSelected(null, function(tab) {
      deferred.resolve(tab.url);
    });
  } else {
    deferred.resolve(DELICIOUS.getQueryStringByName('url'));
  }

  return deferred.promise();

};

DELICIOUS.getTitle = function() {

  var deferred = $.Deferred();

  if (chrome.tabs) {
    chrome.tabs.getSelected(null, function(tab) {
      deferred.resolve(tab.title);
    });
  } else {
    deferred.resolve(DELICIOUS.getQueryStringByName('title'));
  }

  return deferred.promise();

};

DELICIOUS.getSuggestedTags = function() {

  DELICIOUS.getURL().then(function(myUrl) {

    var options = {
      type: 'GET',
      url: 'https://api.del.icio.us/v1/posts/suggest?url=' + myUrl,
      hash: localStorage.getItem('chrome-ext-delicious')
    };

    DELICIOUS.api(options, function(data) {

      var json = xml.xmlToJSON(data);

      if (json.suggest !== undefined) {
        var popularTags = [];

        $.each(json.suggest.popular, function(index, obj) {
          popularTags.push(obj['@tag']);
        });

        if (popularTags.length > 0) {
          $('section#addToDelicious > span.tags').html('Popular: <a class="tag" href="#">' + popularTags.join('</a> <a class="tag" href="#">') + '</a>');
        }

      } else {

        $('section#addToDelicious > span.tags').html('');

      }

    });

 });

};

DELICIOUS.init = function() {

  DELICIOUS.getTitle().done(function(title) {

    DELICIOUS.runtime.title = title;

    DELICIOUS.processLocalStorage();
    if (localStorage.getItem('chrome-ext-delicious') !== null) {

      DELICIOUS.doesTagExist();

    }

  });

};

DELICIOUS.listFilter = function(header, list) {

  var input = $('<input>').attr({'class':'filterinput','type':'search','placeholder':'Filter','results':'', 'title':'Try filtering by typing in multiple words. (Space delimited)'});
  $(header).append(input);

  $(input).on('change',  function () {
    var filter = $(this).val();
    if(filter) {
      var multiFilter = filter.split(' '),
          filteredList;

      $(list).find('a.link').parent().hide();

      for (var i = 0; i < multiFilter.length; i++) {

        if (filteredList) {

          filteredList.hide();
          $(filteredList).find('a.link:Contains(' + multiFilter[i].trim() + ')').parent().show();
          $(filteredList).find('p.tag:Contains(' + multiFilter[i].trim() + ')').parent().show();

        } else {

          $(list).find('a.link:Contains(' + multiFilter[i].trim() + ')').parent().show();
          $(list).find('p.tag:Contains(' + multiFilter[i].trim() + ')').parent().show();
        }

        filteredList = $('ul.links li:visible');

      }

    } else {
      $(list).find('li').slideDown();
    }

    //count
    $('section#viewMyLinks > header > h1 span').html('(' + $('ul.links li:not(:hidden)').length + ')');

    return false;
  });

  $(input).on('keyup',  function () {
    $(input).trigger('change');
  });

  $('nav ul li#search input').show().focus();

};

DELICIOUS.processLocalStorage = function() {

  // isPrivate?
  if (localStorage.getItem('chrome-ext-delicious-private') === 'true') {
    $('input#private').prop('checked', true);
  }

  // isHashAvailable?
  if(localStorage.getItem('chrome-ext-delicious')) {

    $('section#addToDelicious button').on('click', function() {
      $(this).attr("disabled", "disabled");
      $('section#addToDelicious img.loading').show();

      DELICIOUS.addLink();

    });

  } else {

    $('section#content').hide();
    $('section#login').show();

    $("section#login button").on('click', function() {
      $(this).attr("disabled", "disabled");
      $('section#login img.loading').show();

      DELICIOUS.authenticate($("#username").val(), $("#password").val());

    });

  }
};


$(function() {

  DELICIOUS.init();

  //Events
  $('input#private').on('change', function() {
    if ($(this).is(':checked')) {
      localStorage.setItem('chrome-ext-delicious-private', 'true');
    } else {
      localStorage.setItem('chrome-ext-delicious-private', 'false');
    }
  });

  $('button.close').on('click', function() {
    $(this).parent().hide();
  });

  $('section#content > nav button').on('click', function() {
    $('section#content > nav button').each(function() {
      $(this).removeClass('selected');
      $('#' + $(this).attr('name')).hide();
    });
    $(this).addClass('selected');
    $('#' + $(this).attr('name')).show();
  });

  $('section#content > nav button.viewLinks').on('click', function() {

    $('#addToDelicious > span > button').attr('disabled', 'disabled');

    if (DELICIOUS.runtime.getListOfLinks === undefined) {
      DELICIOUS.getListOfLinks();
      DELICIOUS.runtime.getListOfLinks = true;
    }

    $('nav ul li#search input').show().focus();


  });

  $('section#content > nav button.addLink').on('click', function() {
    $('#addToDelicious > span > button').removeAttr('disabled');
    $('nav ul li#search input').hide();
  });

  $('section#viewMyLinks').on('click', 'a.delete', function(e) {
    e.preventDefault();

    DELICIOUS.runtime.deleteUrl = $(this).attr('href');
    $(this).siblings('div.confirm').show();

  });

  $('section#viewMyLinks').on('click', 'div.confirm button', function() {

    var me = $(this);
    var options = {
      type: 'GET',
      url: DELICIOUS.runtime.deleteUrl,
      hash: localStorage.getItem('chrome-ext-delicious')
    };

    DELICIOUS.api(options, function() {
      me.parents('li').fadeOut('slow', function() {
        $(this).remove();
      });
    });
  });

  $('section#viewMyLinks').on('click', 'div.confirm', function(e) {
    if (!$(e.target).hasClass('delete_confirm')) {
      $(this).hide();
    }
  });

  $('section#addToDelicious').on('click', 'a.tag', function() {
    $('#tag').val($('#tag').val() + $(this).html() + ', ');
    $(this).remove();
    $('#tag').focus();
  });

  $("section#login, section#addToDelicious").keypress(function (e) {
    if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
      $('section > span > button').trigger('click');
      return false;
    }
  });

  $('section#viewMyLinks').on('click', '.link_tag', function() {
    $('input.filterinput').val($(this).html()).trigger('change');
  });

  $('section#content').on('click', 'input.filterinput', function() {
    $(this).trigger('change');
  });

});


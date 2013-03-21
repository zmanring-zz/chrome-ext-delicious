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

//Google analytics
var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-38039307-2']);
_gaq.push(['_trackPageview']);

(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();


//Globals
DELICIOUS = {};
DELICIOUS.runtime = {};
DELICIOUS.runtime.title = '';
DELICIOUS.runtime.bookmarkCount = 0;

// custom css expression for a case-insensitive contains()
$.expr[':'].Contains = function (a, i, m) {
    return (a.textContent || a.innerText || '').toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
};

//Functions
DELICIOUS.addLink = function (obj) {

  DELICIOUS.getURL().then(function (myUrl) {

    if (!obj) {
      obj = {};
      obj.url = myUrl;
      obj.description = $('section#addToDelicious #description').val();
      obj.isShared = (localStorage.getItem('chrome-ext-delicious-private') === 'true') ? 'no' : 'yes';
      obj.tags = $('section#addToDelicious #tag').val();
    }

    // Takes care of crazy spacing and tags with no words
    var tagsArray = [];
    $.each(obj.tags.split(','), function (index, prop) {

      var newProp = prop.trim();

      if (newProp !== '') {
        tagsArray.push(newProp);
      }

    });

    var options = {
      url: 'https://api.del.icio.us/v1/posts/add',
      data: {
        url: obj.url, //Required
        description: obj.description, //Required
        // extended: '', //Additional notes
        shared: obj.isShared,
        replace: 'yes',
        tags: tagsArray.join(', ')
      },
      hash: localStorage.getItem('chrome-ext-delicious')
    };

    DELICIOUS.api(options, function (data) {

      var result = $(data).find('result').attr('code');
      DELICIOUS.runtime.getListOfLinks = false;

      $('p.log span').html(result);
      $('p.log').show();
      $('header > div').fadeIn().delay(3000).fadeOut();

      $('button.addLink').attr('disabled', 'disabled');
      $('button.viewLinks').trigger('click');

    });

  });
};

DELICIOUS.api = function (options, callbackSuccess, callbackFailure) {

  $.ajax({
    type: options.type || 'POST',
    url: options.url,
    data: options.data || {},
    headers: { 'Authorization' : 'Basic ' + options.hash},
    success: function (data) {
      if (typeof callbackSuccess === 'function') {
        callbackSuccess(data);
      }
    },
    error: function (xhr, type){
      if (typeof callbackFailure === 'function') {
        callbackFailure(xhr, type);
      }
    }

  });
};

DELICIOUS.authenticate = function (username, password) {

  if(username !== '' && password !== '') {
    var hash = btoa(username + ":" + password);

    var options = {
      type: 'GET',
      url: 'https://api.del.icio.us/v1/posts/update',
      hash: hash
    };

    DELICIOUS.api(options, function (data) {
      //TODO: Cleanup
      localStorage.setItem('chrome-ext-delicious', hash);
      $('p.error').html('').hide();
      $('section#content').show();
      $('section#login img.loading').hide();
      $('section#login').hide();

      DELICIOUS.doesTagExist();

    }, function () {
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

DELICIOUS.getCurrentTabUrlAndUpdateValue = function () {

  DELICIOUS.getTitle().done(function (title) {

    $('section#addToDelicious #description').val(title);
    DELICIOUS.getSuggestedTags();

  });
};

DELICIOUS.doesTagExist = function () {

  DELICIOUS.getURL().done(function (myUrl) {

    var options = {
      type: 'GET',
      url: 'https://api.del.icio.us/v1/posts/get',
      data: {
        url: myUrl
      },
      hash: localStorage.getItem('chrome-ext-delicious')
    };

    DELICIOUS.api(options, function (data) {
      var json = xml.xmlToJSON(data);

      if (typeof json.posts === 'object') {
        $('p.log span').html('Item already exists');

        $('input.filterinput').val(json.posts.post['@description']).trigger('change');

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

DELICIOUS.getListOfLinks = function () {

  var options = {
    type: 'GET',
    url: 'https://api.del.icio.us/v1/posts/all?',
    hash: localStorage.getItem('chrome-ext-delicious')
  };

  function getRootUrl (url) {
    return url.toString().replace(/^(.*\/\/[^\/?#]*).*$/,"$1").split('/')[2];
  }

  DELICIOUS.api(options, function (data) {
    var json = xml.xmlToJSON(data),
      html = '';

    DELICIOUS.runtime.listOfLinks = json;

    if (json.posts) {

      $.each(json, function (index, obj) {

        $('section#viewMyLinks > header > h1').html('<a title="Link to your Delicious page" target="_blank" href="https://delicious.com/' + obj['@user'] + '">@' + obj['@user'] + '</a><span>(' + obj['@total'] + ')</span>');
        DELICIOUS.runtime.bookmarkCount = obj['@total'];

        if (!obj.post.length) {
          var temp = [];
          temp.push(obj.post);
          obj.post = temp;
        }

        $.each(obj.post, function (index, obj) {

          var tags = obj['@tag'].split('  '),
            rootUrl = getRootUrl(obj['@href']),
            linkDate = new Date(obj['@time']),
            parsedLinkDate = linkDate.getFullYear() + '-' + ('0' + (linkDate.getMonth() + 1)).slice(-2);

          html += '<li data-index="' + index + '" ' + ((obj['@private'] === 'yes') ? 'title="private" class="private"' : '') + '>';

          html += '<section class="display">';
          html += '<a class="link" href="' + obj['@href'] + '" target="_blank" title="' + obj['@href'] + '"><img class="favicon" style="height:16px; width: 16px" src=http://www.google.com/s2/u/0/favicons?domain=' + rootUrl + ' />' + obj['@description'] + '</a>';
          html += '<p class="tag">';

          html += '<a class="link_tag" href="javascript:void(0)" title="Select to filter by `' + parsedLinkDate + '`">' + parsedLinkDate + '</a>';
          html += ((obj['@private'] === 'yes') ? '<a class="link_tag" href="javascript:void(0)" title="Select to filter by `private`">private</a>' : '');
          html += '<span class="seperator">|</span>';

          for (var i = 0; i < tags.length; i++) {
            if (tags[i] !== '') {
              html += '<a class="link_tag" href="javascript:void(0)" title="Select to filter by `' + tags[i] + '`">' + tags[i] + '</a>';
            }
          }

          // html += ((obj['@private'] === 'yes') ? '<a class="link_tag" href="javascript:void(0)" title="Select to filter by `private`">private</a>' : '');

          html += '</p>';
          html += '<a title="Edit this bookmark" class="edit" id="editBookmark"></a>';
          html += '</section>';

          html += '<section class="editor" style="display:none;">';
          // html += '<input type="text" name="url" id="url" placeholder="url" title="Edit url" tabindex="1" value="' + obj['@href'] + '"/>';
          html += '<input type="text" name="description" class="description" placeholder="Description" title="Edit description" tabindex="2" value="' + obj['@description'] + '"/>';
          html += '<input type="text" name="tag" class="tag" placeholder="Tag, Tag" title="Edit tags (Comma delimited)" tabindex="3" value="' + tags.join(', ') + '"/>';
          html += '<fieldset class="buttons">';
          html += '<span><input tabindex="4" id="editor_private" class="private" type="checkbox" name="private" value="private" ' + ((obj['@private'] === 'yes') ? 'checked' : '') + ' /><label for="editor_private">Private?</label></span>';
          html += '<button tabindex="7" class="delete">Remove</button>';
          html += '<button tabindex="6" class="cancel">Cancel</button>';
          html += '<button tabindex="5" class="submit">Change</button>';
          html += '</fieldset>';
          html += '</section>';

          html += '<div class="confirm">';
          html += '<button data-url="https://api.del.icio.us/v1/posts/delete?md5=' + obj['@hash'] + '" class="delete_confirm">Remove link?</button>';
          html += '</div>';

          html += '</li>';

        });

      });

      $('section#viewMyLinks ul.links').html(html);
      $('input.filterinput').trigger('change');

      DELICIOUS.listFilter();
      // DELICIOUS.getAllMyTags();

    } else {
      $('section#viewMyLinks > header > h1').html(json.result["@code"]);
      $('section#viewMyLinks ul').remove();
    }

  });
};

DELICIOUS.getAllMyTags = function () {

  var options = {
    type: 'GET',
    url: 'https://api.del.icio.us/v1/tags/get',
    hash: localStorage.getItem('chrome-ext-delicious')
  };

  DELICIOUS.api(options, function (data) {

    function split( val ) {
      return val.split( /,\s*/ );
    }

    function extractLast( term ) {
      return split(term).pop();
    }

    var json = xml.xmlToJSON(data),
        list = [];

    if (json.tags) {

      $(json.tags.tag).each(function (index, obj) {
        if (obj['@tag'] !== '') {
          list.push(obj['@tag'] + ' (' + obj['@count'] + ')');
        }
      });

      DELICIOUS.runtime.myTags = list;

      $('#tag, .tag').autocomplete({
        autoFocus: true,
        source: function (request, response) {
          response( $.ui.autocomplete.filter(
            list, extractLast( request.term ) ) );
        },
        focus: function() {
          return false;
        },
        select: function(event, ui) {
          var terms = split( this.value ),
              splitCount = ui.item.value.split('(');
          terms.pop();
          terms.push(splitCount.slice(0, -1).join('(').toString().trim());
          terms.push('');
          this.value = terms.join(', ');
          return false;
        }

      });

    }

  });
};

DELICIOUS.getQueryStringByName = function (name) {

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

DELICIOUS.getURL = function () {

  var deferred = $.Deferred();

  if (chrome.tabs) {
    chrome.tabs.getSelected(null, function (tab) {
      deferred.resolve(tab.url);
    });
  } else {
    deferred.resolve(DELICIOUS.getQueryStringByName('url'));
  }

  return deferred.promise();
};

DELICIOUS.getTitle = function () {

  var deferred = $.Deferred();

  if (chrome.tabs) {
    chrome.tabs.getSelected(null, function (tab) {
      deferred.resolve(tab.title);
    });
  } else {
    deferred.resolve(DELICIOUS.getQueryStringByName('title'));
  }

  return deferred.promise();
};

DELICIOUS.getSuggestedTags = function () {

  DELICIOUS.getURL().then(function (myUrl) {

    var options = {
      type: 'GET',
      url: 'https://api.del.icio.us/v1/posts/suggest?url=' + myUrl,
      hash: localStorage.getItem('chrome-ext-delicious')
    };

    DELICIOUS.api(options, function (data) {

      var json = xml.xmlToJSON(data);

      if (json.suggest !== undefined) {
        var popularTags = [];

        $.each(json.suggest.popular, function (index, obj) {
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

DELICIOUS.init = function () {

  DELICIOUS.getTitle().done(function (title) {

    DELICIOUS.runtime.title = title;

    DELICIOUS.processLocalStorage();
    if (localStorage.getItem('chrome-ext-delicious') !== null) {

      DELICIOUS.doesTagExist();
      DELICIOUS.setVersionFooter();

    }

  });
};

DELICIOUS.listFilter = function () {

  $('#search input').css('display', 'inline-block').focus();
};

DELICIOUS.processLocalStorage = function () {

  // isPrivate?
  if (localStorage.getItem('chrome-ext-delicious-private') === 'true') {
    $('input#private').prop('checked', true);
  }

  // isHashAvailable?
  if(localStorage.getItem('chrome-ext-delicious')) {

    $('section#addToDelicious button').on('click', function (e) {
      $(this).attr("disabled", "disabled");
      $('section#addToDelicious img.loading').show();

      DELICIOUS.addLink();

      _gaq.push(['_trackEvent', e.target.id, 'clicked']);

    });

  } else {

    $('section#content').hide();
    $('section#login').show();

    $("section#login button").on('click', function () {
      $(this).attr("disabled", "disabled");
      $('section#login img.loading').show();

      DELICIOUS.authenticate($("#username").val(), $("#password").val());

    });

  }
};

DELICIOUS.setVersionFooter = function () {

  var manifest = chrome.runtime.getManifest();
  $('#viewMyLinks footer p.version').html(manifest.name + ' ' + manifest.version);
};

$(function () {

  DELICIOUS.init();

  //Events
  $('input#private').on('change', function () {
    if ($(this).is(':checked')) {
      localStorage.setItem('chrome-ext-delicious-private', 'true');
    } else {
      localStorage.setItem('chrome-ext-delicious-private', 'false');
    }
  });

  $('button.close').on('click', function () {
    $(this).parent().hide();
  });

  $('section#content > nav button').on('click', function (e) {
    $('section#content > nav button').each(function () {
      $(this).removeClass('selected');
      $('#' + $(this).attr('name')).hide();
    });
    $(this).addClass('selected');
    $('#' + $(this).attr('name')).show();

    _gaq.push(['_trackEvent', e.target.id, 'clicked']);
  });

  $('section#content > nav button.viewLinks').on('click', function (e) {

    $('#addToDelicious > span > button').attr('disabled', 'disabled');

    if (DELICIOUS.runtime.getListOfLinks === undefined || DELICIOUS.runtime.getListOfLinks === false) {
      DELICIOUS.getListOfLinks();
      DELICIOUS.runtime.getListOfLinks = true;
    }

    $('nav ul li#search input').show().focus();
  });

  $('section#content > nav button.addLink').on('click', function () {
    $('#addToDelicious > span > button').removeAttr('disabled');
    $('nav ul li#search input').hide();
  });

  $('section#viewMyLinks').on('click', 'a.edit', function (e) {
    e.preventDefault();

    // hide all before showing next
    $('section.editor').hide();
    $('section.display').show().parent('li').removeClass('editor');

    var parent = $(this).parent('section');
    parent.parent('li').addClass('editor');

    parent.hide();
    parent.siblings('section.editor').fadeIn();

    _gaq.push(['_trackEvent', e.target.id, 'clicked']);
  });

  $('section#viewMyLinks').on('click', 'button.delete', function () {

    $(this).parents('section.editor').siblings('div.confirm').show();
  });

  $('section#viewMyLinks').on('click', 'button.delete_confirm', function () {

    var me = $(this);
    me.attr('disabled', 'disabled');

    var options = {
      type: 'GET',
      url: $(this).data('url'),
      hash: localStorage.getItem('chrome-ext-delicious')
    };

    DELICIOUS.api(options, function () {
      me.parents('li').fadeOut('slow', function () {
        $(this).remove();
        DELICIOUS.runtime.bookmarkCount -= 1;
        $('section#viewMyLinks > header > h1 > span').html('(' + DELICIOUS.runtime.bookmarkCount + ')');

      });
    });
  });

  $('section#viewMyLinks').on('click', 'button.cancel', function () {

    var index = $(this).parents('li').data('index'),
      linkObj = DELICIOUS.runtime.listOfLinks.posts.post[index],
      parent = $(this).parents('section.editor');

      parent.hide();
      parent.siblings('section.display').show();
      parent.parent('li').removeClass('editor');

      if (linkObj['@private'] === 'yes') {
        parent.parent('li').addClass('private');
      }
  });

  $('section#viewMyLinks').on('click', 'button.submit', function () {

    $(this).attr('disabled', 'disabled');

    var index = $(this).parents('li').data('index'),
      linkObj = DELICIOUS.runtime.listOfLinks.posts.post[index],
      obj = {},
      parent = $(this).parents('li');

      obj.url = linkObj['@href'];
      obj.description = $(parent).find('section.editor input.description').val();
      obj.tags = $(parent).find('section.editor input.tag').val();
      obj.isShared = ($(parent).find('section.editor input.private:checked').val() !== undefined) ? 'no' : 'yes';

      DELICIOUS.addLink(obj);
  });

  $('section#addToDelicious').on('click', 'a.tag', function () {
    $('#tag').val($('#tag').val() + $(this).html() + ', ');
    $(this).remove();
    $('#tag').focus();
    if ($('span.tags a.tag').length === 0) {
      $('span.tags').remove();
    }
  });

  $('section#viewMyLinks').on('click', 'div.confirm', function () {
    $(this).fadeOut();
  });

  $("section#login, section#addToDelicious").keypress(function (e) {
    if ((e.which && e.which == 13) || (e.keyCode && e.keyCode == 13)) {
      $('section > span > button').trigger('click');
      return false;
    }
  });

  $('section#viewMyLinks').on('click', '.link_tag', function () {
    $('input.filterinput').val($(this).html()).trigger('change');
  });

  $('section#content').on('click', 'input.filterinput', function () {
    $(this).trigger('change');
  });

  $('input.filterinput').on('change', function () {

    var filter = $(this).val();
    if(filter) {
      var multiFilter = filter.split(' '),
          filteredList;

      $("ul.links").find('a.link').parents('li').hide();

      for (var i = 0; i < multiFilter.length; i++) {

        if (filteredList) {

          filteredList.hide();
          $(filteredList).find('a.link:Contains(' + multiFilter[i].trim() + ')').parents('li').show();
          $(filteredList).find('p.tag:Contains(' + multiFilter[i].trim() + ')').parents('li').show();

        } else {

          $("ul.links").find('a.link:Contains(' + multiFilter[i].trim() + ')').parents('li').show();
          $("ul.links").find('p.tag:Contains(' + multiFilter[i].trim() + ')').parents('li').show();
        }

        filteredList = $('ul.links li:visible');

      }

    } else {
      $("ul.links").find('li').show();
    }

    //count
    var count = $('ul.links li:not(:hidden)').length;
    $('section#viewMyLinks > header > h1 span').html('(' + count + ')');
    DELICIOUS.runtime.bookmarkCount = count;
  });

  $('input.filterinput').on('keyup',  function () {
    $('input.filterinput').trigger('change');
  });

  $('section#viewMyLinks footer span a').on('click', function (e) {
    _gaq.push(['_trackEvent', e.currentTarget.id, 'clicked']);
  });

});

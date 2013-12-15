/*!
 * (c) 2012 - 2013 Paul Vorbach.
 *
 * MIT License (http://vorba.ch/license/mit.html)
 */

// Object.keys polyfill
// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = (function () {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function (obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

function getURLParam(name) {
  var match = new RegExp(name + '=' + '(.*?)(&|$)')
      .exec(location.search);
  if (match === null)
    return null;

  return match[1];
}

function chart(id, type, title, data, xAxisType, cats) {
  return new Highcharts.Chart({
    chart: {
      renderTo: id,
      zoomType: 'x',
      type: type
    },
    title: {
      text: title,
      style: {
        color: '#000000'
      }
    },
    subtitle: {
      text: typeof document.ontouchstart == 'undefined' ?
        'Click and drag in the plot to zoom in' :
        'Drag your finger over the plot to zoom in',
      style: {
        color: '#000000'
      }
    },
    exporting: {
      enableImages: true
    },
    credits: {
      enabled: false
    },
    xAxis: (xAxisType == 'datetime' ? {
      type: xAxisType,
      maxZoom: 14 * 24 * 60 * 60 * 1000,
      lineColor: '#000000',
      title: {
        text: 'Date',
        style: {
          color: '#000000'
        }
      }
    } : {
      type: xAxisType,
      lineColor: '#000000',
      categories: cats,
      title: {
        text: 'Month',
        style: {
          color: '#000000'
        }
      }
    }),
    yAxis: {
      min: 0,
      startOnTick: false,
      showFirstLabel: false,
      title: {
        text: 'Downloads',
        style: {
          color: '#000000'
        }
      }
    },
    tooltip: {
      shared: true
    },
    legend: {
      enabled: false
    },
    plotOptions: {
      column: {
        borderWidth: 0,
        color: '#AA0000',
        pointPadding: 0,
        shadow: false
      },
      line: {
        color: '#AA0000',
        lineWidth: 1,
        marker: {
          radius: 2
        }
      }
    },
    series: [{
      name: 'Downloads',
      data: data
    }]
  });
}

var oneDay = 24 * 60 * 60 * 1000;

function totalDownloads(data) {
  var result = 0;
  for (var date in data) {
    result += data[date];
  }
  return result;
}

function sanitizeData(json) {
  var result = {};
  var data = json.rows;

  var date = null;
  for (var i = 0; i < data.length; i++) {
    date = data[i].key[1];
    result[date] = data[i].value;
  }

  return result;
}

function getDailyData(data) {
  var result = [];

  var keys = Object.keys(data).sort();
  for (var i = 0; i < keys.length; i++) {
    result.push([ new Date(keys[i]).getTime(), data[keys[i]] ]);
  }

  return result;
}

function getWeekOfDate(d) {
  var year = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - year) / 86400000) + year.getDay() + 1) / 7);
}

function getWeeklyData(dailyData) {
  var result = [];

  var lastWeek = getWeekOfDate(new Date(dailyData[0][0]));
  var weekTotal = 0;
  var record, date;

  for (var i in dailyData) {
    record = dailyData[i];
    date = new Date(record[0]);
    if (lastWeek != getWeekOfDate(date)) {
      result.push([ date.getTime(), weekTotal ]);
      weekTotal = record[1];
      lastWeek = getWeekOfDate(date);
    } else {
      weekTotal += record[1];
      if (i == dailyData.length - 1)
        result.push([ date.getTime(), weekTotal]);
    }
  }

  return result;
}

var months = [ 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec' ];

function getMonthlyData(dailyData) {
  var result = { categories: [], data: [] };

  var lastMonth = new Date(dailyData[0][0]).getMonth();
  var monthTotal = 0;
  var record, date;

  for (var i = 0; i < dailyData.length; i++) {
    record = dailyData[i];
    date = new Date(record[0]);
    if (lastMonth != date.getMonth()) {
      result.categories.push(months[date.getMonth()] + ' ' + date.getFullYear());
      result.data.push(monthTotal);
      monthTotal = record[1];
      lastMonth = date.getMonth();
    } else {
      monthTotal += record[1];
      if (i == dailyData.length - 1) {
        result.categories.push(months[date.getMonth() + 1] + ' ' + date.getFullYear());
        result.data.push(monthTotal);
      }
    }
  }

  return result;
}

function getPackageList(json) {
  var result = [];
  var len = json.rows.length;
  for (var i = 0; i < len; i++) {
    result.push(json.rows[i].key[1]);
  }
  return result;
}

function getData(url, callback) {
  $.ajax({
    url: url,
    dataType: 'jsonp',
    success: callback,
    error: function () {
      console.log('Could not receive statistical data.');
      $('#loading').html('An error occured. Please try to reload the page or '
        + 'contact me at <a href="mailto:paul@vorba.ch">paul@vorba.ch</a> if '
        + 'that doesn\'t help.');
    }
  });
}

function downloadsURL(pkg) {
  return 'http://isaacs.iriscouch.com/downloads/_design/app/_view/pkg?'
    + 'group_level=3&start_key=["'+pkg+'"]&end_key=["'+pkg+'",{}]';
}

function drawCharts(data) {
  var dailyData = getDailyData(data);
  chart('days', 'column', 'Downloads per day', dailyData, 'datetime');
  var weeklyData = getWeeklyData(dailyData);
  chart('weeks', 'column', 'Downloads per week', weeklyData, 'datetime');
  var monthlyData = getMonthlyData(dailyData);
  chart('months', 'column', 'Downloads per month', monthlyData.data,
    'linear', monthlyData.categories);
}

function showPackageStats(pkg) {
  $('h2').append(' for package "' + pkg + '"');
  $('#npm-stat input[type=search]').attr('value', pkg);
  $('#npm-stat-author').after('<p id="loading"></p><p><a '
    + 'href="https://npmjs.org/package/'
    + pkg + '">View package on npm</a></p>');

  $('#loading').html('<img src="loading.gif" />');

  var url = downloadsURL(pkg);

  getData(url, function (json) {
    var data = sanitizeData(json);
    $('h2').after('<p title="All downloads of package '
            + pkg + ' since Jun 24, 2012">Total number of downloads: '
      + totalDownloads(data) + '</p>');

    $('#loading').remove();

    drawCharts(data);
  });
}

function showAuthorStats(author) {
  $('h2').html('Downloads for author "' + author + '"');
  $('#npm-stat-author input[type=search]').attr('value', author);
  $('#npm-stat-author').after('<p id="loading"></p><p><a '
    + 'href="https://npmjs.org/~'
    + author + '">View author on npm</a></p>');

  $('#loading').html('<img src="loading.gif" />');

  var url = 'http://registry.npmjs.org/-/_view/browseAuthors?'
    +'group_level=3&start_key=["'+author+'"]&end_key=["'+author+'",{}]';

  getData(url, function (json) {
    var pkgs = getPackageList(json);
    var len = pkgs.length;
    var todo = len;

    var all = {};
    var totals = [];
    for (var i = 0; i < len; i++) {(function (pkg) {
      var url = downloadsURL(pkg);
      getData(url, function (json) {
        var sanitized = sanitizeData(json);

        for (var date in sanitized) {
          if (!all[date])
            all[date] = 0;

          all[date] += sanitized[date];
        }

        var total = totalDownloads(sanitized);
        totals.push({name: pkg, count: total});

        if (!--todo) {
          $('h2').after('<p title="All downloads of packages by author '
            + author + ' since Jun 24, 2012">Total number of downloads: '
            + totalDownloads(all) + '</p>');

          $('#loading').remove();

          totals = totals.sort(function(a,b) {
            return b.count - a.count;
          });

          $('#pkgs').append('<h3>Packages by '+author+'</h3><ul></ul>');
          for (var i = 0; i < totals.length; i++) {
            var t = totals[i];
            $('#pkgs ul').append('<li><a href="charts.html?package='
              + t.name + '" title="view detailed download statistics">'
              + t.name + '</a>, total downloads: '+t.count+'</li>');
          }

          drawCharts(all);
        }
      });
      })(pkgs[i]);
    }
  });
}

$(function() {
  var pkg;
  var author = getURLParam('author');
  if (author === null) {
    pkg = getURLParam('package');

    if (pkg === null || pkg === '')
      pkg = 'clone';

    showPackageStats(pkg);
  } else {
    if (author === '')
      author = 'pvorb';

    showAuthorStats(author);
  }
});
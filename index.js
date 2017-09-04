var express = require('express');
var mongoose = require('mongoose');
var app = express();
var async = require('async');

var entryModels = require('./schema/entry.js');
var Entry = entryModels.Entry;
var Location = entryModels.Location;

var url = 'mongodb://localhost/vitaDB';
mongoose.connect(url, { useMongoClient: true });  //TODO: Deprecation warning

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname));

// views is directory for all template files
// app.set('views', __dirname + '/views');
// app.set('view engine', 'ejs');

app.get('/test', function (request, response) {
  response.end(JSON.stringify('Simple web server of files from ' + __dirname));
});

// app.get('/dashboard', function (request, response) {

// });

app.get('/dashboard/summary', function (request, response) {
  console.log("Received dashboard summary request");
  var stats = {};
  // TODO: may break up into different queries when getting details. Or not
  async.parallel([
      function(parallel_done) {
        Entry.count({}, function(err, count) {
          if(err) return parallel_done(err);
          stats["numEntries"] = count;
          parallel_done();
        });
      },
      function(parallel_done) {
        var maxStreak = 1
        var curStreak = 1
        var lastDate = null
        Entry.find().sort({date: 1}).select("timestamp").cursor()
          .on('data', function(entry) {
            if(lastDate) {
              var diff = Math.ceil((entry.timestamp - lastDate) / (1000 * 3600 * 24));
              if(diff <= 2) {
                curStreak += 1;
              } else {
                if(curStreak > maxStreak) maxStreak = curStreak;
                curStreak = 1;
              }
            }
            lastDate = entry.timestamp;
          })
          .on('error', function(err) {
            return parallel_done(err);
          })
          .on('end', function() {
            stats.maxStreak = maxStreak;
            parallel_done();
          });
      },
      function(parallel_done) {
        var query = Entry.findOne().sort({length:-1}).limit(1)
        query.select("length").exec(function(err, entry) {
          if(err) return parallel_done(err);
          stats["longestLength"] = entry.length;
          parallel_done();
        });
      },
      function(parallel_done) {
        var pipeline = [
          { $group: { _id: null, sum: {$sum: "$length"}} },
          { $project: { _id: 0, sum: 1} }
        ];
        Entry.aggregate(
          pipeline, function(err, res) {
            console.log(res);
            stats["totalWords"] = res[0].sum;
            parallel_done();
          }
        );
      }
    ], function(err) {
    if(err) {
      console.error('Doing /dashboard/summary error: ', err);
      response.status(500).send(JSON.stringify(err));
    } else {
      response.end(JSON.stringify(stats));
    }
  });

});

app.get('/dashboard/entryLengths', function(request, response) {
  console.log("Received dashboard entry lengths request");
  Entry.find().select("timestamp length").exec(function(err, entries) {
    if(err) {
      console.error('Doing /dashboard/entryLengths error', err);
      response.status(500).send(JSON.stringify(err));
      return;
    } else {
      response.end(JSON.stringify(entries));
    }
  });
});

app.get('/dashboard/locationCounts', function(request, response) {
  console.log("Received location counts request");
  var cityCounts = [["Address", "Count"]]
  Entry.distinct("loc.city", function(err, distinctCities) {
    if(err) {
      console.error('Doing /dashboard/locationCounts error', err);
      response.status(500).send(JSON.stringify(err));
      return;
    }
    async.each(distinctCities, function(cityName, done_callback) {
      Entry.findOne({"loc.city" : cityName}).select("loc").exec(function(err, entry) {
        let locstr = entry.loc.city + ', ' + entry.loc.region + ', ' + entry.loc.country;
        Entry.count({"loc.city" : cityName}, function(err, count) {
          cityCounts.push([locstr, count]);
          done_callback(err);
        });               
      });


    }, function(err) {
      if(err) {
        console.error('Doing /dashboard/locationCounts error', err);
        response.status(500).send(JSON.stringify(err));
        return;        
      }
      response.end(JSON.stringify({"res" : cityCounts}));
    });  
  });
});


app.get('/dashboard/topWords', function(request, response) {
  console.log("Received topWords request");
  var counts = {};
  Entry.find().select("tokens").cursor()
    .on('data', function(entry) {
      let tokens = entry.tokens;
      for (var key in tokens) {
        if(key in counts) {
          counts[key] = counts[key] + tokens[key];
        } else {
          counts[key] = tokens[key]
        }
      }
    })
    .on('error', function(err) {
      console.error('Doing /dashboard/topWords error', err);
      response.status(500).send(JSON.stringify(err));
      return;             
    })
    .on('end', function() {
      counts.sort(function(a,b) {
          if (a < b) { return 1; }
          else if (a == b) { return 0; }
          else { return -1; }
      });
      console.log(counts);
    });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});



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
        Entry.find().sort({date: 1}).select("timestamp").stream()
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
  var cityCounts = {};
  Entry.distinct("loc.city", function(err, distinctCities) {
    if(err) {
      console.error('Doing /dashboard/entryLengths error', err);
      response.status(500).send(JSON.stringify(err));
      return;
    }
    async.each(distinctCities, function(cityName, done_callback) {
      Entry.findOne({"loc.city" : cityName}).select("loc").exec(function(err, entry) {
        let locstr = entry.loc.city + ', ' + entry.loc.region + ', ' + entry.loc.country;
        Entry.count({"loc.city" : cityName}, function(err, count) {
          cityCounts[locstr] = count;
          done_callback(err);
        });               
      });


    }, function(err) {
      if(err) {
        console.error('Doing /dashboard/entryLengths error', err);
        response.status(500).send(JSON.stringify(err));
        return;        
      }
      console.log(cityCounts);
      response.end(JSON.stringify(cityCounts));
      //TODO: Done stuff

    });  
  });
});

// views is directory for all template files
// app.set('views', __dirname + '/views');
// app.set('view engine', 'ejs');

// app.get('/', function(request, response) {
//   response.render('pages/index');
// });

// app.get('/times', function(request, response) {
//     var result = '';
//     var times = process.env.TIMES || 5;
//     for(i= 0; i < times; i++) {
//         result += i + ' ';
//     }
//     response.send(result);
// });

// app.get('/db', function(request, response) {
//   pg.connect(process.env.DATABASE_URL, function(err, client, done) {
//    client.query('SELECT * FROM test_table', function(err, result) {
//       done();
//       if(err) {
//         console.error(err);
//         response.send("Error " + err);
//       } else {
//         response.render('pages/db', {results: result.rows});
//       }
//      });
//   });
// });

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});



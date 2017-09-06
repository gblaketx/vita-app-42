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

let monthNames = {
  0 : "January",
  1 : "February",
  2 : "March",
  3 : "April",
  4 : "May",
  5 : "June",
  6 : "July",
  7 : "August",
  8 : "September",
  9 : "October",
  10: "November",
  11: "December"
}

function timestampToDate(timestamp) {
  let stamp = new Date(timestamp);
  return(monthNames[stamp.getMonth()] + ' ' + 
   stamp.getDate() + ', ' + stamp.getFullYear()); 
};

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
        var maxStreak = 1;
        var curStreak = 1;
        var lastDate = null;
        var streakStart = null;
        var curStreakStart = null;
        var streakEnd = null;
        Entry.find().sort({date: 1}).select("timestamp").cursor()
          .on('data', function(entry) {
            if(lastDate) {
              var diff = Math.ceil((entry.timestamp - lastDate) / (1000 * 3600 * 24));
              if(diff <= 2) {
                curStreak += 1;
              } else {
                if(curStreak > maxStreak)  {
                  streakStart = timestampToDate(curStreakStart);
                  streakEnd = timestampToDate(lastDate);
                  maxStreak = curStreak;
                }
                curStreak = 1;
                curStreakStart = entry.timestamp;
              }
            } else {
              curStreakStart = entry.timestamp;
            }
            lastDate = entry.timestamp;
          })
          .on('error', function(err) {
            return parallel_done(err);
          })
          .on('end', function() {
            stats.streak = {}
            stats.streak.numDays = maxStreak;
            stats.streak.start = streakStart;
            stats.streak.end = streakEnd;
            parallel_done();
          });
      },
      function(parallel_done) {
        var query = Entry.findOne().sort({length:-1}).limit(1)
        query.select("timestamp loc weather namedEntities length").exec(function(err, entry) {
          if(err) return parallel_done(err);
          stats["longestLength"] = entry.length;
          stats["longestEntry"] = entry;
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

app.get('/dashboard/sentiment', function(request, response) {
  console.log('Received dashboard/sentiment request');
  var counts = {"pos": 0, "neu": 0, "neg": 0};
  Entry.find().select("sentiment").cursor()
    .on('data', function(entry) {
      counts.pos += entry.sentiment.pos;
      counts.neu += entry.sentiment.neu;
      counts.neg += entry.sentiment.neg;
    })
    .on('err', function(err) {
      console.error('Doing /dashboard/sentiment error', err);
      response.status(500).send(JSON.stringify(err));
      return;
    })
    .on('end', function() {
      var res = {
        "labels": ["Positive", "Negative", "Neutral"], 
        "data": [counts.pos, counts.neg, counts.neu]
      };
      console.log(res);
      response.end(JSON.stringify(res));
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
      var dates = [];
      var data = [];
      for (var i = 0; i < entries.length; i++) {
        // var stamp = new Date(entries[i].timestamp); //TODO: way w/o date conversion?
        // var datestring = monthNames[stamp.getMonth()] + ' ' +  stamp.getDate() + ', ' + stamp.getFullYear(); 
        dates.push(timestampToDate(entries[i].timestamp));
        data.push(entries[i].length);
      }
      response.end(JSON.stringify({"dates": dates, "data": data}));
    }
  });
});

app.get('/dashboard/locationCounts', function(request, response) {
  console.log("Received location counts request");
  var cityCounts = [["Address", "Count"]];
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
  var counts = {"nouns" : {}, "adjectives": {}, "verbs": {}};
  Entry.find().select("wordCounts").cursor()
    .on('data', function(entry) {
      let tokens = entry.wordCounts;
      for (var key in tokens) {
        var pos = null;
        if(tokens[key]["pos"].match(/^NN.*/)) {
          pos = "nouns";
        } else if (tokens[key]["pos"].match(/^JJ.*/)) {
          pos = "adjectives";
        } else if (tokens[key]["pos"].match(/^V.*/)) {
          pos = "verbs"
        }

        if(pos) {
          if(key in counts[pos]) { // Count only nouns
            counts[pos][key]= counts[pos][key] + tokens[key]["count"];
          } else {
            counts[pos][key] = tokens[key]["count"];
          }
        }

      }
    })
    .on('error', function(err) {
      console.error('Doing /dashboard/topWords error', err);
      response.status(500).send(JSON.stringify(err));
      return;             
    })
    .on('end', function() {
      var res = {"nouns": [], "adjectives": [], "verbs": []};
      for(var dict in counts) {
        if(dict !== "nouns") {
          counts["nouns"]["i"] += counts[dict]["i"]; //TODO: see if this can be moved to Python
          delete counts[dict]["i"];
          if(dict == "verbs") {
            counts[dict]["is"] += counts[dict]["'s"];
            delete counts[dict]["'s"];
            counts[dict]["am"] += counts[dict]["'m"];
            delete counts[dict]["'m"];
          }
        }
        var props = [];
        for(key in counts[dict]) {
          props.push({word: key, count: counts[dict][key]});
        }
        props.sort(function(a,b) {
          return b.count - a.count;
        });

        res[dict] = props.slice(0, 10);    
      }
      response.end(JSON.stringify(res));
    });
});

app.get('/dashboard/tempTime', function(request, response) {
  console.log("Received dashboard temperature time request");
  Entry.find().select("timestamp weather").exec(function(err, entries) {
    if(err) {
      console.error('Doing /dashboard/tempTime error', err);
      response.status(500).send(JSON.stringify(err));
      return;
    } else {
      var dates = [];
      var data = [];
      for (var i = 0; i < entries.length; i++) {
        if(entries[i].weather.temp !== undefined) {
          // var stamp = new Date(entries[i].timestamp); //TODO: way w/o date conversion?
          // var datestring = monthNames[stamp.getMonth()] + ' ' +  stamp.getDate() + ', ' + stamp.getFullYear();
          dates.push(timestampToDate(entries[i].timestamp));
          data.push(entries[i].weather.temp);
        }
      }
      response.end(JSON.stringify({"dates": dates, "data": data}));
    }
  }); 
});

app.get('/dashboard/people', function(request, response) {
  console.log("Received dashboard people request");
  var peopleCounts = {};
  Entry.find().select("namedEntities wordCounts").cursor()
    .on('data', function(entry) {
      let people = entry.namedEntities;
      for (var i = 0; i < people.length; i++) {
        let personKey = people[i].toLowerCase();
        if(personKey in entry.wordCounts) {
          if(people[i] in peopleCounts) {
            peopleCounts[people[i]] += entry.wordCounts[personKey].count;
          } else {
            peopleCounts[people[i]] = entry.wordCounts[personKey].count;
          }         
        }
      }
    })
    .on('error', function(err) {
      console.error('Doing /dashboard/people error', err);
      response.status(500).send(JSON.stringify(err));
      return;
    })
    .on('end', function() {

      var props = [];
      for(key in peopleCounts) {
        props.push({person: key, count: peopleCounts[key]});
      }
      props.sort(function(a,b) {
          return b.count - a.count;
      });
      var props = props.slice(0,8);
      var res = {"people" : [], "data": []};
      for (var i = 0; i < props.length; i++) {
        res.people.push(props[i].person);
        res.data.push(props[i].count);
      }
      console.log();
      response.end(JSON.stringify(res));
    });
});

app.get('/search/phrases/:term', function(request, response) {
  let searchWord = request.params.term;
  console.log("received search phrases request " + searchWord);
  let maxPhraseLength = 5;
  var phrases = [['Phrases']];
  Entry.find().select("tokens").cursor()
    .on('data', function(entry) {
      var length = 1;
      var tokens = entry.tokens;
      var inPhrase = false;
      var phrase = searchWord;
      for (var i = 0; i < tokens.length; i++) {
        var curWord = tokens[i]["word"];
        if(curWord === searchWord) {
          inPhrase = true;
        } else if([".", ",", "(", ")", "!", "?"].indexOf(curWord) > -1 || length >= maxPhraseLength) {
          inPhrase = false;
          if(length > 1) phrases.push([phrase]);
          length = 1;
          phrase = searchWord;
        } else if(inPhrase) {
          phrase += ' ' + curWord;
          length++;
        }
      }
      //If loop finishes in phrase
      if(inPhrase) phrases.push([phrase]);
    })
    .on('error', function(err) {
      console.error('Doing /dashboard/phrases/' + searchWord + ' error', err);
      response.status(500).send(JSON.stringify(err));
      return;
    })
    .on('end', function() {
      console.log(phrases);
      response.end(JSON.stringify({"res": phrases}));
    });
});

app.get('/search/counts/:term', function(request, response) {
  let searchWord = request.params.term;
  console.log("Received search counts request " + searchWord);
  var res = { "entries": {"timestamp": [], "data": []}, "count": 0, "max": 0};
  var sentiment = {"pos": 0, "neu": 0 , "neg": 0};
  Entry.find().select("timestamp wordCounts").cursor()
    .on('data', function(entry) {
      if(searchWord in entry.wordCounts) {
        let entryCount = entry.wordCounts[searchWord].count;
        var stamp = new Date(entry.timestamp); //TODO: way w/o date conversion?
        var datestring = monthNames[stamp.getMonth()] + ' ' +  stamp.getDate() + ', ' + stamp.getFullYear(); 
        res.entries.timestamp.push(datestring);
        res.entries.data.push(entryCount);
        res.count += entryCount;
        if(entryCount > res.max) res.max = entryCount;
        let entrySentiment = entry.wordCounts[searchWord].sentiment;
        sentiment.pos += entrySentiment.pos;
        sentiment.neu += entrySentiment.neu;
        sentiment.neg += entrySentiment.neg;
      }
    })
    .on('error', function(err) {
      console.error('Doing /dashboard/counts/' + searchWord + ' error', err);
      response.status(500).send(JSON.stringify(err));
      return;    
    })
    .on('end', function() {
      res.sentiment = {
        "labels" : ["Positive", "Negative", "Neutral"],
        "data" : [sentiment.pos, sentiment.neg, sentiment.neu]
      };
      response.end(JSON.stringify(res));
    });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});



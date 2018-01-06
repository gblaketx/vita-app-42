var express = require('express');
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
var app = express();
var async = require('async');
var bodyParser = require('body-parser');

var entryModels = require('./schema/entry.js');
var Entry = entryModels.Entry;
var Location = entryModels.Location;

var EvernoteEntry = require('./schema/evernoteEntry.js');

var gramsModels = require('./schema/grams.js');
var Grams = gramsModels.Grams;
var Unigram = gramsModels.Unigram;

var Walk = require('./schema/walk.js');

var url = process.env.MONGOLAB_URI
//var url = 'mongodb://localhost/vitaDB'; //TODO: Change for remote host
mongoose.connect(url, { useMongoClient: true });  //TODO: Deprecation warning

// Journal author. Undefined if using non-Evernote journal
var evernoteAuthor = undefined;
var filterAuthor = false;
var EntryModel = Entry;

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname));
app.use(bodyParser.json());

// views is directory for all template files
// app.set('views', __dirname + '/views');
// app.set('view engine', 'ejs');
// TODO: Evernote entries not date-ordered
// TODO: nbsp appearing under words?
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
  return(monthNames[timestamp.getMonth()] + ' ' + 
   timestamp.getDate() + ', ' + timestamp.getFullYear()); 
};

app.get('/general/mostRecentEntry', function (request, response) {
  console.log('Received mostRecentEntry request');
  var query = EntryModel.findOne(getAuthorFilter()).sort({timestamp: -1}).limit(1);
  query.select("timestamp").exec(function(err, entry) {
    if(err) {
      console.log("Error doing general/mostRecentEntry");
      response.status(500).send(JSON.stringify(err));
    } else {
      response.end(JSON.stringify(entry));
    }
  });
});

app.get('/dashboard/summary', function (request, response) { //TODO: Needs to be modified to work with Evernote
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
        var query = Entry.findOne().sort({length:-1}).limit(1);
        query.select("timestamp loc weather namedEntities length").exec(function(err, entry) {
          if(err) return parallel_done(err);
          stats["longestLength"] = entry.length.toLocaleString();
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
            stats["totalWords"] = res[0].sum.toLocaleString();
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


app.get('/dashboard/familySummary', function (request, response) { //TODO: Needs to be modified to work with Evernote
  console.log("Received dashboard familySummary request");
  var stats = {};
  // TODO: may break up into different queries when getting details. Or not
  async.parallel([
      function(parallel_done) {
        EvernoteEntry.count(getAuthorFilter(), function(err, count) {
          if(err) return parallel_done(err);
          stats["numEntries"] = count;
          parallel_done();
        });
      },
      function(parallel_done) {
        //TODO: Something to replace streak
        parallel_done();
      },
      function(parallel_done) {
        var query = EvernoteEntry.findOne(getAuthorFilter()).sort({length:-1}).limit(1)
        query.select("timestamp author namedEntities length").exec(function(err, entry) {
          if(err) return parallel_done(err);
          stats["longestLength"] = entry.length.toLocaleString();
          stats["longestEntry"] = entry;
          parallel_done();
        });
      },
      function(parallel_done) {
        var pipeline = [
          { $match: getAuthorFilter()},
          { $group: { _id: null, sum: {$sum: "$length"}} },
          { $project: { _id: 0, sum: 1} }
        ];
        EvernoteEntry.aggregate(
          pipeline, function(err, res) {
            console.log(res);
            stats["totalWords"] = res[0].sum.toLocaleString();
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

app.get('/dashboard/yearCounts', function(request, response) {
  console.log("Received yearCounts request");
  var pipeline = [
    { $match: getAuthorFilter()},
    { $project: {year: {$year: "$timestamp"}} },
    { $group: { _id: "$year", count: {$sum: 1}} }
  ];
  EntryModel.aggregate(
    pipeline, function(err, res) {
      if(err) {
        console.error('Doing /dashboard/yearCounts error: ', err);
        response.status(500).send(JSON.stringify(err));
      } else{
        var yearCounts = {};
        for (var i = 0; i < res.length; i++) {
          yearCounts[res[i]._id] = res[i].count;
        }

        response.end(JSON.stringify(yearCounts));
      }
    }
  );

});

app.get('/dashboard/sentiment', function(request, response) {
  console.log('Received dashboard/sentiment request');
  var counts = {"pos": 0, "neu": 0, "neg": 0};
  EntryModel.find().select("sentiment").cursor()
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

  EntryModel.find(getAuthorFilter()).select("timestamp length").exec(function(err, entries) {
    if(err) {
      console.error('Doing /dashboard/entryLengths error', err);
      response.status(500).send(JSON.stringify(err));
      return;
    } else {
      var dates = [];
      var data = [];
      var prevDate = null;
      for (var i = 0; i < entries.length; i++) {
        var date = timestampToDate(entries[i].timestamp);
        if(!filterAuthor && prevDate === date) {
          let lastIndex = data.length-1;
          data[lastIndex] += entries[i].length;
        } else {
          dates.push(date);
          data.push(entries[i].length);
        }
        prevDate = date;
      }
      response.end(JSON.stringify({"dates": dates, "data": data}));
    }
  });
});

app.get('/dashboard/allFamilyEntryLengths', function(request, response) {
  console.log("Received dashboard allFamilyEntryLengths request");

  EntryModel.find(getAuthorFilter()).select("timestamp author length").exec(function(err, entries) {
    if(err) {
      console.error('Doing /dashboard/entryLengths error', err);
      response.status(500).send(JSON.stringify(err));
      return;
    } else {
      var data = {"Gordon" : [], "Kent" : [], "Mom" : [], "Dad" : []};
      for (var i = 0; i < entries.length; i++) {
        if(entries[i].author in data) {
          data[entries[i].author].push({x: timestampToDate(entries[i].timestamp), y: entries[i].length});
        } else {
          console.log("Untagged entry", entries[i].timestamp);
        }
      }
      response.end(JSON.stringify({"data": data}));
    }
  });
});

app.get('/dashboard/locationCounts', function(request, response) {
  console.log("Received location counts request");
  var cityCounts = [["Address", "Count"]];
  Entry.distinct("loc.city", function(err, distinctCities) { // This is not set to entry model because Evernotes do not have location tags
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
  EntryModel.find(getAuthorFilter()).select("wordCounts").cursor()
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

app.get('/dashboard/people', function(request, response) {
  console.log("Received dashboard people request");
  var peopleCounts = {};
  var totalPeopleCount = 0;
  var noPeopleMentions = 0;
  EntryModel.find(getAuthorFilter()).select("namedEntities wordCounts").cursor()
    .on('data', function(entry) {
      let people = entry.namedEntities;
      if(people.length === 0) noPeopleMentions++;
      for (var i = 0; i < people.length; i++) {
        let personKey = people[i].toLowerCase();
        if(personKey in entry.wordCounts) {
          totalPeopleCount += entry.wordCounts[personKey].count;
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
      var res = {"people" : [], "data": [], 
        "totalDistinctPeople": Object.keys(peopleCounts).length.toLocaleString(), 
        "totalPeopleCount": totalPeopleCount.toLocaleString(),
        "noPeopleMentions": noPeopleMentions
      };

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
  EntryModel.find(getAuthorFilter()).select("tokens").cursor()
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
      response.end(JSON.stringify({"res": phrases}));
    });
});

app.get('/search/counts/:term', function(request, response) {
  let searchWord = request.params.term;
  console.log("Received search counts request " + searchWord);
  // var res = { "entries": {"timestamp": [], "data": []}, "count": 0, "max": 0};
  var res = {"entries": [], "count": 0, "max": 0};
  var sentiment = {"pos": 0, "neu": 0 , "neg": 0};
  EntryModel.find(getAuthorFilter()).select("timestamp wordCounts").cursor()
    .on('data', function(entry) {
      if(searchWord in entry.wordCounts) {
        let entryCount = entry.wordCounts[searchWord].count;
        res.entries.push([entry.timestamp, entryCount]);
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
      console.log(res);
      response.end(JSON.stringify(res));
    });
});

app.get('/learn/:n/:length', function(request, response) {
  startupText(request.params.n, function(text, unigrams, gramsDict) { 
    generateText(unigrams, gramsDict, request.params.n, 
      request.params.length, text, request, response);
  });

});

app.get('/relate/tempTime', function(request, response) {
  console.log("Received relate temperature time request");
  Entry.find().select("timestamp weather").exec(function(err, entries) {
    if(err) {
      console.error('Doing /relate/tempTime error', err);
      response.status(500).send(JSON.stringify(err));
      return;
    } else {
      var dates = [];
      var data = [];
      for (var i = 0; i < entries.length; i++) {
        if(entries[i].weather.temp !== undefined) {
          dates.push(timestampToDate(entries[i].timestamp));
          data.push(entries[i].weather.temp);
        }
      }
      response.end(JSON.stringify({"dates": dates, "data": data}));
    }
  }); 
});


app.get('/relate/walkDistance', function(request, response) {
  console.log("Received walk distance request");
  Walk.find({}, function(err, docs) {
    if(err) {
      console.error('Doing /relate/walkDistance', err);
      response.status(500).send(JSON.stringify(err));
      return;          
    }
    var dates = []
    var data = [];
    for (var i = 0; i < docs.length; i++) {
      dates.push(timestampToDate(docs[i].date));
      data.push(docs[i].distance);
    }
    response.end(JSON.stringify({"dates": dates, "data": data}));
  });
});

app.get('/relate/weekdayLength', function(request, response) {
  console.log("Received weekday length request");
  var weekdayCounts = {}
  for (var i = 0; i < 7; i++) {
    weekdayCounts[i] = {"totalLength": 0, "totalEntries": 0};
  }
  Entry.find().select("timestamp length").cursor()
    .on('data', function(entry) {
      weekdayCounts[entry.timestamp.getDay()].totalLength += entry.length;
      weekdayCounts[entry.timestamp.getDay()].totalEntries++;
    })
    .on('error', function(err) {
      console.error('Doing /relate/weekdayLength', err);
      response.status(500).send(JSON.stringify(err));
      return; 
    })
    .on('end', function() {
      var names = ["Sunday", "Monday", "Tuesday", "Wednesday", 
        "Thursday", "Friday", "Saturday"];
      var averages = []
      for (var i = 0; i < names.length; i++) {
        averages.push(Math.round(weekdayCounts[i].totalLength / weekdayCounts[i].totalEntries));
      }
      response.end(JSON.stringify({"labels": names, "data": averages}));
    });

});

app.get('/relate/weekdaySentiment', function(request, response) {
  console.log("Received weekday sentiment request");
  var weekdayCounts = {}
  for (var i = 0; i < 7; i++) {
    weekdayCounts[i] = {"totalSentiment": 0, "totalEntries": 0};
  }
  Entry.find().select("timestamp sentiment").cursor()
    .on('data', function(entry) {
      weekdayCounts[entry.timestamp.getDay()].totalSentiment += entry.sentiment.score;
      weekdayCounts[entry.timestamp.getDay()].totalEntries++;
    })
    .on('error', function(err) {
      console.error('Doing /relate/weekdayLength', err);
      response.status(500).send(JSON.stringify(err));
      return; 
    })
    .on('end', function() {
      var names = ["Sunday", "Monday", "Tuesday", "Wednesday", 
        "Thursday", "Friday", "Saturday"];
      var averages = []
      for (var i = 0; i < names.length; i++) {
        averages.push(weekdayCounts[i].totalSentiment / weekdayCounts[i].totalEntries);
      }
      console.log({"labels": names, "data": averages});
      response.end(JSON.stringify({"labels": names, "data": averages}));
    });

});

app.post('/setAuthor/', function(request, response) {
  evernoteAuthor = request.body.name; //TODO: Anything else to do here?
  if(evernoteAuthor === null) { // Use Gordon Journal
    filterAuthor = false;
    EntryModel = Entry;
  } else if(evernoteAuthor === "All") {
    filterAuthor = false;
    EntryModel = EvernoteEntry;
  } else if(["Gordon", "Kent", "Mom", "Dad"].indexOf(evernoteAuthor) >= 0) { // Author must be Gordon, Kent, Mom, or Dad
    filterAuthor = true;
    EntryModel = EvernoteEntry;
  } else {
    console.error('Error on /setAuthor/' + evernoteAuthor);
    return response.status(400).send(JSON.stringify("setAuthor Error"));
  }
  response.end();

});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

// N-gram Helper functions
function startupText(n, done_callback) {
  var unigrams, gramsDict;
  var text = [];
  let gramsDictName = n + "-gram";
  let query = {name: {$in: ["1-gram", gramsDictName]}};
  Grams.find(query, function(err, docs) {
    if(err) {
      console.error('Doing /learn/' + n + '/' + textLength +' error', err);
      response.status(500).send(JSON.stringify(err));
      return;          
    }
    for (var i = 0; i < docs.length; i++) { //TODO: better way?
      if(docs[i].name === "1-gram") {
        unigrams = docs[i].content;
      } else if(docs[i].name === gramsDictName) {
        gramsDict = docs[i].content;
      }
    }

    if(n != 1) {
      // Technically we could do this with the next smallest dict, but that requires retrieving it
      let keys = Object.keys(gramsDict);
      let words = keys[keys.length * Math.random() << 0];
      text = words.split(' ');
    }
    done_callback(text, unigrams, gramsDict);
  });
};

function generateText(unigrams, gramsDict, n, textLength, text, request, response) {
  console.log("text", text);
  if(n != 1) textLength = textLength - n;
  for(var i = 0; i < textLength; i++) {
    var endings;
    if(n == 1) {
      endings = unigrams;
    } else {
      let key = text.slice(text.length - n + 1).join(' ');
      endings = gramsDict[key];
    }
    var next = binSearch(endings, Math.random(), 0, endings.length);
    text.push(next);
  }
  var outputText = "";
  for (var i = 0; i < text.length; i++) {
    let word = text[i];
    var skip = false;
    if([',', '.', '?', '!', ')', ';', ':', "n't", "'ve", "'ll", "'m", "'re", "'d"].indexOf(word) !== -1) {
      //Align left
      outputText += word;
    } else if(word === '(') {
      //Align right
      skip = true;
      outputText += ' ' + word;
    } else {
      //Align center
      if(!skip) {
        outputText += ' ' + word;
      } else {
        outputText += word;
        skip = false;
      }
    }
  }
  response.send(JSON.stringify({'text': outputText}));

};

function binSearch(array, num, start, end) {
  if(end < start) return null;
  let mid = Math.trunc((start + end) / 2);
  let range = array[mid].range;
  if(range[0] <= num && num < range[1]) {
    return array[mid].word;
  } else if(num < range[0]) {
    return binSearch(array, num, start, mid);
  } else {
    return binSearch(array, num, mid + 1, end); //TODO: may need to check coverage
  }
};

// TODO: Special work for "all"?
function getAuthorFilter() {
  if(filterAuthor) {
    return { author: evernoteAuthor };
  } else {
    return {};
  }
}


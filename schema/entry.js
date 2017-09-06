"use strict";

var mongoose = require('mongoose');

var locationSchema = new mongoose.Schema({
    number: Number,
    street: String,
    city: String,
    region: String,
    country: String
});

var Location = mongoose.model('Location', locationSchema);

var entrySchema = new mongoose.Schema({
    timestamp: Date,
    tokens: [{word: String, pos: String, 
        sentiment: {pos: Number, neu: Number, neg: Number}}],
    loc: locationSchema,
    wordCounts: {},
    length: Number,
    weather: {temp : Number, conditions : String},
    namedEntities: [String],
    sentiment: {pos: Number, neu: Number, neg: Number, score: Number}
}); 

var Entry = mongoose.model('Entry', entrySchema);

module.exports = {Entry: Entry, Location: Location};
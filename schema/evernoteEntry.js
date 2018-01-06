"use strict";

var mongoose = require('mongoose');

var evernoteEntrySchema = new mongoose.Schema({
    timestamp: Date,
    tokens: [{word: String, pos: String, 
        sentiment: {pos: Number, neu: Number, neg: Number}}],
    wordCounts: {},
    length: Number,
    namedEntities: [String],
    sentiment: {pos: Number, neu: Number, neg: Number, score: Number},
    author: String
}, {
    collection: "familyEntries"
}); 

var EvernoteEntry = mongoose.model('EvernoteEntry', evernoteEntrySchema);
module.exports = EvernoteEntry;
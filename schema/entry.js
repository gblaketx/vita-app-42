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
    tokens: [String],
    loc: locationSchema,
    wordCounts: {},
    length: Number
}); 

var Entry = mongoose.model('Entry', entrySchema);

module.exports = {Entry: Entry, Location: Location};
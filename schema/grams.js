"use strict";

var mongoose = require('mongoose');

var gramsSchema = new mongoose.Schema({
    content: {},
    name: String
}, {
    collection: 'grams'
});

// TODO: is there a way to specify that each n-gram dictionary holds words mapping 
// to the [{"word": String, "range": [Number, Number]}] schema?
var Grams = mongoose.model('Grams', gramsSchema);
// var Unigram = mongoose.model('Unigram', unigramSchema);
module.exports = {Grams: Grams};
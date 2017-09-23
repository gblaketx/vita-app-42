"use strict";

var mongoose = require('mongoose');

var walkSchema = new mongoose.Schema({
    date: Date,
    distance: Number
}, {
    collection: 'health'
});

var Walk = mongoose.model('Walk', walkSchema);

module.exports = Walk
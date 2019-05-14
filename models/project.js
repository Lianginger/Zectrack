var mongoose = require('mongoose')
var Schema = mongoose.Schema

var projectSchema = new Schema({
  type: String,
  category: String,
  name: String,
  raise: Number,
  goal: Number,
  backers: Number,
  start: String,
  end: String,
  date: String,
  uri: String
})

module.exports = mongoose.model('Project', projectSchema)
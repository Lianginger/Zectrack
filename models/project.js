var mongoose = require('mongoose')
var Schema = mongoose.Schema

var projectSchema = new Schema({
  type: String,
  category: String,
  rank: String,
  rankDiff: String,
  rankDiffUp: String,
  rankDiffDown: String,
  image: String,
  name: String,
  raise: Number,
  raiseString: String,
  goal: Number,
  goalString: String,
  backers: Number,
  backersString: String,
  left: Number,
  leftUnit: String,
  start: String,
  end: String,
  date: String,
  uri: String
})

module.exports = mongoose.model('Project', projectSchema)
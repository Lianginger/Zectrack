var mongoose = require('mongoose')
var Schema = mongoose.Schema

var hourRankRecordSchema = new Schema({
  type: String,
  category: String,
  image: String,
  name: String,
  raise: Number,
  left: Number,
  date: String,
  uri: String
})

module.exports = mongoose.model('HourRankRecord', hourRankRecordSchema)
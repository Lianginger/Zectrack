var mongoose = require('mongoose')
var Schema = mongoose.Schema

var hourRankProjectSchema = new Schema({
  type: String,
  name: String,
  hourRaise: Number,
  left: Number,
  date: String,
  uri: String
})

module.exports = mongoose.model('HourRankProject', hourRankProjectSchema)
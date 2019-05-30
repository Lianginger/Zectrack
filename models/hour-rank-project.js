var mongoose = require('mongoose')
var Schema = mongoose.Schema

var hourRankProjectSchema = new Schema({
  type: String,
  category: String,
  image: String,
  name: String,
  hourRaise: Number,
  hourRaiseString: String,
  rank: String,
  left: Number,
  leftUnit: String,
  date: String,
  uri: String
})

module.exports = mongoose.model('HourRankProject', hourRankProjectSchema)
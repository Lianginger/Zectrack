var mongoose = require('mongoose')
var Schema = mongoose.Schema

var rewardSchema = new Schema({
  name: String,
  backers: Number,
  price: Number,
  date: String,
  project_id: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
})

module.exports = mongoose.model('Reward', rewardSchema)
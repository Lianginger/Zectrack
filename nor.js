const mongoose = require('mongoose')
const HourRankRecord = require('./models/hour-rank-record')
const HourRankProject = require('./models/hour-rank-project')

// 設定連線到 mongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/zectrack', { useNewUrlParser: true })
const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function () {
  console.log('MongoDB is connected!')
})
mongoose.set('debug', true)

HourRankRecord.find({ type: '群眾集資' })
  .nor([{ uri: 'ter-run' }])
  .then(projects => {
    console.log(projects)
  })
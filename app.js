const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const mongoose = require('mongoose')
const runZectrack = require('./zectrack')

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/zectrack', { useNewUrlParser: true })
const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function () {
  console.log('MongoDB is connected!')
})
mongoose.set('debug', true)

app.get('/', (req, res) => {
  res.send('Zectrack is running...')
})

runZectrack()

app.listen(port, () => {
  console.log(`Express is running and listen on port ${port}`)
})
const express = require('express')
const app = express()
const http = require('http')
const port = process.env.PORT || 3000
const exphbs = require('express-handlebars')
const mongoose = require('mongoose')
const runZectrack = require('./zectrack')
const runRanktrack = require('./ranktrack')

// 設定連線到 mongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/zectrack', { useNewUrlParser: true })
const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function () {
  console.log('MongoDB is connected!')
})
mongoose.set('debug', true)

// 設定模板引擎
app.engine('handlebars', exphbs({ defaultLayout: 'main' }))
app.set('view engine', 'handlebars')

app.use('/', require('./routes/home'))
app.use('/project', require('./routes/project'))

// Set to keep Heroku app awake
setInterval(function () {
  http.get("http://zectrack.herokuapp.com/")
}, 1000 * 60 * 25)

// runZectrack()
runRanktrack()

app.listen(port, () => {
  console.log(`Express is running and listen on port ${port}`)
})
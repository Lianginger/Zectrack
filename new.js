const express = require('express')
const app = express()
const http = require('http')
const port = process.env.PORT || 3000
const exphbs = require('express-handlebars')
const mongoose = require('mongoose')
const runZectrack = require('./zectrack')
const runRanktrack = require('./ranktrack')

const moment = require('moment')
const tz = require('moment-timezone')
const Project = require('./models/project')
const numeral = require('numeral')

// 設定連線到 mongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/zectrack', { useNewUrlParser: true })
const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function () {
  console.log('MongoDB is connected!')
})
mongoose.set('debug', true)


run()

async function run() {
  await rankAllLiveProject()
  let allProjects = await Project.find({ date: new RegExp(moment().tz('Asia/Taipei').format('YYYY-MM-DD'), 'i') }).sort({ raise: -1 }).exec()
  console.log(allProjects)
}


async function rankAllLiveProject() {
  let allProjects = await Project.find({ date: new RegExp(moment().tz('Asia/Taipei').format('YYYY-MM-DD'), 'i') }).sort({ raise: -1 }).exec()

  let promises = allProjects.map(async (project, index) => {
    project.raiseString = numeral(project.raise).format('00000000,0')
    project.rank = numeral(index + 1).format('000,0')

    let yesterdayProject = await Project.find({
      date: new RegExp(moment().tz('Asia/Taipei').subtract(1, 'days').format('YYYY-MM-DD'), 'i'),
      uri: project.uri
    }).exec()

    if (yesterdayProject) {
      if (!yesterdayProject.rank) {
        yesterdayProject.rank = allProjects.length
      }
      project.rankDiff = yesterdayProject.rank - parseInt(project.rank)
    } else {
      project.rankDiff = allProjects.length - parseInt(project.rank)
    }

    await project.save()
    return 'rank ok'
  })

  await Promise.all(promises)
}
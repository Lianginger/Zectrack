const express = require('express')
const router = express.Router()
const Project = require('../models/project')
const Reward = require('../models/reward')
const HourRankProject = require('../models/hour-rank-project')
const numeral = require('numeral')
const moment = require('moment')
const tz = require('moment-timezone')

router.get('/', async (req, res) => {
  let hourRankProjects = await HourRankProject.find({})
    .sort({ hourRaise: -1 })
    .limit(10)
    .exec()
  const firstThreeProjects = []
  const restProjects = []

  hourRankProjects.map((project, index) => {
    project.hourRaiseString = numeral(project.hourRaise).format('0,0')
    if (index <= 2) {
      project.rank = index + 1
      firstThreeProjects.push(project)
    } else {
      project.rank = index + 1
      restProjects.push(project)
    }
  })

  let allProjects = await Project.find({ date: new RegExp(moment().tz('Asia/Taipei').format('YYYY-MM-DD'), 'i') }).sort({ raise: -1 }).exec()
  allProjects.map((project, index) => {
    project.raiseString = numeral(project.raise).format('00000000,0')
    project.rank = numeral(index + 1).format('000,0')
  })
  res.render('index', { firstThreeProjects, restProjects, allProjects })
})

module.exports = router
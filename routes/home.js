const express = require('express')
const router = express.Router()
const Project = require('../models/project')
const Reward = require('../models/reward')
const HourRankProject = require('../models/hour-rank-project')
const numeral = require('numeral')

router.get('/', async (req, res) => {
  let hourRankProjects = await HourRankProject.find({})
    .sort({ hourRaise: -1 })
    .limit(10)
    .exec()
  hourRankProjects.map(project => {
    project.hourRaise = numeral(project.hourRaise).format('0,0')
  })
  res.render('index', { hourRankProjects })
})

module.exports = router
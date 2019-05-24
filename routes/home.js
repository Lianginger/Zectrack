const express = require('express')
const router = express.Router()
const Project = require('../models/project')
const Reward = require('../models/reward')
const HourRankProject = require('../models/hour-rank-project')

router.get('/', async (req, res) => {
  const hourRankProjects = await HourRankProject.find({})
    .sort({ hourRaise: -1 })
    .limit(5)
    .exec()
  res.render('index', { hourRankProjects })
})

module.exports = router
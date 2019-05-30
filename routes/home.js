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

  res.render('index', { firstThreeProjects, restProjects })
})

module.exports = router
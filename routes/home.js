const express = require('express')
const router = express.Router()
const Project = require('../models/project')
const Reward = require('../models/reward')

router.get('/', (req, res) => {
  Project.find().sort({ date: 1 }).then(projects => {
    let projectInfo = projects[projects.length - 1]
    let dateAxisData = []
    let raiseAxisData = []
    projects.map(project => {
      dateAxisData.push(project.date)
      raiseAxisData.push(project.raise)
    })
    let dateAxisDataString = JSON.stringify(dateAxisData)
    let raiseAxisDataString = JSON.stringify(raiseAxisData)
    res.render('index', { projectInfo, dateAxisDataString, raiseAxisDataString })
  })
})

module.exports = router
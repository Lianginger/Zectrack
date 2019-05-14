const express = require('express')
const router = express.Router()
const Project = require('../models/project')
const Reward = require('../models/reward')

router.get('/:projectURI', (req, res) => {
  Project.find({
    uri: req.params.projectURI
  }).sort({ date: 1 }).then(projects => {
    let projectInfo = projects[projects.length - 1]
    let dateAxisData = []
    let raiseAxisData = []
    projects.map(project => {
      dateAxisData.push(project.date)
      raiseAxisData.push(project.raise)
    })
    let dateAxisDataString = JSON.stringify(dateAxisData)
    let raiseAxisDataString = JSON.stringify(raiseAxisData)
    res.render('project', { projectInfo, dateAxisDataString, raiseAxisDataString })
  })
})

module.exports = router
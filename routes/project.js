const express = require('express')
const router = express.Router()
const Project = require('../models/project')
const Reward = require('../models/reward')
const numeral = require('numeral')

router.get('/:projectURI', async (req, res) => {
  let projects = await Project.find({ uri: req.params.projectURI }).sort({ date: 1 }).exec()

  let projectInfo = projects[projects.length - 1]
  projectInfo.raiseString = numeral(projectInfo.raise).format('0,0')
  projectInfo.goalString = numeral(projectInfo.goal).format('0,0')
  projectInfo.backersString = numeral(projectInfo.backers).format('0,0')

  let dateAxisData = []
  let raiseAxisData = []
  let backerAxisData = []
  let rankAxisData = []
  projects.map(project => {
    dateAxisData.push(project.date)
    raiseAxisData.push(project.raise)
    backerAxisData.push(project.backers)
    rankAxisData.push(parseInt(project.rank))
  })

  let dailyRaiseData = []
  let yesterdayRaise = 0
  raiseAxisData.map(todayRaise => {
    dailyRaiseData.push(todayRaise - yesterdayRaise)
    yesterdayRaise = todayRaise
  })

  let dailyBackerData = []
  let yesterdaybacker = 0
  backerAxisData.map(todayBacker => {
    dailyBackerData.push(todayBacker - yesterdaybacker)
    yesterdaybacker = todayBacker
  })

  let dateAxisDataString = JSON.stringify(dateAxisData)
  let raiseAxisDataString = JSON.stringify(raiseAxisData)
  let dailyRaiseDataString = JSON.stringify(dailyRaiseData)
  let backerAxisDataString = JSON.stringify(backerAxisData)
  let dailyBackerDataString = JSON.stringify(dailyBackerData)
  let rankAxisDataString = JSON.stringify(rankAxisData)

  res.render('project', { projectInfo, dateAxisDataString, raiseAxisDataString, dailyRaiseDataString, backerAxisDataString, dailyBackerDataString, rankAxisDataString })
})

module.exports = router
const express = require('express')
const router = express.Router()
const Project = require('../models/project')
const Reward = require('../models/reward')

router.get('/', (req, res) => {
  res.send('Zectrack is running...')
})

module.exports = router
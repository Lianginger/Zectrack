const request = require('request')
const cheerio = require('cheerio')
const baseUrl = 'https://www.zeczec.com/projects/yexinumbrella'
const moment = require('moment')
const tz = require('moment-timezone')
const mongoose = require('mongoose')
const Project = require('./models/project')
const Reward = require('./models/reward')
const intervalTime = 1000 * 60 * 10

mongoose.connect('mongodb://localhost/zectrack', { useNewUrlParser: true })
const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function () {
  console.log('MongoDB is connected!')
})
mongoose.set('debug', true)

Project.findOne({ date: moment().tz('Asia/Taipei').format('YYYY-MM-DD') })
  .then(project => {
    if (project) {
      console.log(`找到專案紀錄並更新數據`)
      updateProject(project)
      // Object.assign(project)
      // project.save()
    } else {
      storeNewProject()
    }
  })

async function updateProject(project) {
  const projectInfo = await projectInfoCrawlData
  const rewards = await projectRewardsCrawlData
  Object.assign(project, projectInfo)
  project.save()
    .then(
      rewards.map(rewardFromCrawl => {
        Reward.findOne({
          date: moment().tz('Asia/Taipei').format('YYYY-MM-DD'),
          name: rewardFromCrawl.name,
        }).then(rewardFromDB => {
          if (rewardFromDB) {
            Object.assign(rewardFromDB, rewardFromCrawl)
            rewardFromDB.save()
          } else {
            const newReward = new Reward(rewardFromCrawl)
            newReward.save()
          }
        })
      })
    )
}

async function storeNewProject() {
  const projectInfo = await projectInfoCrawlData
  const rewards = await projectRewardsCrawlData
  const newProject = new Project(projectInfo)
  newProject.save()
    .then(project => {
      rewards.map(reward => {
        reward.project_id = project._id
      })
      Reward.insertMany(rewards)
    })
}

const projectInfoCrawlData = new Promise((resolve, reject) => {
  request(baseUrl, (err, res, body) => {
    if (err) { return reject(err) }
    const $ = cheerio.load(body)

    const projectInfo = {
      type: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mt0-l.mt3 > div > a.dark-gray.b.dib').text(),
      category: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mt0-l.mt3 > div > a.gray.b.dib').text(),
      name: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > a:nth-child(2) > h2').text(),
      raise: parseInt($('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mv3.relative > div.f3.b.js-sum-raised').text().replace(/[^0-9]/g, "")),
      goal: parseInt($('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mv3.relative > div.f7.mt2').text().replace(/[^0-9]/g, "")),
      backers: parseInt($('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div:nth-child(9) > span.js-backers-count').text()),
      start: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mb2.f7').text().substring(4, 20),
      end: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mb2.f7').text().substring(23, 39),
      date: moment().tz('Asia/Taipei').format('YYYY-MM-DD'),
    }
    return resolve(projectInfo)
  })
})

const projectRewardsCrawlData = new Promise((resolve, reject) => {
  request(baseUrl, (err, res, body) => {
    if (err) { return reject(err) }
    const $ = cheerio.load(body)

    let rewards = []
    $('body > div.container.mv4 > div > div.w-30-l.ph3-l.ph0.flex-ns.flex-wrap.flex-column-l.w-100 > div').each(function (i, elem) {
      let reward = {}
      reward.name = $(this).find('div.black.f6.mv-child-0.maxh5.maxh-none-ns.overflow-auto > p:nth-child(1)').text().split('\n')[0]
      reward.backers = parseInt($(this).find('div.f7.mv2 > span > span').text())
      reward.price = parseInt($(this).find('.black.b.f4').text().replace(/[^0-9]/g, ""))
      reward.date = moment().tz('Asia/Taipei').format('YYYY-MM-DD')
      rewards[i] = reward
    })
    return resolve(rewards)
  })
})

// setInterval(getProjectData, intervalTime)
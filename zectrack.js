const request = require('request')
const cheerio = require('cheerio')
const baseUrl = 'https://www.zeczec.com/projects/'
// const projectURIArray = ['yexinumbrella', 'lessdosoap']
const moment = require('moment')
const tz = require('moment-timezone')
const Project = require('./models/project')
const Reward = require('./models/reward')
const intervalTime = 1000 * 60 * 5
let dateNow = ''

function runZectrack(projectURIArray) {
  crawlProjectStart(projectURIArray)
}

function crawlProjectStart(projectURIArray) {
  dateNow = moment()
    .tz('Asia/Taipei')
    .format('YYYY-MM-DD')
  projectURIArray.map(projectURI => {
    Project.findOne({
      date: dateNow,
      uri: projectURI
    }).then(project => {
      if (project) {
        console.log(`更新數據`)
        updateProject(project, projectURI)
      } else {
        console.log(`新建專案，建立數據`)
        storeNewProject(projectURI)
      }
    })
  })
}

async function updateProject(project, projectURI) {
  const projectInfo = await crawlProjectInfoData(projectURI)
  const rewards = await crawlProjectRewardsData(projectURI)
  Object.assign(project, projectInfo)
  project.save().then(
    rewards.map(rewardFromCrawl => {
      Reward.findOne({
        date: dateNow,
        name: rewardFromCrawl.name,
        uri: projectURI
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

async function storeNewProject(projectURI) {
  const projectInfo = await crawlProjectInfoData(projectURI)
  const rewards = await crawlProjectRewardsData(projectURI)
  const newProject = new Project(projectInfo)
  newProject.save().then(project => {
    rewards.map(reward => {
      reward.uri = projectURI
    })
    Reward.insertMany(rewards)
  })
}

function crawlProjectInfoData(projectURI) {
  return new Promise((resolve, reject) => {
    request(baseUrl + projectURI, (err, res, body) => {
      if (err) {
        return reject(err)
      }
      const $ = cheerio.load(body)

      const projectInfo = {
        type: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mt0-l.mt3 > div > a.dark-gray.b.dib').text(),
        category: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mt0-l.mt3 > div > a.gray.b.dib').text(),
        image: $('body > div.container.mv4-l.mt3-l > div > div.w-70-l.w-100.ph3-l > div > div').attr('style')
          ? $('body > div.container.mv4-l.mt3-l > div > div.w-70-l.w-100.ph3-l > div > div')
              .attr('style')
              .substring(23)
              .replace("')", '')
          : '',

        name: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > a:nth-child(2) > h2').text(),
        raise: parseInt(
          $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mv3.relative > div.f3.b.js-sum-raised')
            .text()
            .replace(/[^0-9]/g, '')
        ),
        goal: parseInt(
          $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mv3.relative > div.f7.mt2')
            .text()
            .replace(/[^0-9]/g, '')
        ),
        backers: parseInt($('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div > span.js-backers-count').text()),
        left: parseInt(
          $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div > span.js-time-left')
            .text()
            .replace(/[^0-9]/g, '')
        ),
        leftUnit: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div > span.js-time-left')
          .text()
          .substr(-2, 2)
          .replace(' ', ''),
        start: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mb2.f7')
          .text()
          .substring(4, 20),
        end: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > div.mb2.f7')
          .text()
          .substring(23, 39),
        date: dateNow,
        uri: $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > a:nth-child(2)').attr('href')
          ? $('body > div.container.mv4-l.mt3-l > div > div.w-30-l.w-100.ph3 > a:nth-child(2)')
              .attr('href')
              .substring(10)
          : projectURI
      }

      console.log(projectInfo)
      return resolve(projectInfo)
    })
  })
}

function crawlProjectRewardsData(projectURI) {
  return new Promise((resolve, reject) => {
    request(baseUrl + projectURI, (err, res, body) => {
      if (err) {
        return reject(err)
      }
      const $ = cheerio.load(body)

      let rewards = []
      $('body > div.container.mv4 > div > div.w-30-l.ph3-l.ph0.flex-ns.flex-wrap.flex-column-l.w-100 > div').each(function(i, elem) {
        let reward = {}
        reward.name = $(this)
          .find('div.black.f6.mv-child-0.maxh5.maxh-none-ns.overflow-auto > p:nth-child(1)')
          .text()
          .split('\n')[0]
        reward.backers =
          parseInt(
            $(this)
              .find('div.f7.mv2 > span > span')
              .text()
          ) || 0
        reward.price = parseInt(
          $(this)
            .find('.black.b.f4')
            .text()
            .replace(/[^0-9]/g, '')
        )
        reward.date = dateNow
        reward.uri = projectURI
        rewards[i] = reward
      })
      return resolve(rewards)
    })
  })
}

module.exports = runZectrack

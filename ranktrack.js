const request = require('request')
const cheerio = require('cheerio')
const projectTypes = ['presale', 'crowdfunding']
const baseUrl = 'https://www.zeczec.com/categories?'
const moment = require('moment')
const tz = require('moment-timezone')
const numeral = require('numeral')
const Project = require('./models/project')
const HourRankRecord = require('./models/hour-rank-record')
const HourRankProject = require('./models/hour-rank-project')
const runZectrack = require('./zectrack')
const intervalTime = 1000 * 60 * 5
const random_useragent = require('random-useragent')
const crawler = {}

async function runRanktrackIntervally() {
  await login()
  runRanktrack()
  setInterval(runRanktrack, intervalTime)
}

function login() {
  return new Promise((resolve, reject) => {
    request('https://www.zeczec.com/users/sign_in', (err, res, body) => {
      if (err) {
        console.log(err)
        reject(false)
      }

      const $ = cheerio.load(body)
      crawler.authenticity_token = $(
        '#new_user > input[type=hidden]:nth-child(2)'
      ).val()
      crawler.cookie = res.headers['set-cookie'][1].split(';')[0]
      console.log(crawler.cookie, crawler.authenticity_token)

      console.log('=================================')
      request.post(
        {
          url: 'https://www.zeczec.com/users/sign_in',
          form: {
            'user[email]': process.env.CRAWLER_USER_EMAIL,
            'user[password]': process.env.CRAWLER_USER_PASSWORD,
            commit: '登入',
            utf8: '✓',
            authenticity_token: crawler.authenticity_token
          },
          headers: {
            cookie: crawler.cookie
          }
        },
        function(err, res, body) {
          if (err) {
            console.log(err)
            reject(false)
          }

          console.log('=================================')
          // status 302 表示登入跳轉成功
          if (res.headers.status.includes('302')) {
            crawler.cookie = res.headers['set-cookie'][1].split(';')[0]
            request('https://www.zeczec.com/', (err, res, body) => {
              if (err) {
                console.log(err)
              }
              resolve(true)
            })
          }
        }
      )
    })
  })
}

async function runRanktrack() {
  let promises = projectTypes.map(async projectType => {
    await trackHourRank(projectType)
    return 'trackHourRank ok'
  })
  await Promise.all(promises)
  rankAllLiveProject()
}

async function trackHourRank(projectType) {
  const numberOfPageToCrawl = await getNumberOfPage(projectType)
  let crawlPage = 1
  let uriObjectInArray = []
  const checkDate = moment()
    .tz('Asia/Taipei')
    .format('YYYY-MM-DD')
  while (crawlPage <= numberOfPageToCrawl) {
    const records = await crawlRecord(crawlPage, projectType)
    await HourRankRecord.insertMany(records)

    const uriArray = records.map(record => record.uri)
    uriArray.map(thisUri => {
      uriObjectInArray.push({ uri: thisUri })
    })
    checkAndRankRecords(uriArray)
    runZectrack(uriArray, checkDate, crawler.cookie)
    crawlPage++
  }
  await deleteProjectOffline(projectType, uriObjectInArray)
}

async function rankAllLiveProject() {
  let allProjects = await Project.find({
    date: new RegExp(
      moment()
        .tz('Asia/Taipei')
        .format('YYYY-MM-DD'),
      'i'
    )
  })
    .sort({ raise: -1 })
    .exec()

  let promises = allProjects.map(async (project, index) => {
    project.raiseString = numeral(project.raise).format('00000000,0')
    project.rank = numeral(index + 1).format('000,0')

    let yesterdayProject = await Project.findOne({
      date: new RegExp(
        moment()
          .tz('Asia/Taipei')
          .subtract(1, 'days')
          .format('YYYY-MM-DD'),
        'i'
      ),
      uri: project.uri
    }).exec()

    if (yesterdayProject) {
      if (!yesterdayProject.rank) {
        yesterdayProject.rank = allProjects.length
      }
      project.rankDiff = setRankDiffToArrowSign(
        project,
        parseInt(yesterdayProject.rank) - parseInt(project.rank)
      )
    } else {
      project.rankDiff = setRankDiffToArrowSign(
        project,
        allProjects.length - parseInt(project.rank)
      )
    }

    await project.save()
    return 'rank ok'
  })

  await Promise.all(promises)
}

function setRankDiffToArrowSign(project, number) {
  if (number === 0) {
    project.rankDiffClass = 'text-white'
    return `▲ ` + numeral(number).format('00,0')
  } else if (number > 0) {
    if (number > 9) {
      project.rankDiffClass = 'text-white bg-danger'
    }
    if (number <= 9) {
      project.rankDiffClass = 'text-danger'
    }
    return `▲ ` + numeral(number).format('00,0')
  } else if (number < 0) {
    if (number >= -9) {
      project.rankDiffClass = 'text-success'
    }
    if (number < -9) {
      project.rankDiffClass = 'text-white bg-success'
    }
    return `▼ ` + numeral(0 - number).format('00,0')
  }
}

async function deleteProjectOffline(projectType, uriObjectInArray) {
  let offLineRankProject = await HourRankProject.find({
    type: setChineseTypeNameByProjectType(projectType)
  }).nor(uriObjectInArray)
  let offLineRankRecord = await HourRankRecord.find({
    type: setChineseTypeNameByProjectType(projectType)
  }).nor(uriObjectInArray)
  offLineRankProject.map(project => {
    project.remove()
  })
  offLineRankRecord.map(record => {
    record.remove()
  })
}

function checkAndRankRecords(uriArray) {
  uriArray.map(uri => {
    checkAndRankEachProject(uri)
  })
}

async function checkAndRankEachProject(uri) {
  const records = await HourRankRecord.find({ uri })
    .sort({ date: 1 })
    .exec()
  // console.log(records)
  // console.log(records.length)
  while (records.length > 13) {
    console.log('Delete old record')
    const oldRecord = records.shift()
    console.log(oldRecord._id)
    await HourRankRecord.deleteOne({ _id: oldRecord._id })
  }
  await rankProject(uri)
}

async function rankProject(uri) {
  const project = await HourRankProject.findOne({ uri }).exec()
  const records = await HourRankRecord.find({ uri })
    .sort({ date: 1 })
    .exec()
  console.log(project)
  if (project) {
    console.log('project exist, update data')
    project.type = records[records.length - 1].type
    project.category = records[records.length - 1].category
    project.image = records[records.length - 1].image
    project.name = records[records.length - 1].name
    project.hourRaise = records[records.length - 1].raise - records[0].raise
    project.left = records[records.length - 1].left
    project.leftUnit = records[records.length - 1].leftUnit
    project.date = records[records.length - 1].date
    project.uri = records[records.length - 1].uri
    await project.save()
  } else {
    console.log('project not exist, create one')
    await HourRankProject.create({
      type: records[records.length - 1].type,
      category: records[records.length - 1].category,
      image: records[records.length - 1].image,
      name: records[records.length - 1].name,
      hourRaise: records[records.length - 1].raise - records[0].raise,
      left: records[records.length - 1].left,
      leftUnit: records[records.length - 1].leftUnit,
      date: records[records.length - 1].date,
      uri: records[records.length - 1].uri
    })
  }
}

async function getNumberOfPage(projectType) {
  let page = 1

  while (true) {
    if (await isLastPage(page, projectType)) {
      break
    }
    page++
  }
  return page
}

function isLastPage(page, projectType) {
  const options = {
    url: `${baseUrl}page=${page}&type=${projectType}`,
    headers: {
      'User-Agent': random_useragent.getRandom(),
      cookie: crawler.cookie
    }
  }
  return new Promise((resolve, reject) => [
    request(options, (err, res, body) => {
      if (err) {
        return reject(err)
      }
      const $ = cheerio.load(body)
      console.log(`檢查第${page}頁`)
      options.headers['User-Agent'] = random_useragent.getRandom()
      $('body > div:nth-child(4) > div.flex.gutter3-l > div').each(function(
        i,
        elem
      ) {
        const leftString = $(this)
          .find('div > div.w-100.absolute.bottom-0.mb3.black > span')
          .text()
        if (leftString.indexOf('剩下') < 0) {
          resolve(true)
        }
        resolve(false)
      })
    })
  ])
}

function crawlRecord(page, projectType) {
  const options = {
    url: `${baseUrl}page=${page}&type=${projectType}`,
    headers: {
      'User-Agent': random_useragent.getRandom(),
      cookie: crawler.cookie
    }
  }
  return new Promise((resolve, reject) => {
    request(options, (err, res, body) => {
      if (err) {
        return reject(err)
      }
      const $ = cheerio.load(body)
      options.headers['User-Agent'] = random_useragent.getRandom()

      const records = []
      $('body > div:nth-child(4) > div.flex.gutter3-l > div').each(function(
        i,
        elem
      ) {
        const leftString = $(this)
          .find('div > div.w-100.absolute.bottom-0.mb3.black > span')
          .text()
        if (leftString.indexOf('剩下') < 0) {
          return
        }

        const record = {
          type: setChineseTypeNameByProjectType(projectType),
          category: $(this)
            .find('div > span')
            .text()
            .substring(
              0,
              $(this)
                .find('div > span')
                .text()
                .indexOf('By') - 1
            )
            .replace('\n', ''),
          image: $(this)
            .find('div > a > div')
            .attr('data-bg-src'),
          name: $(this)
            .find('div > a > h3')
            .text(),
          raise: parseInt(
            $(this)
              .find('div > div.w-100.absolute.bottom-0.mb3.black > div.fr.b')
              .text()
              .replace(/[^0-9]/g, '')
          ),
          left: parseInt(
            $(this)
              .find('div > div.w-100.absolute.bottom-0.mb3.black > span')
              .text()
              .replace(/[^0-9]/g, '')
          ),
          leftUnit: $(this)
            .find('div > div.w-100.absolute.bottom-0.mb3.black > span')
            .text()
            .replace('\n', '')
            .substr(-2, 2)
            .replace(' ', ''),
          date: moment()
            .tz('Asia/Taipei')
            .format('YYYY-MM-DD HH:mm:ss'),
          uri: $(this)
            .find('div > a')
            .attr('href')
            .substring(10)
        }
        records.push(record)
      })

      return resolve(records)
    })
  })
}

function setChineseTypeNameByProjectType(projectType) {
  if (projectType === 'presale') {
    return '預購式專案'
  } else if (projectType === 'crowdfunding') {
    return '群眾集資'
  }
}

module.exports = runRanktrackIntervally

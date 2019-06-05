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

function runRanktrackIntervally() {
  runRanktrack()
  setInterval(runRanktrack, intervalTime)
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
  while (crawlPage <= numberOfPageToCrawl) {
    const records = await crawlRecord(crawlPage, projectType)
    await HourRankRecord.insertMany(records)

    const uriArray = records.map(record => record.uri)
    uriArray.map(thisUri => {
      uriObjectInArray.push({ uri: thisUri })
    })
    checkAndRankRecords(uriArray)
    runZectrack(uriArray)
    crawlPage++
  }
  await deleteProjectOffline(projectType, uriObjectInArray)
}

async function rankAllLiveProject() {
  let allProjects = await Project.find({ date: new RegExp(moment().tz('Asia/Taipei').format('YYYY-MM-DD'), 'i') }).sort({ raise: -1 }).exec()

  let promises = allProjects.map(async (project, index) => {
    project.raiseString = numeral(project.raise).format('00000000,0')
    project.rank = numeral(index + 1).format('000,0')

    let yesterdayProject = await Project.findOne({
      date: new RegExp(moment().tz('Asia/Taipei').subtract(1, 'days').format('YYYY-MM-DD'), 'i'),
      uri: project.uri
    }).exec()

    if (yesterdayProject) {
      if (!yesterdayProject.rank) {
        yesterdayProject.rank = allProjects.length
      }
      project.rankDiff = setRankDiffToArrowSign(project, parseInt(yesterdayProject.rank) - parseInt(project.rank))
    } else {
      project.rankDiff = setRankDiffToArrowSign(project, allProjects.length - parseInt(project.rank))
    }

    await project.save()
    return 'rank ok'
  })

  await Promise.all(promises)
}

function setRankDiffToArrowSign(project, number) {
  if (number === 0) {
    project.rankDiffUp = 'text-white'
    return `▲ ` + numeral(number).format('(00,0)')
  } else if (number > 0) {
    if (number > 9) { project.rankDiffUp = 'text-white bg-danger' }
    if (number <= 9) { project.rankDiffUp = 'text-danger' }
    return `▲ ` + numeral(number).format('(00,0)')
  } else if (number < 0) {
    if (number >= -9) { project.rankDiffUp = 'text-success' }
    if (number < -9) { project.rankDiffUp = 'text-white bg-success' }
    return `▼ ` + numeral(number).format('(00,0)')
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
  const records = await HourRankRecord.find({ uri }).sort({ date: 1 }).exec()
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
  const records = await HourRankRecord.find({ uri }).sort({ date: 1 }).exec()
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
  return new Promise((resolve, reject) => [
    request(`${baseUrl}page=${page}&type=${projectType}`, (err, res, body) => {
      if (err) { return reject(err) }
      const $ = cheerio.load(body)
      console.log(`檢查第${page}頁`)
      $('body > div:nth-child(4) > div.flex.gutter3-l > div').each(function (i, elem) {
        const leftString = $(this).find('div > div.w-100.absolute.bottom-0.mb3.black > span').text()
        if (leftString.indexOf('剩下') < 0) {
          resolve(true)
        }
        resolve(false)
      })
    })
  ])
}

function crawlRecord(page, projectType) {
  return new Promise((resolve, reject) => {
    request(`${baseUrl}page=${page}&type=${projectType}`, (err, res, body) => {
      if (err) { return reject(err) }
      const $ = cheerio.load(body)

      const records = []
      $('body > div:nth-child(4) > div.flex.gutter3-l > div').each(function (i, elem) {
        const leftString = $(this).find('div > div.w-100.absolute.bottom-0.mb3.black > span').text()
        if (leftString.indexOf('剩下') < 0) {
          return
        }

        const record = {
          type: setChineseTypeNameByProjectType(projectType),
          category: $(this).find('div > span').text().substring(0, $(this).find('div > span').text().indexOf('By') - 1).replace('\n', ""),
          image: $(this).find('div > a > div').attr('data-bg-src'),
          name: $(this).find('div > a > h3').text(),
          raise: parseInt($(this).find('div > div.w-100.absolute.bottom-0.mb3.black > div.fr.b').text().replace(/[^0-9]/g, "")),
          left: parseInt($(this).find('div > div.w-100.absolute.bottom-0.mb3.black > span').text().replace(/[^0-9]/g, "")),
          leftUnit: $(this).find('div > div.w-100.absolute.bottom-0.mb3.black > span').text().replace('\n', "").substr(-2, 2).replace(' ', ""),
          date: moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
          uri: $(this).find('div > a').attr('href').substring(10)
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
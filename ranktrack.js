const request = require('request')
const cheerio = require('cheerio')
const baseUrl = 'https://www.zeczec.com/categories?type=presale&page='
const moment = require('moment')
const tz = require('moment-timezone')
const HourRankRecord = require('./models/hour-rank-record')
const HourRankProject = require('./models/hour-rank-project')
const intervalTime = 1000 * 60 * 5

function runRanktrack() {
  rankTrack()
  setInterval(rankTrack, intervalTime)
}

async function rankTrack() {
  const numberOfPageToCrawl = await getNumberOfPage()
  let crawlPage = 1
  while (crawlPage <= numberOfPageToCrawl) {
    const records = await crawlRecord(crawlPage)
    await HourRankRecord.insertMany(records)

    const uriArray = records.map(record => record.uri)
    checkAndRankRecords(uriArray)
    crawlPage++
  }
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
    console.log('project exit, update data')
    project.type = records[records.length - 1].type
    project.name = records[records.length - 1].name
    project.hourRaise = records[records.length - 1].raise - records[0].raise
    project.left = records[records.length - 1].left
    project.date = records[records.length - 1].date
    project.uri = records[records.length - 1].uri
    await project.save()
  } else {
    console.log('project not exit, create one')
    await HourRankProject.create({
      type: records[records.length - 1].type,
      name: records[records.length - 1].name,
      hourRaise: records[records.length - 1].raise - records[0].raise,
      left: records[records.length - 1].left,
      date: records[records.length - 1].date,
      uri: records[records.length - 1].uri
    })
  }
}

async function getNumberOfPage() {
  let page = 1

  while (true) {
    if (await isLastPage(page)) {
      break
    }
    page++
  }
  return page
}

function isLastPage(page) {
  return new Promise((resolve, reject) => [
    request(baseUrl + page, (err, res, body) => {
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

function crawlRecord(page) {
  return new Promise((resolve, reject) => {
    request(baseUrl + page, (err, res, body) => {
      if (err) { return reject(err) }
      const $ = cheerio.load(body)

      const records = []
      $('body > div:nth-child(4) > div.flex.gutter3-l > div').each(function (i, elem) {
        const leftString = $(this).find('div > div.w-100.absolute.bottom-0.mb3.black > span').text()
        if (leftString.indexOf('剩下') < 0) {
          return
        }
        const record = {
          type: '預購式專案',
          name: $(this).find('div > a > h3').text(),
          raise: parseInt($(this).find('div > div.w-100.absolute.bottom-0.mb3.black > div.fr.b').text().replace(/[^0-9]/g, "")),
          left: parseInt($(this).find('div > div.w-100.absolute.bottom-0.mb3.black > span').text().replace(/[^0-9]/g, "")),
          date: moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
          uri: $(this).find('div > a').attr('href').substring(10)
        }
        records.push(record)
      })

      return resolve(records)
    })
  })
}

module.exports = runRanktrack
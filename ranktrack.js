const request = require('request')
const cheerio = require('cheerio')
const baseUrl = 'https://www.zeczec.com/'
const moment = require('moment')
const tz = require('moment-timezone')
const HourRankRecord = require('./models/hour-rank-record')
const HourRankProject = require('./models/hour-rank-project')
const intervalTime = 1000 * 60 * 5

async function rankTrack() {
  const records = await crawlRecord()
  await HourRankRecord.insertMany(records)

  const uriArray = records.map(record => record.uri)
  checkRecords(uriArray)
}

function checkRecords(uriArray) {
  uriArray.map(uri => {
    checkAndDeleteOldRecord(uri)
  })
}

async function checkAndDeleteOldRecord(uri) {
  const records = await HourRankRecord.find({ uri }).sort({ date: 1 }).exec()
  console.log(records)
  console.log(records.length)
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

function crawlRecord() {
  return new Promise((resolve, reject) => {
    request(baseUrl, (err, res, body) => {
      if (err) { return reject(err) }
      const $ = cheerio.load(body)

      const records = []
      const record = {
        type: '預購式專案',
        name: $('body > div:nth-child(7) > div > div.flex.gutter3-l > div:nth-child(1) > div > a > h3').text(),
        raise: parseInt($('body > div:nth-child(7) > div > div.flex.gutter3-l > div:nth-child(1) > div > div > div.fr.b').text().replace(/[^0-9]/g, "")),
        left: parseInt($('body > div:nth-child(7) > div > div.flex.gutter3-l > div:nth-child(1) > div > div > span').text().replace(/[^0-9]/g, "")),
        date: moment().tz('Asia/Taipei').format('YYYY-MM-DD HH:mm:ss'),
        uri: $('body > div:nth-child(7) > div > div.flex.gutter3-l > div:nth-child(1) > div > a').attr('href').substring(10)
      }
      records.push(record)
      return resolve(records)
    })
  })
}

module.exports = rankTrack
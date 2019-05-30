const request = require('request')
const cheerio = require('cheerio')
const projectTypes = ['presale', 'crowdfunding']
const baseUrl = 'https://www.zeczec.com/categories?'
const moment = require('moment')
const tz = require('moment-timezone')
const HourRankRecord = require('./models/hour-rank-record')
const HourRankProject = require('./models/hour-rank-project')
const intervalTime = 1000 * 60 * 5

function runRanktrack() {
  projectTypes.map(projectType => {
    rankTrack(projectType)
    setInterval(rankTrack, intervalTime, projectType)
  })
}

async function rankTrack(projectType) {
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
    crawlPage++
  }
  await deleteProjectOffline(uriObjectInArray)
}

async function deleteProjectOffline(uriObjectInArray) {
  let offLineProject = await HourRankProject.find().nor(uriObjectInArray)
  console.log(offLineProject)
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

module.exports = runRanktrack
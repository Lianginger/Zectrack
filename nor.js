const request = require('request')
const cheerio = require('cheerio')
const mongoose = require('mongoose')
const projectTypes = ['presale', 'crowdfunding']
const baseUrl = 'https://www.zeczec.com/categories?'
const moment = require('moment')
const tz = require('moment-timezone')
const HourRankRecord = require('./models/hour-rank-record')
const HourRankProject = require('./models/hour-rank-project')
const intervalTime = 1000 * 60 * 5

// 設定連線到 mongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/zectrack', { useNewUrlParser: true })
const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function () {
  console.log('MongoDB is connected!')
})
mongoose.set('debug', true)

// HourRankRecord.find({ type: '群眾集資' })
//   .nor([{ uri: 'ter-run' }])
//   .then(projects => {
//     projects.map(project => {
//       project.remove()
//     })
//   })

crawlRecord()
function crawlRecord() {
  return new Promise((resolve, reject) => {
    request(`https://www.zeczec.com/categories?page=1&scope=end`, (err, res, body) => {
      if (err) { return reject(err) }
      const $ = cheerio.load(body)

      const records = []
      $('body > div:nth-child(4) > div.flex.gutter3-l > div').each(function (i, elem) {
        const leftString = $(this).find('div > div.w-100.absolute.bottom-0.mb3.black > span').text()
        if (leftString.indexOf('剩下') < 0) {
          return
        }

        const record = {
          type: setChineseTypeNameByProjectType('presale'),
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
      console.log(records)
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
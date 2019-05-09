const request = require('request')
const cheerio = require('cheerio')
const baseUrl = 'https://www.zeczec.com/projects/yexinumbrella'
const moment = require('moment')
const tz = require('moment-timezone')

request(baseUrl, (err, res, body) => {
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
  console.log(projectInfo)

  let rewards = []
  $('body > div.container.mv4 > div > div.w-30-l.ph3-l.ph0.flex-ns.flex-wrap.flex-column-l.w-100 > div').each(function (i, elem) {
    let reward = {}
    reward.name = $(this).find('div.black.f6.mv-child-0.maxh5.maxh-none-ns.overflow-auto > p:nth-child(1)').text().split('\n')[0]
    reward.backers = parseInt($(this).find('div.f7.mv2 > span > span').text())
    reward.price = parseInt($(this).find('.black.b.f4').text().replace(/[^0-9]/g, ""))
    reward.date = moment().tz('Asia/Taipei').format('YYYY-MM-DD')
    rewards[i] = reward
  })
  console.log(rewards)
})
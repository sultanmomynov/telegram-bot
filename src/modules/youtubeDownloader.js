const youtubedl = require('youtube-dl')
const helper = require('./helper')

module.exports = function downloadFile(url) {

  console.log(`[${ helper.getDate() }] Downloading...`);

  const args = [
    '-x',
    '--audio-format',
    'mp3',
    '-o',
    './tmp/%(id)s.%(ext)s',
    '--write-thumbnail',
    '--cookies',
    './config/cookies.txt',
    '--add-metadata',
    '--metadata-from-title',
    '(?P<artist>.+?) - (?P<title>.+)',
    '--rm-cache-dir'
  ]

  return new Promise((resolve, reject) => {
    youtubedl.exec(url, args, {}, (err) => {

      if (err) {
        reject(err);
      } else {
        // console.group()
        // console.log(out.join('\n'))
        // console.groupEnd()
        console.log(`[${ helper.getDate() }] Audio is downloaded.`)
        resolve();
      }
    })
  })

}
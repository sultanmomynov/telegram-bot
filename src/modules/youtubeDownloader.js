const youtubedl = require('youtube-dl')
const helper = require('./helper')

module.exports = function downloadFile(url) {
  
  console.log(`[${helper.getDate()}] Downloading...\n`);

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
    '(?P<artist>.+?) - (?P<title>.+)'
  ]
  
  return new Promise((resolve, reject) => {
    youtubedl.exec(url, args, {}, (err, out) => {

      if (err) {
        reject(err);
        throw console.error(err)
      } else {
        resolve(out);
      }
    })
  })

}
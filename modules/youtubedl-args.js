module.exports = [
  '-x',
  '--audio-format',
  'mp3',
  '-o',
  './tmp/%(id)s.%(ext)s',
  '--write-thumbnail',
  '--cookies',
  './config/cookies.txt'
]
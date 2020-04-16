const fs = require('fs')
const helper = require('./helper')

module.exports = function deleteTempFiles(file1, file2) {
  fs.unlink(file1, (err) => {
    if (err) throw err;
  });

  fs.unlink(file2, (err) => {
    if (err) throw err;
  })
  console.log(`\n[${helper.getDate()}] Files deleted`)
}
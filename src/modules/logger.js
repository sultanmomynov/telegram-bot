const fs = require('fs')

module.exports = {
  log(event) {

    const logMessage = `[${ new Date().toLocaleString() }] ${ event }\n`

    fs.appendFile(`${ __dirname }'/../logs`, logMessage, (err) => {
      if (err) throw err;
    });
  }
}

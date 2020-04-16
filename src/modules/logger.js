const fs = require('fs')
module.exports = {
  log(event) {

    log_message = `[${new Date().toLocaleString()}] ${event}\n`
  
    fs.appendFile(__dirname + '/../logs', log_message, (err) => {
      if (err) throw err;
    });
  }
}

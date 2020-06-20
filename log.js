const fs = require("fs");

function Log(path, applicationName, minLogLevel, logInConsole) {
  this.path = path;
  this.applicationName = applicationName;
  this.minLogLevel = LogLevels[minLogLevel];
  this.logInConsole = logInConsole;

  getDateTime = function () {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const h = String(today.getHours()).padStart(2, "0");
    const m = String(today.getMinutes()).padStart(2, "0");
    const s = String(today.getSeconds()).padStart(2, "0");
    const ms = String(today.getMilliseconds()).padStart(3, "0");
    const date = `${yyyy}${mm}${dd}`;
    const time = `${h}:${m}:${s}.${ms}`;
    return { date, time };
  };

  LogMessage = (message, logLevel, functionName, fileName) => {
    if (logLevel.value > this.minLogLevel.value) {
      const { date, time } = getDateTime();
      const logMessage = `${time}; ${logLevel.description}; ${message}; ${functionName}; ${fileName};`;
      const filePathName = `${this.applicationName}-${date}.log`;

      fs.appendFile(
        this.path + filePathName,
        logMessage + " \r\n",
        "utf-8",
        function (err) {
          if (err) throw err;
        }
      );

      this.logInConsole && console.log(logMessage);
    }
  };

  return Object.freeze({ LogMessage });
}

var LogLevels = Object.freeze({
  debug: { value: 1, description: "DEBUG" },
  info: { value: 2, description: "INFO" },
  warning: { value: 3, description: "WARNING" },
  error: { value: 4, description: "ERROR" },
});

module.exports = { Log, LogLevels };

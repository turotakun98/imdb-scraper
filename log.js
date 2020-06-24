const fs = require("fs");

var Log = (function () {
  var instance;

  function init(path, applicationName, minLogLevel, logInConsole) {
    var path = path;
    var applicationName = applicationName;
    var minLogLevel = LogLevels[minLogLevel];
    var logInConsole = logInConsole;

    function getDateTime() {
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
    }

    function LogMessage(
      message,
      logLevel = minLogLevel,
      functionName = "",
      fileName = ""
    ) {
      if (logLevel.value >= minLogLevel.value) {
        const { date, time } = getDateTime();
        const logMessage = `${time}; ${logLevel.description}; ${message}; ${functionName}; ${fileName};`;
        const filePathName = `${applicationName}-${date}.log`;

        fs.appendFile(
          path + filePathName,
          logMessage + " \r\n",
          "utf-8",
          function (err) {
            if (err) throw err;
          }
        );

        logInConsole && console.log(logMessage);
      }
    }

    return { LogMessage };
  }

  return {
    createLogger: function ({
      path = "./",
      applicationName = "defaultAppName",
      minLogLevel = LogLevels.info,
      logInConsole = true,
    } = {}) {
      if (!instance) {
        instance = init(path, applicationName, minLogLevel, logInConsole);
      }
      return instance;
    },
  };
})();

var LogLevels = Object.freeze({
  debug: { value: 1, description: "DEBUG" },
  info: { value: 2, description: "INFO" },
  warning: { value: 3, description: "WARNING" },
  error: { value: 4, description: "ERROR" },
});

module.exports = { Log, LogLevels };

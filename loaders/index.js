const expressLoader = require("./express");
const { Log, LogLevels } = require("./log");
const config = require("../config/config");

async function _default({ expressApp: app }) {
    const Logger = Log.createLogger({
        path: config.logPath,
        applicationName: config.applicationName,
        minLogLevel: config.minLogLevel,
        logInConsole: config.logInConsole,
    });

    await expressLoader({ expressApp: app });
    Logger.LogMessage("Express loaded", LogLevels.info, "default", "loaders/index.js");
}

module.exports = _default;

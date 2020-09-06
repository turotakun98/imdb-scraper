const { Log, LogLevels } = require("./loaders/log");
const express = require("express");
const config = require("./config/config");
const loader = require("./loaders");

async function startServer() {
    const app = express();
    await loader({ expressApp: app });
    const Logger = Log.createLogger();

    app.listen(config.port, (err) => {
        if (err) {
            Logger.LogMessage("Appplication start", LogLevels.error, "startServer", "app.js");
            process.exit(1);
        }
        Logger.LogMessage(
            `################################################
            🛡️  Server listening on port: ${config.port} 🛡️ 
            ################################################`,
            LogLevels.info,
            "startServer",
            "app.js"
        );
    });
}

startServer();

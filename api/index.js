const { Router } = require("express");
const series = require("./routes/series");
const episodes = require("./routes/episodes");
const titles = require("./routes/titles");

// guaranteed to get dependencies
function _default() {
    const app = Router();
    series(app);
    episodes(app);
    titles(app);

    return app;
}

module.exports = _default;

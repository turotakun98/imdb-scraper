const ScaperService = require("./scraper");
const ch = require("cheerio");
const { Log, LogLevels } = require("../loaders/log");
const EpisodeInfo = require("../models/episodeInfo");
var EpisodesService = function () {
    const ScaperServiceInstance = new ScaperService();
    const Logger = Log.createLogger();

    async function getSeasonEpisodesByYear(title, year) {
        var episodesList = [];

        try {
            const url = `https://www.imdb.com/title/${title}/episodes/_ajax?year=${year}`;
            let html = await ScaperServiceInstance.getHtmlFromUrl(url);

            const $ = ch.load(html);

            $(".list_item").each((i, el) => {
                var title = $(el).find(".image > a").attr("title");
                var link = $(el).find(".image > a").attr("href");
                var epNumber = $(el).find(".image > a > div > div").text();
                if (!epNumber) {
                    epNumber = $(el).find(".image > div > div").text();
                }
                var airdate = $(el).find(".info > .airdate").text();
                var dateRaw = Date.parse(airdate);
                dateRaw = new Date(dateRaw);
                var year = dateRaw.getFullYear();

                var images = $(el).find(".hover-over-image > img");
                var imageLink = "";
                if (images.length > 0) {
                    imageLink = images[0].attribs.src;
                }

                var ratingCountRaw = $(el).find(".ipl-rating-star__total-votes").first().text().trim();
                var ratingCount = ratingCountRaw.substring(1, ratingCountRaw.length - 1);
                var rating = $(el).find(".ipl-rating-star__rating").first().text();

                try {
                    var episode = new EpisodeInfo(title, link, imageLink, epNumber, year, rating, ratingCount);
                    episodesList.push(episode);
                    Logger.LogMessage(episode.toString(), LogLevels.info, "getSeasonInfoByYear", "services/episodes.js");
                } catch (e) {
                    Logger.LogMessage(
                        `Error trying to save Episode (${title}, ${link}, ${epNumber}, ${year}, ${rating})`,
                        LogLevels.error,
                        "getSeasonInfoByYear",
                        "services/episodes.js"
                    );
                }
            });
        } catch (e) {
            Logger.LogMessage(`Error in function 'getSeasonInfoByYear': ${e}`, LogLevels.error, "getSeasonInfoByYear", "services/episodes.js");
        }

        return episodesList;
    }

    async function getEpisodesList(idImdb, years) {
        listRes = [];
        const yearsMap = years.map((v) => getSeasonEpisodesByYear(idImdb, v));

        for await (const year of yearsMap) {
            listRes = listRes.concat(year);
        }

        return listRes;
    }

    return {
        getSeasonEpisodesByYear,
        getEpisodesList,
    };
};

module.exports = EpisodesService;

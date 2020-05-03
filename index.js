const request = require("request");
const rp = require("request-promise");
const ch = require("cheerio");
const EpisodeInfo = require("./episodeInfo");
const TitleInfo = require("./titleInfo");
const SeriesInfo = require("./seriesInfo");
const cors = require("cors");
const express = require("express");
const app = express();

app.use(express.json());
app.use(cors());
var port = 9000;
app.listen(port, () => console.log(`Listening on port ${port}...`));

app.get("/titleList/:t", async (req, res) => {
  console.log("new request titleList for title: " + req.params.t);

  if (req.params.t) {
    var seriesResponse = [];

    var url = `https://sg.media-imdb.com/suggests/${req.params.t[0]}/${req.params.t}.json`;
    var callResp = await callHttpMethod(url);

    var respBody = callResp.body;
    var replHead = "imdb$" + req.params.t + "(";
    respBody = respBody.replace(replHead, "");
    respBody = respBody.substring(0, respBody.length - 1);
    var respJson = JSON.parse(respBody).d;
    respJson.forEach((el) => {
      if (el["q"] == "TV series") {
        var image = null;
        if (el["i"]) image = el["i"][0];

        var series = new TitleInfo(el["id"], el["l"], el["yr"], image);
        seriesResponse.push(series);
      }
    });

    res.send(seriesResponse);
  } else {
    res.send("Invalid field t (Title)");
  }
});

app.get("/seriesInfo/:id", async (req, res) => {
  console.log("new request seriesInfo! idImdb: ", req.params.id);

  const url = `https://www.imdb.com/title/${req.params.id}`;

  console.log("Require HTML for the url: ", url);
  let html = await getHtmlFromUrl(url);
  console.log("(3) Html received");

  var attrGenres = ".see-more.inline.canwrap";
  var genres = await getFilteredHtml(html, attrGenres, true, "a", 1);
  console.log("genres", genres);

  var attrPlot = ".summary_text";
  var plot = await getFilteredHtml(html, attrPlot, true, null, 0);
  console.log("plot", plot);

  var attrRate = "*[itemprop = 'ratingValue']";
  var rate = await getFilteredHtml(html, attrRate, true, null, 0);
  console.log("rate", rate);

  var attrRateCount = "*[itemprop = 'ratingCount']";
  var rateCount = await getFilteredHtml(html, attrRateCount, true, null, 0);
  console.log("rateCount", rateCount);

  var seriesInfo = new SeriesInfo(
    req.params.id,
    genres,
    plot[0],
    rate[0],
    rateCount[0]
  );

  res.send(seriesInfo);
});

app.get("/episodesList/:id", async (req, res) => {
  console.log("new request episodesList! idImdb: " + req.params.id);

  var d = new Date();

  const url = `https://www.imdb.com/title/${
    req.params.id
  }/episodes/_ajax?year=${d.getFullYear()}`;
  console.log("Require HTML for the url: " + url);

  let html = await getHtmlFromUrl(url);
  console.log("(3) Html received");

  var attrFilterYear = "#byYear > option";
  var years = await getFilteredHtml(html, attrFilterYear, false, null, 0);

  var listRes = [];
  listRes = await getEpisodesList(req.params.id, years);

  res.send(listRes);
});

// FUNCTIONS
async function getEpisodesList(idImdb, years) {
  listRes = [];
  const yearsMap = years.map((v) => getSeasonInfoByYear(idImdb, v));

  for await (const year of yearsMap) {
    listRes = year;
  }

  return listRes;
}

async function callHttpMethod(url) {
  return new Promise((result) => {
    console.log("Requesting api");
    let a = request.get(url, (error, res, body) => {
      if (error) {
        console.error(error);
        return;
      }
      result(res);
      console.log(`Api statusCode: ${res.statusCode}`);
    });
  });
}

async function getFilteredHtml(
  html,
  filterAttributes,
  searchChilds,
  attributeChildsType,
  startAttributeIndex
) {
  var results = [];

  var childNodes = ch(filterAttributes, html);
  for (let i = startAttributeIndex; i < childNodes.length; i++) {
    var childAttr = [];

    childAttr = searchChilds
      ? getValueChildrens(childNodes[i], attributeChildsType)
      : [childNodes[i].attribs.value];

    results = results.concat(childAttr);
  }

  console.log("Res:" + results);

  return results;
}

function getValueChildrens(parent, filter) {
  if (!parent.nodeValue || parent.nodeValue.trim() == "") {
    if (parent.childNodes) {
      var res = [];
      for (var i = 0; i < parent.childNodes.length; i++) {
        var resTmp = [];
        if (filter && filter == parent.childNodes[i].tagName) {
          resTmp = getValueChildrens(parent.childNodes[i].firstChild, filter);
        }
        if (!filter) {
          resTmp = getValueChildrens(parent.childNodes[i], null);
        }

        if (resTmp.length > 0) {
          res = res.concat(resTmp);
        }
      }
      return res;
    } else {
      return [""];
    }
  } else {
    return [parent.nodeValue.trim()];
  }
}

async function getSeasonInfoByYear(title, year) {
  episodesList = [];

  try {
    const url = `https://www.imdb.com/title/${title}/episodes/_ajax?year=${year}`;
    let html = await getHtmlFromUrl(url);

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

      var rating = $(el).find(".ipl-rating-star__rating").first().text();
      try {
        var episode = new EpisodeInfo(title, link, epNumber, year, rating);
        episodesList.push(episode);
        console.log(episode.toString());
      } catch (e) {
        console.log(
          `Error trying to save Episode (${title}, ${link}, ${epNumber}, ${year}, ${rating})`
        );
      }
    });
  } catch (e) {
    console.log("Error in function 'getSeasonInfoByYear': " + e);
  }

  return episodesList;
}

async function getSeasonInfoByNumber(title, season) {
  const url = `https://www.imdb.com/title/${title}/episodes/_ajax?season=${season}`;
  let html = await getHtmlFromUrl(url);
}

function getHtmlFromUrl(url) {
  console.log("(1) HTML reading ...");
  return new Promise((result) => {
    rp(url)
      .then(function (html) {
        console.log("(2) HTML read");
        result(html);
      })
      .catch(function (err) {
        console.log(err);
      });
  });
}

class EpisodeInfo {
  constructor(title, link, numberAndSeason, year, rating) {
    this.title = title;
    this.link = link;
    this.rating = rating;
    this.year = year;
    this.setNumberSeason = numberAndSeason;
  }

  set setNumberSeason(numberAndSeasons) {
    //Example S2, Ep12
    var res = numberAndSeasons.split(",");
    var season = res[0].trim().substr(1);
    var episode = res[1].trim().substr(2);

    this.number = episode;
    this.season = season;
  }
}

EpisodeInfo.prototype.toString = function episodeToString() {
  var ret = `S${this.season}, Ep${this.number}, Date ${this.airdate} ${this.rating} : '${this.title}'`;
  return ret;
};

module.exports = EpisodeInfo;

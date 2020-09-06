class TitleInfo {
  constructor(idImdb, title, years, imageLink) {
    this.idImdb = idImdb;
    this.title = title;
    this.years = years;
    this.imageLink = imageLink;
  }
}

TitleInfo.prototype.toString = function serieToString() {
  var ret = `Id: ${this.idImdb}, ${this.title} (${this.years}) '${this.imageLink}'`;
  return ret;
};

module.exports = TitleInfo;

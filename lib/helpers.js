

module.exports = {
  pluralize: function(word) {
    if (!word.match(/s$/)) {
      word += 's';
    }
    return word;
  }
};

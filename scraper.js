var nodeio = require('node.io');

exports.job = new nodeio.Job({
  auto_retry: true,
  timeout: 10,
  retries: 1
}, {
  input: false,
  run: function() {
    this.getHtml('https://developer.apple.com/support/system-status/', function(err, $, data, headers) {
      if (err) {
        this.fail(err);
        return;
      }
      var statuses = [];
      $('table.status-table td').each(function(el) {
        var status = {};
        switch (el.attribs.class) {
          case 'online':
            var link = $('span a', el);
            status.name = link.text;
            status.href = link.attribs.href;
            status.online = true;
            break;
          case 'offline':
            status.name = $('span', el).text;
            status.online = false;
            break;
        }
        statuses.push(status);
      });
      this.emit(statuses);
    });
  }
});
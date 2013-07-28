var nodeio = require('node.io');
var redis = require('redis');
var scraper = require('./scraper');

var INTERVAL = process.env.INTERVAL || (1000 * 3); // 15min
var STATUS_KEY = 'status';

var redis_config = {};
if (process.env.REDISTOGO_URL) {
  redis_config = require('url').parse(process.env.REDISTOGO_URL);
}

var redis = require('redis').createClient(redis_config.port, redis_config.hostname);
if (redis_config.auth) {
  redis.auth(redis_config.auth.split(':')[1]);
}

function process_status(err, current_status) {
  if (err) {
    return error(err);
  }

  if (!current_status.length) {
    return error(err);
  }

  // Generate keys for the status
  current_status = generate_keys(current_status);

  // Check if we have a previous status and if these are new
  redis.hgetall(STATUS_KEY, function(err, previous_status) {
    if (err) {
      return error(err);
    }

    if (previous_status) {
      if (compare(current_status, previous_status)) {
        console.log("Changed");
      } else {
        console.log('Unchanged');
      }
    } else {
      console.warn('Missing status history');
    }

    // Save status history
    redis.hmset(STATUS_KEY, generate_pairs(current_status), function(err) {
      if (err) {
        return error(err);
      }

      setTimeout(scrape, INTERVAL);
    });
  });
}

function scrape() {
  nodeio.start(scraper.job, process_status, true);
}

function error(err) {
  console.error(err);
  setTimeout(scrape, INTERVAL);
}

function compare(status, previous) {
  return status.some(function(status) {
    return previous[status.key] !== status.online;
  });
}

function generate_pairs(status) {
  var status_values = {};
  status.forEach(function(status) {
    status_values[status.key] = status.online;
  });
  return status_values;
}

function generate_keys(status) {
  return status.map(function(status) {
    status.key = status.name.toLowerCase().replace(/\W+/g, '');
    status.online = status.online.toString();
    return status;
  });
}

scrape();
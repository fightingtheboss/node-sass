/*!
 * node-sass: scripts/install.js
 */

var fs = require('fs'),
    mkdir = require('mkdirp'),
    npmconf = require('npmconf'),
    path = require('path'),
    request = require('request'),
    pkg = require('../package.json');

require('../lib/extensions');

console.log("VERSIONS:", process.versions);

/**
 * Download file, if succeeds save, if not delete
 *
 * @param {String} url
 * @param {String} dest
 * @param {Function} cb
 * @api private
 */

function download(url, dest, cb) {
  var reportError = function(err) {
    cb(['Cannot download "', url, '": ',
      typeof err.message === 'string' ? err.message : err].join(''));
  };
  
  var successful = function(response) {
    return response.statusCode >= 200 && response.statusCode < 300;
  };

  applyProxy({ rejectUnauthorized: false }, function(options) {
    options.headers = {
      'User-Agent': [
        'node/', process.version, ' ',
        'node-sass-installer/', pkg.version
      ].join('')
    };

    console.log('Headers: ', options);
    console.log('Starting download...');
    
    try {
      request(url, options, function(err, response) {
        if (err) {
          reportError(err);
        } else if (!successful(response)) {
          reportError(['HTTP error', response.statusCode, response.statusMessage].join(' '));
        } else {
          console.log('Request complete, calling callback.');
          cb();
        }
      }).on('response', function(response) {
          if (successful(response)) {
            console.log('Response received, writing file to disk.');
            response.pipe(fs.createWriteStream(dest));
          }
      });
    } catch (err) {
      console.log('An error occurred!\n', err);
      cb(err);
    }
  });
}

/**
 * Get applyProxy settings
 *
 * @param {Object} options
 * @param {Function} cb
 * @api private
 */

function applyProxy(options, cb) {
  npmconf.load({}, function (er, conf) {
    var proxyUrl;

    if (!er) {
      proxyUrl = conf.get('https-proxy') ||
                 conf.get('proxy') ||
                 conf.get('http-proxy');
    }

    var env = process.env;

    options.proxy = proxyUrl ||
                    env.HTTPS_PROXY ||
                    env.https_proxy ||
                    env.HTTP_PROXY ||
                    env.http_proxy;

    cb(options);
  });
}

/**
 * Check and download binary
 *
 * @api private
 */

function checkAndDownloadBinary() {
  try {
    console.log('Checking for binary path');
    process.sass.getBinaryPath(true);
    return;
  } catch (e) { }

  console.log('Binary not found. Let\'s create the ' + process.sass.binaryPath + ' vendor directory to store it.' );
  
  mkdir(path.dirname(process.sass.binaryPath), function(err) {
    if (err) {
      console.error(err);
      console.log('There was an error creating the directory!\n', err);
      return;
    }

    console.log(process.sass.binaryPath, ' created successfully.' );

    download(process.sass.binaryUrl, process.sass.binaryPath, function(err) {
      if (err) {
        console.error(err);
        console.log('Error in download.\n', err);
        return;
      }

      console.log('Binary downloaded and installed at', process.sass.binaryPath);
    });
  });
}

/**
 * Skip if CI
 */

if (process.env.SKIP_SASS_BINARY_DOWNLOAD_FOR_CI) {
  console.log('Skipping downloading binaries on CI builds');
  return;
}

/**
 * If binary does not exsit, download it
 */

checkAndDownloadBinary();

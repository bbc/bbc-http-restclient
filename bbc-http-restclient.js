var http = require('http');
var https = require('https');
var url = require('url');
var extend = require('util')._extend;

http.globalAgent.maxSockets = 100;



function RestClient(options) {
    this.defaults = options || {};
    this.cacheManager = require('./lib/cacheManager');
}


RestClient.prototype.request = function (_options) {
    var options = extend({}, this.defaults);
    for(var i in _options) {
        options[i] = _options[i];
    }

    var parsedUrl = url.parse(options.url);
    var isSSL = parsedUrl.protocol == "https:";
    var contents = "";
    try {
        var http_options = {
            host: parsedUrl.hostname,
            path: parsedUrl.path,
            port: parsedUrl.port || ((isSSL) ? 443 : 80),
            agent: false,
            strictSSL: false,
            http_module: http,
            method: options.method,
            headers: options.headers
        }

        if (isSSL) {
            if (options.ca) http_options.ca = options.ca;
            if (options.cert) http_options.cert = options.cert;
            if (options.key) http_options.key = options.key;
            if (options.pfx) http_options.pfx = options.pfx;
            if (options.passphrase) http_options.passphrase = options.passphrase;
            http_options.http_module = https;
        }

        this.checkCache(options.cache, http_options, function (obj) {
            if (obj) {
                options.success(null, obj);
                return;
            }
            if (options.cache) {
                this.cacheManager.reserveCacheSpace(http_options);
            }
            var body = options.body || null;
            if(isSSL) {
                if (this.defaults.proxy || options.proxy) {
                    var _proxy = this.defaults.proxy || options.proxy;
                    var connectReq = http.request({
                        host: _proxy.host,
                        port: _proxy.port,
                        method: 'CONNECT',
                        path: parsedUrl.hostname
                    }).on('connect', function (res, socket, head) {
                        http_options.socket = socket;
                        var req = this._makeRequest(http_options, body, options, this);
                    }.bind(this)).end();
                }
                else {
                    this._makeRequest(http_options, body, options, this);
                }
            }
            else {
                if (this.defaults.proxy || options.proxy) {
                    http_options.path = options.url;
                    http_options.host = options.proxy.host;
                    http_options.port = options.proxy.port;
                }
                this._makeRequest(http_options, body, options, this);
            }
        }.bind(this));
    }
    catch (e) {
        console.log(e);
    }
}

RestClient.prototype.checkCache = function (enableCache, http_options, callback) {
    if (enableCache) {
        this.cacheManager.getItemFromCache(http_options, function (obj) {
            callback(obj);
        }.bind(this));
    }
    else {
        callback(null);
    }
}

RestClient.prototype._makeRequest = function (http_options, body, options, restClient) {
    if (!http_options.method) {
        http_options.method = "GET";
    }

    http_options.headers = http_options.headers || {};

    if (body) {
        var length = typeof(body) == 'string' ? Buffer.byteLength(body) : body.length;
        http_options.headers['Content-Length'] = length;
    }

    var req = http_options.http_module.request(http_options);

    if (body) {
        req.write(body);
    }

    this._processResponse(req, options, http_options, restClient);

    return req;
}


RestClient.prototype._processResponse = function (request, options, http_options) {
    var contents = new Buffer(0);
    var self = this;
    request.on('response', function (response) {
        response.on('data', function (data) {
            contents = Buffer.concat([contents, data]);
        });

        response.on("end", function () {
            if (response.statusCode < 200 || response.statusCode >= 300) {
                if (options.error) {
                    options.error(response, contents);
                }
            }
            else {
                var obj = self.cacheManager.addItemToCache(contents, http_options);
                if (options.success) {
                    options.success(response, contents);
                }
            }
        });
    });

    request.on('error', function (e) {
        console.log("Error in bbc-http-restclient. Message follows: ");
        console.log(e);
        self.cacheManager.unReserveCacheSpace(http_options);
        if (options.error) {
            options.error(request, e);
        }
    });

    request.end();
}


module.exports = RestClient;

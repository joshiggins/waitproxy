#!/usr/bin/env node

var winston = require('winston');
var httpProxy = require('http-proxy');
var browser = require('browser-detect');
var wol = require('node-wol');
var fs = require('fs');
var path = require('path');


var WaitProxy = function (port, targetip, targetmac) {
    // logger
    this.logger = logger = new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({
                timestamp: true,
                colorize: true,
                level: 'debug'
            })
        ]
    });
    // vars
    this.port = port;
    this.targetip = targetip;
    this.targetmac = targetmac;
    this.waitpage = "";
    this.failcount = {};
    this.failmax = 5;
    // create the server
    this.proxy = httpProxy.createServer({
        target: targetip
    });
    // other init tasks
    this._load_wait_page();
    // attach event handlers
    this.proxy.on('error', this._handle_error.bind(this));
    // done
    this.logger.info('sleeping proxy initialised on port', port);
    this.logger.info('target is', targetip, targetmac);
    if (!this.targetmac) {
        this.logger.warn("no mac addressed defined for target", targetip);
    }
};

WaitProxy.prototype.listen = function () {
    this.proxy.listen(this.port);
};

WaitProxy.prototype._load_wait_page = function () {
    var me = this;
    fs.readFile(__dirname + '/wait.html', function (err, data) {
        if (err) {
            me.logger.error("could not load wait.html");
            return;
        }
        me.waitpage = data.toString();
    });
};

WaitProxy.prototype._get_fail_count = function (method, url) {
    var key = path.join(method, url);
    if(key in this.failcount) {
        return this.failcount[key];
    } else {
        this.failcount[key] = 0;
        return 0;
    }
};

WaitProxy.prototype._inc_fail_count = function (method, url) {
    var key = path.join(method, url);
    if(key in this.failcount) {
        this.failcount[key]++;
    } else {
        this.failcount[key] = 1;
    }
};

WaitProxy.prototype._reset_fail_count = function (method, url) {
    var key = path.join(method, url);
    this.failcount[key] = 0;
};

WaitProxy.prototype._handle_error = function (err, req, res) {
    if (this._get_fail_count(req.method, req.url) > this.failmax) {
        this.logger.error("request", req.method, req.url, "failed after", this.failmax, "attempts");
        res.writeHead(500, {
            'Content-Type': 'text/html'
        });
        res.end('<body>Something went wrong</body>');
        this._reset_fail_count(req.method, req.url);
        return;
    }
    // there was an error connecting to the target
    // did we already trigger it to boot up
    // if not, trigger it now
    if(this.targetmac) {
        wol.wake(this.targetmac);
    }
    // if we are a browser, return the wait page
    var browsertest = browser(req.headers['user-agent']);
    if (browsertest.name) {
        this.logger.debug("browser request for", req.method, req.url, "attempt", this._get_fail_count(req.method, req.url));
        this._inc_fail_count(req.method, req.url);
        res.writeHead(200, {
            'Content-Type': 'text/html'
        });
        return res.end(this.waitpage);
    }
    // otherwise, send a 102 response and follow up with response from target
    res.writeHead(102);
    res.end();
    setTimeout(function() {
        res.writeHead(200, {
            'Content-Type': 'text/plain'
        });
        res.end("hello");
    }, 2000);
};


if (require.main === module) {
    var proxy = new WaitProxy(process.argv[2], process.argv[3]);
    proxy.listen();
} else {
    module.exports = WaitProxy;
}
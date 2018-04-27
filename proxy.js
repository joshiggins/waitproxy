#!/usr/bin/env node

var httpProxy = require('http-proxy');
var browser = require('browser-detect');
var fs = require('fs');


var WaitProxy = function (port, target) {
    // vars
    this.port = port;
    this.target = target;
    this.waitpage = "";
    this.failcount = 0;
    // create the server
    this.proxy = httpProxy.createServer({
        target: target
    });
    // other init tasks
    this._load_wait_page();
    // attach event handlers
    this.proxy.on('error', this._handle_error.bind(this));
};

WaitProxy.prototype.listen = function () {
    this.proxy.listen(this.port);
};

WaitProxy.prototype._load_wait_page = function () {
    var me = this;
    fs.readFile(__dirname + '/wait.html', function (err, data) {
        if (err) {
            console.log("Could not load wait.html");
            return;
        }
        me.waitpage = data.toString();
    });
};

WaitProxy.prototype._handle_error = function (err, req, res) {
    if (this.failcount > 5) {
        res.writeHead(500, {
            'Content-Type': 'text/html'
        });
        return res.end('<body>Something went wrong</body>');
    }
    // there was an error connecting to the target
    // did we already trigger it to boot up
    // if not, trigger it now
    // if we are a browser, return the wait page
    var browsertest = browser(req.headers['user-agent']);
    if (browsertest.name) {
        this.failcount += 1;
        res.writeHead(200, {
            'Content-Type': 'text/html'
        });
        return res.end(this.waitpage);
    }
    // otherwise, send a 102 response and follow up with response from target

};


if (require.main === module) {
    var proxy = new WaitProxy(process.argv[2], process.argv[3]);
    proxy.listen();
} else {
    module.exports = WaitProxy;
}
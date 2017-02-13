var path = require('path');
var crypto = require('crypto');
var http = require('http');
var https = require('https');
var url = require('url');

var express = require('express');

var app = express();

var prefix = '<html><head><title>pagehash</title></head><body>';
var suffix = '</body></html>';

function getHTML(options, onResult) {

    var prot = options.port == 443 ? https : http;
    options.headers.Connection = 'keep-alive';
    var req = prot.request(options, function(res) {
        var output = '';
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
            if (res.statusCode >= 300 && res.statusCode < 400 && hasHeader('location', res.headers)) {
                // handle redirects, as per request module
                var location = res.headers[hasHeader('location', res.headers)];
                var locUrl = url.parse(location);
                options.path = locUrl.pathname;
                options.hostname = locUrl.host;
                options.port = locUrl.port;
                console.log('Redirecting to '+options.path);
                getHTML(options, onResult);
            }
            else {
                onResult(res.statusCode, output);
            }
        });
    });

    req.on('error', function(err) {
        onResult(500,'error: ' + err.message + ' ' + output);
    });

    req.end();
}

function sha1(s) {
	var shasum = crypto.createHash('sha1');
	shasum.update(s);
	return shasum.digest('hex');
}

function md5(s) {
	var shasum = crypto.createHash('md5');
	shasum.update(s);
	return shasum.digest('hex');
}

function respond(req,res,hash){
	if (req.params.hash == 'sha1') hash = sha1(hash);
	if (req.params.hash == 'md5') hash = md5(hash);
	res.send(prefix+hash+suffix);
}

app.get('/:hash', function(req,res) {
	var hash = '';
	console.log('query: '+JSON.stringify(req.query,null,2));
	if (req.query.q) {
		var options = {};
		var u = url.parse(req.query.q);
		options.hostname = u.hostname;
		options.port = u.port ? u.port : (u.protocol.startsWith('https') ? 443 : 80); 
		options.method = 'GET';
		options.headers = {};
		options.headers.Accept = 'text/html';
		options.headers["Content-Type"] = 'text/html';
		options.path = u.pathname;

		console.log('URL: '+JSON.stringify(u,null,2));
		console.log('opt: '+JSON.stringify(options,null,2));

		getHTML(options,function(statusCode,d){
			respond(req,res,d);
		});
	}
	else respond(req,res,hash);
});

var myport = process.env.PORT || 3001;
if (process.argv.length>2) myport = process.argv[2];

var server = app.listen(myport, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log('pagehash server listening at http://%s:%s', host, port);
});

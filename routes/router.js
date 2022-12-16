const path = require('path');
const geoip = require('geoip-lite');
const inputReader = require('wait-console-input');
const { SHA3 } = require('sha3');
const md5 = require('md5');
const session = require('express-session');
const swig = require('swig');
const ipRangeCheck = require('ip-range-check');
const bodyParser = require('body-parser');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const jquery = require('jquery');
const diff = require('../cemerick-jsdifflib.js');
const cookieParser = require('cookie-parser');
const http = require('http');
const child_process = require('child_process');
const captchapng = require('captchapng');
const sha224 = require('sha224');

const express = require('express');
const router = express.Router();
const hostconfig = require('../hostconfig');
const functions = require('../functions');
const markdown = require('../namumark');
for(var item in functions) global[item] = functions[item];

for(var src of fs.readdirSync('./routes', { withFileTypes: true }).filter(dirent => !dirent.isDirectory()).map(dirent => dirent.name)) {
	if(src.toLowerCase() == 'router.js') continue;
    eval(fs.readFileSync('./routes/' + src).toString());
}

module.exports = router;

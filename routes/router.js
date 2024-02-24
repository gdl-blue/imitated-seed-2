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
const diff = require('../cemerick-jsdifflib.js');
const cookieParser = require('cookie-parser');
const child_process = require('child_process');
const captchapng = require('captchapng');
const nodemailer = require('nodemailer');

const express = require('express');
const router = express.Router();
const hostconfig = require('../hostconfig');
const functions = require('../functions');
const markdown = require('../namumark');
const http = require('http');
for(var item in functions) global[item] = functions[item];

for(var src of fs.readdirSync('./routes', { withFileTypes: true }).filter(f => !(fs.statSync('./routes/' + f).isDirectory())).map(dirent => dirent.name || dirent)) {
	if(src.toLowerCase() == 'router.js') continue;
    eval(fs.readFileSync('./routes/' + src).toString());
}

module.exports = router;

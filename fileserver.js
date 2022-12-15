/* 병아리 엔진 - the seed 모방 프로젝트 */

const http = require('http');
const https = require('https');
const path = require('path');
const geoip = require('geoip-lite');
const inputReader = require('wait-console-input');
const { SHA3 } = require('sha3');
const md5 = require('md5');
const express = require('express');
const session = require('express-session');
const swig = require('swig');
const ipRangeCheck = require('ip-range-check');
const bodyParser = require('body-parser');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const jquery = require('jquery');
const diff = require('./cemerick-jsdifflib.js');
const cookieParser = require('cookie-parser');
const child_process = require('child_process');
const captchapng = require('captchapng');
const router = require('./routes/router');
const sha224 = require('sha224');

function print(x) { console.log(x); }
function prt(x) { process.stdout.write(x); }

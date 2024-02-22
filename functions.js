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
const multer = require('multer');
const nodemailer = require('nodemailer');
const upload = multer();  // 파일 올리기 모듈

const database = require('./database');
for(var item in database) global[item] = database[item];
const hostconfig = require('./hostconfig');

const timeFormat = 'Y-m-d H:i:s';  // 날짜 및 시간 기본 형식
const _ = undefined;

const floorof = Math.floor;
const randint = (s, e) => floorof(Math.random() * (e + 1 - s) + s);

String.prototype.splice = function splice(s, l, r) {
	return this.substr(0, s) + r + this.substr(s + l, this.length);
};

Array.prototype.remove = function remove(item) {
	const idx = this.indexOf(item);
	if(idx >= 0) return this.splice(idx, 1);
	return false;
};

// 더 시드 모방 버전 (나중에 config.json에서 불러옴)
const version = {
	major: 4,
	minor: 12,
	revision: 0,
};

if(hostconfig.theseed_version) {
	var sp = hostconfig.theseed_version.split('.');
	version.major = Number(sp[0]);
	version.minor = Number(sp[1]);
	version.revision = Number(sp[2]);
}

// 로그출력
function print(x) { console.log(x); }
function prt(x) { process.stdout.write(x); }

var wikiconfig = {};  // 위키 설정 캐시
var permlist = {};  // 권한 캐시
var userset = {};  // 사용자 설정 캐시
var skinList = [];  // 스킨 목록 캐시
var skincfgs = {};  // 스킨 구성설정 캐시
var apiTokens = {};  // API 편집 토큰

var loginHistory = {};
var neededPages = {};
var aclgroupCache = { css: {}, group: {} };

// https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
// 무작위 문자열 생성
function rndval(chars, length) {
	var result           = '';
	var characters       = chars;
	var charactersLength = characters.length;
	for ( var i = 0; i < length; i++ ) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

function nullCoalesce(x, y) {
	if(x == null) return y;
	return x;
}

const cssColors = ['Black', 'Gray', 'Grey', 'Silver', 'White', 'Red', 'Maroon', 'Yellow', 'Olive', 'Lime', 'Green', 'Aqua', 'Cyan', 'Teal', 'Blue', 'Navy', 'Magenta', 'Fuchsia', 'Purple', 'DimGray', 'DimGrey', 'DarkGray', 'DarkGrey', 'LightGray', 'LightGrey', 'Gainsboro', 'WhiteSmoke', 'Brown', 'DarkRed', 'FireBrick', 'IndianRed', 'LightCoral', 'RosyBrown', 'Snow', 'MistyRose', 'Salmon', 'Tomato', 'DarkSalmon', 'Coral', 'OrangeRed', 'LightSalmon', 'Sienna', 'Seashell', 'Chocolate', 'SaddleBrown', 'SandyBrown', 'PeachPuff', 'Peru', 'Linen', 'Bisque', 'DarkOrange', 'BurlyWood', 'AntiqueWhite', 'Tan', 'NavajoWhite', 'BlanchedAlmond', 'PapayaWhip', 'Moccasin', 'Orange', 'Wheat', 'OldLace', 'FloralWhite', 'DarkGoldenRod', 'GoldenRod', 'CornSilk', 'Gold', 'Khaki', 'LemonChiffon', 'PaleGoldenRod', 'DarkKhaki', 'Beige', 'Ivory', 'LightGoldenRodYellow', 'LightYellow', 'OliveDrab', 'YellowGreen', 'DarkOliveGreen', 'GreenYellow', 'Chartreuse', 'LawnGreen', 'DarkGreen', 'DarkSeaGreen', 'ForestGreen', 'HoneyDew', 'LightGreen', 'LimeGreen', 'PaleGreen', 'SeaGreen', 'MediumSeaGreen', 'SpringGreen', 'MintCream', 'MediumSpringGreen', 'MediumAquaMarine', 'Aquamarine', 'Turquoise', 'LightSeaGreen', 'MediumTurquoise', 'Azure', 'DarkCyan', 'DarkSlateGray', 'DarkSlateGrey', 'LightCyan', 'PaleTurquoise', 'DarkTurquoise', 'CadetBlue', 'PowderBlue', 'LightBlue', 'DeepSkyBlue', 'SkyBlue', 'LightSkyBlue', 'SteelBlue', 'AliceBlue', 'DodgerBlue', 'LightSlateGray', 'LightSlateGrey', 'SlateGray', 'SlateGrey', 'LightSteelBlue', 'CornFlowerBlue', 'RoyalBlue', 'DarkBlue', 'GhostWhite', 'Lavender', 'MediumBlue', 'MidnightBlue', 'SlateBlue', 'DarkSlateBlue', 'MediumSlateBlue', 'MediumPurple', 'RebeccaPurple', 'BlueViolet', 'Indigo', 'DarkOrchid', 'DarkViolet', 'MediumOrchid', 'DarkMagenta', 'Plum', 'Thistle', 'Violet', 'Orchid', 'MediumVioletRed', 'DeepPink', 'HotPink', 'LavenderBlush', 'PaleVioletRed', 'Crimson', 'Pink', 'LightPink'];
const cssColorMatches = cssColors.map(item => '#' + item.toLowerCase() + ' ');
const whtags = ['br', 'hr', 'div', 'span', 'ul', 'a', 'b', 'strong', 'del', 's', 'ins', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'font', 'dl', 'dt', 'dd', 'label', 'sup', 'sub'];
const whattr = {
	'*': ['style'],
	span: ['class'],
	a: ['href', 'class'],
	font: ['color', 'size', 'face'],
};

// 사용자 권한
var perms = [
	'delete_thread', 'admin', 'editable_other_user_document', 'suspend_account', 'ipacl', 
	'update_thread_status', 'acl', 'nsacl', 'hide_thread_comment', 'grant', 'no_force_recaptcha', 
	'disable_two_factor_login', 'login_history', 'update_thread_document', 'update_thread_topic', 
	'aclgroup', 'api_access', 
];
var disable_autoperms = ['disable_two_factor_login'];

if(version.minor >= 18) perms.remove('ipacl'), perms.remove('suspend_account');
else perms.remove('aclgroup');
if(version.minor >= 2) perms.remove('acl');
if(version.minor < 20) perms.remove('api_access');
if(version.minor >= 18) perms.remove('editable_other_user_document');
if(!(version.minor > 4 || (version.minor == 4 && version.revision >= 3))) { perms.remove('update_thread_document'); perms.remove('update_thread_topic'); }
if(!(version.minor > 0 || (version.minor == 0 && version.revision >= 20))) perms.push('developer', 'tribune', 'arbiter');
if(hostconfig.debug) perms.push('debug');

// 삐
function beep(cnt = 1) { // 경고음 재생
	for(var i=1; i<=cnt; i++)
		prt('');
}

// 입력받기
function input(prpt) {
	prt(prpt); // 일부러 이렇게. 바로하면 한글 깨짐.
	return inputReader.readLine('');
}

// SHA-3 암호화
function sha3(str, bit) {
    const hash = new SHA3(bit || 256);
    hash.update(str);
    return hash.digest('hex');
}

const random = {
    choice(x) {
        switch(typeof(x)) {
            case 'string':
                return rndval(x, 1);
            case 'object':
                return x[ Math.floor(Math.random() * x.length) ];
        }
    }
};

function findAll(regex, str, flags, sp, ep) {
	flags = flags || '';
	if(!regex.flags.includes('g'))
		regex = RegExp(regex.source, regex.flags + 'g');
	const ret = [];
	const func = flags.includes('reverse') ? 'unshift' : 'push';
	var match = null;
	while(match = regex.exec(str)) {
		if(sp !== undefined && match.index < sp) continue;
		if(ep !== undefined && match.index > ep) continue;
		ret[func](match);
	}
	return ret;
}

// 현재 시간 타임스탬프
function getTime() { return Math.floor(new Date().getTime()); };

// 시간 포맷
function toDate(t) {
	var cur = getTime();
	// 초 단위 시간 구분
	if(Math.abs(cur - Math.floor(Number(t)) * 1000) < Math.abs(cur - Math.floor(Number(t)))) {
		t = Number(t) * 1000;
	}
	var date = new Date(Number(t));
	
	var hour = date.getUTCHours(); hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getUTCMinutes(); min = (min < 10 ? "0" : "") + min;
    var sec  = date.getUTCSeconds(); sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getUTCFullYear();
    var month = date.getUTCMonth() + 1; month = (month < 10 ? "0" : "") + month;
    var day  = date.getUTCDate(); day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;
}

function toTime(t) {
	var cur = getTime();
	// 초 단위 시간 구분
	if(Math.abs(cur - Math.floor(Number(t)) * 1000) < Math.abs(cur - Math.floor(Number(t)))) {
		t = Number(t) * 1000;
	}
	var date = new Date(Number(t));
	
	var hour = date.getUTCHours(); hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getUTCMinutes(); min = (min < 10 ? "0" : "") + min;
    var sec  = date.getUTCSeconds(); sec = (sec < 10 ? "0" : "") + sec;

    return hour + ":" + min + ":" + sec;
}

// 시간 <time> 반환
function generateTime(time, fmt) {
	const d = time.split(' ')[0];
	const t = time.split(' ')[1];
	
	return `<time datetime="${d}T${t}.000Z" data-format="${fmt}">${time}</time>`;
}
generateTime.safe = true;

// 로그인 여부
function islogin(req) {
	if(req.session.username) return true;
	return false;
}

// 아이디 확인
function ip_check(req, forceIP) {
	if(!forceIP && req.session.username)
		return req.session.username;
	else
		return (req.headers['x-forwarded-for'] || (req.socket ? req.socket.remoteAddress : req.connection.remoteAddress) || req.ip || '10.0.0.9').split(',')[0];
}

// 사용자설정 가져오기
function getUserset(req, str, def = '') {
    str = str.replace(/^wiki[.]/, '');
	if(!islogin(req)) return def;
	const username = ip_check(req);
	
    if(!userset[username] || !userset[username][str]) {
        if(!userset[username]) userset[username] = {};
        userset[username][str] = def;
		curs.execute("insert into user_settings (username, key, value) values (?, ?, ?)", [username, str, def]);
        return def;
    }
    return userset[username][str];
}

function getUserSetting(username, str, def = '') {
    str = str.replace(/^wiki[.]/, '');
	
    if(!userset[username] || !userset[username][str]) {
        if(!userset[username]) userset[username] = {};
        userset[username][str] = def;
		curs.execute("insert into user_settings (username, key, value) values (?, ?, ?)", [username, str, def]);
        return def;
    }
    return userset[username][str];
}

// 더시드 엔진 4.16.0에 도입된 토론/편집요청 ID
function newID() {
    const a = [
        'A',
        'The',
    ];

    const b = [
        "Sleepy",
        "Giddy",
        "Smooth",
        'Beautiful',
        'Foamy',
        'Frightened',
        'Lazy',
        'Wonderful',
        'Happy',
        'Sad',
        'Broken',
        'Angry',
        'Mad',
        'Upset',
        'Red',
        'Blue',
        'Yellow',
        'Impossible',
        'Working',
        'Pretty',
        'Relaxed',
        'Cold',
        'Warm',
        'Hot',
        'Hard',
        'Loud',
        'Quiet',
        'New',
        'Old',
        'Clean',
        'Washable',
        'Open',
        'Closed',
        'Outdated',
        'Fixed',
        'Living',
        'Locked',
        'Unused',
        'Used',
        'Sold',
        'Sharp',
        'Smashed',
        'Crazy',
        'Free',
        'Fancy',
        'Ugly',
        'Big',
        'Small',
        'Fast',
        'Ugly',
        'Slow',
        'Dirty',
        'Unclassifiable',
        'Cloudy',
        'Solid',
        'Different',
        'Hungry',
        'Thirsty',
        'Boorish',
        'Funny',
        'Puffy',
        'Greasy',
        'Efficacious',
        'Functional',
        'Undesirable',
        'Naughty',
        'Gray',
        'Busy',
        'Acceptable',
        'Stormy',
        'Noisy',
    ];

    const c = [
        'And'
    ];

    const d = [
        "Station",
        "Discount",
        'Deer',
        "Soup",
        "Ice",
        "Recorder",
        "VPN",
        "Installer",
        "Uninstaller",
        "Bot",
        "Robot",
        "Power",
        "Point",
        "Music",
        'Event',
        'Cat',
        'Dog',
        'Phone',
        'Bush',
        'Music',
        'Picture',
        'Lion',
        'Angle',
        'Horse',
        'Mouse',
        'Pencil',
        'Box',
        'Bag',
        'Backpack',
        'Chicken',
        'CD',
        'DVD',
        'Diskette',
        'FloppyDisk',
        'Drive',
        'CPU',
        'Water',
        'Glass',
        'Memory',
        'USB',
        'Drive',
        'Number',
        'Letter',
        'Fan',
        'BIOS',
        'Video',
        'Button',
        'Trash',
        'Bottle',
        'Cylinder',
        'Ball',
        'Key',
        'Door',
        'Plug',
        'Flask',
        'Cable',
        'Radio',
        'File',
        'Disk',
        'Camera',
        'Titan',
        'Ash',
        'Tree',
        'Plank',
        'Script',
        'Day',
        'Car',
        'ATV',
        'Healer',
        'Fox',
        'Wolf',
        'Carrot',
        'Steak',
        'Mushroom',
        'Bandages',
        'Berry',
        'Tea',
        'Charcoal',
        'Limestone',
        'Iron',
        'Bar',
        'Nail',
        'Seed',
        'Fiber',
        'Leather',
        'Fur',
        'Aluminum',
        'Tungsten',
        'Transmission',
        'Wheel',
        'Fork',
        'Engine',
        'Transistor',
        'Plastic',
        'Wrench',
        'Gasoline',
        'Oil',
        'Pickaxe',
        'Hammer',
        'Campfire',
        'Garden',
        'Furnace',
        'Tower',
        'Houseplant',
        'Shirt',
        'Sneakers',
        'Helicopter',
        'Trap',
        'Card',
        'Jar',
        'Toy',
        'Jet',
        'Plane',
        'Statement',
        'Dimension',
        'Toothpaste',
        'Railway',
        'Year',
        'Stew',
        'Farm',
        'Zipper',
        'Horses',
        'Can',
        'Cabbage',
        'Eyes',
        'Motion',
        'Uncle',
        'Teeth',
        'Birthday',
        'Downtown',
    ];

    if(ver('4.16.1')) {
        pa = random.choice(b);
        pb = random.choice(b);
        pc = random.choice(b);
        pd = random.choice(d);

        if(pa == pb) pb = 'Soft';
        if(pa == pc) pc = 'Free';
        if(pb == pc) pc = 'Cold';
        return pa + pb + pc + pd;
    } else {
        pa = random.choice(a);
        pb = random.choice(b);
        pc = random.choice(c);
        pd = random.choice(b);
        pe = random.choice(d);
        if(['A', 'E', 'O', 'U', 'I'].includes(pb[0]) && pa == 'A')
			pa = 'An';
        if(pd == pb) pd = 'Soft';
        return pa + pb + pc + pd + pe;
	}
}

// 스택 (렌더러에 필요)
class Stack {
	constructor(arr) {
		this._internalArray = arr || [];
	}
	
	push(x) {
		return this._internalArray.push(x);
	}
	
	pop() {
		return this._internalArray.pop();
	}
	
	top() {
		return this._internalArray[this._internalArray.length - 1];
	}
	
	size() {
		return this._internalArray.length;
	}
	
	empty() {
		return !this._internalArray.length;
	}
	
	clear() {
		this._internalArray = [];
	}
};

class Queue {
	constructor(arr) {
		this._internalArray = arr || [];
	}
	
	push(x) {
		return this._internalArray.push(x);
	}
	
	pop() {
		var ret = this._internalArray[0];
		this._internalArray.splice(0, 1);
		return ret;
	}
	
	front() {
		return this._internalArray[0];
	}
	
	size() {
		return this._internalArray.length;
	}
	
	empty() {
		return !this._internalArray.length;
	}
	
	clear() {
		this._internalArray = [];
	}
};

class Deque {
	constructor(arr) {
		this._internalArray = arr || [];
	}
	
	pushBack(x) {
		return this._internalArray.push(x);
	}
	
	pushFront(x) {
		return this._internalArray.unshift(x);
	}
	
	popBack() {
		return this._internalArray.pop();
	}
	
	popFront() {
		var ret = this._internalArray[0];
		this._internalArray.splice(0, 1);
		return ret;
	}
	
	back() {
		return this._internalArray[this._internalArray.length - 1];
	}
	
	front() {
		return this._internalArray[0];
	}
	
	size() {
		return this._internalArray.length;
	}
	
	empty() {
		return !this._internalArray.length;
	}
	
	clear() {
		this._internalArray = [];
	}
};

function ver(v) {
	var sp = v.split('.');
	var maj = Number(sp[0]);
	var min = Number(sp[1]);
	var rev = Number(sp[2]);
	
	if(version.major > maj) return true;
	if(version.major < maj) return false;
	if(version.minor > min) return true;
	if(version.minor < min) return false;
	if(version.revision >= rev) return true;
	if(version.revision < rev) return false;
	return true;
}

function verrev(v) {
	var sp = v.split('.');
	var maj = Number(sp[0]);
	var min = Number(sp[1]);
	var rev = Number(sp[2]);
	
	if(version.major < maj) return true;
	if(version.major > maj) return false;
	if(version.minor < min) return true;
	if(version.minor > min) return false;
	if(version.revision <= rev) return true;
	if(version.revision > rev) return false;
	return true;
}

// 위키 설정
const config = {
	getString(str, def) {
		if(wikiconfig[str] === undefined) {
			if(def != undefined) {
				curs.execute("insert into config (key, value) values (?, ?)", [str, def]);
				wikiconfig[str] = def;
				return def;
			} else {
				return null;
			}
		}
		return wikiconfig[str];
	}
};

// 현재 스킨
function getSkin(req) {
	const def = config.getString('wiki.default_skin', hostconfig.skin);
	const ret = getUserset(req, 'skin', 'default');
	if(ret == 'default') return def;
	if(!skinList.includes(ret)) return def;
	return ret;
}

// 권한 보유여부
function getperm(perm, username) {
	if(perm == 'member') return true;
	if(perm == 'no_force_captcha') perm = 'no_force_recaptcha';
	if(!perms.includes(perm)) return false;
	if(!permlist[username]) permlist[username] = [];
	return permlist[username].includes(perm);
}

// 내 권한 보유여부
function hasperm(req, perm) {
	if(!islogin(req)) {
		if(perm == 'ip') return true;
		return false;
	}
	if(perm == 'member') return true;
	if(perm == 'no_force_captcha') perm = 'no_force_recaptcha';
	if(!perms.includes(perm)) return false;
	if(!permlist[ip_check(req)]) permlist[ip_check(req)] = [];
	return permlist[ip_check(req)].includes(perm);
}

// 비동기파일읽기
async function readFile(p, noerror = 0) {
    return new Promise((resolve, reject) => {
        fs.readFile(p, 'utf8', (e, r) => {
            if(e) {
				if(noerror) resolve('');
                reject(e);
            } else {
                resolve(r.toString());
            }
        });
    });
}

// 비동기 파일 존재 여부
async function exists(p) {
    // fs.exists는 작동안함
    return new Promise((resolve, reject) => {
        fs.readFile(p, (e, r) => {
            // 화일이 없으니 에러
            if(e) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

// 비동기 JSON require
async function requireAsync(p) {
    return new Promise((resolve, reject) => {
        fs.readFile(p, (e, r) => {
            if(e) {
                reject(e);
            } else {
                resolve( JSON.parse(r.toString()) );
            }
        });
    });
}

// 스킨 템플릿 렌더링
async function render(req, title = '', content = '', varlist = {}, subtitle = '', error = null, viewname = '') {
	const skinInfo = {
		title: title + subtitle,
		viewName: viewname,
	};
	
	const perms = {
		has(perm) {
			try {
				return permlist[ip_check(req)].includes(perm);
			} catch(e) {
				return false;
			}
		}
	};
	
	var skinconfig = skincfgs[getSkin(req)];
	
	var templatefn = '';
	if(skinconfig.override_views.includes(viewname)) {
		templatefn = './skins/' + getSkin(req) + '/views/' + viewname + '.html';
	} else {
		templatefn = './skins/' + getSkin(req) + '/views/default.html';
	}

	return new Promise((resolve, reject) => {
        swig.compileFile(templatefn, {}, async(e, r) => {
            if(e) {
				print(`[오류!] ${e.stack}`);
				return resolve(`
					<title>` + title + ` (스킨 렌더링 오류!)</title>
					<meta charset=utf-8 />` + content);
			}
			
			varlist['skinInfo'] = skinInfo;
			varlist['config'] = config;
			varlist['content'] = content;
			varlist['perms'] = perms;
			varlist['url'] = req.path;
			varlist['error'] = error;
			varlist['req_ip'] = ip_check(req, 1);
			
			if(islogin(req)) {
				var user_document_discuss = null;
				const udd = await curs.execute("select tnum, time from threads where namespace = '사용자' and title = ? and status = 'normal' and not deleted = '1'", [req.session.username]);
				if(udd.length) user_document_discuss = Math.floor(Number(udd[0].time) / 1000);
				
				varlist['member'] = {
					username: req.session.username,
				};
				varlist['user_document_discuss'] = user_document_discuss;
			}
			
			var output = r(varlist);
			
			var header = '<!DOCTYPE html>\n<html><head>';
			var adjs = '', adcss = '';
			for(var js of (hostconfig.additional_js || [])) {
				adjs += `<script type="text/javascript" src="/js/${js}"></script>`;
			}
			for(var css of (hostconfig.additional_css || [])) {
				adcss += `<link rel=stylesheet href="/css/${css}" />`;
			}
			header += `
				<title>${title}${subtitle} - ${config.getString('wiki.site_name', '더 시드')}</title>
				<meta charset=utf-8 />
				<meta http-equiv=x-ua-compatible content="ie=edge" />
				<meta http-equiv=x-pjax-version content="" />
				<meta name=generator content="the seed" />
				<meta name=application-name content="` + config.getString('wiki.site_name', '더 시드') + `" />
				<meta name=mobile-web-app-capable content=yes />
				<meta name=msapplication-tooltip content="` + config.getString('wiki.site_name', '더 시드') + `" />
				<meta name=msapplication-starturl content="/w/` + encodeURIComponent(config.getString('wiki.front_page', 'FrontPage')) + `" />
				<link rel=search type="application/opensearchdescription+xml" title="` + config.getString('wiki.site_name', '더 시드') + `" href="/opensearch.xml" />
				<meta name=viewport content="width=device-width, initial-scale=1, maximum-scale=1" />
			${hostconfig.use_external_css ? `
				<link rel=stylesheet href="https://theseed.io/css/diffview.css" />
				<link rel=stylesheet href="https://theseed.io/css/katex.min.css" />
				<link rel=stylesheet href="https://theseed.io/css/wiki.css" />
			` : `
				<link rel=stylesheet href="/css/diffview.css" />
				<link rel=stylesheet href="/css/katex.min.css" />
				<link rel=stylesheet href="/css/wiki.css" />
			`}${adcss}
			`;
			for(var css of skinconfig.auto_css_targets['*']) {
				header += '<link rel=stylesheet href="/skins/' + getSkin(req) + '/' + css + '" />';
			}
			for(var css of (skinconfig.auto_css_targets[viewname] || [])) {
				header += '<link rel=stylesheet href="/skins/' + getSkin(req) + '/' + css + '" />';
			}
			header += `
				${hostconfig.use_external_js ? `
					<!--[if (!IE)|(gt IE 8)]><!--><script type="text/javascript" src="https://theseed.io/js/jquery-2.1.4.min.js"></script><!--<![endif]-->
					<!--[if lt IE 9]><script type="text/javascript" src="https://theseed.io/js/jquery-1.11.3.min.js"></script><![endif]-->
					<script type="text/javascript" src="https://theseed.io/js/dateformatter.js?508d6dd4"></script>
					<script type="text/javascript" src="https://theseed.io/js/intersection-observer.js?36e469ff"></script>
					<script type="text/javascript" src="https://theseed.io/js/theseed.js?24141115"></script>
					
				` : `
					<!--[if (!IE)|(gt IE 8)]><!--><script type="text/javascript" src="/js/jquery-2.1.4.min.js"></script><!--<![endif]-->
					<!--[if lt IE 9]><script type="text/javascript" src="/js/jquery-1.11.3.min.js"></script><![endif]-->
					<script type="text/javascript" src="/js/dateformatter.js?508d6dd4"></script>
					<script type="text/javascript" src="/js/intersection-observer.js?36e469ff"></script>
					<script type="text/javascript" src="/js/theseed.js?24141115"></script>
				`}${adjs}
			`;
			for(var js of skinconfig.auto_js_targets['*']) {
				header += '<script type="text/javascript" src="/skins/' + getSkin(req) + '/' + js.path + '"></script>';
			}
			for(var js of (skinconfig.auto_js_targets[viewname] || [])) {
				header += '<script type="text/javascript" src="/skins/' + getSkin(req) + '/' + js.path + '"></script>';
			}
			
			header += skinconfig.additional_heads;
			header += '</head><body class="';
			var ac = '';
			for(var cls of skinconfig.body_classes) {
				ac += cls + ' ';
			}
			header += ac.replace(/\s$/, '') + '">';
			var footer = '</body></html>';
			
			resolve(header + output + footer);
		});
	});
}

// ACL 종류
const acltype = {
	read: '읽기',
	edit: '편집',
	move: '이동',
	delete: '삭제',
	create_thread: '토론 생성',
	write_thread_comment: '토론 댓글',
	edit_request: '편집요청',
	acl: 'ACL',
};

// ACL 권한
const aclperms = {
	any: '아무나',
	member: '로그인된 사용자',
	admin: '관리자',
	member_signup_15days_ago: '가입한지 15일 지난 사용자',
	suspend_account: (ver('4.18.0') ? undefined : '차단된 사용자'),
	blocked_ipacl: (ver('4.18.0') ? undefined : '차단된 아이피'),
	document_contributor: '해당 문서 기여자',
	contributor: (ver('4.7.0') ? '위키 기여자' : undefined),
	match_username_and_document_title: (ver('4.5.9') ? '문서 제목과 사용자 이름이 일치' : undefined),
	ip: (ver('4.20.0') ? '아이피' : undefined),
};

// 차단된 사용자 제외 ACL 권한
const exaclperms = [
	'member', 'member_signup_15days_ago', 'document_contributor', 'contributor',
];

// 오류메시지
function fetchErrorString(code, ...params) {
	const codes = {
		permission: ver('4.0.18') ? '권한이 부족합니다.' : '관리자 권한입니다.',
		permission_read: '읽기 권한이 부족합니다.',
		permission_edit: '편집 권한이 부족합니다.',
		permission_move: '이동 권한이 부족합니다.',
		permission_delete: '삭제 권한이 부족합니다.',
		permission_create_thread: '토론 생성 권한이 부족합니다.',
		permission_write_thread_comment: '토론 댓글 권한이 부족합니다.',
		permission_edit_request: '편집요청 권한이 부족합니다.',
		permission_acl: 'ACL 권한이 부족합니다.',
		thread_not_found: '토론이 존재하지 않습니다.',
		edit_request_not_found: '편집 요청을 찾을 수 없습니다.',
		invalid_signup_key: '인증 요청이 만료되었거나 올바르지 않습니다.',
		document_not_found: '문서를 찾을 수 없습니다.',
		revision_not_found: '해당 리비전을 찾을 수 없습니다.',
		validator_required: params[0] + '의 값은 필수입니다.',
		invalid_username: '사용자 이름이 올바르지 않습니다.',
		text_unchanged: '문서 내용이 같습니다.',
		edit_conflict: '편집 도중에 다른 사용자가 먼저 편집을 했습니다.',
		invalid_type_number: params[0] + '의 값은 숫자이어야 합니다.',
		not_revertable: '이 리비전으로 되돌릴 수 없습니다.',
		disallowed_email: '이메일 허용 목록에 있는 이메일이 아닙니다.',
		file_not_uploaded: '파일이 업로드되지 않았습니다.',
		username_already_exists: '사용자 이름이 이미 존재합니다.',
		username_format: '사용자 이름을 형식에 맞게 입력해주세요.',
		invalid_title: '문서 이름이 올바르지 않습니다.',
		captcha_validation_failed: 'reCAPTCHA 인증에 실패했습니다.',
	};
	
	return codes[code] || code;
}

function fetchValue(code) {
	const codes = {
		username: '사용자 이름',
		ip: 'IP 주소',
		password: ver('4.18.6') ? '비밀번호' : '암호',
		password_check: ver('4.18.6') ? '비밀번호 확인' : '암호 확인',
	};
	
	return codes[code] || code;
}

// 오류/알림풍선
function alertBalloon(content, type = 'danger', dismissible = true, classes = '', noh) {
	return `
		<div class="alert alert-${type} ${dismissible ? 'alert-dismissible' : ''} ${classes}" role=alert>
			${dismissible ? `<button type=button class=close data-dismiss=alert aria-label=Close>
				<span aria-hidden=true>×</span>
				<span class=sr-only>Close</span>
			</button>` : ``}
			<strong>${
				noh ? '' : ({
					none: '',
					danger: '[오류!]',
					warning: '',
					info: '',
					success: '[경고!]'
				}[type])
			}</strong> ${content + ''}
		</div>`;
}

// 이름공간 목록
function fetchNamespaces() {
	return ['문서', '틀', '분류', '파일', '사용자', '특수기능', config.getString('wiki.site_name', '더 시드'), '토론', '휴지통', '투표'].concat(hostconfig.custom_namespaces || []);
}

function err(type, obj) {
	if(typeof obj == 'string') obj = { code: obj };
	if(!obj.msg) obj.msg = fetchErrorString(obj.code, fetchValue(obj.tag));
	if(!obj.tag) obj.tag = null;
	if(type == 'alert') {
		obj.toString = function() {
			return alertBalloon(this.msg);
		};
	}
	if(type == 'p') {
		obj.toString = function() {
			return `<p class=error-desc>${html.escape(this.msg)}</p>`;
		};
	}
	if(type == 'error' || type == 'raw') {
		obj.toString = function() {
			return this.msg;
		};
	}
	if(type == 'raw') {
		return obj + '';
	}
	return obj;
}

// 오류화면 표시
async function showError(req, code, ...params) {
	return await render(req, ver('4.13.0') ? '오류' : '문제가 발생했습니다!', `${ver('4.13.0') ? '<div>' : '<h2>'}${typeof code == 'object' ? (code.msg || fetchErrorString(code.code, code.tag)) : fetchErrorString(code, ...params)}${ver('4.13.0') ? '</div>' : '</h2>'}`, {}, _, _, 'error');
}

// 닉네임/아이피 파싱
function ip_pas(ip = '', ismember = '', nobold) {
	var style = '';
	/*if(ver('4.18.0')) {
		var dbdata = await curs.execute("select aclgroup from aclgroup where type = ? and username = ?", (ismember == 'author' ? 'username' : 'ip'), ip);
		if(dbdata.length) {
			var dbdata2 = await curs.execute("select css from aclgroup_groups where name = ?", [dbdata[0].aclgroup]);
			if(dbdata2.length) {
				style = ' style="' + html.escape(dbdata2[0].css) + '"';
			}
		}
	}*/
	
	if(ismember == 'author') {
		return `${nobold ? '' : '<strong>'}<a${style} href="/w/사용자:${encodeURIComponent(ip)}">${html.escape(ip)}</a>${nobold ? '' : '</strong>'}`;
	} else {
		return `<a${style} href="/contribution/ip/${encodeURIComponent(ip)}/document">${html.escape(ip)}</a>`;
	}
}

// 아이피 차단 여부
async function ipblocked(ip) {
	await curs.execute("delete from ipacl where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	var ipacl = await curs.execute("select cidr, al, expiration, note from ipacl order by cidr asc limit 50");
	var msg = '';
	
	for(let row of ipacl) {
		if(ipRangeCheck(ip, row.cidr)) {
			if(row.al == '1') msg = '해당 IP는 반달 행위가 자주 발생하는 공용 아이피이므로 로그인이 필요합니다.<br />(이 메세지는 ' + (!ver('4.11.0') ? '본인이 반달을 했다기 보다는 해당 통신사를 쓰는' : '같은 인터넷 공급업체를 사용하는') + ' 다른 누군가가 해서 발생했을 확률이 높습니다.)<br />차단 만료일 : ' + (row.expiration == '0' ? '무기한' : new Date(Number(row.expiration))) + '<br />차단 사유 : ' + row.note;
			else msg = 'IP가 차단되었습니다.' + (!ver('4.6.0') ? ' <a href="https://board.namu.wiki/whyiblocked">게시판</a>으로 문의해주세요.' : '') + '<br />차단 만료일 : ' + (row.expiration == '0' ? '무기한' : new Date(Number(row.expiration))) + '<br />차단 사유 : ' + row.note;
			return msg;
		}
	} return false;
}

// 계정 차단 여부
async function userblocked(username) {
	if(ver('4.18.0')) {
		await curs.execute("delete from aclgroup where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
		var data = await curs.execute("select id, type, username, note, expiration, date from aclgroup where aclgroup = ? and username = ?", ['차단된 사용자', username]);
		if(data.length) {
			return {
				username,
				expiration: data[0].expiration,
				note: data[0].note,
				date: data[0].date,
				id: data[0].id,
			};
		}
	} else {
		await curs.execute("delete from suspend_account where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
		var data = await curs.execute("select expiration, note, date from suspend_account where username = ?", [username]);
		if(data.length) {
			return {
				username,
				expiration: data[0].expiration,
				note: data[0].note,
				date: data[0].date,
			};
		} else return false;
	}
}

// 구 ACL 검사
async function getacl2(req, title, namespace, type, getmsg) {
	if(type == 'create_thread' || type == 'write_thread_comment')
		type = 'discuss';
	var acl = (await curs.execute("select read, edit, del, discuss, move from classic_acl where title = ? and namespace = ?", [title, namespace]))[0];
	if(!acl) acl = {
		read: 'everyone', 
		edit: 'everyone', 
		del: 'everyone', 
		discuss: 'everyone', 
		move: 'everyone' };
	acl.delete = acl.del;
	acl.edit_request = 'everyone';
	var ret = 1, msg = '';
	await curs.execute("delete from ipacl where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	await curs.execute("delete from aclgroup where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	var ipacl = await curs.execute("select cidr, al, expiration, note from ipacl order by cidr asc limit 50");
	var blocked = 0;
	if(type != 'read') {
		for(let row of ipacl) {
			if(ipRangeCheck(ip_check(req, 1), row.cidr) && !(islogin(req) && row.al == '1')) {
				ret = 0;
				if(row.al == '1') msg = '해당 IP는 반달 행위가 자주 발생하는 공용 아이피이므로 로그인이 필요합니다.<br />(이 메세지는 본인이 반달을 했다기 보다는 해당 통신사를 쓰는 다른 누군가가 해서 발생했을 확률이 높습니다.)<br />차단 만료일 : ' + (row.expiration == '0' ? '무기한' : new Date(Number(row.expiration))) + '<br />차단 사유 : ' + row.note;
				else msg = 'IP가 차단되었습니다.' + (verrev('4.5.9') ? ' <a href="https://board.namu.wiki/whyiblocked">게시판</a>으로 문의해주세요.' : '') + '<br />차단 만료일 : ' + (row.expiration == '0' ? '무기한' : new Date(Number(row.expiration))) + '<br />차단 사유 : ' + row.note;
				blocked = 1;
				break;
			}
		}
		if(islogin(req)) {
			const bd = await userblocked(ip_check(req));
			if(bd) {
				ret = 0;
				msg = '차단된 계정입니다.<br />차단 만료일 : ' + (bd.expiration == '0' ? '무기한' : new Date(Number(bd.expiration))) + '<br />차단 사유 : ' + bd.note;
				blocked = 1;
			}
		}
	}
	if(ret) switch(acl[type]) {
		case 'everyone':
			ret = 1;
		break; case 'member':
			ret = islogin(req);
			if(!ret) msg = '로그인된 사용자만 가능합니다.';
		break; case 'admin':
			ret = hasperm(req, 'developer') || hasperm(req, 'admin') || hasperm(req, 'arbiter') || hasperm(req, 'tribune');
			if(!ret) msg = '관리자만 가능합니다.';
	}
	if(type == 'edit' && namespace == '사용자' && (!islogin(req) || (islogin(req) && ip_check(req) != title)) && !hasperm(req, 'editable_other_user_document')) {
		ret = 0;
		// 문구 까먹음. 대충 생각나는 대로...
		msg = '자신의 사용자 문서만 편집할 수 있습니다.';
	}
	if(!blocked && type == 'edit' && getmsg != 2 && msg)
		msg += ' 대신 <strong><a href="/new_edit_request/' + encodeURIComponent(totitle(title, namespace) + '') + '">편집 요청</a></strong>을 생성하실 수 있습니다.';
	if(!getmsg)
		return ret;
	else
		return msg;
}

// ACL 검사
async function getacl(req, title, namespace, type, getmsg) {
	if(!ver('4.2.0'))
		return await getacl2(req, title, namespace, type, getmsg);
	
	var ns  = await curs.execute("select id, action, expiration, condition, conditiontype from acl where namespace = ? and type = ? and ns = '1' order by cast(id as integer) asc", [namespace, type]);
	var doc = await curs.execute("select id, action, expiration, condition, conditiontype from acl where title = ? and namespace = ? and type = ? and ns = '0' order by cast(id as integer) asc", [title, namespace, type]);
	var flag = 0;
	
	await curs.execute("delete from ipacl where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	await curs.execute("delete from aclgroup where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	var ipacl = await curs.execute("select cidr, al, expiration, note from ipacl order by cidr asc limit 50");
	var data = await curs.execute("select name, warning_description from aclgroup_groups");
	var aclgroup = {};
	var aclgroupWarnings = {};
	for(var group of data) {
		var data = await curs.execute("select id, type, username, note, expiration from aclgroup where aclgroup = ?", [group.name]);
		aclgroup[group.name] = data;
		aclgroupWarnings[group.name] = group.warning_description;
	}
	
	async function f(table, isns) {
		if(!flag && (!table.length || (ver('4.16.0') && type == 'read'))) {
			flag = 1;
			return await f(ns, 1);
		}
		
		var r = {
			ret: 0, 
			m1: '', 
			m2: '', 
			msg: '',
		};
		
		for(var row of table) {
			if(row.conditiontype == 'perm') {
				var ret = 0;
				var msg = '', m1 = '', m2 = '';
				switch(row.condition) {
					case 'any': {
						ret = 1;
					} break; case 'member': {
						if(!islogin(req)) break;
						var blocked = await userblocked(ip_check(req));
						if(blocked) break;
						ret = 1;
					} break; case 'admin': {
						if(hasperm(req, 'admin')) ret = 1;
					} break; case 'member_signup_15days_ago': {
						if(!islogin(req)) break;
						var blocked = await userblocked(ip_check(req));
						if(blocked) break;
						
						var data = await curs.execute("select time from history where title = ? and namespace = '사용자' and username = ? and ismember = 'author' and advance = 'create' order by cast(rev as integer) asc limit 1", [ip_check(req), ip_check(req)]);
						if(data.length) {
							data = data[0];
							if(new Date().getTime() >= Number(data.time) + 1296000000) ret = 1;
						}
					} break; case 'blocked_ipacl': {
						if(!ver('4.18.0')) for(let row of ipacl) {
							if(ipRangeCheck(ip_check(req, 1), row.cidr) && !(islogin(req) && row.al == '1')) {
								ret = 1;
								if(row.al == '1') msg = '해당 IP는 반달 행위가 자주 발생하는 공용 아이피이므로 로그인이 필요합니다.<br />(이 메세지는 본인이 반달을 했다기 보다는 해당 통신사를 쓰는 다른 누군가가 해서 발생했을 확률이 높습니다.)<br />차단 만료일 : ' + (row.expiration == '0' ? '무기한' : new Date(Number(row.expiration))) + '<br />차단 사유 : ' + row.note;
								else msg = 'IP가 차단되었습니다.' + (verrev('4.5.9') ? ' <a href="https://board.namu.wiki/whyiblocked">게시판</a>으로 문의해주세요.' : '') + '<br />차단 만료일 : ' + (row.expiration == '0' ? '무기한' : new Date(Number(row.expiration))) + '<br />차단 사유 : ' + row.note;
								break;
							}
						}
					} break; case 'suspend_account': {
						if(!islogin(req)) break;
						if(ver('4.18.0')) break;
						const data = await userblocked(ip_check(req));
						if(data) {
							ret = 1;
							msg = '차단된 계정입니다.<br />차단 만료일 : ' + (data.expiration == '0' ? '무기한' : new Date(Number(data.expiration))) + '<br />차단 사유 : ' + data.note;
						}
					} break; case 'document_contributor': {
						var data = await curs.execute("select rev from history where title = ? and namespace = ? and username = ? and ismember = ?", [title, namespace, ip_check(req), islogin(req) ? 'author' : 'ip']);
						if(!data.length) break;
						
						var blocked = await userblocked(ip_check(req));
						if(blocked) break;
						for(let row of ipacl) {
							if(ipRangeCheck(ip_check(req, 1), row.cidr) && !(islogin(req) && row.al == '1')) {
								blocked = 1;
								break;
							}
						} if(blocked) break;
						
						ret = 1;
					} break; case 'contributor': {
						if(!ver('4.7.0')) break;
						
						var data = await curs.execute("select rev from history where username = ? and ismember = ?", [ip_check(req), islogin(req) ? 'author' : 'ip']);
						if(!data.length) break;
						
						var blocked = await userblocked(ip_check(req));
						if(blocked) break;
						for(let row of ipacl) {
							if(ipRangeCheck(ip_check(req, 1), row.cidr) && !(islogin(req) && row.al == '1')) {
								blocked = 1;
								break;
							}
						} if(blocked) break;
						
						ret = 1;
					} break; case 'match_username_and_document_title': {
						if(ver('4.11.0')) {
							if(islogin(req) && ip_check(req) == title.split('/')[0]) ret = 1;
						} else {
							if(islogin(req) && ip_check(req) == title) ret = 1;
						}
					} break; case 'ip': {
						if(!islogin(req)) ret = 1;
					} break; case 'bot': {
						// 나중에
					} break; default: {
						if(islogin(req) && hasperm(req, row.condition)) ret = 1;
					}
				}
				
				if(ret) {
					if(row.action == 'allow') {
						r.ret = 1;
						break;
					} else if(row.action == 'deny') {
						r.ret = 0;
						r.msg = msg;
						r.m1 = aclperms[row.condition] || row.condition;
						break;
					} else if(row.action == 'gotons' && ver('4.18.0')) {
						r = await f(ns, 1);
						break;
					} else break;
				} else if(row.action == 'allow') r.m2 += (aclperms[row.condition] ? aclperms[row.condition] : ('perm:' + row.condition)) + ' OR ';
			} else if(row.conditiontype == 'member') {
				if(ip_check(req) == row.condition && islogin(req)) {
					if(row.action == 'allow') {
						r.ret = 1;
						break;
					} else if(row.action == 'deny') {
						r.ret = 0;
						r.m1 = 'member:' + row.condition;
						break;
					} else if(row.action == 'gotons' && ver('4.18.0')) {
						r = await f(ns, 1);
						break;
					} else break;
				} else if(row.action == 'allow') r.m2 += 'member:' + row.condition + ' OR ';
			} else if(row.conditiontype == 'ip') {
				if(ip_check(req, 1) == row.condition) {
					if(row.action == 'allow') {
						r.ret = 1;
						break;
					} else if(row.action == 'deny') {
						r.ret = 0;
						r.m1 = 'ip:' + row.condition;
						break;
					} else if(row.action == 'gotons' && ver('4.18.0')) {
						r = await f(ns, 1);
						break;
					} else break;
				} else if(row.action == 'allow') r.m2 += 'ip:' + row.condition + ' OR ';
			} else if(row.conditiontype == 'geoip' && ver('4.5.9')) {
				if(geoip.lookup(ip_check(req, 1)).country == row.condition) {
					if(row.action == 'allow') {
						r.ret = 1;
						break;
					} else if(row.action == 'deny') {
						r.ret = 0;
						r.m1 = 'geoip:' + row.condition;
						break;
					} else if(row.action == 'gotons' && ver('4.18.0')) {
						r = await f(ns, 1);
						break;
					} else break;
				} else if(row.action == 'allow') r.m2 += 'geoip:' + row.condition + ' OR ';
			} else if(row.conditiontype == 'aclgroup' && ver('4.18.0')) {
				var ag = null;
				
				for(let item of (aclgroup[row.condition] || [])) {
					if((item.type == 'ip' && ipRangeCheck(ip_check(req, 1), item.username)) || (islogin(req) && item.type == 'username' && ip_check(req) == item.username)) {
						ag = item;
						break;
					}
				} if(ag) {
					if(row.action == 'allow') {
						r.ret = 1;
						break;
					} else if(row.action == 'deny') {
						r.ret = 0;
						if(hostconfig.namuwiki_exclusive && aclgroupWarnings[row.condition] && type == 'edit')
							r.msg = aclgroupWarnings[row.condition] + '<br /><br /><a href="/self_unblock?id=' + ag.id + '&document=' + encodeURIComponent(totitle(title, namespace) + '') + '">[확인했습니다. #' + ag.id + ']</a><br />사유: ' + ag.note;
						else
							r.msg = 'ACL그룹 ' + row.condition + ' #' + ag.id + '에 있기 때문에 ' + acltype[type] + ' 권한이 부족합니다.<br />만료일 : ' + (ag.expiration == '0' ? '무기한' : new Date(Number(ag.expiration))) + '<br />사유 : ' + ag.note;
						break;
					} else if(row.action == 'gotons' && ver('4.18.0')) {
						r = await f(ns, 1);
						break;
					} else break;
				} else if(row.action == 'allow') r.m2 += 'ACL그룹 ' + row.condition + '에 속해 있는 사용자 OR ';
			}
		}
		
		return r;
	}	
	
	const r = await f(doc);
	if(!getmsg) return r.ret;
	if(!r.ret && !r.msg) {
		r.msg = `${ver('4.7.0') && !r.m1 && !r.m2 ? 'ACL에 허용 규칙이 없기 때문에 ' : ''}${r.m1 && ver('4.7.0') ? r.m1 + '이기 때문에 ' : ''}${acltype[type]} 권한이 부족합니다.${r.m2 && ver('4.7.0') ? ' ' + r.m2.replace(/\sOR\s$/, '') + '(이)여야 합니다. ' : ''}`;
		if(ver('4.5.9')) r.msg += ` 해당 문서의 <a href="/acl/${encodeURIComponent(totitle(title, namespace) + '')}">ACL 탭</a>을 확인하시기 바랍니다.`;
		if(type == 'edit' && getmsg != 2)
			r.msg += ' 대신 <strong><a href="/new_edit_request/' + encodeURIComponent(totitle(title, namespace) + '') + '">편집 요청</a></strong>을 생성하실 수 있습니다.';
	}
	return r.msg;  // 거부되었으면 오류 메시지 내용 반환, 허용은 빈 문자열
}

// 앞뒤 페이지 이동 단추
function navbtn(total, start, end, href) {
	if(!href) return `
		<div class=btn-group role=group>
			<a class="btn btn-secondary btn-sm disabled">
				<span class="icon ion-chevron-left"></span>&nbsp;&nbsp;Past
			</a>
			<a class="btn btn-secondary btn-sm disabled">
				Next&nbsp;&nbsp;<span class="icon ion-chevron-right"></span>
			</a>
		</div>
	`;  // 미구현 당시 navbtn(0, 0, 0, 0)으로 다 채웠음.
	href = href.split('?')[0];
	start = Number(start);
	end = Number(end);
	total = Number(total);
	
	return `
		<div class=btn-group role=group>
			<a ${end == total ? '' : `href="${(href + '?until=' + (end + 1))}" `}class="btn btn-secondary btn-sm${end == total ? ' disabled' : ''}">
				<span class="icon ion-chevron-left"></span>&nbsp;&nbsp;Past
			</a>
			<a ${start <= 1 ? '' : `href="${(href + '?from=' + (start - 1))}" `}class="btn btn-secondary btn-sm${start <= 1 ? ' disabled' : ''}">
				Next&nbsp;&nbsp;<span class="icon ion-chevron-right"></span>
			</a>
		</div>
	`;
}

function navbtnr(total, start, end, href) {
	href = href.split('?')[0];
	start = Number(start);
	end = Number(end);
	total = Number(total);
	
	return `
		<div class=btn-group role=group>
			<a ${start <= 1 ? '' : `href="${(href + '?until=' + (start - 1))}" `}class="btn btn-secondary btn-sm${start <= 1 ? ' disabled' : ''}">
				<span class="icon ion-chevron-left"></span>&nbsp;&nbsp;Past
			</a>
			<a ${end == total ? '' : `href="${(href + '?from=' + (end + 1))}" `}class="btn btn-secondary btn-sm${end == total ? ' disabled' : ''}">
				Next&nbsp;&nbsp;<span class="icon ion-chevron-right"></span>
			</a>
		</div>
	`;
}

function navbtnss(ts, te, start, end, href) {
	href = href.split('?')[0];
	start = start;
	end = end;
	return `
		<div class=btn-group role=group>
			<a ${start == ts ? '' : `href="${(href + '?until=' + encodeURIComponent(start))}" `}class="btn btn-secondary btn-sm${start == ts ? ' disabled' : ''}">
				<span class="icon ion-chevron-left"></span>&nbsp;&nbsp;Past
			</a>
			<a ${end == te ? '' : `href="${(href + '?from=' + encodeURIComponent(end))}" `}class="btn btn-secondary btn-sm${end == te ? ' disabled' : ''}">
				Next&nbsp;&nbsp;<span class="icon ion-chevron-right"></span>
			</a>
		</div>
	`;
}

// HTML 이스케이프
const html = {
	escape(content = '') {
		if(!content) content = '';
		content = content.replace(/[&]/gi, '&amp;');
		content = content.replace(/["]/gi, '&quot;');
		content = content.replace(/[<]/gi, '&lt;');
		content = content.replace(/[>]/gi, '&gt;');
		
		return content;
	}
};

function cacheSkinList() {
    skinList.length = 0;
	for(var prop of Object.getOwnPropertyNames(skincfgs))
		delete skincfgs[prop];
    for(var dir of fs.readdirSync('./skins', { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)) {
        skinList.push(dir);
		skincfgs[dir] = require('./skins/' + dir + '/config.json');
    }
}

function generateCaptcha(req, num) {
    if(!hostconfig.enable_captcha) return '';
    if(hasperm(req, 'no_force_recaptcha') || hasperm(req, 'no_force_captcha')) return '';
    
    var numbers = [];
    var i;
    var fullnum = '';
    var caps = [];
    var retHTML = '';
    
	if(num) {
		numbers = [String(num).slice(0, 3), String(num).slice(3, 6)];
	} else {
		numbers.push(parseInt(Math.random()*900+100));
		numbers.push(parseInt(Math.random()*900+100));
    }
	
    for(i of numbers) {
        fullnum += i;
        caps.push(new captchapng(120, 45, i));
    }
    
    req.session.captcha = fullnum;
    
    for(i of caps) {
        switch(randint(1, 6)) {
            case 1:
                i.color(120, 200, 255, 255);
                i.color(255, 255, 255, 255);
            break;case 2:
                i.color(46, 84, 84, 255);
                i.color(52, 235, 195, 255);
            break;case 3:
                i.color(44, 56, 222, 255);
                i.color(227, 43, 52, 255);
            break;case 4:
                i.color(31, 216, 220, 255);
                i.color(255, 0, 0, 255);
            break;case 5:
                i.color(85, 170, 170, 255);
                i.color(255, 255, 255, 255);
            break;case 6:
                i.color(225, 202, 48, 255);
                i.color(9, 198, 122, 255);
        }
        
        const img = i.getBase64();
        
        retHTML += `
            <img style="border-radius: 6px; border: 1px solid white; box-shadow: 3px 3px 20px 1px grey inset; display: inline-block;" class=captcha-image src="data:image/png;base64,${Buffer.from(img, 'base64').toString('base64')}" />
        `;
    }
    
    return `
        <div class="captcha-frame" style="margin: 20px 0 20px 0; border-color: #000; border-width: 1px 1px 1px; border-style: solid; border-radius: 6px; display: table; padding: 10px; background: rgb(153, 208, 249); background: linear-gradient(rgb(153, 208, 249) 0%, rgb(13, 120, 200) 31%, rgb(43, 157, 242) 30%, rgb(202, 233, 255));">
            <div class=captcha-images>
                ${retHTML}
            </div>
            
            <div class=captcha-input>
                <label style="color: white;">보이는 숫자 입력: </label><br>
                <input type=text class=form-control name=captcha>
            </div>
        </div>
    `;
}

function validateCaptcha(req) {
    if(!hostconfig.enable_captcha) return true;
    if(hasperm(req, 'no_force_recaptcha') || hasperm(req, 'no_force_captcha')) return true;
    
    try {
        if(req.body['captcha'].replace(/\s/g, '') != req.session.captcha) {
            return false;
        }
    } catch(e) {
        return false;
    }
    
    return true;
}

function processTitle(d) {
	const sp = d.split(':');
	var ns = sp.length > 1 ? sp[0] : '문서';
	var title = d;
	var forceShowNamespace = false;
	var nslist = fetchNamespaces();
	if(nslist.includes(ns)) {
		title = d.replace(ns + ':', '');
		if(sp[2] !== undefined && ns == '문서' && nslist.includes(sp[1])) {
			forceShowNamespace = true;
		}
	} else {
		title = d;
		ns = '문서';
	}

	return {
		title, 
		namespace: ns, 
		forceShowNamespace,
		toString() {
			if(forceShowNamespace || this.namespace != '문서')
				return this.namespace + ':' + title;
			else
				return title;
		}
	};
}

function totitle(t, ns) {
	const nslist = fetchNamespaces();
	var forceShowNamespace = false;
	if(ns == '문서' && nslist.includes(t.split(':')[0]) && t.split(':')[1] !== undefined)
		forceShowNamespace = true;
	
	return {
		title: t, 
		namespace: ns, 
		forceShowNamespace,
		toString() {
			if(forceShowNamespace || this.namespace != '문서')
				return this.namespace + ':' + this.title;
			else
				return this.title;
		}
	};
}

function edittype(type, ...flags) {
	var ret = '';
	
	switch(type) {
		case 'create':
			ret = '새 문서';
		break; case 'move':
			ret = flags[0] + '에서 ' + flags[1] + '(으)로 문서 이동';
		break; case 'delete': 
			ret = '삭제';
		break; case 'revert':
			ret = 'r' + flags[0] + '로 되돌림';
		break; case 'acl':
			ret = flags[0] + '으로 ACL 변경';
	}
	
	return ret;
}

function expireopt(req) {
	var disp = ['영구', '1분', '5분', '10분', '30분', '1시간', '2시간', '하루', '3일', '5일', '7일', '2주', '3주', '1개월', '6개월', '1년'];
	var val  = [0, 60, 300, 600, 1800, 3600, 7200, 86400, 259200, 432000, 604800, 1209600, 1814400, 2592000, 15552000, 29030400];
	if(req.path == '/admin/suspend_account') {
		disp = ['선택', '해제'].concat(disp);
		val  = ['', -1].concat(val);
	}
	var ret = '';
	for(var i=0; i<disp.length; i++) {
		ret += `<option value=${val[i]}${req && req.method == 'POST' && String(req.body['expire']) === String(val[i]) ? ' selected' : ''}>${disp[i]}</option>`;
	}
	return ret;
}

function simplifyRequest(req) {
	return {
		session: req.session, 
		cookies: req.cookies, 
		method: req.method, 
		path: req.path, 
		query: req.query, 
		params: req.params, 
		body: req.body, 
		socket: {
			remoteAddress: req.socket.remoteAddress },
		headers: req.headers, 
		connection: {
			remoteAddress: req.connection.remoteAddress },
	};
}

function log(thread, msg) {
	console.log(`[${toTime(getTime())}] [${thread} 쓰레드]: ${msg}`);
}

//메일 설정
const transporter = nodemailer.createTransport({
	host: hostconfig.mailhost,
	port: 465,
	secure: true,
	auth: {
	  user: hostconfig.email,
	  pass: hostconfig.passwd
	},
  });

function mailer(to, subject, content) {
	const mailOptions = {
		from: [config.getString('wiki.site_name')] + '<' + [to] + '>',
        to: to ,
        subject: subject,
        html: content
	};
	transporter.sendMail(mailOptions);
	console.log(to+'으로 가입인증메일 발송됨.');
}

module.exports = {
	version,
	ver,
	verrev,
	
	perms,
	disable_autoperms,
	
	print,
	prt,
	
	Stack,
	Queue,
	Deque,
	
	newID,
	
	wikiconfig,
	permlist,
	userset,
	skinList,
	skincfgs,
	apiTokens,

	loginHistory,
	neededPages,
	
	rndval,
	beep, 
	input, 
	sha3, 
	random, 
	findAll, 
	getTime, 
	toDate, 
	toTime,
	generateTime, 
	islogin, 
	ip_check, 
	getUserset, 
	getUserSetting,
	
	cssColors,
	cssColorMatches,
	whtags,
	whattr,
	
	config, getSkin, getperm, hasperm, readFile, exists, requireAsync, render, acltype, aclperms, exaclperms, fetchErrorString, fetchValue, alertBalloon, fetchNamespaces, err, showError, ip_pas, ipblocked, userblocked, getacl, navbtn, navbtnr, navbtnss, html, cacheSkinList, generateCaptcha, validateCaptcha,
	processTitle, totitle, edittype, expireopt,
	
	conn, curs, insert,
	
	timeFormat, _, floorof, randint,
	
	upload,
	
	simplifyRequest,
	log,
	mailer
};

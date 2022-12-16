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
const child_process = require('child_process');
const captchapng = require('captchapng');

const express = require('express');
const router = express.Router();
const hostconfig = require('../hostconfig');
const functions = require('../functions');
for(var item in functions) global[item] = functions[item];
const markdown = require('../namumark');

const cfg = {
	'wiki.editagree_text': config.getString('wiki.editagree_text'),
	'wiki.front_page': config.getString('wiki.front_page'),
	'wiki.site_name': config.getString('wiki.site_name'),
	'wiki.copyright_url': config.getString('wiki.copyright_url'),
	'wiki.canonical_url': config.getString('wiki.canonical_url'),
	'wiki.copyright_text': config.getString('wiki.copyright_text'),
	'wiki.sitenotice': config.getString('wiki.sitenotice'),
	'wiki.logo_url': config.getString('wiki.logo_url'),
};

global.render = async function render(req, title = '', data = {}, error = null, viewName = '', status_redir = 200, cookies = []) {
	data.error = error;
	
	const ret = {
		config: cfg,
		localConfig: {},
		page: {
			viewName,
			data,
			title,
			menus: [],
		},
		session: {
			menus: [],
			member: null,
			ip: ip_check(req, 1),
			identifier: (islogin(req) ? 'm' : 'i') + ':' + ip_check(req),
		},
	};
	
	if(typeof status_redir == 'string') {
		ret.page.status = 302;
		ret.page.location = status_redir;
	} else {
		ret.page.status = status_redir;
	}
	
	if(islogin(req)) {
		var user_document_discuss = null;
		const udd = await curs.execute("select tnum, time from threads where namespace = '사용자' and title = ? and status = 'normal'", [req.session.username]);
		if(udd.length) user_document_discuss = Math.floor(Number(udd[0].time) / 1000);
		
		ret.session.member = {
			username: req.session.username,
			user_document_discuss,
			gravatar_url: '',
		};
	}
	
	return ret;
};

global.showError = async function showError(req, code, ...params) {
	return await render(req, '', {
		content: typeof code == 'object' ? (code.msg || fetchErrorString(code.code, code.tag)) : fetchErrorString(code, ...params),
	}, _, 'error');
};

module.exports = {};

for(var src of fs.readdirSync('./backend', { withFileTypes: true }).filter(dirent => !dirent.isDirectory()).map(dirent => dirent.name)) {
	if(src.toLowerCase() == 'backend.js') continue;
	var func = eval(fs.readFileSync('./backend/' + src).toString());
	module.exports[func.name] = func;
}


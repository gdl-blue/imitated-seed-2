// 병아리 엔진: 개인 the seed 모방 프로젝트

const perms = [
	'admin', 'ipacl', 'suspend_account', 'developer', 'hideip', 'update_thread_document',
	'update_thread_status', 'update_thread_topic', 'hide_thread_comment', 'grant',
	'editable_other_user_document', 'no_force_recaptcha', 'disable_two_factor_login',
	'login_history', 'delete_thread', 'nsacl', 'aclgroup',
];

function print(x) { console.log(x); }
function prt(x) { process.stdout.write(x); }

function beep(cnt = 1) { // 경고음 재생
	for(var i=1; i<=cnt; i++)
		prt("");
}

// https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function rndval(chars, length) {
	var result           = '';
	var characters       = chars;
	var charactersLength = characters.length;
	for ( var i = 0; i < length; i++ ) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

const timeFormat = 'Y-m-d H:i:s';

const inputReader = require('wait-console-input'); // 입력받는 라이브러리

function input(p) {
	prt(p); // 일부러 이렇게. 바로하면 한글 깨짐.
	return inputReader.readLine('');
}

const exec = eval;

const { SHA3 } = require('sha3');
function sha3(p, b) {
    const hash = new SHA3(b || 256);
    hash.update(p);
    return hash.digest('hex');
}

// VB6 함수 모방
function Split(str, del) { return str.split(del); }; const split = Split;
function UCase(s) { return s.toUpperCase(); }; const ucase = UCase;
function LCase(s) { return s.toUpperCase(); }; const lcase = LCase;

const sqlite3 = require('sqlite3').verbose(); // SQLite 라이브러리 호출
const conn = new sqlite3.Database('./wikidata.db', (err) => {}); // 데이타베이스 연결

// 파이선 SQLite 모방
conn.commit = function() {};
conn.sd = [];

const curs = {
	execute: function executeSQL(sql = '', params = []) {
		return new Promise((resolve, reject) => {
			if(UCase(sql).startsWith("SELECT")) {
				conn.all(sql, params, (err, retval) => {
					if(err) return reject(err);
					conn.sd = retval;
					resolve(retval);
				});
			} else {
				conn.run(sql, params, err => {
					if(err) return reject(err);
					resolve(0);
				});
			}
		});
	},
	fetchall: function fetchSQLData() {
		return conn.sd;
	}
};
const express = require('express');
const session = require('express-session');
const swig = require('swig'); // swig 호출

const wiki = express();

function getTime() { return Math.floor(new Date().getTime()); }; const get_time = getTime;

function toDate(t) {
	var date = new Date(Number(t));
	
	var hour = date.getUTCHours(); hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getUTCMinutes(); min = (min < 10 ? "0" : "") + min;
    var sec  = date.getUTCSeconds(); sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getUTCFullYear();
    var month = date.getUTCMonth() + 1; month = (month < 10 ? "0" : "") + month;
    var day  = date.getUTCDate(); day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;
}

function generateTime(time, fmt) {
	const d = split(time, ' ')[0];
	const t = split(time, ' ')[1];
	
	return `<time datetime="${d}T${t}.000Z" data-format="${fmt}">${time}</time>`;
}

generateTime.safe = true;

swig.setFilter('encode_userdoc', function encodeUserdocURL(input) {
	return encodeURIComponent('사용자:' + input);
});

swig.setFilter('encode_doc', function encodeDocURL(input) {
	return encodeURIComponent(input);
});

swig.setFilter('to_date', toDate);

swig.setFilter('localdate', generateTime);

wiki.use(session({
	key: 'sid',
	secret: 'secret',
	cookie: {
		expires: false
	}
}));

const ipRangeCheck = require("ip-range-check");
const bodyParser = require('body-parser');
const multer = require('multer');
const diff = require('./cemerick-jsdifflib.js');
const upload = multer();
const fs = require('fs');

wiki.use(bodyParser.json());
wiki.use(bodyParser.urlencoded({ extended: true }));
wiki.use(upload.array()); 
wiki.use(express.static('public'));

var wikiconfig = {};
var permlist = {};
var _ready = 0;

var hostconfig;
try {
	hostconfig = require('./config.json'); 
	_ready = 1; 
} catch(e) { (async function() {
	print("병아리 - the seed 모방 엔진에 오신것을 환영합니다.\n");
	
	hostconfig = {
		host: input("호스트 주소: "),
		port: input("포트 번호: "),
		skin: input("기본 스킨 이름: "),
	};
	
	const tables = {
		'documents': ['title', 'content', 'namespace'],
		'history': ['title', 'namespace', 'content', 'rev', 'time', 'username', 'changes', 'log', 'iserq', 'erqnum', 'advance', 'ismember', 'edit_request_id', 'flags'],
		'namespaces': ['namespace', 'locked', 'norecent', 'file'],
		'users': ['username', 'password'],
		'user_settings': ['username', 'key', 'value'],
		'acl': ['title', 'no', 'type', 'content', 'action', 'expire'],
		'nsacl': ['namespace', 'no', 'type', 'content', 'action', 'expire'],
		'config': ['key', 'value'],
		'email_filters': ['address'],
		'stars': ['title', 'namespace', 'username', 'lastedit'],
		'perms': ['perm', 'username'],
		'threads': ['title', 'namespace', 'topic', 'status', 'time', 'tnum', 'deleted'],
		'res': ['id', 'content', 'username', 'time', 'hidden', 'hider', 'status', 'tnum', 'ismember', 'isadmin', 'type'],
		'useragents': ['username', 'string'],
		'login_history': ['username', 'ip'],
		'account_creation': ['key', 'email', 'time'],
		'acl': ['title', 'namespace', 'id', 'type', 'action', 'expiration', 'conditiontype', 'condition', 'ns'],
		'ipacl': ['cidr', 'al', 'expiration', 'note', 'date'],
		'suspend_account': ['username', 'date', 'expiration', 'note'],
		'aclgroup_groups': ['name', 'admin', 'date', 'lastupdate'],
		'aclgroup': ['aclgroup', 'type', 'username', 'note', 'date', 'expiration', 'id'],
		'block_history': ['date', 'type', 'aclgroup', 'id', 'duration', 'note', 'executer', 'target'],
		'edit_requests': ['title', 'namespace', 'id', 'deleted', 'state', 'content', 'baserev', 'username', 'ismember', 'log', 'date', 'processor', 'processortype', 'lastupdate', 'processtime', 'reason', 'rev'],
	};
	
	for(var table in tables) {
		var sql = '';
		sql = `CREATE TABLE ${table} ( `;
		
		for(col of tables[table]) {
			sql += `${col} TEXT DEFAULT '', `;
		}
		
		sql = sql.replace(/[,]\s$/, '');		
		sql += `)`;
		
		await curs.execute(sql);
	}
	
	fs.writeFileSync('config.json', JSON.stringify(hostconfig), 'utf8');
	
	print('\n준비 완료되었습니다. 엔진을 다시 시작하십시오.');
	process.exit(0);
})(); } if(_ready) {

const markdown = require('./namumark.js');

function islogin(req) {
	if(req.session.username) return true;
	return false;
}

function getUsername(req, forceIP = 0) {
	if(!forceIP && req.session.username) {
		return req.session.username;
	} else {
		if(req.headers['x-forwarded-for']) {
			return req.headers['x-forwarded-for'];
		} else {
			return req.connection.remoteAddress;
		}
	}
}

const ip_check = getUsername; // 오픈나무를 오랫동안 커스텀하느라 이 함수명에 익숙해진 바 있음

const config = {
	getString: function(str, def = '') {
		str = str.replace(/^wiki[.]/, '');
		
		if(typeof(wikiconfig[str]) == 'undefined') {
			curs.execute("insert into config (key, value) values (?, ?)", [str, def]);
			wikiconfig[str] = def;
			return def;
		}
		return wikiconfig[str];
	}
}

const _ = undefined;

function getSkin() {
	return hostconfig['skin'];
}

function getperm(perm, username) {
	// if(!islogin(req)) return false;
	if(!permlist[username]) permlist[username] = [];
	return permlist[username].includes(perm);
	/* await curs.execute("select perm from perms where username = ? and perm = ?", [username, perm]);
	if(curs.fetchall().length) {
		return true;
	}
	return false; */
}

function hasperm(req, perm) {
	if(!islogin(req)) return false;
	if(!permlist[ip_check(req)]) permlist[ip_check(req)] = [];
	return permlist[ip_check(req)].includes(perm);
	/* await curs.execute("select perm from perms where username = ? and perm = ?", [username, perm]);
	if(curs.fetchall().length) {
		return true;
	}
	return false; */
}

function render(req, title = '', content = '', varlist = {}, subtitle = '', error = false, viewname = '') {
	const skinInfo = {
		title: title + subtitle,
		viewName: viewname,
	};
	
	const perms = {
		has(perm) {
			try {
				return permlist[ip_check(req)].includes(perm)
			} catch(e) {
				return false;
			}
		}
	}
	
	try {
		var template = swig.compileFile('./skins/' + getSkin() + '/views/default.html');
	} catch(e) {
		print(`[오류!] ${e}`);
		
		return `
			<title>` + title + ` (스킨 렌더링 오류!)</title>
			<meta charset=utf-8>` + content;
	}

	var output;
	var templateVariables = varlist;
	templateVariables['skinInfo'] = skinInfo;
	templateVariables['config'] = config;
	templateVariables['content'] = content;
	templateVariables['perms'] = perms;
	templateVariables['url'] = req.path;
	templateVariables['error'] = error;
	
	if(islogin(req)) {
		templateVariables['member'] = {
			username: req.session.username,
		}
	}
	
	if(viewname != '') {
		// templateVariables['document'] = title;
	}
	
	output = template(templateVariables);
	
	var header = '<html><head>';
	var skinconfig = require("./skins/" + getSkin() + "/config.json");
	header += `
		<title>${title}${subtitle} - ${config.getString('site_name', '더 시드')}</title>
		<meta charset="utf-8">
		<meta http-equiv="x-ua-compatible" content="ie=edge">
		<meta http-equiv="x-pjax-version" content="">
		<meta name="generator" content="the seed">
		<meta name="application-name" content="` + config.getString('wiki.site_name', '더 시드') + `">
		<meta name="mobile-web-app-capable" content="yes">
		<meta name="msapplication-tooltip" content="` + config.getString('wiki.site_name', '더 시드') + `">
		<meta name="msapplication-starturl" content="/w/` + encodeURIComponent(config.getString('wiki.frontpage', 'FrontPage')) + `">
		<link rel="search" type="application/opensearchdescription+xml" title="` + config.getString('wiki.site_name', '더 시드') + `" href="/opensearch.xml">
		<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
		<link rel="stylesheet" href="/css/diffview.css">
		<link rel="stylesheet" href="/css/katex.min.css">
		<link rel="stylesheet" href="/css/wiki.css">
	`;
	for(var i=0; i<skinconfig["auto_css_targets"]['*'].length; i++) {
		header += '<link rel=stylesheet href="/skins/' + getSkin() + '/' + skinconfig["auto_css_targets"]['*'][i] + '">';
	}
	header += `
		<!--[if (!IE)|(gt IE 8)]><!--><script type="text/javascript" src="/js/jquery-2.1.4.min.js"></script><!--<![endif]-->
		<!--[if lt IE 9]><script type="text/javascript" src="/js/jquery-1.11.3.min.js"></script><![endif]-->
		<script type="text/javascript" src="/js/dateformatter.js?508d6dd4"></script>
		<script type="text/javascript" src="/js/intersection-observer.js?36e469ff"></script>
		<script type="text/javascript" src="/js/theseed.js?24141115"></script>
	`;
	for(var i=0; i<skinconfig["auto_js_targets"]['*'].length; i++) {
		header += '<script type="text/javascript" src="/skins/' + getSkin() + '/' + skinconfig["auto_js_targets"]['*'][i]['path'] + '"></script>';
	}
	
	header += skinconfig['additional_heads'];
	header += '</head><body class="';
	for(var i=0; i<skinconfig['body_classes'].length; i++) {
		header += skinconfig['body_classes'][i] + ' ';
	}
	header += '">';
	var footer = '</body></html>';
	
	return header + output + footer;
}

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

function fetchErrorString(code) {
	const codes = {
		insufficient_privileges: '권한이 부족합니다.',
		thread_not_found: '토론이 존재하지 않습니다.',
		invalid_signup_key: '인증 요청이 만료되었거나 올바르지 않습니다.',
		document_not_found: '문서를 찾을 수 없습니다.',
	};
	
	if(typeof(codes[code]) == 'undefined') return code;
	else return codes[code];
}

function alertBalloon(content, type = 'danger', dismissible = true, classes = '', noh) {
	return `
		<div class="alert alert-${type} ${dismissible ? 'alert-dismissible' : ''} ${classes}" role=alert>
			<button type=button class=close data-dismiss=alert aria-label=Close>
				<span aria-hidden=true>×</span>
				<span class=sr-only>Close</span>
			</button>
			<strong>${
				noh ? '' : ({
					none: '',
					danger: '[오류!]',
					warning: '',
					info: '',
					success: '[경고!]'
				}[type])
			}</strong> ${content}
		</div>`;
}

function fetchNamespaces() {
	return ['문서', '틀', '분류', '파일', '사용자', '특수기능', config.getString('site_name', '더 시드'), '토론', '휴지통', '투표'];
}

function showError(req, code, custom) {
	return render(req, "문제가 발생했습니다!", `<h2>${custom ? code : fetchErrorString(code)}</h2>`);
}

function ip_pas(ip = '', ismember = '', nobold) {
	if(ismember == 'author') {
		return `${nobold ? '' : '<strong>'}<a href="/w/사용자:${encodeURIComponent(ip)}">${html.escape(ip)}</a>${nobold ? '' : '</strong>'}`;
	} else {
		return `<a href="/contribution/ip/${encodeURIComponent(ip)}/document">${html.escape(ip)}</a>`;
	}
}

async function ipblocked(ip) {
	await curs.execute("delete from ipacl where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	var ipacl = await curs.execute("select cidr, al, expiration, note from ipacl order by cidr asc limit 50");
	
	for(let row of ipacl) {
		if(ipRangeCheck(ip, row.cidr)) {
			return 1;
		}
	} return 0;
}

async function userblocked(username) {
	//'suspend_account': ['username', 'date', 'expiration', 'note'],
	
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

async function getacl(req, title, namespace, type, getmsg) {
	var ns  = await curs.execute("select id, action, expiration, condition, conditiontype from acl where namespace = ? and type = ? and ns = '1' order by cast(id as integer) asc", [namespace, type]);
	var doc = await curs.execute("select id, action, expiration, condition, conditiontype from acl where title = ? and namespace = ? and type = ? and ns = '0' order by cast(id as integer) asc", [title, namespace, type]);
	var flag = 0;
	
	await curs.execute("delete from ipacl where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	var ipacl = await curs.execute("select cidr, al, expiration, note from ipacl order by cidr asc limit 50");
	var data = await curs.execute("select name from aclgroup_groups");
	var aclgroup = {};
	for(var group of data) {
		var data = await curs.execute("select id, type, username, note, expiration from aclgroup where aclgroup = ?", [group.name]);
		aclgroup[group.name] = data;
	}
	
	async function f(table) {
		if(!table.length && !flag) {
			flag = 1;
			return await f(ns);
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
						if(islogin(req)) ret = 1;
					} break; case 'admin': {
						if(hasperm(req, 'admin')) ret = 1;
					} break; case 'member_signup_15days_ago': {
						if(!islogin(req)) break;
						var data = await curs.execute("select time from history where title = ? and namespace = '사용자' and username = ? and ismember = 'author' and advance = 'create' order by cast(rev as integer) asc limit 1", [ip_check(req), ip_check(req)]);
						if(data.length) {
							data = data[0];
							if(new Date().getTime() >= Number(data.time) + 1296000000)
								ret = 1;
						}
					} break; case 'blocked_ipacl': {
						for(let row of ipacl) {
							if(ipRangeCheck(ip_check(req, 1), row.cidr) && !(islogin(req) && row.al == '1')) {
								ret = 1;
								msg = 'IP가 차단되었습니다.<br />차단 만료일 : ' + (row.expiration == '0' ? '무기한' : new Date(Number(row.expiration))) + '<br />차단 사유 : ' + row.note;
								break;
							}
						}
					} break; case 'suspend_account': {
						if(!islogin(req)) break;
						const data = await userblocked(ip_check(req));
						if(data) {
							ret = 1;
							msg = '차단된 계정입니다.<br />차단 만료일 : ' + (data.expiration == '0' ? '무기한' : new Date(Number(data.expiration))) + '<br />차단 사유 : ' + data.note;
						}
					} break; case 'document_contributor': {
						var data = await curs.execute("select rev from history where title = ? and namespace = ? and username = ? and ismember = ?", [title, namespace, ip_check(req), islogin(req) ? 'author' : 'ip']);
						if(data.length) ret = 1;
					} break; case 'contributor': {
						var data = await curs.execute("select rev from history where username = ? and ismember = ?", [ip_check(req), islogin(req) ? 'author' : 'ip']);
						if(data.length) ret = 1;
					} break; case 'match_username_and_document_title': {
						if(islogin(req) && ip_check(req) == title.split('/')[0]) ret = 1;
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
						break;
					} else if(row.action == 'gotons') {
						r = await f(ns);
						break;
					} else break;
				}
			} else if(row.conditiontype == 'member') {
				if(ip_check(req) == row.condition && islogin(req)) {
					if(row.action == 'allow') {
						r.ret = 1;
						break;
					} else if(row.action == 'deny') {
						r.ret = 0;
						break;
					} else if(row.action == 'gotons') {
						r = await f(ns);
						break;
					} else break;
				}
			} else if(row.conditiontype == 'ip') {
				if(ip_check(req, 1) == row.condition) {
					if(row.action == 'allow') {
						r.ret = 1;
						break;
					} else if(row.action == 'deny') {
						r.ret = 0;
						break;
					} else if(row.action == 'gotons') {
						r = await f(ns);
						break;
					} else break;
				}
			} else if(row.conditiontype == 'geoip') {
				// geoip-lite 모듈사용
				continue;
			} else if(row.conditiontype == 'aclgroup') {
				var ag = null;
				
				for(let item of aclgroup[row.condition]) {
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
						r.msg = 'ACL그룹 ' + row.condition + ' #' + ag.id + '에 있기 때문에 ' + acltype[type] + ' 권한이 부족합니다.<br />만료일 : ' + (ag.expiration == '0' ? '무기한' : new Date(Number(ag.expiration))) + '<br />사유 : ' + ag.note;
						break;
					} else if(row.action == 'gotons') {
						r = await f(ns);
						break;
					} else break;
				}
			}
		}
		
		return r;
	}
	
	const r = await f(doc);
	if(!getmsg) return r.ret;
	if(!r.ret && !r.msg) {
		r.msg = `${r.m1}${acltype[type]} 권한이 부족합니다.${r.m2}`;
		// 해당 문서의 <a href="/acl/${encodeURIComponent(totitle(title, namespace) + '')}">ACL 탭</a>을 확인하시기 바랍니다.
		if(type == 'edit')
			r.msg += ' 대신 <strong><a href="/new_edit_request/' + encodeURIComponent(totitle(title, namespace) + '') + '">편집 요청</a></strong>을 생성하실 수 있습니다.';
	}
	return r.msg;  // 거부되었으면 오류메시지 내용반환 허용은 빈문자열
}

function navbtn(cs, ce, s, e) {
	return '';
}

const html = {
	escape: function(content = '') {
		content = content.replace(/[<]/gi, '&lt;');
		content = content.replace(/[>]/gi, '&gt;');
		content = content.replace(/["]/gi, '&quot;');
		content = content.replace(/[&]/gi, '&amp;');
		
		return content;
	}
}

wiki.get(/^\/skins\/((?:(?!\/).)+)\/(.+)/, function dropSkinFile(req, res) {
	const skinname = req.params[0];
	const filepath = req.params[1];
	
	const afn = split(filepath, '/');
	const fn = afn[afn.length - 1];
	
	var rootp = './skins/' + skinname + '/static';
	var cnt = 0;
	for(dir of afn) {
		rootp += '/' + dir;
	}
	
	res.sendFile(fn, { root: rootp.replace('/' + fn, '') });
});

function dropSourceCode(req, res) {
	res.sendFile('index.js', { root: "./" });
}

wiki.get('/index.js', dropSourceCode);

wiki.get('/js/:filepath', function dropJS(req, res) {
	const filepath = req.param('filepath');
	res.sendFile(filepath, { root: "./js" });
});

wiki.get('/css/:filepath', function dropCSS(req, res) {
	const filepath = req.param('filepath');
	res.sendFile(filepath, { root: "./css" });
});

function processTitle(d) {
	const sp = d.split(':');
	var ns = sp[0];
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

function redirectToFrontPage(req, res) {
	res.redirect('/w/' + config.getString('frontpage', 'FrontPage'));
}

wiki.get(/^\/w$/, redirectToFrontPage);
wiki.get(/^\/w\/$/, redirectToFrontPage);
wiki.get('/', redirectToFrontPage);

wiki.get(/^\/w\/(.*)/, async function viewDocument(req, res) {
	const title = req.params[0];
	if(title.replace(/\s/g, '') == '') res.redirect('/w/' + config.getString('frontpage', 'FrontPage'));
	const doc = processTitle(title);
	const { rev } = req.query;
	
	if(rev) {
		var rawContent = await curs.execute("select content, time from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, rev]);
		var data = rawContent;
	} else {
		var rawContent = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	}
	
	if(rev && !rawContent.length) return res.send(showError(req, 'revision_not_found'));

	var content = '';
	
	var httpstat = 200;
	var viewname = 'wiki';
	var error = false;
	
	var lstedt = undefined;
	
	try {
		const aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
		if(aclmsg) {
			httpstat = 403;
			error = true;
			content = '<h2>' + aclmsg + '</h2>';
			// return res.status(403).send(showError(req, 'insufficient_privileges_read'));
		} else {
			content = await markdown(rawContent[0].content, 0, doc + '');
			const blockdata = await userblocked(doc.title);
			if(blockdata) {
				content = `
					<div style="border-width: 5px 1px 1px; border-style: solid; border-color: red gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'blue\';" onmouseout="this.style.borderTopColor=\'red\';">
						<span style="font-size:14pt">이 사용자는 차단된 사용자입니다.</span><br /><br />
						이 사용자는 ${generateTime(toDate(blockdata.date), timeFormat)}에 ${blockdata.expiration == '0' ? '영구적으로' : (generateTime(toDate(blockdata.expiration), timeFormat) + '까지')} 차단되었습니다.<br />
						차단 사유: ${html.escape(blockdata.note)}
					</div>
				` + content;
			}
			
			if(doc.namespace == '사용자' && getperm('admin', doc.title)) {
				content = `
					<div style="border-width: 5px 1px 1px; border-style: solid; border-color: orange gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'red\';" onmouseout="this.style.borderTopColor=\'orange\';">
						<span style="font-size:14pt">이 사용자는 특수 권한을 가지고 있습니다.</span>
					</div>
				` + content;
			}
			
			if(rev) content = alertBalloon('<strong>[주의!]</strong> 문서의 이전 버전(' + generateTime(toDate(data[0].time), timeFormat) + '에 수정)을 보고 있습니다. <a href="/w/' + encodeURIComponent(doc + '') + '">최신 버전으로 이동</a>', 'danger', true, '', 1) + content;
			
			var data = await curs.execute("select time from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
			lstedt = Number(data[0].time);
		}
	} catch(e) {
		viewname = 'notfound';
		print(e.stack);
		httpstat = 404;
		var data = await curs.execute("select flags, rev, time, changes, log, iserq, erqnum, advance, ismember, username from history \
						where title = ? and namespace = ? order by cast(rev as integer) desc limit 3",
						[doc.title, doc.namespace]);
		
		content = `
			<p>해당 문서를 찾을 수 없습니다.</p>
			
			<p>
				<a rel="nofollow" href="/edit/` + encodeURIComponent(doc + '') + `">[새 문서 만들기]</a>
			</p>
		`;
		
		if(data.length) {
			content += `
				<h3>이 문서의 역사</h3>
				<ul class=wiki-list>
			`;
			
			for(var row of data) {
				content += `
					<li>
						${generateTime(toDate(row.time), timeFormat)} <strong>r${row.rev}</strong> ${row.advance != 'normal' ? `<i>(${edittype(row.advance, ...(row.flags.split('\n')))})</i>` : ''} (<span style="color: ${
							(
								Number(row.changes) > 0
								? 'green'
								: (
									Number(row.changes) < 0
									? 'red'
									: 'gray'
								)
							)
							
						};">${row.changes}</span>) ${ip_pas(row.username, row.ismember)} (<span style="color: gray;">${row.log}</span>)</li>
				`;
			}
			
			content += `
				</ul>
				<a href="/history/` + encodeURIComponent(doc + '') + `">[더보기]</a>
			`;
		}
	}
	
	res.status(httpstat).send(render(req, totitle(doc.title, doc.namespace), content, {
		star_count: 0,
		starred: false,
		date: lstedt,
		document: doc,
		rev,
	}, _, error, viewname));
});

wiki.get(/^\/raw\/(.*)/, async function API_viewRaw_v2(req, res) {
	const title = req.params[0];
	const doc = processTitle(title);
	const rev = req.query['rev'];
	
	if(title.replace(/\s/g, '') === '') {
		res.send(await showError(req, 'invalid_title'));
		return;
	}
	
	if(rev) {
		var data = await curs.execute("select content from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, rev]);
	} else {
		var data = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	}
	const rawContent = data;

	var content = '';
	
	var httpstat = 200;
	var viewname = 'wiki';
	var error = false;
	
	var isUserDoc = false;
	
	var lstedt = undefined;
	
	try {
		if(!await getacl(req, doc.title, doc.namespace, 'read')) {
			httpstat = 403;
			error = true;
			
			res.send(await showError(req, 'insufficient_privileges_read'));
			
			return;
		} else {
			content = rawContent[0].content;
		}
	} catch(e) {
		viewname = 'notfound';
		
		httpstat = 404;
		content = '';
		
		return res.status(httpstat).send(showError(req, 'document_not_found'));
	}
	
	res.status(httpstat).send('<pre>' + html.escape(content) + '</pre>');
});

wiki.get(/^\/edit\/(.*)/, async function editDocument(req, res) {
	const title = req.params[0];
	const doc = processTitle(title);
	
	if(!await getacl(req, doc.title, doc.namespace, 'read')) {
		return res.status(403).send(showError(req, 'insufficient_privileges_read'));
	}
	
	var rawContent = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!rawContent[0]) rawContent = '';
	else rawContent = rawContent[0].content;
	
	var error = false;
	var content = '';
	
	var baserev;
	var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
	try {
		baserev = data[0].rev;
	} catch(e) {
		baserev = 0;
	}
	
	content = `
		<form method="post" id="editForm" enctype="multipart/form-data" data-title="${title}" data-recaptcha="0">
			<input type="hidden" name="token" value="">
			<input type="hidden" name="identifier" value="${islogin(req) ? 'm' : 'i'}:${ip_check(req)}">
			<input type="hidden" name="baserev" value="${baserev}">

			<ul class="nav nav-tabs" role="tablist" style="height: 38px;">
				<li class="nav-item">
					<a class="nav-link active" data-toggle="tab" href="#edit" role="tab">편집</a>
				</li>
				<li class="nav-item">
					<a id="previewLink" class="nav-link" data-toggle="tab" href="#preview" role="tab">미리보기</a>
				</li>
			</ul>

			<div class="tab-content bordered">
				<div class="tab-pane active" id="edit" role="tabpanel">
					<textarea id="textInput" name="text" wrap="soft" class="form-control">${html.escape(rawContent)}</textarea>
				</div>
				<div class="tab-pane" id="preview" role="tabpanel">
					
				</div>
			</div>
	`;
	
	var httpstat = 200;
	const aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 1);
	if(aclmsg) {
		error = true;
		content = `
			${alertBalloon(aclmsg, 'danger', true, 'fade in edit-alert')}
		` + content.replace('<textarea', '<textarea readonly=readonly') + `
			</form>
		`;
		httpstat = 403;
	} else {
		content += `
				<div class="form-group" style="margin-top: 1rem;">
					<label class="control-label" for="summaryInput">요약</label>
					<input type="text" class="form-control" id="logInput" name="log" value="">
				</div>

				<label><input type="checkbox" name="agree" id="agreeCheckbox" value="Y">&nbsp;문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을 <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을 이용하여 저작자 표시를 하는 것으로 충분하다는 데 동의하는 것입니다. 이 <strong>동의는 철회할 수 없습니다.</strong></label>
				
				${islogin(req) ? '' : `<p style="font-weight: bold;">비로그인 상태로 편집합니다. 편집 역사에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
				
				<div class="btns">
					<button id="editBtn" class="btn btn-primary" style="width: 100px;">저장</button>
				</div>

<!--
				<div id="recaptcha">
					<div class="grecaptcha-badge" style="width: 256px; height: 60px; box-shadow: gray 0px 0px 5px;">
						<div class="grecaptcha-logo">
							<iframe src="https://www.google.com/recaptcha/api2/anchor?k=6LcUuigTAAAAALyrWQPfwtFdFWFdeUoToQyVnD8Y&amp;co=aHR0cDovL3dlYi5hcmNoaXZlLm9yZzo4MA..&amp;hl=ko&amp;v=r20171212152908&amp;size=invisible&amp;badge=inline&amp;cb=6rdgqngv0djy" width="256" height="60" role="presentation" frameborder="0" scrolling="no" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals allow-popups-to-escape-sandbox"></iframe>
						</div>
						
						<div class="grecaptcha-error"></div>
						
						<textarea id="g-recaptcha-response" name="g-recaptcha-response" class="g-recaptcha-response" style="width: 250px; height: 40px; border: 1px solid #c1c1c1; margin: 10px 25px; padding: 0px; resize: none;  display: none; "></textarea>
					</div>
				</div>
				<script>
					recaptchaInit('recaptcha', {
						'sitekey': '',
						'size': 'invisible',
						'badge': 'inline',
						'callback': function() { $("#editBtn").attr("disabled", true); $("#editForm").submit(); }
					}, function (id) {
						$("#editForm").attr('data-recaptcha', id);
					});
				</script>
-->
			</form>
		`;
	}
	
	res.status(httpstat).send(render(req, totitle(doc.title, doc.namespace) + ' (편집)', content, {
		document: doc,
	}, '', error, 'edit'));
});

wiki.post(/^\/edit\/(.*)/, async function saveDocument(req, res) {
	const title = req.params[0];
	const doc = processTitle(title);
	
	if(!await getacl(req, doc.title, doc.namespace, 'edit') || !await getacl(req, doc.title, doc.namespace, 'read')) {
		return res.send(showError(req, 'insufficient_privileges_edit'));
	}
	
	var original = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!original[0]) original = '';
	else original = original[0]['content'];
	
	const content = req.body['text'];
	const rawChanges = content.length - original.length;
	const changes = (rawChanges > 0 ? '+' : '') + String(rawChanges);
	const log = req.body['log'];
	const agree = req.body['agree'];
	const baserev = req.body['baserev'];
	const ismember = islogin(req) ? 'author' : 'ip';
	var advance = 'normal';
	
	var data = await curs.execute("select title from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!data.length) {
		advance = 'create';
		await curs.execute("insert into documents (title, namespace, content) values (?, ?, ?)", [doc.title, doc.namespace, content]);
	} else {
		await curs.execute("update documents set content = ? where title = ? and namespace = ?", [content, doc.title, doc.namespace]);
		curs.execute("update stars set lastedit = ? where title = ? and namespace = ?", [getTime(), doc.title, doc.namespace]);
	}
	
	curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance) \
					values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
		doc.title, doc.namespace, content, String(Number(baserev) + 1), ip_check(req), getTime(), changes, log, '0', '-1', ismember, advance
	]);
	
	res.redirect('/w/' + encodeURIComponent(totitle(doc.title, doc.namespace)));
});

wiki.post(/^\/preview\/(.*)$/, async(req, res) => {
	const title = req.params[0];
	const doc = processTitle(title);
	
	res.send(`
		<head>
			<meta charset=utf8 />
			<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
			<link rel="stylesheet" href="/css/diffview.css">
			<link rel="stylesheet" href="/css/katex.min.css">
			<link rel="stylesheet" href="/css/wiki.css">
			<!--[if (!IE)|(gt IE 8)]><!--><script type="text/javascript" src="/js/jquery-2.1.4.min.js"></script><!--<![endif]-->
			<!--[if lt IE 9]><script type="text/javascript" src="/js/jquery-1.11.3.min.js"></script><![endif]-->
			<script type="text/javascript" src="/js/dateformatter.js?508d6dd4"></script>
			<script type="text/javascript" src="/js/intersection-observer.js?36e469ff"></script>
			<script type="text/javascript" src="/js/theseed.js?24141115"></script>
		</head>
		
		<body>
			<h1>${html.escape(doc + '')}</h1>
			${await markdown(req.body['text'], 0, doc + '')}
		</body>
	`);
});

wiki.get(/^\/edit_request\/(\d+)\/preview$/, async(req, res, next) => {
	const id = req.params[0];
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and id = ?", [id]);
	if(!data.length) return res.send(showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	
	return res.send(`
		<head>
			<meta charset=utf8 />
			<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
			<link rel="stylesheet" href="/css/diffview.css">
			<link rel="stylesheet" href="/css/katex.min.css">
			<link rel="stylesheet" href="/css/wiki.css">
			<!--[if (!IE)|(gt IE 8)]><!--><script type="text/javascript" src="/js/jquery-2.1.4.min.js"></script><!--<![endif]-->
			<!--[if lt IE 9]><script type="text/javascript" src="/js/jquery-1.11.3.min.js"></script><![endif]-->
			<script type="text/javascript" src="/js/dateformatter.js?508d6dd4"></script>
			<script type="text/javascript" src="/js/intersection-observer.js?36e469ff"></script>
			<script type="text/javascript" src="/js/theseed.js?24141115"></script>
		</head>
		
		<body>
			<h1>${html.escape(doc + '')}</h1>
			${await markdown(item.content, 0, doc + '')}
		</body>
	`);
});

wiki.post(/^\/edit_request\/(\d+)\/close$/, async(req, res, next) => {
	const id = req.params[0];
	// 'edit_requests': ['title', 'namespace', 'id', 'deleted', 'state', 'content', 'baserev', 'username', 'ismember', 'log', 'date', 'processor', 'processortype', 'lastupdate'],
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and id = ?", [id]);
	if(!data.length) return res.send(showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	if(!(hasperm(req, 'update_thread_status') || ((islogin(req) ? 'author' : 'ip') == item.ismember && item.username == ip_check(req)))) {
		return res.send(showError(req, 'insufficient_privileges'));
	}
	if(item.state != 'open') {
		return res.send(showError(req, 'edit_request_not_open'));
	}
	await curs.execute("update edit_requests set state = 'closed', processor = ?, processortype = ?, processtime = ?, reason = ? where id = ?", [ip_check(req), islogin(req) ? 'author' : 'ip', getTime(), req.body['close_reason'] || '', id]);
	return res.redirect('/edit_request/' + id);
});

wiki.post(/^\/edit_request\/(\d+)\/accept$/, async(req, res, next) => {
	const id = req.params[0];
	// 'edit_requests': ['title', 'namespace', 'id', 'deleted', 'state', 'content', 'baserev', 'username', 'ismember', 'log', 'date', 'processor', 'processortype', 'lastupdate'],
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and id = ?", [id]);
	if(!data.length) return res.send(showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	var aclmsg = await getacl(req, item.title, item.namespace, 'edit', 1);
	if(aclmsg) {
		return res.send(showError(req, aclmsg, 1));
	}
	if(item.state != 'open') {
		return res.send(showError(req, 'edit_request_not_open'));
	}
	var rev;
	var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
	try {
		rev = Number(data[0].rev) + 1;
	} catch(e) {
		rev = 1;
	}
	var original = await curs.execute("select content from documents where title = ? and namespace = ?", [item.title, item.namespace]);
	if(!original[0]) original = '';
	else original = original[0]['content'];
	
	const rawChanges = item.content.length - original.length;
	const changes = (rawChanges > 0 ? '+' : '') + String(rawChanges);
	
	await curs.execute("update documents set content = ? where title = ? and namespace = ?", [item.content, item.title, item.namespace]);
	curs.execute("update stars set lastedit = ? where title = ? and namespace = ?", [getTime(), item.title, item.namespace]);
	curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, edit_request_id) \
					values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
		item.title, item.namespace, item.content, String(rev), item.username, getTime(), changes, item.log, '0', '-1', item.ismember, 'normal', id
	]);
	await curs.execute("update edit_requests set state = 'accepted', processor = ?, processortype = ?, processtime = ?, rev = ? where id = ?", [ip_check(req), islogin(req) ? 'author' : 'ip', getTime(), String(rev), id]);
	return res.redirect('/edit_request/' + id);
});

wiki.get(/^\/edit_request\/(\d+)$/, async(req, res, next) => {
	const id = req.params[0];
	// 'edit_requests': ['title', 'namespace', 'id', 'deleted', 'state', 'content', 'baserev', 'username', 'ismember', 'log', 'date', 'processor', 'processortype', 'lastupdate'],
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and id = ?", [id]);
	if(!data.length) return res.send(showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	var data = await curs.execute("select content from history where title = ? and namespace = ? and rev = ?", [item.title, item.namespace, item.baserev]);
	var base = '';
	if(data.length) base = data[0].content;
	
	var card = '';
	switch(item.state) {
		case 'open': {
			const acceptable = await getacl(req, item.title, item.namespace, 'edit');
			const closable   = hasperm(req, 'update_thread_status') || ((islogin(req) ? 'author' : 'ip') == item.ismember && item.username == ip_check(req));
			const editable   = ((islogin(req) ? 'author' : 'ip') == item.ismember && item.username == ip_check(req));
			
			card = `
				<h4 class="card-title">이 편집 요청을...</h4>
				<p class="card-text">${generateTime(toDate(item.lastupdate), timeFormat)}에 마지막으로 수정됨</p>
				<form id="edit-request-accept-form" action="/edit_request/${id}/accept" method=post style="display: inline;">
					<button${acceptable ? '' : ' disabled'} class="btn btn-lg btn-success${acceptable ? '' : ' disabled'}" data-toggle="tooltip" data-placement="top" title="${acceptable ? '이 편집 요청을 문서에 적용합니다.' : '이 문서를 편집할 수 있는 권한이 없습니다.'}" type="submit">Accept</button>
				</form>
				<span data-toggle="modal" data-target="#edit-request-close-modal">
					<button${closable ? '' : ' disabled'} class="btn btn-lg${closable ? '' : ' disabled'}" data-toggle="tooltip" data-placement="top" title="${closable ? '이 편집 요청을 닫습니다.' : '편집 요청을 닫기 위해서는 요청자 본인이거나 권한이 있어야 합니다.'}" type="button">Close</button>
				</span>
				<a class="btn btn-info btn-lg${editable ? '' : ' disabled'}" data-toggle="tooltip" data-placement="top" title="${editable ? '이 편집 요청을 수정합니다.' : '요청자 본인만 수정할 수 있습니다.'}" href="/edit_request/${id}/edit">Edit</a>
			`;
		} break; case 'closed': {
			card = `
				<h4 class="card-title">편집 요청이 닫혔습니다.</h4>
				<p class="card-text">${generateTime(toDate(item.processtime), timeFormat)}에 ${ip_pas(item.processor, item.processortype)}가 편집 요청을 닫았습니다.</p>
				${item.reason ? `<p class="card-text">사유 : ${html.escape(item.reason)}</p>` : ''}
			`;
		} break; case 'accepted': {
			card = `
				<h4 class="card-title">편집 요청이 승인되었습니다.</h4>
				<p class="card-text">${generateTime(toDate(item.processtime), timeFormat)}에 ${ip_pas(item.processor, item.processortype, 1)}가 r${item.rev}으로 승인함.</p>
			`;
		}
	}
	
	var content = `
		<h3> ${ip_pas(item.username, item.ismember, 1)}가 ${generateTime(toDate(item.date), timeFormat)}에 요청</h3>
		<hr />
		<div class="form-group">
			<label class="control-label">기준 판</label> r${item.baserev}
		</div>
		
		<div class="form-group">
			<label class="control-label">편집 요약</label> ${html.escape(item.log)}
		</div>
		
		${item.state == 'open' ? `
			<div id="edit-request-close-modal" class="modal fade" role="dialog" style="display: none;" aria-hidden="true">
				<div class="modal-dialog">
					<form id="edit-request-close-form" method="post" action="/edit_request/${id}/close">
						<div class="modal-content">
							<div class="modal-header">
								<button type="button" class="close" data-dismiss="modal">×</button> 
								<h4 class="modal-title">편집 요청 닫기</h4>
							</div>
							<div class="modal-body">
								<p>사유:</p>
								<input name="close_reason" type="text"> 
							</div>
							<div class="modal-footer"> <button type="submit" class="btn btn-primary" style="width:auto">확인</button> <button type="button" class="btn btn-default" data-dismiss="modal" style="background:#efefef">취소</button> </div>
						</div>
					</form>
				</div>
			</div>
		` : ''}
		
		<div class="card">
			<div class="card-block">
				${card}
			</div>
		</div>
		
		<br />
		
		${diff(base, item.content, '1', '2').replace('<th class="texttitle">1 vs. 2</th>', '<th class="texttitle"><a target=_blank href="/edit_request/' + id + '/preview">(미리보기)</a></th>')}
	`;
	
	var error = false;
	
	return res.send(render(req, doc + ' (편집 요청 ' + id + ')', content, {
		document: doc,
	}, _, error, 'edit_request'));
});

wiki.all(/^\/new_edit_request\/(.*)$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	
	var data = await curs.execute("select title from documents \
					where title = ? and namespace = ?",
					[doc.title, doc.namespace]);
	if(!data.length) res.send(showError(req, 'document_not_found'));
	
	const aclmsg = await getacl(req, doc.title, doc.namespace, 'edit_request', 1);
	if(aclmsg) return res.send(showError(req, aclmsg, 1));
	
	var baserev;
	var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
	try {
		baserev = data[0].rev;
	} catch(e) {
		baserev = 0;
	}
	
	if(req.method == 'POST') {
		// 'edit_requests': ['title', 'namespace', 'id', 'deleted', 'state', 'content', 'baserev', 'username', 'ismember', 'log', 'date', 'processor', 'processortype'],
		
		var data = await curs.execute("select id from edit_requests order by cast(id as integer) desc limit 1");
		var id = 1;
		if(data.length) id = Number(data[0].id) + 1;
		await curs.execute("insert into edit_requests (title, namespace, id, state, content, baserev, username, ismember, log, date, processor, processortype, lastupdate) values (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, '', '', ?)", 
														[doc.title, doc.namespace, id, req.body['text'] || '', baserev, ip_check(req), islogin(req) ? 'author' : 'ip', req.body['log'] || '', getTime(), getTime()]);
		
		return res.redirect('/edit_request/' + id);
	}
	
	var rawContent = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!rawContent[0]) rawContent = '';
	else rawContent = rawContent[0].content;
	
	var content = `
		<form method="post" id="editForm" enctype="multipart/form-data" data-title="${title}" data-recaptcha="0">
			<input type="hidden" name="token" value="">
			<input type="hidden" name="identifier" value="${islogin(req) ? 'm' : 'i'}:${ip_check(req)}">
			<input type="hidden" name="baserev" value="${baserev}">

			<ul class="nav nav-tabs" role="tablist" style="height: 38px;">
				<li class="nav-item">
					<a class="nav-link active" data-toggle="tab" href="#edit" role="tab">편집</a>
				</li>
				<li class="nav-item">
					<a id="previewLink" class="nav-link" data-toggle="tab" href="#preview" role="tab">미리보기</a>
				</li>
			</ul>

			<div class="tab-content bordered">
				<div class="tab-pane active" id="edit" role="tabpanel">
					<textarea id="textInput" name="text" wrap="soft" class="form-control">${html.escape(rawContent)}</textarea>
				</div>
				<div class="tab-pane" id="preview" role="tabpanel">
					
				</div>
			</div>
			
			<div class="form-group" style="margin-top: 1rem;">
				<label class="control-label" for="summaryInput">요약</label>
				<input type="text" class="form-control" id="logInput" name="log" value="">
			</div>

			<label><input type="checkbox" name="agree" id="agreeCheckbox" value="Y">&nbsp;문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을 <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을 이용하여 저작자 표시를 하는 것으로 충분하다는 데 동의하는 것입니다. 이 <strong>동의는 철회할 수 없습니다.</strong></label>
			
			${islogin(req) ? '' : `<p style="font-weight: bold;">비로그인 상태로 편집합니다. 편집 역사에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
			
			<div class="btns">
				<button id="editBtn" class="btn btn-primary" style="width: 100px;">저장</button>
			</div>
		</form>
	`;
	
	res.send(render(req, doc + ' (편집 요청)', content, {
		document: doc,
	}, '', _, 'new_edit_request'));
});

wiki.all(/^\/acl\/(.*)$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	await curs.execute("delete from acl where not expiration = '0' and cast(expiration as integer) < ?", [getTime()]);
	
	const title = req.params[0];
	const doc = processTitle(title);
	const editable = Boolean(await getacl(req, doc.title, doc.namespace, 'acl'));
	const nseditable = hasperm(req, 'nsacl');
	const types = ['read', 'edit', 'move', 'delete', 'create_thread', 'write_thread_comment', 'edit_request', 'acl'];
	
	async function tbody(type, isns, edit) {
		var ret = '';
		if(isns) var data = await curs.execute("select id, action, expiration, condition, conditiontype from acl where namespace = ? and type = ? and ns = '1' order by cast(id as integer) asc", [doc.namespace, type]);
		else var data = await curs.execute("select id, action, expiration, condition, conditiontype from acl where title = ? and namespace = ? and type = ? and ns = '0' order by cast(id as integer) asc", [doc.title, doc.namespace, type]);
		var i = 1;
		for(var row of data) {
			ret += `
				<tr data-id="${row.id}">
					<td>${i++}</td>
					<td>${row.conditiontype}:${row.condition}</td>
					<td>${({
						allow: '허용',
						deny: '거부',
						gotons: '이름공간ACL 실행',
					})[row.action]}</td>
					<td>${row.expiration == '0' ? '영구' : generateTime(toDate(row.expiration), timeFormat)}</td>
					<td>${edit ? `<button type="submit" class="btn btn-danger btn-sm">삭제</button></td>` : ''}</td>
				</tr>
			`;
		} if(!data.length) {
			ret += `
				<td colspan="5" style="text-align: center;">(규칙이 존재하지 않습니다. ${isns ? '모두 거부됩니다.' : '이름공간 ACL이 적용됩니다.'})</td>
			`;
		}
		return ret;
	}
	
	if(req.method == 'POST') {
		var rawContent = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		if(!rawContent[0]) rawContent = '';
		else rawContent = rawContent[0].content;
		
		var baserev;
		var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
		try {
			baserev = data[0].rev;
		} catch(e) {
			baserev = 0;
		}
		
		const { id, after_id, mode, type, isNS, condition, action, expire } = req.body;
		if(!types.includes(type)) return res.status(400).send('');
		
		if(isNS && !nseditable) return res.status(403).send('');
		if(!nseditable && !isNS && !editable) return res.status(403).send('');
		
		const edit = nseditable || (isNS ? nseditable : editable);
		
		switch(mode) {
			case 'insert': {
				if(!['allow', 'deny'].concat(isNS ? [] : ['gotons']).includes(action)) return res.status(400).send('');
				if(Number(expire) === NaN) return res.status(400).send('');
				const cond = condition.split(':');
				if(cond.length != 2) return res.status(400).send('');
				if(!['perm', 'ip', 'member', 'geoip', 'aclgroup'].includes(cond[0])) return res.status(400).send('');
				if(isNS) var data = await curs.execute("select id from acl where conditiontype = ? and condition = ? and type = ? and namespace = ? and ns = '1' order by cast(id as integer) desc limit 1", [cond[0], cond[1], type, doc.namespace]);
				else var data = await curs.execute("select id from acl where conditiontype = ? and condition = ? and type = ? and title = ? and namespace = ? and ns = '0' order by cast(id as integer) desc limit 1", [cond[0], cond[1], type, doc.title, doc.namespace]);
				if(data.length) return res.status(400).json({
					status: fetchErrorString('acl_already_exists'),
				});
				if(cond[0] == 'aclgroup') {
					var data = await curs.execute("select name from aclgroup_groups where name = ?", [cond[1]]);
					if(!data.length) return res.status(400).json({
						status: fetchErrorString('invalid_aclgroup'),
					});
				}
				if(cond[0] == 'ip') {
					if(!cond[1].match(/^([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])$/)) return res.status(400).json({
						status: fetchErrorString('invalid_acl_condition'),
					});
				}
				if(cond[0] == 'geoip') {
					if(!cond[1].match(/^[A-Z][A-Z]$/)) return res.status(400).json({
						status: fetchErrorString('invalid_acl_condition'),
					});
				}
				if(cond[0] == 'member') {
					var data = await curs.execute("select username from users where username = ?", [cond[1]]);
					if(!data.length) return res.status(400).json({
						status: '사용자 이름이 올바르지 않습니다.',
					});
				}
				
				const expiration = String(expire ? (getTime() + Number(expire) * 1000) : 0);
				if(isNS) var data = await curs.execute("select id from acl where type = ? and namespace = ? and ns = '1' order by cast(id as integer) desc limit 1", [type, doc.namespace]);
				else var data = await curs.execute("select id from acl where type = ? and title = ? and namespace = ? and ns = '0' order by cast(id as integer) desc limit 1", [type, doc.title, doc.namespace]);
				
				if(isNS) var ff = await curs.execute("select id from acl where id = '1' and type = ? and namespace = ? and ns = '1' order by cast(id as integer) desc limit 1", [type, doc.namespace]);
				else var ff = await curs.execute("select id from acl where id = '1' and type = ? and title = ? and namespace = ? and ns = '0' order by cast(id as integer) desc limit 1", [type, doc.title, doc.namespace]);
				
				var aclid = '1';
				if(data.length && ff.length) aclid = String(Number(data[0].id) + 1);
				
				// ['title', 'namespace', 'id', 'type', 'action', 'expiration', 'conditiontype', 'condition', 'ns'],
				await curs.execute("insert into acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) values (?, ?, ?, ?, ?, ?, ?, ?, ?)", [isNS ? '' : doc.title, doc.namespace, aclid, type, action, expire == '0' ? '0' : expiration, cond[0], cond[1], isNS ? '1' : '0']);
				
				if(!isNS) curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, flags) \
					values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
					doc.title, doc.namespace, rawContent, String(Number(baserev) + 1), ip_check(req), getTime(), '0', '', '0', '-1', islogin(req) ? 'author' : 'ip', 'acl', mode + ',' + type + ',' + action + ',' + condition
				]);
				
				return res.send(await tbody(type, isNS, edit));
			} case 'delete': {
				var data = await curs.execute("select action, conditiontype, condition from acl where id = ? and type = ? and title = ? and namespace = ? and ns = ?", [id, type, isNS ? '' : doc.title, doc.namespace, isNS ? '1' : '0']);
				if(!data.length) return res.status(400).send('');
				await curs.execute("delete from acl where id = ? and type = ? and title = ? and namespace = ? and ns = ?", [id, type, isNS ? '' : doc.title, doc.namespace, isNS ? '1' : '0']);
				
				if(!isNS) curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, flags) \
					values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
					doc.title, doc.namespace, rawContent, String(Number(baserev) + 1), ip_check(req), getTime(), '0', '', '0', '-1', islogin(req) ? 'author' : 'ip', 'acl', mode + ',' + type + ',' + data[0].action + ',' + data[0].conditiontype + ':' + data[0].condition
				]);
				
				return res.send(await tbody(type, isNS, edit));
			} case 'move': {
				if(id > after_id) {  // 위로 올림
					for(var i=id; i>=after_id+2; i--) {
						const rndv = rndval('0123456789abcdefghijklmnopqrstuvwxyz') + ip_check(req) + getTime();
						await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [rndv, String(i - 1), isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
						await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [String(i - 1), String(i), isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
						await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [String(i), rndv, isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
					}
				} else {  // 아래로 내림
					for(var i=id; i<after_id; i++) {
						const rndv = rndval('0123456789abcdefghijklmnopqrstuvwxyz') + ip_check(req) + getTime();
						await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [rndv, String(i + 1), isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
						await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [String(i + 1), String(i), isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
						await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [String(i), rndv, isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
					}
				}
				
				return res.send(await tbody(type, isNS, edit));
			}
		}
	} else {
		var content = ``;
		for(var isns of [false, true]) {
			content += `
				<h2 class="wiki-heading">${isns ? '이름공간' : '문서'} ACL</h2>
				<div>
			`;
			for(var type of types) {
				const edit = nseditable || (isns ? nseditable : editable);
				content += `
					<h4 class="wiki-heading">${acltype[type]}</h4>
					<div class="seed-acl-div" data-type="${type}" data-editable="${edit}" data-isns="${isns}">
						<div class="table-wrap">
							<table class="table" style="width:100%">
								<colgroup>
									<col style="width: 60px">
									<col>
									<col style="width: 80px">
									<col style="width: 200px">
									<col style="width: 60px;">
								</colgroup>
								
								<thead>
									<tr>
										<th>No</th>
										<th>Condition</th>
										<th>Action</th>
										<th>Expiration</th>
										<th></th>
									</tr>
								</thead>

								<tbody class="seed-acl-tbody">
				`;
				content += await tbody(type, isns, edit);
				content += `
						</tbody>
					</table>
				`;
				if(edit) {
					content += `
						<div class="form-inline">
							<div class="form-group">
								<label class="control-label">Condition :</label> 
								<div>
									<select class="seed-acl-add-condition-type form-control" id="permTypeWTC">
										<option value="perm">권한</option>
										<option value="member">사용자</option>
										<option value="ip">아이피</option>
										<option value="geoip">GeoIP</option>
										<option value="aclgroup">ACL그룹</option>
									</select>
									<select class="seed-acl-add-condition-value-perm form-control" id="permTextWTC">
										<option value="any">아무나</option>
										<option value="member">로그인된 사용자 [*]</option>
										<option value="admin">관리자</option>
										<option value="member_signup_15days_ago">가입한지 15일 지난 사용자 [*]</option>
										<option value="suspend_account">차단된 사용자</option>
										<option value="blocked_ipacl">차단된 아이피</option>
										<option value="document_contributor">해당 문서 기여자 [*]</option>
										<option value="contributor">위키 기여자 [*]</option>
										<option value="match_username_and_document_title">문서 제목과 사용자 이름이 일치</option>
										</select>
									<input class="seed-acl-add-condition-value form-control" style="display: none;" type="text"> 
								</div>
							</div>
							<div class="form-group">
								<label class="control-label">Action :</label> 
								<div>
									<select class="seed-acl-add-action form-control">
										<option value="allow">허용</option>
										<option value="deny">거부</option>
										${isns ? '' : `<option value="gotons">이름공간ACL 실행</option>`}
									</select>
								</div>
							</div>
							<div class="form-group">
								<label class="control-label">Duration :</label> 
								<div>
									<select class="form-control seed-acl-add-expire">
										<option value="0" selected="">영구</option>
										<option value="300">5분</option>
										<option value="600">10분</option>
										<option value="1800">30분</option>
										<option value="3600">1시간</option>
										<option value="7200">2시간</option>
										<option value="86400">하루</option>
										<option value="259200">3일</option>
										<option value="432000">5일</option>
										<option value="604800">7일</option>
										<option value="1209600">2주</option>
										<option value="1814400">3주</option>
										<option value="2419200">4주</option>
										<option value="4838400">2개월</option>
										<option value="7257600">3개월</option>
										<option value="14515200">6개월</option>
										<option value="29030400">1년</option>
									</select>
								</div>
							</div>
							<button type="submit" class="btn btn-primary seed-acl-add-btn">추가</button> 
						</div>
						<small>[*] 차단된 사용자는 포함되지 않습니다.</small>
					`;
				} content += `
						</div>
					</div>
				`;
			}
			content += `
				</div>
			`;
		}
		
		return res.send(render(req, doc + ' (ACL)', content, {
			document: doc,
		}, '', false, 'acl'));
	}
});

wiki.get('/RecentChanges', async function recentChanges(req, res) {
	var flag = req.query['logtype'];
	if(!['all', 'create', 'delete', 'move', 'revert'].includes(flag)) flag = 'all';
	if(flag == 'all') flag = '%';
	
	var data = await curs.execute("select flags, title, namespace, rev, time, changes, log, iserq, erqnum, advance, ismember, username from history \
					where " + (flag == '%' ? "not namespace = '사용자' and " : '') + "advance like ? order by cast(time as integer) desc limit 100", 
					[flag]);
	
	
	var content = `
		<ol class="breadcrumb link-nav">
			<li><a href="?logtype=all">[전체]</a></li>
			<li><a href="?logtype=create">[새 문서]</a></li>
			<li><a href="?logtype=delete">[삭제]</a></li>
			<li><a href="?logtype=move">[이동]</a></li>
			<li><a href="?logtype=revert">[되돌림]</a></li>
		</ol>
		
		<table class="table table-hover">
			<colgroup>
				<col>
				<col style="width: 25%;">
				<col style="width: 22%;">
			</colgroup>
			
			<thead id>
				<tr>
					<th>항목</th>
					<th>수정자</th>
					<th>수정 시간</th>
				</tr>
			</thead>
			
			<tbody id>
	`;
	
	for(var row of data) {
		var title = totitle(row.title, row.namespace) + '';
		
		content += `
				<tr${(row.log.length > 0 || row.advance.length > 0 ? ' class=no-line' : '')}>
					<td>
						<a href="/w/${encodeURIComponent(title)}">${html.escape(title)}</a> 
						<a href="/history/${encodeURIComponent(title)}">[역사]</a> 
						${
								Number(row.rev) > 1
								? '<a \href="/diff/' + encodeURIComponent(title) + '?rev=' + row.rev + '&oldrev=' + String(Number(row.rev) - 1) + '">[비교]</a>'
								: ''
						} 
						<a href="/discuss/${encodeURIComponent(title)}">[토론]</a> 
						
						(<span style="color: ${
							(
								Number(row.changes) > 0
								? 'green'
								: (
									Number(row.changes) < 0
									? 'red'
									: 'gray'
								)
							)
							
						};">${row.changes}</span>)
					</td>
					
					<td>
						${ip_pas(row.username, row.ismember)}
					</td>
					
					<td>
						${generateTime(toDate(row.time), timeFormat)}
					</td>
				</tr>
		`;
		
		if(row.log.length > 0 || row.advance != 'normal') {
			content += `
				<td colspan="3" style="padding-left: 1.5rem;">
					${row.log} ${row.advance != 'normal' ? `<i>(${edittype(row.advance, ...(row.flags.split('\n')))})</i>` : ''}
				</td>
			`;
		}
	}
	
	content += `
			</tbody>
		</table>
	`;
	
	res.send(render(req, '최근 변경내역', content, {}));
});

wiki.get(/^\/contribution\/(ip|author)\/(.*)\/document/, async function documentContributionList(req, res) {
	const ismember = req.params[0];
	const username = req.params[1];
	
	var data = await curs.execute("select flags, title, namespace, rev, time, changes, log, iserq, erqnum, advance, ismember, username from history \
				where cast(time as integer) >= ? and ismember = ? and username = ? order by cast(time as integer) desc", [
					Number(getTime()) - 2592000000, ismember, username
				]);
	
//			<li><a href="/contribution/${ismember}/${username}/document">[문서]</a></li>
//			<li><a href="/contribution/${ismember}/${username}/discuss">[토론]</a></li>
	
	var content = `
		<p>최근 30일동안의 기여 목록 입니다.</p>
	
		<ol class="breadcrumb link-nav">
			<li><strong>[문서]</strong></li>
			<li><a href="/contribution/${ismember}/${username}/discuss">[토론]</a></li>
		</ol>
		
		<table class="table table-hover">
			<colgroup>
				<col>
				<col style="width: 25%;">
				<col style="width: 22%;">
			</colgroup>
			
			<thead id>
				<tr>
					<th>문서</th>
					<th>수정자</th>
					<th>수정 시간</th>
				</tr>
			</thead>
			
			<tbody id>
	`;
	
	for(var row of data) {
		var title = totitle(row.title, row.namespace) + '';
		
		content += `
				<tr${(row.log.length > 0 || row.advance.length > 0 ? ' class=no-line' : '')}>
					<td>
						<a href="/w/${encodeURIComponent(title)}">${html.escape(title)}</a> 
						<a href="/history/${encodeURIComponent(title)}">[역사]</a> 
						${
								Number(row.rev) > 1
								? '<a \href="/diff/' + encodeURIComponent(title) + '?rev=' + row.rev + '&oldrev=' + String(Number(row.rev) - 1) + '">[비교]</a>'
								: ''
						} 
						<a href="/discuss/${encodeURIComponent(title)}">[토론]</a> 
						
						(<span style="color: ${
							(
								Number(row.changes) > 0
								? 'green'
								: (
									Number(row.changes) < 0
									? 'red'
									: 'gray'
								)
							)
							
						};">${row.changes}</span>)
					</td>
					
					<td>
						${ip_pas(row.username, row.ismember)}
					</td>
					
					<td>
						${generateTime(toDate(row.time), timeFormat)}
					</td>
				</tr>
		`;
		
		if(row.log.length > 0 || row.advance != 'normal') {
			content += `
				<td colspan="3" style="padding-left: 1.5rem;">
					${row.log} ${row.advance != 'normal' ? `<i>(${edittype(row.advance, ...(row.flags.split('\n')))})</i>` : ''}
				</td>
			`;
		}
	}
	
	content += `
			</tbody>
		</table>
	`;
	
	res.send(render(req, `"${username}" 기여 목록`, content, {}));
});

wiki.get(/^\/RecentDiscuss$/, async function recentDicsuss(req, res) {
	var logtype = req.query['logtype'];
	if(!logtype) logtype = 'all';
	
	var content = `
		<ol class="breadcrumb link-nav">
			<li><a href="?logtype=normal_thread">[열린 토론]</a></li>
			<li><a href="?logtype=old_thread">[오래된 토론]</a></li>
			<li><a href="?logtype=closed_thread">[닫힌 토론]</a></li>

			<li><a href="?logtype=open_editrequest">[열린 편집 요청]</a></li>
			<li><a href="?logtype=accepted_editrequest">[승인된 편집 요청]</a></li>
			<li><a href="?logtype=closed_editrequest">[닫힌 편집 요청]</a></li>
		</ol>
		
		<table class="table table-hover">
			<colgroup>
				<col>
				<col style="width: 22%; min-width: 100px;">
			</colgroup>
			<thead>
				<tr>
					<th>항목</th>
					<th>수정 시간</th>
				</tr>
			</thead>
			
			<tbody id>
	`;
	
	var trds;
	
	switch(logtype) {
		case 'normal_thread':
			trds = await curs.execute("select title, namespace, topic, time, tnum from threads where status = 'normal' and not deleted = '1' order by cast(time as integer) desc limit 120");
		break; case 'old_thread':
			trds = await curs.execute("select title, namespace, topic, time, tnum from threads where status = 'normal' and not deleted = '1' order by cast(time as integer) asc limit 120");
		break; case 'closed_thread':
			trds = await curs.execute("select title, namespace, topic, time, tnum from threads where status = 'close' and not deleted = '1' order by cast(time as integer) desc limit 120");
		break; case 'open_editrequest':
			trds = await curs.execute("select id, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'open' and not deleted = '1' order by cast(date as integer) desc limit 120");
		break; case 'closed_editrequest':
			trds = await curs.execute("select id, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'closed' and not deleted = '1' order by cast(date as integer) desc limit 120");
		break; case 'accepted_editrequest':
			trds = await curs.execute("select id, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'accepted' and not deleted = '1' order by cast(date as integer) desc limit 120");
		break; default:
			var data1 = await curs.execute("select title, namespace, topic, time, tnum from threads where status = 'normal' and not deleted = '1' order by cast(time as integer) desc limit 120");
			var data2 = await curs.execute("select id, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'open' and not deleted = '1' order by cast(date as integer) desc limit 120");
			trds = data1.concat(data2).sort((l, r) => ((r.date || r.time) - (l.date || l.time)));
	}
	
	for(var trd of trds) {
		const title = totitle(trd.title, trd.namespace) + '';
		
		content += `
			<tr>
				<td>
					${trd.state
						? `<a href="/edit_request/${trd.id}">편집 요청 ${html.escape(trd.id)}</a> (<a href="/discuss/${encodeURIComponent(title)}">${html.escape(title)}</a>)`
						: `<a href="/thread/${trd.tnum}">${html.escape(trd.topic)}</a> (<a href="/discuss/${encodeURIComponent(title)}">${html.escape(title)}</a>)`
					}
				</td>
				
				<td>
					${generateTime(toDate(trd.time || trd.date), timeFormat)}
				</td>
			</tr>
		`;
	}
	
	content += `
			</tbody>
		</table>
	`;
	
	res.send(render(req, "최근 토론", content, {}));
});

wiki.get(/^\/contribution\/(ip|author)\/(.*)\/discuss/, async function discussionLog(req, res) {
	const ismember = req.params[0];
	const username = req.params[1];
	
	var dd = await curs.execute("select id, tnum, time, username, ismember from res \
				where cast(time as integer) >= ? and ismember = ? and username = ? order by cast(time as integer) desc", [
					Number(getTime()) - 2592000000, ismember, username
				]);
	
//			<li><a href="/contribution/${ismember}/${username}/document">[문서]</a></li>
//			<li><a href="/contribution/${ismember}/${username}/discuss">[토론]</a></li>
	
	var content = `
		<p>최근 30일동안의 기여 목록 입니다.</p>
	
		<ol class="breadcrumb link-nav">
			<li><a href="/contribution/${ismember}/${username}/document">[문서]</a></li>
			<li><strong>[토론]</strong></li>
		</ol>
		
		<table class="table table-hover">
			<colgroup>
				<col>
				<col style="width: 25%;">
				<col style="width: 22%;">
			</colgroup>
			
			<thead id>
				<tr>
					<th>항목</th>
					<th>수정자</th>
					<th>수정 시간</th>
				</tr>
			</thead>
			
			<tbody id>
	`;
	
	for(var row of dd) {
		const td = (await curs.execute("select title, namespace, topic from threads where tnum = ?", [row.tnum]))[0];
		const title = totitle(td.title, td.namespace) + '';
		
		content += `
				<tr>
					<td>
						<a href="/thread/${row.tnum}">#${row.id} ${html.escape(td['topic'])}</a> (<a href="/w/${encodeURIComponent(title)}">${html.escape(title)}</a>)
					</td>
					
					<td>
						${ip_pas(row.username, row.ismember)}
					</td>
					
					<td>
						${generateTime(toDate(row.time), timeFormat)}
					</td>
				</tr>
		`;
	}
	
	content += `
			</tbody>
		</table>
	`;
	
	res.send(render(req, `"${username}" 기여 목록`, content, {}));
});

wiki.get(/^\/history\/(.*)/, async function viewHistory(req, res) {
	var title = req.params[0];
	
	const doc = processTitle(title);
	const from = req.query['from'];
	const until = req.query['until'];
	title = totitle(doc.title, doc.namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) {
		return res.send(showError(req, aclmsg, 1));
	}
	
	var data;
	
	if(from) {  // 더시드에서 from이 더 우선임
		data = await curs.execute("select flags, rev, time, changes, log, iserq, erqnum, advance, ismember, username, edit_request_id from history \
						where title = ? and namespace = ? and (cast(rev as integer) <= ? AND cast(rev as integer) > ?) \
						order by cast(rev as integer) desc",
						[doc.title, doc.namespace, Number(from), Number(from) - 30]);
	} else if(until) {
		data = await curs.execute("select flags, rev, time, changes, log, iserq, erqnum, advance, ismember, username, edit_request_id from history \
						where title = ? and namespace = ? and (cast(rev as integer) >= ? AND cast(rev as integer) < ?) \
						order by cast(rev as integer) desc",
						[doc.title, doc.namespace, Number(until), Number(until) + 30]);
	} else {
		data = await curs.execute("select flags, rev, time, changes, log, iserq, erqnum, advance, ismember, username, edit_request_id from history \
						where title = ? and namespace = ? order by cast(rev as integer) desc limit 30",
						[doc.title, doc.namespace]);
	}
	
	if(!data.length) res.send(showError(req, 'document_not_found'));
	
	const navbtns = navbtn(0, 0, 0, 0);
	
	var content = `
		<p>
			<button id="diffbtn" class="btn btn-secondary">선택 리비젼 비교</button>
		</p>
		
		${navbtns}
		
		<ul class=wiki-list>
	`;
	
	for(var row of data) {
		content += `
				<li>
					${generateTime(toDate(row.time), timeFormat)} 
		
					<span style="font-size: 8pt;">
						(<a rel=nofollow href="/w/${encodeURIComponent(title)}?rev=${row.rev}">보기</a> |
							<a rel=nofollow href="/raw/${encodeURIComponent(title)}?rev=${row.rev}" data-npjax="true">RAW</a> |
							<a rel=nofollow href="/blame/${encodeURIComponent(title)}?rev=${row.rev}">Blame</a> |
							<a rel=nofollow href="/revert/${encodeURIComponent(title)}?rev=${row.rev}">이 리비젼으로 되돌리기</a>${
								Number(row.rev) > 1
								? ' | <a rel=nofollow href="/diff/' + encodeURIComponent(title) + '?rev=' + row.rev + '&oldrev=' + String(Number(row.rev) - 1) + '">비교</a>'
								: ''
							})
					</span> 
					
					<input type="radio" name="oldrev" value="${row.rev}">
					<input type="radio" name="rev" value="${row.rev}">

					${row.advance != 'normal' ? `<i>(${edittype(row.advance, ...(row.flags.split('\n')))})</i>` : ''}
					
					<strong>r${row.rev}</strong> 
					
					(<span style="color: ${
						(
							Number(row.changes) > 0
							? 'green'
							: (
								Number(row.changes) < 0
								? 'red'
								: 'gray'
							)
						)
						
					};">${row.changes}</span>)
					
					${row.edit_request_id ? '<i><a href="/edit_request/' + row.edit_request_id + '">(편집 요청)</a></i>' : ''} ${ip_pas(row.username, row.ismember)}
					
					(<span style="color: gray;">${row.log}</span>)
				</li>
		`;
	}
	
	content += `
		</ul>
		
		${navbtns}
		
		<script>historyInit("${encodeURIComponent(title)}");</script>
	`;
	
	res.send(render(req, totitle(doc.title, doc.namespace) + '의 역사', content, {
		document: doc,
	}, '', error = false, viewname = 'history'));
});

wiki.get(/^\/discuss\/(.*)/, async function threadList(req, res) {
	const title = req.params[0];
	const doc = processTitle(title);
	
	var state = req.query['state'];
	if(!state) state = '';
	
	if(!await getacl(req, doc.title, doc.namespace, 'read')) {
		return res.send(showError(req, 'insufficient_privileges_read'));
	}
	
	var content = '';
	
	var trdlst;
	
	var subtitle = '';
	var viewname = '';
	
	switch(state) {
		case 'close':
			content += '<ul class=wiki-list>';
			
			var cnt = 0;
			trdlst = await curs.execute("select topic, tnum from threads where title = ? and namespace = ? and status = 'close' and not deleted = '1' order by cast(time as integer) desc", [doc.title, doc.namespace]);
			
			for(var trd of trdlst) {
				content += `<li><a href="#${++cnt}">${cnt}</a>. <a href="/thread/${trd.tnum}">${html.escape(trd.topic)}</a></li>`;
			}
			
			content += '</ul>';
			
			subtitle = ' (닫힌 토론)';
			viewname = 'thread_list_close';
		break; case 'closed_edit_requests':
			content += '<ul class=wiki-list>';
			
			trdlst = await curs.execute("select id from edit_requests where state = 'closed' and not deleted = '1' and title = ? and namespace = ? order by cast(date as integer) desc", [doc.title, doc.namespace]);
			
			for(var trd of trdlst) {
				content += `<li><a href="/edit_request/${trd.id}">편집 요청 ${trd.id}</a></li>`;
			}
			
			content += '</ul>';
			
			subtitle = ' (닫힌 편집 요청)';
			viewname = 'edit_request_list_close';
		break; default:
			content += `
				<h3 class="wiki-heading">편집 요청</h3>
				<div class=wiki-heading-content>
					<ul class=wiki-list>
			`;
			
			trdlst = await curs.execute("select id from edit_requests where state = 'open' and not deleted = '1' and title = ? and namespace = ? order by cast(date as integer) desc", [doc.title, doc.namespace]);
			for(var item of trdlst) {
				content += `<li><a href="/edit_request/${item.id}">편집 요청 ${item.id}</a></li>`;
			}
			
			content += `
					</ul>
				</div>
				
				<p>
					<a href="?state=closed_edit_requests">[닫힌 편집 요청 보기]</a>
				</p>
			`;
			
			content += `
				<h3 class="wiki-heading">토론</h3>
				<div class=wiki-heading-content>
					<ul class=wiki-list>
			`;
			
			var cnt = 0;
			trdlst = await curs.execute("select topic, tnum from threads where title = ? and namespace = ? and status = 'normal' and not deleted = '1' order by cast(time as integer) desc", [doc.title, doc.namespace]);
			
			for(var trd of trdlst) {
				content += `<li><a href="#${++cnt}">${cnt}</a>. <a href="/thread/${trd.tnum}">${html.escape(trd.topic)}</a></li>`;
			}
			
			content += `
					</ul>
				</div>
					
				<p>
					<a href="?state=close">[닫힌 토론 목록 보기]</a>
				</p>`
			
			cnt = 0;
			for(var trd of trdlst) {
				content += `
					<h2 class=wiki-heading id="${++cnt}">
						${cnt}. <a href="/thread/${trd.tnum}">${html.escape(trd.topic)}</a>
					</h2>
					
					<div class=topic-discuss>
				`;
				
				const td = await curs.execute("select isadmin, id, content, username, time, hidden, hider, status, ismember from res where tnum = ? order by cast(id as integer) asc", [trd.tnum]);
				const ltid = Number((await curs.execute("select id from res where tnum = ? order by cast(id as integer) desc limit 1", [trd.tnum]))[0]['id']);
				
				var ambx = false;
				
				const fstusr = (await curs.execute("select username from res where tnum = ? and (id = '1')", [trd.tnum]))[0]['username'];
				
				for(var rs of td) {
					const crid = Number(rs['id']);
					if(ltid > 4 && crid != 1 && (crid < ltid - 2)) {
						if(!ambx) {
							content += `
								<div>
									<a class=more-box href="/thread/${trd.tnum}">more...</a>
								</div>
							`;
							
							ambx = true;
						}
						continue;
					}
					
					content += `
						<div class=res-wrapper>
							<div class="res res-type-${rs['status'] == '1' ? 'status' : 'normal'}">
								<div class="r-head${rs['username'] == fstusr ? " first-author" : ''}">
									<span class=num>#${rs['id']}</span> ${ip_pas(rs['username'], rs['ismember'], 1).replace('<a ', rs.isadmin == '1' ? '<a style="font-weight: bold;" ' : '<a ')} <span style="float: right;">${generateTime(toDate(rs['time']), timeFormat)}</span>
								</div>
								
								<div class="r-body${rs['hidden'] == '1' ? ' r-hidden-body' : ''}">
									${
										rs['hidden'] == '1'
										? (
											getperm('hide_thread_comment', ip_check(req))
											? '[' + rs['hider'] + '에 의해 숨겨진 글입니다.]<div class="text-line-break" style="margin: 25px 0px 0px -10px; display:block"><a class="text" onclick="$(this).parent().parent().children(\'.hidden-content\').show(); $(this).parent().css(\'margin\', \'15px 0 15px -10px\'); return false;" style="display: block; color: #fff;">[ADMIN] Show hidden content</a><div class="line"></div></div><div class="hidden-content" style="display:none">' + await markdown(rs['content'], 1) + '</div>'
											: '[' + rs['hider'] + '에 의해 숨겨진 글입니다.]'
										  )
										: await markdown(rs['content'], 1)
									}
								</div>
							</div>
						</div>
					`;
				}
				
				content += '</div>';
			}
				
			content += `
				<h3 class="wiki-heading">새 주제 생성</h3>
				
				${doc + '' == config.getString('frontpage', 'FrontPage') ? `
					<div class="alert alert-success alert-dismissible fade in" role="alert">
						<strong>[경고!]</strong> 이 토론은 ${doc + ''} 문서의 토론입니다. ${doc + ''} 문서와 관련 없는 토론은 각 문서의 토론에서 진행해 주시기 바랍니다. ${doc + ''} 문서와 관련 없는 토론은 삭제될 수 있습니다.
					</div>
				` : ''}
				
				<form method="post" class="new-thread-form" id="topicForm">
					<input type="hidden" name="identifier" value="${islogin(req) ? 'm' : 'i'}:${ip_check(req)}">
					<div class="form-group">
						<label class="control-label" for="topicInput" style="margin-bottom: 0.2rem;">주제 :</label>
						<input type="text" class="form-control" id="topicInput" name="topic">
					</div>

					<div class="form-group">
					<label class="control-label" for="contentInput" style="margin-bottom: 0.2rem;">내용 :</label>
						<textarea name="text" class="form-control" id="contentInput" rows="5"></textarea>
					</div>
					
					${islogin(req) ? '' : `<p style="font-weight: bold; font-size: 1rem;">[알림] 비로그인 상태로 토론 주제를 생성합니다. 토론 내역에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
					
					<div class="btns">
						<button id="createBtn" class="btn btn-primary" style="width: 8rem;">전송</button>
					</div>

					<!--
					<div id="recaptcha"><div><noscript>Aktiviere JavaScript, um eine reCAPTCHA-Aufgabe zu erhalten.&lt;br&gt;</noscript><div class="if-js-enabled">Führe ein Upgrade auf einen <a href="http://web.archive.org/web/20171027095753/https://support.google.com/recaptcha/?hl=en#6223828">unterstützten Browser</a> aus, um eine reCAPTCHA-Aufgabe zu erhalten.</div><br>Wenn du meinst, dass diese Seite fälschlicherweise angezeigt wird, überprüfe bitte deine Internetverbindung und lade die Seite neu.<br><br><a href="http://web.archive.org/web/20171027095753/https://support.google.com/recaptcha#6262736" target="_blank">Warum gerade ich?</a></div></div>
					<script>
						recaptchaInit('recaptcha', {
							'sitekey': '6LcUuigTAAAAALyrWQPfwtFdFWFdeUoToQyVnD8Y',
							'size': 'invisible',
							'bind': 'createBtn',
							'badge': 'inline',
							'callback': function() { $("#createBtn").attr("disabled", true); $("#topicForm").submit(); }
						});
					</script>
					-->
				</form>
			`;
			
			subtitle = ' (토론)';
			viewname = 'thread_list';
	}
	
	res.send(render(req, totitle(doc.title, doc.namespace) + subtitle, content, {
		document: doc,
	}, '', false, viewname));
});

wiki.post(/^\/discuss\/(.*)/, async function createThread(req, res) {
	const title = req.params[0];
	const doc = processTitle(title);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) {
		return res.send(showError(req, aclmsg, 1));
	}
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'create_thread', 1);
	if(aclmsg) {
		return res.send(showError(req, aclmsg, 1));
	}
	
	var tnum = rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 22);
	
	while(1) {
		await curs.execute("select tnum from threads where tnum = ?", [tnum]);
		if(!curs.fetchall().length) break;
		tnum = rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 22);
	}
	
	await curs.execute("insert into threads (title, namespace, topic, status, time, tnum) values (?, ?, ?, ?, ?, ?)",
					[doc.title, doc.namespace, req.body['topic'], 'normal', getTime(), tnum]);
	
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin) values \
					(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
					['1', req.body['text'], ip_check(req), getTime(), '0', '', '0', tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0']);
					
	res.redirect('/thread/' + tnum);
});

wiki.get('/thread/:tnum', async function viewThread(req, res) {
	const tnum = req.param("tnum");
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) { res.send(showError(req, "thread_not_found")); return; }
	
	var data = await curs.execute("select title, namespace, topic, status from threads where tnum = ?", [tnum]);
	const title = data[0]['title'];
	const namespace = data[0]['namespace'];
	const topic = data[0]['topic'];
	const status = data[0]['status'];
	const doc = totitle(title, namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) {
		return res.send(showError(req, aclmsg, 1));
	}
	
	var content = `
		<h2 class=wiki-heading style="cursor: pointer;">
			${html.escape(topic)}
			${
				getperm('delete_thread', ip_check(req))
				? '<span class=pull-right><a onclick="return confirm(\'삭제하시겠습니까?\');" href="/admin/thread/' + tnum + '/delete" class="btn btn-danger btn-sm">[ADMIN] 삭제</a></span>'
				: ''
			}
		</h2>
		
		<div class=wiki-heading-content>
		
			<div id=res-container>
	`;
	
	for(var i=1; i<=rescount; i++) {
		content += `
			<div class="res-wrapper res-loading" data-id="${i}" data-locked="false" data-visible=false>
				<div class="res res-type-normal">
					<div class="r-head">
						<span class="num"><a id="${i}">#${i}</a>&nbsp;</span>
					</div>
					
					<div class="r-body"></div>
				</div>
			</div>
		`;
	}
	
	content += `
			</div>
		</div>
		
		<script>$(function() { discussPollStart("${tnum}"); });</script>
		
		<h2 class=wiki-heading style="cursor: pointer;">댓글 달기</h2>
	`;
	
	if(getperm('update_thread_status', ip_check(req))) {
		var sts = '';
		
		switch(status) {
			case 'close':
				sts = `
					<option value="normal">normal</option>
					<option value="pause">pause</option>
				`;
			break;case 'normal':
				sts = `
					<option value="close">close</option>
					<option value="pause">pause</option>
				`;
			break;case 'pause':
				sts = `
					<option value="close">close</option>
					<option value="normal">normal</option>
				`;
		}
		
		content += `
		    <form method="post" id="thread-status-form">
        		[ADMIN] 쓰레드 상태 변경
        		<select name="status">${sts}</select>
        		<button id="changeBtn" class="d_btn type_blue">변경</button>
        	</form>
		`;
	}
	
	if(getperm('update_thread_document', ip_check(req))) {
		content += `
        	<form method="post" id="thread-document-form">
        		[ADMIN] 쓰레드 이동
        		<input type="text" name="document" value="${title}">
        		<button id="changeBtn" class="d_btn type_blue">변경</button>
        	</form>
		`;
	}
	
	if(getperm('update_thread_topic', ip_check(req))) {
		content += `
        	<form method="post" id="thread-topic-form">
        		[ADMIN] 쓰레드 주제 변경
        		<input type="text" name="topic" value="${topic}">
        		<button id="changeBtn" class="d_btn type_blue">변경</button>
        	</form>
		`;
	}
	
	content += `
		<form id=new-thread-form method=post>
			<textarea class=form-control rows=5 name=text ${['close', 'pause'].includes(status) ? 'disabled' : ''}>${status == 'pause' ? 'pause 상태입니다.' : (status == 'close' ? '닫힌 토론입니다.' : '')}</textarea>
		
			${islogin(req) ? '' : `<p style="font-weight: bold; font-size: 1rem;">[알림] 비로그인 상태로 토론에 참여합니다. 토론 내역에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
			
			<div class=btns>
				<button type=submit class="btn btn-primary" style="width: 120px;">전송</button>
			</div>
		</form>
	`;
	
	res.send(render(req, totitle(title, namespace) + ' (토론) - ' + topic, content, {
		document: doc,
	}, '', error = false, viewname = 'thread'));
});

wiki.post('/thread/:tnum', async function postThreadComment(req, res) {
	const tnum = req.param("tnum");
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) { res.send(showError(req, "thread_not_found")); return; }
	
	var data = await curs.execute("select title, namespace, topic, status from threads where tnum = ?", [tnum]);
	const title = data[0]['title'];
	const topic = data[0]['topic'];
	const status = data[0]['status'];
	const namespace = data[0]['namespace'];
	const doc = totitle(title, namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) {
		return res.send(showError(req, aclmsg, 1));
	}
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'write_thread_comment', 1);
	if(aclmsg) {
		return res.status(403).json({ status: aclmsg });
	}
	
	var data = await curs.execute("select id from res where tnum = ? order by cast(id as integer) desc limit 1", [tnum]);
	const lid = Number(data[0]['id']);
	
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin) \
					values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
						String(lid + 1), req.body['text'], ip_check(req), getTime(), '0', '', '0', tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0'
					]);
					
	await curs.execute("update threads set time = ? where tnum = ?", [getTime(), tnum]);
	
	res.json({});
});

wiki.get('/thread/:tnum/:id', async function dropThreadData(req, res) {
	const tnum = req.param("tnum");
	const tid = req.param("id");
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) { res.send(showError(req, "thread_not_found")); return; }
	
	var data = await curs.execute("select username from res where tnum = ? and (id = '1')", [tnum]);
	const fstusr = data[0]['username'];
	
	var data = await curs.execute("select title, namespace, topic, status from threads where tnum = ?", [tnum]);
	const title = data[0]['title'];
	const namespace = data[0]['namespace'];
	const topic = data[0]['topic'];
	const status = data[0]['status'];
	const doc = totitle(title, namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) {
		return res.send(showError(req, aclmsg, 1));
	}
	
	content = ``;
	
	var data = await curs.execute("select isadmin, type, id, content, username, time, hidden, hider, status, ismember from res where tnum = ? and (cast(id as integer) = 1 or (cast(id as integer) >= ? and cast(id as integer) < ?)) order by cast(id as integer) asc", [tnum, Number(tid), Number(tid) + 30]);
	for(var rs of data) {
		content += `
			<div class=res-wrapper data-id="${rs['id']}">
				<div class="res res-type-${rs['status'] == '1' ? 'status' : 'normal'}">
					<div class="r-head${rs['username'] == fstusr ? " first-author" : ''}">
						<span class=num>
							<a id="${rs['id']}">#${rs['id']}</a>&nbsp;
						</span> ${ip_pas(rs['username'], rs['ismember'], 1).replace('<a ', rs.isadmin == '1' ? '<a style="font-weight: bold;" ' : '<a ')}${rs['ismember'] == 'author' && await userblocked(rs.username) ? ' <small>(차단된 사용자)</small>' : ''}${rs['ismember'] == 'ip' && await ipblocked(rs.username) ? ' <small>(차단된 아이피)</small>' : ''} <span style="float: right;">${generateTime(toDate(rs['time']), timeFormat)}</span>
					</div>
					
					<div class="r-body${rs['hidden'] == '1' ? ' r-hidden-body' : ''}">
						${
							rs['hidden'] == '1'
							? (
								getperm('hide_thread_comment', ip_check(req))
								? '[' + rs['hider'] + '에 의해 숨겨진 글입니다.]<div class="text-line-break" style="margin: 25px 0px 0px -10px; display:block"><a class="text" onclick="$(this).parent().parent().children(\'.hidden-content\').show(); $(this).parent().css(\'margin\', \'15px 0 15px -10px\'); $(this).hide(); return false;" style="display: block; color: #fff;">[ADMIN] Show hidden content</a><div class="line"></div></div><div class="hidden-content" style="display:none">' + await markdown(rs['content'], 1) + '</div>'
								: '[' + rs['hider'] + '에 의해 숨겨진 글입니다.]'
							  )
							: (
								rs['status'] == 1
								? (
									rs.type == 'status'
									? '스레드 상태를 <strong>' + rs['content'] + '</strong>로 변경'
									: (
										rs.type == 'document'
										? '스레드를 <strong>' + rs['content'] + '</strong> 문서로 이동'
										: '스레드 주제를 <strong>' + rs['content'] + '</strong>로 변경'
									)
								) : await markdown(rs['content'], 1)
							)
						}
					</div>
				</div>`;
		if(getperm('hide_thread_comment', ip_check(req))) {
			content += `
				<div class="combo admin-menu">
					<a class="btn btn-danger btn-sm" href="/admin/thread/${tnum}/${rs['id']}/${rs['hidden'] == '1' ? 'show' : 'hide'}">[ADMIN] 숨기기${rs['hidden'] == '1' ? ' 해제' : ''}</a>
				</div>
			`;
		}
		content += `
			</div>
		`;
	}
	
	res.send(content);
});

wiki.get('/admin/thread/:tnum/:id/show', async function showHiddenComment(req, res) {
	const tnum = req.param("tnum");
	const tid = req.param("id");
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) { res.send(showError(req, "thread_not_found")); return; }
	
	if(!getperm('hide_thread_comment', ip_check(req))) {
		return res.send(showError(req, 'insufficient_privileges'));
	}
	
	await curs.execute("update res set hidden = '0', hider = '' where tnum = ? and id = ?", [tnum, tid]);
	
	res.redirect('/thread/' + tnum);
});

wiki.get('/admin/thread/:tnum/:id/hide', async function hideComment(req, res) {
	const tnum = req.param("tnum");
	const tid = req.param("id");
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) { res.send(showError(req, "thread_not_found")); return; }
	
	if(!getperm('hide_thread_comment', ip_check(req))) {
		return res.send(showError(req, 'insufficient_privileges'));
	}
	
	await curs.execute("update res set hidden = '1', hider = ? where tnum = ? and id = ?", [ip_check(req), tnum, tid]);
	
	res.redirect('/thread/' + tnum);
});

wiki.post('/admin/thread/:tnum/status', async function updateThreadStatus(req, res) {
	const tnum = req.param("tnum");
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) { res.send(showError(req, "thread_not_found")); return; }
	
	var newstatus = req.body['status'];
	if(!['close', 'pause', 'normal'].includes(newstatus)) newstatus = 'normal';
	
	if(!getperm('update_thread_status', ip_check(req))) {
		return res.send(showError(req, 'insufficient_privileges'));
	}
	
	curs.execute("update threads set status = ? where tnum = ?", [newstatus, tnum]);
	curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin, type) \
					values (?, ?, ?, ?, '0', '', '1', ?, ?, ?, 'status')", [
						String(rescount + 1), newstatus, ip_check(req), getTime(), tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0' 
					]);
	
	res.json({});
});

wiki.post('/admin/thread/:tnum/document', async function updateThreadDocument(req, res) {
	const tnum = req.param("tnum");
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) { res.send(showError(req, "thread_not_found")); return; }
	
	if(!getperm('update_thread_document', ip_check(req))) {
		return res.send(showError(req, 'insufficient_privileges'));
	}
	
	var newdoc = req.body['document'];
	if(!newdoc.length) {
		return res.send('');
	}
	
	curs.execute("update threads set title = ? where tnum = ?", [newdoc, tnum]);
	curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin, type) \
					values (?, ?, ?, ?, '0', '', '1', ?, ?, ?, 'document')", [
						String(rescount + 1), newdoc, ip_check(req), getTime(), tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0' 
					]);
	
	res.json({});
});

wiki.post('/admin/thread/:tnum/topic', async function updateThreadTopic(req, res) {
	const tnum = req.param("tnum");
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) { res.send(showError(req, "thread_not_found")); return; }

	if(!getperm('update_thread_topic', ip_check(req))) {
		return res.send(showError(req, 'insufficient_privileges'));
	}

	var newtopic = req.body['topic'];
	if(!newtopic.length) {
		return res.send('');
	}
		
	curs.execute("update threads set topic = ? where tnum = ?", [newtopic, tnum]);
	curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin, type) \
					values (?, ?, ?, ?, '0', '', '1', ?, ?, ?, 'topic')", [
						String(rescount + 1), newtopic, ip_check(req), getTime(), tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0' 
					]);
	
	res.json({});
});

wiki.get('/admin/thread/:tnum/delete', async function deleteThread(req, res) {
	const tnum = req.param("tnum");
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	const rescount = data.length;
	
	if(!rescount) { res.send(showError(req, "thread_not_found")); return; }
	
	var data = await curs.execute("select title, namespace from threads where tnum = ?", [tnum]);
	const title = totitle(data[0].title, data[0].namespace) + '';
	
	if(!getperm('delete_thread', ip_check(req))) {
		return res.send(showError(req, 'insufficient_privileges'));
	}
	
	await curs.execute("update threads set deleted = '1' where tnum = ?", [tnum]);
	// await curs.execute("delete from res where tnum = ?", [tnum]);
	
	res.redirect('/discuss/' + encodeURIComponent(title));
});

wiki.post('/notify/thread/:tnum', async function notifyEvent(req, res) {
	var tnum = req.param("tnum");
	
	await curs.execute("select id from res where tnum = ?", [tnum]);
	
	const rescount = curs.fetchall().length;
	
	if(!rescount) { res.send(showError(req, "thread_not_found")); return; }
	
	var data = await curs.execute("select id from res where tnum = ? order by cast(time as integer) desc limit 1", [tnum]);
	
	res.json({
		status: "event",
		comment_id: Number(data[0].id)
	});
});

wiki.all(/^\/delete\/(.*)/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	
	if(!await getacl(req, doc.title, doc.namespace, 'read')) {
		return res.send(showError(req, 'insuffisient_privileges_read'));
	}
	
	if(!await getacl(req, doc.title, doc.namespace, 'edit')) {
		return res.send(showError(req, 'insuffisient_privileges_edit'));
	}
	
	if(!await getacl(req, doc.title, doc.namespace, 'delete')) {
		return res.send(showError(req, 'insuffisient_privileges_delete'));
	}
	
	const o_o = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!o_o.length) {
		return res.send(showError(req, 'document_not_found'));
	}
	
	var content = `
		<form id="deleteForm" method="post">
            <div class="form-group">
				<label class="control-label" for="logInput">요약</label>
				<input type="text" id="logInput" name="send" class="form-control" value="">
			</div>
			
            <label>
				<label><input type="checkbox" name="agree" id="agreeCheckbox" value="Y" /> 문서 이동 목적이 아닌, 삭제하기 위함을 확인합니다.</label>
            </label>
			
            <p>
				<b>알림!&nbsp;:</b>&nbsp;문서의 제목을 변경하려는 경우 <a href="/move/${encodeURIComponent(doc + '')}">문서 이동</a> 기능을 사용해주세요. 문서 이동 기능을 사용할 수 없는 경우 토론 기능이나 게시판을 통해 대행 요청을 해주세요.
            </p>

            <div class="btns">
				<button type="reset" class="btn btn-secondary">초기화</button>
				<button type="submit" class="btn btn-primary" id="submitBtn">삭제</button>
            </div>
       </form>
	`;
	
	if(req.method == 'POST') {
		if(doc.namespace == '사용자') {
			content = alertBalloon(fetchErrorString('disable_user_document'), 'danger', true, 'fade in') + content;
		} else if(!req.body['agree']) {
			content = alertBalloon('agree의 값은 필수입니다.', 'danger', true, 'fade in') + content;
		} else {
			const o_o = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
			if(!o_o.length) {
				return res.send(showError(req, 'document_not_found'));
			}
			
			const _recentRev = await curs.execute("select content, rev from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
			const recentRev = _recentRev[0];
			
			await curs.execute("delete from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
			const rawChanges = 0 - recentRev.content.length;
			curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance) \
							values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
				doc.title, doc.namespace, '', String(Number(recentRev.rev) + 1), ip_check(req), getTime(), '' + (rawChanges), req.body['log'] || '', '0', '-1', islogin(req) ? 'author' : 'ip', 'delete'
			]);
			
			return res.redirect('/w/' + encodeURIComponent(doc + ''));
		}
	}
	
	res.send(render(req, doc + ' (삭제)', content, {
		document: doc,
	}, '', _, 'delete'));
});

wiki.all(/^\/admin\/suspend_account$/, async(req, res) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!hasperm(req, 'suspend_account')) return res.status(403).send(showError(req, 'insufficient_privileges'));
	
	var content = `
		<form method="post">
			<div>
				<label>유저 이름 : </label><br />
				<input class="form-control" id="usernameInput" name="username" style="width: 250px;" type="text" />
			</div>
			
			<div>
				<label>메모 : </label><br />
				<input class="form-control" id="noteInput" name="note" style="width: 400px;" type="text" />
			</div>
			
			<div>
				<label>기간 : </label><br /> 
				<select class="form-control" name="expire" id="expire" style="width: 100%">
					<option value="">선택</option>
					<option value="-1">해제</option>
					<option value="0">영구</option>
					<option value="60">1분</option>
					<option value="300">5분</option>
					<option value="600">10분</option>
					<option value="1800">30분</option>
					<option value="3600">1시간</option>
					<option value="7200">2시간</option>
					<option value="86400">하루</option>
					<option value="259200">3일</option>
					<option value="432000">5일</option>
					<option value="604800">7일</option>
					<option value="1209600">2주</option>
					<option value="1814400">3주</option>
					<option value="2592000">1개월</option>
					<option value="15552000">6개월</option>
					<option value="31104000">1년</option>
				</select>
			</div>
			
			<button class="btn btn-info pull-right" id="moveBtn" style="width: 100px;" type="submit">확인</button>
		</form>
	`;
	
	if(req.method == 'POST') {
		var { expire, note, username } = req.body;
		if(!expire) return res.send(render(req, '사용자 차단', alertBalloon('차단 기간이 올바르지 않습니다.', 'danger', true, 'fade in') + content, {}, '', true, 'suspend_account'));
		if(!username) return res.send(render(req, '사용자 차단', alertBalloon('사용자 이름의 값은 필수입니다.', 'danger', true, 'fade in') + content, {}, '', true, 'suspend_account'));
		if(!note) note = '';
		var data = await curs.execute("select username from users where username = ?", [username]);
		if(!data.length) return res.send(render(req, '사용자 차단', alertBalloon('계정이 존재하지 않습니다.', 'danger', true, 'fade in') + content, {}, '', true, 'suspend_account'));
		if(expire == '-1') {
			curs.execute("delete from suspend_account where username = ?", [username]);
			return res.redirect('/admin/suspend_account');
		}
		if(await userblocked(username)) return res.send(render(req, '사용자 차단', alertBalloon('already_suspend_account', 'danger', true, 'fade in') + content, {}, '', true, 'suspend_account'));
		const date = getTime();
		const expiration = expire == '0' ? '0' : String(Number(date) + Number(expire) * 1000);
		
		//'suspend_account': ['username', 'date', 'expiration', 'note'],
		curs.execute("insert into suspend_account (username, date, expiration, note) values (?, ?, ?, ?)", [username, String(getTime()), expiration, note]);
		return res.redirect('/admin/suspend_account');
	}
	
	return res.send(render(req, '사용자 차단', content, {}, '', false, 'suspend_account'));
});

wiki.post(/^\/admin\/ipacl\/remove$/, async(req, res) => {
	if(!hasperm(req, 'ipacl')) return res.status(403).send(showError(req, 'insufficient_privileges'));
	await curs.execute("delete from ipacl where cidr = ?", [req.body['ip']]);
	return res.redirect('/admin/ipacl');
});

wiki.all(/^\/admin\/ipacl$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!hasperm(req, 'ipacl')) return res.status(403).send(showError(req, 'insufficient_privileges'));
	
	var content = `
		<form method="post" class="settings-section">
    		<div class="form-group">
    			<label class="control-label">IP 주소 (CIDR<sup><a href="https://ko.wikipedia.org/wiki/%EC%82%AC%EC%9D%B4%EB%8D%94_(%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%82%B9)" target="_blank">[?]</a></sup>) :</label>
    			<div>
    				<input type="text" class="form-control" id="ipInput" name="ip" />
    			</div>
    		</div>

    		<div class="form-group">
    			<label class="control-label">메모 :</label>
    			<div>
    				<input type="text" class="form-control" id="noteInput" name="note" />
    			</div>
    		</div>

    		<div class="form-group">
    			<label class="control-label">차단 기간 :</label>
    			<select class="form-control" name="expire">
    				<option value="0" selected="">영구</option>
    				<option value="300">5분</option>
    				<option value="600">10분</option>
    				<option value="1800">30분</option>
    				<option value="3600">1시간</option>
    				<option value="7200">2시간</option>
    				<option value="86400">하루</option>
    				<option value="259200">3일</option>
    				<option value="432000">5일</option>
    				<option value="604800">7일</option>
    				<option value="1209600">2주</option>
    				<option value="1814400">3주</option>
    				<option value="2419200">4주</option>
    				<option value="4838400">2개월</option>
    				<option value="7257600">3개월</option>
    				<option value="14515200">6개월</option>
    				<option value="29030400">1년</option>
    			</select>
    		</div>

    		<div class="form-group">
    			<label class="control-label">로그인 허용 :</label>
    			<div class="checkbox">
    				<label>
    					<input type="checkbox" id="allowLoginInput" name="allow_login">&nbsp;&nbsp;Yes
    				</label>
    			</div>
    		</div>

    		<div class="btns" style="margin-bottom: 20px;">
    			<button type="submit" class="btn btn-primary" style="width: 90px;">추가</button>
    		</div>
    	</form>
		
		<div class="line-break" style="margin: 20px 0;"></div>
		
		<!-- 내비버튼 -->
		
		<form class="form-inline pull-right" id="searchForm" method=get>
    		<div class="input-group">
    			<input type="text" class="form-control" id="searchQuery" name="from" placeholder="CIDR" />
    			<span class="input-group-btn">
    				<button type=submit class="btn btn-primary">Go</button>
    			</span>
    		</div>
    	</form>
		
		<div class="table-wrap">
			<table class="table" style="margin-top: 7px;">
				<colgroup>
					<col style="width: 150px;">
					<col>
					<col style="width: 200px">
					<col style="width: 160px">
					<col style="width: 60px">
					<col style="width: 60px;">
				</colgroup>
				<thead>
					<tr style="vertical-align: bottom; border-bottom: 2px solid #eceeef;">
						<th>IP</th>
						<th>메모</th>
						<th>차단일</th>
						<th>만료일</th>
						<th style="text-align: center;">AL</th>
						<th style="text-align: center;">작업</th>
					</tr>
				</thead>
				<tbody>
					
	`;
	
	await curs.execute("delete from ipacl where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	var data = await curs.execute("select cidr, al, expiration, note, date from ipacl order by cidr asc limit 50");
	for(var row of data) {
		content += `
			<tr>
				<td>${row.cidr}</td>
				<td>${row.note}</td>
				<td>${generateTime(toDate(row.date), timeFormat)}
				<td>${!Number(row.expiration) ? '영구' : generateTime(toDate(row.expiration), timeFormat)}
				<td>${row.al == '1' ? 'Y' : 'N'}</td>
				<td class="text-center">
					<form method=post onsubmit="return confirm('정말로?');" action="/admin/ipacl/remove">
						<input type=hidden name=ip value="${row.cidr}">
						<input type=submit class="btn btn-sm btn-danger" value="삭제">
					</form>
				</td>
			</tr>
		`;
	}
	
	content += `
				</tbody>
    		</table>
    	</div>
    	<div class="text-right pull-right">
    		AL = Allow Login(로그인 허용)
    	</div>
	`;
	
	var error = false;
	
	if(req.method == 'POST') {
		var { ip, allow_login, expire, note } = req.body;
		if(!ip.includes('/')) ip += '/32';
		if(!ip.match(/^([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])\/([1-9]|[12][0-9]|3[0-2])$/)) error = true, content = alertBalloon(fetchErrorString('invalid_cidr'), 'danger', true, 'fade in') + content;
		else {
			const date = getTime();
			const expiration = expire == '0' ? '0' : String(Number(date) + Number(expire) * 1000);
			var data = await curs.execute("select cidr from ipacl where cidr = ? limit 1", [ip]);
			if(data.length) error = true, content = alertBalloon(fetchErrorString('ipacl_already_exists'), 'danger', true, 'fade in') + content;
			else {
				await curs.execute("insert into ipacl (cidr, al, expiration, note, date) values (?, ?, ?, ?, ?)", [ip, allow_login ? '1' : '0', expiration, note, date]);
				return res.redirect('/admin/ipacl');
			}
		}
	}
	
	res.send(render(req, 'IPACL', content, {
	}, '', error, 'ipacl'));
});

wiki.all(/^\/aclgroup\/create$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!hasperm(req, 'aclgroup')) return res.send(showError(req, 'insufficient_privileges'));
	
	var content = `
		<form method=post>
			<div class=form-group>
				<label>그룹 이름: </label><br />
				<input type=text name=group class=form-control />
			</div>
			
			<div class=btns>
				<button type=submit class="btn btn-primary" style="width: 100px;">생성</button>
			</div>
		</form>
	`;
	
	var error = false;
	
	if(req.method == 'POST') {
		const { group } = req.body;
		if(!group) error = true, content = alertBalloon('ACL그룹의 값은 필수입니다.', 'danger', true, 'fade in') + content;
		else {
			var data = await curs.execute("select name from aclgroup_groups where name = ?", [group]);
			if(data.length) content = alertBalloon(fetchErrorString('aclgroup_already_exists'), 'danger', true, 'fade in') + content;
			else {
				await curs.execute("insert into aclgroup_groups (name) values (?)", [group]);
				return res.redirect('/aclgroup');
			}
		}
	}
	
	res.send(render(req, 'ACL그룹 생성', content, {}, '', error, _));
});

wiki.post(/^\/aclgroup\/delete$/, async(req, res, next) => {
	if(!hasperm(req, 'aclgroup')) return res.send(showError(req, 'insufficient_privileges'));
	const { group } = req.body;
	if(!group) return res.redirect('/aclgroup');
	await curs.execute("delete from aclgroup_groups where name = ?", [group]);
	res.redirect('/aclgroup');
});

wiki.all(/^\/aclgroup$/, async(req, res) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	var data = await curs.execute("select name from aclgroup_groups", []);
	const editable = hasperm(req, 'aclgroup');
	
	var tabs = ``;
	const group = req.query['group'] || (data.length ? data[0].name : null);
	for(var g of data) {
		const delbtn = `<form method=post onsubmit="return confirm('삭제하시겠습니까?');" action="/aclgroup/delete?group=${encodeURIComponent(g.name)}" style="display: inline-block; margin: 0; padding: 0;"><input type=hidden name=group value="${html.escape(g.name)}" /><button type=submit style="background: none; border: none; padding: 0; margin: 0;">×</button></form>`;
		tabs += `
			<li class="nav-item">
				<a class="nav-link${g.name == group ? ' active' : ''}" href="?group=${encodeURIComponent(g.name)}">${html.escape(g.name)} ${editable ? delbtn : ''}</a>
			</li>
		`;
	}
	
	var content = `
		<ul class="nav nav-tabs" style="height: 38px;">
			${tabs}
			${editable ? `
			<li class="nav-item">
				<a class="nav-link" href="/aclgroup/create">+</a>
			</li>
			` : ''}
		</ul>

		<form method="post" class="settings-section">
    		<div class="form-group">
    			<div>
					<select class=form-control name=mode>
						<option value=ip>아이피</option>
						<option value=username>사용자 이름</option>
					</select>
    				<input type="text" class="form-control" name="username" />
    			</div>
    		</div>

    		<div class="form-group">
    			<label class="control-label">메모 :</label>
    			<div>
    				<input type="text" class="form-control" id="noteInput" name="note" />
    			</div>
    		</div>

    		<div class="form-group">
    			<label class="control-label">기간 :</label>
    			<select class="form-control" name="expire">
    				<option value="0" selected="">영구</option>
    				<option value="300">5분</option>
    				<option value="600">10분</option>
    				<option value="1800">30분</option>
    				<option value="3600">1시간</option>
    				<option value="7200">2시간</option>
    				<option value="86400">하루</option>
    				<option value="259200">3일</option>
    				<option value="432000">5일</option>
    				<option value="604800">7일</option>
    				<option value="1209600">2주</option>
    				<option value="1814400">3주</option>
    				<option value="2419200">4주</option>
    				<option value="4838400">2개월</option>
    				<option value="7257600">3개월</option>
    				<option value="14515200">6개월</option>
    				<option value="29030400">1년</option>
    			</select>
    		</div>

    		<div class="btns" style="margin-bottom: 20px;">
    			<button type="submit" class="btn btn-primary" style="width: 90px;" ${!editable ? 'disabled' : ''}>추가</button>
    		</div>
    	</form>
	`;
	
	if(group) {
		content += `	
			<div class="line-break" style="margin: 20px 0;"></div>
			
			<!-- 내비버튼 -->
			
			<form class="form-inline pull-right" id="searchForm" method=get>
				<div class="input-group">
					<input type="text" class="form-control" id="searchQuery" name="from" placeholder="ID" />
					<span class="input-group-btn">
						<button type=submit class="btn btn-primary">Go</button>
					</span>
				</div>
			</form>
			
			<div class="table-wrap">
				<table class="table" style="margin-top: 7px;">
					<colgroup>
						<col style="width: 150px;">
						<col style="width: 150px;">
						<col>
						<col style="width: 200px">
						<col style="width: 160px">
						<col style="width: 60px;">
					</colgroup>
					<thead>
						<tr style="vertical-align: bottom; border-bottom: 2px solid #eceeef;">
							<th>ID</th>
							<th>대상</th>
							<th>메모</th>
							<th>생성일</th>
							<th>만료일</th>
							<th style="text-align: center;">작업</th>
						</tr>
					</thead>
					<tbody>
		`;
		
		var tr = '';
		
		
		// 'aclgroup': ['aclgroup', 'type', 'username', 'note', 'date', 'expiration', 'id'],
		await curs.execute("delete from aclgroup where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
		var data = await curs.execute("select id, type, username, expiration, note, date from aclgroup where aclgroup = ? order by cast(id as integer) desc limit 50", [group]);
		for(var row of data) {
			tr += `
				<tr>
					<td>${row.id}</td>
					<td>${row.username}</td>
					<td>${row.note}</td>
					<td>${generateTime(toDate(row.date), timeFormat)}
					<td>${!Number(row.expiration) ? '영구' : generateTime(toDate(row.expiration), timeFormat)}
					<td class="text-center">
						<form method=post onsubmit="return confirm('정말로?');" action="/aclgroup/remove">
							<input type=hidden name=type value="${row.type}">
							<input type=hidden name=username value="${html.escape(row.username)}">
							<input type=submit class="btn btn-sm btn-danger" value="삭제" />
						</form>
					</td>
				</tr>
			`;
		}
		
		content += tr;
		
		if(!tr) content += `
						<tr>
							<td colspan=6>ACL 그룹이 비어있습니다.</td>
						</tr>
		`;
		
		content += `
					</tbody>
				</table>
			</div>
		`;
	}
	
	var error = false;
	
	if(req.method == 'POST') {
		if(!hasperm(req, 'aclgroup')) return res.status(403).send(showError(req, 'insufficient_privileges'));

		var { mode, username, expire, note } = req.body;
		if(!['ip', 'username'].includes(mode) || !username || !expire || note === undefined) error = true, content = alertBalloon(fetchErrorString('invalid_value'), 'danger', true, 'fade in') + content;
		else {
			if(mode == 'ip' && !username.includes('/')) username += '/32';
			
			if(mode == 'ip' && !username.match(/^([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])\/([1-9]|[12][0-9]|3[0-2])$/)) error = true, content = alertBalloon(fetchErrorString('invalid_cidr'), 'danger', true, 'fade in') + content;
			else {
				const date = getTime();
				const expiration = expire == '0' ? '0' : String(Number(date) + Number(expire) * 1000);
				var data = await curs.execute("select username from aclgroup where aclgroup = ? and type = ? and username = ? limit 1", [group, mode, username]);
				if(data.length) error = true, content = alertBalloon(fetchErrorString('aclgroup_already_exists'), 'danger', true, 'fade in') + content;
				var data = await curs.execute("select id from aclgroup order by cast(id as integer) desc limit 1");
				var id = 1;
				if(data.length) id = Number(data[0].id) + 1;
				await curs.execute("insert into aclgroup (id, type, username, expiration, note, date, aclgroup) values (?, ?, ?, ?, ?, ?, ?)", [id, mode, username, expiration, note, date, group]);
				return res.redirect('/aclgroup?group=' + encodeURIComponent(group));
			}
		}
	}
	
	res.send(render(req, 'ACLGroup', content, {
	}, '', error, 'aclgroup'));
});

wiki.all(/^\/member\/login$/, async function loginScreen(req, res, next) {
	if(!['GET', 'POST'].includes(req.method)) return next();
	
	var desturl = req.query['redirect'];
	if(!desturl) desturl = '/';
	
	if(islogin(req)) { res.redirect(desturl); return; }
	
	var id = '1', pw = '1';
	
	if(req.method == 'POST') {
		id = req.body['username'];
		pw = req.body['password'];
		
		var data = await curs.execute("select username from users where username = ? COLLATE NOCASE", [id]);
		var invalidusername = !data.length;
		
		var data = await curs.execute("select username, password from users where username = ? and password = ?", [id, sha3(pw)]);
		var invalidpw = !invalidusername && !data.length;
		
		if(!invalidusername && !invalidpw) {
			curs.execute("insert into login_history (username, ip) values (?, ?)", [id, ip_check(req, 1)]);
	
			req.session.username = id;
			
			conn.run("delete from useragents where username = ?", [id], () => {
				curs.execute("insert into useragents (username, string) values (?, ?)", [id, req.headers['user-agent']]);
			});
			
			return res.redirect(desturl);
		}
	}
	
	var content = `
		<form class=login-form method=post>
			<div class=form-group>
				<label>Username</label><br>
				<input class=form-control name="username" type="text">
				${!id.length ? `<p class=error-desc>사용자 이름의 값은 필수입니다.</p>` : ''}
				${id.length && invalidusername ? `<p class=error-desc>사용자 이름이 올바르지 않습니다.</p>` : ''}
			</div>

			<div class=form-group>
				<label>Password</label><br>
				<input class=form-control name="password" type="password">
				${id.length && !invalidusername && !pw.length ? `<p class=error-desc>암호의 값은 필수입니다.</p>` : ''}
				${id.length && !invalidusername && invalidpw ? `<p class=error-desc>암호가 올바르지 않습니다.</p>` : ''}
			</div>
			
			<div class="checkbox" style="display: inline-block;">
				<label>
					<input type="checkbox" name="autologin">
					<span>자동 로그인</span>
				</label>
			</div>
			
			<a href="/member/recover_password" style="float: right;">[아이디/비밀번호 찾기]</a> <br>
			
			<a href="/member/signup" class="btn btn-secondary">계정 만들기</a><button type="submit" class="btn btn-primary">로그인</button>
		</form>
	`;
	
	res.send(render(req, '로그인', content, {}));
});

wiki.all(/^\/member\/signup$/, async function signupEmailScreen(req, res, next) {
	if(!['GET', 'POST'].includes(req.method)) return next();
	
	var desturl = req.query['redirect'];
	if(!desturl) desturl = '/';
	
	if(islogin(req)) { res.redirect(desturl); return; }
	
	if(req.method == 'POST') {
		var data = await curs.execute("select email from account_creation where email = ?", [req.body['email']]);
		if(data.length) var duplicate = 1;
		
		if(!duplicate) {
			await curs.execute("delete from account_creation where cast(time as integer) < ?", [Number(getTime()) - 86400000]);
			const key = rndval('abcdef1234567890', 64);
			curs.execute("insert into account_creation (key, email, time) values (?, ?, ?)", [key, req.body['email'], String(getTime())]);
			
			return res.send(render(req, '계정 만들기', `
				<p>
					이메일(<strong>${req.body['email']}</strong>)로 계정 생성 이메일 인증 메일을 전송했습니다. 메일함에 도착한 메일을 통해 계정 생성을 계속 진행해 주시기 바랍니다.
				</p>

				<ul class=wiki-list>
					<li>간혹 메일이 도착하지 않는 경우가 있습니다. 이 경우, 스팸함을 확인해주시기 바랍니다.</li>
					<li>인증 메일은 24시간동안 유효합니다.</li>
				</ul>
				
				<p style="font-weight: bold; color: red;">
					[디버그] 가입 주소: <a href="/member/signup/${key}">/member/signup/${key}</a>
				</p>
			`, {}));
		}
	}
	
	var content = `
		<form method=post class=signup-form>
			<div class=form-group>
				<label>전자우편 주소</label><br>
				<input type=email name=email class=form-control />
				${duplicate ? `<p class=error-desc>해당 이메일로 이미 계정 생성 인증 메일을 보냈습니다.</p>` : ''}
			</div>
			
			<p>
				<strong>가입후 탈퇴는 불가능합니다.</strong>
			</p>
		
			<div class=btns>
				<button type=reset class="btn btn-secondary">초기화</button>
				<button type=submit class="btn btn-primary">가입</button>
			</div>
		</form>
	`;
	
	res.send(render(req, '계정 만들기', content, {}));
});

wiki.all(/^\/member\/signup\/(.*)$/, async function signupScreen(req, res, next) {
	if(!['GET', 'POST'].includes(req.method)) return next();
	
	await curs.execute("delete from account_creation where cast(time as integer) < ?", [Number(getTime()) - 86400000]);
	
	const key = req.params[0];
	await curs.execute("select key from account_creation where key = ?", [key]);
	if(!curs.fetchall().length) {
		return res.send(showError(req, 'invalid_signup_key'));
	}
	
	var desturl = req.query['redirect'];
	if(!desturl) desturl = '/';
	
	if(islogin(req)) { res.redirect(desturl); return; }
	
	var id = '1', pw = '1', pw2 = '1';
	
	if(req.method == 'POST') {
		id = req.body['username'];
		pw = req.body['password'];
		pw2 = req.body['password_check'];
		
		var data = await curs.execute("select username from users where username = ? COLLATE NOCASE", [id]);
		if(data.length) {
			var duplicate = 1;
		}
		if(id.length && !duplicate && pw.length && pw == pw2) {
			permlist[id] = [];
			
			var data = await curs.execute("select username from users");
			if(!data.length) {
				for(var perm of perms) {
					curs.execute(`insert into perms (username, perm) values (?, ?)`, [id, perm]);
					permlist[id].push(perm);
				}
			}
			
			req.session.username = id;
			
			await curs.execute("insert into users (username, password) values (?, ?)", [id, sha3(pw)]);
			await curs.execute("insert into documents (title, namespace, content) values (?, '사용자', '')", [id]);
			await curs.execute("insert into history (title, namespace, content, rev, time, username, changes, log, iserq, erqnum, advance, ismember) \
							values (?, '사용자', '', '1', ?, ?, '0', '', '0', '', 'create', 'author')", [
								id, getTime(), id
							]);
			await curs.execute("insert into login_history (username, ip) values (?, ?)", [id, ip_check(req, 1)]);
			await curs.execute("insert into useragents (username, string) values (?, ?)", [id, req.headers['user-agent']]);
			await curs.execute("delete from account_creation where key = ?", [key]);
			
			return res.send(render(req, '계정 만들기', `
				<p>환영합니다! <strong>${html.escape(id)}</strong>님 계정 생성이 완료되었습니다.</p>
			`, {}));
		}
	}
	
	var content = `
		<form class=signup-form method=post>
			<div class=form-group>
				<label>사용자 ID</label><br>
				<input class=form-control name="username" type="text" />
				${duplicate ? `<p class=error-desc>해당 사용자가 이미 존재합니다.</p>` : ''}
				${!duplicate && !id.length ? `<p class=error-desc>사용자 이름의 값은 필수입니다.</p>` : ''}
			</div>

			<div class=form-group>
				<label>암호</label><br>
				<input class=form-control name="password" type="password" />
				${!duplicate && id.length && !pw.length ? `<p class=error-desc>암호의 값은 필수입니다.</p>` : ''}
			</div>

			<div class=form-group>
				<label>암호 확인</label><br>
				<input class=form-control name="password_check" type="password" />
				${!duplicate && id.length && pw.length && pw != pw2 ? `<p class=error-desc>암호 확인이 올바르지 않습니다.</p>` : ''}
			</div>
			
			<p><strong>가입후 탈퇴는 불가능합니다.</strong></p>
			
			<button type=reset class="btn btn-secondary">초기화</button><button type="submit" class="btn btn-primary">가입</button>
		</form>
	`;
	
	res.send(render(req, '계정 만들기', content, {}));
});

wiki.get(/^\/random$/, async(req, res) => {
	var data = await curs.execute("select title from documents where namespace = '문서' order by random() limit 1");
	if(!data.length) res.redirect('/');
	res.redirect('/w/' + encodeURIComponent(data[0].title));
});

wiki.get(/^\/RandomPage$/, async function randomPage(req, res) {
	var ns = req.query['namespace'];
	if(!ns) ns = '문서';
	
	var data = await curs.execute("select title from documents where namespace = ? order by random() limit 20", [ns]);
	
	var content = `
		<fieldset class="recent-option">
			<form class="form-inline" method=get>
				<div class="form-group">
					<label class="control-label">이름공간 :</label>
					<select class="form-control" id="namespace" name=namespace>
					
	`;
	
	for(var nsp of fetchNamespaces()) {
		content += `
			<option value="${nsp}"${nsp == ns ? ' selected' : ''}>${nsp == 'wiki' ? config.getString('wiki.site_name', '더 시드') : nsp}</option>
		`;
	}
	
	content += `
					</select>
				</div>
				
				<div class="form-group btns">
					<button type=submit class="btn btn-primary" style="width: 5rem;">제출</button>
				</div>
			</form>
		</fieldset>
		
		<ul class=wiki-list>
	`;
	
	for(var i of data)
        content += '<li><a href="/w/' + encodeURIComponent(totitle(i.title, ns)) + '">' + html.escape(i['title']) + '</a></li>';
	
	content += '</ul>';
	
	res.send(render(req, 'RandomPage', content, {}));
});

wiki.get(/^\/ShortestPages$/, async function shortestPages(req, res) {
	var from = req.query['from'];
	if(!from) ns = '1';
	
	var sql_num = 0;
    if(from > 0)
        sql_num = from - 122;
    else
        sql_num = 0;
	
	var data = await curs.execute("select title from documents where namespace = '문서' order by length(content) limit ?, '122'", [sql_num]);
	
	var content = `
		<p>내용이 짧은 문서 (문서 이름공간, 리다이렉트 제외)</p>
		
		${navbtn(0, 0, 0, 0)}
		
		<ul class=wiki-list>
	`;
	
	for(var i of data)
        content += '<li><a href="/w/' + encodeURIComponent(i['title']) + '">' + html.escape(i['title']) + '</a></li>';
	
	content += '</ul>' + navbtn(0, 0, 0, 0);
	
	res.send(render(req, '내용이 짧은 문서', content, {}));
});

wiki.get(/^\/LongestPages$/, async function longestPages(req, res) {
	var from = req.query['from'];
	if(!from) ns = '1';
	
	var sql_num = 0;
    if(from > 0)
        sql_num = from - 122;
    else
        sql_num = 0;
	
	var data = await curs.execute("select title from documents where namespace = '문서' order by length(content) desc limit ?, '122'", [sql_num]);
	
	var content = `
		<p>내용이 긴 문서 (문서 이름공간, 리다이렉트 제외)</p>
		
		${navbtn(0, 0, 0, 0)}
		
		<ul class=wiki-list>
	`;
	
	for(var i of data)
        content += '<li><a href="/w/' + encodeURIComponent(i['title']) + '">' + html.escape(i['title']) + '</a></li>';
	
	content += '</ul>' + navbtn(0, 0, 0, 0);
	
	res.send(render(req, '내용이 긴 문서', content, {}));
});

wiki.use(function(req, res, next) {
    return res.status(404).send(`
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=1240">
			<title>Page is not found!</title>
			<style>
				section {
					position: fixed;
					top: 0;
					right: 0;
					bottom: 0;
					left: 0;
					padding: 80px 0 0;
					background-color:#EFEFEF;
					font-family: "Open Sans", sans-serif;
					text-align: center;
				}
				
				h1 {
					margin: 0 0 19px;
					font-size: 40px;
					font-weight: normal;
					color: #E02B2B;
					line-height: 40px;
				}
				
				p {
					margin: 0 0 57px;
					font-size: 16px;
					color:#444;
					line-height: 23px;
				}
			</style>
		</head>
		
		<body>
			<section>
				<h1>404</h1>
				
				<p>
					Page is not found!<br>
					<a href="/">Back to home</a>
				</p>
			</section>
		</body>
	`);
});

(async function setWikiData() {
	var data = await curs.execute("select key, value from config");
	
	for(var cfg of data) {
		wikiconfig[cfg['key']] = cfg['value'];
	}
	
	var data = await curs.execute("select username, perm from perms order by username");
	
	for(var prm of data) {
		if(typeof(permlist[prm['username']]) == 'undefined')
			permlist[prm['username']] = [prm['perm']];
		else
			permlist[prm['username']].push(prm['perm']);
	}
	
	const server = wiki.listen(hostconfig['port'], hostconfig['host']);  // 서버실행
	print(String(hostconfig['host']) + ":" + String(hostconfig['port']) + "에 실행 중. . .");
})();

}
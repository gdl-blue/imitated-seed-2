function print(x) { console.log(x); }
function prt(x) { process.stdout.write(x); }

function beep(cnt = 1) { // 경고음 재생
	for(var i=1; i<=cnt; i++)
		prt("");
}

const timeFormat = 'Y-m-d H:i:s';

const inputReader = require('wait-console-input'); // 입력받는 라이브러리

function input(p) {
	prt(p); // 일부러 이렇게. 바로하면 한글 깨짐.
	return inputReader.readLine('');
}

const exec = eval;

// VB6 함수 모방
function Split(str, del) { return str.split(del); }; const split = Split;
function UCase(s) { return s.toUpperCase(); }; const ucase = UCase;
function LCase(s) { return s.toUpperCase(); }; const lcase = LCase;

const sqlite3 = require('sqlite3').verbose(); // SQLite 라이브러리 호출
const conn = new sqlite3.Database('./wikidata.db', (err) => {}); // 데이타베이스 연결

// https://blog.pagesd.info/2019/10/29/use-sqlite-node-async-await/
conn.query = function (sql, params) {
	var that = this;
		return new Promise(function (resolve, reject) {
		that.all(sql, params, function (error, rows) {
			if (error)
				reject(error);
			else
				resolve(rows);
		});
	});
};

// 파이선 SQLite 모방
conn.commit = function() {};
conn.sd = [];

const curs = {
	execute: async function(sql = '', params = []) {
		if(UCase(sql).startsWith("SELECT")) {
			const retval = await conn.query(sql, params);
			conn.sd = retval;
		} else {
			conn.run(sql, params, err => { beep(3); });
		}
		
		return [];
	},
	fetchall: function() {
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
	
	var hour = date.getHours(); hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes(); min = (min < 10 ? "0" : "") + min;
    var sec  = date.getSeconds(); sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getFullYear();
    var month = date.getMonth() + 1; month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate(); day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;
}

function generateTime(time, fmt) {
	const d = split(time, ' ')[0];
	const t = split(time, ' ')[1];
	
	return `<time datetime="${d}T${t}.000Z" data-format="${fmt}">${time}</time>`;
}

swig.setFilter('encode_userdoc', function(input) {
	return encodeURI('사용자:' + input);
});

swig.setFilter('encode_doc', function(input) {
	return encodeURI(input);
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

var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();

wiki.use(bodyParser.json());
wiki.use(bodyParser.urlencoded({ extended: true }));
wiki.use(upload.array()); 
wiki.use(express.static('public'));

const fs = require('fs');

var wikiconfig = {};
var permlist = {};

var hostconfig;
try { hostconfig = require('./config.json'); }
catch(e) {
	hostconfig = {
		host: input("호스트 주소: "),
		port: input("포트 번호: ")
	};
	
	const tables = {
		'documents': ['title', 'content'],
		'history': ['title', 'content', 'rev', 'time', 'username', 'changes', 'log', 'iserq', 'erqnum', 'advance', 'ismember'],
		'namespaces': ['namespace', 'locked', 'norecent', 'file'],
		'users': ['username', 'password'],
		'user_settings': ['username', 'key', 'value'],
		'acl': ['title', 'no', 'type', 'content', 'action', 'expire'],
		'nsacl': ['namespace', 'no', 'type', 'content', 'action', 'expire'],
		'config': ['key', 'value'],
		'email_filters': ['address'],
		'stars': ['title', 'username', 'lastedit'],
		'perms': ['perm', 'username']
	};
	
	for(var table in tables) {
		var sql = '';
		sql = `CREATE TABLE ${table} ( `;
		
		for(col of tables[table]) {
			sql += `${col} text default '', `;
		}
		
		sql = sql.replace(/[,]\s$/, '');		
		sql += `)`;
		
		curs.execute(sql);
	}
	
	fs.writeFile('config.json', JSON.stringify(hostconfig), 'utf8', (e) => { beep(2); });
}

function markdown(content) {
	return content;
}

function islogin(req) {
	if(req.session.username) return true;
	return false;
}

function getUsername(req) {
	if(req.session.username) {
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
		
		if(typeof(wikiconfig[str]) == 'undefined') return def;
		return wikiconfig[str];
	}
}

const _ = undefined;

function getSkin() {
	return 'buma';
}

async function getperm(perm, username) {
	await curs.execute("select perm from perms where username = ? and perm = ?", [username, perm]);
	if(curs.fetchall()) {
		return true;
	}
	return false;
}

function render(req, title = '', content = '', varlist = {}, subtitle = '', error = false, viewname = '') {
	const skinInfo = {
		title: title + subtitle,
		viewName: viewname
	};
	
	const perms = {
		has: function(perm) {
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
			<title>` + title + ` (프론트엔드 오류!)</title>
			<meta charset=utf-8>` + content;
	}

	var output;
	var templateVariables = varlist;
	templateVariables['skinInfo'] = skinInfo;
	templateVariables['config'] = config;
	templateVariables['content'] = content;
	templateVariables['perms'] = perms;
	
	if(['wiki', 'notfound'].includes(viewname)) {
		templateVariables['document'] = title;
	}
	
	output = template(templateVariables);
	
	var header = '<html><head>';
	var skinconfig = require("./skins/" + getSkin() + "/config.json");
	header += `
		<title>${title}${subtitle} - ${config.getString('site_name', 'Wiki')}</title>
		<meta charset="utf-8">
		<meta http-equiv="x-ua-compatible" content="ie=edge">
		<meta http-equiv="x-pjax-version" content="">
		<meta name="generator" content="the seed">
		<meta name="application-name" content="` + config.getString('wiki.site_name', 'Wiki') + `">
		<meta name="mobile-web-app-capable" content="yes">
		<meta name="msapplication-tooltip" content="` + config.getString('wiki.site_name', 'Wiki') + `">
		<meta name="msapplication-starturl" content="/w/` + encodeURI(config.getString('wiki.frontpage', 'FrontPage')) + `">
		<link rel="search" type="application/opensearchdescription+xml" title="` + config.getString('wiki.site_name', 'Wiki') + `" href="/opensearch.xml">
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

function fetchErrorString(code) {
	const codes = {
		
	};
	
	if(typeof(codes[code]) == 'undefined') return code;
	else return codes[code];
}

function alertBalloon(content, type = 'danger', dismissible = true, classes = '') {
	return `
		<div class="alert alert-${type} ${dismissible ? 'alert-dismissible' : ''} ${classes}" role=alert>
			<button type=button class=close data-dismiss=alert aria-label=Close>
				<span aria-hidden=true>×</span>
				<span class=sr-only>Close</span>
			</button>
			<strong>${
				{
					none: '',
					danger: '[오류!]',
					warning: '',
					info: '',
					success: '[경고!]'
				}[type]
			}</strong> ${content}
		</div>`;
}

function showError(code, req) {
	return render(req, "문제가 발생했습니다!", `<h2>${fetchErrorString(code)}</h2>`);
}

function ip_pas(ip = '', ismember = '') {
	if(ismember == 'author') {
		return `<strong><a href="/w/사용자:${encodeURI(ip)}">${html.escape(ip)}</a></strong>`;
	} else {
		return `<a href="/contribution/ip/${encodeURI(ip)}/document">${html.escape(ip)}</a>`;
	}
}

async function getacl(title, action) {
	return 1;
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

wiki.get(/^\/skins\/((?:(?!\/).)+)\/(.+)/, function(req, res) {
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

wiki.get('/js/:filepath', function(req, res) {
	const filepath = req.param('filepath');
	res.sendFile(filepath, { root: "./js" });
});

wiki.get('/css/:filepath', function(req, res) {
	const filepath = req.param('filepath');
	res.sendFile(filepath, { root: "./css" });
});

wiki.get('/', function(req, res) {
	res.redirect('/w/' + config.getString('frontpage'));
});

wiki.get(/^\/w\/(.*)/, async function(req, res) {
	const title = req.params[0];
	
	if(title.replace(/\s/g, '') == '') res.redirect('/w/' + config.getString('frontpage'));
	
	await curs.execute("select content from documents where title = ?", [title]);
	const rawContent = curs.fetchall();

	var content = '';
	
	var httpstat = 200;
	var viewname = 'wiki';
	var error = false;
	
	try {
		if(!await getacl(title, 'read')) {
			httpstat = 403;
			error = true;
			content = showError('insufficient_privileges_read');
		} else {
			content = markdown(rawContent[0]['content']);
		}
	} catch(e) {
		viewname = 'notfound';
		
		print(`[오류!] ${e}`);
		
		httpstat = 404;
		content = `
			<p>해당 문서를 찾을 수 없습니다.</p>
			
			<p>
				<a rel="nofollow" href="/edit/` + encodeURI(title) + `">[새 문서 만들기]</a>
			</p>
		`;
	}
	
	res.status(httpstat).send(render(req, title, content, {
		star_count: 0,
		starred: false
	}, _, error, viewname));
});

wiki.get(/^\/edit\/(.*)/, async function(req, res) {
	const title = req.params[0];
	
	await curs.execute("select content from documents where title = ?", [title]);
	var rawContent = curs.fetchall();
	
	if(!rawContent[0]) rawContent = '';
	else rawContent = rawContent[0]['content'];
	
	var error = false;
	var content = '';
	
	var baserev;
	
	await curs.execute("select rev from history where title = ? order by CAST(rev AS INTEGER) desc limit 1", [title]);
	try {
		baserev = curs.fetchall()[0]['rev'];
	} catch(e) {
		baserev = 0;
	}
	
	if(!await getacl(title, 'edit')) {
		error = true;
		content = `
			${alertBalloon('편집 권한이 부족합니다. 대신 <strong><a href="/new_edit_request/' + html.escape(title) + '">편집 요청</a></strong>을 생성하실 수 있습니다.', 'danger', true, 'fade in edit-alert')}
		
			<form method="post" id="editForm" enctype="multipart/form-data" data-title="${title}" data-recaptcha="0">
				<input type="hidden" name="token" value="fa9585bd2f508bbd37162ebaccc6018f6609c69ac92e9c0a7e3dc7d2320c60f6">
				<input type="hidden" name="identifier" value="i:207.241.226.232">
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
						<textarea id="textInput" name="text" wrap="soft" class="form-control" readonly=readonly>${html.escape(rawContent)}</textarea>
					</div>
					<div class="tab-pane" id="preview" role="tabpanel">
						
					</div>
				</div>
			</form>
		`;
	} else {
		content = `
			<form method="post" id="editForm" enctype="multipart/form-data" data-title="${title}" data-recaptcha="0">
				<input type="hidden" name="token" value="fa9585bd2f508bbd37162ebaccc6018f6609c69ac92e9c0a7e3dc7d2320c60f6">
				<input type="hidden" name="identifier" value="i:207.241.226.232">
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
				
				<p style="font-weight: bold;">비로그인 상태로 편집합니다. 편집 역사에 IP(${req.headers['x-forwarded-for']})가 영구히 기록됩니다.</p>
				
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
						'sitekey': '6LcUuigTAAAAALyrWQPfwtFdFWFdeUoToQyVnD8Y',
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

	var httpstat = 200;
	
	res.status(httpstat).send(render(req, title, content, {}, ' (편집)', error, 'edit'));
});

wiki.post(/^\/edit\/(.*)/, async function(req, res) {
	const title = req.params[0];
	
	if(!getacl(title, 'edit')) {
		res.send(showError(req, 'insufficient_privileges_edit'));
	}
	
	await curs.execute("select content from documents where title = ?", [title]);
	var original = curs.fetchall();
	
	if(!original[0]) original = '';
	else original = original[0]['content'];
	
	const content = req.body['text'];
	const rawChanges = content.length - original.length;
	
	const changes = (rawChanges > 0 ? '+' : '') + String(rawChanges);
	
	const log = req.body['log'];
	
	const agree = req.body['agree'];
	
	const baserev = req.body['baserev'];
	
	const ismember = islogin(req) ? 'author' : 'ip';
	
	var advance = '';
	
	await curs.execute("select title from documents where title = ?", [title]);
	
	if(!curs.fetchall().length) {
		advance = '(새 문서)';
		curs.execute("insert into documents (title, content) values (?, ?)", [title, content]);
	} else {
		curs.execute("update documents set content = ? where title = ?", [content, title]);
		curs.execute("update stars set lastedit = ? where title = ?", [getTime(), title]);
	}
	
	curs.execute("insert into history (title, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance) \
					values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
		title, content, String(Number(baserev) + 1), ip_check(req), getTime(), changes, log, '0', '-1', ismember, advance
	]);
	
	res.redirect('/w/' + title);
});

wiki.get(/^\/history\/(.*)/, function(req, res) {
	const title = req.params[0];
	const from = req.query['from'];
	const until = req.query['until'];
	
	if(from) { // 더시드에서 from이 더 우선임
		curs.execute("select rev, time, changes, log, iserq, erqnum, advance, ismember, username from history \
						where title = ? and (cast(rev as integer) <= ? AND cast(rev as integer) > ?) \
						order by cast(rev as integer) desc",
						[title, from, String(Number(from) - 30)]);
	} else if(until) {
		curs.execute("select rev, time, changes, log, iserq, erqnum, advance, ismember, username from history \
						where title = ? and (cast(rev as integer) >= ? AND cast(rev as integer) < ?) \
						order by cast(rev as integer) desc",
						[title, from, String(Number(until) + 30)]);
	} else {
		curs.execute("select rev, time, changes, log, iserq, erqnum, advance, ismember, username from history \
						where title = ? order by cast(rev as integer) desc limit 30",
						[title]);
	}
	
	if(!curs.fetchall().length) return showError(req, 'document_dont_exists');
	
	const navbtns = navbtn(0, 0, 0, 0);
	
	var content = `
		<p>
			<button id="diffbtn" class="btn btn-secondary">선택 리비젼 비교</button>
		</p>
		
		${navbtns}
		
		<ul class=wiki-list>
	`;
	
	for(row of curs.fetchall()) {
		content += `
				<li>
					${generateTime(toDate(row['time']), timeFormat)} 
		
					<span style="font-size: 8pt;">
						(<a rel=nofollow href="/w/${encodeURI(title)}?rev=${row['rev']}">보기</a> |
							<a rel=nofollow href="/raw/${encodeURI(title)}?rev=${row['rev']}" data-npjax="true">RAW</a> |
							<a rel=nofollow href="/blame/${encodeURI(title)}?rev=${row['rev']}">Blame</a> |
							<a rel=nofollow href="/revert/${encodeURI(title)}?rev=${row['rev']}">이 리비젼으로 되돌리기</a>${
								Number(row['rev']) > 1
								? ' | <a rel=nofollow href="/diff/' + encodeURI(title) + '?rev=' + row['rev'] + '&oldrev=' + String(Number(row['rev']) - 1) + '">비교</a>'
								: ''
							})
					</span> 
					
					<input type="radio" name="oldrev" value="${row['rev']}">
					<input type="radio" name="rev" value="${row['rev']}">

					<i>${row['advance']}</i>
					
					<strong>r${row['rev']}</strong> 
					
					(<span style="color: ${
						(
							Number(row['changes']) > 0
							? 'green'
							: (
								Number(row['changes']) < 0
								? 'red'
								: 'gray'
							)
						)
						
					};">${row['changes']}</span>)
					
					${ip_pas(row['username'], row['ismember'])}
					
					(<span style="color: gray;">${row['log']}</span>)
				</li>
		`;
	}
	
	content += `
		</ul>
		
		${navbtns}
		
		<script>historyInit("${encodeURI(title)}");</script>
	`;
	
	res.send(render(req, title, content, {}, '의 역사', error = false, viewname = 'history'));
});

wiki.use(function(req, res, next) {
    return res.status(404).send(
		`
			<html>
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
			</html>`
	);
});

(async function() {
	await curs.execute("select key, value from config");
	
	for(var cfg of curs.fetchall()) {
		wikiconfig[cfg['key']] = cfg['value'];
	}
	
	await curs.execute("select username, perm from perms order by username");
	
	for(var prm of curs.fetchall()) {
		if(typeof(permlist[prm['username']]) == undefined)
			permlist[prm['username']] = [prm['perm']];
		else
			permlist[prm['username']].push(prm['perm']);
	}
})();

const server = wiki.listen(hostconfig['port']); // 서버실행
print("127.0.0.1:" + String(hostconfig['port']) + "에 실행 중. . .");

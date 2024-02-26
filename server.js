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
const diff = require('./cemerick-jsdifflib.js');
const cookieParser = require('cookie-parser');
const child_process = require('child_process');
const captchapng = require('captchapng');
const fileUpload = require('express-fileupload');

function print(x) { console.log(x); }
function prt(x) { process.stdout.write(x); }

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

async function init() {
	const database = require('./database');
	for(var item in database) global[item] = database[item];
	
	print('병아리 - the seed 모방 엔진에 오신것을 환영합니다.\n');
	
	// 호스팅 설정
	var hostconfig = {
		host: input('호스트 주소: '),
		port: input('포트 번호: '),
		skin: input('기본 스킨 이름: '),
		search_host: '127.5.5.5',
		search_port: '25005',
		file_host: '127.5.5.5',
		file_port: '27775',
		disable_file_server: true,
		owners: [input('소유자 닉네임: ')],
		disable_email: true,
		sessionhttps: false
	};
	
	// 만들 테이블
	const tables = {
		'documents': ['title', 'content', 'namespace', 'time'],
		'history': ['title', 'namespace', 'content', 'rev', 'time', 'username', 'changes', 'log', 'iserq', 'erqnum', 'advance', 'ismember', 'edit_request_id', 'flags', 'isapi'],
		'namespaces': ['namespace', 'locked', 'norecent', 'file'],
		'users': ['username', 'password', 'email'],
		'user_settings': ['username', 'key', 'value'],
		'nsacl': ['namespace', 'no', 'type', 'content', 'action', 'expire'],
		'config': ['key', 'value'],
		'email_filters': ['address'],
		'stars': ['title', 'namespace', 'username', 'lastedit'],
		'perms': ['perm', 'username'],
		'threads': ['title', 'namespace', 'topic', 'status', 'time', 'tnum', 'deleted', 'num'],
		'res': ['id', 'content', 'username', 'time', 'hidden', 'hider', 'status', 'tnum', 'ismember', 'isadmin', 'type'],
		'useragents': ['username', 'string'],
		'login_history': ['username', 'ip', 'time'],
		'account_creation': ['key', 'email', 'time'],
		'acl': ['title', 'namespace', 'id', 'type', 'action', 'expiration', 'conditiontype', 'condition', 'ns'],
		'ipacl': ['cidr', 'al', 'expiration', 'note', 'date'],
		'suspend_account': ['username', 'date', 'expiration', 'note'],
		'aclgroup_groups': ['name', 'admin', 'date', 'lastupdate', 'css', 'warning_description'],
		'aclgroup': ['aclgroup', 'type', 'username', 'note', 'date', 'expiration', 'id'],
		'block_history': ['date', 'type', 'aclgroup', 'id', 'duration', 'note', 'executer', 'target', 'ismember', 'logid'],
		'edit_requests': ['title', 'namespace', 'id', 'deleted', 'state', 'content', 'baserev', 'username', 'ismember', 'log', 'date', 'processor', 'processortype', 'lastupdate', 'processtime', 'reason', 'rev'],
		'files': ['title', 'namespace', 'hash', 'url', 'size', 'width', 'height'],
		'backlink': ['title', 'namespace', 'link', 'linkns', 'type', 'exist'],
		'classic_acl': ['title', 'namespace', 'blockkorea', 'blockbot', 'read', 'edit', 'del', 'discuss', 'move'],
		'autologin_tokens': ['username', 'token'],
		'trusted_devices': ['username', 'id'],
		'api_tokens': ['username', 'token'],
		'recover_account': ['key', 'username', 'email', 'time'],
		'boardipacl': ['cidr', 'expiration', 'note', 'date'],
		'boardsuspendaccount': ['username', 'expiration', 'note', 'date'],
	};
	
	// 테이블 만들기
	for(var table in tables) {
		var sql = '';
		sql = `CREATE TABLE ${table} ( `;
		for(var col of tables[table]) {
			sql += `${col} TEXT DEFAULT '', `;
		}
		sql = sql.replace(/[,]\s$/, '');		
		sql += `)`;
		await curs.execute(sql);
	}
	
	fs.writeFileSync('config.json', JSON.stringify(hostconfig), 'utf8');
	print('\n준비 완료되었습니다. 엔진을 다시 시작하십시오.');
	process.exit(0);
}

if(!fs.existsSync('./config.json')) {
	init();
} else {
const router = require('./routes/router');
const hostconfig = require('./hostconfig');
const wiki = express();  // 서버

const functions = require('./functions');
for(var item in functions) global[item] = functions[item];
cacheSkinList();

// 모듈 사용
wiki.use(bodyParser.json());
wiki.use(bodyParser.urlencoded({ extended: true }));
wiki.use(fileUpload({
	limits: { fileSize: hostconfig.max_file_size || 2000000 },
    abortOnLimit: true,
}));
wiki.use(session({
	key: 'kotori',
	secret: rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 1024),
	cookie: {
		expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
		httpOnly: true,
		secure: hostconfig.sessionhttps,
		samesite: "lax"
	},
	resave: false,
	saveUninitialized: false,
}));
wiki.use(cookieParser());
if(hostconfig.disable_file_server)
	wiki.use('/images', express.static('images'));

// 업데이트 수준
const updatecode = '24';

// 보안을 위해...
wiki.disable('x-powered-by');

// swig 필터
swig.setFilter('encode_userdoc', function encodeUserdocURL(input) {
	return encodeURIComponent('사용자:' + input);
});
swig.setFilter('encode_doc', function encodeDocURL(input) {
	return encodeURIComponent(input);
});
swig.setFilter('avatar_url', function(input) {
	return 'https://www.gravatar.com/avatar/' + md5(getUserSetting(input.username, 'email') || '') + '?d=retro';
});
swig.setFilter('md5', function(input, l) {
	return md5(input).slice(0, (l || 33));
});
swig.setFilter('url_encode', function(input) {
	return encodeURIComponent(input);
});
swig.setFilter('to_date', toDate);
swig.setFilter('localdate', generateTime);

// 아이피차단
wiki.all('*', async function(req, res, next) {
	if(hostconfig.block_ip && hostconfig.block_ip.includes(ip_check(req, 1)))
		return;
	next();
});

// 자동 로그인 & 차단 로그아웃
wiki.all('*', async function(req, res, next) {
	if(!ver('4.1.0')) {
		if(islogin(req) && await userblocked(ip_check(req))) {
			delete req.session.username;
			return next();
		}
	}
	
	if(req.session.username) {
		const d = await curs.execute("select username from users where username = ?", [req.session.username]);
		if(!d.length) delete req.session.username;
		return next();
	}
	var autologin;
	if(autologin = req.cookies['honoka']) {
		const d = await curs.execute("select username, token from autologin_tokens where token = ?", [sha3(autologin)]);
		if(!d.length) {
			delete req.session.username;
			res.cookie('honoka', '', { expires: new Date(Date.now() - 1) });
		} else {
			req.session.username = d[0].username;
		}
	}
	next();
});

wiki.get(/^\/skins\/((?:(?!\/).)+)\/(.+)/, async function sendSkinFile(req, res, next) {
	const skinname = req.params[0];
	const filepath = req.params[1];
	
	if(!skinList.includes(skinname))
		return next();
	
	if(decodeURIComponent(filepath).includes('./') || decodeURIComponent(filepath).includes('..')) {
		return next();
	}
	
	var skinconfig = skincfgs[skinname];
	/* if(!skinconfig.static_files.includes(filepath))
		return next(); */
	
	try {
		res.sendFile(filepath, { root: './skins/' + skinname + '/static' });
	} catch(e) {
		next();
	}
});

wiki.get('/js/:filepath', function sendJS(req, res) {
	const filepath = req.params['filepath'];
	res.sendFile(filepath, { root: './js' });
});

wiki.get('/css/:filepath', function sendCSS(req, res) {
	const filepath = req.params['filepath'];
	res.sendFile(filepath, { root: './css' });
});

function redirectToFrontPage(req, res) {
	res.redirect('/w/' + (config.getString('wiki.front_page', 'FrontPage')));
}

wiki.get(/^\/w$/, redirectToFrontPage);
wiki.get(/^\/w\/$/, redirectToFrontPage);
wiki.get('/', redirectToFrontPage);

//if(1) wiki.use('/', require('./frontends/nuxt/frontend')); else
wiki.use('/', router);

// 404 페이지
wiki.use(function(req, res, next) {
    return res.status(404).send(`
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset=utf-8 />
				<meta name=viewport content="width=1240">
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
						Page is not found!<br />
						<a href="/">Back to home</a>
					</p>
				</section>
			</body>
		</html>
	`);
});

(async function setWikiData() {
	// 위키 설정 캐시
	var data = await curs.execute("select key, value from config");
	for(var cfg of data) {
		wikiconfig[cfg.key] = cfg.value;
	}
	
	// 권한 캐시
	var data = await curs.execute("select username, perm from perms order by username");
	for(var prm of data) {
		if(typeof(permlist[prm.username]) == 'undefined')
			permlist[prm.username] = [prm.perm];
		else
			permlist[prm.username].push(prm.perm);
	}
	
	// 사용자 설정 캐시
	var data = await curs.execute("select username, key, value from user_settings");
	for(var set of data) {
		if(!userset[set.username]) userset[set.username] = {};
		if(set.key == 'email' && !set.value)
			continue;
		userset[set.username][set.key] = set.value;
	}
	
	// 엔진 업그레이드
	switch(Number(config.getString('update_code', '1'))) {
		case 1: {
			// 역링크, 4.2.0 미만용 ACL
			try {
				await curs.execute("create table backlink (title text default '', namespace text default '', link text default '', linkns text default '', type text default 'link')");
				await curs.execute("create table classic_acl (title text default '', namespace text default '', blockkorea text default '', blockbot text default '', read text default '', edit text default '', del text default '', discuss text default '', move text default '')");
			} catch(e) {}
		} case 2: {
			// 역링크 테이블에 문서 존재 여부 열 추가
			try {
				await curs.execute("alter table backlink\nADD exist text;");
			} catch(e) {}
		} case 3: {
			// 문서 테이블에 최종수정일 열 추가
			try {
				await curs.execute("alter table documents\nADD time text;");
				(async function() {
					for(let item of (await curs.execute("select title, namespace from documents"))) {
						const d = await curs.execute("select time from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [item.title, item.namespace]);
						if(!d.length) continue;
						await curs.execute("update documents set time = ? where title = ? and namespace = ?", [d[0].time, item.title, item.namespace]);
					}
				})();
			} catch(e) {}
		} case 4: {
			// 탈퇴한 사용자
			try {
				await curs.execute("update res set username = '탈퇴한 사용자' where username = '' and ismember = 'author'");
				await curs.execute("update history set username = '탈퇴한 사용자' where username = '' and ismember = 'author'");
			} catch(e) {}
		} case 5: {
			// 자동 로그인 구현
			try {
				await curs.execute("create table autologin_tokens ( username text default '', token text default '' )");
				await curs.execute("create table trusted_devices ( username text default '', id text default '' )");
			} catch(e) {}
		} case 6: {
			// 로그인 내역 테이블 빼먹음
			try {
				await curs.execute("alter table login_history\nADD time text;");
			} catch(e) {}
		} case 7: {
			// 위키 설정
			try {
				const fd = await curs.execute("select value from config where key = 'frontpage'");
				if(fd.length && fd[0].value) {
					wikiconfig.front_page = fd[0].value;
					delete wikiconfig.frontpage;
					await curs.execute("delete from config where key = 'frontpage' or key = 'front_page'");
					await curs.execute("insert into config (key, value) values ('front_page', ?)", [fd[0].value]);
				}
				const cn = await curs.execute("select value from config where key = 'copyright_notice'");
				if(cn.length && cn[0].value) {
					wikiconfig.editagree_text = cn[0].value;
					delete wikiconfig.copyright_notice;
					await curs.execute("delete from config where key = 'copyright_notice'");
					await curs.execute("insert into config (key, value) values ('editagree_text', ?)", [cn[0].value]);
				}
				for(var key in wikiconfig) {
					if(key == 'update_code') continue;
					await curs.execute("delete from config where key = ?", [key]);
					await curs.execute("insert into config (key, value) values (?, ?)", ['wiki.' + key, wikiconfig[key]]);
					wikiconfig['wiki.' + key] = wikiconfig[key];
					delete wikiconfig[key];
				}
			} catch(e) {}
		} case 8: {
			// 탈퇴한 사용자 2
			curs.execute("update history set username = '탈퇴한 사용자', ismember = 'ip' where username = '탈퇴한 사용자' and ismember = 'author'");
			curs.execute("update res set username = '탈퇴한 사용자', ismember = 'ip' where username = '탈퇴한 사용자' and ismember = 'author'");
			curs.execute("update block_history set executer = '탈퇴한 사용자', ismember = 'ip' where executer = '탈퇴한 사용자' and ismember = 'author'");
			curs.execute("update edit_requests set processor = '탈퇴한 사용자', ismember = 'ip' where processor = '탈퇴한 사용자' and ismember = 'author'");
			curs.execute("update edit_requests set username = '탈퇴한 사용자', ismember = 'ip' where username = '탈퇴한 사용자' and ismember = 'author'");
		} case 9: {
			// 구버전 더시드 토론
			try {
				await curs.execute("alter table threads\nADD num text;");
				let dd = await curs.execute("select tnum from threads");
				for(var idx=0; idx<dd.length; idx++) {
					let item = dd[idx];
					let dt = await curs.execute("select time from res where id = '1' and tnum = ?", [item.tnum]);
					dd[idx].tt = Number(dt[0].time);
				}
				dd = dd.sort((l, r) => l.tt - r.tt);
				for(var idx=0; idx<dd.length; idx++) {
					let item = dd[idx];
					await curs.execute("update threads set num = ? where tnum = ?", [String(idx + 1), item.tnum]);
				}
			} catch(e) {}
		} case 10: {
			// 새로운 토론주소
			try {
				await curs.execute("alter table threads\nADD slug text;");
				await curs.execute("alter table edit_requests\nADD slug text;");
				var dd = await curs.execute("select tnum from threads");
				for(let item of dd) {
					await curs.execute("update threads set slug = ? where tnum = ?", [newID(), item.tnum]);
				}
				var dd = await curs.execute("select id from edit_requests");
				for(let item of dd) {
					await curs.execute("update edit_requests set slug = ? where id = ?", [newID(), item.id]);
				}
			} catch(e) {}
		} case 11: {
			// 까먹음
			try {
				await curs.execute("alter table res\nADD slug text;");
				var dd = await curs.execute("select tnum from threads");
				for(let item of dd) {
					await curs.execute("update res set slug = ? where tnum = ?", [newID(), item.tnum]);
				}
			} catch(e) {}
		} case 12: {
			// API 토큰
			try {
				await curs.execute("create table api_tokens (username text default '', token text default '')");
			} catch(e) {}
		} case 13: {
			// API 편집
			try {
				await curs.execute("alter table history\nADD isapi text;");
			} catch(e) {}
		} case 14: {
			// 더시드 4.16.0이상에서 이상하게 작동하는 버그 수정
			try {
				var dd = await curs.execute("select id from edit_requests where slug is null or slug = ''");
				for(var item of dd) {
					await curs.execute("update edit_requests set slug = ? where id = ?", [newID(), item.id]);
				}
			} catch(e) {}
		} case 15: {
			try {
				await curs.execute("alter table aclgroup_groups\nADD css text;");
				await curs.execute("alter table aclgroup_groups\nADD warning_description text;");
			} catch(e) {}
		} case 16: {
			try {
				await curs.execute("alter table users\nADD email text;");
			} catch(e) {}
		} case 17: {
			try {
				await curs.execute("create table recover_account (key text default '', username text default '', email text default '', time text default '')");
			} catch(e) {}
		} case 18: {
			try {
				await curs.execute("alter table aclgroup_groups\nADD disallow_signup text;");
				await curs.execute("update aclgroup_groups set css = ? where name = ?", ['text-decoration: line-through !important;', '차단된 사용자']);
			} catch(e) {}
		} case 19: {
			try {
				await curs.execute("alter table files\nADD url text;");
				hostconfig.disable_file_server = true;
				fs.writeFile('config.json', JSON.stringify(hostconfig), 'utf8', () => 1);
			} catch(e) {}
		} case 20: {
			try {
				await curs.execute("alter table files\nADD size text;");
			} catch(e) {}
		} case 21: {
			try {
				await curs.execute("alter table files\nADD width text;");
				await curs.execute("alter table files\nADD height text;");
			} catch(e) {}
		} case 22: {
			try {
				await curs.execute("update aclgroup_groups set css = ? where name = ?", ['text-decoration: line-through !important; color: gray !important;', '차단된 사용자']);
			} catch(e) {}
		} case 23: {
			try {
				await curs.execute("create table boardipacl (cidr text default '', expiration text default '', note text default '', date text default '')");
				await curs.execute("create table boardsuspendaccount (username text default '', expiration text default '', note text default '', date text default '')");
			} catch(e) {}
		}
	}
	await curs.execute("update config set value = ? where key = 'update_code'", [updatecode]);
	wikiconfig.update_code = updatecode;
	
	if(hostconfig.debug) print('경고! 위키가 디버그 모드에서 실행 중입니다. 알려지지 않은 취약점에 노출될 수 있습니다.\n');
	
	// 작성이 필요한 문서
	async function cacheNeededPages() {
		for(var prop of Object.getOwnPropertyNames(neededPages))
			delete neededPages[prop];
		for(var ns of fetchNamespaces()) {
			neededPages[ns] = [];
			var data = await curs.execute("select distinct link from backlink where exist = '0' and linkns = ?", [ns]);
			for(let i of data) {
				neededPages[ns].push(i.link);
			}
		}
	}
	setInterval(cacheNeededPages, 86400000);
	cacheNeededPages();

	var dbdata = await curs.execute("select name, css from aclgroup_groups");
	for(var item of dbdata)
		aclgroupCache.css[item.name] = item.css;
	var dbdata = await curs.execute("select aclgroup, username from aclgroup");
	for(var item of dbdata) {
		if(!aclgroupCache.group[item.username])
			aclgroupCache.group[item.username] = [];
		aclgroupCache.group[item.username].push(item.aclgroup);
	}
	
	// 서버실행
	const { host, port } = hostconfig;
	if(hostconfig.default_host)
		wiki.listen(process.env.PORT);  
	else 
		wiki.listen(port, host);
	print(host + (port == 80 ? '' : (':' + port)) + '에서 실행 중. . .');
	beep();
	
	if(hostconfig.search_autostart) {
		child_process.execFile('node', ['search.js'], function() {});
	}
	
	if(hostconfig.file_autostart) {
		child_process.execFile('node', ['fileserver.js'], function() {});
	}
})();

if(hostconfig.self_request) {
	var rq = setInterval(function() {
		https.request({
			host: hostconfig.self_request,
			path: '/RecentDiscuss',
			headers: {
				"Cookie": 'a=1; korori=a; ',
				"Host": hostconfig.self_request,
				"Accept-Encoding": "gzip, deflate",
				"Connection": "keep-alive",
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36",
			},
			port: 443,
		}, function(res) {
			var ret = '';

			res.on('data', function(chunk) {
				ret += chunk;
			});

			res.on('end', function() {
			});
		}).end();
	}, (50 + Math.floor(Math.random() * 10)) * 1000);
}
 
}

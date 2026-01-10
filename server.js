const fs = require('fs');
const http = require('http');
const https = require('https');
const md5 = require('md5');
const express = require('express');
const session = require('express-session');
const swig = require('swig');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const child_process = require('child_process');
const noderl = require('readline');
try {  // fileUpload 모듈을 불러오기 전에 있어야 함
	if(!fs.existsSync('./node_modules/busboy/lib/.imitated_seed_patch')) {
		fs.writeFileSync('./node_modules/busboy/lib/utils.js', fs.readFileSync('./node_modules/busboy/lib/utils.js').toString().replace('} catch {', '} catch(e) {'));
		fs.writeFileSync('./node_modules/busboy/lib/.imitated_seed_patch', '');
	}
} catch(e) {}
const fileUpload = require('express-fileupload');

const print = console.log;

// 입력받기
function readline(prompt) {
	const rl = noderl.createInterface(process.stdin, process.stdout);
	return new Promise((resolve, reject) => {
		rl.question(prompt, ret => {
			rl.close();
			resolve(ret);
		});
	});
}

function readlineMasked(prompt) {
	if(!process.stdin.isTTY) {
		print('경고: 비밀번호 숨기기가 지원되지 않습니다');
		return readline(prompt);
	}
	
	const rl = noderl.createInterface(process.stdin);
	
	process.stdout.write(prompt);
	
	return new Promise((resolve, reject) => {
		noderl.emitKeypressEvents(process.stdin, rl);
		var answer = '';
		process.stdin.setRawMode(true);
		
		function onKeypress(str, key) {
			if(key.name == 'return') {
				process.stdout.write('\n');
				process.stdin.setRawMode(false);
				process.stdin.removeListener('keypress', onKeypress);
				rl.close();
				return resolve(answer);
			}
			if(key.name == 'backspace') {
				if(answer) {
					answer = answer.slice(0, -1);
					process.stdout.write('\b \b');
				}
				return;
			}
			if(key.ctrl && key.name == 'c') {
				process.stdin.setRawMode(false);
				process.stdin.removeListener('keypress', onKeypress);
				return process.exit();
			}
			if(str == undefined)
				return;
			answer += str;
			process.stdout.write('*');
		}

		process.stdin.on('keypress', onKeypress);
	});
}

function readdir(dir, flag) {
	if(dir.endsWith('/'))
		dir = dir.slice(dir.length - 1);
	var ret = fs.readdirSync(dir, { withFileTypes: true });
	if(flag == 'directory')
		ret = ret.filter(f => fs.statSync(dir + '/' + (f.name || f)).isDirectory());
	else if(flag == 'file')
		ret = ret.filter(f => !fs.statSync(dir + '/' + (f.name || f)).isDirectory());
	ret = ret.map(dirent => dirent.name || dirent);
	return ret;
}

async function init() {
	const mysql = require('mysql');
	
	print('병아리 - the seed 모방 엔진에 오신것을 환영합니다.\n');
	
	var skins = null;
	try {
		skins = readdir('./skins', 'directory');
		if(!skins.length) throw 1;
	} catch(e) {
		print('스킨이 없습니다. 스킨을 설치한 후 다시 시도하십시오.');
		return process.exit(1);
	}
	
	// 호스팅 설정
	var hostconfig = {
		host: (await readline('호스트 주소(0.0.0.0): ')) || '0.0.0.0',
		port: (await readline('포트 번호(8080): ')) || '8080',
		skin: (await readline(`기본 스킨 이름(${skins[0]}): `)) || skins[0],
		search_host: '127.5.5.5',
		search_port: '25005',
		file_host: '127.5.5.5',
		file_port: '27775',
		disable_file_server: true,
		owners: [(await readline('소유자 닉네임(namu): ')) || 'namu'],
		disable_email: true,
		sessionhttps: false,
		database_type: (await readline('데이타베이스 종류[sqlite, mysql](sqlite): ')).toLowerCase() || 'sqlite',
	};
	
	while(!['sqlite', 'mysql'].includes(hostconfig.database_type)) {
		print('데이타베이스 종류가 잘못되었습니다 \n');
		hostconfig.database_type = (await readline('데이타베이스 종류(sqlite, mysql): ')).toLowerCase() || 'sqlite';
	}
	
	var aclExists = false, aclgroupExists = false;
	
	if(hostconfig.database_type != 'sqlite') {
		print('\n경고! MySQL 지원은 아직 실험적입니다. 버그가 있을 수 있습니다 \n');
		while(true) {
			hostconfig.database_host = (await readline('데이타베이스 호스트(0.0.0.0): ')) || '0.0.0.0';
			hostconfig.database_user = (await readline('데이타베이스 사용자(root): ')) || 'root';
			hostconfig.database_password = (await readlineMasked('데이타베이스 비밀번호: ', true));
			hostconfig.database_name = (await readline('데이타베이스 이름(theseedwiki): ')) || 'theseedwiki';
			
			var db = mysql.createConnection({
				host: hostconfig.database_host || '127.0.0.1',
				user: hostconfig.database_user || 'root',
				password: hostconfig.database_password,
				database: hostconfig.database_name,
			});
			db.q = function(q) {
				return new Promise((resolve, reject) => {
					db.query(q, (err, result) => {
						if(err) return reject(err);
						resolve(result);
					});
				});
			};
			try {
				await db.q("select 1");
				break;
			} catch(e) {
				print('\n입력한 정보가 작동하지 않습니다. 다시 시도하십시오.');
				print('오류 정보는 다음과 같습니다 - ' + e.name + ': ' + (e.message || '오류 정보 없음'));
				if(e.message && e.message.includes('Unknown database'))
					print('참고: MySQL 콘솔에서 <create database ' + hostconfig.database_name + ';>를 입력해보십시오')
				process.stdout.write('\n');
			} finally {
				db.end();
			}
		}
	} else {
		hostconfig.sqlite_database_name = (await readline('데이타베이스 화일 이름(wikidata.db): ')) || 'wikidata.db';
	}
	
	fs.writeFileSync('config.json', JSON.stringify(hostconfig), 'utf8');
	
	try {
		const { curs, db, insert } = require('./database');
		
		// 만들 테이블
		const tables = {
			documents: ['title', 'content', 'namespace', 'time'],
			history: ['title', 'namespace', 'content', 'rev', 'time', 'username', 'changes', 'log', 'iserq', 'erqnum', 'advance', 'ismember', 'edit_request_id', 'flags', 'isapi', 'loghider'],
			namespaces: ['namespace', 'locked', 'norecent', 'file'],
			users: ['username', 'password', 'email'],
			user_settings: ['username', 'key', 'value'],
			nsacl: ['namespace', 'no', 'type', 'content', 'action', 'expire'],
			config: ['key', 'value'],
			email_filters: ['address'],
			stars: ['title', 'namespace', 'username', 'lastedit'],
			perms: ['perm', 'username'],
			threads: ['title', 'namespace', 'topic', 'status', 'time', 'tnum', 'deleted', 'num'],
			res: ['id', 'content', 'username', 'time', 'hidden', 'hider', 'status', 'tnum', 'ismember', 'isadmin', 'type'],
			useragents: ['username', 'string'],
			login_history: ['username', 'ip', 'time'],
			account_creation: ['key', 'email', 'time'],
			acl: ['title', 'namespace', 'id', 'type', 'action', 'expiration', 'conditiontype', 'condition', 'ns'],
			ipacl: ['cidr', 'al', 'expiration', 'note', 'date'],
			suspend_account: ['username', 'date', 'expiration', 'note'],
			aclgroup_groups: ['name', 'admin', 'date', 'lastupdate', 'css', 'warning_description', 'disallow_signup'],
			aclgroup: ['aclgroup', 'type', 'username', 'note', 'date', 'expiration', 'id'],
			block_history: ['date', 'type', 'aclgroup', 'id', 'duration', 'note', 'executer', 'target', 'ismember', 'logid'],
			edit_requests: ['title', 'namespace', 'id', 'deleted', 'state', 'content', 'baserev', 'username', 'ismember', 'log', 'date', 'processor', 'processortype', 'lastupdate', 'processtime', 'reason', 'rev'],
			files: ['title', 'namespace', 'hash', 'url', 'size', 'width', 'height'],
			backlink: ['title', 'namespace', 'link', 'linkns', 'type', 'exist'],
			classic_acl: ['title', 'namespace', 'blockkorea', 'blockbot', 'read', 'edit', 'del', 'discuss', 'move'],
			autologin_tokens: ['username', 'token'],
			trusted_devices: ['username', 'id'],
			api_tokens: ['username', 'token'],
			recover_account: ['key', 'username', 'email', 'time'],
			boardipacl: ['cidr', 'expiration', 'note', 'date'],
			boardsuspendaccount: ['username', 'expiration', 'note', 'date'],
		};
		
		// 테이블 만들기
		process.stdout.write('\n데이타베이스 테이블을 만드는 중... ');
		for(var table in tables) {
			var sql = `CREATE TABLE ${table} (`;
			for(var col of tables[table])
				sql += `${col} TEXT DEFAULT '' NOT NULL, `;
			sql = sql.replace(/[,]\s$/, '');		
			sql += `)`;
			try {
				await db.run(sql);
			} catch(e) {
				if(table == 'acl')
					aclExists = true;
				if(table == 'aclgroup_groups')
					aclgroupExists = true;
				if(!e.message || !e.message.includes('already exists'))
					throw e;
				process.stdout.write(`\n테이블 ${table}이 이미 있으므로 건너뜁니다... `);
			}
		}
		print('작업 완료!');
		
		if(aclExists) {
			print('ACL이 이미 정의되어 있어 이름공간 ACL을 새로 만들지 않았습니다');
		} else {
			process.stdout.write('이름공간 ACL을 만드는 중... ');
			for(var namespc of ['문서', '틀', '분류', '파일', '더 시드']) {
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '1', 'read', 'allow', '0', 'perm', 'any', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '1', 'edit', 'deny', '0', 'perm', 'blocked_ipacl', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '2', 'edit', 'deny', '0', 'perm', 'suspend_account', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '3', 'edit', 'allow', '0', 'perm', 'any', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '1', 'move', 'deny', '0', 'perm', 'blocked_ipacl', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '2', 'move', 'deny', '0', 'perm', 'suspend_account', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '3', 'move', 'allow', '0', 'perm', 'any', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '1', 'delete', 'deny', '0', 'perm', 'blocked_ipacl', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '2', 'delete', 'deny', '0', 'perm', 'suspend_account', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '3', 'delete', 'allow', '0', 'perm', 'any', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '1', 'create_thread', 'deny', '0', 'perm', 'blocked_ipacl', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '2', 'create_thread', 'deny', '0', 'perm', 'suspend_account', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '3', 'create_thread', 'allow', '0', 'perm', 'any', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '1', 'write_thread_comment', 'deny', '0', 'perm', 'blocked_ipacl', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '2', 'write_thread_comment', 'deny', '0', 'perm', 'suspend_account', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '3', 'write_thread_comment', 'allow', '0', 'perm', 'any', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '1', 'edit_request', 'deny', '0', 'perm', 'blocked_ipacl', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '2', 'edit_request', 'deny', '0', 'perm', 'suspend_account', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '3', 'edit_request', 'allow', '0', 'perm', 'any', '1')");
				await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '" + namespc + "', '1', 'acl', 'allow', '0', 'perm', 'admin', '1')");
			}
			
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '1', 'read', 'allow', '0', 'perm', 'any', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '1', 'edit', 'deny', '0', 'perm', 'suspend_account', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '2', 'edit', 'allow', '0', 'perm', 'match_username_and_document_title', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '3', 'edit', 'allow', '0', 'perm', 'editable_other_user_document', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '1', 'move', 'deny', '0', 'perm', 'suspend_account', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '2', 'move', 'allow', '0', 'perm', 'match_username_and_document_title', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '3', 'move', 'allow', '0', 'perm', 'editable_other_user_document', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '1', 'delete', 'deny', '0', 'perm', 'suspend_account', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '2', 'delete', 'allow', '0', 'perm', 'match_username_and_document_title', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '3', 'delete', 'allow', '0', 'perm', 'editable_other_user_document', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '1', 'create_thread', 'deny', '0', 'perm', 'blocked_ipacl', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '2', 'create_thread', 'deny', '0', 'perm', 'suspend_account', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '3', 'create_thread', 'allow', '0', 'perm', 'any', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '1', 'write_thread_comment', 'deny', '0', 'perm', 'blocked_ipacl', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '2', 'write_thread_comment', 'deny', '0', 'perm', 'suspend_account', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '3', 'write_thread_comment', 'allow', '0', 'perm', 'any', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '1', 'edit_request', 'deny', '0', 'perm', 'blocked_ipacl', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '2', 'edit_request', 'deny', '0', 'perm', 'suspend_account', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '3', 'edit_request', 'allow', '0', 'perm', 'any', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '사용자', '1', 'acl', 'allow', '0', 'perm', 'admin', '1')");

			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '휴지통', '1', 'read', 'allow', '0', 'perm', 'admin', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '휴지통', '1', 'edit', 'allow', '0', 'perm', 'admin', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '휴지통', '1', 'move', 'allow', '0', 'perm', 'admin', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '휴지통', '1', 'delete', 'allow', '0', 'perm', 'admin', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '휴지통', '1', 'create_thread', 'allow', '0', 'perm', 'admin', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '휴지통', '1', 'write_thread_comment', 'allow', '0', 'perm', 'admin', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '휴지통', '1', 'edit_request', 'allow', '0', 'perm', 'admin', '1')");
			await curs.execute("INSERT INTO acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) VALUES ('', '휴지통', '1', 'acl', 'allow', '0', 'perm', 'admin', '1')");

			print('완료!');
		}
		
		if(aclgroupExists) {
			print('ACL그룹이 이미 정의되어 있어 기본 ACL그룹을 새로 만들지 않았습니다');
		} else {
			process.stdout.write('ACL그룹을 만드는 중... ');
			await db.run("insert into aclgroup_groups (name, css, warning_description, disallow_signup) values ('차단된 사용자', 'text-decoration: line-through !important; color: gray !important;', '', '1')");
			print('완료!');
		}
	} catch(e) {
		print('\n데이타베이스 초기 구성 중 오류가 발생했습니다. 다음에 다시 시도하십시오');
		print('오류 정보는 다음과 같습니다 - ' + e.name + ': ' + (e.message || '오류 정보 없음'));
		fs.unlinkSync('./config.json');
		return process.exit(2);
	}
	
	print('\n준비 완료되었습니다. 엔진을 다시 시작하십시오.');
	process.exit(0);
}

if(!fs.existsSync('./config.json')) init(); else {

console.log('병아리를 시작하는 중. . . \n');

const { curs, db, insert } = require('./database');

const hostconfig = require('./hostconfig');
const server = express();
const router = require('./router');
router.attachRoutes();

const functions = require('./functions');
for(var item in functions) global[item] = functions[item];

// swig 필터
swig.setFilter('encode_userdoc', function encodeUserdoc(input) {
	return encodeURIComponent('사용자:' + input);
});
swig.setFilter('encode_doc', function encodeDoc(input) {
	return encodeURIComponent(input);
});
swig.setFilter('avatar_url', function avatarURL(input) {
	return 'https://www.gravatar.com/avatar/' + md5(getUserSetting(input.username, 'email') || input.username) + '?d=retro';
});
swig.setFilter('md5', function md5(input, length) {
	return md5(input).slice(0, (length || 33));
});
swig.setFilter('url_encode', function urlEncode(input) {
	return encodeURIComponent(input);
});
swig.setFilter('to_title', function(input) {
	return totitle(input.title, input.namespace).toString();
});
swig.setFilter('to_date', toDate);
swig.setFilter('localdate', generateTime);
function render_user(input, noBold) {
	return ip_pas(input.username, input.ismember, noBold);
}
render_user.safe = true;
swig.setFilter('render_user', render_user);
function res_admin(input, rs) {
	return input.replace('<a h', rs.isadmin == '1' ? '<a style="font-weight: bold;" h' : '<a h').replace('<a style="', rs.isadmin == '1' ? '<a style="font-weight: bold; ' : '<a style="');
}
res_admin.safe = true;
swig.setFilter('res_admin', res_admin);
function render_edit_flag(input) {
	return edittype(input.advance, ...(input.flags.split('\n')));
}
render_edit_flag.safe = true;
swig.setFilter('render_edit_flag', render_edit_flag);

process.stdout.write('스킨 컴파일 중... ');
cacheSkinList();
print('완료!');

process.stdout.write('템플릿 컴파일 중... ');
cacheViews();
print('완료!');

// 모듈 사용
process.stdout.write('미들웨어를 불러오는 중... ');
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(fileUpload({
	limits: { fileSize: hostconfig.max_file_size || 2000000 },
    abortOnLimit: true,
}));
server.use(session({
	key: 'kotori',
	secret: rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 1024),
	cookie: {
		expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
		httpOnly: true,
		// secure: hostconfig.sessionhttps, (이렇게 하면 HTTP에서 로그인 자체가 불가능)
		samesite: 'lax',
	},
	resave: false,
	saveUninitialized: false,
}));
server.use(cookieParser());
print('완료!');

if(fs.existsSync('./images'))
	server.use('/images', express.static('images', { maxAge: 86400000 }));

// 업데이트 수준
const updatecode = '25';

// 보안을 위해...
server.disable('x-powered-by');

// 아이피 차단, 자동 로그인 & 차단 로그아웃
server.all('*', async function(req, res, next) {
	if(hostconfig.block_ip && hostconfig.block_ip.includes(ip_check(req, 1)))
		return;
	
	if(hostconfig.log_requests)
		log('메인 쓰레드', `${req.method} ${ip_check(req)}${req.session.username ? (' (' + ip_check(req, 1) + ')') : ''} -- ${req.path}`);
	
	// 4.0.x에서 차단돼있으면 로그아웃
	var blocklogout = false;
	if(!ver('4.1.0') && req.session.username && await userblocked(ip_check(req))) {
		delete req.session.username;
		blocklogout = true;
	}
	
	// 없는 이름이면 로그아웃
	if(req.session.username) {
		const d = await db.get("select username from users where username = ?", [req.session.username]);
		if(!d) delete req.session.username;
	}
	
	// 자동 로그인
	var autologin = req.cookies['honoka'];
	if(!blocklogout && autologin) {
		const d = await db.get("select username, token from autologin_tokens where token = ?", [sha3(autologin)]);
		if(!d) {
			delete req.session.username;
			delete req.cookies['honoka'];
			res.cookie('honoka', '', { expires: new Date(Date.now() - 1) });
		} else {
			req.session.username = d.username;
		}
	}
	
	next();
});

for(var skin of skinList)
	server.use(`/skins/${skin}`, express.static(`skins/${skin}/static`));

server.use('/js', express.static('js'));
server.use('/css', express.static('css'));

function redirectToFrontPage(req, res) {
	res.redirect('/w/' + (config.getString('wiki.front_page', 'FrontPage')));
}

server.get(/^\/w$/, redirectToFrontPage);
server.get(/^\/w\/$/, redirectToFrontPage);
server.get('/', redirectToFrontPage);

if(hostconfig.enable_captcha) server.post('/RegenerateCaptcha', (req, res) => {
	if(isNaN(req.query['id']))
		return res.status(400).send('');
	if(!req.session['captcha-' + req.query['id']])
		return res.status(400).send('');
	const captcha = generateCaptchaData();
	req.session['captcha-' + req.query['id']] = captcha.answer;
	const ret = {};
	var i = 1;
	for(var item of captcha.data)
		ret[i++] = item;
	res.json(ret);
});

server.use('/', router);

// 404 페이지
server.use(function(req, res, next) {
    return res.status(404).send(`\
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
</html>`);
});

(async function setWikiData() {
	// 위키 설정 캐시
	process.stdout.write('설정을 불러오는 중... ');
	var data = await curs.execute("select key, value from config");
	for(var cfg of data)
		wikiconfig[cfg.key] = cfg.value;
	print('완료!');
	
	// 권한 캐시
	process.stdout.write('권한 정보를 불러오는 중... ');
	var data = await curs.execute("select username, perm from perms order by username");
	for(var prm of data) {
		if(typeof(permlist[prm.username]) == 'undefined')
			permlist[prm.username] = [prm.perm];
		else
			permlist[prm.username].push(prm.perm);
	}
	print('완료!');
	
	// 사용자 설정 캐시
	process.stdout.write('사용자 설정 정보를 불러오는 중... ');
	var data = await curs.execute("select username, key, value from user_settings");
	for(var set of data) {
		if(!userset[set.username]) userset[set.username] = {};
		if(set.key == 'email' && !set.value)
			continue;
		userset[set.username][set.key] = set.value;
	}
	print('완료!');
	
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
		} case 24: {
			try {
				await curs.execute("alter table history\nADD loghider text;");
				await curs.execute("update history set loghider = ''");
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
	
	if(ver('4.18.0')) {
		setInterval(async function clearExpiredAclgroups() {
			var dbdata = await curs.execute("select username, aclgroup from aclgroup where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
			for(var item of dbdata) 
				if(aclgroupCache.group[item.username.toLowerCase()])
					aclgroupCache.group[item.username.toLowerCase()].remove(item.aclgroup);
			await curs.execute("delete from aclgroup where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
		}, 60000);

		var dbdata = await curs.execute("select name, css from aclgroup_groups");
		for(var item of dbdata)
			aclgroupCache.css[item.name] = item.css;
		var dbdata = await curs.execute("select aclgroup, username from aclgroup");
		for(var item of dbdata) {
			if(!aclgroupCache.group[item.username.toLowerCase()])
				aclgroupCache.group[item.username.toLowerCase()] = [];
			aclgroupCache.group[item.username.toLowerCase()].push(item.aclgroup);
		}
	}
	
	if(ver('4.13.0'))
		print('[경고!]: 4.13.0 이상 버전은 더 이상 보수되지 않습니다')
	
	// 서버실행
	const { host, port } = hostconfig;
	if(hostconfig.default_host)
		server.listen(process.env.PORT);  
	else 
		server.listen(port, host);
	print('\n' + host + (port == 80 ? '' : (':' + port)) + '에서 실행 중. . .');
	beep();
	
	if(hostconfig.search_autostart)
		child_process.execFile('node', ['search.js'], function() {});
	
	if(hostconfig.file_autostart)
		child_process.execFile('node', ['fileserver.js'], function() {});
})();

if(hostconfig.self_request)
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

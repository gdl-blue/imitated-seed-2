/* 병아리 엔진 - the seed 모방 프로젝트 */

const http = require('http');
const https = require('https');
const path = require('path');
const geoip = require('geoip-lite');
const inputReader = require('wait-console-input');
const { SHA3 } = require('sha3');
const md5 = require('md5');
const sqlite3 = require('sqlite3').verbose();
const express = require('express');
const session = require('express-session');
const swig = require('swig');
const ipRangeCheck = require('ip-range-check');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const { JSDOM } = require('jsdom');
const jquery = require('jquery');
const diff = require('./cemerick-jsdifflib.js');
const cookieParser = require('cookie-parser');
const child_process = require('child_process');

const timeFormat = 'Y-m-d H:i:s';  // 날짜 및 시간 기본 형식
const _ = undefined;

// 더 시드 모방 버전 (나중에 config.json에서 불러옴)
var major = 4, minor = 12, revision = 0;
var _ready = 0;

const wiki = express();  // 서버
const conn = new sqlite3.Database('./wikidata.db', () => 0);  // 데이타베이스
const upload = multer();  // 파일 올리기 모듈

var wikiconfig = {};  // 위키 설정 캐시
var permlist = {};  // 권한 캐시
var userset = {};  // 사용자 설정 캐시
var skinList = [];  // 스킨 목록 캐시
var skincfgs = {};  // 스킨 구성설정 캐시

var loginHistory = {};
var neededPages = {};

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

// 모듈 사용
wiki.use(bodyParser.json());
wiki.use(bodyParser.urlencoded({ extended: true }));
wiki.use(upload.any()); 
wiki.use(express.static('public'));
wiki.use(session({
	key: 'kotori',
	secret: rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 1024),
	cookie: { expires: false },
	resave: false,
    saveUninitialized: true,
}));
wiki.use(cookieParser());
wiki.set('trust proxy', true);

// 업데이트 수준
const updatecode = '12';

// 사용자 권한
var perms = [
	'delete_thread', 'admin', 'editable_other_user_document', 'suspend_account', 'ipacl', 
	'update_thread_status', 'acl', 'nsacl', 'hide_thread_comment', 'grant', 'no_force_recaptcha', 
	'disable_two_factor_login', 'login_history', 'update_thread_document', 'update_thread_topic', 
	'aclgroup', 'api_access', 
];
var disable_autoperms = ['disable_two_factor_login'];

// 로그출력
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

// SHA-3 암호화
function sha3(str, bit) {
    const hash = new SHA3(bit || 256);
    hash.update(str);
    return hash.digest('hex');
}

// 파이선 SQLite 모방
const curs = {
	execute(sql, params = []) {
		return new Promise((resolve, reject) => {
			if(sql.toUpperCase().startsWith("SELECT")) {
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
	}
};

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

// 데이타 베이스에 추가
function insert(table, obj) {
	var arr = [];
	var sql = 'insert into ' + table + ' (';
	for(var item in obj) {
		sql += item + ', ';
	} sql = sql.replace(/[,]\s$/, '') + ') values (';
	for(var item in obj) {
		sql += '?, ';
		arr.push(obj[item]);
	} sql = sql.replace(/[,]\s$/, '') + ')';
	return curs.execute(sql, arr);
}

// 보안을 위해...
wiki.disable('x-powered-by');

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
		return (req.ip || '10.0.0.9').split(',')[0];
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

    if(minor >= 17 || (minor == 16 && revision >= 1)) {
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

// swig 필터
swig.setFilter('encode_userdoc', function encodeUserdocURL(input) {
	return encodeURIComponent('사용자:' + input);
});
swig.setFilter('encode_doc', function encodeDocURL(input) {
	return encodeURIComponent(input);
});
swig.setFilter('avatar_url', function(input) {
	return 'https://www.gravatar.com/avatar/' + md5(getUserSetting(input.username, 'email', '')) + '?d=retro';
});
swig.setFilter('md5', function(input, l) {
	return md5(input).slice(0, (l || 33));
});
swig.setFilter('url_encode', function(input) {
	return encodeURIComponent(input);
});
swig.setFilter('to_date', toDate);
swig.setFilter('localdate', generateTime);

// 스택 (렌더러에 필요)
class Stack {
	constructor() {
		this.internalArray = [];
	}
	
	push(x) {
		this.internalArray.push(x);
	}
	
	pop() {
		return this.internalArray.pop();
	}
	
	top() {
		return this.internalArray[this.internalArray.length - 1];
	}
	
	size() {
		return this.internalArray.length;
	}
	
	empty() {
		return this.internalArray.length ? false : true;
	}
};

try {
	hostconfig = require('./config.json'); 
	if(hostconfig.uninitialized) throw 1;
	_ready = 1; 
	if(hostconfig.theseed_version) {
		var sp = hostconfig.theseed_version.split('.');
		major = Number(sp[0]);
		minor = Number(sp[1]);
		revision = Number(sp[2]);
	}
	if(minor >= 18) perms = perms.filter(item => !['ipacl', 'suspend_account'].includes(item));
	else perms = perms.filter(item => !['aclgroup'].includes(item));
	if(minor >= 2) perms = perms.filter(item => !['acl'].includes(item));
	if(minor < 20) perms = perms.filter(item => !['api_access'].includes(item));
	if(!(minor > 0 || (minor == 0 && revision >= 20))) perms = perms.concat(['developer', 'tribune', 'arbiter']);
	if(hostconfig.debug) perms.push('debug');
} catch(e) { (async function() {
	print('병아리 - the seed 모방 엔진에 오신것을 환영합니다.\n');
	
	if(typeof hostconfig != 'object')
	
	// 호스팅 설정
	hostconfig = {
		host: input('호스트 주소: '),
		port: input('포트 번호: '),
		skin: input('기본 스킨 이름: '),
		search_host: '127.5.5.5',
		search_port: '25005',
		owners: [input('소유자 닉네임: ')],
	};
	/*
	const frfl = [
		'js/theseed.js', 'js/jquery-2.1.4.min.js', 'js/jquery-1.11.3.min.js', 
		'js/intersection-observer.js', 'js/dateformatter.js',
		
		'css/wiki.css', 'css/diffview.css', 'css/katex.min.css',
	];
	const skidx = {
		buma: 'https://github.com/LiteHell/theseed-skin-buma/archive/d77eef50a77007da391c5082b4b94818db372417.zip',
		liberty: 'https://github.com/namu-theseed/theseed-skin-liberty/archive/153cf78f70206643ec42e856aff8280dc21eb2c0.zip',
		vector: 'https://github.com/LiteHell/theseed-skin-vector/archive/51fd9afdd8000dafafd2600313e8e03df1f7fdcb.zip',
		namuvector: 'https://github.com/LiteHell/theseed-skin-namuvector/archive/690288e719bfe7e4abced3dc715104dd80e8f1ff.zip',
		marble: 'https://github.com/foxtrot-99/theseed-skin-marble/archive/refs/heads/master.zip',
	};
	function download(path) {
		return new Promise((resolve, reject) => {
			https.get({
				host: 'theseed.io',
				path: '/' + path,
			}, res => {
				const d = [];
				res.on('data', chunk => d.push(chunk));
				res.on('end', () => {
					var ret = Buffer.from('');
					ret = Buffer.concat([ret, Buffer.concat(d)]);
					fs.writeFileS
				});
			});
		});
	}
	if((hostconfig.uninitialized !== undefined && hostconfig.download_files) || hostconfig.uninitialized === undefined) {
		var chk = null;
		for(var f of frfl) {
			if(!fs.existsSync(f)) {
				chk = f;
				break;
			}
		}
		if(chk) {
			if(hostconfig.uninitialized !== undefined || (hostconfig.uninitialized === undefined && input(f + ' 파일이 없습니다. 이것은 위키 실행을 위해 필요합니다. theseed.io에서 자동으로 다운로드하시겠습니까? [Y/N]: ').toLowerCase() == 'Y')) {
				var dodn = 1;
			}
		}
		if(dodn) {
			
		}
	}
	*/
	hostconfig.uninitialized = false;
	
	// 만들 테이블
	const tables = {
		'documents': ['title', 'content', 'namespace', 'time'],
		'history': ['title', 'namespace', 'content', 'rev', 'time', 'username', 'changes', 'log', 'iserq', 'erqnum', 'advance', 'ismember', 'edit_request_id', 'flags'],
		'namespaces': ['namespace', 'locked', 'norecent', 'file'],
		'users': ['username', 'password'],
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
		'aclgroup_groups': ['name', 'admin', 'date', 'lastupdate'],
		'aclgroup': ['aclgroup', 'type', 'username', 'note', 'date', 'expiration', 'id'],
		'block_history': ['date', 'type', 'aclgroup', 'id', 'duration', 'note', 'executer', 'target', 'ismember', 'logid'],
		'edit_requests': ['title', 'namespace', 'id', 'deleted', 'state', 'content', 'baserev', 'username', 'ismember', 'log', 'date', 'processor', 'processortype', 'lastupdate', 'processtime', 'reason', 'rev'],
		'files': ['title', 'namespace', 'hash'],
		'backlink': ['title', 'namespace', 'link', 'linkns', 'type', 'exist'],
		'classic_acl': ['title', 'namespace', 'blockkorea', 'blockbot', 'read', 'edit', 'del', 'discuss', 'move'],
		'autologin_tokens': ['username', 'token'],
		'trusted_devices': ['username', 'id'],
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
})(); } if(_ready) {

// 나무마크
async function markdown(content, discussion = 0, title = '', flags = '') {
	// markdown 아니고 namumark
	flags = flags.split(' ');
	
	function parseTable(content) {
		var data = '\n' + content + '\n';
		
		// 캡션없는 표의 셀에 <td> 추가
		for(let _tr of (data.match(/^(\|\|(((?!\|\|($|\n))[\s\S])*)\|\|)$/gim) || [])) {
			var tr = _tr.match(/^(\|\|(((?!\|\|($|\n))[\s\S])*)\|\|)$/gim)[0];
			var otr = tr;
			var ntr = tr
				.replace(/^[|][|]/g, '<tr norender><td>')
				.replace(/[|][|]$/g, '</td></tr>')
				.replace(/[|][|]/g, '</td><td>')
				.replace(/\n/g, '<br />');
			
			data = data.replace(tr, ntr);
		}
		
		var datarows = data.split('\n');
		
		// 캡션없는 표의 시작과 끝을 감싸고, 전체에 적용되는 꾸미기 문법 적용
		for(let _tr of (data.match(/^(<tr norender><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/gim) || [])) {
			var tr = _tr.match(/^(<tr norender><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/im)[0];
			
			if (  // 표의 시작이라면(위에 || 문법 없음)
				(!((befrow = (datarows[datarows.findIndex(s => s == tr.split('\n')[0]) - 1] || '')).match(/^(<tr><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/im))) &&  // 이전 줄이 표가 아니면
				(!(befrow.match(/^(\|(((?!\|).)+)\|(((?!\|\|($|\n))[\s\S])*)\|\|)$/im)))  // 캡션도 아니면
			) {
				const fulloptions = (tr.replace(/&lt;((?!table).)*&gt;/g, '').match(/^<tr norender><td>((&lt;([a-z0-9 ]+)=(((?!&gt;).)+)&gt;)+)/i) || ['', ''])[1];
				var ts = '', trs = '';
				
				var alop, align = ((alop = (fulloptions.match(/&lt;table\s*align=(left|center|right)&gt;/))) || ['', 'left'])[1];
				if(alop) data = data.replace(tr, tr = tr.replace(alop[0], ''));
				
				var wiop, width = ((wiop = (fulloptions.match(/&lt;table\s*width=((\d+)(px|%|))&gt;/))) || ['', ''])[1];
				if(wiop) {
					data = data.replace(tr, tr = tr.replace(wiop[0], ''));
					trs += 'width: ' + width + '; ';
				}
				
				var clop, color = ((clop = (fulloptions.match(/&lt;table\s*color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
				if(clop) {
					data = data.replace(tr, tr = tr.replace(clop[0], ''));
					trs += 'color: ' + color + '; ';
				}
				
				var bgop, bgcolor = ((bgop = (fulloptions.match(/&lt;table\s*bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
				if(bgop) {
					data = data.replace(tr, tr = tr.replace(bgop[0], ''));
					trs += 'background-color: ' + bgcolor + '; ';
				}
				
				var brop, border = ((brop = (fulloptions.match(/&lt;table\s*bordercolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
				if(brop) {
					data = data.replace(tr, tr = tr.replace(brop[0], ''));
					trs += 'border: 2px solid ' + border + '; ';
				}
				
				if(trs) ts = ' style="' + trs + '"';
				
				data = data.replace(tr, '<div class="wiki-table-wrap table-' + align + '"><table class=wiki-table' + ts + '><tbody>\n' + tr);
				datarows = data.split('\n');
			} if (  // 표의 끝이라면(아래에 || 문법 없음)
				!((aftrow = (datarows[datarows.findIndex(s => s == (r = tr.split('\n'))[r.length - 1]) + 1] || '')).match(/^(<tr norender><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/im))  // 다음 줄이 표가 아니면
			) {
				data = data.replace(tr, tr + '\n</tbody></table></div>');
			}
			
			data = data.replace(tr, tr.replace('<tr norender>', '<tr>'));
			datarows = data.split('\n');
		}
		
		// 캡션있는 표 렌더링
		for(let _tr of (data.match(/^(\|(((?!\|).)+)\|(((?!\|\|($|\n))[\s\S])*)\|\|)$/gim) || [])) {
			var tr = _tr.match(/^(\|(((?!\|).)+)\|(((?!\|\|($|\n))[\s\S])*)\|\|)$/im);
			var ec = '';
			
			if (  // 표의 시작이 아니면 건너뛰기
				((befrow = (datarows[datarows.findIndex(s => s == tr[0].split('\n')[0]) - 1] || '')).match(/^(<tr><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/im))
			) continue; if (  // 표의 끝
				!((aftrow = (datarows[datarows.findIndex(s => s == (r = tr[0].split('\n'))[r.length - 1]) + 1] || '')).match(/^(<tr><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/im))  // 다음 줄이 표가 아니면
			) {
				ec = '\n</tbody></table></div>';
			}
			
			ntr = (
				('||' + tr[4] + '||')
				.replace(/^[|][|]/g, '<tr><td>')
				.replace(/[|][|]$/g, '</td></tr>')
				.replace(/[|][|]/g, '</td><td>')
				.replace(/\n/g, '<br />')
				+ ec
			);
			
			const fulloptions = (ntr.replace(/&lt;((?!table).)*&gt;/g, '').match(/^<tr><td>((&lt;([a-z0-9 ]+)=(((?!&gt;).)+)&gt;)+)/i) || ['', ''])[1];
				
			var alop, align = ((alop = (fulloptions.match(/&lt;table\s*align=(left|center|right)&gt;/))) || ['', 'left'])[1];
			if(alop) data = data.replace(ntr, ntr = ntr.replace(alop[0], ''));
			
			var ts = '', trs = '';
			
			var wiop, width = ((wiop = (fulloptions.match(/&lt;table\s*width=((\d+)(px|%|))&gt;/))) || ['', ''])[1];
			if(wiop) {
				data = data.replace(ntr, ntr = ntr.replace(wiop[0], ''));
				trs += 'width: ' + width + '; ';
			}
			
			var clop, color = ((clop = (fulloptions.match(/&lt;table\s*color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
			if(clop) {
				data = data.replace(ntr, ntr = ntr.replace(clop[0], ''));
				trs += 'color: ' + color + '; ';
			}
			
			var bgop, bgcolor = ((bgop = (fulloptions.match(/&lt;table\s*bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
			if(bgop) {
				data = data.replace(ntr, ntr = ntr.replace(bgop[0], ''));
				trs += 'background-color: ' + bgcolor + '; ';
			}
			
			var brop, border = ((brop = (fulloptions.match(/&lt;table\s*bordercolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
			if(brop) {
				data = data.replace(ntr, ntr = ntr.replace(brop[0], ''));
				trs += 'border: 2px solid ' + border + '; ';
			}

			if(trs) ts = ' style="' + trs + '"';			
			
			data = data.replace(tr[0], '<div class="wiki-table-wrap table-' + align + '"><table class=wiki-table' + ts + '><caption>' + tr[2] + '</caption><tbody>\n' + ntr);
			datarows = data.split('\n');
		}
		
		// 셀 꾸미기
		for(let _tr of (data.match(/^<tr>(((?!<\/tr>).)*)<\/tr>$/gim) || [])) {
			var tr = _tr.match(/^<tr>(((?!<\/tr>).)*)<\/tr>$/im)[1], ntr = tr;
			
			for(let td of (tr.match(/<td>(((?!<\/td>).)*)<\/td>/g) || [])) {
				var text = (td.match(/<td>(((?!<\/td>).)*)<\/td>/) || ['', ''])[1], ot = text, ntd = td;
				var notx = text.replace(/^((&lt;([a-z0-9():\| -]+)((=(((?!&gt;).)+))*)&gt;)+)/i, '');
				var attr = '', tds = '', cs = '', rs = '';
				
				const fulloptions = (td.replace(/(&lt;table([a-z0-9 ]+)=(((?!&gt;).)+)&gt;)/g, '').match(/^<td>((&lt;([a-z0-9():\|\^ -]+)((=(((?!&gt;).)+))*)&gt;)+)/i) || ['', ''])[1];
				
				// 정렬1
				if(notx.startsWith(' ') && notx.endsWith(' ')) {
					tds += 'text-align: center; ';
				}
				else if(notx.startsWith(' ') && !notx.endsWith(' ')) {
					tds += 'text-align: right; ';
				}
				
				// 정렬2
				var align = (fulloptions.match(/&lt;([(]|[:]|[)])&gt;/) || ['', ''])[1];
				
				if(align) {
					tds += 'text-align: ' + (
						align == '(' ? (
							'left'
						) : (
							align == ')' ? (
								'right'
							) : (
								'center'
							)
						)
					) + '; ';
					ntd = ntd.replace(/&lt;([(]|[:]|[)])&gt;/, '');
				}
				
				// 너비
				var width = (fulloptions.match(/&lt;width=((\d+)(px|%|))&gt;/) || ['', ''])[1];
				if(width) {
					tds += 'width: ' + width + '; ';
					ntd = ntd.replace(/&lt;width=((\d+)(px|%|))&gt;/, '');
				}
				
				// 높이
				var height = (fulloptions.match(/&lt;height=((\d+)(px|%|))&gt;/) || ['', ''])[1];
				if(height) {
					tds += 'height: ' + height + '; ';
					ntd = ntd.replace(/&lt;height=((\d+)(px|%|))&gt;/, '');
				}
				
				// 가로 합치기
				var colspan = (fulloptions.match(/&lt;[-](\d+)&gt;/) || ['', ''])[1];
				if(colspan) {
					cs = colspan;
					ntd = ntd.replace(/&lt;[-](\d+)&gt;/, '');
				}
				
				// 세로 합치기 & 정렬
				var rowopt = (fulloptions.match(/&lt;([^]|[v]|)[|](\d+)&gt;/) || ['', '', '']);
				if(rowopt[2]) {
					rs = rowopt[2];
					switch(rowopt[1]) {
						case '^':
							tds += 'vertical-align: top; ';
							break; 
						case 'v':
							tds += 'vertical-align: bottom; ';
					}
					ntd = ntd.replace(/&lt;([^]|[v]|)[|](\d+)&gt;/, '');
				}
				
				// 셀 배경색
				var bgcolor = (fulloptions.match(/&lt;((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/) || ['', ''])[1];
				if(bgcolor) {
					tds += 'background-color: ' + bgcolor + '; ';
					ntd = ntd.replace(/&lt;((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/, '');
				}
				
				// 셀 배경색 2
				var bgcolor = (fulloptions.match(/&lt;bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/) || ['', ''])[1];
				if(bgcolor) {
					tds += 'background-color: ' + bgcolor + '; ';
					ntd = ntd.replace(/&lt;bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/, '');
				}
				
				// 글자색
				var color = (fulloptions.match(/&lt;color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/) || ['', ''])[1];
				if(color) {
					tds += 'color: ' + color + '; ';
					ntd = ntd.replace(/&lt;color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/, '');
				}
				
				if(tds) attr += ' style="' + tds + '"';
				if(cs)  attr += ' colspan=' + cs;
				if(rs)  attr += ' rowspan=' + rs;
				ntd = ntd.replace(/<td>/, '<td' + attr + '>');
				
				ntr = ntr.replace(td, ntd);
			}
			data = data.replace(tr, ntr)
		}
		
		return data
			.replace(/^\n/, '')
			.replace(/\n$/, '')
			.replace(/<tbody>\n/g, '<tbody>')
			.replace(/\n<\/tbody>/g, '<tbody>')
			.replace(/<\/tr>\n/g, '</tr>')
			.replace(/\n<tr>/g, '</tr>')
			.replace(/<\/tbody><tbody><\/tbody>/g, '</tbody>');
	}
	
	function multiply(a, b) {
		if(typeof a == 'number') return a * b;
		
		var ret = '';
		for(let i=0; i<b; i++) ret += a;
		return ret;
	}
	
	var footnotes = new Stack();
	var blocks    = new Stack();
	var fndisp    = {};
	
	var fnnum  = 1;
	var fnhtml = '';
	var cates  = '';
	var data   = content;
	var doc    = processTitle(title);
	
	data = html.escape(data);
	const xref = flags.includes('backlinkinit');
	
	// 역링크 초기화
	if(xref)
		await curs.execute("delete from backlink where title = ? and namespace = ?", [doc.title, doc.namespace]);
	const xrefl = [];
	
	if(!data.includes('\n') && data.includes('\r')) data = data.replace(/\r/g, '\n');
	if(data.includes('\n') && data.includes('\r')) data = data.replace(/\r\n/g, '\n');
	
	// 한 글자 리터럴
	for(let esc of (data.match(/(?:\\)(.)/g) || [])) {
		const match = data.match(/(?:\\)(.)/);
		data = data.replace(esc, '<spannw class=nowiki>' + match[1] + '</spannw>');
	}
	
	// 블록 (접기, CSS, ...)
	for(let block of (data.match(/([}][}][}]|[{][{][{](((?!}}}).)*)[}][}][}]|[{][{][{](((?!}}}).)*))/gim) || [])) {
		if(block == '}}}') {
			if(!blocks.size()) continue;
			var od = data;
			data = data.replace('}}}', blocks.top() + '');
			if(od == data) data = data.replace('\n}}}', blocks.top() + '\r');
			blocks.pop();
			continue;
		}
		
		const h = block.match(/{{{(((?!}}}).)*)/im)[1];
		if(h.match(/^[#][!]folding\s/)) {  // 접기
			blocks.push('</dd></dl>');
			const title = h.match(/^[#][!]folding\s(.*)$/)[1];
			data = data.replace('{{{' + h + '\n', '<dl class=wiki-folding><dt>' + title + '</dt><dd>');
		} else if(h.match(/^[#][!]wiki\s/)) {  // 위키문법 & CSS
			blocks.push('</div>');
			const style = (h.match(/style=&quot;(((?!&quot;).)*)&quot;/) || ['', '', ''])[1];
			data = data.replace('{{{' + h + '\n', '<div style="' + style.replace(/&amp;quot;/g, '&quot;') + '">');
		} else if(h.match(/^[#][!]html/) && !discussion) {  // HTML
			if(block.includes('}}}')) {
				var rb = block;
				rb = rb.replace('}}}', '</rawhtml></nowikiblock>');
				rb = rb.replace('{{{#!html', '<nowikiblock><rawhtml>');
				data = data.replace(block, rb);
			} else {
				blocks.push('</rawhtml></nowikiblock>');
				data = data.replace('{{{#!html', '<nowikiblock><rawhtml>');
			}
		} else {  // 리터럴
			if(!block.includes('}}}')) {  // 블록
				blocks.push('</pre></nowikiblock>');
				var od = data;
				data = data.replace('{{{\n', '<nowikiblock><pre>');
				if(od == data) data = data.replace('{{{', '<nowikiblock><pre>');
			}
		}
	}
	
	// #!html 문법
	var { document } = (new JSDOM(data.replace(/\n/g, '<br>'))).window;
	const whtags = ['br', 'hr', 'div', 'span', 'ul', 'a', 'b', 'strong', 'del', 's', 'ins', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'font', 'dl', 'dt', 'dd', 'label', 'sup', 'sub'];
	const whattr = {
		'*': ['style'],
		span: ['class'],
		a: ['href', 'class'],
		font: ['color', 'size', 'face'],
	};
	for(var item of document.querySelectorAll('rawhtml')) {
		item.innerHTML = item.textContent.replace(/\n/g, '<br>');
		for(var el of item.getElementsByTagName('*')) {
			if(whtags.includes(el.tagName.toLowerCase())) {
				for(var attr of el.attributes) {
					if(((whattr[el.tagName.toLowerCase()] || []).concat(whattr['*'])).includes(attr.name)) {
						if(attr.name == 'style') {
							
						}
					} else el.removeAttribute(attr.name);
				}
				switch(el.tagName.toLowerCase()) {
					case 'a':
						el.setAttribute('target', '_blank');
						if(minor >= 20) {
							el.className += (el.className ? ' ' : '') + 'wiki-link-external';
						}
				}
			} else el.outerHTML = el.innerHTML;
		} item.outerHTML = item.innerHTML;
	}
	
	// 리터럴 (제대로 된 방법은 아니겠지만 이게 젤 쉬었어...)
	var nwblocks = {};
	for(var item of document.querySelectorAll('nowikiblock')) {
		const key = rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+=/', 2048);
		nwblocks[key] = item.innerHTML;
		item.outerHTML = key;
	}
	data = document.querySelector('body').innerHTML.replace(/<br>/g, '\n');
	
	// 인용문
	function parseQuotes(data) {
		const rows = data.split(/\n/);
		const rl = rows.length;
		var inquote = 0;
		for(let i=0; i<rl; i++) {
			let row = rows[i];
			if(!row.startsWith('&gt;')) {
				if(inquote) {
					row = '</blockquotewikiquote>\n' + row;
					inquote = 0;
				}
				rows[i] = row;
				continue;
			}
			if(row.startsWith('&gt;') && !inquote) {
				row = row.replace(/^[&]gt;(\s*)/, '<blockquotewikiquote class=wiki-quote>\n');
				inquote = 1;
			} else {
				row = row.replace(/^[&]gt;(\s*)/, '');
				inquote = 1;
			}
			rows[i] = row;
		}
		if(inquote) rows.push('</blockquotewikiquote>');
		return rows.join('\n');
	} do {
		data = parseQuotes(data);
	} while(data.match(/^[&]gt;/gim));
	
	// 수평줄
	data = data.replace(/^[-]{4,9}$/gim, '<hr />');
	data = data.replace(/(\n{0,1})<hr \/>(\n{0,1})/g, '<hr />');

	// 인용문 마지막 처리
	data = data.replace(/<blockquotewikiquote\sclass[=]wiki[-]quote>\n/g, '<blockquote class=wiki-quote>');
	data = data.replace(/\n<\/blockquotewikiquote>/g, '</blockquote>');
	
	// 목록
	function parseList(data) {
		const rows = ('\n' + data + '\n').split(/\n/);
		const rl = rows.length;
		var inlist = 0;
		for(let i=0; i<rl; i++) {
			let row = rows[i];
			if(!row.match(/^(\s+)[*]/) && !row.startsWith(' ')) {
				if(inlist) {
					row = '</liwikilist></ulwikilist>\n' + row;
					inlist = 0;
				}
				rows[i] = row;
				continue;
			}
			if(row.match(/^(\s{2,})[*]/)) {
				rows[i] = row.replace(/^(\s{2,})[*]/, ' *');
				continue;
			}
			if(row.startsWith(' *') && !inlist) {
				row = row.replace(/^\s[*](\s*)/, '<ulwikilist class=wiki-list>\n<liwikilist>\n');
				inlist = 1;
			} else {
				row = row.replace(/^\s/, '');
				row = row.replace(/^[*](\s*)/, '</liwikilist><liwikilist>\n');
				inlist = 1;
			}
			rows[i] = row;
		}
		rows.splice(0, 1);
		rows.pop();
		if(inlist) rows.push('</liwikilist>\n</ulwikilist>');
		return rows.join('\n');
	} do {
		data = parseList(data);
	} while(data.match(/^\s[*]/gim));
	data = data.replace(/<ulwikilist\sclass[=]wiki[-]list>\n/g, '<ul class=wiki-list>');
	data = data.replace(/\n<\/ulwikilist>/g, '</ul>');
	data = data.replace(/<liwikilist>\n/g, '<li>');
	data = data.replace(/\n<\/liwikilist>/g, '</li>');
	data = data.replace(/<\/liwikilist>\n<\/ulwikilist>/g, '</ul>');
	data = data.replace(/<ulwikilist\sclass[=]wiki[-]list>/g, '<ul class=wiki-list>');
	data = data.replace(/<\/ulwikilist>/g, '</ul>');
	data = data.replace(/<liwikilist>/g, '<li>');
	data = data.replace(/<\/liwikilist>/g, '</li>');
	
	// 들여쓰기
	function parseIndent(data) {
		const rows = data.split(/\n/);
		const rl = rows.length;
		var inindent = 0;
		for(let i=0; i<rl; i++) {
			let row = rows[i];
			if(!row.startsWith(' ') || row.replace(/^\s/, '').startsWith('*')) {
				if(inindent) {
					row = '</divwikiindent>\n' + row;
					inindent = 0;
				}
				rows[i] = row;
				continue;
			}
			if(row.startsWith(' ') && !inindent) {
				row = row.replace(/^\s/, '<divwikiindent class=wiki-indent>\n');
				inindent = 1;
			} else {
				row = row.replace(/^\s/, '');
				inindent = 1;
			}
			rows[i] = row;
		}
		if(inindent) rows.push('</divwikiindent>');
		return rows.join('\n');
	} do {
		data = parseIndent(data);
	} while((data.match(/^(\s+)/gim) || []).filter(item => item.replace(/\n/g, '') && item).length);
	data = data.replace(/<divwikiindent\sclass[=]wiki[-]indent>\n/g, '<div class=wiki-indent>');
	data = data.replace(/\n<\/divwikiindent>/g, '</div>');
	
	// 링크
	for(let link of (data.match(/\[\[(((?!\]\]).)+)\]\]/g) || [])) {
		var _dest = link.match(/\[\[(((?!\]\]).)+)\]\]/)[1].replace(/[&]amp[;]/g, '&').replace(/[&]lt[;]/g, '<').replace(/[&]gt[;]/g, '>').replace(/[&]quot[;]/g, '"');
		var dest, disp;
		if(_dest.includes('|')) {
			dest = _dest.split('|')[0];
			disp = _dest.split('|')[1];
		} else dest = disp = _dest;
		
		const external = dest.startsWith('http://') || dest.startsWith('https://') || dest.startsWith('ftp://');
		
		const dd = dest.split('#');
		if(!external) {
			if(!dd[0] && dd[1]) dd[0] = title;
			if(dest == disp) disp = dd[0];
			dest = dd[0];
		}
		
		var ddata = await curs.execute("select content from documents where title = ? and namespace = ?", [processTitle(dest).title, processTitle(dest).namespace]);
		const notexist = !ddata.length ? ' not-exist' : '';
		
		if(dest.startsWith('분류:') && !discussion) {  // 분류
			cates += `<li><a href="/w/${encodeURIComponent(dest)}" class="wiki-link-internal${notexist}">${html.escape(dest.replace('분류:', ''))}</a></li>`;
			if(xref) {
				curs.execute("insert into backlink (title, namespace, link, linkns, type) values (?, ?, ?, ?, 'category')", [doc.title, doc.namespace, dest.replace('분류:', ''), '분류']);
			}
			data = data.replace(link, '');
			continue;
		} if(dest.startsWith('파일:') && !discussion && !notexist) {  // 그림
			// 나중에 구현할랭
			data = data.replace(link, '');
			continue;
		}
		
		dest = dest.replace(/^([:]|\s)((분류|파일)[:])/, '$2');
		
		const sl = dest == title ? ' self-link' : '';
		data = data.replace(link, '<a ' + (external ? 'target=_blank ' : '') + 'class="wiki-link-' + (external ? 'external' : 'internal') + '' + sl + notexist + '" href="' + (external ? '' : '/w/') + '' + (external ? html.escape : encodeURIComponent)(dest) + (!external && dd[1] ? html.escape('#' + dd[1]) : '') + '">' + disp + '</a>');
		
		// 역링크
		if(xref && !external) {
			var linkdoc = processTitle(dest);
			if(!xrefl.includes(linkdoc.title + '\n' + linkdoc.namespace)) {
				xrefl.push(linkdoc.title + '\n' + linkdoc.namespace);
				curs.execute("insert into backlink (title, namespace, link, linkns, type, exist) values (?, ?, ?, ?, 'link', ?)", [doc.title, doc.namespace, linkdoc.title, linkdoc.namespace, notexist ? '0' : '1']);
			}
		}
	}
	
	blocks = new Stack;
	// 삼중중괄호 서식
	for(let block of (data.match(/([}][}][}]|[{][{][{](((?!}}}).)*)[}][}][}]|[{][{][{](((?!}}}).)*))/gim) || [])) {
		if(block == '}}}') {
			if(!blocks.size()) continue;
			var od = data;
			data = data.replace('}}}', blocks.top() + '');
			if(od == data) data = data.replace('\n}}}', blocks.top() + '\r');
			blocks.pop();
			continue;
		}
		
		const h = block.match(/{{{(((?!}}}).)*)/im)[1];
		if(h.match(/^[#][!]folding\s/)) {
		} else if(h.match(/^[#][!]wiki\s/)) {
		} else if(h.match(/^[#][!]html/) && !discussion) {
		} else if(block.includes('}}}')) {  // 한 줄
			const color = h.match(/^[#]([A-Za-z0-9]+)\s/);
			const size = h.match(/^([+]|[-])([1-5])\s/);
			if(color) {  // 글자 색
				const htmlcolor = color[1].match(/^([A-Fa-f0-9]{3,6})$/);
				var col = color[1];
				if(htmlcolor) {
					col = '#' + htmlcolor[1];
				}
				data = data.replace('}}}', '</font>');
				data = data.replace('{{{' + color[0], '<font color=' + col + '>');
			} else if(size) {  // 글자 크기
				data = data.replace('}}}', '</span>');
				data = data.replace('{{{' + size[0], '<span class="wiki-size size-' + (size[1] == '+' ? 'up' : 'down') + '-' + size[2] + '">');
			} else {
				blocks.push('</code></nowikiblock>');
				data = data.replace('{{{', '<nowikiblock><code>');
			}
		}
	}
	for(var item of document.querySelectorAll('nowikiblock')) {
		const key = rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+=/', 2048);
		nwblocks[key] = item.innerHTML;
		item.outerHTML = key;
	}
	
	// 토론 앵커
	if(discussion) for(let res of (data.match(/(\s|^)[#](\d+)(\s|$)/g) || [])) {
		const reg = res.match(/(\s|^)[#](\d+)(\s|$)/);
		data = data.replace(res, reg[1] + '<a class=wiki-self-link href="#' + reg[2] + '">#' + reg[2] + '</a>' + reg[3]);
	}
	
	// 문단
	data = '<div>\r' + data;
	var maxszz = 2;
	var headnum = [, 0, 0, 0, 0, 0, 0];
	var tochtml = '<div class=wiki-macro-toc id=toc>';
	var cnum = 2;
	var sec = 1;
	for(let i=6; i; i--) {
		if(data.match(RegExp(`^${multiply('=', i)}\\s.*\\s${multiply('=', i)}$`, 'm')))
			maxszz = i;
	}
	for(let heading of (data.match(/^(=\s(((?!=).)*)\s=|==\s(((?!==).)*)\s==|===\s(((?!===).)*)\s===|====\s(((?!====).)*)\s====|=====\s(((?!=====).)*)\s=====|======\s(((?!======).)*)\s======)$/gm) || [])) {
		const hr = {};
		for(let i=1; i<=6; i++) {
			hr[i] = heading.match(RegExp(`^${multiply('=', i)}\\s(((?!${multiply('=', i)}).)*)\\s${multiply('=', i)}$`, 'm'));
		} for(let i=6; i; i--) if(hr[i]) {
			if(i < cnum) for(let j=i+1; j<=6; j++) headnum[j] = 0;
			cnum = i;
			const title = hr[i][1];
			var snum = '';
			for(let j=i; j; j--) if(maxszz == j) {
				for(let k=j; k<i; k++)
					snum += headnum[k] + '.';
				snum += ++headnum[i];
				break;
			}
			var edlnk = '';
			if(!discussion)
				edlnk = `<span class=wiki-edit-section><a href="/edit/${encodeURIComponent(doc + '')}?section=${sec++}" rel=nofollow>[편집]</a></span>`;
			data = data.replace(heading, '</div><h' + i + ' class=wiki-heading><a href="#toc" id="s-' + snum + '">' + snum + '.</a> ' + title + edlnk + '</h' + i + '><div class=wiki-heading-content>');
			var mt = i;
			tochtml += multiply('<div class=toc-indent>', mt - maxszz + 1) + '<span class=toc-item><a href="#s-' + snum + '">' + snum + '</a>. ' + title + '</span>' + multiply('</div>', mt - maxszz + 1);
			break;
		}
	}
	tochtml += '</div>';
	data += '</div>';
	data = data.replace(/<div class=wiki[-]heading[-]content>\n/g, '<div class=wiki-heading-content>');
	
	// 글자 꾸미기
	if(minor < 8) data = data.replace(/['][']['][']['](((?![']['][']['][']).)+)[']['][']['][']/g, '<strong><i>$1</i></strong>');
	data = data.replace(/['][']['](((?![']['][']).)+)[']['][']/g, '<strong>$1</strong>');
	data = data.replace(/[']['](((?!['][']).)+)['][']/g, '<i>$1</i>');
	data = data.replace(/~~(((?!~~).)+)~~/g, '<del>$1</del>');
	data = data.replace(/--(((?!--).)+)--/g, '<del>$1</del>');
	data = data.replace(/__(((?!__).)+)__/g, '<u>$1</u>');
	data = data.replace(/[,][,](((?![,][,]).)+)[,][,]/g, '<sub>$1</sub>');
	data = data.replace(/[^][^](((?![^][^]).)+)[^][^]/g, '<sup>$1</sup>');
	
	// 글상자
	if(minor < 7 || (minor == 7 && revision <= 4))
		data = data.replace(/{{[|](((?![|]}}).)+)[|]}}/g, '<div class=wiki-textbox>$1</div>');
	
	// 매크로
	data = data.replace(/\[br\]/gi, '&lt;br&gt;');
	data = data.replace(/\[(date|datetime)\]/gi, generateTime(toDate(getTime()), timeFormat));
	data = data.replace(/\[(tableofcontents|목차)\]/gi, tochtml);
	
	// 각주 (1)
	const fnrows = data.split('\n');
	const frl = fnrows.length;
	for(let fi=0; fi<frl; fi++) {
		let row = fnrows[fi];
		for(let fn of (row.match(/(\[[*](((?!\s).)*)\s|\])/g) || [])) {
			if(fn == ']') {
				if(!footnotes.size()) continue;
				row = row.replace(']', '</fnstub>');
				footnotes.pop();
				fnrows[fi] = row;
				continue;
			}
			if(!row.includes(']')) continue;
			const reg = fn.match(/(\[[*](((?!\s).)*)\s|\])/);
			row = row.replace(fn, '<fnstub' + (reg[2] ? (' name="' + reg[2] + '"') : '') + '>');
			footnotes.push('[');
			fnrows[fi] = row;
		}
	} data = fnrows.join('\n');
	
	// 표렌더
	var { document } = (new JSDOM(data.replace(/\n/g, '<br>'))).window;
	function ft(el) {
		const blks = el.querySelectorAll('dl.wiki-folding > dd, div.wiki-style, blockquote.wiki-quote');
		if(blks.length) for(let el2 of blks) ft(el2);
		el = (el == document ? el.querySelector('body') : el);
		const ihtml = el.innerHTML;
		el.innerHTML = parseTable(ihtml.replace(/<br>/g, '\n')).replace(/\n/g, '<br>');
	} ft(document);
	
	// 각주 (2)
	function ff(el) {
		const blks = el.querySelectorAll('fnstub');
		if(blks.length) for(let el2 of blks) ff(el2);
		el = (el == document ? el.querySelector('body') : el);
		el = el.querySelector('fnstub');
		if(!el) return;
		const span = document.createElement('span');
		span.innerHTML = el.innerHTML;
		el.outerHTML = `<a ${el.getAttribute('name') ? 'name="' + el.getAttribute('name') + '" ' : ''}class=wiki-fn-content title="${span.textContent}">${el.innerHTML}</a>`;
	} ff(document);
	
	// 각주(3)
	for(let item of document.querySelectorAll('a.wiki-fn-content')) {
		const id = item.getAttribute('name') || fnnum;
		const numid = fnnum;
		item.removeAttribute('name');
		item.setAttribute('href', '#fn-' + id);
		fnhtml += `<span class=footnote-list><span id=fn-${id} class=target></span><a href=#rfn-${numid}>[${id}]</a> ${item.innerHTML}</span>`;
		item.innerHTML = `<span id=rfn-${numid}>[${id}]`;
		fnnum++;
	}
	
	if(fnhtml) fnhtml = '<div class=wiki-macro-footnote>' + fnhtml + '</div>';
	
	// 한 글자 리터럴 처리
	for(let item of document.querySelectorAll('spannw.nowiki')) {
		item.outerHTML = item.innerHTML;
	}
	
	data = document.querySelector('body').innerHTML;
	data = data.replace(/\r/g, '');
	data = data.replace(/<br>/g, '\n');
	
	if(!discussion) data = '<div class=wiki-inner-content>' + data + '</div>';
	
	data = data.replace(/<div>\n/, '<div>').replace(/\n<\/div><h(\d)/g, '</div><h$1').replace(/\n/g, '<br />');
	
	// 사용자 문서 틀
	if(!discussion && !flags.includes('preview') && doc.namespace == '사용자') {
		const blockdata = await userblocked(doc.title);
		if(blockdata) {
			data = `
				<div style="border-width: 5px 1px 1px; border-style: solid; border-color: red gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'blue\';" onmouseout="this.style.borderTopColor=\'red\';">
					<span style="font-size:14pt">이 사용자는 차단된 사용자입니다.</span><br /><br />
					이 사용자는 ${generateTime(toDate(blockdata.date), timeFormat)}에 ${blockdata.expiration == '0' ? '영구적으로' : (generateTime(toDate(blockdata.expiration), timeFormat) + '까지')} 차단되었습니다.<br />
					차단 사유: ${html.escape(blockdata.note)}
				</div>
			` + data;
		}
		if(doc.namespace == '사용자') {
			if(!(minor > 0 || (minor == 0 && revision >= 20))) {
				if(getperm('tribune', doc.title)) {
					data = `
						<div style="border-width: 5px 1px 1px; border-style: solid; border-color: orange gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'red\';" onmouseout="this.style.borderTopColor=\'orange\';">
							<span style="font-size:14pt">이 사용자는 ${config.getString('wiki.site_name', '더 시드')}의 호민관 입니다.</span>
						</div>
					` + data;
				} if(getperm('arbiter', doc.title)) {
					data = `
						<div style="border-width: 5px 1px 1px; border-style: solid; border-color: orange gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'red\';" onmouseout="this.style.borderTopColor=\'orange\';">
							<span style="font-size:14pt">이 사용자는 ${config.getString('wiki.site_name', '더 시드')}의 중재자 입니다.</span>
						</div>
					` + data;
				} if(getperm('admin', doc.title)) {
					data = `
						<div style="border-width: 5px 1px 1px; border-style: solid; border-color: orange gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'red\';" onmouseout="this.style.borderTopColor=\'orange\';">
							<span style="font-size:14pt">이 사용자는 ${config.getString('wiki.site_name', '더 시드')}의 관리자 입니다.</span>
						</div>
					` + data;
				} if(getperm('developer', doc.title)) {
					data = `
						<div style="border-width: 5px 1px 1px; border-style: solid; border-color: purple gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'red\';" onmouseout="this.style.borderTopColor=\'purple\';">
							<span style="font-size:14pt">이 사용자는 ${config.getString('wiki.site_name', '더 시드')}의 개발자 입니다.</span>
						</div>
					` + data;
				}
			} else if(getperm('admin', doc.title)) {
				data = `
					<div style="border-width: 5px 1px 1px; border-style: solid; border-color: orange gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'red\';" onmouseout="this.style.borderTopColor=\'orange\';">
						<span style="font-size:14pt">이 사용자는 특수 권한을 가지고 있습니다.</span>
					</div>
				` + data;
			}
		}
	}
	
	// 각주
	if(fnhtml) data += fnhtml;
	
	if(!discussion && doc.namespace == '분류') {
		let content = '';
		
		const dbdata = await curs.execute("select title, namespace, type from backlink where type = 'category' and link = ? and linkns = ?", [doc.title, doc.namespace]);
		const _nslist = dbdata.map(item => item.namespace);
		const nslistd = fetchNamespaces().filter(item => _nslist.includes(item));
		const nslist = (nslistd.includes('분류') ? ['분류'] : []).concat(nslistd.filter(item => item != '분류'));
		let nsopt = '';
		for(let ns of nslist) {
			const data = dbdata.filter(item => item.namespace == ns);
			let cnt = data.length;
			if(!cnt) continue;
			
			let indexes = {};
			const hj = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
			const ha = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하', String.fromCharCode(55204)];
			for(let item of data) {
				if(!item) continue;
				let chk = 0;
				for(let i=0; i<ha.length-1; i++) {
					const fchr = item.title[0].toUpperCase().charCodeAt(0);
					
					if((hj[i].includes(item.title[0])) || (fchr >= ha[i].charCodeAt(0) && fchr < ha[i+1].charCodeAt(0))) {
						if(!indexes[hj[i]]) indexes[hj[i]] = [];
						indexes[hj[i]].push(item);
						chk = 1;
						break;
					}
				} if(!chk) {
					if(!indexes[item.title[0].toUpperCase()]) indexes[item.title[0].toUpperCase()] = [];
					indexes[item.title[0].toUpperCase()].push(item);
				}
			}
			
			content += `
				<h2 class=wiki-heading>${ns == '분류' ? '하위 분류' : ('"' + doc.title + '" 분류에 속하는 ' + ns)}</h2>
				<div>전체 ${cnt}개 문서</div>
			`;
			
			let listc = '<div class=wiki-category-container>';
			let list = '';
			for(let idx of Object.keys(indexes).sort()) {
				list += `
					<div>
						<h3 class=wiki-heading>${html.escape(idx)}</h3>
						<ul class=wiki-list>
				`;
				for(let item of indexes[idx])
					list += `
						<li>
							<a href="/w/${encodeURIComponent(totitle(item.title, item.namespace))}">${html.escape(item.title)}</a>
						</li>
					`;
				list += '</ul></div>';
			}
			listc += list + '</div>';
			content += listc;
		}
		
		data += content;
	}
	
	if(!discussion) data = '<div class="wiki-content clearfix">' + data + '</div>';
	
	// 분류
	if(cates) {
		data = `
			<div class=wiki-category>
				<h2>분류</h2>
				<ul>${cates}</ul>
			</div>
		` + data;
	} else if(doc.namespace != '사용자' && !discussion && !flags.includes('preview')) {
		data = alertBalloon('이 문서는 분류가 되어 있지 않습니다. <a href="/w/분류:분류">분류:분류</a>에서 적절한 분류를 찾아 문서를 분류해주세요!', 'info', true) + data;
	}
	
	// 리터럴블록 복구
	for(var item in nwblocks) {
		data = data.replace(item, nwblocks[item]);
	}
	
	return data;
}

// 위키 설정
const config = {
	getString(str, def = '') {
		if(wikiconfig[str] === undefined) {
			curs.execute("insert into config (key, value) values (?, ?)", [str, def]);
			wikiconfig[str] = def;
			return def;
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
	if(!perms.includes(perm)) return false;
	if(!permlist[username]) permlist[username] = [];
	return permlist[username].includes(perm);
}

// 내 권한 보유여부
function hasperm(req, perm) {
	if(!islogin(req)) return false;
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
				const udd = await curs.execute("select tnum, time from threads where namespace = '사용자' and title = ? and status = 'normal'", [req.session.username]);
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
	suspend_account: (minor >= 18 ? undefined : '차단된 사용자'),
	blocked_ipacl: (minor >= 18 ? undefined : '차단된 아이피'),
	document_contributor: '해당 문서 기여자',
	contributor: (minor >= 7 ? '위키 기여자' : undefined),
	match_username_and_document_title: ((minor >= 6 || (minor == 5 && revision >= 9)) ? '문서 제목과 사용자 이름이 일치' : undefined),
};

// 차단된 사용자 제외 ACL 권한
const exaclperms = [
	'member', 'member_signup_15days_ago', 'document_contributor', 'contributor',
];

// 오류메시지
function fetchErrorString(code, ...params) {
	const codes = {
		permission: '권한이 부족합니다.',
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
	};
	
	return codes[code] || code;
}

function fetchValue(code) {
	const codes = {
		username: '사용자 이름',
		ip: 'IP 주소',
		password: '암호',
		password_check: '암호 확인',
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
	if(type == 'error') {
		obj.toString = function() {
			return this.msg;
		};
	}
	return obj;
}

// 오류화면 표시
async function showError(req, code, ...params) {
	return await render(req, minor >= 13 ? '오류' : '문제가 발생했습니다!', `${minor >= 13 ? '<div>' : '<h2>'}${typeof code == 'object' ? (code.msg || fetchErrorString(code.code, code.tag)) : fetchErrorString(code, ...params)}${minor >= 13 ? '</div>' : '</h2>'}`, {}, _, _, 'error');
}

// 닉네임/아이피 파싱
function ip_pas(ip = '', ismember = '', nobold) {
	if(ismember == 'author') {
		return `${nobold ? '' : '<strong>'}<a href="/w/사용자:${encodeURIComponent(ip)}">${html.escape(ip)}</a>${nobold ? '' : '</strong>'}`;
	} else {
		return `<a href="/contribution/ip/${encodeURIComponent(ip)}/document">${html.escape(ip)}</a>`;
	}
}

// 아이피 차단 여부
async function ipblocked(ip) {
	await curs.execute("delete from ipacl where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	var ipacl = await curs.execute("select cidr, al, expiration, note from ipacl order by cidr asc limit 50");
	var msg = '';
	
	for(let row of ipacl) {
		if(ipRangeCheck(ip, row.cidr)) {
			if(row.al == '1') msg = '해당 IP는 반달 행위가 자주 발생하는 공용 아이피이므로 로그인이 필요합니다.<br />(이 메세지는 ' + (minor < 11 ? '본인이 반달을 했다기 보다는 해당 통신사를 쓰는' : '같은 인터넷 공급업체를 사용하는') + ' 다른 누군가가 해서 발생했을 확률이 높습니다.)<br />차단 만료일 : ' + (row.expiration == '0' ? '무기한' : new Date(Number(row.expiration))) + '<br />차단 사유 : ' + row.note;
			else msg = 'IP가 차단되었습니다.' + (minor < 6 ? ' <a href="https://board.namu.wiki/whyiblocked">게시판</a>으로 문의해주세요.' : '') + '<br />차단 만료일 : ' + (row.expiration == '0' ? '무기한' : new Date(Number(row.expiration))) + '<br />차단 사유 : ' + row.note;
			return msg;
		}
	} return false;
}

// 계정 차단 여부
async function userblocked(username) {
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

// ACL 검사
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
						if(minor < 18) for(let row of ipacl) {
							if(ipRangeCheck(ip_check(req, 1), row.cidr) && !(islogin(req) && row.al == '1')) {
								ret = 1;
								if(row.al == '1') msg = '해당 IP는 반달 행위가 자주 발생하는 공용 아이피이므로 로그인이 필요합니다.<br />(이 메세지는 본인이 반달을 했다기 보다는 해당 통신사를 쓰는 다른 누군가가 해서 발생했을 확률이 높습니다.)<br />차단 만료일 : ' + (row.expiration == '0' ? '무기한' : new Date(Number(row.expiration))) + '<br />차단 사유 : ' + row.note;
								else msg = 'IP가 차단되었습니다.' + (minor < 6 ? ' <a href="https://board.namu.wiki/whyiblocked">게시판</a>으로 문의해주세요.' : '') + '<br />차단 만료일 : ' + (row.expiration == '0' ? '무기한' : new Date(Number(row.expiration))) + '<br />차단 사유 : ' + row.note;
								break;
							}
						}
					} break; case 'suspend_account': {
						if(!islogin(req)) break;
						if(minor >= 18) break;
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
						if(minor < 7) break;
						
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
						if(minor >= 11) {
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
					} else if(row.action == 'gotons' && minor >= 18) {
						r = await f(ns);
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
						r.m1 = 'member:' + aclperms[row.condition] || row.condition;
						break;
					} else if(row.action == 'gotons' && minor >= 18) {
						r = await f(ns);
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
						r.m1 = 'ip:' + aclperms[row.condition] || row.condition;
						break;
					} else if(row.action == 'gotons' && minor >= 18) {
						r = await f(ns);
						break;
					} else break;
				} else if(row.action == 'allow') r.m2 += 'ip:' + row.condition + ' OR ';
			} else if(row.conditiontype == 'geoip' && (minor >= 6 || (minor == 5 && revision >= 9))) {
				if(geoip.lookup(ip_check(req, 1)).country == row.condition) {
					if(row.action == 'allow') {
						r.ret = 1;
						break;
					} else if(row.action == 'deny') {
						r.ret = 0;
						r.m1 = 'geoip:' + aclperms[row.condition] || row.condition;
						break;
					} else if(row.action == 'gotons' && minor >= 18) {
						r = await f(ns);
						break;
					} else break;
				} else if(row.action == 'allow') r.m2 += 'geoip:' + row.condition + ' OR ';
			} else if(row.conditiontype == 'aclgroup' && minor >= 18) {
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
					} else if(row.action == 'gotons' && minor >= 18) {
						r = await f(ns);
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
		r.msg = `${minor >= 7 && !r.m1 && !r.m2 ? 'ACL에 허용 규칙이 없기 때문에 ' : ''}${r.m1 && minor >= 7 ? r.m1 + '이기 때문에 ' : ''}${acltype[type]} 권한이 부족합니다.${r.m2 && minor >= 7 ? ' ' + r.m2.replace(/\sOR\s$/, '') + '(이)여야 합니다. ' : ''}`;
		if(minor >= 6 || (minor == 5 && revision >= 9)) r.msg += ` 해당 문서의 <a href="/acl/${encodeURIComponent(totitle(title, namespace) + '')}">ACL 탭</a>을 확인하시기 바랍니다.`;
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
		content = content.replace(/[&]/gi, '&amp;');
		content = content.replace(/["]/gi, '&quot;');
		content = content.replace(/[<]/gi, '&lt;');
		content = content.replace(/[>]/gi, '&gt;');
		
		return content;
	}
};

function cacheSkinList() {
    skinList = [];
	skincfgs = {};
    for(var dir of fs.readdirSync('./skins', { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name)) {
        skinList.push(dir);
		skincfgs[dir] = require('./skins/' + dir + '/config.json');
    }
}
cacheSkinList();

// HTTPS 리다이렉트
wiki.use(function(req, res, next) {
    if(!hostconfig.debug && hostconfig.force_https && req.headers.host && !req.secure && !req.connection.encrypted && req.protocol != 'https') {
		return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
});

// 자동 로그인 & 차단 로그아웃
wiki.all('*', async function(req, res, next) {
	if(!(major > 4 || (major == 4 && minor >= 1))) {
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
		const d = await curs.execute("select username, token from autologin_tokens where token = ?", [autologin]);
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

wiki.get(/^\/License$/, async(req, res) => {
	return res.send(await render(req, '라이선스', `
		<p>모방 타겟 the seed 버전: v${major}.${minor}.${revision}</p>
		
		<div class=wiki-content>
	` + await readFile('./skins/' + getSkin(req) + '/license.html') + '</div>', {}, _, _, 'license'));
});

function redirectToFrontPage(req, res) {
	res.redirect('/w/' + (config.getString('wiki.front_page', 'FrontPage')));
}

wiki.get(/^\/w$/, redirectToFrontPage);
wiki.get(/^\/w\/$/, redirectToFrontPage);
wiki.get('/', redirectToFrontPage);

wiki.get(/^\/sidebar[.]json$/, (req, res) => {
	curs.execute("select time, title, namespace from history where namespace = '문서' order by cast(time as integer) desc limit 1000")
		.then(async dbdata => {
			var ret = [], cnt = 0, used = [];
			for(var item of dbdata) {
				if(used.includes(item.title)) continue;
				used.push(item.title);
				
				const del = (await curs.execute("select title from documents where title = ? and namespace = '문서'", [item.title])).length;
				ret.push({
					document: totitle(item.title, '문서') + '',
					status: (del ? 'normal' : 'delete'),
					date: Math.floor(Number(item.time) / 1000),
				});
				cnt++;
				if(cnt > 20) break;
			}
			res.json(ret);
		})
		.catch(e => {
			print(e.stack);
			res.json('[]');
		});
});

wiki.get(/^\/api\/sidebar$/, async(req, res) => {
	var cret = [], dret = [], cnt, used;
	var dbdata = await curs.execute("select time, title, namespace from history order by cast(time as integer) desc limit 1000");
	cnt = 0, used = []
	for(var item of dbdata) {
		if(used.includes(item.title)) continue;
		used.push(item.title);
		const del = (await curs.execute("select title from documents where title = ? and namespace = ?", [item.title, item.namespace])).length;
		cret.push({
			document: totitle(item.title, item.namespace) + '',
			status: (del ? 'normal' : 'delete'),
			date: Math.floor(Number(item.time) / 1000),
		});
		cnt++;
		if(cnt > 10) break;
	}
	var dbdata = await curs.execute("select time, num, topic, title, namespace from threads order by cast(time as integer) desc limit 1000");
	cnt = 0, used = []
	for(var item of dbdata) {
		if(used.includes(item.num)) continue;
		used.push(item.num);
		dret.push({
			document: totitle(item.title, item.namespace) + '',
			topic: item.topic,
			date: Math.floor(Number(item.time) / 1000),
			id: Number(item.num),
		});
		cnt++;
		if(cnt > 10) break;
	}
	res.json({
		document: cret,
		discuss: dret,
	});
});

wiki.get(/^\/complete\/(.*)/, (req, res) => {
	// 초성검색은 나중에
	const query = req.params[0];
	const doc = processTitle(query);
	curs.execute("select title, namespace from documents where lower(title) like ? || '%' and lower(namespace) = ? limit 10", [doc.title.toLowerCase(), doc.namespace.toLowerCase()])
		.then(data => {
			var ret = [];
			for(var i of data) {
				ret.push(totitle(i.title, i.namespace) + '');
			}
			return res.json(ret);
		})
		.catch(e => {
			print(e.stack);
			return res.status(500).json([]);
		});
});

wiki.get(/^\/go\/(.*)/, (req, res) => {
	const query = req.params[0];
	const doc = processTitle(query);
	curs.execute("select title, namespace from documents where lower(title) = ? and lower(namespace) = ?", [doc.title.toLowerCase(), doc.namespace.toLowerCase()])
		.then(data => {
			if(data.length) return res.redirect('/w/' + totitle(data[0].title, data[0].namespace));
			else return res.redirect('/search/' + query);
		})
		.catch(e => {
			return res.redirect('/search/' + query);
		});
});

wiki.get(/^\/search\/(.*)/, async(req, res) => {
	const query = req.params[0];
	
	var content = `
		<div class="alert alert-info search-help" role=alert>
			<div class=pull-left>
				<span class="icon ion-chevron-right"></span>&nbsp;
				찾는 문서가 없나요? 문서로 바로 갈 수 있습니다.
			</div>
			
			<div class=pull-right>
				<a class="btn btn-secondary btn-sm" href="/w/${encodeURIComponent(query)}">'${html.escape(query)}' 문서로 가기</a>
			</div>
			
			<div style="clear: both;"></div>
		</div>
	`;
	
	var st = new Date().getTime() / 1000;
	
	if(!query.replace(/^(\s+)/, '').replace(/(\s+)$/, '')) {
		res.send(await render(req, '"' + query + '" 검색 결과', content, {}, _, _, 'search'));
	}
	
	http.request({
		host: hostconfig.search_host,
		port: hostconfig.search_port,
		path: '/search/' + encodeURIComponent(query) + '?page=' + (req.query['page'] || '1'),
	}, async rr => {
		var d = '';

		rr.on('data', function(chunk) {
			d += chunk;
		});

		rr.on('end', async function() {
			const ret = JSON.parse(d);
			var reshtml = '';
			reshtml += `
				<section class=search-section>
			`;
			for(var item of ret.result) {
				var title = totitle(item.title, item.namespace) + '';
				reshtml += `
					<div class=search-item>
						<h4>
							<a href="/w/${encodeURIComponent(title)}">
								<span class="icon ion-android-document arrow-circle"></span>
								${html.escape(title)}
							</a>
						</h4>
						<div>
							${item.content}
						</div>
					</div>
				`;
			}
			reshtml += `
				<nav class=pull-right>
					<ul class=pagination>
			`;
			var lp = (ret.page / 10) * 10 + 10;
			var max = ret.lastpage < lp ? ret.lastpage : lp;
			for(var i=Math.floor(ret.page / 10) * 10 + 1; i<=max; i++) {
				reshtml += `
					<li class=page-item>
						<a class=page-link href="?page=${i}">${i}</a>
					</li>
				`;
			}
			reshtml += `
						</ul>
					</nav>
				</section>
			`;
			var et = new Date().getTime() / 1000;
			content = content + `
				<div class=search-summary>전체 ${ret.total} 건 / 처리 시간 ${(et - st).toFixed(3).replace(/([0]+)$/, '')}초</div>
			` + reshtml;
			res.send(await render(req, '"' + query + '" 검색 결과', content, {}, _, _, 'search'));
		});
	}).on('error', async e => {
		res.send(await showError(req, 'searchd_fail'));
	}).end();
});

wiki.get(/^\/w\/(.*)/, async function viewDocument(req, res) {
	const title = req.params[0];
	if(title.replace(/\s/g, '') == '') res.redirect('/w/' + config.getString('wiki.front_page', 'FrontPage'));
	const doc = processTitle(title);
	var { rev } = req.query;
	
	if(rev) {
		var rawContent = await curs.execute("select content, time from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, rev]);
		var data = rawContent;
	} else {
		rev = null;
		var rawContent = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	}
	if(rev && !rawContent.length) return res.send(await showError(req, 'revision_not_found'));

	var content = '';
	var httpstat = 200;
	var viewname = 'wiki';
	var error = null;
	var lastedit = undefined;
	
	const aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) {
		if(minor < 5 || (minor == 5 && revision < 7)) return res.status(403).send(await showError(req, 'permission_read'));
		httpstat = 403;
		error = err('error', { code: 'permission_read', msg: aclmsg });
		content = '<h2>' + aclmsg + '</h2>';
	} else if(!rawContent.length) {
		viewname = 'notfound';
		httpstat = 404;
		var data = await curs.execute("select flags, rev, time, changes, log, iserq, erqnum, advance, ismember, username from history \
						where title = ? and namespace = ? order by cast(rev as integer) desc limit 3",
						[doc.title, doc.namespace]);
		
		content = `
			<p>해당 문서를 찾을 수 없습니다.</p>
			
			<p>
				<a rel=nofollow href="/edit/` + encodeURIComponent(doc + '') + `">[새 문서 만들기]</a>
			</p>
		`;
		
		if(data.length) {
			content += `
				<h3>이 문서의 역사</h3>
				<ul class=wiki-list>
			`;
			for(var row of data) content += `
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
			content += `
				</ul>
				<a href="/history/` + encodeURIComponent(doc + '') + `">[더보기]</a>
			`;
		}
	} else {
		if(rawContent[0].content.startsWith('#redirect ')) {
			const nd = rawContent[0].content.split('\n')[0].replace('#redirect ', '').split('#');
			const ntitle = nd[0];
			
			if(req.query['noredirect'] != '1' && !req.query['from']) {
				return res.redirect('/w/' + encodeURIComponent(ntitle) + '?from=' + title + (nd[1] ? ('#' + nd[1]) : ''));
			} else {
				content = '#redirect <a class=wiki-link-internal href="' + encodeURIComponent(ntitle) + (nd[1] ? ('#' + nd[1]) : '') + '">' + html.escape(ntitle) + '</a>';
			}
		} else content = await markdown(rawContent[0].content, 0, doc + '');
		
		if(rev && minor >= 20) content = alertBalloon('<strong>[주의!]</strong> 문서의 이전 버전(' + generateTime(toDate(data[0].time), timeFormat) + '에 수정)을 보고 있습니다. <a href="/w/' + encodeURIComponent(doc + '') + '">최신 버전으로 이동</a>', 'danger', true, '', 1) + content;
		if(req.query['from']) {
			content = alertBalloon('<a href="' + encodeURIComponent(req.query['from']) + '?noredirect=1" class=document>' + html.escape(req.query['from']) + '</a>에서 넘어옴', 'info', false) + content;
		}
		
		var data = await curs.execute("select time from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
		lastedit = Number(data[0].time);
	}
	
	const dpg = await curs.execute("select tnum, time from threads where namespace = ? and title = ? and status = 'normal' and cast(time as integer) >= ?", [doc.namespace, doc.title, getTime() - 86400000]);
	
	var star_count = 0, starred = false;
	if(rawContent.length) {
		var dbdata = await curs.execute("select title, namespace from stars where username = ? and title = ? and namespace = ?", [ip_check(req), doc.title, doc.namespace]);
		if(dbdata.length) starred = true;
		var dd = await curs.execute("select count(title) from stars where title = ? and namespace = ?", [doc.title, doc.namespace]);
		star_count = dd[0]['count(title)'];
	}
	
	res.status(httpstat).send(await render(req, totitle(doc.title, doc.namespace) + (rev ? (' (r' + rev + ' 판)') : ''), content, {
		star_count: minor >= 9 && rawContent.length ? star_count : undefined,
		starred: minor >= 9 && rawContent.length ? starred : undefined,
		date: Math.floor(lastedit / 1000),
		document: doc,
		rev,
		user: doc.namespace == '사용자' ? true : false,
		discuss_progress: dpg.length ? true : false,
	}, _, error, viewname));
});

if(minor >= 9) wiki.get(/^\/member\/star\/(.*)$/, async (req, res) => {
	const title = req.params[0];
	if(!islogin(req)) return res.redirect('/member/login?redirect=' + encodeURIComponent('/member/star/' + title));
	const doc = processTitle(title);
	
	var dbdata = await curs.execute("select title, namespace from stars where username = ? and title = ? and namespace = ?", [ip_check(req), doc.title, doc.namespace]);
	if(dbdata.length) return res.send(await showError(req, 'already_starred_document'));
	
	var dbdata = await curs.execute("select time from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
	if(!dbdata.length) return res.send(await showError(req, 'document_not_found'));
	
	await curs.execute('insert into stars (title, namespace, username, lastedit) values (?, ?, ?, ?)', [doc.title, doc.namespace, ip_check(req), dbdata[0]['time']]);

	res.redirect('/w/' + encodeURIComponent(title));
});

if(minor >= 9) wiki.get(/^\/member\/unstar\/(.*)$/, async (req, res) => {
	const title = req.params[0];
	if(!islogin(req)) return res.redirect('/member/login?redirect=' + encodeURIComponent('/member/star/' + title));
	const doc = processTitle(title);
	
	var dbdata = await curs.execute("select title, namespace from stars where username = ? and title = ? and namespace = ?", [ip_check(req), doc.title, doc.namespace]);
	if(!dbdata.length) return res.send(await showError(req, 'already_unstarred_document'));
	
	var dbdata = await curs.execute("select time from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
	if(!dbdata.length) return res.send(await showError(req, 'document_not_found'));
	
	
	await curs.execute('delete from stars where title = ? and namespace = ? and username = ?', [doc.title, doc.namespace, ip_check(req)]);

	res.redirect('/w/' + encodeURIComponent(title));
});


if(minor >= 9) wiki.get(/^\/member\/starred_documents$/, async (req, res) => {
	if(!islogin(req)) return res.redirect('/member/login?redirect=' + encodeURIComponent('/member/starred_documents'));
	
	var dd = await curs.execute("select title, namespace, lastedit from stars where username = ? order by cast(lastedit as integer) desc", [ip_check(req)]);
	var content = `<ul class=wiki-list>`;
	for(var doc of dd) {
		content += `
			<li>
				<a href="/w/${encodeURIComponent(totitle(doc.title, doc.namespace) + '')}">${html.escape(totitle(doc.title, doc.namespace) + '')}</a> (수정 시각:${generateTime(toDate(doc.lastedit), timeFormat)})
			</li>
		`;
	}
	
	content += '</ul>';

	res.send(await render(req, '내 문서함', content, {}, _, _, 'starred_documents'));
});

wiki.get(/^\/raw\/(.*)/, async(req, res) => {
	const title = req.params[0];
	const doc = processTitle(title);
	const rev = req.query['rev'];
	
	if(title.replace(/\s/g, '') === '') {
		return res.send(await await showError(req, 'invalid_title'));
	}
	
	if(rev) {
		var data = await curs.execute("select content from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, rev]);
	} else {
		var data = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	}
	const rawContent = data;
	var content = '';
	
	try {
		if(!await getacl(req, doc.title, doc.namespace, 'read')) {
			return res.send(await await showError(req, 'permission_read'));
		} else {
			content = rawContent[0].content;
		}
	} catch(e) {
		return res.status(404).send(await showError(req, 'document_not_found'));
	}
	
	res.setHeader('Content-Type', 'text/plain');
	res.send(content);
});

wiki.all(/^\/edit\/(.*)/, async function editDocument(req, res, next) {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) {
		return res.status(403).send(await showError(req, err('error', { code: 'permission_read', msg: aclmsg })));
	}
	
	if(!doc.title || ['특수기능', '투표', '토론'].includes(doc.namespace) || ((minor < 6 || (minor == 7 && revision < 3)) && doc.title.includes('://'))) return res.status(400).send(await showError(req, 'invalid_title'));
	
	var rawContent = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!rawContent[0]) rawContent = '';
	else rawContent = rawContent[0].content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	
	var error = null;
	var content = '';
	var section = Number(req.query['section']) || null;
	var baserev = 0;
	var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
	if(data.length) baserev = data[0].rev;
	var token = rndval('abcdef1234567890', 64);
	var textarea = `<textarea id="textInput" name="text" wrap="soft" class=form-control>${(req.method == 'POST' ? req.body['text'] : rawContent).replace(/<\/(textarea)>/gi, '&lt;/$1&gt;')}</textarea>`;
	
	// 틀:나무위키 -> helptext
	
	content = `
		<form method=post id="editForm" enctype="multipart/form-data" data-title="${html.escape(doc + '')}" data-recaptcha="0">
			<input type="hidden" name="token" value="${token}">
			<input type="hidden" name="identifier" value="${islogin(req) ? 'm' : 'i'}:${html.escape(ip_check(req))}">
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
					&<$TEXTAREA>
				</div>
				<div class="tab-pane" id="preview" role="tabpanel">
					
				</div>
			</div>
	`;
	
	if(minor >= 7 && minor <= 9) content = `
		<p>
			<a href="https://forum.theseed.io/topic/232/%EC%9D%98%EA%B2%AC%EC%88%98%EB%A0%B4-%EB%A6%AC%EB%8B%A4%EC%9D%B4%EB%A0%89%ED%8A%B8-%EB%AC%B8%EB%B2%95-%EB%B3%80%EA%B2%BD" target=_blank style="font-weight: bold; color: purple; font-size: 16px;">[의견수렴] 리다이렉트 문법 변경</a>
		</p>
	` + content;
	
	var httpstat = 200;
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 1);
	if(aclmsg) {
		error = err('alert', { code: 'permission_edit', msg: aclmsg });
		content = error + content.replace('&<$TEXTAREA>', textarea).replace('<textarea', '<textarea readonly=readonly') + `
			</form>
		`;
		httpstat = 403;
	} else content += `
			<div class="form-group" style="margin-top: 1rem;">
				<label class=control-label for="summaryInput">요약</label>
				<input type="text" class=form-control id="logInput" name="log" value="${req.method == 'POST' ? html.escape(req.body['log']) : ''}" />
			</div>

			<label><input ${req.cookies['agree'] == '1' ? 'checked ' : ''}type="checkbox" name="agree" id="agreeCheckbox" value="Y"${req.method == 'POST' && req.body['agree'] == 'Y' ? ' checked' : ''}>&nbsp;${config.getString('wiki.editagree_text', `문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을 <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을 이용하여 저작자 표시를 하는 것으로 충분하다는 데 동의하는 것입니다. 이 <strong>동의는 철회할 수 없습니다.</strong>`)}</label>
			
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
	if(!aclmsg && req.method == 'POST') do {
		var original = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		var ex = 1;
		if(!original[0]) ex = 0, original = '';
		else original = original[0]['content'];
		var text = req.body['text'] || '';
		text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
		if(text.startsWith('#넘겨주기 ')) text = text.replace('#넘겨주기 ', '#redirect ');
		if(text.startsWith('#redirect ')) text = text.split('\n')[0] + '\n';
		if(original == text && ex) { content = (error = err('alert', { code: 'text_unchanged' })) + content; break; }
		const rawChanges = text.length - original.length;
		const changes = (rawChanges > 0 ? '+' : '') + String(rawChanges);
		const log = req.body['log'] || '';
		const agree = req.body['agree'];
		if(!agree) { content = (error = err('alert', { code: 'validator_required', tag: 'agree' })) + content; break; }
		const baserev = req.body['baserev'];
		if(isNaN(Number(baserev))) { content = (error = err('alert', { code: 'invalid_type_number', tag: 'baserev' })) + content; break; }
		var data = await curs.execute("select rev from history where rev = ? and title = ? and namespace = ?", [baserev, doc.title, doc.namespace]);
		if(!data.length && ex) { content = (error = err('alert', { code: 'revision_not_found' })) + content; break; }
		var data = await curs.execute("select rev from history where cast(rev as integer) > ? and title = ? and namespace = ?", [Number(baserev), doc.title, doc.namespace]);
		if(data.length) {
			var data = await curs.execute("select content from history where rev = ? and title = ? and namespace = ?", [baserev, doc.title, doc.namespace]);
			var oc = '';
			if(data.length) oc = data[0].content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
			
			// 자동 병합
			var ERROR = 1;  // 0;
			/*
			const _tl = text.split('\n'), _nl = rawContent.split('\n'), _ol = oc.split('\n');
			const tl = [], nl = [], ol = [];
			// 1 - 내용이 같은 줄 찾기
			while(1) {
				const l1 = _tl[0], l2 = _nl[0], l3 = _ol[0];
				
				if(l1 == l2 && l2 == l3) {  // 원본, 내수정, 남의수정 모두 같으면 통과
					tl.push(l1);
					nl.push(l2);
					ol.push(l3);
				} else {
					var chk = 0;
					for(var j=0; j<_nl.length; j++) {
						if(l1 == _nl[j]) {
							tl.push(l1);
							nl.push(l1);
							chk = 1;
							break;
						} else {
							tl.push(null);
							nl.push(_nl[j]);
						}
					}
					if(!chk) {  // 중간에 줄이 추가된 게 아님.
						
					}
				}
				_tl.splice(0, 1);
				_nl.splice(0, 1);
				_ol.splice(0, 1);
			}*/
			
			if(ERROR) {
				error = err('alert', { code: 'edit_conflict' });
				content = error + diff(oc, text, 'r' + baserev, '사용자 입력') + '<span style="color: red; font-weight: bold; padding-bottom: 5px; padding-top: 5px;">자동 병합에 실패했습니다! 수동으로 수정된 내역을 아래 텍스트 박스에 다시 입력해주세요.</span>' + content.replace('&<$TEXTAREA>', `<textarea id="textInput" name="text" wrap="soft" class=form-control>${rawContent.replace(/<\/(textarea)>/gi, '&lt;/$1&gt;')}</textarea>`);
				break;
			} else if(!log) {
				log = `자동 병합됨 (r${baserev})`;
			}
		}
		const ismember = islogin(req) ? 'author' : 'ip';
		var advance = 'normal';
		
		var data = await curs.execute("select title from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		if(!data.length) {
			if(['파일', '사용자'].includes(doc.namespace)) {
				if((minor >= 11 && !doc.title.includes('/')) || minor < 11) {
					error = err('alert', { code: 'invalid_namespace' });
					content = error + content;
					break; } }
			advance = 'create';
			await curs.execute("insert into documents (title, namespace, content) values (?, ?, ?)", [doc.title, doc.namespace, text]);
		} else {
			await curs.execute("update documents set content = ? where title = ? and namespace = ?", [text, doc.title, doc.namespace]);
			curs.execute("update stars set lastedit = ? where title = ? and namespace = ?", [getTime(), doc.title, doc.namespace]);
		}
		res.cookie('agree', '1', { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 360) });
		
		curs.execute("update documents set time = ? where title = ? and namespace = ?", [doc.title, doc.namespace]);
		curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
			doc.title, doc.namespace, text, String(Number(baserev) + 1), ip_check(req), getTime(), changes, log, '0', '-1', ismember, advance
		]);
		markdown(text, 0, doc + '', 'backlinkinit');
		
		return res.redirect('/w/' + encodeURIComponent(totitle(doc.title, doc.namespace)));
	} while(0);
	
	res.status(httpstat).send(await render(req, totitle(doc.title, doc.namespace) + ' (편집)', content.replace('&<$TEXTAREA>', textarea), {
		document: doc,
		body: {
			baserev: String(baserev),
			text: rawContent,
			section,
		},
		helptext: '',
		captcha: false,
		readonly: !!aclmsg,
		token,
	}, '', error, 'edit'));
});

wiki.post(/^\/preview\/(.*)$/, async(req, res) => {
	const title = req.params[0];
	const doc = processTitle(title);
	
	var skinconfig = skincfgs[getSkin(req)];
	var header = '';
	for(var i=0; i<skinconfig["auto_css_targets"]['*'].length; i++) {
		header += '<link rel=stylesheet href="/skins/' + getSkin(req) + '/' + skinconfig["auto_css_targets"]['*'][i] + '">';
	}
	for(var i=0; i<skinconfig["auto_js_targets"]['*'].length; i++) {
		header += '<script type="text/javascript" src="/skins/' + getSkin(req) + '/' + skinconfig["auto_js_targets"]['*'][i]['path'] + '"></script>';
	}
	header += skinconfig['additional_heads'];
	
	res.send(`
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset=utf8 />
				<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
			${hostconfig.use_external_css ? `
				<link rel=stylesheet href="https://theseed.io/css/diffview.css">
				<link rel=stylesheet href="https://theseed.io/css/katex.min.css">
				<link rel=stylesheet href="https://theseed.io/css/wiki.css">
			` : `
				<link rel=stylesheet href="/css/diffview.css">
				<link rel=stylesheet href="/css/katex.min.css">
				<link rel=stylesheet href="/css/wiki.css">
			`}
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
			`}
				${header}
			</head>
			
			<body>
				<h1 class=title>${html.escape(doc + '')}</h1>
				<div class=wiki-article>
					${await markdown(req.body['text'], 0, doc + '', 'preview')}
				</div>
			</body>
		</html>
	`);
});

wiki.get(minor >= 14 ? /^\/backlink\/(.*)/ : /^\/xref\/(.*)/, async (req, res) => {
	const title = req.params[0];
	const doc = processTitle(title);
	const flag  = req.query['flag'] || '0';
	const ns = req.query['namespace'] || '문서';
	const type = (
		flag == '1' ? (
			'link'
		) : (
			flag == '2' ? (
				'file'
			) : (
				flag == '4' ? (
					'include'
				) : flag == '8' ? (
					'redirect'
				) : 'all'
			)
		)
	);
	
	var sa = '', sd = [];
	if(req.query['from']) {
		sa = ' and title >= ? order by title asc ';
		sd.push(req.query['from']);
	} else if(req.query['until']) {
		sa = ' and title <= ? order by title desc ';
		sd.push(req.query['until']);
	} else {
		sa = ' order by title asc ';
	}
	const fd = await curs.execute("select title from backlink where not type = 'category' and link = ? and linkns = ? " + (flag != '0' ? " and type = ?" : '') + " order by title asc limit 1", [doc.title, doc.namespace].concat(flag != '0' ? [type] : []));
	const ld = await curs.execute("select title from backlink where not type = 'category' and link = ? and linkns = ? " + (flag != '0' ? " and type = ?" : '') + " order by title desc limit 1", [doc.title, doc.namespace].concat(flag != '0' ? [type] : []));
	const dbdata = await curs.execute("select title, namespace, type from backlink where not type = 'category' and link = ? and linkns = ? " + (flag != '0' ? " and type = ?" : '') + sa + " limit 50", [doc.title, doc.namespace].concat(flag != '0' ? [type] : []).concat(sd));
	
	try {
		var navbtns = navbtnss(fd[0].title, ld[0].title, dbdata[0].title, dbdata[dbdata.length-1].title, (minor >= 14 ? '/backlink/' : '/xref/') + encodeURIComponent(title));
	} catch(e) {
		var navbtns = navbtn(0, 0, 0, 0);
	}
	
	const _nslist = dbdata.map(item => item.namespace);
	const nslist = fetchNamespaces().filter(item => _nslist.includes(item));
	const counts = {};
	var nsopt = '';
	for(var item of nslist) {
		nsopt += `<option value="${item}">${item} (${dbdata.map(x => x.namespace == item).length})</option>`;
	}
	const data = dbdata.filter(item => item.namespace == ns);
	
	var content = `
		<fieldset class=recent-option>
			<form class=form-inline method=get>
				<div class=form-group>
					<label class=control-label>이름공간 :</label>
					
					<select class=form-control name=namespace>${nsopt}</select>
					
					<select class=form-control name=flag>
						<option value=0>(전체)</option>
						<option value=1>link</option>
						<option value=2>file</option>
						<option value=4>include</option>
						<option value=8>redirect</option>
					</select>
				</div>
				
				<div class="form-group btns">
					<button type=submit class="btn btn-primary" style="width: 5rem;">제출</button>
				</div>
			</form>
		</fieldset>
	`;
	
	var indexes = {};
	const hj = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
	const ha = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하', String.fromCharCode(55204)];
	for(var item of data) {
		if(!item) continue;
		var chk = 0;
		for(var i=0; i<ha.length-1; i++) {
			const fchr = item.title[0].charCodeAt(0);
			
			if((hj[i].includes(item.title[0])) || (fchr >= ha[i].charCodeAt(0) && fchr < ha[i+1].charCodeAt(0))) {
				if(!indexes[hj[i]]) indexes[hj[i]] = [];
				indexes[hj[i]].push(item);
				chk = 1;
				break;
			}
		} if(!chk) {
			if(!indexes[item.title[0].toUpperCase()]) indexes[item.title[0].toUpperCase()] = [];
			indexes[item.title[0].toUpperCase()].push(item);
		}
	}
	
	var listc = '<div' + (data.length > 6 ? ' class=wiki-category-container' : '') + '>';
	var list = '';
	for(var idx of Object.keys(indexes).sort()) {
		list += `
			<div>
				<h3>${html.escape(idx)}</h3>
				<ul class=wiki-list>
		`;
		for(var item of indexes[idx])
			list += `
				<li>
					<a href="/w/${encodeURIComponent(totitle(item.title, item.namespace))}">${html.escape(totitle(item.title, item.namespace) + '')}</a> (${item.type})
				</li>
			`;
		list += '</ul></div>';
	} listc += list + '</div>';
	
	content += `
		${navbtns}
		${list ? listc : '<div>해당 문서의 역링크가 존재하지 않습니다. </div>'}
		${navbtns}
	`;
	
	res.send(await render(req, title + '의 역링크', content, {
		document: doc,
	}, _, _, 'xref'));
});

wiki.all(/^\/revert\/(.*)/, async (req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	const title = req.params[0];
	const doc = processTitle(title);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) {
		return res.status(403).send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	}
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 2);
	if(aclmsg) {
		return res.status(403).send(await showError(req, { code: 'permission_edit', msg: aclmsg }));
	}
	
	const rev = req.query['rev'];
	if(!rev || isNaN(Number(rev))) {
		return res.send(await showError(req, 'revision_not_found'));
	}
	
	const _recentRev = await curs.execute("select content, rev from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
	if(!_recentRev.length) {
		return res.send(await showError(req, 'document_not_found'));
	}
	
	const dbdata = await curs.execute("select content, advance, flags from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, rev]);
	if(!dbdata.length) {
		return res.send(await showError(req, 'revision_not_found'));
	}
	const revdata   = dbdata[0];
	const recentRev = _recentRev[0];
	
	// 더 시드에서 실제로는 되돌려짐.
	if(req.method == 'GET' && ['move', 'delete', 'acl', 'revert'].includes(revdata.advance)) {
		return res.send(await showError(req, 'not_revertable'));
	}
	
	var content = `
		<form method=post>
			<textarea class=form-control rows=25 readonly>${revdata.content.replace(/<\/(textarea)>/gi, '&lt;/$1&gt;')}</textarea>
		
			<label>요약</label><br />
			<input type=text class=form-control name=log />
			
			<div class="btns pull-right">
				<button type=submit class="btn btn-primary">되돌리기</button>
			</div>
		</form>
	`;
	
	if(req.method == 'POST') {
		if(recentRev.content == revdata.content) {
			return res.send(await showError(req, 'text_unchanged'));
		}
		await curs.execute("delete from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		await curs.execute("insert into documents (content, title, namespace) values (?, ?, ?)", [revdata.content, doc.title, doc.namespace]);
		const rawChanges = revdata.content.length - recentRev.content.length;
		curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, flags) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
			doc.title, doc.namespace, revdata.content, String(Number(recentRev.rev) + 1), ip_check(req), getTime(), (rawChanges > 0 ? '+' : '') + rawChanges, req.body['log'] || '', '0', '-1', islogin(req) ? 'author' : 'ip', 'revert', rev
		]);
		curs.execute("update documents set time = ? where title = ? and namespace = ?", [doc.title, doc.namespace]);
		return res.redirect('/w/' + encodeURIComponent(doc + ''));
	}
	
	res.send(await render(req, doc + ' (r' + rev + '로 되돌리기)', content, {
		rev,
		text: revdata.content,
		document: doc,
	}, _, null, 'revert'))
});

wiki.get(/^\/diff\/(.*)/, async (req, res) => {
	const title  = req.params[0];
	const doc    = processTitle(title);
	const rev    = req.query['rev'];
	const oldrev = req.query['oldrev'];
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.status(403).send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	if(!rev || !oldrev || Number(rev) <= Number(oldrev)) return res.send(await showError(req, 'revision_not_found'));
	var dbdata = await curs.execute("select content from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, rev]);
	if(!dbdata.length) return res.send(await showError(req, 'revision_not_found'));
	const revdata = dbdata[0];
	var dbdata = await curs.execute("select content from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, oldrev]);
	if(!dbdata.length) return res.send(await showError(req, 'revision_not_found'));
	const oldrevdata = dbdata[0];
	const diffoutput = diff(oldrevdata.content, revdata.content, 'r' + oldrev, 'r' + rev);
	var content = diffoutput;
	
	res.send(await render(req, doc + ' (비교)', content, {
		rev,
		oldrev,
		diffoutput,
		document: doc,
	}, _, null, 'diff'));
});

wiki.get(/^\/blame\/(.*)/, async (req, res) => {
	const title = req.params[0];
	const doc   = processTitle(title);
	const rev   = req.query['rev'];
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.status(403).send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	if(!rev) {
		var d = await curs.execute("select rev from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
		if(d.length) rev = d[0].rev;
		else return res.send(await showError(req, 'revision_not_found'));
	}
	var dbdata = await curs.execute("select content from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, rev]);
	if(!dbdata.length) return res.send(await showError(req, 'revision_not_found'));
	const revdata = dbdata[0];
	
	var content = `미구현`;
	
	res.send(await render(req, doc + ' (Blame)', content, {
		rev,
		document: doc,
	}, _, null, 'blame'));
});

wiki.get(/^\/edit_request\/(\d+)\/preview$/, async(req, res, next) => {
	const id = req.params[0];
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and id = ?", [id]);
	if(!data.length) return res.send(await showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	
	var skinconfig = skincfgs[getSkin(req)];
	var header = '';
	for(var i=0; i<skinconfig["auto_css_targets"]['*'].length; i++) {
		header += '<link rel=stylesheet href="/skins/' + getSkin(req) + '/' + skinconfig["auto_css_targets"]['*'][i] + '">';
	}
	for(var i=0; i<skinconfig["auto_js_targets"]['*'].length; i++) {
		header += '<script type="text/javascript" src="/skins/' + getSkin(req) + '/' + skinconfig["auto_js_targets"]['*'][i]['path'] + '"></script>';
	}
	header += skinconfig.additional_heads;
	
	return res.send(`
		<head>
			<meta charset=utf8 />
			<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
		${hostconfig.use_external_css ? `
			<link rel=stylesheet href="https://theseed.io/css/diffview.css">
			<link rel=stylesheet href="https://theseed.io/css/katex.min.css">
			<link rel=stylesheet href="https://theseed.io/css/wiki.css">
		` : `
			<link rel=stylesheet href="/css/diffview.css">
			<link rel=stylesheet href="/css/katex.min.css">
			<link rel=stylesheet href="/css/wiki.css">
		`}
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
		`}
			${header}
		</head>
		
		<body>
			<h1 class=title>${html.escape(doc + '')}</h1>
			<div class=wiki-article>
				${await markdown(item.content, 0, doc + '', 'preview')}
			</div>
		</body>
	`);
});

wiki.post(/^\/edit_request\/(\d+)\/close$/, async(req, res, next) => {
	const id = req.params[0];
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and id = ?", [id]);
	if(!data.length) return res.send(await showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	if(!(hasperm(req, 'update_thread_status') || ((islogin(req) ? 'author' : 'ip') == item.ismember && item.username == ip_check(req)))) {
		return res.send(await showError(req, 'permission'));
	}
	if(item.state != 'open') {
		return res.send(await showError(req, 'edit_request_not_open'));
	}
	await curs.execute("update edit_requests set state = 'closed', processor = ?, processortype = ?, processtime = ?, reason = ? where id = ?", [ip_check(req), islogin(req) ? 'author' : 'ip', getTime(), req.body['close_reason'] || '', id]);
	return res.redirect('/edit_request/' + id);
});

wiki.post(/^\/edit_request\/(\d+)\/accept$/, async(req, res, next) => {
	const id = req.params[0];
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and id = ?", [id]);
	if(!data.length) return res.send(await showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	var aclmsg = await getacl(req, item.title, item.namespace, 'edit', 1);
	if(aclmsg) {
		return res.send(await showError(req, { code: 'permission_edit', msg: aclmsg }));
	}
	if(item.state != 'open') {
		return res.send(await showError(req, 'edit_request_not_open'));
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
	else original = original[0].content;
	
	const rawChanges = item.content.length - original.length;
	const changes = (rawChanges > 0 ? '+' : '') + String(rawChanges);
	
	await curs.execute("update documents set content = ? where title = ? and namespace = ?", [item.content, item.title, item.namespace]);
	curs.execute("update stars set lastedit = ? where title = ? and namespace = ?", [getTime(), item.title, item.namespace]);
	curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, edit_request_id) \
					values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
		item.title, item.namespace, item.content, String(rev), item.username, getTime(), changes, item.log, '0', '-1', item.ismember, 'normal', id
	]);
	await curs.execute("update edit_requests set state = 'accepted', processor = ?, processortype = ?, processtime = ?, rev = ? where id = ?", [ip_check(req), islogin(req) ? 'author' : 'ip', getTime(), String(rev), id]);
	markdown(text, 0, doc + '', 'backlinkinit');
	return res.redirect('/edit_request/' + id);
});

wiki.get(minor >= 16 ? /^\/edit_request\/([a-zA-Z]+)$/ : /^\/edit_request\/(\d+)$/, async(req, res, next) => {
	const id = req.params[0];
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and id = ?", [id]);
	if(!data.length) return res.send(await showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	
	const aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.status(403).send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
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
				<h4 class=card-title>이 편집 요청을...</h4>
				<p class=card-text>${generateTime(toDate(item.lastupdate), timeFormat)}에 마지막으로 수정됨</p>
				<form id=edit-request-accept-form action="/edit_request/${id}/accept" method=post style="display: inline;">
					<button${acceptable ? '' : ' disabled'} class="btn btn-lg btn-success${acceptable ? '' : ' disabled'}" data-toggle=tooltip data-placement=top title="${acceptable ? '이 편집 요청을 문서에 적용합니다.' : '이 문서를 편집할 수 있는 권한이 없습니다.'}" type=submit>Accept</button>
				</form>
				<span data-toggle=modal data-target="#edit-request-close-modal">
					<button${closable ? '' : ' disabled'} class="btn btn-lg${closable ? '' : ' disabled'}" data-toggle=tooltip data-placement=top title="${closable ? '이 편집 요청을 닫습니다.' : '편집 요청을 닫기 위해서는 요청자 본인이거나 권한이 있어야 합니다.'}" type=button>Close</button>
				</span>
				<a class="btn btn-info btn-lg${editable ? '' : ' disabled'}" data-toggle=tooltip data-placement=top title="${editable ? '이 편집 요청을 수정합니다.' : '요청자 본인만 수정할 수 있습니다.'}" href="/edit_request/${id}/edit">Edit</a>
			`;
		} break; case 'closed': {
			card = `
				<h4 class=card-title>편집 요청이 닫혔습니다.</h4>
				<p class=card-text>${generateTime(toDate(item.processtime), timeFormat)}에 ${ip_pas(item.processor, item.processortype, 1)}가 편집 요청을 닫았습니다.</p>
				${item.reason ? `<p class=card-text>사유 : ${html.escape(item.reason)}</p>` : ''}
			`;
		} break; case 'accepted': {
			card = `
				<h4 class=card-title>편집 요청이 승인되었습니다.</h4>
				<p class=card-text>${generateTime(toDate(item.processtime), timeFormat)}에 ${ip_pas(item.processor, item.processortype, 1)}가 r${item.rev}으로 승인함.</p>
			`;
		}
	}
	
	var content = `
		<h3> ${ip_pas(item.username, item.ismember, 1)}가 ${generateTime(toDate(item.date), timeFormat)}에 요청</h3>
		<hr />
		<div class=form-group>
			<label class=control-label>기준 판</label> r${item.baserev}
		</div>
		
		<div class=form-group>
			<label class=control-label>편집 요약</label> ${html.escape(item.log)}
		</div>
		
		${item.state == 'open' ? `
			<div id=edit-request-close-modal class="modal fade" role=dialog style="display: none;" aria-hidden=true>
				<div class=modal-dialog>
					<form id=edit-request-close-form method=post action="/edit_request/${id}/close">
						<div class=modal-content>
							<div class=modal-header>
								<button type=button class=close data-dismiss=modal>×</button> 
								<h4 class=modal-title>편집 요청 닫기</h4>
							</div>
							<div class=modal-body>
								<p>사유:</p>
								<input name=close_reason type=text> 
							</div>
							<div class=modal-footer> <button type=submit class="btn btn-primary">확인</button> <button type=button class="btn btn-default" data-dismiss=modal>취소</button> </div>
						</div>
					</form>
				</div>
			</div>
		` : ''}
		
		<div class=card>
			<div class=card-block>
				${card}
			</div>
		</div>
		
		<br />
		
		${item.state != 'accepted' ? diff(base, item.content, '1', '2').replace('<th class="texttitle">1 vs. 2</th>', '<th class="texttitle"><a target=_blank href="/edit_request/' + id + '/preview">(미리보기)</a></th>') : ''}
	`;
	
	var error = false;
	
	return res.send(await render(req, doc + ' (편집 요청 ' + id + ')', content, {
		document: doc,
	}, _, error, 'edit_request'));
});

wiki.all(minor >= 16 ? /^\/edit_request\/([a-zA-Z]+)\/edit$/ : /^\/edit_request\/(\d+)\/edit$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const id = req.params[0];
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and id = ?", [id]);
	if(!data.length) return res.send(await showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	const title = doc + '';
	
	if(!((islogin(req) ? 'author' : 'ip') == item.ismember && item.username == ip_check(req))) {
		return res.send(await showError(req, '자신의 편집 요청만 수정할 수 있습니다.', 1));
	}
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit_request', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_edit_request', msg: aclmsg }));
	
	var error = null;
	
	var content = `
		<form method=post id="editForm" enctype="multipart/form-data" data-title="${title}" data-recaptcha="0">
			<input type="hidden" name="token" value="">
			<input type="hidden" name="identifier" value="${islogin(req) ? 'm' : 'i'}:${ip_check(req)}">

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
					<textarea id="textInput" name="text" wrap="soft" class=form-control>${html.escape(item.content)}</textarea>
				</div>
				<div class="tab-pane" id="preview" role="tabpanel">
					
				</div>
			</div>
			
			<div class="form-group" style="margin-top: 1rem;">
				<label class=control-label for="summaryInput">요약</label>
				<input type="text" class=form-control id="logInput" name="log" value="${html.escape(item.log)}" />
			</div>

			<label><input checked type="checkbox" name="agree" id="agreeCheckbox" value="Y" />&nbsp;${config.getString('wiki.editagree_text', `문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을 <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을 이용하여 저작자 표시를 하는 것으로 충분하다는 데 동의하는 것입니다. 이 <strong>동의는 철회할 수 없습니다.</strong>`)}</label>
			
			${islogin(req) ? '' : `<p style="font-weight: bold;">비로그인 상태로 편집합니다. 편집 역사에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
			
			<div class="btns">
				<button id="editBtn" class="btn btn-primary" style="width: 100px;">저장</button>
			</div>
		</form>
	`;
	
	if(req.method == 'POST') do {
		const agree = req.body['agree'];
		if(!agree) { content = (error = err('alert', { code: 'validator_required', tag: 'agree' })) + content; break; }
		await curs.execute("update edit_requests set lastupdate = ?, content = ?, log = ? where id = ?", [getTime(), req.body['text'] || '', req.body['log'] || '', id]);
		return res.redirect('/edit_request/' + id);
	} while(0);
	
	res.send(await render(req, doc + ' (편집 요청)', content, {
		document: doc,
	}, '', error, 'new_edit_request'));
});

wiki.all(/^\/new_edit_request\/(.*)$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	
	var data = await curs.execute("select title from documents \
					where title = ? and namespace = ?",
					[doc.title, doc.namespace]);
	if(!data.length) return res.send(await showError(req, 'document_not_found'));
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit_request', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_edit_request', msg: aclmsg }));
	
	var baserev;
	var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
	try {
		baserev = data[0].rev;
	} catch(e) {
		baserev = 0;
	}
	
	var rawContent = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!rawContent[0]) rawContent = '';
	else rawContent = rawContent[0].content;
	var error = null;
	var content = `
		<form method=post id="editForm" enctype="multipart/form-data" data-title="${title}" data-recaptcha="0">
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
					<textarea id="textInput" name="text" wrap="soft" class=form-control>${rawContent.replace(/<\/(textarea)>/gi, '&lt;/$1&gt;')}</textarea>
				</div>
				<div class="tab-pane" id="preview" role="tabpanel">
					
				</div>
			</div>
			
			<div class="form-group" style="margin-top: 1rem;">
				<label class=control-label for="summaryInput">요약</label>
				<input type="text" class=form-control id="logInput" name="log" value="">
			</div>

			<label><input ${req.method == 'POST' ? 'checked ' : ''}type="checkbox" name="agree" id="agreeCheckbox" value="Y">&nbsp;${config.getString('wiki.editagree_text', `문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을 <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을 이용하여 저작자 표시를 하는 것으로 충분하다는 데 동의하는 것입니다. 이 <strong>동의는 철회할 수 없습니다.</strong>`)}</strong></label>
			
			${islogin(req) ? '' : `<p style="font-weight: bold;">비로그인 상태로 편집합니다. 편집 역사에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
			
			<div class="btns">
				<button id="editBtn" class="btn btn-primary" style="width: 100px;">저장</button>
			</div>
		</form>
	`;
	
	if(req.method == 'POST') do {
		if(rawContent == req.body['text']) {
			error = err('alert', { code: 'text_unchanged' });
			content = error + content;
			break;
		}
		
		const agree = req.body['agree'];
		if(!agree) { content = (error = err('alert', { code: 'validator_required', tag: 'agree' })) + content; break; }
		
		var data = await curs.execute("select id from edit_requests order by cast(id as integer) desc limit 1");
		var id = 1;
		if(data.length) id = Number(data[0].id) + 1;
		await curs.execute("insert into edit_requests (title, namespace, id, state, content, baserev, username, ismember, log, date, processor, processortype, lastupdate) values (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, '', '', ?)", 
														[doc.title, doc.namespace, id, req.body['text'] || '', baserev, ip_check(req), islogin(req) ? 'author' : 'ip', req.body['log'] || '', getTime(), getTime()]);
		
		return res.redirect('/edit_request/' + id);
	} while(0);
	
	res.send(await render(req, doc + ' (편집 요청)', content, {
		document: doc,
	}, '', error, 'new_edit_request'));
});

wiki.all(/^\/acl\/(.*)$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	if(['특수기능', '투표', '토론'].includes(doc.namespace) || !doc.title) return res.status(400).send(await showError(req, '문서 이름이 올바르지 않습니다.', 1));
	if(minor >= 2) {
		await curs.execute("delete from acl where not expiration = '0' and cast(expiration as integer) < ?", [getTime()]);
		const aclmsg = await getacl(req, doc.title, doc.namespace, 'acl');
		const editable = !!aclmsg;
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
			
			if(isNS && !nseditable) return res.status(403).json({ status: fetchErrorString('permission') });
			if(!nseditable && !isNS && !editable) return res.status(403).json({ status: aclmsg });
			
			const edit = nseditable || (isNS ? nseditable : editable);
			
			switch(mode) {
				case 'insert': {
					if(!['allow', 'deny'].concat(isNS || minor < 18 ? [] : ['gotons']).includes(action)) return res.status(400).send('');
					if(Number(expire) === NaN) return res.status(400).send('');
					if(!condition) return res.status(400).send('');
					const cond = condition.split(':');
					if(cond.length != 2) return res.status(400).send('');
					if(!['perm', 'ip', 'member'].concat((minor >= 6 || (minor == 5 && revision >= 9)) ? ['geoip'] : []).concat(minor >= 18 ? ['aclgroup'] : []).includes(cond[0])) return res.status(400).send('');
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
							status: fetchErrorString('invalid_username'),
						});
					}
					if(cond[0] == 'perm') {
						if(!cond[1]) return res.status(400).json({
							status: fetchErrorString('invalid_acl_condition'),
						});
					}
					
					const expiration = String(expire ? (getTime() + Number(expire) * 1000) : 0);
					if(isNS) var data = await curs.execute("select id from acl where type = ? and namespace = ? and ns = '1' order by cast(id as integer) desc limit 1", [type, doc.namespace]);
					else var data = await curs.execute("select id from acl where type = ? and title = ? and namespace = ? and ns = '0' order by cast(id as integer) desc limit 1", [type, doc.title, doc.namespace]);
					
					if(isNS) var ff = await curs.execute("select id from acl where id = '1' and type = ? and namespace = ? and ns = '1' order by cast(id as integer) desc limit 1", [type, doc.namespace]);
					else var ff = await curs.execute("select id from acl where id = '1' and type = ? and title = ? and namespace = ? and ns = '0' order by cast(id as integer) desc limit 1", [type, doc.title, doc.namespace]);
					
					var aclid = '1';
					if(data.length && ff.length) aclid = String(Number(data[0].id) + 1);
					
					await curs.execute("insert into acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) values (?, ?, ?, ?, ?, ?, ?, ?, ?)", [isNS ? '' : doc.title, doc.namespace, aclid, type, action, expire == '0' ? '0' : expiration, cond[0], cond[1], isNS ? '1' : '0']);
					
					if(!isNS) curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, flags) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
						doc.title, doc.namespace, rawContent, String(Number(baserev) + 1), ip_check(req), getTime(), '0', '', '0', '-1', islogin(req) ? 'author' : 'ip', 'acl', mode + ',' + type + ',' + action + ',' + condition
					]);
					
					return res.send(await tbody(type, isNS, edit));
				} case 'delete': {
					if(!id) return res.status(400).send('');
					var data = await curs.execute("select action, conditiontype, condition from acl where id = ? and type = ? and title = ? and namespace = ? and ns = ?", [id, type, isNS ? '' : doc.title, doc.namespace, isNS ? '1' : '0']);
					if(!data.length) return res.status(400).send('');
					await curs.execute("delete from acl where id = ? and type = ? and title = ? and namespace = ? and ns = ?", [id, type, isNS ? '' : doc.title, doc.namespace, isNS ? '1' : '0']);
					
					if(!isNS) curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, flags) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
						doc.title, doc.namespace, rawContent, String(Number(baserev) + 1), ip_check(req), getTime(), '0', '', '0', '-1', islogin(req) ? 'author' : 'ip', 'acl', mode + ',' + type + ',' + data[0].action + ',' + data[0].conditiontype + ':' + data[0].condition
					]);
					
					return res.send(await tbody(type, isNS, edit));
				} case 'move': {
					if(!id || !after_id) return res.status(400).send('');
					
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
			
			return res.status(400).send('');
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
						var aclpermopt = '';
						for(var prm in aclperms) {
							if(!aclperms[prm]) continue;
							aclpermopt += `<option value=${prm}>${aclperms[prm]}${minor >= 18 ? '' : (exaclperms.includes(prm) ? ' [*]' : '')}</option>`;
						}
						
						content += `
							<div class="form-inline">
								<div class="form-group">
									<label class=control-label>Condition :</label> 
									<div>
										<select class="seed-acl-add-condition-type form-control" id="permTypeWTC">
											<option value="perm">권한</option>
											<option value="member">사용자</option>
											<option value="ip">아이피</option>
											${(minor >= 6 || (minor == 5 && revision >= 9)) ? `<option value="geoip">GeoIP</option>` : ''}
											${minor >= 18 ? `<option value="aclgroup">ACL그룹</option>` : ''}
										</select>
										<select class="seed-acl-add-condition-value-perm form-control" id="permTextWTC">
											${aclpermopt}
										</select>
										<input class="seed-acl-add-condition-value form-control" style="display: none;" type="text"> 
									</div>
								</div>
								<div class="form-group">
									<label class=control-label>Action :</label> 
									<div>
										<select class="seed-acl-add-action form-control">
											<option value="allow">허용</option>
											<option value="deny">거부</option>
											${isns || minor < 18 ? '' : `<option value="gotons">이름공간ACL 실행</option>`}
										</select>
									</div>
								</div>
								<div class="form-group">
									<label class=control-label>Duration :</label> 
									<div>
										<select class="form-control seed-acl-add-expire">
											${expireopt(req)}
										</select>
									</div>
								</div>
								<button type="submit" class="btn btn-primary seed-acl-add-btn">추가</button> 
							</div>
							${minor >= 18 ? '' : `<small>[*] 차단된 사용자는 포함되지 않습니다.</small>`}
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
			
			return res.send(await render(req, doc + ' (ACL)', content, {
				document: doc,
			}, '', false, 'acl'));
		}
	} else {
		if(!hasperm(req, 'acl')) return res.send(await showError(req, 'permission'));
		
		// 내가 나무위키 자체는 ACL 개편 전에도 했지만, ACL 인터페이스는 개편 후 처음 접했음. 원본 HTML 코드는 모르고 캡춰 화면 보고 내 나름대로 씀.
		var content = `
			<form method=post>
				<div class=form-group>
					<label>읽기 : </label>
					<select name=read class=form-control>
						<option value=everyone>모두</option>
						<option value=member>로그인한 사용자</option>
						<option value=admin>괸리자</option>
					</select>
				</div>
				
				<div class=form-group>
					<label>편집 : </label>
					<select name=edit class=form-control>
						<option value=everyone>모두</option>
						<option value=member>로그인한 사용자</option>
						<option value=admin>괸리자</option>
					</select>
				</div>
				
				<div class=form-group>
					<label>삭제 : </label>
					<select name=delete class=form-control>
						<option value=everyone>모두</option>
						<option value=member>로그인한 사용자</option>
						<option value=admin>괸리자</option>
					</select>
				</div>
				
				<div class=form-group>
					<label>토론 : </label>
					<select name=discuss class=form-control>
						<option value=everyone>모두</option>
						<option value=member>로그인한 사용자</option>
						<option value=admin>괸리자</option>
					</select>
				</div>
				
				<div class=form-group>
					<label>이동 : </label>
					<select name=move class=form-control>
						<option value=everyone>모두</option>
						<option value=member>로그인한 사용자</option>
						<option value=admin>괸리자</option>
					</select>
				</div>
				
				<div class=form-group>
					<label>요약 : </label>
					<input name=log type=text id=logInput style="width: 100%;" />
				</div>
				
				<div>
					<button type=submit>삽입</button>
				</div>
			</form>
		`;
		
		return res.send(await render(req, doc + ' (ACL)', content, {
			document: doc,
		}, '', false, 'acl'));
	}
});

wiki.get(/^\/RecentChanges$/, async function recentChanges(req, res) {
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
				<tr${(row.log.length > 0 || row.advance != 'normal' ? ' class=no-line' : '')}>
					<td>
						<a href="/w/${encodeURIComponent(title)}">${html.escape(title)}</a> 
						<a href="/history/${encodeURIComponent(title)}">[역사]</a> 
						${
								Number(row.rev) > 1
								? '<a \href="/diff/' + encodeURIComponent(title) + '?rev=' + row.rev + '&oldrev=' + String(Number(row.rev) - 1) + '">[비교]</a>'
								: ''
						} 
						<a href="/discuss/${encodeURIComponent(title)}">[토론]</a> 
						
						<span class=f_r>(<span style="color: ${
							(
								Number(row.changes) > 0
								? 'green'
								: (
									Number(row.changes) < 0
									? 'red'
									: 'gray'
								)
							)
							
						};">${row.changes}</span>)</span>
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
	
	res.send(await render(req, '최근 변경내역', content, {}));
});

wiki.get(/^\/contribution\/(ip|author)\/(.+)\/document$/, async function documentContributionList(req, res) {
	const ismember = req.params[0];
	const username = req.params[1];
	var moredata = [];
	
	if(ismember == 'author' && username.toLowerCase() == 'namubot') {
		var data = [];
	} else {
		var data = await curs.execute("select flags, title, namespace, rev, time, changes, log, iserq, erqnum, advance, ismember, username from history \
				where cast(time as integer) >= ? and ismember = ? " + (username.replace(/\s/g, '') ? "and lower(username) = ?" : "and (lower(username) like '%' || ?)") + " order by cast(time as integer) desc", [
					Number(getTime()) - 2592000000, ismember, username.toLowerCase()
				]);
	
		// 2018년 더시드 업데이트로 최근 30일을 넘어선 기록을 최대 100개까지 볼 수 있었음
		var tt = Number(getTime()) + 12345;
		if(data.length) tt = Number(data[data.length - 1].time);
		if(data.length < 100 && minor >= 8)
			moredata = await curs.execute("select flags, title, namespace, rev, time, changes, log, iserq, erqnum, advance, ismember, username from history \
					where cast(time as integer) < ? and ismember = ? " + (username.replace(/\s/g, '') ? "and lower(username) = ?" : "and (lower(username) like '%' || ?)") + " order by cast(time as integer) desc limit ?", [
						tt, ismember, username.toLowerCase(), 100 - data.length
					]);
		data = data.concat(moredata);
	}
	
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
				<tr${(row.log.length > 0 || row.advance != 'normal' ? ' class=no-line' : '')}>
					<td>
						<a href="/w/${encodeURIComponent(title)}">${html.escape(title)}</a> 
						<a href="/history/${encodeURIComponent(title)}">[역사]</a> 
						${
								Number(row.rev) > 1
								? '<a \href="/diff/' + encodeURIComponent(title) + '?rev=' + row.rev + '&oldrev=' + String(Number(row.rev) - 1) + '">[비교]</a>'
								: ''
						} 
						<a href="/discuss/${encodeURIComponent(title)}">[토론]</a> 
						
						<span class=f_r>(<span style="color: ${
							(
								Number(row.changes) > 0
								? 'green'
								: (
									Number(row.changes) < 0
									? 'red'
									: 'gray'
								)
							)
							
						};">${row.changes}</span>)</span>
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
	
	res.send(await render(req, `"${username}" 기여 목록`, content, {}));
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
			trds = await curs.execute("select title, namespace, topic, time, tnum, slug from threads where status = 'normal' and not deleted = '1' order by cast(time as integer) desc limit 120");
		break; case 'old_thread':
			trds = await curs.execute("select title, namespace, topic, time, tnum, slug from threads where status = 'normal' and not deleted = '1' order by cast(time as integer) asc limit 120");
		break; case 'closed_thread':
			trds = await curs.execute("select title, namespace, topic, time, tnum, slug from threads where status = 'close' and not deleted = '1' order by cast(time as integer) desc limit 120");
		break; case 'open_editrequest':
			trds = await curs.execute("select id, slug, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'open' and not deleted = '1' order by cast(date as integer) desc limit 120");
		break; case 'closed_editrequest':
			trds = await curs.execute("select id, slug, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'closed' and not deleted = '1' order by cast(date as integer) desc limit 120");
		break; case 'accepted_editrequest':
			trds = await curs.execute("select id, slug, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'accepted' and not deleted = '1' order by cast(date as integer) desc limit 120");
		break; default:
			var data1 = await curs.execute("select title, namespace, topic, time, tnum, slug from threads where status = 'normal' and not deleted = '1' order by cast(time as integer) desc limit 120");
			var data2 = await curs.execute("select id, slug, title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where state = 'open' and not deleted = '1' order by cast(date as integer) desc limit 120");
			trds = data1.concat(data2).sort((l, r) => ((r.date || r.time) - (l.date || l.time))).slice(0, 120);
	}
	
	for(var trd of trds) {
		const title = totitle(trd.title, trd.namespace) + '';
		
		content += `
			<tr>
				<td>
					${trd.state
						? `<a href="/edit_request/${minor >= 16 ? trd.slug : trd.id}">편집 요청 ${html.escape(minor >= 16 ? trd.slug : trd.id)}</a> (<a href="/discuss/${encodeURIComponent(title)}">${html.escape(title)}</a>)`
						: `<a href="/thread/${minor >= 16 ? trd.slug : trd.tnum}">${html.escape(trd.topic)}</a> (<a href="/discuss/${encodeURIComponent(title)}">${html.escape(title)}</a>)`
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
	
	res.send(await render(req, '최근 토론', content, {}));
});

wiki.get(/^\/contribution\/(ip|author)\/(.+)\/discuss$/, async function discussionLog(req, res) {
	const ismember = req.params[0];
	const username = req.params[1];
	
	var dd = await curs.execute("select id, tnum, time, username, ismember from res \
				where cast(time as integer) >= ? and ismember = ? and lower(username) = ? order by cast(time as integer) desc", [
					Number(getTime()) - 2592000000, ismember, username.toLowerCase()
				]);
	
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
						<a href="/thread/${row.tnum}#${row.id}">#${row.id} ${html.escape(td['topic'])}</a> (<a href="/w/${encodeURIComponent(title)}">${html.escape(title)}</a>)
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
	
	res.send(await render(req, `"${username}" 기여 목록`, content, {}));
});

wiki.get(/^\/history\/(.*)/, async function viewHistory(req, res) {
	var title = req.params[0];
	const doc = processTitle(title);
	title = totitle(doc.title, doc.namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.status(403).send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var total = (await curs.execute("select count(rev) from history where title = ? and namespace = ?", [doc.title, doc.namespace]))[0]['count(rev)'];
	var data;
	const from = req.query['from'];
	const until = req.query['until'];
	if(from) {
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
	if(!data.length) return res.send(await showError(req, 'document_not_found'));
	
	const navbtns = navbtn(total, data[data.length-1].rev, data[0].rev, '/history/' + encodeURIComponent(title));
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
							<a rel=nofollow href="/revert/${encodeURIComponent(title)}?rev=${row.advance == 'revert' ? Number(row.flags) : row.rev}">이 리비젼으로 되돌리기</a>${
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
	
	res.send(await render(req, totitle(doc.title, doc.namespace) + '의 역사', content, {
		document: doc,
	}, '', null, 'history'));
});

wiki.get(/^\/discuss\/(.*)/, async function threadList(req, res) {
	const title = req.params[0];
	const doc = processTitle(title);
	
	var state = req.query['state'];
	if(!state) state = '';
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var content = '';
	
	var trdlst;
	
	var subtitle = '';
	var viewname = '';
	
	if(state == 'close') {
		content += '<ul class=wiki-list>';
		
		var cnt = 0;
		trdlst = await curs.execute("select topic, tnum from threads where title = ? and namespace = ? and status = 'close' and not deleted = '1' order by cast(time as integer) desc", [doc.title, doc.namespace]);
		
		for(var trd of trdlst) {
			content += `<li>${++cnt}. <a href="/thread/${trd.tnum}">${html.escape(trd.topic)}</a></li>`;
		}
		
		content += '</ul>';
		
		subtitle = ' (닫힌 토론)';
		viewname = 'thread_list_close';
	} else if(state == 'closed_edit_requests') {
		content += '<ul class=wiki-list>';
		
		trdlst = await curs.execute("select id from edit_requests where state = 'closed' and not deleted = '1' and title = ? and namespace = ? order by cast(date as integer) desc", [doc.title, doc.namespace]);
		
		for(var trd of trdlst) {
			content += `<li><a href="/edit_request/${trd.id}">편집 요청 ${trd.id}</a></li>`;
		}
		
		content += '</ul>';
		
		subtitle = ' (닫힌 편집 요청)';
		viewname = 'edit_request_list_close';
	} else {
		/*
		{
		  document: { namespace: '나무위키', title: '대문' },
		  thread_list: [
			{
			  discuss: [Array],
			  slug: 'AFantasticAndTestyNoise',
			  topic: '토론 생성 전 꼭 확인 바랍니다.'
			}
		  ],
		  editRequests: [],
		  captcha: true,
		  deleteThread: false,
		  body: {}
		}
		*/
	
		content += `
			<h3 class="wiki-heading">편집 요청</h3>
			<div class=wiki-heading-content>
				<ul class=wiki-list>
		`;
		
		var editRequests = [];
		var captcha = false;
		var deleteThread = !!getperm('delete_thread', ip_check(req));
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
		trdlst = await curs.execute("select topic, tnum from threads where title = ? and namespace = ? and not status = 'close' and not deleted = '1' order by cast(time as integer) desc", [doc.title, doc.namespace]);
		
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
		var thread_list = [];
		for(var trd of trdlst) {
			content += `
				<h2 class=wiki-heading id="${++cnt}">
					${cnt}. <a href="/thread/${trd.tnum}">${html.escape(trd.topic)}</a>
				</h2>
				
				<div class=topic-discuss>
			`;
			
			const d = {
				slug: trd.tnum,
				topic: trd.topic,
				discuss: [],
			};
			
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
								<span class=num>#${rs['id']}</span> ${ip_pas(rs['username'], rs['ismember'], 1).replace('<a ', rs.isadmin == '1' ? '<a style="font-weight: bold;" ' : '<a ')} <span class=pull-right>${generateTime(toDate(rs['time']), timeFormat)}</span>
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
				
				const t = {
					id: rs.id, 
					text: rs.content, 
					date: Math.floor(Number(rs.time / 1000)), 
					hide_author: rs.hidden == '1' ? rs.hider : null, 
					type: rs.status == '1' ? 'status' : 'normal', 
					admin: rs.isadmin == '1' ? true : false };
				t[rs.ismember] = rs.username;
				d.discuss.push(t);
			}
			content += '</div>';
			
			thread_list.push(d);
		}
			
		content += `
			<h3 class="wiki-heading">새 주제 생성</h3>
			
			${doc + '' == (config.getString('wiki.front_page', 'FrontPage')) ? `
				<div class="alert alert-success alert-dismissible fade in" role="alert">
					<strong>[경고!]</strong> 이 토론은 ${doc + ''} 문서의 토론입니다. ${doc + ''} 문서와 관련 없는 토론은 각 문서의 토론에서 진행해 주시기 바랍니다. ${doc + ''} 문서와 관련 없는 토론은 삭제될 수 있습니다.
				</div>
			` : ''}
			
			<form method=post class="new-thread-form" id="topicForm">
				<input type="hidden" name="identifier" value="${islogin(req) ? 'm' : 'i'}:${ip_check(req)}">
				<div class="form-group">
					<label class=control-label for="topicInput" style="margin-bottom: 0.2rem;">주제 :</label>
					<input type="text" class=form-control id="topicInput" name="topic">
				</div>

				<div class="form-group">
				<label class=control-label for="contentInput" style="margin-bottom: 0.2rem;">내용 :</label>
					<textarea name="text" class=form-control id="contentInput" rows="5"></textarea>
				</div>
				
				${islogin(req) ? '' : `<p style="font-weight: bold; font-size: 1rem;">[알림] 비로그인 상태로 토론 주제를 생성합니다. 토론 내역에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
				
				<div class="btns">
					<button id="createBtn" class="btn btn-primary" style="width: 8rem;">전송</button>
				</div>

				<!--
				<div id="recaptcha"><div><noscript>Aktiviere JavaScript, um eine reCAPTCHA-Aufgabe zu erhalten.&lt;br&gt;</noscript><div class="if-js-enabled">Führe ein Upgrade auf einen <a href="http://web.archive.org/web/20171027095753/https://support.google.com/recaptcha/?hl=en#6223828">unterstützten Browser</a> aus, um eine reCAPTCHA-Aufgabe zu erhalten.</div><br>Wenn du meinst, dass diese Seite fälschlicherweise angezeigt wird, überprüfe bitte deine Internetverbindung und lade die Seite neu.<br><br><a href="http://web.archive.org/web/20171027095753/https://support.google.com/recaptcha#6262736" target="_blank">Warum gerade ich?</a></div></div>
				<script>
					recaptchaInit('recaptcha', {
						'sitekey': '',
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
	
	res.send(await render(req, totitle(doc.title, doc.namespace) + subtitle, content, {
		document: doc,
		deleteThread,
		captcha,
		thread_list,
		editRequests,
	}, '', null, viewname));
});

wiki.post(/^\/discuss\/(.*)/, async function createThread(req, res) {
	const title = req.params[0];
	const doc = processTitle(title);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'create_thread', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_create_thread', msg: aclmsg }));
	
	if(!req.body['topic']) return res.send(await showError(req, { code: 'validator_required', tag: 'topic' }));
	if(!req.body['text']) return res.send(await showError(req, { code: 'validator_required', tag: 'text' }));
	
	var tnum;
	do {
		tnum = rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 22);
		var dd = await curs.execute("select tnum from threads where tnum = ?", [tnum]);
		if(!dd.length) break;
	} while(1);
	const newid = newID();
	
	await curs.execute("insert into threads (title, namespace, topic, status, time, tnum, slug) values (?, ?, ?, ?, ?, ?, ?)",
					[doc.title, doc.namespace, req.body['topic'], 'normal', getTime(), tnum, newid]);
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin, slug) values \
					(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
					['1', req.body['text'], ip_check(req), getTime(), '0', '', '0', tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0', newid]);
					
	res.redirect('/thread/' + tnum);
});

wiki.get(/^\/topic\/(\d+)$/, async(req, res, next) => {
	const num = req.params[0];
	var data = await curs.execute("select tnum from threads where num = ?", [num]);
	if(data.length) return res.redirect('/thread/' + data[0].tnum);
	next();
});

/* if(minor >= 16) wiki.get(/^\/thread\/([a-zA-Z0-9]{18,24})$/, async(req, res, next) => {
	const tnum = req.params[0];
	var data = await curs.execute("select slug, tnum from threads where tnum = ?", [tnum]);
	if(data.length && tnum != data[0].slug) return res.redirect('/thread/' + data[0].slug);
	next();
}); */

wiki.get(minor >= 16 ? /^\/thread\/([a-zA-Z0-9]+)$/ : /^\/thread\/([a-zA-Z0-9]{18,24})$/, async function viewThread(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var data = await curs.execute("select title, namespace, topic, status, slug from threads where tnum = ?", [tnum]);
	const { title, topic, status, namespace } = data[0];
	const doc = totitle(title, namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
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
			<div class="res-wrapper res-loading" data-id=${i} data-locked=false data-visible=false>
				<div class="res res-type-normal">
					<div class=r-head>
						<span class=num><a id="${i}">#${i}</a>&nbsp;</span>
					</div>
					
					<div class=r-body></div>
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
		
		if(status == 'close')
			sts = `
				<option value=normal>normal</option>
				<option value=pause>pause</option>
			`;
		if(status == 'normal')
			sts = `
				<option value=close>close</option>
				<option value=pause>pause</option>
			`;
		if(status == 'pause')
			sts = `
				<option value=close>close</option>
				<option value=normal>normal</option>
			`;
		
		content += `
		    <form method=post id=thread-status-form>
        		[ADMIN] 쓰레드 상태 변경
        		<select name=status>${sts}</select>
        		<button id=changeBtn class="d_btn type_blue">변경</button>
        	</form>
		`;
	}
	
	if(getperm('update_thread_document', ip_check(req)) && (minor >= 5 || (minor == 4 && revision >= 3))) {
		content += `
        	<form method=post id=thread-document-form>
        		[ADMIN] 쓰레드 이동
        		<input type=text name=document value="${doc}">
        		<button id=changeBtn class="d_btn type_blue">변경</button>
        	</form>
		`;
	}
	
	if(getperm('update_thread_topic', ip_check(req)) && (minor >= 5 || (minor == 4 && revision >= 3))) {
		content += `
        	<form method=post id=thread-topic-form>
        		[ADMIN] 쓰레드 주제 변경
        		<input type=text name=topic value="${topic}">
        		<button id=changeBtn class="d_btn type_blue">변경</button>
        	</form>
		`;
	}
	
	content += `
		<form id=new-thread-form method=post>
			<textarea class=form-control${['close', 'pause'].includes(status) ? ' readonly disabled' : ''} rows=5 name=text>${status == 'pause' ? 'pause 상태입니다.' : (status == 'close' ? '닫힌 토론입니다.' : '')}</textarea>
		
			${islogin(req) ? '' : `<p style="font-weight: bold; font-size: 1rem;">[알림] 비로그인 상태로 토론에 참여합니다. 토론 내역에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
			
			<div class=btns>
				<button type=submit class="btn btn-primary" style="width: 120px;"${['close', 'pause'].includes(status) ? ' disabled' : ''}>전송</button>
			</div>
		</form>
	`;
	
	res.send(await render(req, totitle(title, namespace) + ' (토론) - ' + topic, content, {
		document: doc,
	}, '', null, 'thread'));
});

wiki.post(/^\/thread\/([a-zA-Z0-9]{18,24})$/, async function postThreadComment(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var data = await curs.execute("select title, namespace, topic, status, slug from threads where tnum = ?", [tnum]);
	const { title, topic, status, namespace } = data[0];
	const doc = totitle(title, namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'write_thread_comment', 1);
	if(aclmsg) return res.status(403).json({ status: aclmsg });
	if(['close', 'pause'].includes(status)) return res.status(403).json({});
	if(!req.body['text']) return res.status(400).json({ status: err('error', { code: 'validator_required', tag: 'text' }) + '' });
	
	var data = await curs.execute("select id from res where tnum = ? order by cast(id as integer) desc limit 1", [tnum]);
	const lid = Number(data[0].id);
	
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin) \
					values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
						String(lid + 1), req.body['text'], ip_check(req), getTime(), '0', '', '0', tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0'
					]);
	await curs.execute("update threads set time = ? where tnum = ?", [getTime(), tnum]);
	
	res.json({});
});

wiki.get(/^\/thread\/([a-zA-Z0-9]{18,24})\/(\d+)$/, async function sendThreadData(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	const tid = req.params[1];
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var data = await curs.execute("select username from res where tnum = ? and (id = '1')", [tnum]);
	const fstusr = data[0]['username'];
	
	var data = await curs.execute("select title, namespace, topic, status, slug from threads where tnum = ?", [tnum]);
	const { title, topic, status, namespace } = data[0];
	const doc = totitle(title, namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	content = ``;
	var data = await curs.execute("select isadmin, type, id, content, username, time, hidden, hider, status, ismember from res where tnum = ? and (cast(id as integer) = 1 or (cast(id as integer) >= ? and cast(id as integer) < ?)) order by cast(id as integer) asc", [tnum, Number(tid), Number(tid) + 30]);
	for(var rs of data) {
		var rescontent = rs.status == 1
			? (
				rs.type == 'status'
				? ((minor >= 5 || (minor == 4 && revision >= 3)) ? ('스레드 상태를 <strong>' + rs.content + '</strong>로 변경') : ('토픽 상태를 ' + rs.content + '로 변경'))
				: (
					rs.type == 'document'
					? '스레드를 <strong>' + rs.content + '</strong> 문서로 이동'
					: '스레드 주제를 <strong>' + rs.content + '</strong>로 변경'
				)
			) : await markdown(rs.content, 1);
		
		if(rs.hidden == '1') {
			var rc = rescontent;
			rescontent = '[' + rs.hider + '에 의해 숨겨진 글입니다.]';
			if(getperm('hide_thread_comment', ip_check(req))) {
				if(minor >= 13) {
					rescontent += '<a class="btn btn-danger" onclick="$(this).parent().attr(\'class\', \'r-body\'); $(this).parent().html($(this).parent().children(\'.hidden-content\').html()); return false;">[ADMIN] SHOW</a><div class=hidden-content style="display:none">' + rc + '</div>';
				} else {
					rescontent += '<div class=text-line-break style="margin: 25px 0px 0px -10px; display:block"><a class=text onclick="$(this).parent().parent().children(\'.hidden-content\').show(); $(this).parent().css(\'margin\', \'15px 0 15px -10px\'); $(this).hide(); return false;" style="display: block; color: #fff;">[ADMIN] Show hidden content</a><div class=line></div></div><div class=hidden-content style="display:none">' + rc + '</div>';
				}
			}
		}
		
		content += `
			<div class=res-wrapper data-id="${rs.id}">
				<div class="res res-type-${rs.status == '1' ? 'status' : 'normal'}">
					<div class="r-head${rs.username == fstusr ? ' first-author' : ''}">
						<span class=num>
							<a id="${rs.id}">#${rs.id}</a>&nbsp;
						</span> ${ip_pas(rs.username, rs.ismember, 1).replace('<a ', rs.isadmin == '1' ? '<a style="font-weight: bold;" ' : '<a ')}${rs['ismember'] == 'author' && await userblocked(rs.username) ? ` <small>(${(minor >= 12 || (minor == 11 && revision >= 3)) ? '차단됨' : '차단된 사용자'})</small>` : ''}${rs.ismember == 'ip' && await ipblocked(rs.username) ? ` <small>(${(minor >= 12 || (minor == 11 && revision >= 3)) ? '차단됨' : '차단된 아이피'})</small>` : ''} <span class=pull-right>${generateTime(toDate(rs.time), timeFormat)}</span>
					</div>
					
					<div class="r-body${rs.hidden == '1' ? ' r-hidden-body' : ''}">
						${rescontent}
					</div>
		`;
		if(getperm('hide_thread_comment', ip_check(req))) {
			content += `
				<div class="combo admin-menu">
					<a class="btn btn-danger btn-sm" href="/admin/thread/${tnum}/${rs.id}/${rs.hidden == '1' ? 'show' : 'hide'}">[ADMIN] 숨기기${rs.hidden == '1' ? ' 해제' : ''}</a>
				</div>
			`;
		}
		content += `
				</div>
			</div>
		`;
	}
	
	res.send(content);
});

wiki.get(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/(\d+)\/show$/, async function showHiddenComment(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	const tid = req.params[1];
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	if(!getperm('hide_thread_comment', ip_check(req))) return res.send(await showError(req, 'permission'));
	await curs.execute("update res set hidden = '0', hider = '' where tnum = ? and id = ?", [tnum, tid]);
	
	res.redirect('/thread/' + tnum);
});

wiki.get(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/(\d+)\/hide$/, async function hideComment(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	const tid = req.params[1];
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	if(!getperm('hide_thread_comment', ip_check(req))) return res.send(await showError(req, 'permission'));
	await curs.execute("update res set hidden = '1', hider = ? where tnum = ? and id = ?", [ip_check(req), tnum, tid]);
	
	res.redirect('/thread/' + tnum);
});

wiki.post(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/status$/, async function updateThreadStatus(req, res) {
	if(!getperm('update_thread_status', ip_check(req))) return res.status(403).send(await showError(req, 'permission'));
	
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var newstatus = req.body['status'];
	if(!['close', 'pause', 'normal'].includes(newstatus)) res.status(400).send('');
	
	await curs.execute("update threads set time = ?, status = ? where tnum = ?", [getTime(), newstatus, tnum]);
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin, type) \
					values (?, ?, ?, ?, '0', '', '1', ?, ?, ?, 'status')", [
						String(rescount + 1), newstatus, ip_check(req), getTime(), tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0' 
					]);
	
	res.json({});
});

wiki.post(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/document$/, async function updateThreadDocument(req, res) {
	if(!getperm('update_thread_document', ip_check(req))) return res.status(403).send(await showError(req, 'permission'));
	
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var newdoc = req.body['document'];
	if(!newdoc.length) return res.status(400).send('');
	var dd = processTitle(newdoc);
	
	var aclmsg = await getacl(req, dd.title, dd.namespace, 'create_thread', 1);
	if(aclmsg) return res.json({
		status: aclmsg,
	});
	
	await curs.execute("update threads set time = ?, title = ?, namespace = ? where tnum = ?", [getTime(), dd.title, dd.namespace, tnum]);
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin, type) \
					values (?, ?, ?, ?, '0', '', '1', ?, ?, ?, 'document')", [
						String(rescount + 1), newdoc, ip_check(req), getTime(), tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0' 
					]);
	
	res.json({});
});

wiki.post(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/topic$/, async function updateThreadTopic(req, res) {
	if(!getperm('update_thread_topic', ip_check(req))) return res.status(403).send(await showError(req, 'permission'));
	
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	var rescount = data.length;
	var data = await curs.execute("select deleted from threads where tnum = ?", [tnum]);
	if(data.length && data[0].deleted == '1') rescount = 0;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));

	var newtopic = req.body['topic'];
	if(!newtopic.length) return res.status(400).send('');
		
	await curs.execute("update threads set time = ?, topic = ? where tnum = ?", [getTime(), newtopic, tnum]);
	await curs.execute("insert into res (id, content, username, time, hidden, hider, status, tnum, ismember, isadmin, type) \
					values (?, ?, ?, ?, '0', '', '1', ?, ?, ?, 'topic')", [
						String(rescount + 1), newtopic, ip_check(req), getTime(), tnum, islogin(req) ? 'author' : 'ip', getperm('admin', ip_check(req)) ? '1' : '0' 
					]);
	
	res.json({});
});

wiki.get(/^\/admin\/thread\/([a-zA-Z0-9]{18,24})\/delete/, async function deleteThread(req, res) {
	if(!getperm('delete_thread', ip_check(req))) return res.send(await showError(req, 'permission'));
	
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var data = await curs.execute("select id from res where tnum = ?", [tnum]);
	const rescount = data.length;
	if(!rescount) return res.send(await showError(req, 'thread_not_found'));
	
	var data = await curs.execute("select title, namespace from threads where tnum = ?", [tnum]);
	const title = totitle(data[0].title, data[0].namespace) + '';
	
	await curs.execute("update threads set deleted = '1' where tnum = ?", [tnum]);
	res.redirect('/discuss/' + encodeURIComponent(title));
});

wiki.post(/^\/notify\/thread\/([a-zA-Z0-9]{18,24})$/, async function notifyEvent(req, res) {
	var tnum = req.params[0];
	var slug = tnum;
	var data = await curs.execute("select tnum from threads where slug = ?", [tnum]);
	if(data.length) tnum = data[0].tnum;
	
	var dd = await curs.execute("select id from res where tnum = ?", [tnum]);
	const rescount = dd.length;
	if(!rescount) return res.send(await showError(req, "thread_not_found"));	
	var data = await curs.execute("select id from res where tnum = ? order by cast(time as integer) desc limit 1", [tnum]);
	res.json({
		status: 'event',
		comment_id: Number(data[0].id),
	});
});

wiki.all(/^\/delete\/(.*)/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 2);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_edit', msg: aclmsg }));
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'delete', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_delete', msg: aclmsg }));
	
	const o_o = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!o_o.length) return res.send(await showError(req, 'document_not_found'));
	
	var content = `
		<form id=deleteForm method=post>
            <div class=form-group>
				<label class=control-label for=logInput>요약</label>
				<input type=text id=logInput name=log class=form-control />
			</div>
			
            <label>
				<label><input type=checkbox name=agree id=agreeCheckbox value=Y /> 문서 이동 목적이 아닌, 삭제하기 위함을 확인합니다.</label>
            </label>
			
            <p>
				<b>알림!&nbsp;:</b>&nbsp;문서의 제목을 변경하려는 경우 <a href="/move/${encodeURIComponent(doc + '')}">문서 이동</a> 기능을 사용해주세요. 문서 이동 기능을 사용할 수 없는 경우 토론 기능이나 게시판을 통해 대행 요청을 해주세요.
            </p>

            <div class=btns>
				<button type=reset class="btn btn-secondary">초기화</button>
				<button type=submit class="btn btn-primary" id=submitBtn>삭제</button>
            </div>
       </form>
	`;
	
	var error = null;
	if(req.method == 'POST') do {
		if(doc.namespace == '사용자')
			if((minor >= 11 && !doc.title.includes('/')) || minor < 11) {
				content = (error = err('alert', 'disable_user_document')) + content;
				break;
			}
		
		if(!req.body['agree']) {
			content = (error = err('alert', 'validator_required', 'agree')) + content;
			break;
		}
		
		const _recentRev = await curs.execute("select content, rev from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
		const recentRev = _recentRev[0];
		
		await curs.execute("delete from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		const rawChanges = 0 - recentRev.content.length;
		curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
			doc.title, doc.namespace, '', String(Number(recentRev.rev) + 1), ip_check(req), getTime(), '' + (rawChanges), req.body['log'] || '', '0', '-1', islogin(req) ? 'author' : 'ip', 'delete'
		]);
		curs.execute("update documents set time = ? where title = ? and namespace = ?", [doc.title, doc.namespace]);
		return res.redirect('/w/' + encodeURIComponent(doc + ''));
	} while(0);
	
	res.send(await render(req, doc + ' (삭제)', content, {
		document: doc,
	}, '', null, 'delete'));
});

wiki.all(/^\/move\/(.*)/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 2);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_edit', msg: aclmsg }));
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'move', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_move', msg: aclmsg }));
	
	const o_o = await curs.execute("select title from history where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!o_o.length) return res.send(await showError(req, 'document_not_found'));
	
	// 원래 이랬나...?
	var content = `
		<form method=post id=moveForm>
			<div>
				<label>변경할 문서 제목 : </label><br />
				<input name=title type=text style="width: 250px;" id=titleInput />
			</div>
			
			<div>
				<label>요약 : </label><br />
				<input style="width: 600px;" name=log type=text id=logInput />
			</div>
			
			<div>
				<label>문서를 서로 맞바꾸기 : </label><br />
				<input type=checkbox name=mode value=swap />
			</div>
			
			<div>
				<button type=submit>이동</button>
			</div>
		</form>
	`;
	
	var error = null;
	
	if(req.method == 'POST') do {
		if(doc.namespace == '사용자')
			if((minor >= 11 && !doc.title.includes('/')) || minor < 11) {
				content = (error = err('alert', 'disable_user_document')) + content;
				break;
			}
		
		var doccontent = '';
		const o_o = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		if(o_o.length) {
			doccontent = o_o[0].content;
		}
		
		const _recentRev = await curs.execute("select content, rev from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
		const recentRev = _recentRev[0];
		
		if(!req.body['title']) {
			content = (error = err('alert', { code: 'validator_required', tag: 'title' })) + content;
			break;
		}
		
		const newdoc = processTitle(req.body['title']);
		
		var aclmsg = await getacl(req, newdoc.title, newdoc.namespace, 'read', 1);
		if(aclmsg) {
			return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
		}
		
		var aclmsg = await getacl(req, newdoc.title, newdoc.namespace, 'edit', 2);
		if(aclmsg) {
			return res.send(await showError(req, { code: 'permission_edit', msg: aclmsg }));
		}
		
		if(req.body['mode'] == 'swap') {
			return res.send(await showError(req, 'feature_not_implemented'));
		} else {
			const d_d = await curs.execute("select rev from history where title = ? and namespace = ?", [newdoc.title, newdoc.namespace]);
			if(d_d.length) {
				return res.send(await showError(req, '문서가 이미 존재합니다.', 1));
			}
			
			await curs.execute("update documents set title = ?, namespace = ? where title = ? and namespace = ?", [newdoc.title, newdoc.namespace, doc.title, doc.namespace]);
			await curs.execute("update acl set title = ?, namespace = ? where title = ? and namespace = ?", [newdoc.title, newdoc.namespace, doc.title, doc.namespace]);
			curs.execute("update threads set title = ?, namespace = ? where title = ? and namespace = ?", [newdoc.title, newdoc.namespace, doc.title, doc.namespace]);
			curs.execute("update edit_requests set title = ?, namespace = ? where title = ? and namespace = ?", [newdoc.title, newdoc.namespace, doc.title, doc.namespace]);
			curs.execute("update history set title = ?, namespace = ? where title = ? and namespace = ?", [newdoc.title, newdoc.namespace, doc.title, doc.namespace]);
		}
		
		curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, flags) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
			newdoc.title, newdoc.namespace, doccontent, String(Number(recentRev.rev) + 1), ip_check(req), getTime(), '0', req.body['log'] || '', '0', '-1', islogin(req) ? 'author' : 'ip', 'move', doc.title + '\n' + newdoc.title
		]);
		curs.execute("update documents set time = ? where title = ? and namespace = ?", [doc.title, doc.namespace]);
		return res.redirect('/w/' + encodeURIComponent(newdoc + ''));
	} while(0);
	
	res.send(await render(req, doc + ' (이동)', content, {
		document: doc,
	}, '', error, 'move'));
});

if(minor < 18) wiki.all(/^\/admin\/suspend_account$/, async(req, res) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!hasperm(req, 'suspend_account')) return res.status(403).send(await showError(req, 'permission'));
	
	var content = `
		<form method=post>
			<div>
				<label>유저 이름 : </label>
				<input class=form-control id=usernameInput name=username style="width: 250px;" value="${req.method == 'POST' ? html.escape(req.body['username'] || '') : ''}" type=text />
			</div>
			
			<div>
				<label>메모 : </label>
				<input class=form-control id=noteInput name=note style="width: 400px;" value="${req.method == 'POST' ? html.escape(req.body['note'] || '') : ''}" type=text />
			</div>
			
			<div>
				<label>기간 : </label> 
				<select class=form-control name=expire id=expireSelect>
					${expireopt(req)}
				</select>
			</div>
			
			<button class="btn btn-info pull-right" id=moveBtn style="width: 100px;" type=submit>확인</button>
		</form>
	`;
	
	var error = null;
	
	if(req.method == 'POST') do {
		var { expire, note, username } = req.body;
		if(!username) { content = (error = err('alert', { code: 'validator_required', tag: 'username' })) + content; break; }
		if((hostconfig.owners || []).includes(username)) { content = (error = err('alert', { code: 'invalid_permission' })) + content; break; }
		var data = await curs.execute("select username from users where lower(username) = ?", [username.toLowerCase()]);
		if(!data.length) { content = (error = err('alert', { code: 'invalid_username' })) + content; break; }
		username = data[0].username;
		if(!note) { content = (error = err('alert', { code: 'validator_required', tag: 'note' })) + content; break; }
		if(!expire) { content = (error = err('alert', { code: 'validator_required', tag: 'expire' })) + content; break; }
		if(isNaN(Number(expire))) { content = (error = err('alert', { code: 'invalid_type_number', tag: 'expire' })) + content; break; }
		if(Number(expire) > 29030400) { content = (error = err('alert', { msg: 'expire의 값은 29030400 이하이어야 합니다.' })) + content; break; }
		if(expire == '-1') {
			if(!(await userblocked(username))) { content = (error = err('alert', { code: 'already_unsuspend_account' })) + content; break; }
			curs.execute("delete from suspend_account where username = ?", [username]);
			var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
			if(data.length) logid = Number(data[0].logid) + 1;
			insert('block_history', {
				date: getTime(),
				type: 'suspend_account',
				duration: '-1',
				note,
				ismember: islogin(req) ? 'author' : 'ip',
				executer: ip_check(req),
				target: username,
				logid,
			});
			return res.redirect('/admin/suspend_account');
		}
		if(await userblocked(username)) { content = (error = err('alert', { code: 'already_suspend_account' })) + content; break; }
		const date = getTime();
		const expiration = expire == '0' ? '0' : String(Number(date) + Number(expire) * 1000);
		
		curs.execute("insert into suspend_account (username, date, expiration, note) values (?, ?, ?, ?)", [username, String(getTime()), expiration, note]);
		var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
		if(data.length) logid = Number(data[0].logid) + 1;
		insert('block_history', {
			date: getTime(),
			type: 'suspend_account',
			duration: expire,
			note,
			ismember: islogin(req) ? 'author' : 'ip',
			executer: ip_check(req),
			target: username,
			logid,
		});
		
		return res.redirect('/admin/suspend_account');
	} while(0);
	
	return res.send(await render(req, '사용자 차단', content, {}, '', error, 'suspend_account'));
});

wiki.all(/^\/admin\/grant$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	var username = req.query['username'];
	if(!getperm('grant', ip_check(req))) return res.send(await showError(req, 'permission'));
	
	var error = null;
	var content = `
		<form method=get>
			<div>
				<label>유저 이름 :</label>
				<input type=text id=usernameInput class=form-control style="width: 250px;" name=username value="${html.escape(username ? username : '')}" />
				<button type=submit class="btn btn-info pull-right" style="width: 100px;">확인</button>
			</div>
		</form>
		<br />
	`;
	if(username === undefined) return res.send(await render(req, '권한 부여', content, {}, _, error, 'grant'));
	if(!username) return res.send(await render(req, '권한 부여', (error = err('alert', { code: 'validator_required', tag: 'username' })) + content, {}, _, error, 'grant'));
	var data = await curs.execute("select username from users where lower(username) = ?", [username.toLowerCase()]);
	if(!data.length) 
		return res.send(await render(req, '권한 부여', (error = err('alert', { code: 'invalid_username' })) + content, {}, _, error, 'grant'));
	username = data[0].username;
	
	var chkbxs = '';
	for(var prm of perms) {
		// if(!getperm('developer', ip_check(req), 1) && 'developer' == (prm)) continue;
		chkbxs += `
			${prm} <input type=checkbox ${getperm(prm, username, 1) ? 'checked' : ''} name=permissions value="${prm}" /><br />
		`;
	}
	
	content += `
		<h3>사용자 ${html.escape(username)}</h3>
	
		<form method=post>
			<div>
				${chkbxs}
			</div>
			
			<button type=submit class="btn btn-info pull-right" style="width: 100px;">확인</button>
		</form>
	`;
	
	if(req.method == 'POST') {
		if(!username) return res.send(await showError(req, 'invalid_username'));
		var data = await curs.execute("select username from users where username = ?", [username]);
		if(!data.length) return res.send(await showError(req, 'invalid_username'));
		
		var prmval = req.body['permissions'];
		if(!prmval || !prmval.find) prmval = [prmval];
		
		var logstring = '';
		for(var prm of perms) {
			// if(!getperm('developer', ip_check(req), 1) && 'developer' == (prm)) continue;
			if(getperm(prm, username, 1) && (typeof(prmval.find(item => item == prm)) == 'undefined')) {
				logstring += '-' + prm + ' ';
				if(permlist[username]) permlist[username].splice(permlist[username].findIndex(item => item == prm), 1);
				curs.execute("delete from perms where perm = ? and username = ?", [prm, username]);
			} else if(!getperm(prm, username, 1) && (typeof(prmval.find(item => item == prm)) != 'undefined')) {
				logstring += '+' + prm + ' ';
				if(!permlist[username]) permlist[username] = [prm];
				else permlist[username].push(prm);
				curs.execute("insert into perms (perm, username) values (?, ?)", [prm, username]);
			}
		}
		if(!logstring.length)
			return res.send(await render(req, '권한 부여', (error = err('alert', { code: 'no_change' })) + content, {}, _, error, 'grant'));
		
		var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
		if(data.length) logid = Number(data[0].logid) + 1;
		insert('block_history', {
			date: getTime(),
			type: 'grant',
			note: logstring,
			ismember: islogin(req) ? 'author' : 'ip',
			executer: ip_check(req),
			target: username,
			logid,
		});
		
		return res.redirect('/admin/grant?username=' + encodeURIComponent(username));
	}
	
	res.send(await render(req, '권한 부여', content, {}, _, _, 'grant'));
});

wiki.all(/^\/admin\/login_history$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!getperm('grant', ip_check(req))) return res.send(await showError(req, 'permission'));
	
	var error = null;
	var content = `
		<form method=post>
			<div>
				<label>유저 이름 :</label>
				<input type=text id=usernameInput class=form-control style="width: 250px;" name=username />
			</div>
			
			<button type=submit class="btn btn-info pull-right" style="width: 100px;">확인</button>
		</form>
	`;
	
	if(req.method == 'POST') {
		var username = req.body['username'];
		if(!username) return res.send(await render(req, '로그인 내역', (error = err('alert', { code: 'validator_required', tag: 'username' })) + content, {}, _, error, 'login_history'));
		var data = await curs.execute("select username from users where lower(username) = ?", [username.toLowerCase()]);
		if(!data.length)
			return res.send(await render(req, '로그인 내역', (error = err('alert', { code: 'invalid_username' })) + content, {}, _, error, 'login_history'));
		username = data[0].username;
		
		const id = rndval('abcdef1234567890', 64);
		if(!loginHistory[ip_check(req)]) loginHistory[ip_check(req)] = {};
		var history = await curs.execute("select ip, time from login_history where username = ? order by cast(time as integer) desc limit 50", [username]);
		var ua = await curs.execute("select string from useragents where username = ?", [username]);
		loginHistory[ip_check(req)][id] = { username, useragent: (ua[0] || { string: '' }).string, history };
		
		var logid = 1, lgdata = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
		if(lgdata.length) logid = Number(lgdata[0].logid) + 1;
		insert('block_history', {
			date: getTime(),
			type: 'login_history',
			duration: 0,
			note: '',
			ismember: islogin(req) ? 'author' : 'ip',
			executer: ip_check(req),
			target: username,
			logid,
		});
		
		return res.redirect('/admin/login_history/' + id);
	}
	
	return res.send(await render(req, '로그인 내역', content, {}, _, _, 'login_history'));
});

wiki.get(/^\/admin\/login_history\/(.+)$/, async(req, res) => {
	const id = req.params[0];
	
	if(!loginHistory[ip_check(req)] || (loginHistory[ip_check(req)] && !loginHistory[ip_check(req)][id]))
		return res.redirect('/admin/login_history');
	
	const { username, history, useragent } = loginHistory[ip_check(req)][id];
	
	var content = `
		<p>마지막 로그인 UA : ${html.escape(useragent)}</p>
		<p>이메일 : ${getUserSetting(username, 'email', '')}
		
		${navbtn(0, 0, 0, 0)}
		
		<div class=wiki-table-wrap>
			<table class=wiki-table>
				<tbody>
					<tr>
						<th>Date</th>
						<th>IP</th>
					</tr>
	`;
	
	for(var item of history) {
		content += `<tr><td>${generateTime(toDate(item.time), timeFormat)}</td><td>${item.ip}</td></tr>`;
	}
	
	content += `
				</tbody>
			</table>
		</div>
		${navbtn(0, 0, 0, 0)}
	`;
	
	return res.send(await render(req, username + ' 로그인 내역', content, {}, _, _, 'login_history'));
});

if(minor < 18) wiki.post(/^\/admin\/ipacl\/remove$/, async(req, res) => {
	if(!hasperm(req, 'ipacl')) return res.status(403).send(await showError(req, 'permission'));
	if(!req.body['ip']) return res.status(400).send(await showError(req, { code: 'validator_required', tag: 'ip' }));
	var dbdata = await curs.execute("select cidr from ipacl where cidr = ?", [req.body['ip']]);
	if(!dbdata.length) return res.status(400).send(await showError(req, 'invalid_value'));
	await curs.execute("delete from ipacl where cidr = ?", [req.body['ip']]);
	var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
	if(data.length) logid = Number(data[0].logid) + 1;
	insert('block_history', {
		date: getTime(),
		type: 'ipacl_remove',
		ismember: islogin(req) ? 'author' : 'ip',
		executer: ip_check(req),
		target: req.body['ip'],
		logid,
	});
	return res.redirect('/admin/ipacl');
});

if(minor < 18) wiki.all(/^\/admin\/ipacl$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!hasperm(req, 'ipacl')) return res.status(403).send(await showError(req, 'permission'));
	const { from, until } = req.query;
	var error = null;
	
	await curs.execute("delete from ipacl where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	var ld   = await curs.execute("select cidr from ipacl order by cidr desc limit 1");
	var fd   = await curs.execute("select cidr from ipacl order by cidr asc limit 1");
	var data = await curs.execute("select cidr, al, expiration, note, date from ipacl " + (from ? "where cidr > ?" : (until ? "where cidr < ?" : "")) + " order by cidr " + (until ? 'desc' : 'asc') + " limit 50", (from || until ? [from || until] : []));
	if(until) data = data.reverse();
	try {
		var navbtns = navbtnss(fd[0].cidr, ld[0].cidr, data[0].cidr, data[data.length-1].cidr, '/admin/ipacl');
	} catch(e) {
		var navbtns = navbtn(0, 0, 0, 0);
	}
	
	var content = `
		<form method=post class=settings-section>
    		<div class=form-group>
    			<label class=control-label>IP 주소 (CIDR<sup><a href="https://ko.wikipedia.org/wiki/%EC%82%AC%EC%9D%B4%EB%8D%94_(%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%82%B9)" target=_blank>[?]</a></sup>) :</label>
    			<div>
    				<input type=text class=form-control id=ipInput name=ip value="${req.method == 'POST' ? html.escape(req.body['ip'] || '') : ''}" />
    			</div>
    		</div>

    		<div class=form-group>
    			<label class=control-label>메모 :</label>
    			<div>
    				<input type=text class=form-control id=noteInput name=note value="${req.method == 'POST' ? html.escape(req.body['note'] || '') : ''}" />
    			</div>
    		</div>

    		<div class=form-group>
    			<label class=control-label>차단 기간 :</label>
    			<select class=form-control name=expire>
    				${expireopt(req)}
    			</select>
    		</div>

    		<div class=form-group>
    			<label class=control-label>로그인 허용 :</label>
    			<div class=checkbox>
    				<label>
    					<input type=checkbox id=allowLoginInput name=allow_login${req.method == 'POST' ? (req.body['allow_login'] ? ' checked' : '') : ''} />&nbsp;&nbsp;Yes
    				</label>
    			</div>
    		</div>

    		<div class=btns style="margin-bottom: 20px;">
    			<button type=submit class="btn btn-primary" style="width: 90px;">추가</button>
    		</div>
    	</form>
		
		<div class=line-break style="margin: 20px 0;"></div>
		
		${navbtns}
		
		<form class="form-inline pull-right" id=searchForm method=get>
    		<div class=input-group>
    			<input type=text class=form-control id=searchQuery name=from placeholder="CIDR" />
    			<span class=input-group-btn>
    				<button type=submit class="btn btn-primary">Go</button>
    			</span>
    		</div>
    	</form>
		
		<div class=table-wrap>
			<table class=table style="margin-top: 7px;">
				<colgroup>
					<col style="width: 150px;" />
					<col />
					<col style="width: 200px" />
					<col style="width: 160px" />
					<col style="width: 60px" />
					<col style="width: 60px;" />
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
	
	for(var row of data) {
		content += `
			<tr>
				<td>${row.cidr}</td>
				<td>${row.note}</td>
				<td>${generateTime(toDate(row.date), timeFormat)}
				<td>${!Number(row.expiration) ? '영구' : generateTime(toDate(row.expiration), timeFormat)}
				<td>${row.al == '1' ? 'Y' : 'N'}</td>
				<td class=text-center>
					<form method=post onsubmit="return confirm('정말로?');" action="/admin/ipacl/remove">
						<input type=hidden name=ip value="${row.cidr}" />
						<input type=submit class="btn btn-sm btn-danger" value="삭제" />
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
		for(var val of ['ip', 'note', 'expire']) {
			if(!req.body[val]) return res.send(await render(req, 'IPACL', (error = err('alert', { code: 'validator_required', tag: val })) + content, {}, '', error, 'ipacl'));
		}
		if(!ip.includes('/')) ip += '/32';
		if(!ip.match(/^([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])\/([1-9]|[12][0-9]|3[0-2])$/)) error = true, content = alertBalloon(fetchErrorString('invalid_cidr'), 'danger', true, 'fade in') + content;
		else {
			const date = getTime();
			if(isNaN(Number(expire))) {
				return res.send(await render(req, 'IPACL', (error = err('alert', { code: 'invalid_type_number', tag: 'expire' })) + content, {}, '', error, 'ipacl'));
			}
			if(Number(expire) > 29030400) {
				return res.send(await render(req, 'IPACL', (error = err('alert', { msg: 'expire의 값은 29030400 이하이어야 합니다.' })) + content, {}, '', error, 'ipacl'));
			}
			const expiration = expire == '0' ? '0' : String(Number(date) + Number(expire) * 1000);
			var data = await curs.execute("select cidr from ipacl where cidr = ? limit 1", [ip]);
			if(data.length) content = (error = err('alert', { code: 'ipacl_already_exists' })) + content;
			else {
				await curs.execute("insert into ipacl (cidr, al, expiration, note, date) values (?, ?, ?, ?, ?)", [ip, allow_login ? '1' : '0', expiration, note, date]);
				
				var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
				if(data.length) logid = Number(data[0].logid) + 1;
				insert('block_history', {
					date: getTime(),
					type: 'ipacl_add',
					duration: expire,
					note,
					ismember: islogin(req) ? 'author' : 'ip',
					executer: ip_check(req),
					target: ip,
					logid,
				});
				
				return res.redirect('/admin/ipacl');
			}
		}
	}
	
	res.send(await render(req, 'IPACL', content, {
	}, '', error, 'ipacl'));
});

if(minor >= 18) wiki.all(/^\/aclgroup\/create$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!hasperm(req, 'aclgroup')) return res.send(await showError(req, 'permission'));
	
	var content = `
		<form method=post>
			<div class=form-group>
				<label>그룹 이름: </label>
				<input type=text name=group class=form-control />
			</div>
			
			<div class=btns>
				<button type=submit class="btn btn-primary" style="width: 100px;">생성</button>
			</div>
		</form>
	`;
	
	var error = null;
	
	if(req.method == 'POST') do {
		const { group } = req.body;
		if(!group) {
			content = (error = err('alert', { code: 'validator_required', tag: 'group' })) + content;
			break;
		} else {
			var data = await curs.execute("select name from aclgroup_groups where name = ?", [group]);
			if(data.length) {
				content = (error = err('alert', { code: 'aclgroup_already_exists' })) + content;
				break;
			}
			else {
				await curs.execute("insert into aclgroup_groups (name) values (?)", [group]);
				return res.redirect('/aclgroup?group=' + encodeURIComponent(group));
			}
		}
	} while(0);
	
	res.send(await render(req, 'ACL그룹 생성', content, {}, '', error, _));
});

if(minor >= 18) wiki.post(/^\/aclgroup\/delete$/, async(req, res, next) => {
	if(!hasperm(req, 'aclgroup')) return res.send(await showError(req, 'permission'));
	const { group } = req.body;
	if(!group) return res.redirect('/aclgroup');  // 귀찮음
	await curs.execute("delete from aclgroup_groups where name = ?", [group]);
	res.redirect('/aclgroup');
});

if(minor >= 18) wiki.post(/^\/aclgroup\/remove$/, async(req, res) => {
	if(!hasperm(req, 'aclgroup')) return res.send(await showError(req, 'permission'));
	if(!req.body['id']) return res.status(400).send(await showError(req, { code: 'validator_required', tag: 'id' }));
	var dbdata = await curs.execute("select username, aclgroup from aclgroup where id = ?", [req.body['id']]);
	if(!dbdata.length) return res.status(400).send(await showError(req, 'invalid_value'));
	await curs.execute("delete from aclgroup where id = ?", [req.body['id']]);
	var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
	if(data.length) logid = Number(data[0].logid) + 1;
	insert('block_history', {
		date: getTime(),
		type: 'aclgroup_remove',
		ismember: islogin(req) ? 'author' : 'ip',
		executer: ip_check(req),
		id: req.body['id'],
		target: dbdata[0].username,
		note: req.body['note'] || '',
		aclgroup: dbdata.aclgroup,
		logid,
	});
	return res.redirect('/aclgroup?group=' + encodeURIComponent(dbdata.aclgroup));
});

if(minor >= 18) wiki.all(/^\/aclgroup$/, async(req, res) => {
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
		<div id="aclgroup-create-modal" class="modal fade" role="dialog" style="display: none;" aria-hidden="true">
			<div class="modal-dialog">
				<form id="edit-request-close-form" method=post action="/aclgroup/create">
					<div class="modal-content">
						<div class="modal-header">
							<button type="button" class="close" data-dismiss="modal">×</button> 
							<h4 class="modal-title">ACL그룹 생성</h4>
						</div>
						<div class="modal-body">
							<p>그룹 이름: </p>
							<input name="group" type="text"> 
						</div>
						<div class="modal-footer"> <button type="submit" class="btn btn-primary" style="width:auto">확인</button> <button type="button" class="btn btn-default" data-dismiss="modal" style="background:#efefef">취소</button> </div>
					</div>
				</form>
			</div>
		</div>
	
		<ul class="nav nav-tabs" style="height: 38px;">
			${tabs}
			${editable ? `
				<span data-toggle="modal" data-target="#aclgroup-create-modal">
					<li class="nav-item">
						<a class="nav-link" onclick="return false;" href="/aclgroup/create">+</a>
					</li>
				</span>
			` : ''}
		</ul>

		<form method=post class="settings-section">
    		<div class="form-group">
    			<div>
					<select class=form-control name=mode>
						<option value=ip>아이피</option>
						<option value=username>사용자 이름</option>
					</select>
    				<input type="text" class=form-control name="username" />
    			</div>
    		</div>

    		<div class="form-group">
    			<label class=control-label>메모 :</label>
    			<div>
    				<input type="text" class=form-control id="noteInput" name="note" />
    			</div>
    		</div>

    		<div class="form-group">
    			<label class=control-label>기간 :</label>
    			<select class=form-control name="expire">
    				${expireopt(req)}
    			</select>
    		</div>

    		<div class="btns" style="margin-bottom: 20px;">
    			<button type="submit" class="btn btn-primary" style="width: 90px;" ${!editable ? 'disabled' : ''}>추가</button>
    		</div>
    	</form>
	`;
	
	const navbtns = navbtn(0, 0, 0, 0);
	
	if(group) {
		content += `	
			<div class="line-break" style="margin: 20px 0;"></div>
			
			${navbtns}
			
			<form class="form-inline pull-right" id="searchForm" method=get>
				<div class="input-group">
					<input type="text" class=form-control id="searchQuery" name="from" placeholder="ID" />
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
							<input type=hidden name=id value="${row.id}" />
							<input type=hidden name=note value="" />
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
	
	var error = null;
	
	if(req.method == 'POST') {
		if(!hasperm(req, 'aclgroup')) return res.status(403).send(await showError(req, 'permission'));

		var { mode, username, expire, note } = req.body;
		if(!['ip', 'username'].includes(mode) || !username || !expire || note == undefined) error = true, content = alertBalloon(fetchErrorString('invalid_value'), 'danger', true, 'fade in') + content;
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
				await curs.execute("insert into aclgroup (id, type, username, expiration, note, date, aclgroup) values (?, ?, ?, ?, ?, ?, ?)", [String(id), mode, username, expiration, note, date, group]);
				
				var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
				if(data.length) logid = Number(data[0].logid) + 1;
				insert('block_history', {
					date: getTime(),
					type: 'aclgroup_add',
					aclgroup: group,
					id: String(id),
					duration: expire,
					note,
					ismember: islogin(req) ? 'author' : 'ip',
					executer: ip_check(req),
					target: username,
					logid,
				});
				
				return res.redirect('/aclgroup?group=' + encodeURIComponent(group));
			}
		}
	}
	
	res.send(await render(req, 'ACLGroup', content, {
	}, '', error, 'aclgroup'));
});

wiki.all(/^\/Upload$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const licelst = await curs.execute("select title from documents where namespace = '틀' and title like '이미지 라이선스/%' order by title");
	const catelst = await curs.execute("select title from documents where namespace = '분류' and title like '파일/%' order by title");
	
	var liceopts = '', cateopts = '';
	
	for(var lice of licelst) {
		liceopts += `<option value="${html.escape('' + totitle(lice.title, '틀'))}"${lice.title == '이미지 라이선스/제한적 이용' ? ' selected' : ''}>${html.escape(lice.title.replace('이미지 라이선스/', ''))}</option>`;
	}
	for(var cate of catelst) {
		cateopts += `<option value="${html.escape('' + totitle(cate.title, '분류'))}">${html.escape(cate.title.replace('파일/', ''))}</option>`;
	}
	
	var content = '';
	
	content = `
		<form method=post id="uploadForm" enctype="multipart/form-data" accept-charset="utf8">
			<input type=hidden name=baserev value="0" />
			<input type="file" id="fileInput" name="file" hidden="" />
			<input type=hidden name=identifier value="${islogin(req) ? 'm' : 'i'}:${html.escape(ip_check(req))}" />
			
			<div class="row">
				<div class="col-xs-12 col-md-7 form-group">
					<label class=control-label for="fakeFileInput">파일 선택</label>
					<div class="input-group">
						<input type="text" class=form-control id="fakeFileInput" readonly="" />
						<span class="input-group-btn">
							<button class="btn btn-secondary" type="button" id="fakeFileButton">Select</button>
						</span>
					</div>
				</div>
			</div>
			
			<div class="row">
				<div class="col-xs-12 col-md-7 form-group">
					<label class=control-label for="fakeFileInput">파일 이름</label>
					<input type="text" class=form-control name="document" id=documentInput value="${html.escape(req.method == 'POST' ? req.body['document'] : '')}" />
				</div>
			</div>

			<textarea name="text" type="text" rows="25" id="textInput" class=form-control>${(req.method == 'POST' ? req.body['text'] : '').replace(/<\/(textarea)>/gi, '&lt;/$1&gt;')}</textarea>
		${req.method == 'GET' ? `
			<div class=row>
				<div class="col-xs-12 col-md-5 form-group">
					<label class=control-label for="licenseSelect">라이선스</label>
					<select id=licenseSelect class=form-control>${ liceopts }</select>
				</div>
			</div>
			
			<p style="font-weight: bold; color: red;">[주의!] 파일문서의 라이선스(문서 본문)와 올리는 파일의 라이선스는 다릅니다. 파일의 라이선스를 올바르게 지정하였는지 확인하세요.</p>
			
			<div class=row>
				<div class="col-xs-12 col-md-5 form-group">
					<label class=control-label for="categorySelect">분류</label>
					<select id=categorySelect class=form-control>
						<option value>선택</option>
						${cateopts}
					</select>
				</div>
			</div>
		` : ''}
			<div class="form-group">
				<label class=control-label>요약</label>
				<input type="text" id="logInput" class=form-control name="log" value="${html.escape(req.method == 'POST' ? req.body['log'] : '')}" />
			</div>
			
			<p>${config.getString('wiki.editagree_text', `문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을 <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을 이용하여 저작자 표시를 하는 것으로 충분하다는 데 동의하는 것입니다. 이 <strong>동의는 철회할 수 없습니다.</strong>`)}</p>
			
			${islogin(req) ? '' : `<p style="font-weight: bold;">비로그인 상태로 편집합니다. 편집 역사에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
			
			<div class="btns">
				<button id="uploadBtn" type="submit" class="btn btn-primary">올리기</button>
			</div>
		</form>
		
		<script>uploadInit();</script>
	`;
	
	var error = null;
	
	if(req.method == 'POST') do {
		var file = req.files[0];
		if(!file) { content = (error = err('alert', { code: 'file_not_uploaded' })) + content; break; }
		var title = req.body['document'];
		if(!title) { content = (error = err('alert', { code: 'validator_required', tag: 'document' })) + content; break; }
		var doc = processTitle(title);
		if(doc.namespace != '파일') { content = (error = err('alert', { msg: '업로드는 파일 이름 공간에서만 가능합니다.' })) + content; break; }
		if(path.extname(doc.title).toLowerCase() != path.extname(file.originalname).toLowerCase()) {
			content = (error = err('alert', { msg: '문서 이름과 확장자가 맞지 않습니다.' })) + content;
			break;
		}
		var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 1);
		if(aclmsg) { content = (error = err('alert', { code: 'permission_edit', msg: aclmsg })) + content; break; }
		
		if(error) break;
		
		var request = http.request({
			method: 'POST', 
			host: hostconfig.image_host,
			port: hostconfig.image_port,
			path: '/upload',
			headers: {
				'Content-Type': 'application/json',
			},
		}, async res => {
			var data = '';
			res.on('data', chunk += data);
			res.on('end', async () => {
				data = JSON.parse(data);
				if(data.status != 'success') {
					error = err('alert', { code: 'file_not_uploaded' });
					return res.send(await render(req, '파일 올리기', error + content, {}, _, error, 'upload'));
				}
				await curs.execute("insert into files (title, namespace, hash) values (?, ?, ?)", [doc.title, doc.namespace, '']);  // sha224 해시화 필요
				return res.redirect('/w/' + totitle(doc.title, doc.namespace));
			});
		}).on('error', async e => {
			error = err('alert', { msg: '파일 서버가 사용가능하지 않습니다.' });
			return res.send(await render(req, '파일 올리기', error + content, {}, _, error, 'upload'));
		});
		request.write(JSON.stringify({
			filename: file.originalname,
			document: title,
			mimetype: file.mimetype,
			file: file.buffer.toString('base64'),
		}));
		request.end();
		
		return;
	} while(0);
	
	res.send(await render(req, '파일 올리기', content, {}, _, error, 'upload'));
});

wiki.get(/^\/BlockHistory$/, async(req, res) => {
	var pa = [];
	var qq = " where '1' = '1' ";
	if(req.query['target'] && req.query['query']) {
		const com = req.query['query'].startsWith('"') && req.query['query'].endsWith('"');
		const query = com ? req.query['query'].replace(/^\"/, '').replace(/\"$/, '') : req.query['query'];
		if(req.query['target'] == 'author') {
			qq = 'where executer' + (com ? ' = ? ' : "like '%' || ? || '%' ");
			pa = [query];
		} else {
			qq = 'where note ' + (com ? ' = ? ' : "like '%' || ? || '%' ") + ' or target ' + (com ? ' = ? ' : "like '%' || ? || '%' ");
			pa = [query, query];
		}
	}
	var total = (await curs.execute("select count(logid) from block_history"))[0]['count(logid)'];
	
	const from = req.query['from'];
	const until = req.query['until'];
	var data;
	if(from) {
		data = await curs.execute("select logid, date, type, aclgroup, id, duration, note, executer, target, ismember from block_history " + 
							qq + " and (cast(logid as integer) <= ? AND cast(logid as integer) > ?) order by cast(date as integer) desc limit 100", 
							pa.concat([Number(from), Number(from) - 100]));
	} else if(until) {
		data = await curs.execute("select logid, date, type, aclgroup, id, duration, note, executer, target, ismember from block_history " + 
							qq + " and (cast(logid as integer) >= ? AND cast(logid as integer) < ?) order by cast(date as integer) desc limit 100", 
							pa.concat([Number(until), Number(until) + 100]));
	} else {
		data = await curs.execute("select logid, date, type, aclgroup, id, duration, note, executer, target, ismember from block_history " + 
							qq + " order by cast(date as integer) desc limit 100", 
							pa);
	}
	
	try {
		var navbtns = navbtn(total, data[data.length-1].logid, data[0].logid, '/BlockHistory');
	} catch(e) {
		var navbtns = navbtn(0, 0, 0, 0);
	}
	var content = `
		<form>
			<select name="target">
				<option value="text"${req.query['target'] == 'text' ? ' selected' : ''}>내용</option>
				<option value="author"${req.query['target'] == 'author' ? ' selected' : ''}>실행자</option>
			</select>
			
			<input name="query" placeholder="검색" type="text" value="${html.escape(req.query['query']) || ''}" />
			<input value="검색" type="submit" />
		</form>
		
		${navbtns}
		
		<ul class=wiki-list>
	`;
	
	function parses(s) {
		s = Number(s);
		var ret = '';
		if(s && s / 604800 >= 1) (ret += parseInt(s / 604800) + '주 '), s = s % 604800;
		if(s && s / 86400 >= 1) (ret += parseInt(s / 86400) + '일 '), s = s % 86400;
		if(s && s / 3600 >= 1) (ret += parseInt(s / 3600) + '시간 '), s = s % 3600;
		if(s && s / 60 >= 1) (ret += parseInt(s / 60) + '분 '), s = s % 60;
		if(s && s / 1 >= 1) (ret += parseInt(s / 1) + '초 '), s = s % 1;
		
		return ret.replace(/\s$/, '');
	}
	
	for(var item of data) {
		if(['aclgroup_add', 'aclgroup_remove'].includes(item.type) && minor < 18) continue;
		
		content += `
			<li>${generateTime(toDate(item.date), timeFormat)} ${ip_pas(item.executer, item.ismember)} 사용자가 ${item.target} <i>(${
				item.type == 'aclgroup_add'
				? `<b>${item.aclgroup}</b> ACL 그룹에 추가`
				: (
				item.type == 'aclgroup_remove'
				? `<b>${item.aclgroup}</b> ACL 그룹에서 제거`
				: (
				item.type == 'ipacl_add'
				? `IP 주소 차단`
				: (
				item.type == 'ipacl_remove'
				? `IP 주소 차단 해제`
				: (
				item.type == 'login_history'
				? `사용자 로그인 기록 조회`
				: (
				item.type == 'suspend_account' && item.duration != '-1'
				? `사용자 차단`
				: (
				item.type == 'suspend_account' && item.duration == '-1'
				? `사용자 차단 해제`
				: (
				item.type == 'grant'
				? `사용자 권한 설정`
				: ''
				)))))))
			})</i> ${item.type == 'aclgroup_add' || item.type == 'aclgroup_remove' ? `#${item.id}` : ''} ${
				item.type == 'aclgroup_add' || item.type == 'ipacl_add' || (item.type == 'suspend_account' && item.duration != '-1')
				? (major == 4 && (minor >= 1 || (minor == 0 && revision >= 20)) ? `(${item.duration == '0' ? '영구적으로' : `${parses(item.duration)} 동안`})` : `${item.duration} 동안`)
				: ''
			} ${
				item.type == 'aclgroup_add' || item.type == 'ipacl_add' || item.type == 'suspend_account' || item.type == 'grant'
				? `(<span style="color: gray;">${item.note}</span>)`
				: ''
			}</li>
		`;
	}
	
	content += `
		</ul>
		
		${navbtns}
	`;
	
	return res.send(await render(req, '차단 내역', content, {}, _, _, 'block_history'));
});

wiki.get(/^\/settings$/, async(req, res) => {
    res.send(await render(req, '스킨 설정', '이 스킨은 설정 기능을 지원하지 않습니다.', {}, _, _, 'settings'));
});

if(hostconfig.allow_account_deletion) wiki.all(/^\/member\/delete_account$/, async(req, res, next) => {
	if(!['GET', 'POST'].includes(req.method)) return next();
	if(!islogin(req)) return res.redirect('/member/login?redirect=%2Fmember%2Fdelete_account');
	const username = ip_check(req);
	var error = false;
	
	var { password } = (await curs.execute("select password from users where username = ?", [username]))[0];
	
	var content = `
		<form method=post onsubmit="return confirm('마지막 경고입니다. 탈퇴하려면 [확인]을 누르십시오.');">
			<p>계정을 삭제하면 문서 역사에서 당신의 사용자 이름이 익명화됩니다. 문서 배포 라이선스가 퍼블릭 도메인이 아닌 경우 가급적 탈퇴는 자제해주세요.</p>
			
			<div class=form-group>
				<label>사용자 이름을 확인해주세요 (${html.escape(username)}):</label>
				<input type=text name=username class=form-control placeholder="${html.escape(username)}" value="${html.escape(req.body['username'] || '')}" />
				${!error && req.method == 'POST' && req.body['username'] != username ? (error = true, `<p class=error-desc>자신의 사용자 이름을 입력해주세요.</p>`) : ''}
			</div>
			
			<div class=form-group>
				<label>비밀번호 확인:</label>
				<input type=password name=password class=form-control />
				${!error && req.method == 'POST' && sha3(req.body['password'] + '') != password ? (error = true, `<p class=error-desc>비밀번호를 확인해주세요.</p>`) : ''}
			</div>
			
			<div class=btns>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
				<button type=submit class="btn btn-danger">삭제</button>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
			</div>
		</form>
	`;
	
	if(req.method == 'POST' && !error) {
		curs.execute("delete from users where username = ?", [username]);
		curs.execute("delete from perms where username = ?", [username]);
		curs.execute("delete from suspend_account where username = ?", [username]);
		curs.execute("delete from user_settings where username = ?", [username]);
		curs.execute("delete from acl where title = ? and namespace = '사용자'", [username]);
		curs.execute("delete from classic_acl where title = ? and namespace = '사용자'", [username]);
		curs.execute("delete from documents where title = ? and namespace = '사용자'", [username]);
		curs.execute("delete from history where title = ? and namespace = '사용자'", [username]);
		curs.execute("delete from login_history where username = ?", [username]);
		curs.execute("delete from stars where username = ?", [username]);
		curs.execute("delete from useragents where username = ?", [username]);
		curs.execute("update history set username = '탈퇴한 사용자', ismember = 'ip' where username = ? and ismember = 'author'", [username]);
		curs.execute("update res set username = '탈퇴한 사용자', ismember = 'ip' where username = ? and ismember = 'author'", [username]);
		curs.execute("update res set hider = '탈퇴한 사용자' where hider = ?", [username]);
		curs.execute("update block_history set executer = '탈퇴한 사용자', ismember = 'ip' where executer = ? and ismember = 'author'", [username]);
		curs.execute("update block_history set target = '탈퇴한 사용자' where target = ?", [username]);
		curs.execute("update edit_requests set processor = '탈퇴한 사용자', ismember = 'ip' where processor = ? and ismember = 'author'", [username]);
		curs.execute("update edit_requests set username = '탈퇴한 사용자', ismember = 'ip' where username = ? and ismember = 'author'", [username]);
		delete req.session.username;
		delete userset[username];
		if(permlist[username]) permlist[username] = [];
		res.cookie('honoka', '', { expires: new Date(Date.now() - 1) });
		return res.send(await render(req, '계정 삭제', `
			<p><strong>${html.escape(username)}</strong>님 안녕히 가십시오.</p>
		`, {}, _, false, 'delete_account'));
	}
	
	return res.send(await render(req, '계정 삭제', content, {}, _, error, 'delete_account'));
});

if(hostconfig.allow_account_rename) wiki.all(/^\/member\/change_username$/, async(req, res, next) => {
	if(!['GET', 'POST'].includes(req.method)) return next();
	if(!islogin(req)) return res.redirect('/member/login?redirect=%2Fmember%2Fdelete_account');
	const username = ip_check(req);
	var error = false;
	
	var { password } = (await curs.execute("select password from users where username = ?", [username]))[0];
	
	if(req.method == 'POST') {
		if(!req.body['new_username'])
			var nonewusername = 1;
		
		var data = await curs.execute("select username from users where lower(username) = ? COLLATE NOCASE", [req.body['new_username'].toLowerCase()]);
		if(data.length)
			var duplicate = 1;
		
		if(!hostconfig.no_username_format && (id.length < 3 || id.length > 32 || id.match(/(?:[^A-Za-z0-9_])/)))
			var invalidformat = 1;
	}
	
	var content = `
		<form method=post onsubmit="return confirm('마지막 경고입니다. 변경하려면 [확인]을 누르십시오.');">
			${!error && req.method == 'POST' && nonewusername ? (error = true, alertBalloon(fetchErrorString('validator_required', 'new_username'), 'danger', true, 'fade in')) : ''}
			${(hostconfig.owners || []).includes(username) ? `<p style="font-weight: bold; color: red;">수정 후 반드시 config.json의 &lt;owners&gt; 값을 바꿔 주세요.</p>` : ''}
			<p>이름을 바꾸면 다른 사람이 당신의 기존 이름으로 가입할 수 있습니다.</p>
			
			<div class=form-group>
				<label>현재 이름 확인 (${html.escape(username)}):</label>
				<input type=text name=username class=form-control placeholder="${html.escape(username)}" value="${html.escape(req.body['username'] || '')}" />
				${!error && req.method == 'POST' && req.body['username'] != username ? (error = true, `<p class=error-desc>자신의 사용자 이름을 입력해주세요.</p>`) : ''}
			</div>
			
			<div class=form-group>
				<label>비밀번호 확인:</label>
				<input type=password name=password class=form-control />
				${!error && req.method == 'POST' && sha3(req.body['password'] + '') != password ? (error = true, `<p class=error-desc>비밀번호를 확인해주세요.</p>`) : ''}
			</div>
			
			<div class=form-group>
				<label>새로운 사용자 이름:</label>
				<input type=text name=new_username class=form-control value="${html.escape(req.body['new_username'] || '')}" />
				${!error && req.method == 'POST' && duplicate ? (error = true, `<p class=error-desc>사용자 이름이 이미 존재합니다.</p>`) : ''}
				${!error && req.method == 'POST' && invalidformat ? (error = true, `<p class=error-desc>사용자 이름을 형식에 맞게 입력해주세요.</p>`) : ''}
			</div>
			
			<div class=btns>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
				<button type=submit class="btn btn-danger">변경</button>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
			</div>
		</form>
	`;
	
	if(req.method == 'POST' && !error) {
		var newusername = req.body['new_username'];
		await curs.execute("update users set username = ? where username = ?", [newusername, username]);
		await curs.execute("update perms set username = ? where username = ?", [newusername, username]);
		await curs.execute("update suspend_account set username = ? where username = ?", [newusername, username]);
		await curs.execute("update user_settings set username = ? where username = ?", [newusername, username]);
		await curs.execute("update acl set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update classic_acl set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update documents set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update threads set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update edit_requests set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update history set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update login_history set username = ? where username = ?", [newusername, username]);
		await curs.execute("update stars set username = ? where username = ?", [newusername, username]);
		await curs.execute("update useragents set username = ? where username = ?", [newusername, username]);
		await curs.execute("update history set username = ? where username = ? and ismember = 'author'", [newusername, username]);
		await curs.execute("update res set username = ? where username = ? and ismember = 'author'", [newusername, username]);
		await curs.execute("update res set hider = ? where hider = ?", [newusername, username]);
		await curs.execute("update block_history set executer = ? where executer = ? and ismember = 'author'", [newusername, username]);
		await curs.execute("update block_history set target = ? where target = ?", [newusername, username]);
		await curs.execute("update edit_requests set processor = ? where processor = ? and ismember = 'author'", [newusername, username]);
		await curs.execute("update edit_requests set username = ? where username = ? and ismember = 'author'", [newusername, username]);
		await curs.execute("update autologin_tokens set username = ? where username = ?", [newusername, username]);
		req.session.username = newusername;
		permlist[newusername] = permlist[username];
		delete permlist[username];
		userset[newusername] = userset[username];
		delete userset[username];
		return res.send(await render(req, '사용자 이름 변경', `
			<p><strong>${html.escape(newusername)}</strong>로 이름을 변경하였습니다.</p>
		`, {}, _, false, 'delete_account'));
	}
	
	return res.send(await render(req, '사용자 이름 변경', content, {}, _, error, 'delete_account'));
});

wiki.all(/^\/member\/mypage$/, async(req, res, next) => {
	if(!['GET', 'POST'].includes(req.method)) return next();
	if(!islogin(req)) return res.redirect('/member/login?redirect=%2Fmember%2Fmypage');
	
	var myskin = getUserset(req, 'skin', 'default');
	const defskin = config.getString('wiki.default_skin', hostconfig.skin);
	
	var skopt = '';
	for(var skin of skinList) {
		var opt = `<option value="${skin}" ${getUserset(req, 'skin', 'default') == skin ? 'selected' : ''}>${skin}</option>`;
		skopt += opt;
	}
	
	var error = null;
	
	var emailfilter = '';
	if(config.getString('wiki.email_filter_enabled', 'false') == 'true') {
		emailfilter = `
			<p>이메일 허용 목록이 활성화 되어 있습니다.<br />이메일 허용 목록에 존재하는 메일만 사용할 수 있습니다.</p>
			<ul class=wiki-list>
		`;
		var filters = await curs.execute("select address from email_filters");
		for(var item of filters) {
			emailfilter += '<li>' + item.address + '</li>';
		}
		emailfilter += '</ul>';
	}
	
	var content = `
		<form method=post>
			<div class=form-group>
				<label>사용자 이름</label>
				<input type=text name=username readonly class=form-control value="${html.escape(ip_check(req))}" />
			</div>
			
			<div class=form-group>
				<label>전자우편 주소</label>
				<input type=email name=email class=form-control value="${html.escape(getUserset(req, 'email', ''))}" />
				${emailfilter}
			</div>
			
			<div class=form-group>
				<label>암호</label>
				<input type=password name=password class=form-control />
			</div>
			
			<div class=form-group>
				<label>암호 확인</label>
				<input type=password name=password_check class=form-control />
				${req.method == 'POST' && req.body['password'] && req.body['password'] != req.body['password_check'] ? (error = true, `<p class=error-desc>패스워드 확인이 올바르지 않습니다.</p>`) : ''}
			</div>
			
			<div class=form-group>
				<label>스킨</label>
				<select name=skin class=form-control>
					<option value=default ${myskin == 'default' ? 'selected' : ''}>기본스킨 (${defskin})</option>
					${skopt}
				</select>
				${req.method == 'POST' && !skinList.concat(['default']).includes(req.body['skin']) ? (error = err('p', 'invalid_skin')) : ''}
			</div>
			
			<div class=form-group>
				<label>Google Authenticator<label>
				<a class="btn btn-info" href="/member/activate_otp">활성화</a>
			</div>
			
			<div class=btns>
				<button type=reset class="btn btn-secondary">초기화</button>
				<button type=submit class="btn btn-primary">변경</button>
			</div>
		</form>
	`;
	
	if(req.method == 'POST' && !error) {
		for(var item of ['skin']) {
			await curs.execute("delete from user_settings where username = ? and key = ?", [ip_check(req), item]);
			await curs.execute("insert into user_settings (username, key, value) values (?, ?, ?)", [ip_check(req), item, req.body[item] || '']);
			userset[ip_check(req)][item] = req.body[item] || '';
		}
		
		if(req.body['password']) {
			await curs.execute("update users set password = ? where username = ?", [sha3(req.body['password']), ip_check(req)]);
		}
		
		return res.redirect('/member/mypage');
	}
	
	return res.send(await render(req, '내 정보', content, {}, _, error, 'mypage'));
});

wiki.get(/^\/member\/logout$/, async(req, res, next) => {
	var autologin;
	if(autologin = req.cookies['honoka']) {
		await curs.execute("delete from autologin_tokens where token = ?", [autologin]);
		res.cookie('honoka', '', { expires: new Date(Date.now() - 1) });
	}
	var desturl = req.query['redirect'];
	if(!desturl) desturl = '/';
	delete req.session.username;
	res.redirect(desturl);
});

wiki.all(/^\/member\/login$/, async function loginScreen(req, res, next) {
	if(!['GET', 'POST'].includes(req.method)) return next();
	
	var desturl = req.query['redirect'];
	if(!desturl) desturl = '/';
	
	if(islogin(req)) return res.redirect(desturl);
	
	var id = '1', pw = '1';
	
	var error = null;
	
	if(req.method == 'POST') do {
		id = req.body['username'] || '';
		pw = req.body['password'] || '';
		if(!id) break;
		var data = await curs.execute("select username from users where lower(username) = ? COLLATE NOCASE", [id.toLowerCase()]);
		var invalidusername = !id || !data.length;
		if(invalidusername) break;
		var usr = data;
		if(!pw) break;
		var data = await curs.execute("select username, password from users where lower(username) = ? and password = ? COLLATE NOCASE", [id.toLowerCase(), sha3(pw)]);
		var invalidpw = !invalidusername && (!data.length || !pw);
		if(invalidpw) break;
		var blocked = (major > 4 || (major == 4 && minor >= 1)) ? 0 : await userblocked(id);
		if(blocked) break;
	} while(0);
	
	var content = `
		<form class=login-form method=post>
			<div class=form-group>
				<label>Username</label>
				<input class=form-control name="username" type="text" value="${html.escape(req.method == 'POST' ? req.body['username'] : '')}" />
				${req.method == 'POST' && !error && !id.length ? (error = err('p', { code: 'validator_required', tag: 'username' })) : ''}
				${req.method == 'POST' && !error && invalidusername ? (error = err('p', 'invalid_username')) : ''}
				${req.method == 'POST' && !error && blocked ? (error = err('p', { msg: `차단된 계정입니다.<br />차단 만료일 : ${(blocked.expiration == '0' ? '무기한' : new Date(Number(blocked.expiration)))}<br />차단 사유 : ${blocked.note}` })) : ``}
			</div>

			<div class=form-group>
				<label>Password</label>
				<input class=form-control name="password" type="password" />
				${req.method == 'POST' && !error && !pw.length ? (error = err('p', { code: 'validator_required', tag: 'password' })) : ''}
				${req.method == 'POST' && !error && invalidpw ? (error = err('p', { msg: '암호가 올바르지 않습니다.' })) : ''}
			</div>
			
			<div class="checkbox" style="display: inline-block;">
				<label>
					<input type=checkbox name=autologin>
					<span>자동 로그인</span>
				</label>
			</div>
			
			<a href="/member/recover_password" style="float: right;">[아이디/비밀번호 찾기]</a> <br>
			
			<a href="/member/signup" class="btn btn-secondary">계정 만들기</a><button type="submit" class="btn btn-primary">로그인</button>
		</form>
	`;
	
	if(req.method == 'POST' && !error) {
		id = usr[0].username;
		if(req.body['autologin']) {
			const key = rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/', 128);
			res.cookie('honoka', key, {
				expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 360),
				httpOnly: true,
			});
			await curs.execute("insert into autologin_tokens (username, token) values (?, ?)", [id, key]);
		}
		
		if(!hostconfig.disable_login_history) {
			curs.execute("insert into login_history (username, ip, time) values (?, ?, ?)", [id, ip_check(req, 1), getTime()]);
			conn.run("delete from useragents where username = ?", [id], () => {
				curs.execute("insert into useragents (username, string) values (?, ?)", [id, req.headers['user-agent']]);
			});
		}
		
		req.session.username = id;
		return res.redirect(desturl);
	}
	
	res.send(await render(req, '로그인', content, {}, _, error, 'login'));
});

wiki.all(/^\/member\/signup$/, async function signupEmailScreen(req, res, next) {
	if(!['GET', 'POST'].includes(req.method)) return next();
	
	var desturl = req.query['redirect'];
	if(!desturl) desturl = '/';
	
	if(islogin(req)) { res.redirect(desturl); return; }
	
	var emailfilter = '';
	if(config.getString('wiki.email_filter_enabled', 'false') == 'true') {
		emailfilter = `
			<p>이메일 허용 목록이 활성화 되어 있습니다.<br />이메일 허용 목록에 존재하는 메일만 사용할 수 있습니다.</p>
			<ul class=wiki-list>
		`;
		for(var item of await curs.execute("select address from email_filters")) {
			emailfilter += '<li>' + item.address + '</li>';
		}
		emailfilter += '</ul>';
	}
	
	var bal = '';
	var error = null;
	
	if(hostconfig.disable_email) req.body['email'] = '';
	
	if(req.method == 'POST') do {
		var blockmsg = await ipblocked(ip_check(req, 1));
		if(blockmsg) break;
		if(!hostconfig.disable_email && (!req.body['email'] || req.body['email'].match(/[@]/g).length != 1)) {
			var invalidemail = 1;
			break;
		}
		var data = await curs.execute("select email from account_creation where email = ?", [req.body['email']]);
		if(!hostconfig.disable_email && data.length) {
			var duplicate = 1;
			break;
		}
		var data = await curs.execute("select value from user_settings where key = 'email' and value = ?", [req.body['email']]);
		if(!hostconfig.disable_email && data.length) {
			var userduplicate = 1;
			break;
		}
		if(emailfilter) {
			var data = await curs.execute("select address from email_filters where address = ?", [req.body['email'].split('@')[1]]);
			if(!hostconfig.disable_email && !data.length) {
				var filteredemail = 1;
				break;
			}
		}
	} while(0);
	
	var content = `
		${req.method == 'POST' && !error && filteredemail ? (error = err('alert', { msg: '이메일 허용 목록에 있는 이메일이 아닙니다.' })) : ''}
		
		<form method=post class=signup-form>
			<div class=form-group>
				<label>전자우편 주소</label>
				${hostconfig.disable_email ? `
					<input type=hidden name=email value="" />
					<div>비활성화됨</div>
				` : `<input type=email name=email class=form-control />`}
				${req.method == 'POST' && !error && duplicate ? (error = err('p', { msg: '해당 이메일로 이미 계정 생성 인증 메일을 보냈습니다.' })) : ''}
				${req.method == 'POST' && !error && userduplicate ? (error = err('p', { msg: '이메일이 이미 존재합니다.' })) : ''}
				${req.method == 'POST' && !error && invalidemail ? (error = err('p', { msg: '이메일의 값을 형식에 맞게 입력해주세요.' })) : ''}
				${emailfilter}
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
	
	if(req.method == 'POST' && !error) {
		await curs.execute("delete from account_creation where cast(time as integer) < ?", [Number(getTime()) - 86400000]);
		const key = rndval('abcdef1234567890', 64);
		curs.execute("insert into account_creation (key, email, time) values (?, ?, ?)", [key, req.body['email'], String(getTime())]);
		
		if(hostconfig.disable_email) return res.redirect('/member/signup/' + key);
		
		return res.send(await render(req, '계정 만들기', `
			<p>
				이메일(<strong>${req.body['email']}</strong>)로 계정 생성 이메일 인증 메일을 전송했습니다. 메일함에 도착한 메일을 통해 계정 생성을 계속 진행해 주시기 바랍니다.
			</p>

			<ul class=wiki-list>
				<li>간혹 메일이 도착하지 않는 경우가 있습니다. 이 경우, 스팸함을 확인해주시기 바랍니다.</li>
				<li>인증 메일은 24시간동안 유효합니다.</li>
			</ul>
			
			${hostconfig.debug ? 
				`<p style="font-weight: bold; color: red;">
					[디버그] 가입 주소: <a href="/member/signup/${key}">/member/signup/${key}</a>
				</p>` : ''}
		`, {}));
	}
	
	res.send(await render(req, '계정 만들기', content, {}, _, error, 'signup'));
});

wiki.all(/^\/member\/signup\/(.*)$/, async function signupScreen(req, res, next) {
	if(!['GET', 'POST'].includes(req.method)) return next();
	
	await curs.execute("delete from account_creation where cast(time as integer) < ?", [Number(getTime()) - 86400000]);
	
	const key = req.params[0];
	var credata = await curs.execute("select email from account_creation where key = ?", [key]);
	if(!credata.length) {
		return res.send(await showError(req, 'invalid_signup_key'));
	}
	
	var desturl = req.query['redirect'];
	if(!desturl) desturl = '/';
	
	if(islogin(req)) { res.redirect(desturl); return; }
	
	var id = '1', pw = '1', pw2 = '1';
	
	var content = '';
	var error = null;
	
	if(req.method == 'POST') do {
		id = req.body['username'] || '';
		pw = req.body['password'] || '';
		pw2 = req.body['password_check'] || '';
		
		if(!hostconfig.no_username_format && (id.length < 3 || id.length > 32 || id.match(/(?:[^A-Za-z0-9_])/))) {
			var invalidformat = 1;
			break;
		}
		
		if((hostconfig.reserved_usernames || []).concat(['namubot']).includes(id)) {
			var invalidusername = 1;
			break;
		}
		
		var data = await curs.execute("select username from users where lower(username) = ? COLLATE NOCASE", [id.toLowerCase()]);
		if(data.length) {
			var duplicate = 1;
			break;
		}
	} while(0);
	
	content += `
		<form class=signup-form method=post>
			<div class=form-group>
				<label>사용자 ID</label>
				<input class=form-control name="username" type="text" value="${html.escape(req.method == 'POST' ? req.body['username'] : '')}" />
				${req.method == 'POST' && !error && !id.length ? (error = err('p', { code: 'validator_required', tag: 'username' })) : ''}
				${req.method == 'POST' && !error && duplicate ? (error = err('p', 'username_already_exists')) : ''}
				${req.method == 'POST' && !error && invalidusername ? (error = err('p', 'invalid_username')) : ''}
				${req.method == 'POST' && !error && invalidformat ? (error = err('p', 'username_format')) : ''}
			</div>

			<div class=form-group>
				<label>암호</label>
				<input class=form-control name="password" type="password" />
				${req.method == 'POST' && !error && !pw.length ? (error = err('p', { code: 'validator_required', tag: 'password' })) : ''}
			</div>

			<div class=form-group>
				<label>암호 확인</label>
				<input class=form-control name="password_check" type="password" />
				${req.method == 'POST' && !error && !pw2.length ? (error = err('p', { code: 'validator_required', tag: 'password_check' })) : ''}
				${req.method == 'POST' && !error && pw2 != pw ? (error = err('p', { msg: '암호 확인이 올바르지 않습니다.' })) : ''}
			</div>
			
			<p><strong>가입후 탈퇴는 불가능합니다.</strong></p>
			
			<div class=btns>
				<button type=reset class="btn btn-secondary">초기화</button>
				<button type=submit class="btn btn-primary">가입</button>
			</div>
		</form>
	`;
	
	if(req.method == 'POST' && !error) do {
		var baserev = 0;
		var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [id, '사용자']);
		if(data.length) baserev = Number(data[0].rev);
		
		var data = await curs.execute("select title from documents where title = ? and namespace = ?", [id, '사용자']);
		if(data.length) {
			error = err('alert', 'edit_conflict');
			content = error + content;
			break; }
		
		permlist[id] = [];
		
		var data = await curs.execute("select username from users");
		if(!data.length) {
			for(var perm of perms) {
				if(disable_autoperms.includes(perm)) continue;
				curs.execute(`insert into perms (username, perm) values (?, ?)`, [id, perm]);
				permlist[id].push(perm);
			}
		}
		
		req.session.username = id;
		
		await curs.execute("insert into users (username, password) values (?, ?)", [id, sha3(pw)]);
		await curs.execute("insert into user_settings (username, key, value) values (?, 'email', ?)", [id, credata[0].email]);
		await curs.execute("insert into documents (title, namespace, content) values (?, '사용자', '')", [id]);
		await curs.execute("insert into history (title, namespace, content, rev, time, username, changes, log, iserq, erqnum, advance, ismember) \
						values (?, '사용자', '', ?, ?, ?, '0', '', '0', '', 'create', 'author')", [
							id, String(baserev + 1), getTime(), id
						]);
		if(!hostconfig.disable_login_history) {
			await curs.execute("insert into login_history (username, ip) values (?, ?)", [id, ip_check(req, 1)]);
			await curs.execute("insert into useragents (username, string) values (?, ?)", [id, req.headers['user-agent']]);
		}
		await curs.execute("delete from account_creation where key = ?", [key]);
		
		return res.send(await render(req, '계정 만들기', `
			<p>환영합니다! <strong>${html.escape(id)}</strong>님 계정 생성이 완료되었습니다.</p>
		`, {}));
	} while(0);
	
	res.send(await render(req, '계정 만들기', content, {}, _, error, 'signup'));
});

wiki.get(/^\/random$/, async(req, res) => {
	var data = await curs.execute("select title from documents where namespace = '문서' order by random() limit 1");
	if(!data.length) res.redirect('/');
	res.redirect('/w/' + encodeURIComponent(data[0].title));
});

wiki.get(/^\/RandomPage$/, async function randomPage(req, res) {
	const nslist = fetchNamespaces();
	var ns = req.query['namespace'];
	if(!ns || !nslist.includes(ns)) ns = '문서';
	
	var content = `
		<fieldset class="recent-option">
			<form class="form-inline" method=get>
				<div class="form-group">
					<label class=control-label>이름공간 :</label>
					<select class=form-control id=namespace name=namespace>
					
	`;
	for(var nsp of nslist) {
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
	var cnt = 0, li = '';
	while(cnt < 20) {
		let data = await curs.execute("select title from documents where namespace = ? order by random() limit 20", [ns]);
		if(!data.length) break;
		for(let i of data) {
			li += '<li><a 	href="/w/' + encodeURIComponent(totitle(i.title, ns)) + '">' + html.escape(totitle(i.title, ns) + '') + '</a></li>';
			cnt++;
			if(cnt > 19) break;
		}
		if(cnt > 19) break;
	}
	content += (li || '<li><a href="/w/' + encodeURIComponent(config.getString('wiki.front_page', 'FrontPage')) + '">' + html.escape(config.getString('wiki.front_page', 'FrontPage')) + '</a></li>') + '</ul>';
	
	res.send(await render(req, 'RandomPage', content, {}));
});

wiki.get(/^\/NeededPages$/, async(req, res) => {
	const nslist = fetchNamespaces();
	var ns = req.query['namespace'];
	if(!ns || !nslist.includes(ns)) ns = '문서';
	
	if(!neededPages[ns]) neededPages[ns] = [];
	var ss;
	var st, ed;
	var total = neededPages[ns].length;
	if(!req.query['from'] && req.query['until']) {
		ss = Number(req.query['until']);
		st = ss - 100, ed = ss;
		if(ed > total) ed = total;
		if(st < 1) st = 1;
		
	} else {
		ss = Number(req.query['from'] || '1');
		st = ss, ed = ss + 100;
		if(ed > total) ed = total;
		if(st < 1) st = 1;
	}
	
	const navbtns = navbtnr(total, st, ed, '/NeededPages');
	const ret = neededPages[ns].slice(st - 1, ed);
	
	var content = `
		<fieldset class=recent-option>
			<form class=form-inline method=get>
				<div class=form-group>
					<label class=control-label>이름공간 :</label>
					<select class=form-control id=namespace name=namespace>
					
	`;
	for(var nsp of nslist) {
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
		
		<p>역 링크는 존재하나 아직 작성이 되지 않은 문서 목록입니다.</p>
		<p>이 페이지는 하루에 한번 업데이트 됩니다.</p>
		
		${navbtns}
		
		<ul class=wiki-list>
	`;
	for(let item of ret) {
		content += '<li><a href="/w/' + encodeURIComponent(totitle(item, ns)) + '">' + html.escape(totitle(item, ns) + '') + '</a>  <a href="/' + (minor >= 14 ? 'backlink' : 'xref') + '/' + encodeURIComponent(totitle(item, ns)) + '">[역링크]</a></li>';
	}
	content += '</ul>' + navbtns;
	
	res.send(await render(req, '작성이 필요한 문서', content, {}));
});

wiki.get(/^\/UncategorizedPages$/, async(req, res) => {
	const nslist = fetchNamespaces();
	var ns = req.query['namespace'];
	if(!ns || !nslist.includes(ns)) ns = '문서';
	
	var content = `
		<fieldset class="recent-option">
			<form class="form-inline" method=get>
				<div class="form-group">
					<label class=control-label>이름공간 :</label>
					<select class=form-control id=namespace name=namespace>
					
	`;
	
	for(var nsp of nslist) {
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
	
	let data = await curs.execute("select title, content from documents where namespace = ? order by title asc limit 100", [ns]);
	for(let i of data) {
		if(i.content.match(/^[#]redirect\s(.*)\n$/)) continue;
		const d = await curs.execute("select title from backlink where title = ? and namespace = ? and type = 'category'", [i.title, ns]);
		if(d.length) continue;
		content += '<li><a href="/w/' + encodeURIComponent(totitle(i.title, ns)) + '">' + html.escape(totitle(i.title, ns) + '') + '</a></li>';
	}
	content += '</ul>';
	
	res.send(await render(req, '분류가 되지 않은 문서', content, {}));
});

wiki.get(/^\/OldPages$/, async(req, res) => {
	const nslist = fetchNamespaces();
	var ns = req.query['namespace'];
	if(!ns || !nslist.includes(ns)) ns = '문서';
	
	var content = `
		<p>편집된 지 오래된 문서의 목록입니다. (리다이렉트 제외)</p>
		
		<ul class=wiki-list>	
	`;
	
	let data = await curs.execute("select title, time, content from documents where namespace = '문서' order by cast(time as integer) asc limit 100");
	for(let i of data) {
		if(i.content.match(/^[#]redirect\s(.*)\n$/)) continue;
		content += '<li><a href="/w/' + encodeURIComponent(totitle(i.title, '문서')) + '">' + html.escape(totitle(i.title, ns) + '') + `</a>  (수정 시각:${generateTime(toDate(i.time), timeFormat)})`;
	}
	content += '</ul>';
	
	res.send(await render(req, '편집된 지 오래된 문서', content, {}));
});

wiki.get(/^\/ShortestPages$/, async function shortestPages(req, res) {
	var from = req.query['from'];
	if(!from) ns = '1';
	
	var sql_num = 0;
    if(from > 0)
        sql_num = from - 122;
    else
        sql_num = 0;
	
	var data = await curs.execute("select title, content from documents where namespace = '문서' order by length(content) limit ?, '122'", [sql_num]);
	
	var content = `
		<p>내용이 짧은 문서 (문서 이름공간, 리다이렉트 제외)</p>
		
		${navbtn(0, 0, 0, 0)}
		
		<ul class=wiki-list>
	`;
	
	for(var i of data) {
        if(i.content.match(/^[#]redirect\s(.*)\n$/)) continue;
		content += '<li><a href="/w/' + encodeURIComponent(i['title']) + '">' + html.escape(i['title']) + `</a> (${i.content.length}글자)</li>`;
	}
	
	content += '</ul>' + navbtn(0, 0, 0, 0);
	
	res.send(await render(req, '내용이 짧은 문서', content, {}));
});

wiki.get(/^\/LongestPages$/, async function longestPages(req, res) {
	var from = req.query['from'];
	if(!from) ns = '1';
	
	var sql_num = 0;
    if(from > 0)
        sql_num = from - 122;
    else
        sql_num = 0;
	
	var data = await curs.execute("select title, content from documents where namespace = '문서' order by length(content) desc limit ?, '122'", [sql_num]);
	
	var content = `
		<p>내용이 긴 문서 (문서 이름공간, 리다이렉트 제외)</p>
		
		${navbtn(0, 0, 0, 0)}
		
		<ul class=wiki-list>
	`;
	
	for(var i of data) {
        if(i.content.match(/^[#]redirect\s(.*)\n$/)) continue;
		content += '<li><a href="/w/' + encodeURIComponent(i['title']) + '">' + html.escape(i['title']) + `</a> (${i.content.length}글자)</li>`;
	}
	
	content += '</ul>' + navbtn(0, 0, 0, 0);
	
	res.send(await render(req, '내용이 긴 문서', content, {}));
});

wiki.all(/^\/admin\/config$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!islogin(req)) return res.status(403).send(await showError(req, 'permission'));
	if(!((hostconfig.owners || []).includes(ip_check(req)))) {
		return res.status(403).send(await showError(req, 'permission'));
	}
	
	const defskin = config.getString('wiki.default_skin', hostconfig.skin);
	var skopt = '';
	for(var skin of skinList) {
		var opt = `<option value="${skin}" ${config.getString('wiki.default_skin', hostconfig.skin) == skin ? 'selected' : ''}>${skin}</option>`;
		skopt += opt;
	}
	
	var filterd = await curs.execute("select address from email_filters");
	var filters = [];
	for(var item of filterd) {
		filters.push(item.address);
	}
	
	// 실제 더시드 UI가 밝혀지길...
	var content = `
		<form method=post class=settings-section>
			<div class=form-group>
				<label class=control-label>위키 이름</label>
				<input class=form-control type=text name=wiki.site_name value="${html.escape(config.getString('wiki.site_name', '더 시드'))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>대문</label>
				<input class=form-control type=text name=wiki.front_page value="${html.escape(config.getString('wiki.front_page', 'FrontPage'))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>기본 스킨</label>
				<select class=form-control name=wiki.default_skin>
					${skopt}
				</select>
			</div>
			
			<div class=form-group>
				<label class=control-label>이메일 허용 목록 활성화</label>
				<div class=checkbox>
					<label>
						<input type=checkbox name=wiki.email_filter_enabled value=true${config.getString('wiki.email_filter_enabled', 'false') == 'true' ? ' checked' : ''} />
						사용
					</label>
				</div>
			</div>
			
			<div class=form-group>
				<label class=control-label>이메일 허용 목록</label>
				<input class=form-control type=text name=filters value="${html.escape(filters.join(';'))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>공지</label>
				<input class=form-control type=text name=wiki.sitenotice value="${html.escape(config.getString('wiki.sitenotice', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>편집 안내</label>
				<input class=form-control type=text name=wiki.editagree_text value="${html.escape(config.getString('wiki.editagree_text', `문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을 <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을 이용하여 저작자 표시를 하는 것으로 충분하다는 데 동의하는 것입니다. 이 <strong>동의는 철회할 수 없습니다.</strong>`))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>사이트 주소</label>
				<input class=form-control type=text name=wiki.canonical_url value="${html.escape(config.getString('wiki.canonical_url', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>라이선스 주소</label>
				<input class=form-control type=text name=wiki.copyright_url value="${html.escape(config.getString('wiki.copyright_url', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>저작권 안내 문구</label>
				<input class=form-control type=text name=wiki.copyright_text value="${html.escape(config.getString('wiki.copyright_text', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>하단 문구</label>
				<input class=form-control type=text name=wiki.footer_text value="${html.escape(config.getString('wiki.footer_text', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>로고 주소</label>
				<input class=form-control type=text name=wiki.logo_url value="${html.escape(config.getString('wiki.logo_url', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>사용자정의 이름공간</label>
				<input class=form-control type=text name=custom_namespaces value="${html.escape((hostconfig.custom_namespaces || []).join(';'))}" />
			</div>
			
			<div class=btns>
				<button type=submit style="width: 100px;" class="btn btn-primary">저장</button>
			</div>
		</form>
	`;
	
	if(req.method == 'POST') {
		if(wikiconfig['wiki.site_name'] != req.body['wiki.site_name']) {
			curs.execute("update documents set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
			curs.execute("update history set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
			curs.execute("update threads set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
			curs.execute("update edit_requests set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
			curs.execute("update acl set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
			curs.execute("update classic_acl set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
		}
		
		if(!req.body['wiki.email_filter_enabled'])
			req.body['wiki.email_filter_enabled'] = 'false';
		if(req.body['custom_namespaces'])
			hostconfig.custom_namespaces = req.body['custom_namespaces'].split(';').map(item => item.replace(/(^(\s+)|(\s+)$)/g, '')).filter(item => item);
		if(req.body['filters']) {
			await curs.execute("delete from email_filters");
			for(var f of req.body['filters'].split(';').map(item => item.replace(/(^(\s+)|(\s+)$)/g, '')).filter(item => item)) {
				curs.execute("insert into email_filters (address) values (?)", [f]);
			}
		}
		for(var item of ['wiki.site_name', 'wiki.front_page', 'wiki.default_skin', 'filters', 'wiki.sitenotice', 'wiki.editagree_text', 'wiki.canonical_url', 'wiki.copyright_url', 'wiki.copyright_text', 'wiki.footer_text', 'wiki.logo_url']) {
			wikiconfig[item] = req.body[item];
			await curs.execute("delete from config where key = ?", [item]);
			await curs.execute("insert into config (key, value) values (?, ?)", [item, wikiconfig[item]]);
		}
		fs.writeFile('config.json', JSON.stringify(hostconfig), 'utf8', () => 1);
		
		return res.redirect('/admin/config');
	}
	
	return res.send(await render(req, '환경설정', content));
});

// 역링크 초기화 (디버그 전용)
if(hostconfig.debug) wiki.get('/ResetXref', function(req, res) {
	print('기존 역링크 데이타 삭제');
	curs.execute("delete from backlink")
		.then(() => {
			print('문서 목록 불러오기');
			curs.execute("select title, namespace, content from documents")
				.then(async dbdocs => {
					print('초기화 시작...');
					for(var item of dbdocs) {
						prt(totitle(item.title, item.namespace) + ' 처리 중... ');
						await markdown(item.content, 0, totitle(item.title, item.namespace) + '', 'backlinkinit');
						print('완료!');
					}
					print('모두 처리 완료.');
					return res.send('완료!');
				});
		});
});

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
		}
	}
	await curs.execute("update config set value = ? where key = 'update_code'", [updatecode]);
	wikiconfig.update_code = updatecode;
	
	if(hostconfig.debug) print('경고! 위키가 디버그 모드에서 실행 중입니다. 알려지지 않은 취약점에 노출될 수 있습니다.\n');
	
	// 작성이 필요한 문서
	async function cacheNeededPages() {
		neededPages = {};
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


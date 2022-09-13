const sqlite3 = require('sqlite3').verbose();
const inputReader = require('wait-console-input');
const conn = new sqlite3.Database('./wikidata.db', () => 1);
const fs = require('fs');
const StreamArray = require( 'stream-json/streamers/StreamArray');

function Split(str, del) { return str.split(del); }; const split = Split;
function UCase(s) { return s.toUpperCase(); }; const ucase = UCase;
function LCase(s) { return s.toUpperCase(); }; const lcase = LCase;

function print(x) { console.log(x); }
function prt(x) { process.stdout.write(x); }
function input(prpt) {
	prt(prpt);
	return inputReader.readLine('');
}

const noderl = require('readline');
function readline(prompt, hide) {
	const rl = noderl.createInterface(process.stdin, process.stdout);
	var pwchar = '';
	rl._writeToOutput = function(s) {
		if (rl.x)
			rl.output.write('*'), pwchar += '*';
		else
			rl.output.write(s);
	};
	
	return new Promise(r => {
		rl.question(prompt, ret => {
			rl.close();
			if(hide) process.stdout.write('\r' + prompt + pwchar.replace(/[*]$/, '') + ' \n'), rl.history = rl.history.slice(1);;
			r(ret);
		});
		
		if(hide) rl.x = 1;
	});
}

print('---- 나무위키 데이타베이스 변환기 ----');

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
	},
};

(async() => {
	var dbdata = await curs.execute("select value from config where key = 'wiki.site_name' limit 1");
	if(!dbdata.length) return print('위키가 초기화되지 않았습니다');
	const wikiname = dbdata[0].value;
	const namespaces = ['문서', '틀', '분류', '파일', '사용자', '특수기능', wikiname, '토론', '휴지통', '투표'];
	
	function processTitle(d) {
		const sp = d.split(':');
		var ns = sp.length > 1 ? sp[0] : '문서';
		var title = d;
		var forceShowNamespace = false;
		var nslist = namespaces;
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
		const nslist = namespaces;
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
	
	print('\n문서가 위키에 이미 존재하면 어떻게 하시겠습니까?');
	print('1) 건너뛰기');
	print('2) 덮어쓰기');
	const overwrite = Number(input(' => ')) - 1;
	if(![0, 1].includes(overwrite)) return print('입력이 잘못되었습니다');
	
	print('\n일부 문서만 가져오고 싶다면 제목을 입력해 주십시오');
	print('입력을 다 했거나 입력하지 않고 모두 가져오려면 리턴글쇠를 누르십시오');
	const docs = [];
	while(1) {
		var intitle = await readline(' => ');
		if(!intitle) break;
		docs.push(processTitle(intitle) + '');
	}
	
	print('\n어떤 위키에서 가져오고 계십니까?');
	print('1) 나무위키');
	print('2) 알파위키');
	const prefix = [, 'N:', 'A:'][input(' => ')];
	if(!prefix) return print('입력이 잘못되었습니다');
	
	var jsonname = await readline('\nJSON 파일 이름: ');
	if(!jsonname.toUpperCase().endsWith('.JSON')) jsonname += '.JSON';
	if(!fs.existsSync('./' + jsonname)) return print('화일을 찾을 수 없습니다');
	
	const jsonStream = StreamArray.withParser();
	var count = 0;
	var pr = 0;
	var iv = null;
	
	jsonStream.on('data', (d) => {
		count++;
		const title = d.value.title;
		const namespace = namespaces[d.value.namespace];
		if(docs.length && !docs.includes(totitle(title, namespace) + '')) return;
		(async() => {
			var dbdata = await curs.execute("select title from documents where title = ? and namespace = ?", [title, namespace]);
			if(dbdata.length) {
				if(overwrite) {
					await curs.execute("delete from documents where title = ? and namespace = ?", [title, namespace]);
					await curs.execute("delete from history where title = ? and namespace = ?", [title, namespace]);
				} else {
					print(totitle(title, namespace) + '이(가) 중복되어 건너뜁니다');
					pr++;
					return;
				}
			}
			print('처리 중 - ' + totitle(title, namespace));
			var rev = 1;
			await curs.execute("insert into documents (title, namespace, content) values (?, ?, ?)", [title, namespace, d.value.text]);
			await curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, ismember, advance) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [title, namespace, d.value.text, rev++, 'External Importer', String(new Date().getTime()), '+' + d.value.text.length, 'fork', 'author', 'create']);
			if(d.value.contributors) for(var item of d.value.contributors) {
				await curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, ismember, advance) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [title, namespace, d.value.text, rev++, (item.match(/(\d+)[.](\d+)[.](\d+)[.](\d+)/) || item.includes(':') ? item : (prefix + item)), String(new Date().getTime()), '0', 'contributor', (item.match(/(\d+)[.](\d+)[.](\d+)[.](\d+)/) || (item.includes(':') && !item.match(/^.[:]/)) ? 'ip' : 'author'), 'normal']);
			}
			pr++;
		})();
	});
	
	jsonStream.on('end', () => {
		iv = setInterval(() => {
			if(pr == count) {
				clearInterval(iv);
				print('완료!');
			}
		}, 500);
	});
	
	fs.createReadStream('./' + jsonname).pipe(jsonStream.input);
})();

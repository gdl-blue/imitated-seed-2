const sqlite3 = require('sqlite3').verbose();
const conn = new sqlite3.Database('./wikidata.db', () => 1);

function Split(str, del) { return str.split(del); }; const split = Split;
function UCase(s) { return s.toUpperCase(); }; const ucase = UCase;
function LCase(s) { return s.toUpperCase(); }; const lcase = LCase;

function print(x) { console.log(x); }
function prt(x) { process.stdout.write(x); }

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

const wikiconfig = {};
const hostconfig = require('./config.json'); 

const config = {
	getString(str, def = '') {
		if(typeof(wikiconfig[str]) == 'undefined') {
			curs.execute("insert into config (key, value) values (?, ?)", [str, def]);
			wikiconfig[str] = def;
			return def;
		}
		return wikiconfig[str];
	}
};

function fetchNamespaces() {
	return ['문서', '틀', '분류', '파일', '사용자', '특수기능', config.getString('wiki.site_name', '더 시드'), '토론', '휴지통', '투표'].concat(hostconfig.custom_namespaces || []);
}

(async() => {
	var data = await curs.execute("select key, value from config");
	for(var cfg of data) {
		wikiconfig[cfg.key] = cfg.value;
	}
	
	print('기존 역링크 데이타 삭제 중...');
	curs.execute("delete from backlink")
		.then(() => {
			print('문서 목록을 불러오는 중...');
			curs.execute("select title, namespace, content from documents")
				.then(async dbdocs => {
					print('초기화 시작...');
					for(var item of dbdocs) {
						prt(totitle(item.title, item.namespace) + ' 처리 중... ');
						await markdown(item.content, 0, totitle(item.title, item.namespace) + '', 'backlinkinit');
						print('완료!');
					}
					print('모두 처리 완료.');
				});
		});
})();


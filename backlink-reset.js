const sqlite3 = require('sqlite3').verbose();
const conn = new sqlite3.Database('./wikidata.db', console.error);

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

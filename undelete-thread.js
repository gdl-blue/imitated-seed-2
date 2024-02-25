const sqlite3 = require('sqlite3').verbose();
const inputReader = require('wait-console-input');
const conn = new sqlite3.Database('./wikidata.db', () => 1);

function Split(str, del) { return str.split(del); }; const split = Split;
function UCase(s) { return s.toUpperCase(); }; const ucase = UCase;
function LCase(s) { return s.toUpperCase(); }; const lcase = LCase;

function print(x) { console.log(x); }
function prt(x) { process.stdout.write(x); }
function input(prpt) {
	prt(prpt);
	return inputReader.readLine('');
}

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

curs.execute("select title, namespace, topic, tnum from threads where deleted = '1'")
	.then(d => {
		var num = 1;
		for(item of d) {
			with(item)
				print(`[${num++}] ${namespace != '문서' ? (namespace + ':' + title) : title} - ${topic} (${tnum})`);
		}
		var sel = input('토론 번호 또는 좌표: ');
		var seln = Number(sel);
		if(!seln) {
			curs.execute("update threads set deleted = '0' where tnum = ?", [sel])
				.then(() => {
					print('복구됨.');
				})
				.catch(() => {
					print('복구할 수 없습니다');
				});
		} else if(!d[seln-1]) {
			print('복구할 수 없습니다');
		} else {
			curs.execute("update threads set deleted = '0' where tnum = ?", [d[seln-1].tnum])
				.then(() => {
					print('복구됨.');
				});
		}
	});

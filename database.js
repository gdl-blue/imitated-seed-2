const sqlite3 = require('sqlite3').verbose();
const conn = new sqlite3.Database('./wikidata.db', () => 0);  // 데이타베이스

// 파이선 SQLite 모방
const curs = {
	execute(sql, params = []) {
		return new Promise((resolve, reject) => {
			if(sql.toUpperCase().startsWith("SELECT")) {
				conn.all(sql, params, (err, retval) => {
					if(err) return reject(err);
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

module.exports = {
	conn, curs, insert,
};


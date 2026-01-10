const hostconfig = require('./hostconfig.js');
var db = null, curs = null;

function adapt(sql, noint = false) {
	const keywords = new Set(['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'GROUP', 'BY', 'ORDER', 'LIMIT', 'JOIN', 'ON', 'AS', 'IS', 'NULL', 'NOT', 'LIKE', 'ASC', 'DESC', 'CREATE', 'TABLE', 'TEXT', 'DEFAULT', 'DISTINCT', 'CAST', 'LOWER', 'UPPER', 'COLLATE', 'ALTER', 'ADD', 'COUNT', 'REFERENCES', 'FOREIGN', 'UNIQUE', 'PRIMARY', 'KEY', 'CONSTRAINT', 'REFERENCES', 'CASCADE', 'VARCHAR', 'INTEGER', 'ENUM', 'BOOLEAN']);
	const regex = /'[^']*'|\b([a-z_][a-z0-9_]*)\b/gi;
	return sql.replace(regex, (match, group) => {
		if(!group) 
			return match;
		if(group.toUpperCase() == 'INTEGER' && !noint) 
			return 'SIGNED';
		if(keywords.has(group.toUpperCase()) && group != 'key') 
			return group;
		if(group.startsWith('"') && group.endsWith('"')) 
			return group;
		return `"${group}"`;
	});
}

switch(hostconfig.database_type || 'sqlite') {
	case 'sqlite': {
		const sqlite3 = require('sqlite3');
		db = new sqlite3.Database(`./${hostconfig.sqlite_database_name || 'wikidata.db'}`, () => {});
		
		db._run = db.run;
		db._get = db.get;
		db._all = db.all;

		db.run = function run(query, params = []) {
			return new Promise((resolve, reject) => {
				db._run(query, params, (err, result) => {
					if(err) return reject(err);
					resolve(result);
				});
			});
		};

		db.get = function get(query, params = []) {
			return new Promise((resolve, reject) => {
				db._get(query, params, (err, result) => {
					if(err) return reject(err);
					resolve(result);
				});
			});
		};

		db.all = function all(query, params = []) {
			return new Promise((resolve, reject) => {
				db._all(query, params, (err, result) => {
					if(err) return reject(err);
					resolve(result);
				});
			});
		};
		
		// 장기적으로 curs는 없애고 위의 run/get/all로 교체 예정
		curs = {
			execute(sql, params = []) {
				return new Promise((resolve, reject) => {
					if(sql.toUpperCase().startsWith("SELECT")) {
						db._all(sql, params, (err, retval) => {
							if(err) return reject(err);
							resolve(retval);
						});
					} else {
						db._run(sql, params, err => {
							if(err) return reject(err);
							resolve(0);
						});
					}
				});
			}
		};
	} break; case 'mysql': {
		const mysql = require('mysql');
		db = mysql.createConnection({
			host: hostconfig.database_host || '127.0.0.1',
			user: hostconfig.database_user || 'root',
			password: hostconfig.database_password,
			database: hostconfig.database_name,
		});
		db.query("SET sql_mode='ANSI'", () => {});
		
		db.run = db.all = function run(query, params = [], noint = false) {
			return new Promise((resolve, reject) => {
				db.query(adapt(query, noint), params, (err, result) => {
					if(err) return reject(err);
					resolve(result);
				});
			});
		};
		
		db.get = function get(query, params = []) {
			return new Promise((resolve, reject) => {
				db.all(query + ' LIMIT 1', params).then(result => {
					for(var key in result[0])
						if(key.includes('"'))
							result[0][key.replace(/["]/g, '')] = result[0][key];
					resolve(result[0]);
				}).catch(err => {
					reject(err);
				});
			});
		};
		
		curs = { execute: db.run };
	} break; default: {
		throw new Error('데이타베이스 종류가 올바르지 않습니다');
	}
}

// 데이타베이스에 추가
function insert(table, obj) {
	var arr = [];
	var sql = 'insert into ' + table + ' (';
	for(var item in obj)
		sql += item + ', ';
	sql = sql.replace(/[,]\s$/, '') + ') values (';
	for(var item in obj) {
		sql += '?, ';
		arr.push(obj[item]);
	}
	sql = sql.replace(/[,]\s$/, '') + ')';
	return db.run(sql, arr);
}

module.exports = {
	db, curs, insert,
};

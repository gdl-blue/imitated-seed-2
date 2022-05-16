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

const html = {
	escape(content = '') {
		content = content.replace(/[&]/gi, '&amp;');
		content = content.replace(/["]/gi, '&quot;');
		content = content.replace(/[<]/gi, '&lt;');
		content = content.replace(/[>]/gi, '&gt;');
		
		return content;
	}
};

String.prototype.replaceAll = function(tofind, replacewith, matchcase = 1) {
    if(matchcase) {
        var esc = tofind.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var reg = new RegExp(esc, 'ig');
        return this.replace(reg, replacewith);
    } else {
        var ss = this;
        while(ss.includes(tofind)) {
            ss = ss.replace(tofind, replacewith);
        }
        return ss;
    }
};

const express = require('express');
const server = express();

server.get(/^\/search\/(.*)/, async(req, res) => {
	const query = req.params[0];
	const page = Number(req.query['page'] || '1');
	var limit = 0;
    if(page * 10 > 0) limit = page * 10 - 10;
	var fdata = await curs.execute("select title, namespace, content from documents where (title like '%' || ? || '%' or content like '%' || ? || '%') order by title COLLATE NOCASE asc", [query, query]);
	var data = await curs.execute("select title, namespace, content from documents where (title like '%' || ? || '%' or content like '%' || ? || '%') order by title asc limit ?, 10 COLLATE NOCASE", [query, query, limit]);
	const ret = { page, lastpage: Math.ceil(fdata.length / 10), total: fdata.length, result: [] };
	for(var item of data) {
		ret.result.push({
			title: item.title, 
			namespace: item.namespace,
			content: html.escape(item.content.slice(item.content.indexOf(query) - 250, query.length + 250)).replaceAll(html.escape(query), '<span class=search-highlight>' + html.escape(query) + '</span>'),
		});
	}
	res.json(ret);
});

server.listen(25005, '127.5.5.5', e => {
	print('실행 중.');
});

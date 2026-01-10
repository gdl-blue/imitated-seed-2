const express = require('express');
const server = express();
const database = require('./database');
for(var item in database) global[item] = database[item];
const print = console.log;
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

const ranking = [];

server.get(/^\/search\/(.*)/, async(req, res) => {
	const query = req.params[0];
	const page = Number(req.query['page'] || '1');
	var limit = 0;
    if(page * 10 > 0) limit = page * 10 - 10;
	var fdata = await db.get("select count(title) from documents where (lower(title) like '%' || ? || '%' or lower(content) like '%' || ? || '%') order by title asc", [query.toLowerCase(), query.toLowerCase()]);
	var data = await db.all("select title, namespace, content from documents where (lower(title) like '%' || ? || '%' or lower(content) like '%' || ? || '%') order by title asc limit ?, 10", [query.toLowerCase(), query.toLowerCase(), limit]);
	const ret = { page, lastpage: Math.ceil(fdata['count(title)'] / 10), total: fdata['count(title)'], result: [] };
	for(var item of data) {
		ret.result.push({
			title: item.title, 
			namespace: item.namespace,
			content: html.escape(item.content.slice(item.content.indexOf(query) - 250, query.length + 250)).replaceAll(html.escape(query), '<span class=search-highlight>' + html.escape(query) + '</span>'),
		});
	}
	res.json(ret);
});

server.get(/^\/api\/ranking$/, (req, res) => {
	res.json(ranking.sort((l, r) => r.count - l.count).map(item => item.keyword).slice(0, 10));
});

server.listen(25005, '127.5.5.5', e => {
	print('127.5.5.5:25005에서 실행 중. . . ');
});

router.get(/^\/NeededPages$/, async(req, res) => {
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
		content += '<li><a href="/w/' + encodeURIComponent(totitle(item, ns)) + '">' + html.escape(totitle(item, ns) + '') + '</a>  <a href="/' + (ver('4.14.0') ? 'backlink' : 'xref') + '/' + encodeURIComponent(totitle(item, ns)) + '">[역링크]</a></li>';
	}
	content += '</ul>' + navbtns;
	
	res.send(await render(req, '작성이 필요한 문서', content, {}));
});

router.get(/^\/UncategorizedPages$/, async(req, res) => {
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

router.get(/^\/OldPages$/, async(req, res) => {
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

router.get(/^\/ShortestPages$/, async function shortestPages(req, res) {
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

router.get(/^\/LongestPages$/, async function longestPages(req, res) {
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
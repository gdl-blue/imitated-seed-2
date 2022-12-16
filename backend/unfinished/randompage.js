router.get(/^\/RandomPage$/, async function randomPage(req, res) {
	const usens = ver('4.5.5');
	
	const nslist = fetchNamespaces();
	var ns = usens ? req.query['namespace'] : null;
	if(!ns || !nslist.includes(ns)) ns = '문서';
	
	var content = '';
	
	if(usens) {
		content = `
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
		`;
	}
	
	content += `
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
router.get(/^\/complete\/(.*)/, (req, res) => {
	// 초성검색은 나중에
	const query = req.params[0];
	const doc = processTitle(query);
	curs.execute("select title, namespace from documents where lower(title) like ? || '%' and lower(namespace) = ? limit 10", [doc.title.toLowerCase(), doc.namespace.toLowerCase()])
		.then(data => {
			var ret = [];
			for(var i of data) {
				ret.push(totitle(i.title, i.namespace) + '');
			}
			return res.json(ret);
		})
		.catch(e => {
			print(e.stack);
			return res.status(500).json([]);
		});
});

router.get(/^\/go\/(.*)/, (req, res) => {
	const query = req.params[0];
	const doc = processTitle(query);
	curs.execute("select title, namespace from history where lower(title) = ? and lower(namespace) = ?", [doc.title.toLowerCase(), doc.namespace.toLowerCase()])
		.then(data => {
			if(data.length) {
				const title = totitle(data[0].title, data[0].namespace);
				const idx = ranking.findIndex(item => item.keyword == query);
				if(idx > -1)
					ranking[idx].count++;
				else
					ranking.push({ keyword: query, count: 1 });
				ranking = ranking.sort((l, r) => r.count - l.count).slice(0, 10);
				return res.redirect('/w/' + title);
			}
			else return res.redirect('/search/' + query);
		})
		.catch(e => {
			return res.redirect('/search/' + query);
		});
});

router.get(/^\/search\/(.*)/, async(req, res) => {
	const query = req.params[0];
	
	var content = `
		<div class="alert alert-info search-help" role=alert>
			<div class=pull-left>
				<span class="icon ion-chevron-right"></span>&nbsp;
				찾는 문서가 없나요? 문서로 바로 갈 수 있습니다.
			</div>
			
			<div class=pull-right>
				<a class="btn btn-secondary btn-sm" href="/w/${encodeURIComponent(query)}">'${html.escape(query)}' 문서로 가기</a>
			</div>
			
			<div style="clear: both;"></div>
		</div>
	`;
	
	var st = new Date().getTime() / 1000;
	
	if(!query.replace(/^(\s+)/, '').replace(/(\s+)$/, '')) {
		res.send(await render(req, '"' + query + '" 검색 결과', content, {}, _, _, 'search'));
	}
	
	http.request({
		host: hostconfig.search_host,
		port: hostconfig.search_port,
		path: '/search/' + encodeURIComponent(query) + '?page=' + (req.query['page'] || '1'),
	}, async rr => {
		var d = '';

		rr.on('data', function(chunk) {
			d += chunk;
		});

		rr.on('end', async function() {
			const ret = JSON.parse(d);
			var reshtml = '';
			reshtml += `
				<section class=search-section>
			`;
			for(var item of ret.result) {
				var title = totitle(item.title, item.namespace) + '';
				reshtml += `
					<div class=search-item>
						<h4>
							<a href="/w/${encodeURIComponent(title)}">
								<span class="icon ion-android-document arrow-circle"></span>
								${html.escape(title)}
							</a>
						</h4>
						<div>
							${item.content}
						</div>
					</div>
				`;
			}
			reshtml += `
				<nav class=pull-right>
					<ul class=pagination>
			`;
			var lp = (ret.page / 10) * 10 + 10;
			var max = ret.lastpage < lp ? ret.lastpage : lp;
			for(var i=Math.floor(ret.page / 10) * 10 + 1; i<=max; i++) {
				reshtml += `
					<li class=page-item>
						<a class=page-link href="?page=${i}">${i}</a>
					</li>
				`;
			}
			reshtml += `
						</ul>
					</nav>
				</section>
			`;
			var et = new Date().getTime() / 1000;
			content = content + `
				<div class=search-summary>전체 ${ret.total} 건 / 처리 시간 ${(et - st).toFixed(3).replace(/([0]+)$/, '')}초</div>
			` + reshtml;
			res.send(await render(req, '"' + query + '" 검색 결과', content, {}, _, _, 'search'));
		});
	}).on('error', async e => {
		res.send(await showError(req, 'searchd_fail'));
	}).end();
});

if(hostconfig.namuwiki_exclusive) router.get(/^\/api\/ranking$/, (req, res) => {
	res.json({
		keywords: ranking.sort((l, r) => r.count - l.count).map(item => ({ keyword: item.keyword })).slice(0, 10)
	});
});
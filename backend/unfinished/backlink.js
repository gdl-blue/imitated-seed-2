if(ver('4.14.0') && hostconfig.namuwiki_exclusive) router.get(/^\/xref\/(.*)/, (req, res) => {
	const title = req.params[0];
	res.redirect('/backlink/' + encodeURIComponent(title) + '?flag=' + encodeURIComponent(req.query['flag'] || '0') + '&namespace=' + encodeURIComponent(req.query['namespace'] || '문서'));
});

router.get(ver('4.14.0') ? /^\/backlink\/(.*)/ : /^\/xref\/(.*)/, async (req, res) => {
	const title = req.params[0];
	const doc = processTitle(title);
	const flag  = req.query['flag'] || '0';
	const ns = req.query['namespace'] || '문서';
	const type = (
		flag == '1' ? (
			'link'
		) : (
			flag == '2' ? (
				'file'
			) : (
				flag == '4' ? (
					'include'
				) : flag == '8' ? (
					'redirect'
				) : 'all'
			)
		)
	);
	
	var sa = '', sd = [];
	if(req.query['from']) {
		sa = ' and title >= ? order by title asc ';
		sd.push(req.query['from']);
	} else if(req.query['until']) {
		sa = ' and title <= ? order by title desc ';
		sd.push(req.query['until']);
	} else {
		sa = ' order by title asc ';
	}
	const fd = await curs.execute("select title from backlink where not type = 'category' and link = ? and linkns = ? " + (flag != '0' ? " and type = ?" : '') + " order by title asc limit 1", [doc.title, doc.namespace].concat(flag != '0' ? [type] : []));
	const ld = await curs.execute("select title from backlink where not type = 'category' and link = ? and linkns = ? " + (flag != '0' ? " and type = ?" : '') + " order by title desc limit 1", [doc.title, doc.namespace].concat(flag != '0' ? [type] : []));
	const dbdata = await curs.execute("select title, namespace, type from backlink where not type = 'category' and link = ? and linkns = ? " + (flag != '0' ? " and type = ?" : '') + sa + " limit 50", [doc.title, doc.namespace].concat(flag != '0' ? [type] : []).concat(sd));
	
	try {
		var navbtns = navbtnss(fd[0].title, ld[0].title, dbdata[0].title, dbdata[dbdata.length-1].title, (ver('4.14.0') ? '/backlink/' : '/xref/') + encodeURIComponent(title));
	} catch(e) {
		var navbtns = navbtn(0, 0, 0, 0);
	}
	
	const _nslist = dbdata.map(item => item.namespace);
	const nslist = fetchNamespaces().filter(item => _nslist.includes(item));
	const counts = {};
	var nsopt = '';
	for(var item of nslist) {
		nsopt += `<option value="${item}">${item} (${dbdata.map(x => x.namespace == item).length})</option>`;
	}
	const data = dbdata.filter(item => item.namespace == ns);
	
	var content = `
		<fieldset class=recent-option>
			<form class=form-inline method=get>
				<div class=form-group>
					<label class=control-label>이름공간 :</label>
					
					<select class=form-control name=namespace>${nsopt}</select>
					
					<select class=form-control name=flag>
						<option value=0>(전체)</option>
						<option value=1>link</option>
						<option value=2>file</option>
						<option value=4>include</option>
						<option value=8>redirect</option>
					</select>
				</div>
				
				<div class="form-group btns">
					<button type=submit class="btn btn-primary" style="width: 5rem;">제출</button>
				</div>
			</form>
		</fieldset>
	`;
	
	var indexes = {};
	const hj = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
	const ha = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하', String.fromCharCode(55204)];
	for(var item of data) {
		if(!item) continue;
		var chk = 0;
		for(var i=0; i<ha.length-1; i++) {
			const fchr = item.title[0].charCodeAt(0);
			
			if((hj[i].includes(item.title[0])) || (fchr >= ha[i].charCodeAt(0) && fchr < ha[i+1].charCodeAt(0))) {
				if(!indexes[hj[i]]) indexes[hj[i]] = [];
				indexes[hj[i]].push(item);
				chk = 1;
				break;
			}
		} if(!chk) {
			if(!indexes[item.title[0].toUpperCase()]) indexes[item.title[0].toUpperCase()] = [];
			indexes[item.title[0].toUpperCase()].push(item);
		}
	}
	
	var listc = '<div' + (data.length > 6 ? ' class=wiki-category-container' : '') + '>';
	var list = '';
	for(var idx of Object.keys(indexes).sort()) {
		list += `
			<div>
				<h3>${html.escape(idx)}</h3>
				<ul class=wiki-list>
		`;
		for(var item of indexes[idx])
			list += `
				<li>
					<a href="/w/${encodeURIComponent(totitle(item.title, item.namespace))}">${html.escape(totitle(item.title, item.namespace) + '')}</a> (${item.type})
				</li>
			`;
		list += '</ul></div>';
	} listc += list + '</div>';
	
	content += `
		${navbtns}
		${list ? listc : '<div>해당 문서의 역링크가 존재하지 않습니다. </div>'}
		${navbtns}
	`;
	
	res.send(await render(req, title + '의 역링크', content, {
		document: doc,
	}, _, _, 'xref'));
});
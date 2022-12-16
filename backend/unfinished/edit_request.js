router.get(ver('4.16.0') ? /^\/edit_request\/([a-zA-Z]+)\/preview$/ : /^\/edit_request\/(\d+)\/preview$/, async(req, res, next) => {
	const id = req.params[0];
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and (id = ? or slug = ?)", [id, id]);
	if(!data.length) return res.send(await showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	
	var skinconfig = skincfgs[getSkin(req)];
	var header = '';
	for(var i=0; i<skinconfig["auto_css_targets"]['*'].length; i++) {
		header += '<link rel=stylesheet href="/skins/' + getSkin(req) + '/' + skinconfig["auto_css_targets"]['*'][i] + '">';
	}
	for(var i=0; i<skinconfig["auto_js_targets"]['*'].length; i++) {
		header += '<script type="text/javascript" src="/skins/' + getSkin(req) + '/' + skinconfig["auto_js_targets"]['*'][i]['path'] + '"></script>';
	}
	header += skinconfig.additional_heads;
	
	return res.send(`
		<head>
			<meta charset=utf8 />
			<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
		${hostconfig.use_external_css ? `
			<link rel=stylesheet href="https://theseed.io/css/diffview.css">
			<link rel=stylesheet href="https://theseed.io/css/katex.min.css">
			<link rel=stylesheet href="https://theseed.io/css/wiki.css">
		` : `
			<link rel=stylesheet href="/css/diffview.css">
			<link rel=stylesheet href="/css/katex.min.css">
			<link rel=stylesheet href="/css/wiki.css">
		`}
		${hostconfig.use_external_js ? `
			<!--[if (!IE)|(gt IE 8)]><!--><script type="text/javascript" src="https://theseed.io/js/jquery-2.1.4.min.js"></script><!--<![endif]-->
			<!--[if lt IE 9]><script type="text/javascript" src="https://theseed.io/js/jquery-1.11.3.min.js"></script><![endif]-->
			<script type="text/javascript" src="https://theseed.io/js/dateformatter.js?508d6dd4"></script>
			<script type="text/javascript" src="https://theseed.io/js/intersection-observer.js?36e469ff"></script>
			<script type="text/javascript" src="https://theseed.io/js/theseed.js?24141115"></script>
			
		` : `
			<!--[if (!IE)|(gt IE 8)]><!--><script type="text/javascript" src="/js/jquery-2.1.4.min.js"></script><!--<![endif]-->
			<!--[if lt IE 9]><script type="text/javascript" src="/js/jquery-1.11.3.min.js"></script><![endif]-->
			<script type="text/javascript" src="/js/dateformatter.js?508d6dd4"></script>
			<script type="text/javascript" src="/js/intersection-observer.js?36e469ff"></script>
			<script type="text/javascript" src="/js/theseed.js?24141115"></script>
		`}
			${header}
		</head>
		
		<body>
			<h1 class=title>${html.escape(doc + '')}</h1>
			<div class=wiki-article>
				${await markdown(req, item.content, 0, doc + '', 'preview')}
			</div>
		</body>
	`);
});

router.post(ver('4.16.0') ? /^\/edit_request\/([a-zA-Z]+)\/close$/ : /^\/edit_request\/(\d+)\/close$/, async(req, res, next) => {
	const id = req.params[0];
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and (id = ? or slug = ?)", [id, id]);
	if(!data.length) return res.send(await showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	if(!(hasperm(req, 'update_thread_status') || ((islogin(req) ? 'author' : 'ip') == item.ismember && item.username == ip_check(req)))) {
		return res.send(await showError(req, 'permission'));
	}
	if(item.state != 'open') {
		return res.send(await showError(req, 'edit_request_not_open'));
	}
	await curs.execute("update edit_requests set state = 'closed', processor = ?, processortype = ?, processtime = ?, reason = ? where " + (ver('4.16.0') ? 'slug' : 'id') + " = ?", [ip_check(req), islogin(req) ? 'author' : 'ip', getTime(), req.body['close_reason'] || '', id]);
	return res.redirect('/edit_request/' + id);
});

router.post(ver('4.16.0') ? /^\/edit_request\/([a-zA-Z]+)\/accept$/ : /^\/edit_request\/(\d+)\/accept$/, async(req, res, next) => {
	const id = req.params[0];
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and (id = ? or slug = ?)", [id, id]);
	if(!data.length) return res.send(await showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	var aclmsg = await getacl(req, item.title, item.namespace, 'edit', 1);
	if(aclmsg) {
		return res.send(await showError(req, { code: 'permission_edit', msg: aclmsg }));
	}
	if(item.state != 'open') {
		return res.send(await showError(req, 'edit_request_not_open'));
	}
	var rev;
	var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
	try {
		rev = Number(data[0].rev) + 1;
	} catch(e) {
		rev = 1;
	}
	var original = await curs.execute("select content from documents where title = ? and namespace = ?", [item.title, item.namespace]);
	if(!original[0]) original = '';
	else original = original[0].content;
	
	const rawChanges = item.content.length - original.length;
	const changes = (rawChanges > 0 ? '+' : '') + String(rawChanges);
	
	await curs.execute("update documents set content = ? where title = ? and namespace = ?", [item.content, item.title, item.namespace]);
	curs.execute("update stars set lastedit = ? where title = ? and namespace = ?", [getTime(), item.title, item.namespace]);
	curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, edit_request_id) \
					values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
		item.title, item.namespace, item.content, String(rev), item.username, getTime(), changes, item.log, '0', '-1', item.ismember, 'normal', id
	]);
	await curs.execute("update edit_requests set state = 'accepted', processor = ?, processortype = ?, processtime = ?, rev = ? where " + (ver('4.16.0') ? 'slug' : 'id') + " = ?", [ip_check(req), islogin(req) ? 'author' : 'ip', getTime(), String(rev), id]);
	markdown(req, item.text, 0, doc + '', 'backlinkinit');
	return res.redirect('/edit_request/' + id);
});

router.get(ver('4.16.0') ? /^\/edit_request\/([a-zA-Z]+)$/ : /^\/edit_request\/(\d+)$/, async(req, res, next) => {
	const id = req.params[0];
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and (slug = ? or id = ?)", [id, id]);
	if(!data.length) return res.send(await showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	
	const aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.status(403).send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var data = await curs.execute("select content from history where title = ? and namespace = ? and rev = ?", [item.title, item.namespace, item.baserev]);
	var base = '';
	if(data.length) base = data[0].content;
	
	var card = '';
	switch(item.state) {
		case 'open': {
			const acceptable = await getacl(req, item.title, item.namespace, 'edit');
			const closable   = hasperm(req, 'update_thread_status') || ((islogin(req) ? 'author' : 'ip') == item.ismember && item.username == ip_check(req));
			const editable   = ((islogin(req) ? 'author' : 'ip') == item.ismember && item.username == ip_check(req));
			
			card = `
				<h4 class=card-title>이 편집 요청을...</h4>
				<p class=card-text>${generateTime(toDate(item.lastupdate), timeFormat)}에 마지막으로 수정됨</p>
				<form id=edit-request-accept-form action="/edit_request/${id}/accept" method=post style="display: inline;">
					<button${acceptable ? '' : ' disabled'} class="btn btn-lg btn-success${acceptable ? '' : ' disabled'}" data-toggle=tooltip data-placement=top title="${acceptable ? '이 편집 요청을 문서에 적용합니다.' : '이 문서를 편집할 수 있는 권한이 없습니다.'}" type=submit>Accept</button>
				</form>
				<span data-toggle=modal data-target="#edit-request-close-modal">
					<button${closable ? '' : ' disabled'} class="btn btn-lg${closable ? '' : ' disabled'}" data-toggle=tooltip data-placement=top title="${closable ? '이 편집 요청을 닫습니다.' : '편집 요청을 닫기 위해서는 요청자 본인이거나 권한이 있어야 합니다.'}" type=button>Close</button>
				</span>
				<a class="btn btn-info btn-lg${editable ? '' : ' disabled'}" data-toggle=tooltip data-placement=top title="${editable ? '이 편집 요청을 수정합니다.' : '요청자 본인만 수정할 수 있습니다.'}" href="/edit_request/${id}/edit">Edit</a>
			`;
		} break; case 'closed': {
			card = `
				<h4 class=card-title>편집 요청이 닫혔습니다.</h4>
				<p class=card-text>${generateTime(toDate(item.processtime), timeFormat)}에 ${ip_pas(item.processor, item.processortype, 1)}가 편집 요청을 닫았습니다.</p>
				${item.reason ? `<p class=card-text>사유 : ${html.escape(item.reason)}</p>` : ''}
			`;
		} break; case 'accepted': {
			card = `
				<h4 class=card-title>편집 요청이 승인되었습니다.</h4>
				<p class=card-text>${generateTime(toDate(item.processtime), timeFormat)}에 ${ip_pas(item.processor, item.processortype, 1)}가 r${item.rev}으로 승인함.</p>
			`;
		}
	}
	
	var content = `
		<h3> ${ip_pas(item.username, item.ismember, 1)}가 ${generateTime(toDate(item.date), timeFormat)}에 요청</h3>
		<hr />
		<div class=form-group>
			<label class=control-label>기준 판</label> r${item.baserev}
		</div>
		
		<div class=form-group>
			<label class=control-label>편집 요약</label> ${html.escape(item.log)}
		</div>
		
		${item.state == 'open' ? `
			<div id=edit-request-close-modal class="modal fade" role=dialog style="display: none;" aria-hidden=true>
				<div class=modal-dialog>
					<form id=edit-request-close-form method=post action="/edit_request/${id}/close">
						<div class=modal-content>
							<div class=modal-header>
								<button type=button class=close data-dismiss=modal>×</button> 
								<h4 class=modal-title>편집 요청 닫기</h4>
							</div>
							<div class=modal-body>
								<p>사유:</p>
								<input name=close_reason type=text> 
							</div>
							<div class=modal-footer> <button type=submit class="btn btn-primary">확인</button> <button type=button class="btn btn-default" data-dismiss=modal>취소</button> </div>
						</div>
					</form>
				</div>
			</div>
		` : ''}
		
		<div class=card>
			<div class=card-block>
				${card}
			</div>
		</div>
		
		<br />
	`;
	
	var diffvw = '';
	if(item.state != 'accepted') {
		var difftable = diff(base, item.content, '1', '2');
		
		if(ver('4.13.0')) {
			diffvw = `
				<ul class="nav nav-tabs" role="tablist" style="height: 38px;">
					<li class="nav-item">
						<a class="nav-link active" data-toggle="tab" href="#edit" role="tab">비교</a>
					</li>
					<li class="nav-item">
						<a class="nav-link" data-toggle="tab" href="#preview" role="tab">미리보기</a>
					</li>
				</ul>

				<div class="tab-content bordered">
					<div class="tab-pane active" id="edit" role="tabpanel">
						${difftable.replace('<th class="texttitle">1 vs. 2</th>', '<th class="texttitle">편집 요청 ' + id + '</th>')}
					</div>
					<div class="tab-pane" id="preview" role="tabpanel">
						<iframe id=previewFrame src="/edit_request/${id}/preview"></iframe>
					</div>
				</div>
			`;
		} else {
			diffvw = difftable.replace('<th class="texttitle">1 vs. 2</th>', '<th class="texttitle"><a target=_blank href="/edit_request/' + id + '/preview">(미리보기)</a></th>');
		}
	}
	
	content += diffvw;
	
	var error = false;
	
	return res.send(await render(req, doc + ' (편집 요청 ' + id + ')', content, {
		document: doc,
	}, _, error, 'edit_request'));
});

router.all(ver('4.16.0') ? /^\/edit_request\/([a-zA-Z]+)\/edit$/ : /^\/edit_request\/(\d+)\/edit$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const id = req.params[0];
	var data = await curs.execute("select title, namespace, state, content, baserev, username, ismember, log, date, processor, processortype, processtime, lastupdate, reason, rev from edit_requests where not deleted = '1' and (id = ? or slug = ?)", [id, id]);
	if(!data.length) return res.send(await showError(req, 'edit_request_not_found'));
	const item = data[0];
	const doc = totitle(item.title, item.namespace);
	const title = doc + '';
	
	if(!((islogin(req) ? 'author' : 'ip') == item.ismember && item.username == ip_check(req))) {
		return res.send(await showError(req, '자신의 편집 요청만 수정할 수 있습니다.', 1));
	}
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit_request', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_edit_request', msg: aclmsg }));
	
	var error = null;
	
	var content = `
		<form method=post id="editForm" enctype="multipart/form-data" data-title="${title}" data-recaptcha="0">
			<input type="hidden" name="token" value="">
			<input type="hidden" name="identifier" value="${islogin(req) ? 'm' : 'i'}:${ip_check(req)}">

			<ul class="nav nav-tabs" role="tablist" style="height: 38px;">
				<li class="nav-item">
					<a class="nav-link active" data-toggle="tab" href="#edit" role="tab">편집</a>
				</li>
				<li class="nav-item">
					<a id="previewLink" class="nav-link" data-toggle="tab" href="#preview" role="tab">미리보기</a>
				</li>
			</ul>

			<div class="tab-content bordered">
				<div class="tab-pane active" id="edit" role="tabpanel">
					<textarea id="textInput" name="text" wrap="soft" class=form-control>${html.escape(item.content)}</textarea>
				</div>
				<div class="tab-pane" id="preview" role="tabpanel">
					
				</div>
			</div>
			
			<div class="form-group" style="margin-top: 1rem;">
				<label class=control-label for="summaryInput">요약</label>
				<input type="text" class=form-control id="logInput" name="log" value="${html.escape(item.log)}" />
			</div>

			<label><input checked type="checkbox" name="agree" id="agreeCheckbox" value="Y" />&nbsp;${config.getString('wiki.editagree_text', `문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을 <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을 이용하여 저작자 표시를 하는 것으로 충분하다는 데 동의하는 것입니다. 이 <strong>동의는 철회할 수 없습니다.</strong>`)}</label>
			
			${islogin(req) ? '' : `<p style="font-weight: bold;">비로그인 상태로 편집합니다. 편집 역사에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
			
			<div class="btns">
				<button id="editBtn" class="btn btn-primary" style="width: 100px;">저장</button>
			</div>
		</form>
	`;
	
	if(req.method == 'POST') do {
		const agree = req.body['agree'];
		if(!agree) { content = (error = err('alert', { code: 'validator_required', tag: 'agree' })) + content; break; }
		await curs.execute("update edit_requests set lastupdate = ?, content = ?, log = ? where " + (ver('4.16.0') ? 'slug' : 'id') + " = ?", [getTime(), req.body['text'] || '', req.body['log'] || '', id]);
		return res.redirect('/edit_request/' + id);
	} while(0);
	
	res.send(await render(req, doc + ' (편집 요청)', content, {
		document: doc,
	}, '', error, 'new_edit_request'));
});

router.all(/^\/new_edit_request\/(.*)$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	
	var data = await curs.execute("select title from documents \
					where title = ? and namespace = ?",
					[doc.title, doc.namespace]);
	if(!data.length) return res.send(await showError(req, 'document_not_found'));
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit_request', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_edit_request', msg: aclmsg }));
	
	var baserev;
	var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
	try {
		baserev = data[0].rev;
	} catch(e) {
		baserev = 0;
	}
	
	var rawContent = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!rawContent[0]) rawContent = '';
	else rawContent = rawContent[0].content;
	var error = null;
	var content = `
		<form method=post id="editForm" enctype="multipart/form-data" data-title="${title}" data-recaptcha="0">
			<input type="hidden" name="token" value="">
			<input type="hidden" name="identifier" value="${islogin(req) ? 'm' : 'i'}:${ip_check(req)}">
			<input type="hidden" name="baserev" value="${baserev}">

			<ul class="nav nav-tabs" role="tablist" style="height: 38px;">
				<li class="nav-item">
					<a class="nav-link active" data-toggle="tab" href="#edit" role="tab">${ver('4.15.0') ? 'RAW 편집' : '편집'}</a>
				</li>
				<li class="nav-item">
					<a id="previewLink" class="nav-link" data-toggle="tab" href="#preview" role="tab">미리보기</a>
				</li>
			</ul>

			<div class="tab-content bordered">
				<div class="tab-pane active" id="edit" role="tabpanel">
					<textarea id="textInput" name="text" wrap="soft" class=form-control>${rawContent.replace(/<\/(textarea)>/gi, '&lt;/$1&gt;')}</textarea>
				</div>
				<div class="tab-pane" id="preview" role="tabpanel">
					
				</div>
			</div>
			
			<div class="form-group" style="margin-top: 1rem;">
				<label class=control-label for="summaryInput">요약</label>
				<input type="text" class=form-control id="logInput" name="log" value="">
			</div>

			<label><input ${req.method == 'POST' ? 'checked ' : ''}type="checkbox" name="agree" id="agreeCheckbox" value="Y">&nbsp;${config.getString('wiki.editagree_text', `문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을 <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을 이용하여 저작자 표시를 하는 것으로 충분하다는 데 동의하는 것입니다. 이 <strong>동의는 철회할 수 없습니다.</strong>`)}</strong></label>
			
			${islogin(req) ? '' : `<p style="font-weight: bold;">비로그인 상태로 편집합니다. 편집 역사에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
			
			${generateCaptcha(req, req.session.captcha)}
			
			<div class="btns">
				<button id="editBtn" class="btn btn-primary" style="width: 100px;">저장</button>
			</div>
		</form>
	`;
	
	if(req.method == 'POST') do {
		if(!validateCaptcha(req)) { content = (error = err('alert', { code: 'captcha_validation_failed' })) + content; break; }
		
		if(rawContent == req.body['text']) {
			error = err('alert', { code: 'text_unchanged' });
			content = error + content;
			break;
		}
		
		const agree = req.body['agree'];
		if(!agree) { content = (error = err('alert', { code: 'validator_required', tag: 'agree' })) + content; break; }
		
		var data = await curs.execute("select id from edit_requests order by cast(id as integer) desc limit 1");
		var id = 1;
		if(data.length) id = Number(data[0].id) + 1;
		const slug = newID();
		await curs.execute("insert into edit_requests (title, namespace, id, state, content, baserev, username, ismember, log, date, processor, processortype, lastupdate, slug) values (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, '', '', ?, ?)", 
														[doc.title, doc.namespace, id, req.body['text'] || '', baserev, ip_check(req), islogin(req) ? 'author' : 'ip', req.body['log'] || '', getTime(), getTime(), slug]);
		
		delete req.session.captcha;
		
		return res.redirect('/edit_request/' + (ver('4.16.0') ? slug : id));
	} while(0);
	
	res.send(await render(req, doc + ' (편집 요청)', content, {
		document: doc,
	}, '', error, 'new_edit_request'));
});
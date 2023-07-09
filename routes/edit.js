router.all(/^\/edit\/(.*)/, async function editDocument(req, res, next) {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) {
		return res.status(403).send(await showError(req, err('error', { code: 'permission_read', msg: aclmsg })));
	}
	
	if(!doc.title || ['특수기능', '투표', '토론'].includes(doc.namespace) || !ver('4.7.3') && doc.title.includes('://')) return res.status(400).send(await showError(req, 'invalid_title'));
	
	var rawContent = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!rawContent[0]) rawContent = '';
	else rawContent = rawContent[0].content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	
	var error = null;
	var content = '';
	var section = Number(req.query['section']) || null;
	var baserev = 0;
	var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
	if(data.length) baserev = data[0].rev;
	var token = rndval('abcdef1234567890', 64);
	var textarea = `<textarea id="textInput" name="text" wrap="soft" class=form-control>${(req.method == 'POST' ? req.body['text'] : rawContent).replace(/<\/(textarea)>/gi, '&lt;/$1&gt;')}</textarea>`;
	
	// 틀:나무위키 -> helptext
	
	content = `
		<form method=post id="editForm" enctype="multipart/form-data" data-title="${html.escape(doc + '')}" data-recaptcha="0">
			<input type="hidden" name="token" value="${token}">
			<input type="hidden" name="identifier" value="${islogin(req) ? 'm' : 'i'}:${html.escape(ip_check(req))}">
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
					&<$TEXTAREA>
				</div>
				<div class="tab-pane" id="preview" role="tabpanel">
					
				</div>
			</div>
	`;
	
	if(ver('4.7.0') && !ver('4.10.0')) content = `
		<p>
			<a href="https://forum.theseed.io/topic/232/%EC%9D%98%EA%B2%AC%EC%88%98%EB%A0%B4-%EB%A6%AC%EB%8B%A4%EC%9D%B4%EB%A0%89%ED%8A%B8-%EB%AC%B8%EB%B2%95-%EB%B3%80%EA%B2%BD" target=_blank style="font-weight: bold; color: purple; font-size: 16px;">[의견수렴] 리다이렉트 문법 변경</a>
		</p>
	` + content;
	
	var httpstat = 200;
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 2);
	if(aclmsg) {
		if(!ver('4.17.2')) {
			aclmsg += ' 대신 <strong><a href="/new_edit_request/' + encodeURIComponent(doc + '') + '">편집 요청</a></strong>을 생성하실 수 있습니다.';
		} else if(await getacl(req, doc.title, doc.namespace, 'edit_request')) {
			return res.redirect('/new_edit_request/' + encodeURIComponent(doc + '') + '?redirected=1');
		}
		error = err('alert', { code: 'permission_edit', msg: aclmsg });
		content = error + content.replace('&<$TEXTAREA>', textarea).replace('<textarea', '<textarea readonly=readonly') + `
			</form>
		`;
		httpstat = 403;
	} else content += `
			<div class="form-group" style="margin-top: 1rem;">
				<label class=control-label for="summaryInput">요약</label>
				<input type="text" class=form-control id="logInput" name="log" value="${req.method == 'POST' ? html.escape(req.body['log']) : ''}" />
			</div>

			<label><input ${req.cookies['agree'] == '1' ? 'checked ' : ''}type="checkbox" name="agree" id="agreeCheckbox" value="Y"${req.method == 'POST' && req.body['agree'] == 'Y' ? ' checked' : ''}>&nbsp;${config.getString('wiki.editagree_text', `문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을 <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을 이용하여 저작자 표시를 하는 것으로 충분하다는 데 동의하는 것입니다. 이 <strong>동의는 철회할 수 없습니다.</strong>`)}</label>
			
			${islogin(req) ? '' : `<p style="font-weight: bold;">비로그인 상태로 편집합니다. 편집 역사에 IP(${ip_check(req)})가 영구히 기록됩니다.</p>`}
			
			${generateCaptcha(req, req.session.captcha)}
			
			<div class="btns">
				<button id="editBtn" class="btn btn-primary" style="width: 100px;">저장</button>
			</div>

<!--
			<div id="recaptcha">
				<div class="grecaptcha-badge" style="width: 256px; height: 60px; box-shadow: gray 0px 0px 5px;">
					<div class="grecaptcha-logo">
						<iframe src="https://www.google.com/recaptcha/api2/anchor?k=6LcUuigTAAAAALyrWQPfwtFdFWFdeUoToQyVnD8Y&amp;co=aHR0cDovL3dlYi5hcmNoaXZlLm9yZzo4MA..&amp;hl=ko&amp;v=r20171212152908&amp;size=invisible&amp;badge=inline&amp;cb=6rdgqngv0djy" width="256" height="60" role="presentation" frameborder="0" scrolling="no" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation allow-modals allow-popups-to-escape-sandbox"></iframe>
					</div>
					
					<div class="grecaptcha-error"></div>
					
					<textarea id="g-recaptcha-response" name="g-recaptcha-response" class="g-recaptcha-response" style="width: 250px; height: 40px; border: 1px solid #c1c1c1; margin: 10px 25px; padding: 0px; resize: none;  display: none; "></textarea>
				</div>
			</div>
			<script>
				recaptchaInit('recaptcha', {
					'sitekey': '',
					'size': 'invisible',
					'badge': 'inline',
					'callback': function() { $("#editBtn").attr("disabled", true); $("#editForm").submit(); }
				}, function (id) {
					$("#editForm").attr('data-recaptcha', id);
				});
			</script>
-->
		</form>
	`;
	if(!aclmsg && req.method == 'POST') do {
		if(!validateCaptcha(req)) { content = (error = err('alert', { code: 'captcha_validation_failed' })) + content; break; }
		var original = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		var ex = 1;
		if(!original[0]) ex = 0, original = '';
		else original = original[0]['content'];
		var text = req.body['text'] || '';
		text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
		if(text.startsWith('#넘겨주기 ')) text = text.replace('#넘겨주기 ', '#redirect ');
		if(text.startsWith('#redirect ')) text = text.split('\n')[0] + '\n';
		if(original == text && ex) { content = (error = err('alert', { code: 'text_unchanged' })) + content; break; }
		const rawChanges = text.length - original.length;
		const changes = (rawChanges > 0 ? '+' : '') + String(rawChanges);
		const log = req.body['log'] || '';
		const agree = req.body['agree'];
		if(!agree) { content = (error = err('alert', { code: 'validator_required', tag: 'agree' })) + content; break; }
		const baserev = req.body['baserev'];
		if(isNaN(Number(baserev))) { content = (error = err('alert', { code: 'invalid_type_number', tag: 'baserev' })) + content; break; }
		var data = await curs.execute("select rev from history where rev = ? and title = ? and namespace = ?", [baserev, doc.title, doc.namespace]);
		if(!data.length && ex) { content = (error = err('alert', { code: 'revision_not_found' })) + content; break; }
		var data = await curs.execute("select rev from history where cast(rev as integer) > ? and title = ? and namespace = ?", [Number(baserev), doc.title, doc.namespace]);
		if(data.length) {
			var data = await curs.execute("select content from history where rev = ? and title = ? and namespace = ?", [baserev, doc.title, doc.namespace]);
			var oc = '';
			if(data.length) oc = data[0].content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
			
			// 자동 병합
			var ERROR = 1;  // 0;
			/*
			const _tl = text.split('\n'), _nl = rawContent.split('\n'), _ol = oc.split('\n');
			const tl = [], nl = [], ol = [];
			// 1 - 내용이 같은 줄 찾기
			while(1) {
				const l1 = _tl[0], l2 = _nl[0], l3 = _ol[0];
				
				if(l1 == l2 && l2 == l3) {  // 원본, 내수정, 남의수정 모두 같으면 통과
					tl.push(l1);
					nl.push(l2);
					ol.push(l3);
				} else {
					var chk = 0;
					for(var j=0; j<_nl.length; j++) {
						if(l1 == _nl[j]) {
							tl.push(l1);
							nl.push(l1);
							chk = 1;
							break;
						} else {
							tl.push(null);
							nl.push(_nl[j]);
						}
					}
					if(!chk) {  // 중간에 줄이 추가된 게 아님.
						
					}
				}
				_tl.splice(0, 1);
				_nl.splice(0, 1);
				_ol.splice(0, 1);
			}*/
			
			if(ERROR) {
				error = err('alert', { code: 'edit_conflict' });
				content = error + diff(oc, text, 'r' + baserev, '사용자 입력') + '<span style="color: red; font-weight: bold; padding-bottom: 5px; padding-top: 5px;">자동 병합에 실패했습니다! 수동으로 수정된 내역을 아래 텍스트 박스에 다시 입력해주세요.</span>' + content.replace('&<$TEXTAREA>', `<textarea id="textInput" name="text" wrap="soft" class=form-control>${rawContent.replace(/<\/(textarea)>/gi, '&lt;/$1&gt;')}</textarea>`);
				break;
			} else if(!log) {
				log = `자동 병합됨 (r${baserev})`;
			}
		}
		const ismember = islogin(req) ? 'author' : 'ip';
		var advance = 'normal';
		
		var data = await curs.execute("select title from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		if(!data.length) {
			if(['파일', '사용자'].includes(doc.namespace)) {
				if((ver('4.11.0') && !doc.title.includes('/')) || !ver('4.11.0')) {
					error = err('alert', { code: 'invalid_namespace' });
					content = error + content;
					break; } }
			advance = 'create';
			await curs.execute("insert into documents (title, namespace, content) values (?, ?, ?)", [doc.title, doc.namespace, text]);
		} else {
			await curs.execute("update documents set content = ? where title = ? and namespace = ?", [text, doc.title, doc.namespace]);
			curs.execute("update stars set lastedit = ? where title = ? and namespace = ?", [getTime(), doc.title, doc.namespace]);
		}
		delete req.session.captcha;
		res.cookie('agree', '1', { expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 360) });
		
		curs.execute("update documents set time = ? where title = ? and namespace = ?", [getTime(), doc.title, doc.namespace]);
		curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
			doc.title, doc.namespace, text, String(Number(baserev) + 1), ip_check(req), getTime(), changes, log, '0', '-1', ismember, advance
		]);
		markdown(req, text, 0, doc + '', 'backlinkinit');
		
		return res.redirect('/w/' + encodeURIComponent(totitle(doc.title, doc.namespace)));
	} while(0);
	
	res.status(httpstat).send(await render(req, totitle(doc.title, doc.namespace) + ' (편집)', content.replace('&<$TEXTAREA>', textarea), {
		document: doc,
		body: {
			baserev: String(baserev),
			text: rawContent,
			section,
		},
		helptext: '',
		captcha: false,
		readonly: !!aclmsg,
		token,
	}, '', error, 'edit'));
});
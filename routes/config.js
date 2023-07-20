router.all(/^\/admin\/config$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!islogin(req)) return res.status(403).send(await showError(req, 'permission'));
	if(!((hostconfig.owners || []).includes(ip_check(req)))) {
		return res.status(403).send(await showError(req, 'permission'));
	}
	
	const defskin = config.getString('wiki.default_skin', hostconfig.skin);
	var skopt = '';
	for(var skin of skinList) {
		var opt = `<option value="${skin}" ${config.getString('wiki.default_skin', hostconfig.skin) == skin ? 'selected' : ''}>${skin}</option>`;
		skopt += opt;
	}
	
	var filterd = await curs.execute("select address from email_filters");
	var filters = [];
	for(var item of filterd) {
		filters.push(item.address);
	}
	
	// 실제 더시드 UI가 밝혀지길...
	var content = `
		<form method=post class=settings-section>
			<div class=form-group>
				<label class=control-label>위키 이름</label>
				<input class=form-control type=text name=wiki.site_name value="${html.escape(config.getString('wiki.site_name', '더 시드'))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>대문</label>
				<input class=form-control type=text name=wiki.front_page value="${html.escape(config.getString('wiki.front_page', 'FrontPage'))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>기본 스킨</label>
				<select class=form-control name=wiki.default_skin>
					${skopt}
				</select>
			</div>
			
			<div class=form-group>
				<label class=control-label>이메일 허용 목록 활성화</label>
				<div class=checkbox>
					<label>
						<input type=checkbox name=wiki.email_filter_enabled value=true${config.getString('wiki.email_filter_enabled', 'false') == 'true' ? ' checked' : ''} />
						사용
					</label>
				</div>
			</div>
			
			<div class=form-group>
				<label class=control-label>이메일 허용 목록</label>
				<input class=form-control type=text name=filters value="${html.escape(filters.join(';'))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>공지</label>
				<input class=form-control type=text name=wiki.sitenotice value="${html.escape(config.getString('wiki.sitenotice', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>편집 안내</label>
				<input class=form-control type=text name=wiki.editagree_text value="${html.escape(config.getString('wiki.editagree_text', `문서 편집을 <strong>저장</strong>하면 당신은 기여한 내용을 <strong>CC-BY-NC-SA 2.0 KR</strong>으로 배포하고 기여한 문서에 대한 하이퍼링크나 URL을 이용하여 저작자 표시를 하는 것으로 충분하다는 데 동의하는 것입니다. 이 <strong>동의는 철회할 수 없습니다.</strong>`))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>사이트 주소</label>
				<input class=form-control type=text name=wiki.canonical_url value="${html.escape(config.getString('wiki.canonical_url', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>라이선스 주소</label>
				<input class=form-control type=text name=wiki.copyright_url value="${html.escape(config.getString('wiki.copyright_url', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>저작권 안내 문구</label>
				<input class=form-control type=text name=wiki.copyright_text value="${html.escape(config.getString('wiki.copyright_text', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>하단 문구</label>
				<input class=form-control type=text name=wiki.footer_text value="${html.escape(config.getString('wiki.footer_text', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>로고 주소</label>
				<input class=form-control type=text name=wiki.logo_url value="${html.escape(config.getString('wiki.logo_url', ''))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>사용자정의 이름공간</label>
				<input class=form-control type=text name=custom_namespaces value="${html.escape((hostconfig.custom_namespaces || []).join(';'))}" />
			</div>

			<div class=btns>
				<button type=submit style="width: 100px;" class="btn btn-primary">저장</button>
			</div>
		</form>
	`;
	
	if(req.method == 'POST') {
		if(wikiconfig['wiki.site_name'] != req.body['wiki.site_name']) {
			curs.execute("update documents set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
			curs.execute("update history set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
			curs.execute("update threads set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
			curs.execute("update edit_requests set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
			curs.execute("update acl set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
			curs.execute("update classic_acl set namespace = ? where namespace = ?", [req.body['wiki.site_name'], wikiconfig['wiki.site_name']]);
		}
		
		if(!req.body['wiki.email_filter_enabled'])
			req.body['wiki.email_filter_enabled'] = 'false';
		if(req.body['custom_namespaces'])
			hostconfig.custom_namespaces = req.body['custom_namespaces'].split(';').map(item => item.replace(/(^(\s+)|(\s+)$)/g, '')).filter(item => item);
		if(req.body['filters']) {
			await curs.execute("delete from email_filters");
			for(var f of req.body['filters'].split(';').map(item => item.replace(/(^(\s+)|(\s+)$)/g, '')).filter(item => item)) {
				curs.execute("insert into email_filters (address) values (?)", [f]);
			}
		}
		for(var item of ['wiki.site_name', 'wiki.front_page', 'wiki.default_skin', 'filters', 'wiki.sitenotice', 'wiki.editagree_text', 'wiki.canonical_url', 'wiki.copyright_url', 'wiki.copyright_text', 'wiki.footer_text', 'wiki.logo_url']) {
			wikiconfig[item] = req.body[item];
			await curs.execute("delete from config where key = ?", [item]);
			await curs.execute("insert into config (key, value) values (?, ?)", [item, wikiconfig[item]]);
		}
		fs.writeFile('config.json', JSON.stringify(hostconfig), 'utf8', () => 1);
		
		return res.redirect('/admin/config');
	}
	
	return res.send(await render(req, '환경설정', content));
});
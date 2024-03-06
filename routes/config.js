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
	
	function tsver(version, desc) {
		return `<option value${version == '사용자 지정' ? '' : ('=' + version)} data-description="${html.escape(desc || '')}"${hostconfig.theseed_version == version ? ' selected' : ''}>${version}${version == '사용자 지정' ? (' (' + hostconfig.theseed_version + ')') : ''}</option>`;
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
						<input type=checkbox name=wiki.email_filter_enabled value=1${config.getString('wiki.email_filter_enabled', '0') == '1' ? ' checked' : ''} />
						사용
					</label>
				</div>
			</div>
			
			<div class=form-group>
				<label class=control-label>이메일 허용 목록 (구분자는 ;)</label>
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
				<label class=control-label>the seed 버전</label>
				<select class=form-control name=theseed_version>
					${tsver('사용자 지정')}
					${tsver('4.0.19')}
					${tsver('4.0.20')}
					${tsver('4.0.21')}
					${tsver('4.1.0')}
					${tsver('4.1.8')}
					${tsver('4.2.0')}
					${tsver('4.2.2')}
					${tsver('4.2.4')}
					${tsver('4.3.1')}
					${tsver('4.4.0')}
					${tsver('4.4.1')}
					${tsver('4.4.2')}
					${tsver('4.4.3')}
					${tsver('4.5.0')}
					${tsver('4.5.5')}
					${tsver('4.5.7')}
					${tsver('4.5.9')}
					${tsver('4.6.0')}
					${tsver('4.7.0')}
					${tsver('4.7.1')}
					${tsver('4.7.2')}
					${tsver('4.7.3')}
					${tsver('4.7.5')}
					${tsver('4.9.0')}
					${tsver('4.10.3')}
					${tsver('4.11.0')}
					${tsver('4.11.3')}
					${tsver('4.12.0')}
					${tsver('4.16.0')}
					${tsver('4.17.2')}
					${tsver('4.18.0')}
					${tsver('4.18.6')}
					${tsver('4.19.0')}
					${tsver('4.20.0')}
					${tsver('4.22.4')}
					${tsver('4.22.5')}
					${tsver('4.22.7')}
				</select>
				<p id=theseedVersionDescription></p>
				<p>이 설정 변경 시 반드시 엔진을 즉시 다시 시작해야 합니다.</p>
			</div>
			
			<div class=form-group>
				<label class=control-label>사용자정의 이름공간 (구분자는 ;)</label>
				<input class=form-control type=text name=custom_namespaces value="${html.escape((hostconfig.custom_namespaces || []).join(';'))}" />
			</div>
			
			<div class=form-group>
				<label class=control-label>IP 차단 (구분자는 ;)</label>
				<input class=form-control type=text name=block_ip value="${html.escape((hostconfig.block_ip || []).join(';'))}" />
		    </div>

			<div class=btns>
				<button type=submit style="width: 100px;" class="btn btn-primary">저장</button>
			</div>
		</form>
			
		<br /><hr /><br />

		<form method=post class=settings-section>
			<h3>고급 설정</h3>
			<TABLE WIDTH=100% CELLPADDING=6px>
				<COLGROUP>
					<COL STYLE="width: 90px;" />
					<COL />
					<COL STYLE="width: 120px;" />
				</COLGROUP>
				
				<TBODY>
					<TR>
						<TD STYLE="padding: 6px; vertical-align: middle;">
							<label for=etc_name class="col-form-label">이름: </label>
						</TD>
						
						<TD STYLE="padding: 6px;">
							<input type=text class=form-control id=etc_name name=etc_name />
						</TD>
						
						<TD STYLE="padding: 6px;" ROWSPAN=2>
							<button type=submit style="width: 100px;" class="btn btn-primary">추가</button>
						</TD>
					</TR>
					
					<TR>
						<TD STYLE="padding: 6px; vertical-align: middle;">
							<label for=etc_value class="col-form-label">값: </label>
						</TD>
						
						<TD STYLE="padding: 6px;">
							<input type=text class=form-control id=etc_value name=etc_value />
						</TD>
					</TR>
			</TABLE>
		</form>
				
		<TABLE CLASS=table WIDTH=100%>
			<COLGROUP>
				<COL STYLE="width: 170px;" />
				<COL />
				<COL STYLE="width: 80px;" />
			</COLGROUP>
			
			<THEAD>
				<TR>
					<TH>이름</TH>
					<TH>값</TH>
					<TH class=text-center>작업</TH>
				</TR>
			</THEAD>
			
			<TBODY>
	`;
	
	for(var si in wikiconfig) {
		if(si == 'update_code') continue;
		content += `
			<TR>
				<TD>${html.escape(si)}</TD>
				<TD>${html.escape(wikiconfig[si])}</TD>
				<td class=text-center>
					<form method=post onsubmit="return confirm('정말로?');">
						<input type=hidden name=etc_name value="${html.escape(si)}" />
						<input type=submit class="btn btn-sm btn-danger" value="초기화" />
					</form>
				</td>
			</TR>
		`;
	}
	
	content += `
			</TBODY>
		</TABLE>
	`;
	
	function updateSiteName(name) {
		curs.execute("update documents set namespace = ? where namespace = ?", [name, wikiconfig['wiki.site_name']]);
		curs.execute("update history set namespace = ? where namespace = ?", [name, wikiconfig['wiki.site_name']]);
		curs.execute("update threads set namespace = ? where namespace = ?", [name, wikiconfig['wiki.site_name']]);
		curs.execute("update edit_requests set namespace = ? where namespace = ?", [name, wikiconfig['wiki.site_name']]);
		curs.execute("update acl set namespace = ? where namespace = ?", [name, wikiconfig['wiki.site_name']]);
		curs.execute("update classic_acl set namespace = ? where namespace = ?", [name, wikiconfig['wiki.site_name']]);
	}
	
	if(req.method == 'POST') {
		if(req.body['etc_name']) {
			if(req.body['etc_name'] != 'update_code') {
				if(req.body['etc_value'] == undefined) {
					if(req.body['etc_name'] == 'wiki.site_name')
						updateSiteName('더 시드');
					delete wikiconfig[req.body['etc_name']];
					await curs.execute("delete from config where key = ?", [req.body['etc_name']]);
				} else {
					if(req.body['etc_name'] == 'wiki.site_name' && req.body['etc_value'] != wikiconfig['wiki.site_name'])
						updateSiteName(req.body['etc_value']);
					wikiconfig[req.body['etc_name']] = req.body['etc_value'];
					await curs.execute("delete from config where key = ?", [req.body['etc_name']]);
					await curs.execute("insert into config (key, value) values (?, ?)", [req.body['etc_name'], req.body['etc_value']]);
				}
			}
        } else {
			if(wikiconfig['wiki.site_name'] != req.body['wiki.site_name']) {
				updateSiteName(req.body['wiki.site_name']);
			}
			
			if(!req.body['wiki.email_filter_enabled'])
				req.body['wiki.email_filter_enabled'] = '0';
			if(req.body['custom_namespaces'])
				hostconfig.custom_namespaces = req.body['custom_namespaces'].split(';').map(item => item.replace(/(^(\s+)|(\s+)$)/g, '')).filter(item => item);
			if(req.body['block_ip'])
				hostconfig.block_ip = req.body['block_ip'].split(';').map(item => item.replace(/(^(\s+)|(\s+)$)/g, '')).filter(item => item);
			if(req.body['theseed_version']) {
				hostconfig.theseed_version = req.body['theseed_version'];
				var spl = hostconfig.theseed_version.split('.');
				version.major = Number(spl[0]);
				version.minor = Number(spl[1]);
				version.revision = Number(spl[2]);
			}
			if(req.body['filters']) {
				await curs.execute("delete from email_filters");
				for(var f of req.body['filters'].split(';').map(item => item.replace(/(^(\s+)|(\s+)$)/g, '')).filter(item => item)) {
					curs.execute("insert into email_filters (address) values (?)", [f]);
				}
			}
			for(var item of ['wiki.site_name', 'wiki.front_page', 'wiki.default_skin', 'filters', 'wiki.sitenotice', 'wiki.editagree_text', 'wiki.canonical_url', 'wiki.copyright_url', 'wiki.copyright_text', 'wiki.footer_text', 'wiki.logo_url', 'wiki.email_filter_enabled']) {
				wikiconfig[item] = req.body[item];
				await curs.execute("delete from config where key = ?", [item]);
				await curs.execute("insert into config (key, value) values (?, ?)", [item, wikiconfig[item]]);
			}

			fs.writeFile('config.json', JSON.stringify(hostconfig), 'utf8', () => 1);
		}
		return res.redirect('/admin/config');
	}
	
	return res.send(await render(req, '환경설정', content));
});

if(ver('4.18.6')) {
	router.all(/^\/member\/mypage$/, async(req, res, next) => {
		if(!['GET', 'POST'].includes(req.method)) return next();
		if(!islogin(req)) return res.redirect('/member/login?redirect=%2Fmember%2Fmypage');
		
		var myskin = getUserset(req, 'skin', 'default');
		const defskin = config.getString('wiki.default_skin', hostconfig.skin);
		
		var skopt = '';
		for(var skin of skinList) {
			var opt = `<option value="${skin}" ${getUserset(req, 'skin', 'default') == skin ? 'selected' : ''}>${skin}</option>`;
			skopt += opt;
		}
		
		var error = null;
		
		var emailfilter = '';
		if(config.getString('wiki.email_filter_enabled', 'false') == 'true') {
			emailfilter = `
				<p>이메일 허용 목록이 활성화 되어 있습니다.<br />이메일 허용 목록에 존재하는 메일만 사용할 수 있습니다.</p>
				<ul class=wiki-list>
			`;
			var filters = await curs.execute("select address from email_filters");
			for(var item of filters) {
				emailfilter += '<li>' + item.address + '</li>';
			}
			emailfilter += '</ul>';
		}
		
		const mp = ['member'];
		for(var item of perms)
			if(hasperm(req, item)) mp.push(item);
		
		const webauthnui = '';  `
			<div class=input-group>
				<input type=text class=form-control placeholder="Webauthn Device name to be added" />
				<span class=input-group-btn>
					<button type=button class="btn btn-primary" disabled>Webauthn Device 추가</button>
				</span>
			</div>
			
			<table class=table>
				<thead>
					<tr>
						<th>이름</th>
						<th>등록일</th>
						<th>마지막 사용</th>
						<th></th>
					</tr>
				</thead>
				
				<tbody>
					<tr>
						<td colspan=3>등록된 장치가 없습니다.</td>
					</tr>
				</tbody>
			</table>
		`;
		
		var content = `
			<div id="api-token-generate-modal" class="modal fade" role="dialog" style="display: none;" aria-hidden="true">
				<div class="modal-dialog">
					<form method=post action="/member/generate_api_token">
						<div class="modal-content">
							<div class="modal-header">
								<button type="button" class="close" data-dismiss="modal">×</button> 
								<h4 class="modal-title">API Token 발급</h4>
							</div>
							<div class="modal-body">
								<p>비밀번호: </p>
								<input name="password" type="password"> 
							</div>
							<div class="modal-footer"> <button type="submit" class="btn btn-danger" style="width:auto">확인</button> <button type="button" class="btn btn-default" data-dismiss="modal" style="background:#efefef">취소</button> </div>
						</div>
					</form>
				</div>
			</div>
		
			<form method=post>
				<div class=form-group>
					<label>사용자 이름</label>
					<p>${html.escape(ip_check(req))}</p>
				</div>
				
				<div class=form-group>
					<label>이메일</label>
					<p>
						${html.escape(getUserset(req, 'email') || '')}
						<a class="btn btn-info" href="/member/change_email">이메일 변경</a>
					</p>
				</div>
				
				<div class=form-group>
					<label>권한</label>
					<p>${mp.join(', ')}</p>
				</div>
				
				<div class=form-group>
					<label>비밀번호</label><br />
					<a class="btn btn-info" href="/member/change_password">비밀번호 변경</a>
				</div>
				
				<div class=form-group>
					<label>스킨</label>
					<select name=skin class=form-control>
						<option value=default ${myskin == 'default' ? 'selected' : ''}>기본스킨 (${defskin})</option>
						${skopt}
					</select>
					${req.method == 'POST' && !skinList.concat(['default']).includes(req.body['skin']) ? (error = err('p', 'invalid_skin')) : ''}
				</div>
				
				<div class=form-group>
					<label>이중인증</label><br />
					<a class="btn btn-info" href="/member/activate_otp">TOTP 활성화</a>
					
					${webauthnui}
				</div>
				
				<div class=form-group>
					<label>API Token</label><br />
					<span data-toggle="modal" data-target="#api-token-generate-modal">
						<a class="btn btn-danger" onclick="return false;" href="/member/generate_api_token">발급</a>
					</span>
				</div>
				
				<div class=btns>
					<button type=submit class="btn btn-primary">변경</button>
				</div>
			</form>
		`;
		
		if(req.method == 'POST' && !error) {
			for(var item of ['skin']) {
				await curs.execute("delete from user_settings where username = ? and key = ?", [ip_check(req), item]);
				await curs.execute("insert into user_settings (username, key, value) values (?, ?, ?)", [ip_check(req), item, req.body[item] || '']);
				userset[ip_check(req)][item] = req.body[item] || '';
			}
			
			if(req.body['password']) {
				await curs.execute("update users set password = ? where username = ?", [sha3(req.body['password']), ip_check(req)]);
			}
			
			return res.redirect('/member/mypage');
		}
		
		return res.send(await render(req, '내 정보', content, {}, _, error, 'mypage'));
	});
	
	router.all(/^\/member\/change_email$/, async(req, res, next) => {
		if(!['GET', 'POST'].includes(req.method)) return next();
		if(!islogin(req)) return res.redirect('/member/login?redirect=%2Fmember%2Fchange_email');
		
		var error = null;
		
		var emailfilter = '';
		if(config.getString('wiki.email_filter_enabled', 'false') == 'true') {
			emailfilter = `
				<p>이메일 허용 목록이 활성화 되어 있습니다.<br />이메일 허용 목록에 존재하는 메일만 사용할 수 있습니다.</p>
				<ul class=wiki-list>
			`;
			var filters = await curs.execute("select address from email_filters");
			for(var item of filters) {
				emailfilter += '<li>' + item.address + '</li>';
			}
			emailfilter += '</ul>';
		}
		
		var content = `
			<form method=post>
				<div class=form-group>
					<label>비밀번호</label>
					<input type=password name=password class=form-control />
				</div>
				
				<div class=form-group>
					<label>이메일</label>
					<p>${html.escape(getUserset(req, 'email') || '')}</p>
				</div>
				
				<div class=form-group>
					<label>새 이메일</label>
					<input type=email name=email class=form-control value="" />
					${emailfilter}
				</div>
				
				<div class=btns>
					<button type=submit class="btn btn-primary">이메일 변경</button>
				</div>
			</form>
		`;
		
		if(req.method == 'POST' && !error) {
			return res.redirect('/member/mypage');
		}
		
		return res.send(await render(req, '이메일 변경', content, {}, _, error, 'mypage'));
	});

	
	router.all(/^\/member\/change_password$/, async(req, res, next) => {
		if(!['GET', 'POST'].includes(req.method)) return next();
		if(!islogin(req)) return res.redirect('/member/login?redirect=%2Fmember%2Fchange_password');
		
		var error = null;
		
		if(req.method == 'POST') {
			var data = await curs.execute("select username, password from users where lower(username) = ? and password = ? COLLATE NOCASE", [ip_check(req).toLowerCase(), sha3(req.body['old_password'] || '')]);
			var invalidpw = !data.length;
		}
		
		var content = `
			<form method=post>
				<div class=form-group>
					<label>현재 비밀번호</label>
					<input type=password name=old_password class=form-control />
					${!error && req.method == 'POST' && !req.body['old_password'] ? (error = err('p', { code: 'validator_required', tag: 'old_password' })) : ''}
					${!error && req.method == 'POST' && invalidpw ? (error = err('p', { msg: '패스워드가 올바르지 않습니다.'})) : ''}
				</div>
				
				<div class=form-group>
					<label>비밀번호</label>
					<input type=password name=password class=form-control />
					${!error && req.method == 'POST' && !req.body['password'] ? (error = err('p', { code: 'validator_required', tag: 'password' })) : ''}
				</div>
				
				<div class=form-group>
					<label>비밀번호 확인</label>
					<input type=password name=password_check class=form-control />
					${!error && req.method == 'POST' && !req.body['password_check'] ? (error = err('p', { code: 'validator_required', tag: 'password_check' })) : ''}
					${!error && req.method == 'POST' && req.body['password'] && req.body['password'] != req.body['password_check'] ? (error = err('p', { msg: '패스워드 확인이 올바르지 않습니다.' })) : ''}
				</div>
				
				<div class=btns>
					<button type=submit class="btn btn-primary">비밀번호 변경</button>
				</div>
			</form>
		`;
		
		if(req.method == 'POST' && !error) {
			await curs.execute("update users set password = ? where username = ?", [sha3(req.body['password']), ip_check(req)]);
			
			return res.redirect('/member/mypage');
		}
		
		return res.send(await render(req, '비밀번호 변경', content, {}, _, error, 'mypage'));
	});
	
	router.all(/^\/member\/generate_api_token$/, async(req, res) => {
		if(!['GET', 'POST'].includes(req.method)) return next();
		if(!islogin(req)) return res.redirect('/member/login?redirect=%2Fmember%2Fmypage');
		
		if(req.method == 'POST') {
			var data = await curs.execute("select username, password from users where lower(username) = ? and password = ? COLLATE NOCASE", [ip_check(req).toLowerCase(), sha3(req.body['password'] || '')]);
			var invalidpw = !data.length
		}
		
		var error = null;
		
		var content = `
			<form method=post>
				<div class=form-group>
					<label>비밀번호: </label>
					<input type=password name=password class=form-control />
					${!error && req.method == 'POST' && !req.body['password'] ? (error = err('p', { code: 'validator_required', tag: 'password' })) : ''}
					${!error && req.method == 'POST' && invalidpw ? (error = err('p', { msg: '패스워드가 올바르지 않습니다.' })) : ''}
				</div>
				
				<div class=btns>
					<button type=submit class="btn btn-danger">발급</button>
				</div>
			</form>
		`;
		
		if(req.method == 'POST' && !error) {
			const token = Buffer.from(rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 128)).toString('base64');
			await curs.execute("delete from api_tokens where username = ?", [ip_check(req)]);
			await curs.execute("insert into api_tokens (username, token) values (?, ?)", [ip_check(req), token]);
			
			return res.send(await render(req, 'API Token 발급', `
				<form>
					<div class=form-group>
						<label>토큰: </label>
						<input type=text class=form-control readonly value="${token}" />
						
						<ul class=wiki-list>
							<li>발급된 토큰은 이 창을 닫으면 다시 확인할 수 없습니다.</li>
							<li>토큰은 비밀번호와 같이 취급해주세요.</li>
						</ul>
					</div>
					
					<div class=btns>
						<a href="/member/mypage" class="btn btn-secondary">닫기</a>
					</div>
				</form>
			`));
		}
		
		return res.send(await render(req, 'API Token 발급', content, {}, _, error));
	});
}

else router.all(/^\/member\/mypage$/, async(req, res, next) => {
	if(!['GET', 'POST'].includes(req.method)) return next();
	if(!islogin(req)) return res.redirect('/member/login?redirect=%2Fmember%2Fmypage');
	
	var myskin = getUserset(req, 'skin', 'default');
	const defskin = config.getString('wiki.default_skin', hostconfig.skin);
	
	var skopt = '';
	for(var skin of skinList) {
		var opt = `<option value="${skin}" ${getUserset(req, 'skin', 'default') == skin ? 'selected' : ''}>${skin}</option>`;
		skopt += opt;
	}
	
	var error = null;
	
	var emailfilter = '';
	if(config.getString('wiki.email_filter_enabled', 'false') == 'true') {
		emailfilter = `
			<p>이메일 허용 목록이 활성화 되어 있습니다.<br />이메일 허용 목록에 존재하는 메일만 사용할 수 있습니다.</p>
			<ul class=wiki-list>
		`;
		var filters = await curs.execute("select address from email_filters");
		for(var item of filters) {
			emailfilter += '<li>' + item.address + '</li>';
		}
		emailfilter += '</ul>';
	}
	
	var content = `
		<form method=post>
			<div class=form-group>
				<label>사용자 이름</label>
				<input type=text name=username readonly class=form-control value="${html.escape(ip_check(req))}" />
			</div>
			
			<div class=form-group>
				<label>전자우편 주소</label>
				<input type=email name=email class=form-control value="${html.escape(getUserset(req, 'email') || '')}" />
				${emailfilter}
			</div>
			
			<div class=form-group>
				<label>암호</label>
				<input type=password name=password class=form-control />
			</div>
			
			<div class=form-group>
				<label>암호 확인</label>
				<input type=password name=password_check class=form-control />
				${req.method == 'POST' && req.body['password'] && req.body['password'] != req.body['password_check'] ? (error = true, `<p class=error-desc>패스워드 확인이 올바르지 않습니다.</p>`) : ''}
			</div>
			
			<div class=form-group>
				<label>스킨</label>
				<select name=skin class=form-control>
					<option value=default ${myskin == 'default' ? 'selected' : ''}>기본스킨 (${defskin})</option>
					${skopt}
				</select>
				${!error && req.method == 'POST' && !skinList.concat(['default']).includes(req.body['skin']) ? (error = err('p', 'invalid_skin')) : ''}
			</div>
			
			${ver('4.5.0') ? `
			<div class=form-group>
				<label>Google Authenticator<label>
				<a class="btn btn-info" href="/member/activate_otp">활성화</a>
			</div>
			` : ''}
			
			<div class=btns>
				<button type=reset class="btn btn-secondary">초기화</button>
				<button type=submit class="btn btn-primary">변경</button>
			</div>
		</form>
	`;
	
	if(req.method == 'POST' && !error) {
		for(var item of ['skin']) {
			await curs.execute("delete from user_settings where username = ? and key = ?", [ip_check(req), item]);
			await curs.execute("insert into user_settings (username, key, value) values (?, ?, ?)", [ip_check(req), item, req.body[item] || '']);
			userset[ip_check(req)][item] = req.body[item] || '';
		}
		
		if(req.body['password']) {
			await curs.execute("update users set password = ? where username = ?", [sha3(req.body['password']), ip_check(req)]);
		}
		
		return res.redirect('/member/mypage');
	}
	
	return res.send(await render(req, '내 정보', content, {}, _, error, 'mypage'));
});
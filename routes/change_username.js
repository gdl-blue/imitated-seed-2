if(hostconfig.allow_account_rename) router.all(/^\/member\/change_username$/, async(req, res, next) => {
	if(!['GET', 'POST'].includes(req.method)) return next();
	if(!islogin(req)) return res.redirect('/member/login?redirect=%2Fmember%2Fdelete_account');
	const username = ip_check(req);
	var error = false;
	
	var { password } = (await curs.execute("select password from users where username = ?", [username]))[0];
	
	if(req.method == 'POST') {
		if(!req.body['new_username'])
			var nonewusername = 1;
		
		var data = await curs.execute("select username from users where lower(username) = ? COLLATE NOCASE", [req.body['new_username'].toLowerCase()]);
		if(data.length)
			var duplicate = 1;
		
		if(!hostconfig.no_username_format && (id.length < 3 || id.length > 32 || id.match(/(?:[^A-Za-z0-9_])/)))
			var invalidformat = 1;
	}
	
	var content = `
		<form method=post onsubmit="return confirm('마지막 경고입니다. 변경하려면 [확인]을 누르십시오.');">
			${!error && req.method == 'POST' && nonewusername ? (error = true, alertBalloon(fetchErrorString('validator_required', 'new_username'), 'danger', true, 'fade in')) : ''}
			${(hostconfig.owners || []).includes(username) ? `<p style="font-weight: bold; color: red;">수정 후 반드시 config.json의 &lt;owners&gt; 값을 바꿔 주세요.</p>` : ''}
			<p>이름을 바꾸면 다른 사람이 당신의 기존 이름으로 가입할 수 있습니다.</p>
			
			<div class=form-group>
				<label>현재 이름 확인 (${html.escape(username)}):</label>
				<input type=text name=username class=form-control placeholder="${html.escape(username)}" value="${html.escape(req.body['username'] || '')}" />
				${!error && req.method == 'POST' && req.body['username'] != username ? (error = true, `<p class=error-desc>자신의 사용자 이름을 입력해주세요.</p>`) : ''}
			</div>
			
			<div class=form-group>
				<label>비밀번호 확인:</label>
				<input type=password name=password class=form-control />
				${!error && req.method == 'POST' && sha3(req.body['password'] + '') != password ? (error = true, `<p class=error-desc>비밀번호를 확인해주세요.</p>`) : ''}
			</div>
			
			<div class=form-group>
				<label>새로운 사용자 이름:</label>
				<input type=text name=new_username class=form-control value="${html.escape(req.body['new_username'] || '')}" />
				${!error && req.method == 'POST' && duplicate ? (error = true, `<p class=error-desc>사용자 이름이 이미 존재합니다.</p>`) : ''}
				${!error && req.method == 'POST' && invalidformat ? (error = true, `<p class=error-desc>사용자 이름을 형식에 맞게 입력해주세요.</p>`) : ''}
			</div>
			
			<div class=btns>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
				<button type=submit class="btn btn-danger">변경</button>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
			</div>
		</form>
	`;
	
	if(req.method == 'POST' && !error) {
		var newusername = req.body['new_username'];
		await curs.execute("update users set username = ? where username = ?", [newusername, username]);
		await curs.execute("update perms set username = ? where username = ?", [newusername, username]);
		await curs.execute("update suspend_account set username = ? where username = ?", [newusername, username]);
		await curs.execute("update user_settings set username = ? where username = ?", [newusername, username]);
		await curs.execute("update acl set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update classic_acl set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update documents set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update threads set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update edit_requests set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update history set title = ? where title = ? and namespace = '사용자'", [newusername, username]);
		await curs.execute("update login_history set username = ? where username = ?", [newusername, username]);
		await curs.execute("update stars set username = ? where username = ?", [newusername, username]);
		await curs.execute("update useragents set username = ? where username = ?", [newusername, username]);
		await curs.execute("update history set username = ? where username = ? and ismember = 'author'", [newusername, username]);
		await curs.execute("update res set username = ? where username = ? and ismember = 'author'", [newusername, username]);
		await curs.execute("update res set hider = ? where hider = ?", [newusername, username]);
		await curs.execute("update block_history set executer = ? where executer = ? and ismember = 'author'", [newusername, username]);
		await curs.execute("update block_history set target = ? where target = ?", [newusername, username]);
		await curs.execute("update edit_requests set processor = ? where processor = ? and ismember = 'author'", [newusername, username]);
		await curs.execute("update edit_requests set username = ? where username = ? and ismember = 'author'", [newusername, username]);
		await curs.execute("update autologin_tokens set username = ? where username = ?", [newusername, username]);
		req.session.username = newusername;
		permlist[newusername] = permlist[username];
		delete permlist[username];
		userset[newusername] = userset[username];
		delete userset[username];
		return res.send(await render(req, '사용자 이름 변경', `
			<p><strong>${html.escape(newusername)}</strong>(으)로 이름을 변경하였습니다.</p>
		`, {}, _, false, 'delete_account'));
	}
	
	return res.send(await render(req, '사용자 이름 변경', content, {}, _, error, 'delete_account'));
});
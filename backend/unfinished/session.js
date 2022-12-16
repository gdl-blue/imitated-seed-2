router.get(/^\/member\/logout$/, async(req, res, next) => {
	var autologin;
	if(autologin = req.cookies['honoka']) {
		await curs.execute("delete from autologin_tokens where token = ?", [autologin]);
		res.cookie('honoka', '', { expires: new Date(Date.now() - 1) });
	}
	var desturl = req.query['redirect'];
	if(!desturl) desturl = '/';
	delete req.session.username;
	res.redirect(desturl);
});

router.all(/^\/member\/login$/, async function loginScreen(req, res, next) {
	if(!['GET', 'POST'].includes(req.method)) return next();
	
	var desturl = req.query['redirect'];
	if(!desturl) desturl = '/';
	
	if(islogin(req)) return res.redirect(desturl);
	
	var id = '1', pw = '1';
	
	var error = null;
	
	if(req.method == 'POST') do {
		id = req.body['username'] || '';
		pw = req.body['password'] || '';
		if(!id) break;
		var data = await curs.execute("select username from users where lower(username) = ? COLLATE NOCASE", [id.toLowerCase()]);
		var invalidusername = !id || !data.length;
		if(invalidusername) break;
		var usr = data;
		if(!pw) break;
		var data = await curs.execute("select username, password from users where lower(username) = ? and password = ? COLLATE NOCASE", [id.toLowerCase(), sha3(pw)]);
		var invalidpw = !invalidusername && (!data.length || !pw);
		if(invalidpw) break;
		var blocked = ver('4.1.0') ? 0 : await userblocked(id);
		if(blocked) break;
	} while(0);
	
	var content = `
		<form class=login-form method=post>
			<div class=form-group>
				<label>Username</label>
				<input class=form-control name="username" type="text" value="${html.escape(req.method == 'POST' ? req.body['username'] : '')}" />
				${req.method == 'POST' && !error && !id.length ? (error = err('p', { code: 'validator_required', tag: 'username' })) : ''}
				${req.method == 'POST' && !error && invalidusername ? (error = err('p', 'invalid_username')) : ''}
				${req.method == 'POST' && !error && blocked ? (error = err('p', { msg: `차단된 계정입니다.<br />차단 만료일 : ${(blocked.expiration == '0' ? '무기한' : new Date(Number(blocked.expiration)))}<br />차단 사유 : ${blocked.note}` })) : ``}
			</div>

			<div class=form-group>
				<label>Password</label>
				<input class=form-control name="password" type="password" />
				${req.method == 'POST' && !error && !pw.length ? (error = err('p', { code: 'validator_required', tag: 'password' })) : ''}
				${req.method == 'POST' && !error && invalidpw ? (error = err('p', { msg: '암호가 올바르지 않습니다.' })) : ''}
			</div>
			
			<div class="checkbox" style="display: inline-block;">
				<label>
					<input type=checkbox name=autologin>
					<span>자동 로그인</span>
				</label>
			</div>
			
			<a href="/member/recover_password" style="float: right;">[아이디/비밀번호 찾기]</a> <br>
			
			<a href="/member/signup" class="btn btn-secondary">계정 만들기</a><button type="submit" class="btn btn-primary">로그인</button>
		</form>
	`;
	
	if(req.method == 'POST' && !error) {
		id = usr[0].username;
		if(req.body['autologin']) {
			const key = rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/', 128);
			res.cookie('honoka', key, {
				expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 360),
				httpOnly: true,
			});
			await curs.execute("insert into autologin_tokens (username, token) values (?, ?)", [id, key]);
		}
		
		if(!hostconfig.disable_login_history) {
			curs.execute("insert into login_history (username, ip, time) values (?, ?, ?)", [id, ip_check(req, 1), getTime()]);
			conn.run("delete from useragents where username = ?", [id], () => {
				curs.execute("insert into useragents (username, string) values (?, ?)", [id, req.headers['user-agent']]);
			});
		}
		
		req.session.username = id;
		return res.redirect(desturl);
	}
	
	res.send(await render(req, '로그인', content, {}, _, error, 'login'));
});
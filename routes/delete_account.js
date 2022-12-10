if(hostconfig.allow_account_deletion) router.all(/^\/member\/delete_account$/, async(req, res, next) => {
	if(!['GET', 'POST'].includes(req.method)) return next();
	if(!islogin(req)) return res.redirect('/member/login?redirect=%2Fmember%2Fdelete_account');
	const username = ip_check(req);
	var error = false;
	
	var { password } = (await curs.execute("select password from users where username = ?", [username]))[0];
	
	var content = `
		<form method=post onsubmit="return confirm('마지막 경고입니다. 탈퇴하려면 [확인]을 누르십시오.');">
			<p>계정을 삭제하면 문서 역사에서 당신의 사용자 이름이 익명화됩니다. 문서 배포 라이선스가 퍼블릭 도메인이 아닌 경우 가급적 탈퇴는 자제해주세요.</p>
			
			<div class=form-group>
				<label>사용자 이름을 확인해주세요 (${html.escape(username)}):</label>
				<input type=text name=username class=form-control placeholder="${html.escape(username)}" value="${html.escape(req.body['username'] || '')}" />
				${!error && req.method == 'POST' && req.body['username'] != username ? (error = true, `<p class=error-desc>자신의 사용자 이름을 입력해주세요.</p>`) : ''}
			</div>
			
			<div class=form-group>
				<label>비밀번호 확인:</label>
				<input type=password name=password class=form-control />
				${!error && req.method == 'POST' && sha3(req.body['password'] + '') != password ? (error = true, `<p class=error-desc>비밀번호를 확인해주세요.</p>`) : ''}
			</div>
			
			<div class=btns>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
				<button type=submit class="btn btn-danger">삭제</button>
				<a class="btn btn-secondary" href="/">취소</a>
				<a class="btn btn-secondary" href="/">취소</a>
			</div>
		</form>
	`;
	
	if(req.method == 'POST' && !error) {
		curs.execute("delete from users where username = ?", [username]);
		curs.execute("delete from perms where username = ?", [username]);
		curs.execute("delete from suspend_account where username = ?", [username]);
		curs.execute("delete from user_settings where username = ?", [username]);
		curs.execute("delete from acl where title = ? and namespace = '사용자'", [username]);
		curs.execute("delete from classic_acl where title = ? and namespace = '사용자'", [username]);
		curs.execute("delete from documents where title = ? and namespace = '사용자'", [username]);
		curs.execute("delete from history where title = ? and namespace = '사용자'", [username]);
		curs.execute("delete from login_history where username = ?", [username]);
		curs.execute("delete from stars where username = ?", [username]);
		curs.execute("delete from useragents where username = ?", [username]);
		curs.execute("update history set username = '탈퇴한 사용자', ismember = 'ip' where username = ? and ismember = 'author'", [username]);
		curs.execute("update res set username = '탈퇴한 사용자', ismember = 'ip' where username = ? and ismember = 'author'", [username]);
		curs.execute("update res set hider = '탈퇴한 사용자' where hider = ?", [username]);
		curs.execute("update block_history set executer = '탈퇴한 사용자', ismember = 'ip' where executer = ? and ismember = 'author'", [username]);
		curs.execute("update block_history set target = '탈퇴한 사용자' where target = ?", [username]);
		curs.execute("update edit_requests set processor = '탈퇴한 사용자', ismember = 'ip' where processor = ? and ismember = 'author'", [username]);
		curs.execute("update edit_requests set username = '탈퇴한 사용자', ismember = 'ip' where username = ? and ismember = 'author'", [username]);
		delete req.session.username;
		delete userset[username];
		if(permlist[username]) permlist[username] = [];
		res.cookie('honoka', '', { expires: new Date(Date.now() - 1) });
		return res.send(await render(req, '계정 삭제', `
			<p><strong>${html.escape(username)}</strong>님 안녕히 가십시오.</p>
		`, {}, _, false, 'delete_account'));
	}
	
	return res.send(await render(req, '계정 삭제', content, {}, _, error, 'delete_account'));
});
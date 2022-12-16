if(!ver('4.18.0')) router.all(/^\/admin\/suspend_account$/, async(req, res) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!hasperm(req, 'suspend_account')) return res.status(403).send(await showError(req, 'permission'));
	
	var content = `
		<form method=post>
			<div>
				<label>유저 이름 : </label>
				<input class=form-control id=usernameInput name=username style="width: 250px;" value="${req.method == 'POST' ? html.escape(req.body['username'] || '') : ''}" type=text />
			</div>
			
			<div>
				<label>메모 : </label>
				<input class=form-control id=noteInput name=note style="width: 400px;" value="${req.method == 'POST' ? html.escape(req.body['note'] || '') : ''}" type=text />
			</div>
			
			<div>
				<label>기간 : </label> 
				<select class=form-control name=expire id=expireSelect>
					${expireopt(req)}
				</select>
			</div>
			
			<button class="btn btn-info pull-right" id=moveBtn style="width: 100px;" type=submit>확인</button>
		</form>
	`;
	
	var error = null;
	
	if(req.method == 'POST') do {
		var { expire, note, username } = req.body;
		if(!username) { content = (error = err('alert', { code: 'validator_required', tag: 'username' })) + content; break; }
		if((hostconfig.owners || []).includes(username)) { content = (error = err('alert', { code: 'invalid_permission' })) + content; break; }
		var data = await curs.execute("select username from users where lower(username) = ?", [username.toLowerCase()]);
		if(!data.length) { content = (error = err('alert', { code: 'invalid_username' })) + content; break; }
		username = data[0].username;
		if(!note) { content = (error = err('alert', { code: 'validator_required', tag: 'note' })) + content; break; }
		if(!expire) { content = (error = err('alert', { code: 'validator_required', tag: 'expire' })) + content; break; }
		if(isNaN(Number(expire))) { content = (error = err('alert', { code: 'invalid_type_number', tag: 'expire' })) + content; break; }
		if(Number(expire) > 29030400) { content = (error = err('alert', { msg: 'expire의 값은 29030400 이하이어야 합니다.' })) + content; break; }
		if(expire == '-1') {
			if(!(await userblocked(username))) { content = (error = err('alert', { code: 'already_unsuspend_account' })) + content; break; }
			curs.execute("delete from suspend_account where username = ?", [username]);
			var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
			if(data.length) logid = Number(data[0].logid) + 1;
			insert('block_history', {
				date: getTime(),
				type: 'suspend_account',
				duration: '-1',
				note,
				ismember: islogin(req) ? 'author' : 'ip',
				executer: ip_check(req),
				target: username,
				logid,
			});
			return res.redirect('/admin/suspend_account');
		}
		if(await userblocked(username)) { content = (error = err('alert', { code: 'already_suspend_account' })) + content; break; }
		const date = getTime();
		const expiration = expire == '0' ? '0' : String(Number(date) + Number(expire) * 1000);
		
		curs.execute("insert into suspend_account (username, date, expiration, note) values (?, ?, ?, ?)", [username, String(getTime()), expiration, note]);
		var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
		if(data.length) logid = Number(data[0].logid) + 1;
		insert('block_history', {
			date: getTime(),
			type: 'suspend_account',
			duration: expire,
			note,
			ismember: islogin(req) ? 'author' : 'ip',
			executer: ip_check(req),
			target: username,
			logid,
		});
		
		return res.redirect('/admin/suspend_account');
	} while(0);
	
	return res.send(await render(req, '사용자 차단', content, {}, '', error, 'suspend_account'));
});
router.all(/^\/admin\/login_history$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!getperm('login_history', ip_check(req))) return res.send(await showError(req, 'permission'));
	
	var error = null;
	var content = `
		<form method=post>
			<div>
				<label>유저 이름 :</label>
				<input type=text id=usernameInput class=form-control style="width: 250px;" name=username />
			</div>
			
			<button type=submit class="btn btn-info pull-right" style="width: 100px;">확인</button>
		</form>
	`;
	
	if(req.method == 'POST') {
		var username = req.body['username'];
		if(!username) return res.send(await render(req, '로그인 내역', (error = err('alert', { code: 'validator_required', tag: 'username' })) + content, {}, _, error, 'login_history'));
		var data = await curs.execute("select username from users where lower(username) = ?", [username.toLowerCase()]);
		if(!data.length)
			return res.send(await render(req, '로그인 내역', (error = err('alert', { code: 'invalid_username' })) + content, {}, _, error, 'login_history'));
		username = data[0].username;
		if((hostconfig.owners || []).includes(username) && hostconfig.protect_owners && username != ip_check(req))
			return res.send(await showError(req, 'permission'));
		
		const id = rndval('abcdef1234567890', 64);
		if(!loginHistory[ip_check(req)]) loginHistory[ip_check(req)] = {};
		var history = await curs.execute("select ip, time from login_history where username = ? order by cast(time as integer) desc limit 50", [username]);
		var ua = await curs.execute("select string from useragents where username = ?", [username]);
		loginHistory[ip_check(req)][id] = { username, useragent: (ua[0] || { string: '' }).string, history };
		
		var logid = 1, lgdata = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
		if(lgdata.length) logid = Number(lgdata[0].logid) + 1;
		if(!hostconfig.disable_login_history)
			insert('block_history', {
				date: getTime(),
				type: 'login_history',
				duration: 0,
				note: '',
				ismember: islogin(req) ? 'author' : 'ip',
				executer: ip_check(req),
				target: username,
				logid,
			});
		
		return res.redirect('/admin/login_history/' + id);
	}
	
	return res.send(await render(req, '로그인 내역', content, {}, _, _, 'login_history'));
});

router.get(/^\/admin\/login_history\/(.+)$/, async(req, res) => {
	const id = req.params[0];
	
	if(!loginHistory[ip_check(req)] || (loginHistory[ip_check(req)] && !loginHistory[ip_check(req)][id]))
		return res.redirect('/admin/login_history');
	
	const { username, history, useragent } = loginHistory[ip_check(req)][id];
	
	var content = `
		<p>마지막 로그인 UA : ${html.escape(useragent)}</p>
		<p>이메일 : ${getUserSetting(username, 'email') || ''}
		
		${navbtn(0, 0, 0, 0)}
		
		<div class=wiki-table-wrap>
			<table class=wiki-table>
				<tbody>
					<tr>
						<th>Date</th>
						<th>IP</th>
					</tr>
	`;
	
	for(var item of history) {
		content += `<tr><td>${generateTime(toDate(item.time), timeFormat)}</td><td>${item.ip}</td></tr>`;
	}
	
	content += `
				</tbody>
			</table>
		</div>
		${navbtn(0, 0, 0, 0)}
	`;
	
	return res.send(await render(req, username + ' 로그인 내역', content, {}, _, _, 'login_history'));
});

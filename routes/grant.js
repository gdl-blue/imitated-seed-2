router.all(/^\/admin\/grant$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	var username = req.query['username'];
	if(!hasperm(req, 'grant') && !hasperm(req, 'developer')) return res.send(await showError(req, 'permission'));
	if(!hasperm(req, 'developer') && !((hostconfig.owners || []).includes(ip_check(req)))) perms.remove('developer');
	
	var error = null;
	var content = `
		<form method=get>
			<div>
				<label>유저 이름 :</label>
				<input type=text id=usernameInput class=form-control style="width: 250px;" name=username value="${html.escape(username ? username : '')}" />
				<button type=submit class="btn btn-info pull-right" style="width: 100px;">확인</button>
			</div>
		</form>
		<br />
	`;
	if(username === undefined) return res.send(await render(req, '권한 부여', content, {}, _, error, 'grant'));
	if(!username) return res.send(await render(req, '권한 부여', (error = err('alert', { code: 'validator_required', tag: 'username' })) + content, {}, _, error, 'grant'));
	var data = await curs.execute("select username from users where lower(username) = ?", [username.toLowerCase()]);
	if(!data.length) 
		return res.send(await render(req, '권한 부여', (error = err('alert', { code: 'invalid_username' })) + content, {}, _, error, 'grant'));
	username = data[0].username;
	if((hostconfig.owners || []).includes(username) && hostconfig.protect_owners && username != ip_check(req))
		return res.send(await showError(req, 'permission'));
	
	var chkbxs = '';
	for(var prm of perms) {
		// if(!getperm('developer', ip_check(req), 1) && 'developer' == (prm)) continue;
		if(ver('4.20.0') && prm == 'no_force_recaptcha') prm = 'no_force_captcha';
		chkbxs += `
			${prm} <input type=checkbox ${getperm(prm, username, 1) ? 'checked' : ''} name=permissions value="${prm}" /><br />
		`;
	}
	
	content += `
		<h3>사용자 ${html.escape(username)}</h3>
	
		<form method=post>
			<div>
				${chkbxs}
			</div>
			
			<button type=submit class="btn btn-info pull-right" style="width: 100px;">확인</button>
		</form>
	`;
	
	if(req.method == 'POST') {
		if(!username) return res.send(await showError(req, 'invalid_username'));
		var data = await curs.execute("select username from users where username = ?", [username]);
		if(!data.length) return res.send(await showError(req, 'invalid_username'));
		if((hostconfig.owners || []).includes(username) && hostconfig.protect_owners && username != ip_check(req))
			return res.send(await showError(req, 'permission'));
		
		var prmval = req.body['permissions'];
		if(!prmval || !prmval.find) prmval = [prmval];
		prmval = prmval.map(item => ver('4.20.0') && item == 'no_force_captcha' ? 'no_force_recaptcha' : item);
		
		var logstring = '';
		for(var prm of perms) {
			// if(!getperm('developer', ip_check(req), 1) && 'developer' == (prm)) continue;
			if(getperm(prm, username, 1) && (typeof(prmval.find(item => item == prm)) == 'undefined')) {
				logstring += '-' + (ver('4.20.0') && item == 'no_force_recaptcha' ? 'no_force_captcha' : prm) + ' ';
				if(permlist[username]) permlist[username].splice(permlist[username].findIndex(item => item == prm), 1);
				curs.execute("delete from perms where perm = ? and username = ?", [prm, username]);
			} else if(!getperm(prm, username, 1) && (typeof(prmval.find(item => item == prm)) != 'undefined')) {
				logstring += '+' + (ver('4.20.0') && item == 'no_force_recaptcha' ? 'no_force_captcha' : prm) + ' ';
				if(!permlist[username]) permlist[username] = [prm];
				else permlist[username].push(prm);
				curs.execute("insert into perms (perm, username) values (?, ?)", [prm, username]);
			}
		}
		if(!logstring.length)
			return res.send(await render(req, '권한 부여', (error = err('alert', { code: 'no_change' })) + content, {}, _, error, 'grant'));
		
		var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
		if(data.length) logid = Number(data[0].logid) + 1;
		insert('block_history', {
			date: getTime(),
			type: 'grant',
			note: logstring,
			ismember: islogin(req) ? 'author' : 'ip',
			executer: ip_check(req),
			target: username,
			logid,
		});
		
		return res.redirect('/admin/grant?username=' + encodeURIComponent(username));
	}
	
	res.send(await render(req, '권한 부여', content, {}, _, _, 'grant'));
});

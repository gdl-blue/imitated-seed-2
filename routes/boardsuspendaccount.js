if(hostconfig.namuwiki_exclusive) router.post(/^\/admin\/boardsuspendaccount\/remove$/, async(req, res) => {
	if(!hasperm(req, 'suspend_account')) return res.status(403).send(await showError(req, 'permission'));
	if(!req.body['username']) return res.status(400).send(await showError(req, { code: 'validator_required', tag: 'username' }));
	var dbdata = await curs.execute("select username from boardsuspendaccount where username = ?", [req.body['username']]);
	if(!dbdata.length) return res.status(400).send(await showError(req, 'invalid_value'));
	await curs.execute("delete from boardsuspendaccount where username = ?", [req.body['username']]);
	return res.redirect('/admin/boardsuspendaccount');
});

if(hostconfig.namuwiki_exclusive) router.all(/^\/admin\/boardsuspendaccount$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!hasperm(req, 'suspend_account')) return res.status(403).send(await showError(req, 'permission'));
	const { from, until } = req.query;
	var error = null;
	
	await curs.execute("delete from boardsuspendaccount where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	var ld   = await curs.execute("select username from boardsuspendaccount order by username desc limit 1");
	var fd   = await curs.execute("select username from boardsuspendaccount order by username asc limit 1");
	var data = await curs.execute("select username, expiration, note, date from boardsuspendaccount " + (from ? "where cidr > ?" : (until ? "where username < ?" : "")) + " order by username " + (until ? 'desc' : 'asc') + " limit 50", (from || until ? [from || until] : []));
	if(until) data = data.reverse();
	try {
		var navbtns = navbtnss(fd[0].username, ld[0].username, data[0].username, data[data.length-1].username, '/admin/boardsuspendaccount');
	} catch(e) {
		var navbtns = navbtn(0, 0, 0, 0);
	}
	
	var content = `
		<form method=post class=settings-section>
    		<div class=form-group>
    			<label class=control-label>사용자 이름 :</label>
    			<div>
    				<input type=text class=form-control id=usernameInput name=username value="${req.method == 'POST' ? html.escape(req.body['username'] || '') : ''}" />
    			</div>
    		</div>

    		<div class=form-group>
    			<label class=control-label>메모 :</label>
    			<div>
    				<input type=text class=form-control id=noteInput name=note value="${req.method == 'POST' ? html.escape(req.body['note'] || '') : ''}" />
    			</div>
    		</div>

    		<div class=form-group>
    			<label class=control-label>차단 기간 :</label>
    			<select class=form-control name=expire>
    				${expireopt(req)}
    			</select>
    		</div>

    		<div class=btns style="margin-bottom: 20px;">
    			<button type=submit class="btn btn-primary" style="width: 90px;">추가</button>
    		</div>
    	</form>
		
		<div class=line-break style="margin: 20px 0;"></div>
		
		${navbtns}
		
		<form class="form-inline pull-right" id=searchForm method=get>
    		<div class=input-group>
    			<input type=text class=form-control id=searchQuery name=from placeholder="CIDR" />
    			<span class=input-group-btn>
    				<button type=submit class="btn btn-primary">Go</button>
    			</span>
    		</div>
    	</form>
		
		<div class=table-wrap>
			<table class=table style="margin-top: 7px;">
				<colgroup>
					<col style="width: 150px;" />
					<col />
					<col style="width: 200px" />
					<col style="width: 160px" />
					<col style="width: 60px;" />
				</colgroup>
				<thead>
					<tr style="vertical-align: bottom; border-bottom: 2px solid #eceeef;">
						<th>사용자 이름</th>
						<th>메모</th>
						<th>차단일</th>
						<th>만료일</th>
						<th style="text-align: center;">작업</th>
					</tr>
				</thead>
				<tbody>
					
	`;
	
	for(var row of data) {
		content += `
			<tr>
				<td>${row.username}</td>
				<td>${row.note}</td>
				<td>${generateTime(toDate(row.date), timeFormat)}
				<td>${!Number(row.expiration) ? '영구' : generateTime(toDate(row.expiration), timeFormat)}
				<td class=text-center>
					<form method=post onsubmit="return confirm('정말로?');" action="/admin/boardsuspendaccount/remove">
						<input type=hidden name=username value="${row.username}" />
						<input type=submit class="btn btn-sm btn-danger" value="삭제" />
					</form>
				</td>
			</tr>
		`;
	}
	
	content += `
				</tbody>
    		</table>
    	</div>
	`;
	
	var error = false;
	
	if(req.method == 'POST') {
		var { username, expire, note } = req.body;
		for(var val of ['username', 'note', 'expire']) {
			if(!req.body[val]) return res.send(await render(req, '차소게 사용자 차단', (error = err('alert', { code: 'validator_required', tag: val })) + content, {}, '', error, 'boardsuspendaccount'));
		}
		var data = await curs.execute("select username from users where lower(username) = ?", [username.toLowerCase()]);
		if(!data.length) 
			return res.send(await render(req, '차소게 사용자 차단', (error = err('alert', { code: 'invalid_username' })) + content, {}, '', error, 'boardsuspendaccount'));
		username = data[0].username;
		
		const date = getTime();
		if(isNaN(Number(expire))) {
			return res.send(await render(req, '차소게 사용자 차단', (error = err('alert', { code: 'invalid_type_number', tag: 'expire' })) + content, {}, '', error, 'boardsuspendaccount'));
		}
		if(Number(expire) > 29030400) {
			return res.send(await render(req, '차소게 사용자 차단', (error = err('alert', { msg: 'expire의 값은 29030400 이하이어야 합니다.' })) + content, {}, '', error, 'boardsuspendaccount'));
		}
		const expiration = expire == '0' ? '0' : String(Number(date) + Number(expire) * 1000);
		var data = await curs.execute("select username from boardsuspendaccount where username = ? limit 1", [username]);
		if(data.length) content = (error = err('alert', { code: 'already_suspend_account' })) + content;
		else {
			await curs.execute("insert into boardsuspendaccount (username, expiration, note, date) values (?, ?, ?, ?)", [username, expiration, note, date]);
			
			return res.redirect('/admin/boardsuspendaccount');
		}
	}
	
	res.send(await render(req, '차소게 사용자 차단', content, {
	}, '', error, 'boardsuspendaccount'));
});
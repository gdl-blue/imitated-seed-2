if(!ver('4.18.0')) router.post(/^\/admin\/ipacl\/remove$/, async(req, res) => {
	if(!hasperm(req, 'ipacl')) return res.status(403).send(await showError(req, 'permission'));
	if(!req.body['ip']) return res.status(400).send(await showError(req, { code: 'validator_required', tag: 'ip' }));
	var dbdata = await curs.execute("select cidr from ipacl where cidr = ?", [req.body['ip']]);
	if(!dbdata.length) return res.status(400).send(await showError(req, 'invalid_value'));
	await curs.execute("delete from ipacl where cidr = ?", [req.body['ip']]);
	var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
	if(data.length) logid = Number(data[0].logid) + 1;
	insert('block_history', {
		date: getTime(),
		type: 'ipacl_remove',
		ismember: islogin(req) ? 'author' : 'ip',
		executer: ip_check(req),
		target: req.body['ip'],
		logid,
	});
	return res.redirect('/admin/ipacl');
});

if(!ver('4.18.0')) router.all(/^\/admin\/ipacl$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!hasperm(req, 'ipacl')) return res.status(403).send(await showError(req, 'permission'));
	const { from, until } = req.query;
	var error = null;
	
	await curs.execute("delete from ipacl where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
	var ld   = await curs.execute("select cidr from ipacl order by cidr desc limit 1");
	var fd   = await curs.execute("select cidr from ipacl order by cidr asc limit 1");
	var data = await curs.execute("select cidr, al, expiration, note, date from ipacl " + (from ? "where cidr > ?" : (until ? "where cidr < ?" : "")) + " order by cidr " + (until ? 'desc' : 'asc') + " limit 50", (from || until ? [from || until] : []));
	if(until) data = data.reverse();
	try {
		var navbtns = navbtnss(fd[0].cidr, ld[0].cidr, data[0].cidr, data[data.length-1].cidr, '/admin/ipacl');
	} catch(e) {
		var navbtns = navbtn(0, 0, 0, 0);
	}
	
	var content = `
		<form method=post class=settings-section>
    		<div class=form-group>
    			<label class=control-label>IP 주소 (CIDR<sup><a href="https://ko.wikipedia.org/wiki/%EC%82%AC%EC%9D%B4%EB%8D%94_(%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%82%B9)" target=_blank>[?]</a></sup>) :</label>
    			<div>
    				<input type=text class=form-control id=ipInput name=ip value="${req.method == 'POST' ? html.escape(req.body['ip'] || '') : ''}" />
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

    		<div class=form-group>
    			<label class=control-label>로그인 허용 :</label>
    			<div class=checkbox>
    				<label>
    					<input type=checkbox id=allowLoginInput name=allow_login${req.method == 'POST' ? (req.body['allow_login'] ? ' checked' : '') : ''} />&nbsp;&nbsp;Yes
    				</label>
    			</div>
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
					<col style="width: 60px" />
					<col style="width: 60px;" />
				</colgroup>
				<thead>
					<tr style="vertical-align: bottom; border-bottom: 2px solid #eceeef;">
						<th>IP</th>
						<th>메모</th>
						<th>차단일</th>
						<th>만료일</th>
						<th style="text-align: center;">AL</th>
						<th style="text-align: center;">작업</th>
					</tr>
				</thead>
				<tbody>
					
	`;
	
	for(var row of data) {
		content += `
			<tr>
				<td>${row.cidr}</td>
				<td>${row.note}</td>
				<td>${generateTime(toDate(row.date), timeFormat)}
				<td>${!Number(row.expiration) ? '영구' : generateTime(toDate(row.expiration), timeFormat)}
				<td>${row.al == '1' ? 'Y' : 'N'}</td>
				<td class=text-center>
					<form method=post onsubmit="return confirm('정말로?');" action="/admin/ipacl/remove">
						<input type=hidden name=ip value="${row.cidr}" />
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
    	<div class="text-right pull-right">
    		AL = Allow Login(로그인 허용)
    	</div>
	`;
	
	var error = false;
	
	if(req.method == 'POST') {
		var { ip, allow_login, expire, note } = req.body;
		for(var val of ['ip', 'note', 'expire']) {
			if(!req.body[val]) return res.send(await render(req, 'IPACL', (error = err('alert', { code: 'validator_required', tag: val })) + content, {}, '', error, 'ipacl'));
		}
		if(!ip.includes('/')) ip += '/32';
		if(!ip.match(/^([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])\/([1-9]|[12][0-9]|3[0-2])$/)) error = true, content = alertBalloon(fetchErrorString('invalid_cidr'), 'danger', true, 'fade in') + content;
		else {
			const date = getTime();
			if(isNaN(Number(expire))) {
				return res.send(await render(req, 'IPACL', (error = err('alert', { code: 'invalid_type_number', tag: 'expire' })) + content, {}, '', error, 'ipacl'));
			}
			if(Number(expire) > 29030400) {
				return res.send(await render(req, 'IPACL', (error = err('alert', { msg: 'expire의 값은 29030400 이하이어야 합니다.' })) + content, {}, '', error, 'ipacl'));
			}
			const expiration = expire == '0' ? '0' : String(Number(date) + Number(expire) * 1000);
			var data = await curs.execute("select cidr from ipacl where cidr = ? limit 1", [ip]);
			if(data.length) content = (error = err('alert', { code: 'ipacl_already_exists' })) + content;
			else {
				await curs.execute("insert into ipacl (cidr, al, expiration, note, date) values (?, ?, ?, ?, ?)", [ip, allow_login ? '1' : '0', expiration, note, date]);
				
				var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
				if(data.length) logid = Number(data[0].logid) + 1;
				insert('block_history', {
					date: getTime(),
					type: 'ipacl_add',
					duration: expire,
					note,
					ismember: islogin(req) ? 'author' : 'ip',
					executer: ip_check(req),
					target: ip,
					logid,
				});
				
				return res.redirect('/admin/ipacl');
			}
		}
	}
	
	res.send(await render(req, 'IPACL', content, {
	}, '', error, 'ipacl'));
});
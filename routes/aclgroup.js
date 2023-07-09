if(ver('4.18.0') && hostconfig.namuwiki_exclusive)
router.get(/^\/self_unblock$/, async(req, res) => {
	const id = req.query['id'];
	var dbdata = await curs.execute("select type, username, aclgroup from aclgroup where id = ?", [id || '-1']);
	if(!dbdata.length) return res.status(400).send(await showError(req, 'aclgroup_not_found'));
	
	if (
		(islogin(req) && dbdata[0].type == 'username' && dbdata[0].username != ip_check(req)) ||
		(dbdata[0].type == 'ip' && !ipRangeCheck(ip_check(req, 1), dbdata[0].username))
	)   return res.status(400).send(await showError(req, 'aclgroup_not_found'));
	
	var dbdata2 = await curs.execute("select warning_description from aclgroup_groups where name = ?", [dbdata[0].aclgroup]);
	if(!dbdata2.length || !dbdata2[0].warning_description)
		return res.status(400).send(await showError(req, 'aclgroup_not_found'));
	
	await curs.execute("delete from aclgroup where id = ?", [id]);
	var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
	if(data.length) logid = Number(data[0].logid) + 1;
	insert('block_history', {
		date: getTime(),
		type: 'aclgroup_remove',
		ismember: islogin(req) ? 'author' : 'ip',
		executer: ip_check(req),
		id,
		target: dbdata[0].username,
		note: '확인했습니다.',
		aclgroup: dbdata[0].aclgroup,
		logid,
	});
	return res.redirect('/edit/' + encodeURIComponent(req.query['document']));
});

if(ver('4.18.0')) router.all(/^\/aclgroup\/create$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	if(!hasperm(req, 'aclgroup')) return res.send(await showError(req, 'permission'));
	
	var content = `
		<form method=post>
			<div class=form-group>
				<label>그룹 이름: </label>
				<input type=text name=group class=form-control />
			</div>
			
			${hostconfig.namuwiki_exclusive ? `
			<div class=form-group>
				<label>경고 그룹용 문구: </label>
				<input class=form-control name="warning_description" type="text" /> 
			</div>
			` : ''}
			
			<div class=btns>
				<button type=submit class="btn btn-primary" style="width: 100px;">생성</button>
			</div>
		</form>
	`;
	
	var error = null;
	
	if(req.method == 'POST') do {
		const { group } = req.body;
		if(!group) {
			content = (error = err('alert', { code: 'validator_required', tag: 'group' })) + content;
			break;
		} else {
			var data = await curs.execute("select name from aclgroup_groups where name = ?", [group]);
			if(data.length) {
				content = (error = err('alert', { code: 'aclgroup_already_exists' })) + content;
				break;
			}
			else {
				await curs.execute("insert into aclgroup_groups (name, css, warning_description) values (?, ?, ?)", [group, req.body['css'] || '', req.body['warning_description'] || '']);
				return res.redirect('/aclgroup?group=' + encodeURIComponent(group));
			}
		}
	} while(0);
	
	res.send(await render(req, 'ACL그룹 생성', content, {}, '', error, _));
});

if(ver('4.18.0')) router.post(/^\/aclgroup\/delete$/, async(req, res, next) => {
	if(!hasperm(req, 'aclgroup')) return res.send(await showError(req, 'permission'));
	const { group } = req.body;
	if(!group) return res.redirect('/aclgroup');  // 귀찮음
	await curs.execute("delete from aclgroup_groups where name = ?", [group]);
	res.redirect('/aclgroup');
});

if(ver('4.18.0')) router.post(/^\/aclgroup\/remove$/, async(req, res) => {
	if(!hasperm(req, 'aclgroup') && !hasperm(req, 'admin')) return res.send(await showError(req, 'permission'));
	if(!req.body['id']) return res.status(400).send(await showError(req, { code: 'validator_required', tag: 'id' }));
	var dbdata = await curs.execute("select username, aclgroup from aclgroup where id = ?", [req.body['id']]);
	if(!dbdata.length) return res.status(400).send(await showError(req, 'invalid_value'));
	if(dbdata[0].aclgroup == '차단된 사용자' && !hasperm(req, 'admin'))
		return res.send(await showError(req, 'permission'));
	if(dbdata[0].aclgroup != '차단된 사용자' && !hasperm(req, 'aclgroup'))
		return res.send(await showError(req, 'permission'));
	await curs.execute("delete from aclgroup where id = ?", [req.body['id']]);
	var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
	if(data.length) logid = Number(data[0].logid) + 1;
	insert('block_history', {
		date: getTime(),
		type: 'aclgroup_remove',
		ismember: islogin(req) ? 'author' : 'ip',
		executer: ip_check(req),
		id: req.body['id'],
		target: dbdata[0].username,
		note: req.body['note'] || '',
		aclgroup: dbdata[0].aclgroup,
		logid,
	});
	return res.redirect('/aclgroup?group=' + encodeURIComponent(dbdata[0].aclgroup));
});

if(ver('4.18.0')) router.all(/^\/aclgroup$/, async(req, res) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	var data = await curs.execute("select name from aclgroup_groups");
	var data2 = await curs.execute("select name from aclgroup_groups where not name = '차단된 사용자'");
	const groups = data.map(item => item.name);
	var editable = hasperm(req, 'aclgroup');
	var editabled = editable;
	if(req.query['group'] == '차단된 사용자')
		editable = hasperm(req, 'admin');
	
	var tabs = ``;
	var group = null;
	if(groups.includes(req.query['group'])) {
		if(req.query['group'] == '차단된 사용자' && !editable) {
			if(data2.length)
				group = data2[0].name;
		} else {
			group = req.query['group'];
		}
	} else if(editable && data.length) {
		group = data[0].name;
	} else if(data2.length) {
		group = data2[0].name;
	}
	for(var g of data) {
		if(g.name == '차단된 사용자' && !editable) continue;
		const delbtn = `<form method=post onsubmit="return confirm('삭제하시겠습니까?');" action="/aclgroup/delete?group=${encodeURIComponent(g.name)}" style="display: inline-block; margin: 0; padding: 0;"><input type=hidden name=group value="${html.escape(g.name)}" /><button type=submit style="background: none; border: none; padding: 0; margin: 0;">×</button></form>`;
		tabs += `
			<li class="nav-item" style="display: inline-block;">
				<a class="nav-link${g.name == group ? ' active' : ''}" href="?group=${encodeURIComponent(g.name)}">${html.escape(g.name)} ${editabled ? delbtn : ''}</a>
			</li>
		`;
	}
	
	var content = `
		<div id="aclgroup-create-modal" class="modal fade" role="dialog" style="display: none;" aria-hidden="true">
			<div class="modal-dialog">
				<form id="edit-request-close-form" method=post action="/aclgroup/create">
					<div class="modal-content">
						<div class="modal-header">
							<button type="button" class="close" data-dismiss="modal">×</button> 
							<h4 class="modal-title">ACL그룹 생성</h4>
						</div>
						<div class="modal-body">
							<div>
								<p>그룹 이름: </p>
								<input name="group" type="text" /> 
							</div>
							
							${hostconfig.namuwiki_exclusive ? `
							<div>
								<p>경고 그룹용 문구: </p>
								<input name="warning_description" type="text" /> 
							</div>
							` : ''}
						</div>
						<div class="modal-footer"> <button type="submit" class="btn btn-primary" style="width:auto">확인</button> <button type="button" class="btn btn-default" data-dismiss="modal" style="background:#efefef">취소</button> </div>
					</div>
				</form>
			</div>
		</div>
	
		<ul class="nav nav-tabs" style="height: 38px; display: initial;">
			${tabs}
			${editabled ? `
				<span data-toggle="modal" data-target="#aclgroup-create-modal">
					<li class="nav-item" style="display: inline-block;">
						<a class="nav-link" onclick="return false;" href="/aclgroup/create">+</a>
					</li>
				</span>
			` : ''}
		</ul>

		<form method=post class="settings-section" style="width: 100%;">
			<script>
				$(function() {
					$('#modeSelect').on('change', function() {
						if(this.value == 'ip') $('#usernameInput').attr('placeholder', 'CIDR');
						else $('#usernameInput').attr('placeholder', '사용자 이름');
					});
				});
			</script>
		
    		<div class="form-group">
    			<div>
					<select id=modeSelect style="width: 130px; display: inline-block;" class=form-control name=mode>
						<option value=ip>아이피</option>
						<option value=username${req.method == 'POST' && req.body['mode'] == 'username' ? ' selected' : ''}>사용자 이름</option>
					</select>
    				<input placeholder="CIDR" id=usernameInput value="${req.method == 'POST' ? (req.body['username'] || '') : ''}" style="width: auto; display: inline-block;" type="text" class=form-control name="username" />
    			</div>
    		</div>

    		<div class="form-group">
    			<label class=control-label>메모 :</label>
    			<div>
    				<input value="${req.method == 'POST' ? (req.body['note'] || '') : ''}" type="text" class=form-control id="noteInput" name="note" />
    			</div>
    		</div>

    		<div class="form-group">
    			<label class=control-label>기간 :</label>
    			<select class=form-control name="expire">
    				${expireopt(req)}
    			</select>
    		</div>

    		<div class="btns" style="margin-bottom: 20px;">
    			<button type="submit" class="btn btn-primary" style="width: 90px;" ${!editable ? 'disabled' : ''}>추가</button>
    		</div>
    	</form>
	`;
	
	const navbtns = navbtn(0, 0, 0, 0);
	
	if(group) {
		content += `	
			<div class="line-break" style="margin: 20px 0;"></div>
			
			${navbtns}
			
			<form class="form-inline pull-right" id="searchForm" method=get>
				<div class="input-group">
					<input type="text" class=form-control id="searchQuery" name="from" placeholder="ID" />
					<span class="input-group-btn">
						<button type=submit class="btn btn-primary">Go</button>
					</span>
				</div>
			</form>
			
			<div class="table-wrap">
				<table class="table" style="margin-top: 7px;">
					<colgroup>
						<col style="width: 150px;">
						<col style="width: 150px;">
						<col>
						<col style="width: 200px">
						<col style="width: 160px">
						<col style="width: 60px;">
					</colgroup>
					<thead>
						<tr style="vertical-align: bottom; border-bottom: 2px solid #eceeef;">
							<th>ID</th>
							<th>대상</th>
							<th>메모</th>
							<th>생성일</th>
							<th>만료일</th>
							<th style="text-align: center;">작업</th>
						</tr>
					</thead>
					<tbody>
		`;
		
		var tr = '';
		
		
		await curs.execute("delete from aclgroup where not expiration = '0' and ? > cast(expiration as integer)", [Number(getTime())]);
		var data = await curs.execute("select id, type, username, expiration, note, date from aclgroup where aclgroup = ? order by cast(id as integer) desc limit 50", [group]);
		for(var row of data) {
			tr += `
				<tr>
					<td>${row.id}</td>
					<td>${row.username}</td>
					<td>${row.note}</td>
					<td>${generateTime(toDate(row.date), timeFormat)}
					<td>${!Number(row.expiration) ? '영구' : generateTime(toDate(row.expiration), timeFormat)}
					<td>
						<div id="aclgroup-${row.id}-remove-modal" class="modal fade" role="dialog" style="display: none;" aria-hidden="true">
							<div class="modal-dialog">
								<form method=post action="/aclgroup/remove">
									<div class="modal-content">
										<div class="modal-header">
											<button type="button" class="close" data-dismiss="modal">×</button> 
											<h4 class="modal-title">ACL 요소 제거</h4>
										</div>
										<div class="modal-body">
											<div>
												<p>ID: </p>
												<span>${row.id}</span>
											</div>
											
											<div>
												<p>메모: </p>
												<input name=note type="text" /> 
											</div>
											
											<input type=hidden name=id value="${row.id}" />
										</div>
										<div class="modal-footer"> <button type="submit" class="btn btn-primary" style="width:auto">삭제</button> <button type="button" class="btn btn-default" data-dismiss="modal" style="background:#efefef">취소</button> </div>
									</div>
								</form>
							</div>
						</div>
						
						<form method=post onsubmit="return false;" action="/aclgroup/remove" data-toggle="modal" data-target="#aclgroup-${row.id}-remove-modal">
							<input type=hidden name=id value="${row.id}" />
							<input type=hidden name=note value="" />
							<input type=submit class="btn btn-sm btn-danger" value="삭제" ${!editable ? 'disabled' : ''} />
						</form>
					</td>
				</tr>
			`;
		}
		
		content += tr;
		
		if(!tr) content += `
						<tr>
							<td colspan=6>ACL 그룹이 비어있습니다.</td>
						</tr>
		`;
		
		content += `
					</tbody>
				</table>
			</div>
		`;
	}
	
	var error = null;
	
	if(req.method == 'POST') do {
		if(group != '차단된 사용자' && !hasperm(req, 'aclgroup'))
			return res.status(403).send(await showError(req, 'permission'));
		if(group == '차단된 사용자' && !hasperm(req, 'admin'))
			return res.status(403).send(await showError(req, 'permission'));

		var { mode, username, expire, note } = req.body;
		if(!['ip', 'username'].includes(mode) || !username || !expire || note == undefined) 
			{ content = (error = err('alert', { code: 'invalid_value' })) + content; break; }
		
		if(mode == 'ip' && !username.includes('/')) username += '/32';
		
		if(mode == 'ip' && !username.match(/^([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])\/([0-9]|[12][0-9]|3[0-2])$/))
			{ content = (error = err('alert', { code: 'invalid_cidr' })) + content; break; }
		
		var data = await curs.execute("select username from users where lower(username) = ?", [username.toLowerCase()]);
		if(!data.length && mode != 'ip') { content = (error = err('alert', { code: 'invalid_username' })) + content; break; }
	
		const date = getTime();
		const expiration = expire == '0' ? '0' : String(Number(date) + Number(expire) * 1000);
		var data = await curs.execute("select username from aclgroup where aclgroup = ? and type = ? and username = ? limit 1", [group, mode, username]);
		if(data.length) { content = (error = err('alert', { code: 'aclgroup_already_exists' })) + content; break; }
		var data = await curs.execute("select id from aclgroup order by cast(id as integer) desc limit 1");
		var id = 1;
		if(data.length) id = Number(data[0].id) + 1;
		await curs.execute("insert into aclgroup (id, type, username, expiration, note, date, aclgroup) values (?, ?, ?, ?, ?, ?, ?)", [String(id), mode, username, expiration, note, date, group]);
		
		var logid = 1, data = await curs.execute('select logid from block_history order by cast(logid as integer) desc limit 1');
		if(data.length) logid = Number(data[0].logid) + 1;
		insert('block_history', {
			date: getTime(),
			type: 'aclgroup_add',
			aclgroup: group,
			id: String(id),
			duration: expire,
			note,
			ismember: islogin(req) ? 'author' : 'ip',
			executer: ip_check(req),
			target: username,
			logid,
		});
		
		return res.redirect('/aclgroup?group=' + encodeURIComponent(group));
	} while(0);
	
	res.send(await render(req, 'ACLGroup', content, {
	}, '', error, 'aclgroup'));
});

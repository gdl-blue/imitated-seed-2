router.all(/^\/acl\/(.*)$/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	if(['특수기능', '투표', '토론'].includes(doc.namespace) || !doc.title) return res.status(400).send(await showError(req, '문서 이름이 올바르지 않습니다.', 1));
	if(ver('4.2.0')) {
		await curs.execute("delete from acl where not expiration = '0' and cast(expiration as integer) < ?", [getTime()]);
		const aclmsg = await getacl(req, doc.title, doc.namespace, 'acl');
		const editable = !!aclmsg;
		const nseditable = hasperm(req, 'nsacl');
		const types = ['read', 'edit', 'move', 'delete', 'create_thread', 'write_thread_comment', 'edit_request', 'acl'];
		
		async function tbody(type, isns, edit) {
			var ret = '';
			if(isns) var data = await curs.execute("select id, action, expiration, condition, conditiontype from acl where namespace = ? and type = ? and ns = '1' order by cast(id as integer) asc", [doc.namespace, type]);
			else var data = await curs.execute("select id, action, expiration, condition, conditiontype from acl where title = ? and namespace = ? and type = ? and ns = '0' order by cast(id as integer) asc", [doc.title, doc.namespace, type]);
			var i = 1;
			for(var row of data) {
				ret += `
					<tr data-id="${row.id}">
						<td>${i++}</td>
						<td>${row.conditiontype}:${row.condition}</td>
						<td>${({
							allow: '허용',
							deny: '거부',
							gotons: '이름공간ACL 실행',
						})[row.action]}</td>
						<td>${row.expiration == '0' ? '영구' : generateTime(toDate(row.expiration), timeFormat)}</td>
						<td>${edit ? `<button type="submit" class="btn btn-danger btn-sm">삭제</button></td>` : ''}</td>
					</tr>
				`;
			} if(!data.length && ver('4.2.2')) {
				ret += `
					<td colspan="5" style="text-align: center;">(규칙이 존재하지 않습니다. ${isns ? '모두 거부됩니다.' : '이름공간 ACL이 적용됩니다.'})</td>
				`;
			}
			return ret;
		}
		
		if(req.method == 'POST') {
			var rawContent = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
			if(!rawContent[0]) rawContent = '';
			else rawContent = rawContent[0].content;
			
			var baserev;
			var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
			try {
				baserev = data[0].rev;
			} catch(e) {
				baserev = 0;
			}
			
			const { id, after_id, mode, type, isNS, condition, action, expire } = req.body;
			if(!types.includes(type)) return res.status(400).send('');
			
			if(isNS && !nseditable) return res.status(403).json({ status: fetchErrorString('permission') });
			if(!nseditable && !isNS && !editable) return res.status(403).json({ status: aclmsg });
			
			const edit = nseditable || (isNS ? nseditable : editable);
			
			switch(mode) {
				case 'insert': {
					if(!['allow', 'deny'].concat(isNS || !ver('4.18.0') ? [] : ['gotons']).includes(action)) return res.status(400).send('');
					if(Number(expire) === NaN) return res.status(400).send('');
					if(!condition) return res.status(400).send('');
					const cond = condition.split(':');
					if(cond.length != 2) return res.status(400).send('');
					if(!['perm', 'ip', 'member'].concat(ver('4.5.9') ? ['geoip'] : []).concat(ver('4.18.0') ? ['aclgroup'] : []).includes(cond[0])) return res.status(400).send('');
					if(isNS) var data = await curs.execute("select id from acl where conditiontype = ? and condition = ? and type = ? and namespace = ? and ns = '1' order by cast(id as integer) desc limit 1", [cond[0], cond[1], type, doc.namespace]);
					else var data = await curs.execute("select id from acl where conditiontype = ? and condition = ? and type = ? and title = ? and namespace = ? and ns = '0' order by cast(id as integer) desc limit 1", [cond[0], cond[1], type, doc.title, doc.namespace]);
					if(data.length) return res.status(400).json({
						status: fetchErrorString('acl_already_exists'),
					});
					if(cond[0] == 'aclgroup') {
						var data = await curs.execute("select name from aclgroup_groups where name = ?", [cond[1]]);
						if(!data.length) return res.status(400).json({
							status: fetchErrorString('invalid_aclgroup'),
						});
					}
					if(cond[0] == 'ip') {
						if(!cond[1].match(/^([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])[.]([01]?[0-9][0-9]?|2[0-4][0-9]|25[0-5])$/)) return res.status(400).json({
							status: fetchErrorString('invalid_acl_condition'),
						});
					}
					if(cond[0] == 'geoip') {
						if(!cond[1].match(/^[A-Z][A-Z]$/)) return res.status(400).json({
							status: fetchErrorString('invalid_acl_condition'),
						});
					}
					if(cond[0] == 'member') {
						var data = await curs.execute("select username from users where username = ?", [cond[1]]);
						if(!data.length) return res.status(400).json({
							status: fetchErrorString('invalid_username'),
						});
					}
					if(cond[0] == 'perm') {
						if(!cond[1]) return res.status(400).json({
							status: fetchErrorString('invalid_acl_condition'),
						});
					}
					
					const expiration = String(expire ? (getTime() + Number(expire) * 1000) : 0);
					if(isNS) var data = await curs.execute("select id from acl where type = ? and namespace = ? and ns = '1' order by cast(id as integer) desc limit 1", [type, doc.namespace]);
					else var data = await curs.execute("select id from acl where type = ? and title = ? and namespace = ? and ns = '0' order by cast(id as integer) desc limit 1", [type, doc.title, doc.namespace]);
					
					if(isNS) var ff = await curs.execute("select id from acl where id = '1' and type = ? and namespace = ? and ns = '1' order by cast(id as integer) desc limit 1", [type, doc.namespace]);
					else var ff = await curs.execute("select id from acl where id = '1' and type = ? and title = ? and namespace = ? and ns = '0' order by cast(id as integer) desc limit 1", [type, doc.title, doc.namespace]);
					
					var aclid = '1';
					if(data.length && ff.length) aclid = String(Number(data[0].id) + 1);
					
					await curs.execute("insert into acl (title, namespace, id, type, action, expiration, conditiontype, condition, ns) values (?, ?, ?, ?, ?, ?, ?, ?, ?)", [isNS ? '' : doc.title, doc.namespace, aclid, type, action, expire == '0' ? '0' : expiration, cond[0], cond[1], isNS ? '1' : '0']);
					
					if(!isNS) curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, flags) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
						doc.title, doc.namespace, rawContent, String(Number(baserev) + 1), ip_check(req), getTime(), '0', '', '0', '-1', islogin(req) ? 'author' : 'ip', 'acl', mode + ',' + type + ',' + action + ',' + condition
					]);
					
					return res.send(await tbody(type, isNS, edit));
				} case 'delete': {
					if(!id) return res.status(400).send('');
					var data = await curs.execute("select action, conditiontype, condition from acl where id = ? and type = ? and title = ? and namespace = ? and ns = ?", [id, type, isNS ? '' : doc.title, doc.namespace, isNS ? '1' : '0']);
					if(!data.length) return res.status(400).send('');
					await curs.execute("delete from acl where id = ? and type = ? and title = ? and namespace = ? and ns = ?", [id, type, isNS ? '' : doc.title, doc.namespace, isNS ? '1' : '0']);
					
					if(!isNS) curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, flags) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
						doc.title, doc.namespace, rawContent, String(Number(baserev) + 1), ip_check(req), getTime(), '0', '', '0', '-1', islogin(req) ? 'author' : 'ip', 'acl', mode + ',' + type + ',' + data[0].action + ',' + data[0].conditiontype + ':' + data[0].condition
					]);
					
					return res.send(await tbody(type, isNS, edit));
				} case 'move': {
					if(!id || !after_id) return res.status(400).send('');
					
					if(id > after_id) {  // 위로 올림
						for(var i=id; i>=after_id+2; i--) {
							const rndv = rndval('0123456789abcdefghijklmnopqrstuvwxyz') + ip_check(req) + getTime();
							await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [rndv, String(i - 1), isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
							await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [String(i - 1), String(i), isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
							await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [String(i), rndv, isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
						}
					} else {  // 아래로 내림
						for(var i=id; i<after_id; i++) {
							const rndv = rndval('0123456789abcdefghijklmnopqrstuvwxyz') + ip_check(req) + getTime();
							await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [rndv, String(i + 1), isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
							await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [String(i + 1), String(i), isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
							await curs.execute("update acl set id = ? where id = ? and title = ? and namespace = ? and type = ? and ns = ?", [String(i), rndv, isNS ? '' : doc.title, doc.namespace, type, isNS ? '1' : '0']);
						}
					}
					
					return res.send(await tbody(type, isNS, edit));
				}
			}
			
			return res.status(400).send('');
		} else {
			const scrollable = ver('4.13.0');
			var content = ``;
			for(var isns of [false, true]) {
				content += `
					<h2 class="wiki-heading">${isns ? '이름공간' : '문서'} ACL</h2>
					<div>
				`;
				for(var type of types) {
					if(!isns && ver('4.16.0') && type == 'read') continue;
					const edit = nseditable || (isns ? nseditable : editable);
					content += `
						<h4 class="wiki-heading">${acltype[type]}</h4>
						<div class="seed-acl-div" data-type="${type}" data-editable="${edit}" data-isns="${isns}">
							<div class=table-wrap${scrollable ? ' style="overflow-x: auto;"' : ''}>
								<table class="table" style="width:100%">
									<colgroup>
										<col style="width: 60px">
										<col>
										<col style="width: 80px">
										<col style="width: 200px">
										<col style="width: 60px;">
									</colgroup>
									
									<thead>
										<tr>
											<th>No</th>
											<th>Condition</th>
											<th>Action</th>
											<th>Expiration</th>
											<th></th>
										</tr>
									</thead>

									<tbody class="seed-acl-tbody">
					`;
					content += await tbody(type, isns, edit);
					content += `
							</tbody>
						</table>
					`;
					if(edit) {
						var aclpermopt = '';
						for(var prm in aclperms) {
							if(!aclperms[prm]) continue;
							aclpermopt += `<option value=${prm}>${aclperms[prm]}${ver('4.18.0') ? '' : (exaclperms.includes(prm) ? ' [*]' : '')}</option>`;
						}
						
						content += `
							<div class="form-inline">
								<div class="form-group">
									<label class=control-label>Condition :</label> 
									<div>
										<select class="seed-acl-add-condition-type form-control" id="permTypeWTC">
											<option value="perm">권한</option>
											<option value="member">사용자</option>
											<option value="ip">아이피</option>
											${ver('4.5.9') ? `<option value="geoip">GeoIP</option>` : ''}
											${ver('4.18.0') ? `<option value="aclgroup">ACL그룹</option>` : ''}
										</select>
										<select class="seed-acl-add-condition-value-perm form-control" id="permTextWTC">
											${aclpermopt}
										</select>
										<input class="seed-acl-add-condition-value form-control" style="display: none;" type="text"> 
									</div>
								</div>
								<div class="form-group">
									<label class=control-label>Action :</label> 
									<div>
										<select class="seed-acl-add-action form-control">
											<option value="allow">허용</option>
											<option value="deny">거부</option>
											${isns || !ver('4.18.0') ? '' : `<option value="gotons" selected>이름공간ACL 실행</option>`}
										</select>
									</div>
								</div>
								<div class="form-group">
									<label class=control-label>Duration :</label> 
									<div>
										<select class="form-control seed-acl-add-expire">
											${expireopt(req)}
										</select>
									</div>
								</div>
								<button type="submit" class="btn btn-primary seed-acl-add-btn">추가</button> 
							</div>
							${ver('4.18.0') ? '' : `<small>[*] 차단된 사용자는 포함되지 않습니다.</small>`}
						`;
					} content += `
							</div>
						</div>
					`;
				}
				content += `
					</div>
				`;
			}
			
			return res.send(await render(req, doc + ' (ACL)', content, {
				document: doc,
			}, '', false, 'acl'));
		}
	} else {
		if(!hasperm(req, 'acl')) return res.send(await showError(req, 'permission'));
		var dbdata = (await curs.execute("select read, edit, del, discuss, move from classic_acl where title = ? and namespace = ?", [doc.title, doc.namespace]))[0];
		if(!dbdata) dbdata = {
			read: 'everyone', 
			edit: 'everyone', 
			del: 'everyone', 
			discuss: 'everyone', 
			move: 'everyone' };
		var error = null;
		
		// 내가 나무위키 자체는 ACL 개편 전에도 했지만, ACL 인터페이스는 개편 후 처음 접했음. 원본 HTML 코드는 모르고 캡춰 화면 보고 내 나름대로 씀.
		var content = `
			<form method=post>
				<div class=form-group>
					<label>읽기 : </label>
					<select name=read class=form-control>
						<option value=everyone${dbdata.read == 'everyone' ? ' selected' : ''}>모두</option>
						<option value=member${dbdata.read == 'member' ? ' selected' : ''}>로그인한 사용자</option>
						<option value=admin${dbdata.read == 'admin' ? ' selected' : ''}>관리자</option>
					</select>
				</div>
				
				<div class=form-group>
					<label>편집 : </label>
					<select name=edit class=form-control>
						<option value=everyone${dbdata.edit == 'everyone' ? ' selected' : ''}>모두</option>
						<option value=member${dbdata.edit == 'member' ? ' selected' : ''}>로그인한 사용자</option>
						<option value=admin${dbdata.edit == 'admin' ? ' selected' : ''}>관리자</option>
					</select>
				</div>
				
				<div class=form-group>
					<label>삭제 : </label>
					<select name=delete class=form-control>
						<option value=everyone${dbdata.del == 'everyone' ? ' selected' : ''}>모두</option>
						<option value=member${dbdata.del == 'member' ? ' selected' : ''}>로그인한 사용자</option>
						<option value=admin${dbdata.del == 'admin' ? ' selected' : ''}>관리자</option>
					</select>
				</div>
				
				<div class=form-group>
					<label>토론 : </label>
					<select name=discuss class=form-control>
						<option value=everyone${dbdata.discuss == 'everyone' ? ' selected' : ''}>모두</option>
						<option value=member${dbdata.discuss == 'member' ? ' selected' : ''}>로그인한 사용자</option>
						<option value=admin${dbdata.discuss == 'admin' ? ' selected' : ''}>관리자</option>
					</select>
				</div>
				
				<div class=form-group>
					<label>이동 : </label>
					<select name=move class=form-control>
						<option value=everyone${dbdata.move == 'everyone' ? ' selected' : ''}>모두</option>
						<option value=member${dbdata.move == 'member' ? ' selected' : ''}>로그인한 사용자</option>
						<option value=admin${dbdata.move == 'admin' ? ' selected' : ''}>관리자</option>
					</select>
				</div>
				
				<div class=form-group>
					<label>요약 : </label>
					<input name=log type=text id=logInput style="width: 100%;" />
				</div>
				
				<div>
					<button type=submit>삽입</button>
				</div>
			</form>
		`;
		
		if(req.method == 'POST') {
			if(!['everyone', 'member', 'admin'].includes(req.body['read']))
				return res.send(await render(req, doc + ' (ACL)', (error = err('alert', { code: 'invalid_acl' })) + content, {}, '', error, 'acl'));
			if(!['everyone', 'member', 'admin'].includes(req.body['edit']))
				return res.send(await render(req, doc + ' (ACL)', (error = err('alert', { code: 'invalid_acl' })) + content, {}, '', error, 'acl'));
			if(!['everyone', 'member', 'admin'].includes(req.body['delete']))
				return res.send(await render(req, doc + ' (ACL)', (error = err('alert', { code: 'invalid_acl' })) + content, {}, '', error, 'acl'));
			if(!['everyone', 'member', 'admin'].includes(req.body['discuss']))
				return res.send(await render(req, doc + ' (ACL)', (error = err('alert', { code: 'invalid_acl' })) + content, {}, '', error, 'acl'));
			if(!['everyone', 'member', 'admin'].includes(req.body['move']))
				return res.send(await render(req, doc + ' (ACL)', (error = err('alert', { code: 'invalid_acl' })) + content, {}, '', error, 'acl'));
			await curs.execute("delete from classic_acl where title = ? and namespace = ?", [doc.title, doc.namespace]);
			await curs.execute("insert into classic_acl (title, namespace, read, edit, del, discuss, move, blockkorea, blockbot) values (?, ?, ?, ?, ?, ?, ?, '0', '0')", [doc.title, doc.namespace, req.body['read'], req.body['edit'], req.body['delete'], req.body['discuss'], req.body['move']]);
			
			var rawContent = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
			if(!rawContent[0]) rawContent = '';
			else rawContent = rawContent[0].content;
			
			var baserev;
			var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
			try {
				baserev = data[0].rev;
			} catch(e) {
				baserev = 0;
			}
			curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, flags) \
				values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
				doc.title, doc.namespace, rawContent, String(Number(baserev) + 1), ip_check(req), getTime(), '0', req.body['log'] || '', '0', '-1', islogin(req) ? 'author' : 'ip', 'acl', `${req.body['read']},${req.body['edit']},${req.body['delete']},${req.body['discuss']},${req.body['move']}`
			]);
			
			return res.redirect('/acl/' + encodeURIComponent(doc + ''));
		}
		
		return res.send(await render(req, doc + ' (ACL)', content, {
			document: doc,
		}, '', error, 'acl'));
	}
});

router.all(/^\/move\/(.*)/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 2, 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_edit', msg: aclmsg }));
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'move', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_move', msg: aclmsg }));
	
	const o_o = await curs.execute("select title from history where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!o_o.length) return res.send(await showError(req, 'document_not_found'));
	
	// 원래 이랬나...?
	var content = `
		<form method=post id=moveForm>
			<div>
				<label>변경할 문서 제목 : </label><br />
				<input name=title type=text style="width: 250px;" id=titleInput />
			</div>
			
			<div>
				<label>요약 : </label><br />
				<input style="width: 600px;" name=log type=text id=logInput />
			</div>
			
			${ver('4.2.4') ? `
			<div>
				<label>문서를 서로 맞바꾸기 : </label><br />
				<input type=checkbox name=mode value=swap />
			</div>
			` : ''
			}
			
			<div>
				<button type=submit>이동</button>
			</div>
		</form>
	`;
	
	var error = null;
	
	if(req.method == 'POST') do {
		if(doc.namespace == '사용자')
			if((ver('4.11.0') && !doc.title.includes('/')) || !ver('4.11.0')) {
				content = (error = err('alert', 'disable_user_document')) + content;
				break;
			}
		
		var doccontent = '';
		const o_o = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		if(o_o.length) {
			doccontent = o_o[0].content;
		}
		
		const _recentRev = await curs.execute("select content, rev from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
		const recentRev = _recentRev[0];
		
		if(!req.body['title']) {
			content = (error = err('alert', { code: 'validator_required', tag: 'title' })) + content;
			break;
		}
		
		const newdoc = processTitle(req.body['title']);
		
		var aclmsg = await getacl(req, newdoc.title, newdoc.namespace, 'read', 1);
		if(aclmsg) {
			return res.send(await showError(req, { code: 'permission_read', msg: aclmsg }));
		}
		
		var aclmsg = await getacl(req, newdoc.title, newdoc.namespace, 'edit', 2);
		if(aclmsg) {
			return res.send(await showError(req, { code: 'permission_edit', msg: aclmsg }));
		}
		
		if(req.body['mode'] == 'swap') {
			return res.send(await showError(req, 'feature_not_implemented'));
		} else {
			const d_d = await curs.execute("select rev from history where title = ? and namespace = ?", [newdoc.title, newdoc.namespace]);
			if(d_d.length) {
				return res.send(await showError(req, '문서가 이미 존재합니다.', 1));
			}
			
			await curs.execute("update documents set title = ?, namespace = ? where title = ? and namespace = ?", [newdoc.title, newdoc.namespace, doc.title, doc.namespace]);
			await curs.execute("update acl set title = ?, namespace = ? where title = ? and namespace = ?", [newdoc.title, newdoc.namespace, doc.title, doc.namespace]);
			curs.execute("update threads set title = ?, namespace = ? where title = ? and namespace = ?", [newdoc.title, newdoc.namespace, doc.title, doc.namespace]);
			curs.execute("update edit_requests set title = ?, namespace = ? where title = ? and namespace = ?", [newdoc.title, newdoc.namespace, doc.title, doc.namespace]);
			curs.execute("update history set title = ?, namespace = ? where title = ? and namespace = ?", [newdoc.title, newdoc.namespace, doc.title, doc.namespace]);
			
			await curs.execute("delete from files where title = ? and namespace = ?", [newdoc.title, newdoc.namespace]);
			await curs.execute("update files set title = ?, namespace = ? where title = ? and namespace = ?", [newdoc.title, newdoc.namespace, doc.title, doc.namespace]);
		}
		
		curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, flags) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
			newdoc.title, newdoc.namespace, doccontent, String(Number(recentRev.rev) + 1), ip_check(req), getTime(), '0', req.body['log'] || '', '0', '-1', islogin(req) ? 'author' : 'ip', 'move', doc.title + '\n' + newdoc.title
		]);
		curs.execute("update documents set time = ? where title = ? and namespace = ?", [doc.title, doc.namespace]);
		return res.redirect('/w/' + encodeURIComponent(newdoc + ''));
	} while(0);
	
	res.send(await render(req, doc + ' (이동)', content, {
		document: doc,
	}, '', error, 'move'));
});
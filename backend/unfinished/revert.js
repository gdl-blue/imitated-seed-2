router.all(/^\/revert\/(.*)/, async (req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	const title = req.params[0];
	const doc = processTitle(title);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) {
		return res.status(403).send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	}
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 2);
	if(aclmsg) {
		return res.status(403).send(await showError(req, { code: 'permission_edit', msg: aclmsg }));
	}
	
	const rev = req.query['rev'];
	if(!rev || isNaN(Number(rev))) {
		return res.send(await showError(req, 'revision_not_found'));
	}
	
	const _recentRev = await curs.execute("select content, rev from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
	if(!_recentRev.length) {
		return res.send(await showError(req, 'document_not_found'));
	}
	
	const dbdata = await curs.execute("select content, advance, flags from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, rev]);
	if(!dbdata.length) {
		return res.send(await showError(req, 'revision_not_found'));
	}
	const revdata   = dbdata[0];
	const recentRev = _recentRev[0];
	
	// 더 시드에서 실제로는 되돌려짐.
	if(req.method == 'GET' && ['move', 'delete', 'acl', 'revert'].includes(revdata.advance)) {
		return res.send(await showError(req, 'not_revertable'));
	}
	
	var content = `
		<form method=post>
			<textarea class=form-control rows=25 readonly>${revdata.content.replace(/<\/(textarea)>/gi, '&lt;/$1&gt;')}</textarea>
		
			<label>요약</label><br />
			<input type=text class=form-control name=log />
			
			<div class="btns pull-right">
				<button type=submit class="btn btn-primary">되돌리기</button>
			</div>
		</form>
	`;
	
	if(req.method == 'POST') {
		if(recentRev.content == revdata.content) {
			return res.send(await showError(req, 'text_unchanged'));
		}
		await curs.execute("delete from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		await curs.execute("insert into documents (content, title, namespace) values (?, ?, ?)", [revdata.content, doc.title, doc.namespace]);
		const rawChanges = revdata.content.length - recentRev.content.length;
		curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance, flags) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
			doc.title, doc.namespace, revdata.content, String(Number(recentRev.rev) + 1), ip_check(req), getTime(), (rawChanges > 0 ? '+' : '') + rawChanges, req.body['log'] || '', '0', '-1', islogin(req) ? 'author' : 'ip', 'revert', rev
		]);
		curs.execute("update documents set time = ? where title = ? and namespace = ?", [doc.title, doc.namespace]);
		return res.redirect('/w/' + encodeURIComponent(doc + ''));
	}
	
	res.send(await render(req, doc + ' (r' + rev + '로 되돌리기)', content, {
		rev,
		text: revdata.content,
		document: doc,
	}, _, null, 'revert'))
});
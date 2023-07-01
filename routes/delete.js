router.all(/^\/delete\/(.*)/, async(req, res, next) => {
	if(!['POST', 'GET'].includes(req.method)) return next();
	
	const title = req.params[0];
	const doc = processTitle(title);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'edit', 2);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_edit', msg: aclmsg }));
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'delete', 1);
	if(aclmsg) return res.send(await showError(req, { code: 'permission_delete', msg: aclmsg }));
	
	const o_o = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	if(!o_o.length) return res.send(await showError(req, 'document_not_found'));
	
	var content = `
		<form id=deleteForm method=post>
            <div class=form-group>
				<label class=control-label for=logInput>요약</label>
				<input type=text id=logInput name=log class=form-control />
			</div>
			
            <label>
				<label><input type=checkbox name=agree id=agreeCheckbox value=Y /> 문서 이동 목적이 아닌, 삭제하기 위함을 확인합니다.</label>
            </label>
			
            <p>
				<b>알림!&nbsp;:</b>&nbsp;문서의 제목을 변경하려는 경우 <a href="/move/${encodeURIComponent(doc + '')}">문서 이동</a> 기능을 사용해주세요. 문서 이동 기능을 사용할 수 없는 경우 토론 기능이나 게시판을 통해 대행 요청을 해주세요.
            </p>

            <div class=btns>
				<button type=reset class="btn btn-secondary">초기화</button>
				<button type=submit class="btn btn-primary" id=submitBtn>삭제</button>
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
		
		if(!req.body['agree']) {
			content = (error = err('alert', 'validator_required', 'agree')) + content;
			break;
		}
		
		const _recentRev = await curs.execute("select content, rev from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
		const recentRev = _recentRev[0];
		
		await curs.execute("delete from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		const rawChanges = 0 - recentRev.content.length;
		curs.execute("insert into history (title, namespace, content, rev, username, time, changes, log, iserq, erqnum, ismember, advance) \
						values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
			doc.title, doc.namespace, '', String(Number(recentRev.rev) + 1), ip_check(req), getTime(), '' + (rawChanges), req.body['log'] || '', '0', '-1', islogin(req) ? 'author' : 'ip', 'delete'
		]);
		curs.execute("update documents set time = ? where title = ? and namespace = ?", [doc.title, doc.namespace]);
		return res.redirect('/w/' + encodeURIComponent(doc + ''));
	} while(0);
	
	res.send(await render(req, doc + ' (삭제)', content, {
		document: doc,
	}, '', error, 'delete'));
});

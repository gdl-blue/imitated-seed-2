router.get(/^\/history\/(.*)/, async function viewHistory(req, res) {
	var title = req.params[0];
	const doc = processTitle(title);
	title = totitle(doc.title, doc.namespace);
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.status(403).send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	
	var total = (await db.get("select count(rev) from history where title = ? and namespace = ?", [doc.title, doc.namespace]))['count(rev)'];
	var data;
	const from = req.query['from'];
	const until = req.query['until'];
	if(from) {
		data = await curs.execute("select flags, rev, time, changes, log, iserq, erqnum, advance, ismember, username, edit_request_id, loghider from history \
						where title = ? and namespace = ? and (cast(rev as integer) <= ? AND cast(rev as integer) > ?) \
						order by cast(rev as integer) desc",
						[doc.title, doc.namespace, Number(from), Number(from) - 30]);
	} else if(until) {
		data = await curs.execute("select flags, rev, time, changes, log, iserq, erqnum, advance, ismember, username, edit_request_id, loghider from history \
						where title = ? and namespace = ? and (cast(rev as integer) >= ? AND cast(rev as integer) < ?) \
						order by cast(rev as integer) desc",
						[doc.title, doc.namespace, Number(until), Number(until) + 30]);
	} else {
		data = await curs.execute("select flags, rev, time, changes, log, iserq, erqnum, advance, ismember, username, edit_request_id, loghider from history \
						where title = ? and namespace = ? order by cast(rev as integer) desc limit 30",
						[doc.title, doc.namespace]);
	}
	if(!data.length) return res.send(await showError(req, 'document_not_found'));
	
	res.send(await render(req, totitle(doc.title, doc.namespace) + '의 역사', 'history', {
		document: doc,
		navigation: navigation(total, data[data.length-1].rev, data[0].rev, '/history/' + encodeURIComponent(title)),
		history: data,
	}));
});

router.get(/^\/admin\/history\/(.*)\/(\d+)\/delete$/, async (req, res) => {
	if (!islogin(req)) return res.status(403).send(await showError(req, 'permission'));
	if (!((hostconfig.owners || []).includes(ip_check(req)))) {
		return res.status(403).send(await showError(req, 'permission'));
	}
	var title = req.params[0];
	const doc = processTitle(title);
	const rev = req.params[1];
	const total = (await db.get("select count(rev) from history where title = ? and namespace = ?", [doc.title, doc.namespace]))['count(rev)'];
	if(parseInt(rev) == total) {
		if(rev == '1') {
			await curs.execute("delete from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
		} else {
			var dbdata = await curs.execute("select * from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 2", [doc.title, doc.namespace]);
			await curs.execute("delete from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
			if (dbdata.length === 2) {
				await curs.execute("insert into documents (content, title, namespace) values (?, ?, ?)", [dbdata[1].content, doc.title, doc.namespace]);
			}
		}
	}

	await curs.execute("delete from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, rev]);

	return res.redirect('/history/' + encodeURIComponent(title));
});

if(ver('4.22.4')) router.get(/^\/admin\/history\/(.*)\/(\d+)\/hide$/, async(req, res) => {
	if(!hasperm(req, 'hide_document_history_log'))
		return res.status(403).send(await showError(req, 'permission'));
	var title = req.params[0];
	const doc = processTitle(title);
	await curs.execute("update history set loghider = ? where title = ? and namespace = ? and rev = ?", [ip_check(req), doc.title, doc.namespace, req.params[1] || '0']);
	return res.redirect('/history/' + encodeURIComponent(title));
});

if(ver('4.22.4')) router.get(/^\/admin\/history\/(.*)\/(\d+)\/show$/, async(req, res) => {
	if(!hasperm(req, 'hide_document_history_log'))
		return res.status(403).send(await showError(req, 'permission'));
	var title = req.params[0];
	const doc = processTitle(title);
	await curs.execute("update history set loghider = '' where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, req.params[1] || '0']);
	return res.redirect('/history/' + encodeURIComponent(title));
});

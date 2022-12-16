router.get(/^\/blame\/(.*)/, async (req, res) => {
	const title = req.params[0];
	const doc   = processTitle(title);
	const rev   = req.query['rev'];
	
	var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
	if(aclmsg) return res.status(403).send(await showError(req, { code: 'permission_read', msg: aclmsg }));
	if(!rev) {
		var d = await curs.execute("select rev from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
		if(d.length) rev = d[0].rev;
		else return res.send(await showError(req, 'revision_not_found'));
	}
	var dbdata = await curs.execute("select content from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, rev]);
	if(!dbdata.length) return res.send(await showError(req, 'revision_not_found'));
	const revdata = dbdata[0];
	
	var content = `
		미구현
	`;
	
	res.send(await render(req, doc + ' (Blame)', content, {
		rev,
		document: doc,
	}, _, null, 'blame'));
});
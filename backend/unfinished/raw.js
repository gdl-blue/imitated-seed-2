router.get(/^\/raw\/(.*)/, async(req, res) => {
	const title = req.params[0];
	const doc = processTitle(title);
	var rev = req.query['rev'];
	
	if(title.replace(/\s/g, '') === '') {
		return res.send(await await showError(req, 'invalid_title'));
	}
	
	if(rev) {
		var data = await curs.execute("select content from history where title = ? and namespace = ? and rev = ?", [doc.title, doc.namespace, rev]);
	} else {
		var data = await curs.execute("select content from documents where title = ? and namespace = ?", [doc.title, doc.namespace]);
	}
	const rawContent = data;
	if(!rev) {
		var data = await curs.execute("select rev from history where title = ? and namespace = ? order by CAST(rev AS INTEGER) desc limit 1", [doc.title, doc.namespace]);
		if(data.length) rev = data[0].rev;
	}
	var content = '';
	
	try {
		var aclmsg = await getacl(req, doc.title, doc.namespace, 'read', 1);
		if(aclmsg) {
			return res.send(await await showError(req, { code: 'permission_read', msg: aclmsg }));
		} else {
			content = rawContent[0].content;
		}
	} catch(e) {
		return res.status(404).send(await showError(req, 'document_not_found'));
	}

	if(!ver('4.16.0')) {
		res.setHeader('Content-Type', 'text/plain');
		return res.send(content);
	}
	
	var rtcontent = `
		<textarea class=form-control style="height: 600px;" readonly=readonly>${content.replace(/<\/textarea>/gi, '&lt;/textarea&gt;')}</textarea>
	`;
	
	res.send(await render(req, totitle(doc.title, doc.namespace) + ' (r' + rev + ' RAW)', rtcontent, {
		document: doc,
		rev,
	}, '', null, 'raw'));
});
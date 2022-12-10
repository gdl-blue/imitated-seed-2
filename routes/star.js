if(ver('4.9.0')) router.get(/^\/member\/star\/(.*)$/, async (req, res) => {
	const title = req.params[0];
	if(!islogin(req)) return res.redirect('/member/login?redirect=' + encodeURIComponent('/member/star/' + title));
	const doc = processTitle(title);
	
	var dbdata = await curs.execute("select title, namespace from stars where username = ? and title = ? and namespace = ?", [ip_check(req), doc.title, doc.namespace]);
	if(dbdata.length) return res.send(await showError(req, 'already_starred_document'));
	
	var dbdata = await curs.execute("select time from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
	if(!dbdata.length) return res.send(await showError(req, 'document_not_found'));
	
	await curs.execute('insert into stars (title, namespace, username, lastedit) values (?, ?, ?, ?)', [doc.title, doc.namespace, ip_check(req), dbdata[0]['time']]);

	res.redirect('/w/' + encodeURIComponent(title));
});

if(ver('4.9.0')) router.get(/^\/member\/unstar\/(.*)$/, async (req, res) => {
	const title = req.params[0];
	if(!islogin(req)) return res.redirect('/member/login?redirect=' + encodeURIComponent('/member/star/' + title));
	const doc = processTitle(title);
	
	var dbdata = await curs.execute("select title, namespace from stars where username = ? and title = ? and namespace = ?", [ip_check(req), doc.title, doc.namespace]);
	if(!dbdata.length) return res.send(await showError(req, 'already_unstarred_document'));
	
	var dbdata = await curs.execute("select time from history where title = ? and namespace = ? order by cast(rev as integer) desc limit 1", [doc.title, doc.namespace]);
	if(!dbdata.length) return res.send(await showError(req, 'document_not_found'));
	
	
	await curs.execute('delete from stars where title = ? and namespace = ? and username = ?', [doc.title, doc.namespace, ip_check(req)]);

	res.redirect('/w/' + encodeURIComponent(title));
});


if(ver('4.9.0')) router.get(/^\/member\/starred_documents$/, async (req, res) => {
	if(!islogin(req)) return res.redirect('/member/login?redirect=' + encodeURIComponent('/member/starred_documents'));
	
	var dd = await curs.execute("select title, namespace, lastedit from stars where username = ? order by cast(lastedit as integer) desc", [ip_check(req)]);
	var content = `<ul class=wiki-list>`;
	for(var doc of dd) {
		content += `
			<li>
				<a href="/w/${encodeURIComponent(totitle(doc.title, doc.namespace) + '')}">${html.escape(totitle(doc.title, doc.namespace) + '')}</a> (수정 시각:${generateTime(toDate(doc.lastedit), timeFormat)})
			</li>
		`;
	}
	
	content += '</ul>';

	res.send(await render(req, '내 문서함', content, {}, _, _, 'starred_documents'));
});
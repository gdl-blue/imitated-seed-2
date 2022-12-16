router.get(/^\/random$/, async(req, res) => {
	var data = await curs.execute("select title from documents where namespace = '문서' order by random() limit 1");
	if(!data.length) res.redirect('/');
	res.redirect('/w/' + encodeURIComponent(data[0].title));
});
router.get(/^\/RecentChanges$/, async function recentChanges(req, res) {
	var flag = req.query['logtype'];
	if(!['all', 'create', 'delete', 'move', 'revert'].includes(flag)) flag = 'all';
	
	var data = await curs.execute("select isapi, flags, title, namespace, rev, time, changes, log, iserq, erqnum, advance, ismember, username, loghider from history \
					where " + (flag == 'all' ? "not namespace = '사용자' and " : '') + "advance like ? order by cast(time as integer) desc limit 100", 
					[flag == 'all' ? '%' : flag]);
	
	res.send(await render(req, '최근 변경내역', 'recent_changes', {
		recent_changes: data,
	}));
});

router.get(/^\/RecentChanges$/, async function recentChanges(req, res) {
	var flag = req.query['logtype'];
	if(!['all', 'create', 'delete', 'move', 'revert'].includes(flag)) flag = 'all';
	if(flag == 'all') flag = '%';
	
	var data = await curs.execute("select isapi, flags, title, namespace, rev, time, changes, log, iserq, erqnum, advance, ismember, username, loghider from history \
					where " + (flag == '%' ? "not namespace = '사용자' and " : '') + "advance like ? order by cast(time as integer) desc limit 100", 
					[flag]);
	
	
	var content = `
		<ol class="breadcrumb link-nav">
			<li><a href="?logtype=all">[전체]</a></li>
			<li><a href="?logtype=create">[새 문서]</a></li>
			<li><a href="?logtype=delete">[삭제]</a></li>
			<li><a href="?logtype=move">[이동]</a></li>
			<li><a href="?logtype=revert">[되돌림]</a></li>
		</ol>
		
		<table class="table table-hover">
			<colgroup>
				<col>
				<col style="width: 25%;">
				<col style="width: 22%;">
			</colgroup>
			
			<thead id>
				<tr>
					<th>항목</th>
					<th>수정자</th>
					<th>수정 시간</th>
				</tr>
			</thead>
			
			<tbody id>
	`;
	
	for(var row of data) {
		var title = totitle(row.title, row.namespace) + '';
		
		content += `
				<tr${(row.log.length > 0 || row.advance != 'normal' ? ' class=no-line' : '')}>
					<td>
						<a href="/w/${encodeURIComponent(title)}">${html.escape(title)}</a> 
						<a href="/history/${encodeURIComponent(title)}">[역사]</a> 
						${
								Number(row.rev) > 1
								? '<a \href="/diff/' + encodeURIComponent(title) + '?rev=' + row.rev + '&oldrev=' + String(Number(row.rev) - 1) + '">[비교]</a>'
								: ''
						} 
						<a href="/discuss/${encodeURIComponent(title)}">[토론]</a> 
						
						<span class=f_r>(<span style="color: ${
							(
								Number(row.changes) > 0
								? 'green'
								: (
									Number(row.changes) < 0
									? 'red'
									: 'gray'
								)
							)
							
						};">${row.changes}</span>)</span>
					</td>
					
					<td>
						${ip_pas(row.username, row.ismember)}${ver('4.20.0') && row.isapi ?' <i>(API)</i>' : ''}
					</td>
					
					<td>
						${generateTime(toDate(row.time), timeFormat)}
					</td>
				</tr>
		`;
		
		if((row.log.length > 0 && !row.loghider) || row.advance != 'normal') {
			content += `
				<td colspan="3" style="padding-left: 1.5rem;">
					${row.loghider ? '' : row.log} ${row.advance != 'normal' ? `<i>(${edittype(row.advance, ...(row.flags.split('\n')))})</i>` : ''}
				</td>
			`;
		}
	}
	
	content += `
			</tbody>
		</table>
	`;
	
	res.send(await render(req, '최근 변경내역', content, {}));
});
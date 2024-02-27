router.get(/^\/contribution\/(ip|author)\/(.+)\/document$/, async function documentContributionList(req, res) {
	const ismember = req.params[0];
	const username = req.params[1];
	var moredata = [];
	
	if(ismember == 'author' && username.toLowerCase() == 'namubot') {
		var data = [];
	} else {
		var data = await curs.execute("select flags, title, namespace, rev, time, changes, log, iserq, erqnum, advance, ismember, username, loghider from history \
				where cast(time as integer) >= ? and ismember = ? " + (username.replace(/\s/g, '') ? "and lower(username) = ?" : "and (lower(username) like '%' || ?)") + " order by cast(time as integer) desc", [
					Number(getTime()) - 2592000000, ismember, username.toLowerCase()
				]);
	
		// 2018년 더시드 업데이트로 최근 30일을 넘어선 기록을 최대 100개까지 볼 수 있었음
		var tt = Number(getTime()) + 12345;
		if(data.length) tt = Number(data[data.length - 1].time);
		if(data.length < 100 && ver('4.8.0'))
			moredata = await curs.execute("select flags, title, namespace, rev, time, changes, log, iserq, erqnum, advance, ismember, username, loghider from history \
					where cast(time as integer) < ? and ismember = ? " + (username.replace(/\s/g, '') ? "and lower(username) = ?" : "and (lower(username) like '%' || ?)") + " order by cast(time as integer) desc limit ?", [
						tt, ismember, username.toLowerCase(), 100 - data.length
					]);
		data = data.concat(moredata);
	}
	
	var content = `
		<p>최근 30일동안의 기여 목록 입니다.</p>
	
		<ol class="breadcrumb link-nav">
			<li><strong>[문서]</strong></li>
			<li><a href="/contribution/${ismember}/${username}/discuss">[토론]</a></li>
		</ol>
		
		<table class="table table-hover">
			<colgroup>
				<col>
				${ver('4.13.0') ? '' : `<col style="width: 25%;">`}
				<col style="width: 22%;">
			</colgroup>
			
			<thead id>
				<tr>
					<th>문서</th>
					${ver('4.13.0') ? '' : `<th>수정자</th>`}
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
					
					${ver('4.13.0') ? '' : `
					<td>
						${ip_pas(row.username, row.ismember)}
					</td>
					`}
					
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
	
	res.send(await render(req, `"${username}" 기여 목록`, content, {}));
});
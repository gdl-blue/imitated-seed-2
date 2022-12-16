router.get(/^\/contribution\/(ip|author)\/(.+)\/discuss$/, async function discussionLog(req, res) {
	const ismember = req.params[0];
	const username = req.params[1];
	
	var dd = await curs.execute("select id, tnum, time, username, ismember from res \
				where cast(time as integer) >= ? and ismember = ? and lower(username) = ? order by cast(time as integer) desc", [
					Number(getTime()) - 2592000000, ismember, username.toLowerCase()
				]);
	
	var content = `
		<p>최근 30일동안의 기여 목록 입니다.</p>
	
		<ol class="breadcrumb link-nav">
			<li><a href="/contribution/${ismember}/${username}/document">[문서]</a></li>
			<li><strong>[토론]</strong></li>
		</ol>
		
		<table class="table table-hover">
			<colgroup>
				<col>
				${ver('4.13.0') ? '' : `<col style="width: 25%;">`}
				<col style="width: 22%;">
			</colgroup>
			
			<thead id>
				<tr>
					<th>항목</th>
					${ver('4.13.0') ? '' : `<th>수정자</th>`}
					<th>수정 시간</th>
				</tr>
			</thead>
			
			<tbody id>
	`;
	
	for(var row of dd) {
		const td = (await curs.execute("select title, namespace, topic from threads where tnum = ?", [row.tnum]))[0];
		const title = totitle(td.title, td.namespace) + '';
		
		content += `
				<tr>
					<td>
						<a href="/thread/${row.tnum}#${row.id}">#${row.id} ${html.escape(td['topic'])}</a> (<a href="/w/${encodeURIComponent(title)}">${html.escape(title)}</a>)
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
	}
	content += `
			</tbody>
		</table>
	`;
	
	res.send(await render(req, `"${username}" 기여 목록`, content, {}));
});
router.get(/^\/RecentChanges$/, async function recentChanges(req, res) {
	var flag = req.query['logtype'];
	if(!['all', 'create', 'delete', 'move', 'revert'].includes(flag)) flag = 'all';
	
	var data = await curs.execute("select isapi, flags, title, namespace, rev, time, changes, log, iserq, erqnum, advance, ismember, username, loghider from history \
					where " + (flag == 'all' ? "not namespace = '사용자' and " : '') + "advance like ? order by cast(time as integer) desc limit 100", 
					[flag == 'all' ? '%' : flag]);
	
	var content = '';
	
	if(ver('4.22.9')) {
		content += `
			<style>
.f5zvpEli {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
    position: relative;
}

.f5zvpEli li {
    border-bottom: 1px solid #e0e0e0;
    border-top: 1px solid #e0e0e0;
}

.f5zvpEli li:first-of-type {
    border-bottom-left-radius: 8px;
    border-left: 1px solid #e0e0e0;
    border-top-left-radius: 8px;
    padding: 0 0 0 .5rem;
}

.f5zvpEli li:last-of-type {
    border-bottom-right-radius: 8px;
    border-right: 1px solid rgb(224, 224, 224);
    border-top-right-radius: 8px;
    padding: 0px 0.5rem 0px 0px;
}

.WM1fI54n {
    color: #373a3c;
    color: var(--text-color,#373a3c);
    display: inline-block;
    padding: .5rem .75rem;
    position: relative;
    text-align: center;
    text-decoration: none;
    white-space: nowrap;
    width: 100%;
}

.Zu7ghnVP {
    --navigation-item-underline-color: var(--brand-bright-color-1,#d5d5d5);
    color: #bcbcbc;
    color: var(--brand-color-1,#bcbcbc);
    font-weight: 600;
}

.WM1fI54n::after {
    background-color: transparent;
    background-color: var(--navigation-item-underline-color,transparent);
    bottom: 0;
    content: "";
    height: 4px;
    left: 1rem;
    pointer-events: none;
    position: absolute;
    right: 1rem;
}

.WM1fI54n:hover:not(.Zu7ghnVP) {
    --navigation-item-underline-color: var(--brand-bright-color-2,#e3e3e3);
}

.BgxsYBxf {
    margin-left: 0;
    margin-left: calc(var(--article-padding-x, 0)*-1);
    margin-right: 0;
    margin-right: calc(var(--article-padding-x, 0)*-1);
    position: relative;
}

.E19V7b3D {
    margin-bottom: 1rem;
    margin-top: 1rem;
}

._7tsGZmP7 {
    overflow-x: auto;
}

.nM6gcR96 {
    display: inline-block;
    margin: 0;
    margin: 0 var(--article-padding-x,0);
}

.byvQlvfu[data-v-08862673] {
    background: linear-gradient(90deg,transparent,#fff);
    background: linear-gradient(90deg,transparent,var(--article-background-color,#fff));
    bottom: 0;
    pointer-events: none;
    position: absolute;
    right: 0;
    top: 0;
    width: 8rem;
}


.Gog8FJ6X[data-v-08862673] {
    background: linear-gradient(90deg,#fff,transparent);
    background: linear-gradient(90deg,var(--article-background-color,#fff),transparent);
    left: 0;
    right: auto;
}

.-Yy3Y6nP[data-v-94a6588c] {
    display: flex;
    flex-direction: column;
}

.NfJT3FPE[data-v-94a6588c] {
    border-bottom: 1px solid #e0e0e0;
    display: grid;
}

.DjsdhWRC[data-v-94a6588c] {
    border-bottom-width: 2px;
    font-weight: 600;
}

@media screen and (max-width: 1023.98px) {
	.DjsdhWRC[data-v-94a6588c] {
		display: none;
	}
}

.NfJT3FPE[data-v-94a6588c] {
    grid-template-columns: 1fr 10rem 11rem 13rem;
}

@media screen and (max-width: 1399.98px) {
	.NfJT3FPE[data-v-94a6588c] {
		grid-template-columns: 1fr 8rem 9rem 12rem;
	}
}

@media screen and (max-width: 1023.98px) {
	.NfJT3FPE[data-v-94a6588c] {
		gap: .1rem;
		grid-template-columns: 1fr 1fr;
		padding: .5rem;
	}
}

.c0O2TLGQ[data-v-94a6588c] {
    padding: .5rem .75rem;
}

@media screen and (max-width: 1023.98px) {
	.c0O2TLGQ[data-v-94a6588c] {
		margin: 0 !important;
		padding: 0 !important;
	}
	
	.c0O2TLGQ[data-v-94a6588c]:first-child, .c0O2TLGQ[data-v-94a6588c]:nth-child(4), .c0O2TLGQ[data-v-94a6588c]:nth-child(5) {
		grid-column: 1/3;
	}
	
	.c0O2TLGQ[data-v-94a6588c]:first-child {
		font-size: 1.05rem;
		margin-bottom: .15rem !important;
	}
	
	.c0O2TLGQ[data-v-94a6588c]:nth-child(3) {
		text-align: right;
	}
	
	.c0O2TLGQ[data-v-94a6588c]:first-child, .c0O2TLGQ[data-v-94a6588c]:nth-child(4), .c0O2TLGQ[data-v-94a6588c]:nth-child(5) {
		grid-column: 1/3;
	}
	
	.c0O2TLGQ[data-v-94a6588c]:nth-child(4) {
		color: #888;
		font-size: .85rem;
		order: -1;
	}
}

.i80SVicp[data-v-94a6588c] {
    grid-column: 1/5;
}

.c0O2TLGQ + .i80SVicp[data-v-94a6588c] {
    color: #777;
    font-size: .9rem;
    margin: -.25rem 0 0;
    padding: 0 .75rem .5rem 1.5rem;
}

span[data-v-6cbb5b59] {
    color: gray;
}

.MY5yAwDg[data-v-94a6588c] {
    font-size: .8rem;
    margin: 0 0 0 .35rem;
    vertical-align: bottom;
}

span.a7gtkJvH[data-v-6cbb5b59] {
    color: red;
}

span.d\\+Pid0zt[data-v-6cbb5b59] {
    color: green;
}

._4HlR7Xk\\+[data-v-94a6588c] {
    display: flex;
    gap: .25rem;
}

.sx7-yPnI[data-v-94a6588c] {
    align-items: center;
    border: 1px solid #e0e0e0;
    border-radius: 3px;
    color: #555;
    cursor: pointer;
    display: flex;
    font-size: .8rem;
    height: 1.3rem;
    justify-content: center;
    text-decoration: none;
    transition: background-color .1s ease-in,box-shadow .1s ease-in;
    width: 2rem;
}

.sx7-yPnI[data-v-94a6588c]:hover:not(.LHiFEOns) {
    background-color: #ededed;
}

.NfJT3FPE[data-v-94a6588c]:hover:not(.DjsdhWRC) {
    background-color: #fbfbfb;
}
			</style>
			
			<div class="BgxsYBxf E19V7b3D">	
				<div class=_7tsGZmP7>
					<div class=nM6gcR96>
						<ul class=f5zvpEli>
							<li><a class="WM1fI54n${flag == 'all' ? ' Zu7ghnVP' : ''}" href="?logtype=all">전체</a></li>
							<li><a class="WM1fI54n${flag == 'create' ? ' Zu7ghnVP' : ''}" href="?logtype=create">새 문서</a></li>
							<li><a class="WM1fI54n${flag == 'delete' ? ' Zu7ghnVP' : ''}" href="?logtype=delete">삭제</a></li>
							<li><a class="WM1fI54n${flag == 'move' ? ' Zu7ghnVP' : ''}" href="?logtype=move">이동</a></li>
							<li><a class="WM1fI54n${flag == 'revert' ? ' Zu7ghnVP' : ''}" href="?logtype=revert">되돌림</a></li>
						</ul>
					</div>
				</div>
				
				<div data-v-08862673 class="byvQlvfu Gog8FJ6X" style="opacity: 0;"></div>
				<div data-v-08862673 class=byvQlvfu style="opacity: 0; display: none;"></div>
			</div>
			
			<div class=-Yy3Y6nP data-v-94a6588c>
				<div data-v-94a6588c="" class="NfJT3FPE DjsdhWRC">
					<div data-v-94a6588c="" class="c0O2TLGQ">문서</div> 
					<div data-v-94a6588c="" class="c0O2TLGQ">기능</div> 
					<div data-v-94a6588c="" class="c0O2TLGQ">수정자</div> 
					<div data-v-94a6588c="" class="c0O2TLGQ">수정 시간</div>
				</div>
		`;
	} else {
		content += `
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
	}
	
	if(ver('4.22.9')) for(var row of data) {
		var title = totitle(row.title, row.namespace) + '';
		
		content += `
				<div class=NfJT3FPE data-v-94a6588c>
					<div class=c0O2TLGQ data-v-94a6588c>
						<a href="/w/${encodeURIComponent(title)}">${html.escape(title)}</a> 
						<span class="MY5yAwDg${Number(row.changes) > 0
								? ' d+Pid0zt'
								: (
									Number(row.changes) < 0
									? ' a7gtkJvH'
									: ''
								)}" data-v-6cbb5b59 data-v-94a6588c>${row.changes}</span>
					</div>
					
					<div class=c0O2TLGQ data-v-94a6588c>
						<div class="_4HlR7Xk+" data-v-94a6588c>
							<a class=sx7-yPnI data-v-94a6588c title="역사" href="/history/${encodeURIComponent(title)}">역사</a> 
							${
									Number(row.rev) > 1
									? '<a class=sx7-yPnI data-v-94a6588c title="비교" href="/diff/' + encodeURIComponent(title) + '?rev=' + row.rev + '&oldrev=' + String(Number(row.rev) - 1) + '">비교</a>'
									: ''
							} 
							<a class=sx7-yPnI data-v-94a6588c title="토론" href="/discuss/${encodeURIComponent(title)}">토론</a> 
						</div>
					</div>
					
					<div class=c0O2TLGQ data-v-94a6588c>
						${ip_pas(row.username, row.ismember)}${ver('4.20.0') && row.isapi ?' <i>(API)</i>' : ''}
					</div>
					
					<div class=c0O2TLGQ data-v-94a6588c>
						${formatRelativeDate(row.time)}
					</div>
		`;
		
		if((row.log.length > 0 && !row.loghider) || row.advance != 'normal') {
			content += `
				<div class="c0O2TLGQ i80SVicp" data-v-94a6588c>
					<span data-v-94a6588c>${row.loghider ? '' : row.log}</span> ${row.advance != 'normal' ? `<i data-v-94a6588c>(${edittype(row.advance, ...(row.flags.split('\n')))})</i>` : ''}
				</div>
			`;
		} else {
			content += '<!---->';
		}
		
		content += '</div>';
	} else for(var row of data) {
		var title = totitle(row.title, row.namespace) + '';
		
		content += `
				<tr${(row.log.length > 0 || row.advance != 'normal' ? ' class=no-line' : '')}>
					<td>
						<a href="/w/${encodeURIComponent(title)}">${html.escape(title)}</a> 
						<a href="/history/${encodeURIComponent(title)}">[역사]</a> 
						${
								Number(row.rev) > 1
								? '<a href="/diff/' + encodeURIComponent(title) + '?rev=' + row.rev + '&oldrev=' + String(Number(row.rev) - 1) + '">[비교]</a>'
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
	
	if(ver('4.22.9')) {
		content += `</div>`;
	} else {
		content += `
				</tbody>
			</table>
		`;
	}
	
	res.send(await render(req, '최근 변경내역', content, {}));
});

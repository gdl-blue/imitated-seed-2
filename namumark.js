const html = {
	escape: function(content = '') {
		content = content.replace(/[&]/gi, '&amp;');
		content = content.replace(/["]/gi, '&quot;');
		content = content.replace(/[<]/gi, '&lt;');
		content = content.replace(/[>]/gi, '&gt;');
		
		return content;
	}
};

class stack {
	constructor() {
		this.internalArray = [];
	}
	
	push(x) {
		this.internalArray.push(x);
	}
	
	pop() {
		return this.internalArray.pop();
	}
	
	top() {
		return this.internalArray[this.internalArray.length - 1];
	}
	
	size() {
		return this.internalArray.length;
	}
	
	empty() {
		return this.internalArray.length ? false : true;
	}
};

function getTime() { return Math.floor(new Date().getTime()); }; const get_time = getTime;

function toDate(t, d = 0) {
	if(isNaN(Number(t))) return t;
	
	var date = new Date(Number(t));
	if(!d) return date.toISOString();
	
	var hour = date.getHours(); hour = (hour < 10 ? "0" : "") + hour;
    var min  = date.getMinutes(); min = (min < 10 ? "0" : "") + min;
    var sec  = date.getSeconds(); sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getFullYear();
    var month = date.getMonth() + 1; month = (month < 10 ? "0" : "") + month;
    var day  = date.getDate(); day = (day < 10 ? "0" : "") + day;

    return year + "-" + month + "-" + day + " " + hour + ":" + min + ":" + sec;
}

const timeFormat = 'Y-m-d H시 i분';
function generateTime(time, fmt = timeFormat, iso = null) {
	try {if(time.replace(/^(\d+)[-](\d+)[-](\d+)T(\d+)[:](\d+)[:](\d+)[.]([A-Z0-9]+)$/i, '') == '') {
		return `<time datetime="${time}" data-format="${fmt}">${time}</time>`;
	}}catch(e){}
	
	const d = split(time, ' ')[0];
	const t = split(time, ' ')[1];
	
	return `<time datetime="${d}T${t}.000Z" data-format="${fmt}">${time}</time>`;
}

const jsdom = require("jsdom");
const jquery = require('jquery');

async function markdown(content, discussion = 0, title = '') {
	// markdown 아니고 namumark
	
	function parseTable(content) {
		var data = '\n' + content + '\n';
		
		// 캡션없는 표의 셀에 <td> 추가
		for(let _tr of (data.match(/^(\|\|(((?!\|\|($|\n))[\s\S])*)\|\|)$/gim) || [])) {
			var tr = _tr.match(/^(\|\|(((?!\|\|($|\n))[\s\S])*)\|\|)$/gim)[0];
			var otr = tr;
			var ntr = tr
				.replace(/^[|][|]/g, '<tr norender><td>')
				.replace(/[|][|]$/g, '</td></tr>')
				.replace(/[|][|]/g, '</td><td>')
				.replace(/\n/g, '<br />');
			
			data = data.replace(tr, ntr);
		}
		
		var datarows = data.split('\n');
		
		// 캡션없는 표의 시작과 끝을 감싸고, 전체에 적용되는 꾸미기 문법 적용
		for(let _tr of (data.match(/^(<tr norender><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/gim) || [])) {
			var tr = _tr.match(/^(<tr norender><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/im)[0];
			
			if (  // 표의 시작이라면(위에 || 문법 없음)
				(!((befrow = (datarows[datarows.findIndex(s => s == tr.split('\n')[0]) - 1] || '')).match(/^(<tr><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/im))) &&  // 이전 줄이 표가 아니면
				(!(befrow.match(/^(\|(((?!\|).)+)\|(((?!\|\|($|\n))[\s\S])*)\|\|)$/im)))  // 캡션도 아니면
			) {
				const fulloptions = (tr.replace(/&lt;((?!table).)*&gt;/g, '').match(/^<tr norender><td>((&lt;([a-z0-9 ]+)=(((?!&gt;).)+)&gt;)+)/i) || ['', ''])[1];
				var ts = '', trs = '';
				
				var alop, align = ((alop = (fulloptions.match(/&lt;table\s*align=(left|center|right)&gt;/))) || ['', 'left'])[1];
				if(alop) data = data.replace(tr, tr = tr.replace(alop[0], ''));
				
				var wiop, width = ((wiop = (fulloptions.match(/&lt;table\s*width=((\d+)(px|%|))&gt;/))) || ['', ''])[1];
				if(wiop) {
					data = data.replace(tr, tr = tr.replace(wiop[0], ''));
					trs += 'width: ' + width + '; ';
				}
				
				var clop, color = ((clop = (fulloptions.match(/&lt;table\s*color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
				if(clop) {
					data = data.replace(tr, tr = tr.replace(clop[0], ''));
					trs += 'color: ' + color + '; ';
				}
				
				var bgop, bgcolor = ((bgop = (fulloptions.match(/&lt;table\s*bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
				if(bgop) {
					data = data.replace(tr, tr = tr.replace(bgop[0], ''));
					trs += 'background-color: ' + bgcolor + '; ';
				}
				
				var brop, border = ((brop = (fulloptions.match(/&lt;table\s*bordercolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
				if(brop) {
					data = data.replace(tr, tr = tr.replace(brop[0], ''));
					trs += 'border: 2px solid ' + border + '; ';
				}
				
				if(trs) ts = ' style="' + trs + '"';
				
				data = data.replace(tr, '<div class="wiki-table-wrap table-' + align + '"><table class=wiki-table' + ts + '><tbody>\n' + tr);
				datarows = data.split('\n');
			} if (  // 표의 끝이라면(아래에 || 문법 없음)
				!((aftrow = (datarows[datarows.findIndex(s => s == (r = tr.split('\n'))[r.length - 1]) + 1] || '')).match(/^(<tr norender><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/im))  // 다음 줄이 표가 아니면
			) {
				data = data.replace(tr, tr + '\n</tbody></table></div>');
			}
			
			data = data.replace(tr, tr.replace('<tr norender>', '<tr>'));
			datarows = data.split('\n');
		}
		
		// 캡션있는 표 렌더링
		for(let _tr of (data.match(/^(\|(((?!\|).)+)\|(((?!\|\|($|\n))[\s\S])*)\|\|)$/gim) || [])) {
			var tr = _tr.match(/^(\|(((?!\|).)+)\|(((?!\|\|($|\n))[\s\S])*)\|\|)$/im);
			var ec = '';
			
			if (  // 표의 시작이 아니면 건너뛰기
				((befrow = (datarows[datarows.findIndex(s => s == tr[0].split('\n')[0]) - 1] || '')).match(/^(<tr><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/im))
			) continue; if (  // 표의 끝
				!((aftrow = (datarows[datarows.findIndex(s => s == (r = tr[0].split('\n'))[r.length - 1]) + 1] || '')).match(/^(<tr><td>(((?!<\/td><\/tr>($|\n))[\s\S])*)<\/td><\/tr>)$/im))  // 다음 줄이 표가 아니면
			) {
				ec = '\n</tbody></table></div>';
			}
			
			ntr = (
				('||' + tr[4] + '||')
				.replace(/^[|][|]/g, '<tr><td>')
				.replace(/[|][|]$/g, '</td></tr>')
				.replace(/[|][|]/g, '</td><td>')
				.replace(/\n/g, '<br />')
				+ ec
			);
			
			const fulloptions = (ntr.replace(/&lt;((?!table).)*&gt;/g, '').match(/^<tr><td>((&lt;([a-z0-9 ]+)=(((?!&gt;).)+)&gt;)+)/i) || ['', ''])[1];
				
			var alop, align = ((alop = (fulloptions.match(/&lt;table\s*align=(left|center|right)&gt;/))) || ['', 'left'])[1];
			if(alop) data = data.replace(ntr, ntr = ntr.replace(alop[0], ''));
			
			var ts = '', trs = '';
			
			var wiop, width = ((wiop = (fulloptions.match(/&lt;table\s*width=((\d+)(px|%|))&gt;/))) || ['', ''])[1];
			if(wiop) {
				data = data.replace(ntr, ntr = ntr.replace(wiop[0], ''));
				trs += 'width: ' + width + '; ';
			}
			
			var clop, color = ((clop = (fulloptions.match(/&lt;table\s*color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
			if(clop) {
				data = data.replace(ntr, ntr = ntr.replace(clop[0], ''));
				trs += 'color: ' + color + '; ';
			}
			
			var bgop, bgcolor = ((bgop = (fulloptions.match(/&lt;table\s*bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
			if(bgop) {
				data = data.replace(ntr, ntr = ntr.replace(bgop[0], ''));
				trs += 'background-color: ' + bgcolor + '; ';
			}
			
			var brop, border = ((brop = (fulloptions.match(/&lt;table\s*bordercolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/))) || ['', ''])[1];
			if(brop) {
				data = data.replace(ntr, ntr = ntr.replace(brop[0], ''));
				trs += 'border: 2px solid ' + border + '; ';
			}

			if(trs) ts = ' style="' + trs + '"';			
			
			data = data.replace(tr[0], '<div class="wiki-table-wrap table-' + align + '"><table class=wiki-table' + ts + '><caption>' + tr[2] + '</caption><tbody>\n' + ntr);
			datarows = data.split('\n');
		}
		
		// 셀 꾸미기
		for(let _tr of (data.match(/^<tr>(((?!<\/tr>).)*)<\/tr>$/gim) || [])) {
			var tr = _tr.match(/^<tr>(((?!<\/tr>).)*)<\/tr>$/im)[1], ntr = tr;
			
			for(let td of (tr.match(/<td>(((?!<\/td>).)*)<\/td>/g) || [])) {
				var text = (td.match(/<td>(((?!<\/td>).)*)<\/td>/) || ['', ''])[1], ot = text, ntd = td;
				var notx = text.replace(/^((&lt;([a-z0-9():\| -]+)((=(((?!&gt;).)+))*)&gt;)+)/i, '');
				var attr = '', tds = '', cs = '', rs = '';
				
				const fulloptions = (td.replace(/(&lt;table([a-z0-9 ]+)=(((?!&gt;).)+)&gt;)/g, '').match(/^<td>((&lt;([a-z0-9():\|\^ -]+)((=(((?!&gt;).)+))*)&gt;)+)/i) || ['', ''])[1];
				
				// 정렬1
				if(notx.startsWith(' ') && notx.endsWith(' ')) {
					tds += 'text-align: center; ';
				}
				else if(notx.startsWith(' ') && !notx.endsWith(' ')) {
					tds += 'text-align: right; ';
				}
				
				// 정렬2
				var align = (fulloptions.match(/&lt;([(]|[:]|[)])&gt;/) || ['', ''])[1];
				
				if(align) {
					tds += 'text-align: ' + (
						align == '(' ? (
							'left'
						) : (
							align == ')' ? (
								'right'
							) : (
								'center'
							)
						)
					) + '; ';
					ntd = ntd.replace(/&lt;([(]|[:]|[)])&gt;/, '');
				}
				
				// 너비
				var width = (fulloptions.match(/&lt;width=((\d+)(px|%|))&gt;/) || ['', ''])[1];
				if(width) {
					tds += 'width: ' + width + '; ';
					ntd = ntd.replace(/&lt;width=((\d+)(px|%|))&gt;/, '');
				}
				
				// 높이
				var height = (fulloptions.match(/&lt;height=((\d+)(px|%|))&gt;/) || ['', ''])[1];
				if(height) {
					tds += 'height: ' + height + '; ';
					ntd = ntd.replace(/&lt;height=((\d+)(px|%|))&gt;/, '');
				}
				
				// 가로 합치기
				var colspan = (fulloptions.match(/&lt;[-](\d+)&gt;/) || ['', ''])[1];
				if(colspan) {
					cs = colspan;
					ntd = ntd.replace(/&lt;[-](\d+)&gt;/, '');
				}
				
				// 세로 합치기 & 정렬
				var rowopt = (fulloptions.match(/&lt;([^]|[v]|)[|](\d+)&gt;/) || ['', '', '']);
				if(rowopt[2]) {
					rs = rowopt[2];
					switch(rowopt[1]) {
						case '^':
							tds += 'vertical-align: top; ';
							break; 
						case 'v':
							tds += 'vertical-align: bottom; ';
					}
					ntd = ntd.replace(/&lt;([^]|[v]|)[|](\d+)&gt;/, '');
				}
				
				// 셀 배경색
				var bgcolor = (fulloptions.match(/&lt;((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/) || ['', ''])[1];
				if(bgcolor) {
					tds += 'background-color: ' + bgcolor + '; ';
					ntd = ntd.replace(/&lt;((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/, '');
				}
				
				// 셀 배경색 2
				var bgcolor = (fulloptions.match(/&lt;bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/) || ['', ''])[1];
				if(bgcolor) {
					tds += 'background-color: ' + bgcolor + '; ';
					ntd = ntd.replace(/&lt;bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/, '');
				}
				
				// 글자색
				var color = (fulloptions.match(/&lt;color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/) || ['', ''])[1];
				if(color) {
					tds += 'color: ' + color + '; ';
					ntd = ntd.replace(/&lt;color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))&gt;/, '');
				}
				
				if(tds) attr += ' style="' + tds + '"';
				if(cs)  attr += ' colspan=' + cs;
				if(rs)  attr += ' rowspan=' + rs;
				ntd = ntd.replace(/<td>/, '<td' + attr + '>');
				
				ntr = ntr.replace(td, ntd);
			}
			data = data.replace(tr, ntr)
		}
		
		return data
			.replace(/^\n/, '')
			.replace(/\n$/, '')
			.replace(/<tbody>\n/g, '<tbody>')
			.replace(/\n<\/tbody>/g, '<tbody>')
			.replace(/<\/tr>\n/g, '</tr>')
			.replace(/\n<tr>/g, '</tr>')
			.replace(/<\/tbody><tbody><\/tbody>/g, '</tbody>')
			;
	}
	
	function parseList(content) {
		content = '\n' + data + '\n';
		
		for(let li of (data.match(/\s+[*](.*)/gim) || [])) {
			
		}
	}
	
	function multiply(a, b) {
		if(typeof a == 'number') return a * b;
		
		var ret = '';
		for(let i=0; i<b; i++) ret += a;
		return ret;
	}
	
	var footnotes = new stack();
	var blocks    = new stack();
	
	var fnNames = {};
	var fnNums  = 0;
	var fnNum   = 0;
	
	var data = content;
	
	data = html.escape(data);
	
	if(!data.includes('\n') && data.includes('\r')) data = data.replace(/\r/g, '\n');
	if(data.includes('\n') && data.includes('\r')) data = data.replace(/\r\n/g, '\n');
	
	for(let esc of (data.match(/(?:\\)(.)/g) || [])) {
		const match = data.match(/(?:\\)(.)/);
		data = data.replace(esc, '<spannw class=nowiki>' + match[1] + '</spannw>');
	}
	
	for(let link of (data.match(/\[\[(((?!\]\]).)+)\]\]/g) || [])) {
		const dest = link.match(/\[\[(((?!\]\]).)+)\]\]/)[1];
		if(dest.includes('|')) {
			const sl = dest.split('|')[0] == title ? ' self-link' : '';
			data = data.replace(link, '<a class="wiki-link-internal' + sl + '" href="/w/' + encodeURIComponent(dest.split('|')[0]) + '">' + html.escape(dest.split('|')[1]) + '</a>');
		} else {
			const sl = dest == title ? ' self-link' : '';
			data = data.replace(link, '<a class="wiki-link-internal' + sl + '" href="/w/' + encodeURIComponent(dest) + '">' + html.escape(dest) + '</a>');
		}
	}
	
	data = data.replace(/{{{[#](((?!\s)[a-zA-Z0-9])+)\s(((?!}}}).)+)}}}/g, '<font color="$1">$3</font>');
	data = data.replace(/{{{(((?!}}}).)*)}}}/g, '<code>$1</code>');
	
	for(let block of (data.match(/{{{(.*)$/gim) || [])) {
		const h = block.match(/{{{(.*)$/im)[1];
		
		if(h.match(/^[#][!]folding/)) {
			blocks.push('</dd></dl>');
			const title = h.match(/^[#][!]folding\s(.*)$/)[1];
			data = data.replace('{{{' + h, '<dl class=wiki-folding><dt>' + title + '</dt><dd>');
		} else if(h.match(/^[#][!]wiki/)) {
			blocks.push('</div>');
			const style = (h.match(/style=&quot;(((?!&quot;).)*)&quot;/) || ['', '', ''])[1];
			data = data.replace('{{{' + h, '<div class=wiki-style style="' + style.replace(/&amp;quot;/g, '&quot;') + '">');
		} else if(h.match(/^[#][!]random/)) {
			blocks.push('</span>');
			const per = Number((h.match(/^[#][!]random (\d+)/) || ['', '1000'])[1]) || 1000;
			if(Math.random() <= per / 1000) {
				data = data.replace('{{{' + h, '<span>');
			} else {
				data = data.replace('{{{' + h, '<span class=random-block style="display: none;">');
			}
		} else {
			blocks.push('</code></pre>');
			
			data = data.replace('{{{' + h, '<pre><code>');
		}
	}
	
	for(let cbl of (data.match(/}}}/g) || [])) {
		data = data.replace(cbl, '' + blocks.top());
		blocks.pop();
	}

	data = '<div>\n' + data;

	var maxszz = 2;
	var headnum = [, 0, 0, 0, 0, 0, 0];
	var tochtml = '<div class=wiki-macro-toc id=toc>', tocarr = [];
	
	if(data.match(/^======\s.*\s======$/m)) maxszz = 6;
	if(data.match(/^=====\s.*\s=====$/m)) maxszz = 5;
	if(data.match(/^====\s.*\s====$/m)) maxszz = 4;
	if(data.match(/^===\s.*\s===$/m)) maxszz = 3;
	if(data.match(/^==\s.*\s==$/m)) maxszz = 2;
	if(data.match(/^=\s.*\s=$/m)) maxszz = 1;
	
	// 사실 내가 봐도 이건 너무...
	for(let heading of (data.match(/^(=\s(((?!=).)*)\s=|==\s(((?!==).)*)\s==|===\s(((?!===).)*)\s===|====\s(((?!====).)*)\s====|=====\s(((?!=====).)*)\s=====|======\s(((?!======).)*)\s======)$/gm) || [])) {
		const h1 = heading.match(/^=\s(((?!=).)*)\s=$/m);
		const h2 = heading.match(/^==\s(((?!==).)*)\s==$/m);
		const h3 = heading.match(/^===\s(((?!===).)*)\s===$/m);
		const h4 = heading.match(/^====\s(((?!====).)*)\s====$/m);
		const h5 = heading.match(/^=====\s(((?!=====).)*)\s=====$/m);
		const h6 = heading.match(/^======\s(((?!======).)*)\s======$/m);
		
		if(h6) {
			const title = h6[1];
			var snum;
			switch(maxszz) {
				case 6:
					snum = '' + ++headnum[6];
				break; case 5:
					snum = '' + headnum[5] + '.' + ++headnum[6];
				break; case 4:
					snum = '' + headnum[4] + '.' + headnum[5] + '.' + ++headnum[6];
				break; case 3:
					snum = '' + headnum[3] + '.' + headnum[4] + '.' + headnum[5] + '.' + ++headnum[6];
				break; case 2:
					snum = '' + headnum[2] + '.' + headnum[3] + '.' + headnum[4] + '.' + headnum[5] + '.' + ++headnum[6];
				break; case 1:
					snum = '' + headnum[1] + '.' + headnum[2] + '.' + headnum[3] + '.' + headnum[4] + '.' + headnum[5] + '.' + ++headnum[6];
			}
			
			data = data.replace(heading, '</div><h6 class=wiki-heading><a href="#toc" id="s-' + snum + '">' + snum + '.</a> ' + html.escape(title) + '</h6><div class=wiki-heading-content>');
			var mt=6;tochtml += multiply('<div class=toc-indent>', mt - maxszz + 1) + '<span class=toc-item><a href="#s-' + snum + '">' + snum + '</a>. ' + html.escape(title) + '</span>' + multiply('</div>', mt - maxszz + 1);
		} else if(h5) {
			const title = h5[1];
			var snum;
			switch(maxszz) {
				case 5:
					snum = '' + ++headnum[5];
				break; case 4:
					snum = '' + headnum[4] + '.' + ++headnum[5];
				break; case 3:
					snum = '' + headnum[3] + '.' + headnum[4] + '.' + ++headnum[5];
				break; case 2:
					snum = '' + headnum[2] + '.' + headnum[3] + '.' + headnum[4] + '.' + ++headnum[5];
				break; case 1:
					snum = '' + headnum[1] + '.' + headnum[2] + '.' + headnum[3] + '.' + headnum[4] + '.' + ++headnum[5];
			}
			
			data = data.replace(heading, '</div><h5 class=wiki-heading><a href="#toc" id="s-' + snum + '">' + snum + '.</a> ' + html.escape(title) + '</h5><div class=wiki-heading-content>');
			var mt=5;tochtml += multiply('<div class=toc-indent>', mt - maxszz + 1) + '<span class=toc-item><a href="#s-' + snum + '">' + snum + '</a>. ' + html.escape(title) + '</span>' + multiply('</div>', mt - maxszz + 1);
		} else if(h4) {
			const title = h4[1];
			var snum;
			switch(maxszz) {
				case 4:
					snum = '' + ++headnum[4];
				break; case 3:
					snum = '' + headnum[3] + '.' + ++headnum[4];
				break; case 2:
					snum = '' + headnum[2] + '.' + headnum[3] + '.' + ++headnum[4];
				break; case 1:
					snum = '' + headnum[1] + '.' + headnum[2] + '.' + headnum[3] + '.' + ++headnum[4];
			}
			
			data = data.replace(heading, '</div><h4 class=wiki-heading><a href="#toc" id="s-' + snum + '">' + snum + '.</a> ' + html.escape(title) + '</h4><div class=wiki-heading-content>');
			var mt=4;tochtml += multiply('<div class=toc-indent>', mt - maxszz + 1) + '<span class=toc-item><a href="#s-' + snum + '">' + snum + '</a>. ' + html.escape(title) + '</span>' + multiply('</div>', mt - maxszz + 1);
		} else if(h3) {
			const title = h3[1];
			var snum;
			switch(maxszz) {
				case 3:
					snum = '' + ++headnum[3];
				break; case 2:
					snum = '' + headnum[2] + '.' + ++headnum[3];
				break; case 1:
					snum = '' + headnum[1] + '.' + headnum[2] + '.' + ++headnum[3];
			}
			
			data = data.replace(heading, '</div><h3 class=wiki-heading><a href="#toc" id="s-' + snum + '">' + snum + '.</a> ' + html.escape(title) + '</h3><div class=wiki-heading-content>');
			var mt=3;tochtml += multiply('<div class=toc-indent>', mt - maxszz + 1) + '<span class=toc-item><a href="#s-' + snum + '">' + snum + '</a>. ' + html.escape(title) + '</span>' + multiply('</div>', mt - maxszz + 1);
		} else if(h2) {
			const title = h2[1];
			var snum;
			switch(maxszz) {
				case 2:
					snum = '' + ++headnum[2];
				break; case 1:
					snum = '' + headnum[1] + '.' + ++headnum[2];
			}
			
			data = data.replace(heading, '</div><h2 class=wiki-heading><a href="#toc" id="s-' + snum + '">' + snum + '.</a> ' + html.escape(title) + '</h2><div class=wiki-heading-content>');
			var mt=2;tochtml += multiply('<div class=toc-indent>', mt - maxszz + 1) + '<span class=toc-item><a href="#s-' + snum + '">' + snum + '</a>. ' + html.escape(title) + '</span>' + multiply('</div>', mt - maxszz + 1);
		} else if(h1) {
			const title = h1[1];
			var snum;
			switch(maxszz) {
				case 1:
					snum = '' + ++headnum[1];
			}
			
			data = data.replace(heading, '</div><h1 class=wiki-heading><a href="#toc" id="s-' + snum + '">' + snum + '.</a> ' + html.escape(title) + '</h1><div class=wiki-heading-content>');
			var mt=1;tochtml += multiply('<div class=toc-indent>', mt - maxszz + 1) + '<span class=toc-item><a href="#s-' + snum + '">' + snum + '</a>. ' + html.escape(title) + '</span>' + multiply('</div>', mt - maxszz + 1);
		}
	}
	
	tochtml += '</div>';
	data += '</div>';
	data = data.replace('<div>\n', '<div>');
	data = data.replace(/<div class=wiki[-]heading[-]content>\n/g, '<div class=wiki-heading-content>');
	
	// data = data.replace(/{{{[#][!]wiki style[=][&]quot[;](((?![&]quot[;]).)+)[&]quot[;]\n(((?!}}}).)+)}}}/gi, '<div style="$1">$3</div>');
	
	data = data.replace(/^[-]{4,}$/gim, '<hr />');

	data = data.replace(/['][']['](((?![']['][']).)+)[']['][']/g, '<strong>$1</strong>');
	data = data.replace(/[']['](((?!['][']).)+)['][']/g, '<i>$1</i>');
	data = data.replace(/~~(((?!~~).)+)~~/g, '<del>$1</del>');
	data = data.replace(/--(((?!--).)+)--/g, '<del>$1</del>');
	data = data.replace(/__(((?!__).)+)__/g, '<u>$1</u>');
	data = data.replace(/[,][,](((?![,][,]).)+)[,][,]/g, '<sub>$1</sub>');
	data = data.replace(/[^][^](((?![^][^]).)+)[^][^]/g, '<sup>$1</sup>');

	data = data.replace(/{{[|](((?![|]}}).)+)[|]}}/g, '<div class=wiki-textbox>$1</div>');
/*
	if(!discussion) {
		try{for(let htmlb of data.match(/{{{[#][!]html(((?!}}}).)*)}}}/gim)) {
			var htmlcode = htmlb.match(/{{{[#][!]html(((?!}}}).)*)}}}/im)[1];
			try{for(let tag of htmlcode.match(/[&]lt[;](((?!(\s|[&]gt[;])).)+)/gi)) {
				const thistag = tag.match(/[&]lt[;](((?!(\s|[&]gt[;])).)+)/i)[1];
				if(thistag.startsWith('/')) continue;
				
				//print('[' + thistag + ']')
				
				if(
					![
						'b', 'strong', 'em', 'i', 's', 'del', 'strike',
						'input', 'textarea', 'progress', 'div', 'span', 'p',
						'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ins', 'u', 'sub',
						'sup', 'small', 'big', 'br', 'hr', 'abbr', 'wbr', 'blockquote',
						'q', 'dfn', 'pre', 'ruby', 'ul', 'li', 'ol', 'dir', 'menu',
						'dl', 'dt', 'dd', 'a', 'button',' output', 'datalist', 'select',
						'option', 'fieldset', 'legend', 'label', 'basefont', 'center',
						'font', 'tt', 'kbd', 'code', 'samp', 'blink', 'marquee', 'multicol',
						'nobr', 'noembed', 'xmp', 'isindex'].includes(thistag)
				) { 
					htmlcode = htmlcode.replace('&lt;' + thistag, '&lt;span');
					htmlcode = htmlcode.replace('&lt;/' + thistag + '&gt;', '&lt;/span&gt;');
				}
			}}catch(e){}
			htmlcode = htmlcode.replace(/&lt;(.+)\s(.*)on(((?![=]).)+)[=]["](.*)["](.*)&gt;/gi, '&lt;$1 $2 $5&gt;');
			
			data = data.replace(htmlb, htmlcode.replace(/[&]amp[;]/gi, '&').replace(/[&]quot[;]/gi, '"').replace(/[&]gt[;]/gi, '>').replace(/[&]lt[;]/gi, '<'));
		}}catch(e){}
	}*/
	
	data = data.replace(/\[br\]/gi, '&lt;br&gt;');
	data = data.replace(/\[(date|datetime)\]/gi, generateTime(toDate(getTime()), timeFormat));
	data = data.replace(/\[(tableofcontents|목차)\]/gi, tochtml);
	
	const { JSDOM } = jsdom;
	const { window } = new JSDOM();
	const { document } = (new JSDOM(data.replace(/\n/g, '<br>'))).window;
	
	// 하위 블록(wiki style, folding, ...)이 없는 것부터 표를 렌더링하면 중첩 표 가능
	// 재귀 함수의 원리
	function f(el) {
		const blks = el.querySelectorAll('dl.wiki-folding > dd, div.wiki-style, span.random-block, blockquote.wiki-quote');
		if(blks.length) {
			for(let el2 of blks) {
				f(el2);
			}
		}
		
		const ihtml = (el == document ? el.querySelector('body') : el).innerHTML;
		(el == document ? el.querySelector('body') : el).innerHTML = parseTable(ihtml.replace(/<br>/g, '\n')).replace(/\n/g, '<br>');
	}
	
	f(document);
	
	for(let item of document.querySelectorAll('spannw.nowiki')) {
		item.outerHTML = item.innerHTML;
	}
	
	data = document.querySelector('body').innerHTML;
	
	data = data.replace(/<br>/g, '\n');
	
	// data = parseTable(data);
	
	/*
	do {
		const fn = data.match(/\[[*]\s(((?!\]).)*)/i);
		if(fn) {
			footnotes.push(++fnNums);
			data = data.replace(/\[[*]\s/i, '<a class=wiki-fn-content href="#fn-' + fnNums + '"><span class=footnote-content>');
		}
		
		const fnclose = data.match(/\]/i);
		if(fnclose) {
			footnotes.pop();
			data = data.replace(/\]/i, '</span><span id="rfn-' + ++fnNum + '" class=target></span>(' + fnNum + ')</a>');
		}
	} while(data.match(/\[[*]\s(((?!\]).)*)/i) || footnotes.size());
	
	*/
	// print('----------');
	// print(data);
	// print('----------');
	
	return data.replace(/<div>\n/, '<div>').replace(/\n<\/div><h(\d)/g, '</div><h$1').replace(/\n/g, '<br />');
}

module.exports = markdown;

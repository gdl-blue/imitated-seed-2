const path = require('path');
const geoip = require('geoip-lite');
const inputReader = require('wait-console-input');
const { SHA3 } = require('sha3');
const md5 = require('md5');
const session = require('express-session');
const swig = require('swig');
const ipRangeCheck = require('ip-range-check');
const bodyParser = require('body-parser');
const fs = require('fs');
const diff = require('./cemerick-jsdifflib.js');
const cookieParser = require('cookie-parser');
const child_process = require('child_process');
const captchapng = require('captchapng');
const _jsdom = require('jsdom');
function jsdom(content) {
	if(jsdom.JSDOM) {
		// JSDOM 신버전용 코드
		return (new _jsdom.JSDOM(content)).window.document;
	} else {
		// JSDOM 9.12.0 버전용 코드
		return _jsdom.jsdom(content);
	}
}

const hostconfig = require('./hostconfig');
const functions = require('./functions');
for(var item in functions) global[item] = functions[item];

const rHeadings = 
	ver('4.7.2') 
		? /^(=\s(((?!\s=).)*)\s=|==\s(((?!\s==).)*)\s==|===\s(((?!\s===).)*)\s===|====\s(((?!\s====).)*)\s====|=====\s(((?!\s=====).)*)\s=====|======\s(((?!\s======).)*)\s======|=[#]\s(((?!\s[#]=).)*)\s[#]=|==[#]\s(((?!\s[#]==).)*)\s[#]==|===[#]\s(((?!\s[#]===).)*)\s[#]===|====[#]\s(((?!\s[#]====).)*)\s[#]====|=====[#]\s(((?!\s[#]=====).)*)\s[#]=====|======[#]\s(((?!\s[#]======).)*)\s[#]======)$/gm
		: /^(=\s(((?!\s=).)*)\s=|==\s(((?!\s==).)*)\s==|===\s(((?!\s===).)*)\s===|====\s(((?!\s====).)*)\s====|=====\s(((?!\s=====).)*)\s=====|======\s(((?!\s======).)*)\s======)$/gm ;

const rHeading = [, ];
for(var i=1; i<=6; i++) {
	if(ver('4.7.2'))
		rHeading.push(RegExp(`^${multiply('=', i)}([#]|)\\s(((?!${multiply('=', i)}).)*)\\s([#]|)${multiply('=', i)}$`, 'm'));
	else
		rHeading.push(RegExp(`^${multiply('=', i)}(\\s)(((?!${multiply('=', i)}).)*)(\\s)${multiply('=', i)}$`, 'm'));
}

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
				if(width && !width.replace(/\d+/, ''))
					width += 'px';
			}
			
			var clop, color = ((clop = (fulloptions.match(/&lt;table\s*color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/))) || ['', ''])[1];
			if(clop) {
				data = data.replace(tr, tr = tr.replace(clop[0], ''));
				trs += 'color: ' + color + '; ';
			}
			
			var bgop, bgcolor = ((bgop = (fulloptions.match(/&lt;table\s*bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/))) || ['', ''])[1];
			if(bgop) {
				data = data.replace(tr, tr = tr.replace(bgop[0], ''));
				trs += 'background-color: ' + bgcolor + '; ';
			}
			
			var brop, border = ((brop = (fulloptions.match(/&lt;table\s*bordercolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/))) || ['', ''])[1];
			if(brop) {
				data = data.replace(tr, tr = tr.replace(brop[0], ''));
				trs += 'border: 2px solid ' + border + '; ';
			}
			
			if(trs) ts = ' style="' + trs + '"';
			
			data = data.replace(tr, '<div class="wiki-table-wrap table-' + align + '"' + (width ? (' style="width: ' + width + ';"') : '') + '><table class=wiki-table' + ts + '><tbody>\n' + tr);
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
			data = data.replace(tr, tr = tr.replace(wiop[0], ''));
			trs += 'width: ' + width + '; ';
		}
		
		var clop, color = ((clop = (fulloptions.match(/&lt;table\s*color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/))) || ['', ''])[1];
		if(clop) {
			data = data.replace(tr, tr = tr.replace(clop[0], ''));
			trs += 'color: ' + color + '; ';
		}
		
		var bgop, bgcolor = ((bgop = (fulloptions.match(/&lt;table\s*bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/))) || ['', ''])[1];
		if(bgop) {
			data = data.replace(tr, tr = tr.replace(bgop[0], ''));
			trs += 'background-color: ' + bgcolor + '; ';
		}
		
		var brop, border = ((brop = (fulloptions.match(/&lt;table\s*bordercolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/))) || ['', ''])[1];
		if(brop) {
			data = data.replace(tr, tr = tr.replace(brop[0], ''));
			trs += 'border: 2px solid ' + border + '; ';
		}

		if(trs) ts = ' style="' + trs + '"';			
		
		data = data.replace(tr[0], '<div class="wiki-table-wrap table-' + align + '"><table class=wiki-table' + ts + '><caption>' + tr[2] + '</caption><tbody>\n' + ntr);
		datarows = data.split('\n');
	}
	
	// 셀 꾸미기
	for(let _tr of (data.match(/^<tr>(((?!<\/tr>).)*)<\/tr>$/gim) || [])) {
		var tr = _tr.match(/^<tr>(((?!<\/tr>).)*)<\/tr>$/im)[1], ntr = tr;
		var rowstyle = '';
		
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
			var bgcolor = (fulloptions.match(/&lt;((#([a-fA-F0-9]{3,6}))|([a-zA-Z]+))(([,]((#([a-fA-F0-9]{3,6}))|([a-zA-Z]+)))|)&gt;/) || ['', ''])[1];
			if(bgcolor) {
				tds += 'background-color: ' + bgcolor + '; ';
				ntd = ntd.replace(/&lt;((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/, '');
			}
			
			// 셀 배경색 2
			var bgcolor = (fulloptions.match(/&lt;bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/) || ['', ''])[1];
			if(bgcolor) {
				tds += 'background-color: ' + bgcolor + '; ';
				ntd = ntd.replace(/&lt;bgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/, '');
			}
			
			// 글자색
			var color = (fulloptions.match(/&lt;color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/) || ['', ''])[1];
			if(color) {
				tds += 'color: ' + color + '; ';
				ntd = ntd.replace(/&lt;color=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/, '');
			}
			
			// 줄 배경색
			var rowbgcolor = (fulloptions.match(/&lt;rowbgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/) || ['', ''])[1];
			if(rowbgcolor) {
				rowstyle += 'background-color: ' + rowbgcolor + '; ';
				ntd = ntd.replace(/&lt;rowbgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/, '');
			}
			
			// 줄 글자색
			var rowcolor = (fulloptions.match(/&lt;rowcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/) || ['', ''])[1];
			if(rowcolor) {
				rowstyle += 'color: ' + rowcolor + '; ';
				ntd = ntd.replace(/&lt;rowcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/, '');
			}
			
			// 열 배경색 (추후 구현)
			var colbgcolor = (fulloptions.match(/&lt;colbgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/) || ['', ''])[1];
			if(colbgcolor) {
				ntd = ntd.replace(/&lt;colbgcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/, '');
			}
			
			// 열 글자색 (추후 구현)
			var colcolor = (fulloptions.match(/&lt;colcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/) || ['', ''])[1];
			if(colcolor) {
				ntd = ntd.replace(/&lt;colcolor=((#[a-fA-F0-9]{3,6})|([a-zA-Z]+))(([,]((#[a-fA-F0-9]{3,6})|([a-zA-Z]+)))|)&gt;/, '');
			}
			
			if(tds) attr += ' style="' + tds + '"';
			if(cs)  attr += ' colspan=' + cs;
			if(rs)  attr += ' rowspan=' + rs;
			ntd = ntd.replace(/<td>/, '<td' + attr + '>');
			ntr = ntr.replace(td, ntd);
		}
		ntr = '<tr>' + ntr + '</tr>';
		if(rowstyle)
			ntr = ntr.replace('<tr>', '<tr style="' + rowstyle.replace(/\"/g, '&quot;') + '">');
		data = data.replace(_tr, ntr)
	}
	
	return data
		.replace(/^\n/, '')
		.replace(/\n$/, '')
		.replace(/<tbody>\n/g, '<tbody>')
		.replace(/\n<\/tbody>/g, '<tbody>')
		.replace(/<\/tr>\n/g, '</tr>')
		.replace(/\n<tr>/g, '</tr>')
		.replace(/<\/tbody><tbody><\/tbody>/g, '</tbody>');
}
	
function multiply(a, b) {
	if(typeof a == 'number') return a * b;
	var ret = '';
	for(let i=0; i<b; i++) ret += a;
	return ret;
}

function parseQuotes(data) {
	const rows = data.split(/\n/);
	const rl = rows.length;
	var inquote = 0;
	for(let i=0; i<rl; i++) {
		let row = rows[i];
		if(!row.startsWith('&gt;')) {
			if(inquote) {
				row = '</blockquotewikiquote>\n' + row;
				inquote = 0;
			}
			rows[i] = row;
			continue;
		}
		if(row.startsWith('&gt;') && !inquote) {
			row = row.replace(/^[&]gt;(\s*)/, '<blockquotewikiquote class=wiki-quote>\n');
			inquote = 1;
		} else {
			row = row.replace(/^[&]gt;(\s*)/, '');
			inquote = 1;
		}
		rows[i] = row;
	}
	if(inquote) rows.push('</blockquotewikiquote>');
	return rows.join('\n');
}

function parseList(data) {
	const rows = ('\n' + data + '\n').split(/\n/);
	const rl = rows.length;
	var inlist = 0;
	var inol1list = 0;
	var inolalist = 0;
	var inolAlist = 0;
	var inolilist = 0;
	var inolIlist = 0;
	for(let i=0; i<rl; i++) {
		let row = rows[i];
		if(!row.match(/^(\s+)[*]/) && !row.match(/^(\s+)1[.]/) && !row.match(/^(\s+)i[.]/) && !row.match(/^(\s+)I[.]/) && !row.match(/^(\s+)a[.]/) && !row.match(/^(\s+)A[.]/) && !row.startsWith(' ')) {
			if(inlist) {
				row = '</liwikilist></ulwikilist>\n' + row;
				inlist = 0;
			} else if(inol1list) {
				row = '</liwikilist></olwikilist>\n' + row;
				inol1list = 0;
			} else if(inolalist) {
				row = '</liwikilist></olwikilist>\n' + row;
				inolalist = 0;
			} else if(inolAlist) {
				row = '</liwikilist></olwikilist>\n' + row;
				inolAlist = 0;
			} else if(inolilist) {
				row = '</liwikilist></olwikilist>\n' + row;
				inolilist = 0;
			} else if(inolIlist) {
				row = '</liwikilist></olwikilist>\n' + row;
				inolIlist = 0;
			}
			rows[i] = row;
			continue;
		}
		if(row.match(/^(\s{2,})[*]/)) {
			rows[i] = row.replace(/^(\s{2,})[*]/, ' *');
			continue;
		}
		if(row.match(/^(\s{2,})1[.]/)) {
			rows[i] = row.replace(/^(\s{2,})1[.]/, ' 1.');
			continue;
		}
		if(row.match(/^(\s{2,})a[.]/)) {
			rows[i] = row.replace(/^(\s{2,})a[.]/, ' a.');
			continue;
		}
		if(row.match(/^(\s{2,})A[.]/)) {
			rows[i] = row.replace(/^(\s{2,})A[.]/, ' A.');
			continue;
		}
		if(row.match(/^(\s{2,})i[.]/)) {
			rows[i] = row.replace(/^(\s{2,})i[.]/, ' i.');
			continue;
		}
		if(row.match(/^(\s{2,})I[.]/)) {
			rows[i] = row.replace(/^(\s{2,})I[.]/, ' I.');
			continue;
		}
		if(row.startsWith(' *') && !inlist) {
			row = row.replace(/^\s[*](\s*)/, '<ulwikilist class=wiki-list>\n<liwikilist>\n');
			inlist = 1;
		} else if(row.startsWith(' *')) {
			row = row.replace(/^\s/, '');
			row = row.replace(/^[*](\s*)/, '</liwikilist><liwikilist>\n');
			inlist = 1;
		}
		if(row.startsWith(' 1.') && !inol1list) {
			row = row.replace(/^\s1[.](\s*)/, '<olwikilist class=wiki-list>\n<liwikilist>\n');
			inol1list = 1;
		} else if(row.startsWith(' 1.')) {
			row = row.replace(/^\s/, '');
			row = row.replace(/^1[.](\s*)/, '</liwikilist><liwikilist>\n');
			inol1list = 1;
		}
		if(row.startsWith(' a.') && !inolalist) {
			row = row.replace(/^\sa[.](\s*)/, '<olwikilist class="wiki-list wiki-list-alpha">\n<liwikilist>\n');
			inolalist = 1;
		} else if(row.startsWith(' a.')) {
			row = row.replace(/^\s/, '');
			row = row.replace(/^a[.](\s*)/, '</liwikilist><liwikilist>\n');
			inolalist = 1;
		}
		if(row.startsWith(' A.') && !inolAlist) {
			row = row.replace(/^\sa[.](\s*)/, '<olwikilist class="wiki-list wiki-list-upper-alpha">\n<liwikilist>\n');
			inolAlist = 1;
		} else if(row.startsWith(' A.')) {
			row = row.replace(/^\s/, '');
			row = row.replace(/^A[.](\s*)/, '</liwikilist><liwikilist>\n');
			inolAlist = 1;
		}
		if(row.startsWith(' i.') && !inolAlist) {
			row = row.replace(/^\si[.](\s*)/, '<olwikilist class="wiki-list wiki-list-roman">\n<liwikilist>\n');
			inolilist = 1;
		} else if(row.startsWith(' A.')) {
			row = row.replace(/^\s/, '');
			row = row.replace(/^i[.](\s*)/, '</liwikilist><liwikilist>\n');
			inolilist = 1;
		}
		if(row.startsWith(' I.') && !inolAlist) {
			row = row.replace(/^\sI[.](\s*)/, '<olwikilist class="wiki-list wiki-list-upper-roman">\n<liwikilist>\n');
			inolIlist = 1;
		} else if(row.startsWith(' A.')) {
			row = row.replace(/^\s/, '');
			row = row.replace(/^I[.](\s*)/, '</liwikilist><liwikilist>\n');
			inolIlist = 1;
		}
		rows[i] = row;
	}
	rows.splice(0, 1);
	rows.pop();
	if(inlist) rows.push('</liwikilist>\n</ulwikilist>');
	if(inol1list) rows.push('</liwikilist>\n</olwikilist>');
	if(inolalist) rows.push('</liwikilist>\n</olwikilist>');
	if(inolAlist) rows.push('</liwikilist>\n</olwikilist>');
	if(inolilist) rows.push('</liwikilist>\n</olwikilist>');
	if(inolIlist) rows.push('</liwikilist>\n</olwikilist>');
	return rows.join('\n');
}

function parseIndent(data) {
	const rows = data.split(/\n/);
	const rl = rows.length;
	var inindent = 0;
	for(let i=0; i<rl; i++) {
		let row = rows[i];
		if(!row.startsWith(' ') || row.replace(/^\s/, '').startsWith('*')) {
			if(inindent) {
				row = '</divwikiindent>\n' + row;
				inindent = 0;
			}
			rows[i] = row;
			continue;
		}
		if(row.startsWith(' ') && !inindent) {
			row = row.replace(/^\s/, '<divwikiindent class=wiki-indent>\n');
			inindent = 1;
		} else {
			row = row.replace(/^\s/, '');
			inindent = 1;
		}
		rows[i] = row;
	}
	if(inindent) rows.push('</divwikiindent>');
	return rows.join('\n');
}

module.exports = async function markdown(req, content, discussion = 0, title = '', flags = '', root = '') {
	// markdown 아니고 namumark
	flags = flags.split(' ');
	
	var footnotes = new Stack();
	var blocks    = new Stack();
	var fndisp    = {};
	var nwblocks  = {};
	
	var fnnum  = 1;
	var fnhtml = '';
	var cates  = '';
	var data   = content;
	var doc    = processTitle(title);
	
	root = root || title;
	
	data += '\r\n';
	
	data = html.escape(data);
	const xref = flags.includes('backlinkinit');
	
	// 역링크 초기화
	if(xref)
		await curs.execute("delete from backlink where title = ? and namespace = ?", [doc.title, doc.namespace]);
	const xrefl = [];
	
	if(!data.includes('\n') && data.includes('\r')) data = data.replace(/\r/g, '\n');
	if(data.includes('\n') && data.includes('\r')) data = data.replace(/\r\n/g, '\n');
	
	// 한 글자 리터럴
	for(let esc of (data.match(/(?:\\)(.)/g) || [])) {
		const match = data.match(/(?:\\)(.)/);
		data = data.replace(esc, '<spannw>' + match[1] + '</spannw>');
	}
	
	var dq, bopen, bclose, segments;
	dq     = new Deque();
	bopen  = new Deque();
	bclose = new Queue();
	var lopen = false;  // 리터럴 블록 처리 중...
	var line = 1;
	const cssProperties = ['background', 'background-attachment', 'background-clip', 'background-color', 'background-image', 'background-origin', 'background-position', 'background-repeat', 'background-size', 'border', 'border-bottom', 'border-bottom-color', 'border-bottom-left-radius', 'border-bottom-right-radius', 'border-bottom-style', 'border-bottom-width', 'border-collapse', 'border-color', 'border-image', 'border-image-outset', 'border-image-repeat', 'border-image-slice', 'border-image-source', 'border-image-width', 'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-radius', 'border-right', 'border-right-color', 'border-right-style', 'border-right-width', 'border-spacing', 'border-style', 'border-top', 'border-top-color', 'border-top-left-radius', 'border-top-right-radius', 'border-top-style', 'border-top-width', 'border-width', 'box-shadow', 'box-sizing', 'caption-side', 'clear', 'clip', 'color', 'column-count', 'column-fill', 'column-gap', 'column-rule', 'column-rule-color', 'column-rule-style', 'column-rule-width', 'column-span', 'column-width', 'columns', 'content', 'display', 'float', 'font', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'height', 'justify-content', 'left', 'letter-spacing', 'line-height', 'list-style', 'list-style-image', 'list-style-position', 'list-style-type', 'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'max-height', 'max-width', 'min-height', 'min-width', 'opacity', 'order', 'outline', 'outline-color', 'outline-offset', 'outline-style', 'outline-width', 'overflow', 'overflow-x', 'overflow-y', 'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'quotes', 'resize', 'tab-size', 'table-layout', 'text-align', 'text-align-last', 'text-decoration', 'text-decoration-color', 'text-decoration-line', 'text-decoration-style', 'text-indent', 'text-justify', 'text-overflow', 'text-shadow', 'text-transform', 'vertical-align', 'visibility', 'white-space', 'width', 'word-break', 'word-spacing', 'word-wrap'];
	function filterCSS(style) {
		var ret = '';
		const document = jsdom('');
		const el = document.createElement('div');
		el.setAttribute('style', style);
		for(var idx of Object.keys(el.style)) {
			var prop  = el.style[idx];
			var value = el.style[prop];
			if(typeof prop != 'string' || typeof value != 'string') continue;
			if(cssProperties.includes(prop.toLowerCase()))
				ret += `${prop}: ${value}; `;
		}
		return ret;
	}
	for(var pos=0; ; pos++) {
		if(!data[pos]) break;
		if(data[pos] == '\n') { line++; continue; }
		if(data.substr(pos, 3) == '{{{') {
			if(data.substr(pos + 3, 9) == '#!folding') {
				const tend = data.indexOf('\n', pos + 12);
				if(tend == -1) continue;
				const raw = data.slice(pos + 12, tend);
				const title = raw.trim().replace(/<spannw>(.)<\/spannw>/g, '\\$1').split('').map(chr => '<spannw>' + chr + '</spannw>').join('') || 'More';
				bopen.pushBack({ index: pos, replace: '<dl class=wiki-folding><dt>' + title + '</dt><dd>', length: 12 + raw.length + 1 });
				dq.pushBack({ close: '</dd></dl>', bopenIndex: bopen.size() - 1 });
			} else if(data.substr(pos + 3, 6) == '#!wiki') {
				const tend = data.indexOf('\n', pos + 9);
				if(tend == -1) continue;
				const raw = data.slice(pos + 9, tend);
				const style = (raw.match(/style=[&]quot;(((?![&]quot;).)*)[&]quot;/) || ['', '', ''])[1].replace(/&amp;quot;/g, '&quot;');
				bopen.pushBack({ index: pos, replace: '<div style="' + filterCSS(style) + '">', length: 9 + raw.length + 1 });
				dq.pushBack({ close: '</div>', bopenIndex: bopen.size() - 1 });
			} else if(data.substr(pos + 3, 6) == '#!html' && !discussion) {
				bopen.pushBack({ index: pos, replace: '<nowikiblock><rawhtml>', length: 9 });
				dq.pushBack({ close: '</rawhtml></nowikiblock>', bopenIndex: bopen.size() - 1 });
			} else if(data.substr(pos + 3, 3).match(/^([+]|[-])[1-5]\s$/i)) {
				var size = data.substr(pos + 3, 2);
				bopen.pushBack({ index: pos, replace: '<span class="wiki-size size-' + (size[0] == '+' ? 'up' : 'down') + '-' + size[1] + '">', length: 6 });
				dq.pushBack({ close: '</span>', bopenIndex: bopen.size() - 1 });
			} else {
				var isColor = false;
				var color = null;
				var match = null;
				var ph = 0;
				if(match = (data.substr(pos + 3, 8).match(/^[#]([a-fA-F0-9]{3,6})\s/i) || data.substr(pos + 3, 16).match(/^[#]([a-fA-F0-9]{3,6})([,][#]([a-zA-Z0-9]+))\s/i)))
					isColor = true, color = ('#' + match[1]), ph = (match[2] ? match[2].length : 0);
				for(var cc of cssColorMatches)
					if(data.substr(pos + 3, cc.length).toLowerCase() == cc)
						isColor = true, color = cc.slice(1, cc.length - 1);
					else if(match = data.substr(pos + 3, 64).match(RegExp(cc.replace('#', '[#]').replace(' ', ',#') + '([a-zA-Z0-9]+)\\s', 'i')))
						isColor = true, color = cc.slice(1, cc.length - 1), ph = match[1].length + 3;
				if(isColor) {
					bopen.pushBack({ index: pos, replace: '<font color=' + color + '>', length: 3 + (color[0] == '#' ? 0 : 1) + color.length + ph + 1 });
					dq.pushBack({ close: '</font>', bopenIndex: bopen.size() - 1 });
				} else {  // 리터럴
					bopen.pushBack({ index: pos, replace: '<nowikiblock><pre>', length: 3, line });
					dq.pushBack({ close: '</pre></nowikiblock>', line, bopenIndex: bopen.size() - 1 });
				}
			}
			pos += bopen.back().length - 1;
		} else if(data.substr(pos, 3) == '}}}' && !dq.empty()) {
			bclose.push({ index: pos, replace: dq.back().close, length: 3, line: dq.back().line });
			dq.popBack();
			pos += 2;
		}
	}
	while(!dq.empty()) bopen._internalArray[dq.popFront().bopenIndex] = null;  // 유효하지 않은 블록열기
	bopen._internalArray = bopen._internalArray.filter(item => item !== null);
	segments = [];
	line = 1;
	var openline = 1;
	var soi = -1;
	var lnest = 0;
	for(var pos=0; ; pos++) {
		var op, cl;
		if(!data[pos]) break;
		if(data[pos] == '\n') { line++; segments.push('\n'); continue; }
		if(!bopen.empty() && pos == (op = bopen.front()).index && op.replace !== null) {
			if(lopen) {
				lnest++;
				bopen.popFront();
				segments.push(data[pos]);
				continue;
			}
			if(op.replace.startsWith('<nowikiblock>'))
				lopen = true;
			soi = segments.push(op.replace) - 1;
			pos += op.length - 1;
			bopen.popFront();
			openline = line;
		} else if(!bclose.empty() && pos == (cl = bclose.front()).index) {
			if(lnest) {
				lnest--;
				bclose.pop();
				segments.push(data[pos]);
				continue;
			}
			if(openline == line && soi >= 0 && cl.replace == '</pre></nowikiblock>') {
				segments[soi] = '<nowikiblock><code>';
				cl.replace = '</code></nowikiblock>';
			}
			segments.push(cl.replace);
			pos += cl.length - 1;
			bclose.pop();
			lopen = false;
		} else {
			segments.push(data[pos]);
		}
	}
	data = segments.join('');
	
	// 리터럴 (제대로 된 방법은 아니겠지만...)
	var document = jsdom(data.replace(/\n/g, '<br>'));
	for(var item of document.querySelectorAll('nowikiblock')) {
		const key = rndval('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+=/', 2048);
		nwblocks[key] = item.innerHTML;
		item.outerHTML = key;
	}
	data = document.querySelector('body').innerHTML.replace(/<br>/g, '\n');
	
	// 새각주
	var rdata = {}, tdata = {}, tdata2 = {};
	function parseFootnotes() {
		var dq = new Deque(), bopen = new Deque(), close = new Queue;
		var segments;
		var ret = '';
		var repeating = false;
		for(var row of data.split('\n')) {
			dq.clear();
			bopen.clear();
			bclose.clear();
			for(var pos=0; ; pos++) {
				if(!row[pos]) break;
				if(row[pos] == '[') {
					if(row[pos + 1] != '*') {
						dq.pushBack({ close: null });
						continue;
					}
					var tend = row.indexOf(' ', pos);
					var tend2 = row.indexOf(']', pos);
					if(tend == -1 && tend2 == -1) continue;
					if(tend2 < tend) repeating = true;
					const raw = row.slice(pos + 2, tend < tend2 ? tend : tend2);
					const title = raw.replace(/<spannw>(.)<\/spannw>/g, '\\$1').split('').map(chr => '<spannw>' + chr + '</spannw>').join('');
					if(repeating) bopen.pushBack({ index: pos, replace: '<footnote title="' + title + '" repeating>', length: 2 + raw.length });
					else bopen.pushBack({ index: pos, replace: '<footnote title="' + title + '">', length: 2 + raw.length + 1 });
					dq.pushBack({ close: '</footnote>', bopenIndex: bopen.size() - 1 });
					pos += raw.length + 1;
				} else if(row[pos] == ']' && row.slice(pos - '<spannw>'.length, pos + '</spannw>'.length) != '<spannw>]</span>' && !dq.empty()) {
					if(dq.back().close !== null)
						bclose.push({ index: pos, replace: dq.back().close, length: 1 });
					dq.popBack();
				}
			}
			while(!dq.empty()) bopen._internalArray[dq.popFront().bopenIndex] = null;
			bopen._internalArray = bopen._internalArray.filter(item => item !== null);
			segments = [];
			for(var pos=0; ; pos++) {
				var op, cl;
				if(!row[pos]) break;
				if(!bopen.empty() && pos == (op = bopen.front()).index) {
					segments.push(op.replace);
					pos += op.length - 1;
					bopen.popFront();
				} else if(!bclose.empty() && pos == (cl = bclose.front()).index) {
					segments.push(cl.replace);
					pos += cl.length - 1;
					bclose.pop();
				} else {
					segments.push(row[pos]);
				}
			}
			ret += segments.join('') + '\n';
		}
		ret = ret.replace(/\n$/, '');
		
		var qfn = new Queue();
		var qa = new Queue();
		var document = jsdom(ret.replace(/\n/g, '<br>'));
		var id = 1;
		var fn = [];
		var rpid = {};
		var rpnid = {};
		rdata = {}, tdata = {}, tdata2 = {};
		var fnhtml = '';
		for(var item of document.querySelectorAll('footnote')) {
			var title = item.getAttribute('title');
			if(title) {
				rpid[title] = rpid[title] || 0;
				if(!rpnid[title]) rpnid[title] = id;
				item.setAttribute('fn-id', rpnid[title] + '.' + (++rpid[title]));
			} else item.setAttribute('fn-id', id);
			item.setAttribute('fn-numeric-id', id);
			id++;
		}
		for(var item of document.querySelectorAll('footnote')) {
			var tooltip, rendered;
			var nid = item.getAttribute('fn-numeric-id');
			if(tdata[nid] === undefined) {	
				var elp = document.createElement('span');
				var el = document.createElement('footnote');
				elp.appendChild(el);
				var nfid = random.choice('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 128);
				el.setAttribute('id', 'nf' + nfid);
				el.innerHTML = item.innerHTML;
				elp.querySelectorAll('#nf' + nfid + ' > footnote').forEach(item => item.remove());
				el.removeAttribute('id');
				tdata[nid] = el.textContent;
			}
			if(tdata2[item.getAttribute('title')] === undefined)
				tdata2[item.getAttribute('title')] = tdata[nid];
			if(rdata[nid] === undefined) {
				var elp = document.createElement('span');
				var el = document.createElement('footnote');
				elp.appendChild(el);
				var nfid = random.choice('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 128);
				el.setAttribute('id', 'nf' + nfid);
				el.innerHTML = item.innerHTML;
				elp.querySelectorAll('#nf' + nfid + ' > footnote').forEach(item => {
					var dispid = item.getAttribute('title') || item.getAttribute('fn-id');
					item.outerHTML = '<a data-numeric-id="' + item.getAttribute('fn-numeric-id') + '" data-title="' + dispid + '" data-repeating="' + item.getAttribute('repeating') + '" class=wiki-fn-content title="" href="#fn-' + dispid + '"><span id=rfn-' + item.getAttribute('fn-numeric-id') + '>[' + dispid + ']</span></a>';
				});
				el.removeAttribute('id');
				rdata[nid] = el.innerHTML;
			}
		}
		for(var item of document.querySelectorAll('footnote')) {
			var nid = item.getAttribute('fn-numeric-id');
			var dispid = item.getAttribute('title') || item.getAttribute('fn-id');
			var idx = fn.findIndex(item => item.index == dispid);
			if(idx == -1) idx = fn.push({ index: dispid, footnote: { rendered: rdata[nid], title: dispid, id: [] } }) - 1;
			fn[idx].footnote.id.push({
				rfn: item.getAttribute('fn-numeric-id'),
				display: item.getAttribute('fn-id'),
			});
		}
		for(var _fn of fn) {
			var idx = _fn.index
			const item = _fn.footnote;
			if(item.id.length > 1) {
				fnhtml += `<span class=footnote-list><span id="fn-${idx}" class=target></span>[${item.title}] `;
				for(var id of item.id)
					fnhtml += `<a href=#rfn-${id.rfn}><sup>${id.display}</sup></a> `;
				fnhtml += `${item.rendered || ''}</span>`;
			}
			else
				fnhtml += `<span class=footnote-list><span id="fn-${idx}" class=target></span><a href=#rfn-${item.id[0].rfn}>[${item.title}]</a> ${item.rendered || ''}</span>`;
		}
		for(var item of document.querySelectorAll('body > footnote')) {
			var dispid = item.getAttribute('title') || item.getAttribute('fn-id');
			item.outerHTML = '<a data-numeric-id="' + item.getAttribute('fn-numeric-id') + '" data-title="' + dispid + '" data-repeating="' + item.getAttribute('repeating') + '" class=wiki-fn-content title="" href="#fn-' + dispid + '"><span id=rfn-' + item.getAttribute('fn-numeric-id') + '>[' + dispid + ']</span></a>';
		}
		ret = document.body.innerHTML.replace(/<br>/g, '\n');
		if(fnhtml) ret += '<div class=wiki-macro-footnote>' + fnhtml + '</div>';
		return ret;
	}
	data = parseFootnotes(data);
	
	// 인용문
	do {
		data = parseQuotes(data);
	} while(data.match(/^[&]gt;/gim));
	
	// 수평줄
	data = data.replace(/^[-]{4,9}$/gim, '<hr />');
	data = data.replace(/(\n{0,1})<hr \/>(\n{0,1})/g, '<hr />');

	// 인용문 마지막 처리
	data = data.replace(/<blockquotewikiquote\sclass[=]wiki[-]quote>\n/g, '<blockquote class=wiki-quote>');
	data = data.replace(/\n<\/blockquotewikiquote>/g, '</blockquote>');
	
	// 목록
	do {
		data = parseList(data);
	} while(data.match(/^\s[*]/gim));
	data = data.replace(/<ulwikilist\sclass[=]wiki[-]list>\n/g, '<ul class=wiki-list>');
	data = data.replace(/\n<\/ulwikilist>/g, '</ul>');
	data = data.replace(/<liwikilist>\n/g, '<li>');
	data = data.replace(/\n<\/liwikilist>/g, '</li>');
	data = data.replace(/<\/liwikilist>\n<\/ulwikilist>/g, '</ul>');
	data = data.replace(/<ulwikilist\sclass[=]wiki[-]list>/g, '<ul class=wiki-list>');
	data = data.replace(/<\/ulwikilist>/g, '</ul>');
	data = data.replace(/<liwikilist>/g, '<li>');
	data = data.replace(/<\/liwikilist>/g, '</li>');
	
	data = data.replace(/<olwikilist\sclass[=]wiki[-]list>/g, '<ol class=wiki-list>');
	data = data.replace(/<olwikilist\sclass[=]wiki[-]list>\n/g, '<ol class=wiki-list>');
	data = data.replace(/<olwikilist\sclass[=]\"wiki[-]list\swiki[-]list[-]alpha\">/g, '<ol class="wiki-list wiki-list-alpha">');
	data = data.replace(/<olwikilist\sclass[=]\"wiki[-]list\swiki[-]list[-]alpha\">\n/g, '<ol class="wiki-list wiki-list-alpha">');
	data = data.replace(/<olwikilist\sclass[=]\"wiki[-]list\swiki[-]list[-]upper[-]alpha\">/g, '<ol class="wiki-list wiki-list-upper-alpha">');
	data = data.replace(/<olwikilist\sclass[=]\"wiki[-]list\swiki[-]list[-]upper[-]alpha\">\n/g, '<ol class="wiki-list wiki-list-upper-alpha">');
	data = data.replace(/<olwikilist\sclass[=]\"wiki[-]list\swiki[-]list[-]roman\">/g, '<ol class="wiki-list wiki-list-roman">');
	data = data.replace(/<olwikilist\sclass[=]\"wiki[-]list\swiki[-]list[-]roman\">\n/g, '<ol class="wiki-list wiki-list-roman">');
	data = data.replace(/<olwikilist\sclass[=]\"wiki[-]list\swiki[-]list[-]upper[-]roman\">/g, '<ol class="wiki-list wiki-list-upper-roman">');
	data = data.replace(/<olwikilist\sclass[=]\"wiki[-]list\swiki[-]list[-]upper[-]roman\">\n/g, '<ol class="wiki-list wiki-list-upper-roman">');
	data = data.replace(/<\/olwikilist>/g, '</ol>');
	
	// 들여쓰기
	do {
		data = parseIndent(data);
	} while((data.match(/^(\s+)/gim) || []).filter(item => item.replace(/\n/g, '') && item).length);
	data = data.replace(/<divwikiindent\sclass[=]wiki[-]indent>\n/g, '<div class=wiki-indent>');
	data = data.replace(/\n<\/divwikiindent>/g, '</div>');
	
	// 링크
	for(let link of (data.match(/\[\[(((?!\]\]).)+)\]\]/g) || [])) {
		var _dest = link.match(/\[\[(((?!\]\]).)+)\]\]/)[1];
		var dest, disp;
		if(_dest.includes('|')) {
			dest = _dest.split('|')[0];
			disp = _dest.split('|')[1];
		} else dest = disp = _dest;
		
		const external = dest.startsWith('http://') || dest.startsWith('https://') || dest.startsWith('ftp://');
		
		const dd = dest.split('#');
		if(!external) {
			if(!dd[0] && dd[1]) dd[0] = title;
			if(dest == disp) disp = dd[0];
			dest = dd[0];
		}
		
		var ddata = await curs.execute("select content from documents where title = ? and namespace = ?", [processTitle(dest.replace(/^([:]|\s)((분류|파일)[:])/, '$2')).title, processTitle(dest.replace(/^([:]|\s)((분류|파일)[:])/, '$2')).namespace]);
		const notexist = !ddata.length ? ' not-exist' : '';
		
		if(dest.startsWith('분류:') && !discussion) {  // 분류
			cates += `<li><a href="/w/${encodeURIComponent(dest)}" class="wiki-link-internal${notexist}">${html.escape(dest.replace('분류:', ''))}</a></li>`;
			if(xref) {
				curs.execute("insert into backlink (title, namespace, link, linkns, type) values (?, ?, ?, ?, 'category')", [doc.title, doc.namespace, dest.replace('분류:', ''), '분류']);
			}
			data = data.replace(link, '');
			continue;
		} 
		if(dest.startsWith('파일:') && !discussion && !notexist) {  // 그림
			var linkdoc = processTitle(dest);
			var filedata = await curs.execute("select url, size, width, height from files where title = ? and namespace = ?", [linkdoc.title, linkdoc.namespace]);
			if(filedata.length) {
				filedata = filedata[0];
				let align = 'normal', width, height, bgcolor, borderRadius, rendering;
				if(disp != dest) {
					var args = disp.replace(/\s/g, '').replace(/\'/g, '').replace(/\"/g, '').replace(/[;]/g, '').split('&');
					for(var ia of args) {
						ia = ia.toLowerCase();
						if(ia.split('=')[0] == 'width')
							width = ia.replace(ia.split('=')[0] + '=', '');
						else if(ia.split('=')[0] == 'height')
							height = ia.replace(ia.split('=')[0] + '=', '');
						else if(ia.split('=')[0] == 'align')
							align = ia.replace(ia.split('=')[0] + '=', '');
						else if(ia.split('=')[0] == 'bgcolor')
							bgcolor = ia.replace(ia.split('=')[0] + '=', '');
						else if(ia.split('=')[0] == 'border-radius')
							borderRadius = ia.replace(ia.split('=')[0] + '=', '');
						else if(ia.split('=')[0] == 'rendering')
							rendering = ia.replace(ia.split('=')[0] + '=', '');
					}
					if(width && !width.replace(/\d+/, ''))
						width += 'px';
					if(height && !height.replace(/\d+/, ''))
						height += 'px';
				}
				if(align != 'normal' && align != 'top' && align != 'right' && align != 'center' && align != 'top' && align != 'middle' && align != 'bottom')
					align = 'normal';
				if(rendering != 'pixelated')
					rendering = undefined;
				data = data.replace(link, `
					<a class=wiki-link-internal href="/w/${encodeURIComponent(dest)}" title="${dest}">
						<span class=wiki-image-align-${align} style="${width ? `width:${width};` : ''}${height ? `height:${height};` : ''}${bgcolor ? `background-color:${bgcolor};` : ''}${borderRadius ? `border-radius:${borderRadius};` : ''}${rendering ? `image-rendering:${rendering};` : ''}">
							<span class=wiki-image-wrapper style="height: 100%;">
								<img class=wiki-image-space height="100%" src="data:image/svg+xml;base64,${Buffer.from(`<svg width="${filedata.width}" height="${filedata.height}" xmlns="http://www.w3.org/2000/svg"></svg>`).toString('base64')}" style="max-width: 100% !important;" />
								<img class="wiki-image wiki-image-loading" height="100%" data-filesize=${filedata.size || 0} data-src="${filedata.url}" alt="${html.escape(dest)}" />
								<noscript>
									<img class=wiki-image height="100%" src="${filedata.url}" alt="${html.escape(dest)}" />
								</noscript>
							</span>
						</span>
					</a>
				`.replace(/\n/g, '').replace(/\t/g, ''));
				if(xref) {
					curs.execute("insert into backlink (title, namespace, link, linkns, type, exist) values (?, ?, ?, ?, 'file', ?)", [doc.title, doc.namespace, linkdoc.title, linkdoc.namespace, '1']);
				}
				continue;
			}
		}
		
		if(dest == disp)
			disp = disp.replace(/^([:]|\s)((분류|파일)[:])/, '$2');
		dest = dest.replace(/^([:]|\s)((분류|파일)[:])/, '$2');
		
		const sl = dest == root ? ' wiki-self-link' : '';
		data = data.replace(link, '<a ' + (external ? 'target=_blank ' : '') + 'class="wiki-link-' + (external ? 'external' : 'internal') + '' + sl + notexist + '" href="' + (external ? '' : '/w/') + '' + (external ? (x => x) : (x => encodeURIComponent(x.replace(/[&]amp[;]/g, '&').replace(/[&]lt[;]/g, '<').replace(/[&]gt[;]/g, '>').replace(/[&]quot[;]/g, '"'))))(dest) + (!external && dd[1] ? html.escape('#' + dd[1]) : '') + '">' + disp + '</a>');
		
		// 역링크
		if(xref && !external && !sl) {
			var linkdoc = processTitle(dest);
			if(!xrefl.includes(linkdoc.title + '\n' + linkdoc.namespace)) {
				xrefl.push(linkdoc.title + '\n' + linkdoc.namespace);
				curs.execute("insert into backlink (title, namespace, link, linkns, type, exist) values (?, ?, ?, ?, 'link', ?)", [doc.title, doc.namespace, linkdoc.title, linkdoc.namespace, notexist ? '0' : '1']);
			}
		}
	}
	
	data = data.replace(/^[#][#](.*)$/gm, '');
	
	// 토론 앵커
	var reg;
	var anc = /(\s|^)[#](\d+)(\s|$)/g;
	if(discussion) while(reg = anc.exec(data)) {
		data = data.replace(reg[0], reg[1] + '<a class=wiki-self-link href="#' + reg[2] + '">#' + reg[2] + '</a>' + reg[3]);
		anc.lastIndex--;
	}
	
	// 문단
	data = '<div>\r' + data;
	var maxszz = 2;
	var headnum = [, 0, 0, 0, 0, 0, 0];
	var tochtml = '<div class=wiki-macro-toc id=toc>';
	var cnum = 2;
	var sec = 1;
	for(let i=6; i; i--)
		if(data.match(rHeading[i]))
			maxszz = i;
	for(let heading of (data.match(rHeadings) || [])) {
		const hr = {};
		for(let i=1; i<=6; i++) {
			hr[i] = heading.match(rHeading[i]);
		} for(let i=6; i; i--) if(hr[i]) {
			if(i < cnum) for(let j=i+1; j<=6; j++) headnum[j] = 0;
			cnum = i;
			const title = hr[i][2];
			const folded = hr[i][1] == '#';
			var snum = '';
			for(let j=i; j; j--) if(maxszz == j) {
				for(let k=j; k<i; k++)
					snum += headnum[k] + '.';
				snum += ++headnum[i];
				break;
			}
			var edlnk = '';
			if(!discussion)
				edlnk = `<span class=wiki-edit-section><a href="/edit/${encodeURIComponent(doc + '')}?section=${sec++}" rel=nofollow>[편집]</a></span>`;
			data = data.replace(heading, '</div><h' + i + ' class=wiki-heading><a href="#toc" id="s-' + snum + '">' + snum + '.</a> ' + title + edlnk + '</h' + i + '><div class="wiki-heading-content' + (folded ? ' namufix-folded-heading' : '') + '"' + (folded ? ' style="display: none;"' : '') + '>');
			var mt = i;
			tochtml += multiply('<div class=toc-indent>', mt - maxszz + 1) + '<span class=toc-item><a href="#s-' + snum + '">' + snum + '</a>. ' + title + '</span>' + multiply('</div>', mt - maxszz + 1);
			break;
		}
	}
	tochtml += '</div>';
	data += '</div>';
	data = data.replace(/<div class=wiki[-]heading[-]content>\n/g, '<div class=wiki-heading-content>');
	
	// 글자 꾸미기
	if(verrev('4.7.5')) data = data.replace(/['][']['][']['](((?![']['][']['][']).)+)[']['][']['][']/g, '<strong><i>$1</i></strong>');
	data = data.replace(/['][']['](((?![']['][']).)+)[']['][']/g, '<strong>$1</strong>');
	data = data.replace(/[']['](((?!['][']).)+)['][']/g, '<i>$1</i>');
	data = data.replace(/~~(((?!~~).)+)~~/g, '<del>$1</del>');
	data = data.replace(/--(((?!--).)+)--/g, '<del>$1</del>');
	data = data.replace(/__(((?!__).)+)__/g, '<u>$1</u>');
	data = data.replace(/[,][,](((?![,][,]).)+)[,][,]/g, '<sub>$1</sub>');
	data = data.replace(/\^\^(((?!\^\^).)+)\^\^/g, '<sup>$1</sup>');
	
	// 글상자
	if(verrev('4.7.4'))
		data = data.replace(/{{[|](((?![|]}})(.|\n))+)[|]}}/g, '<div class=wiki-textbox>$1</div>');
	
	// 매크로
	data = data.replace(/\[br\]/gi, '<br />');
	data = data.replace(/\[br\((((?!\)).)*)\)\]/gi, '<br />');
	data = data.replace(/\[clearfix\]/gi, '<div style="clear: both;"></div>');
	data = data.replace(/\[clearfix\((((?!\)).)*)\)\]/gi, '<div style="clear: both;"></div>');
	data = data.replace(/\[(date|datetime)\]/gi, generateTime(toDate(getTime()), timeFormat + 'O'));
	data = data.replace(/\[(date|datetime)\((((?!\)).)*)\)\]/gi, generateTime(toDate(getTime()), timeFormat + 'O'));
	data = data.replace(/\[(tableofcontents|목차)\]/gi, tochtml);
	data = data.replace(/\[(tableofcontents|목차)\((((?!\)).)*)\)\]/gi, tochtml);
	
	var pgcnt = {};
	var pgcnta = 0;
	for(var ns of fetchNamespaces()) {
		const nsc = await curs.execute("select count(title) from documents where namespace = ?", [ns]);
		pgcnt[ns] = nsc[0]['count(title)'];
		pgcnta += pgcnt[ns];
	}
	data = data.replace(/\[pagecount\]/gi, pgcnta);
	for(let fpcm of (data.match(/\[pagecount\((((?!\)).)*)\)\]/gi) || [])) {
		let pcm = fpcm.match(/\[pagecount\((((?!\)).)*)\)\]/i);
		data = data.replace(fpcm, pgcnt[pcm[1]] === undefined ? pgcnta : pgcnt[pcm[1]]);
	}
	
	// 동화상
	for(let finc of (data.match(/\[(youtube|kakaotv|nicovideo|vimeo|navertv)[(](((?![)])(.|<spannw>[)]<\/spannw>))+)[)]\]/gi) || [])) {
		let inc = finc.match(/\[(youtube|kakaotv|nicovideo|vimeo|navertv)[(](((?!([)]))(.|<spannw>[)]<\/spannw>))+)[)]\]/i);
		let vid = inc[1].replace(/<spannw>[)]<\/spannw>/, ')');
		let id = inc[2].replace(/<spannw>[)]<\/spannw>/, ')').split(',')[0].replace(/^(\s+)/, '').replace(/(\s+)$/, '').replace(/[&]quot;/g, '"').replace(/[&]amp;/g, '&').replace(/[&]lt;/g, '<').replace(/[&]gt;/g, '>');
		let paramsa = inc[2].replace(/<spannw>[)]<\/spannw>/, ')').split(',').slice(1, 99999);
		let params = {};
		for(let item of paramsa) {
			let pp = item.split('=')[0].replace(/^(\s+)/, '').replace(/(\s+)$/, '').toLowerCase();
			params[pp] = item.replace(pp + '=', '').replace(/^(\s+)/, '').replace(/(\s+)$/, '');
		}
		let d;
		switch(vid.toLowerCase()) {
		case 'youtube': {
			d = `<iframe allowfullscreen src="//www.youtube.com/embed/${encodeURIComponent(id)}${params.start ? `?start=${encodeURIComponent(params.start)}` : ''}${params.end ? ((params.start ? '&' : '?') + 'end=' + encodeURIComponent(params.end)) : ''}" loading=lazy width="${params.width || 640}" height="${params.height || 360}" frameborder=0></iframe>`;
		}
		break; case 'kakaotv': {
			d = `<iframe allowfullscreen src="//tv.kakao.com/embed/player/cliplink/${encodeURIComponent(id)}" loading=lazy width="${params.width || 640}" height="${params.height || 360}" frameborder=0></iframe>`;
		}
		break; case 'nicovideo': {
			d = `<iframe allowfullscreen src="//embed.nicovideo.jp/watch/sm${encodeURIComponent(id)}" loading=lazy width="${params.width || 720}" height="${params.height || 480}" frameborder=0></iframe>`;
		}
		break; case 'vimeo': {
			d = `<iframe allowfullscreen src="//player.vimeo.com/video/${encodeURIComponent(id)}" loading=lazy width="${params.width || 640}" height="${params.height || 360}" frameborder=0></iframe>`;
		}
		break; case 'navertv': {
			d = `<iframe allowfullscreen src="//tv.naver.com/embed/${encodeURIComponent(id)}" loading=lazy width="${params.width || 640}" height="${params.height || 360}" frameborder=0></iframe>`;
		}
		}
		
		data = data.replace(finc, d);
	}
	
	// 틀 인클루드
	if(!flags.includes('include')) {
		for(let finc of (data.match(/\[include[(](((?![)])(.|<spannw>[)]<\/spannw>))+)[)]\]/gi) || [])) {
			let inc = finc.match(/\[include[(](((?![)])(.|<spannw>[)]<\/spannw>))+)[)]\]/i);
			let itf = inc[1].replace(/<spannw>[)]<\/spannw>/, ')').split(',')[0].replace(/^(\s+)/, '').replace(/(\s+)$/, '').replace(/[&]quot;/g, '"').replace(/[&]amp;/g, '&').replace(/[&]lt;/g, '<').replace(/[&]gt;/g, '>');
			let paramsa = inc[1].replace(/<spannw>[)]<\/spannw>/, ')').split(',').slice(1, 99999);
			let params = {};
			for(let item of paramsa) {
				let pp = item.split('=')[0].replace(/^(\s+)/, '').replace(/(\s+)$/, '').toLowerCase();
				params[pp] = item.replace(pp + '=', '').replace(/^(\s+)/, '').replace(/(\s+)$/, '');
			}
			let itd = processTitle(itf);
			let d = await curs.execute("select content from documents where title = ? and namespace = ?", [itd.title, itd.namespace]);
			let acl = await getacl(req, itd.title, itd.namespace, 'read', 1);
			if(!d.length || acl) {
				data = data.replace(finc, '');
				continue;
			}
			d = d[0].content;
			for(let itema of (d.match(/[@](((?![@]).)+)[@]/gi) || [])) {
				let item = itema.match(/[@](((?![@]).)+)[@]/i)[1];
				let pd = item.split('=');
				let param = pd[0].toLowerCase();
				let def = pd[1] ? item.replace(param + '=', '') : '';
				d = d.replace(itema, params[param] || def);
			}
			d = await markdown(req, d, 0, itf, 'include noframe', title);
			d = d.replace(/\[include[(](((?![)]).)+)[)]\]/gi, '');
			
			data = data.replace(finc, d);
		}
	}
	
	// 표렌더
	var document = jsdom(data.replace(/\n/g, '<br>'));
	function ft(el) {
		const blks = el.querySelectorAll('dl.wiki-folding > dd, div.wiki-style, blockquote.wiki-quote');
		if(blks.length) for(let el2 of blks) ft(el2);
		el = (el == document ? el.querySelector('body') : el);
		const ihtml = el.innerHTML;
		el.innerHTML = parseTable(ihtml.replace(/<br>/g, '\n')).replace(/\n/g, '<br>');
	} ft(document);
	data = document.body.innerHTML.replace(/<br>/g, '\n');
	
{	// 각주 마무리
	var document = jsdom(data.replace(/\n/g, '<br>'));
	for(var item of document.querySelectorAll('a.wiki-fn-content')) {
		item.setAttribute('title', tdata[item.getAttribute('data-numeric-id')] || tdata2[item.getAttribute('data-title')]);
		item.removeAttribute('data-title');
		item.removeAttribute('data-repeating');
		item.removeAttribute('data-numeric-id');
	}
	data = document.body.innerHTML.replace(/<br>/g, '\n');
}	
	data = document.querySelector('body').innerHTML;
	data = data.replace(/\r/g, '');
	data = data.replace(/<br>/g, '\n');
	
	// 한 글자 리터럴 처리
	data = data.replace(/<spannw>(.)<\/spannw>/g, '$1');
	
	if(!discussion) data = '<div class=wiki-inner-content>' + data + '</div>';
	
	if(doc.namespace == '파일') {
		var filedata = await curs.execute("select url, width, height from files where title = ? and namespace = ?", [doc.title, doc.namespace]);
		if(filedata.length) {
			filedata = filedata[0];
			data = `
				<span class=wiki-image-align-normal>
					<span class=wiki-image-wrapper>
						<img class=wiki-image-space src="data:image/svg+xml;base64,${Buffer.from(`<svg width="${filedata.width}" height="${filedata.height}" xmlns="http://www.w3.org/2000/svg"></svg>`).toString('base64')}" />
						<img class=wiki-image src="${filedata.url}" alt="${html.escape(title)}" />
						<noscript>
							<img class=wiki-image src="${filedata.url}" alt="${html.escape(title)}" />
						</noscript>
					</span>
				</span>
			`.replace(/\n/g, '').replace(/\t/g, '') + data;
		}
	}
	
	data = data.replace(/<div>\n/, '<div>').replace(/\n<\/div><h(\d)/g, '</div><h$1').replace(/\n/g, '<br />');
	data = data.replace(/<br\s\/><ul\sclass=\"wiki[-]list\">/g, '<ul class=wiki-list>').replace(/<\/ul><br\s\/>/g, '</ul>');
	data = data.replace(/<br\s\/><blockquote class=\"wiki[-]quote\">/g, '<blockquote class=wiki-quote>').replace(/<\/blockquote><br\s\/>/g, '</blockquote>');
	data = data.replace(/<div\sclass=\"wiki[-]heading[-]content\"><br\s\/>/g, '<div class=wiki-heading-content>').replace(/<\/blockquote><br\s\/>/g, '</blockquote>');
	
	// 사용자 문서 틀
	if(!discussion && !flags.includes('include') && !flags.includes('preview') && doc.namespace == '사용자') {
		const blockdata = await userblocked(doc.title);
		if(blockdata) {
			data = `
				<div style="border-width: 5px 1px 1px; border-style: solid; border-color: red gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'blue\';" onmouseout="this.style.borderTopColor=\'red\';">
					<span${ver('4.13.0') ? '' : ' style="font-size: 14pt;"'}>이 사용자는 차단된 사용자입니다.${ver('4.18.0') ? ` (#${blockdata.id})` : ''}</span><br /><br />
					이 사용자는 ${generateTime(toDate(blockdata.date), timeFormat)}에 ${blockdata.expiration == '0' ? '영구적으로' : (generateTime(toDate(blockdata.expiration), timeFormat) + '까지')} 차단되었습니다.<br />
					차단 사유: ${html.escape(blockdata.note)}
				</div>
			` + data;
		}
		if(doc.namespace == '사용자') {
			if(!ver('4.0.20')) {
				if(getperm('tribune', doc.title)) {
					data = `
						<div style="border-width: 5px 1px 1px; border-style: solid; border-color: orange gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'red\';" onmouseout="this.style.borderTopColor=\'orange\';">
							<span style="font-size:14pt">이 사용자는 ${config.getString('wiki.site_name', '더 시드')}의 호민관 입니다.</span>
						</div>
					` + data;
				} if(getperm('arbiter', doc.title)) {
					data = `
						<div style="border-width: 5px 1px 1px; border-style: solid; border-color: orange gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'red\';" onmouseout="this.style.borderTopColor=\'orange\';">
							<span style="font-size:14pt">이 사용자는 ${config.getString('wiki.site_name', '더 시드')}의 중재자 입니다.</span>
						</div>
					` + data;
				} if(getperm('admin', doc.title)) {
					data = `
						<div style="border-width: 5px 1px 1px; border-style: solid; border-color: orange gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'red\';" onmouseout="this.style.borderTopColor=\'orange\';">
							<span style="font-size:14pt">이 사용자는 ${config.getString('wiki.site_name', '더 시드')}의 관리자 입니다.</span>
						</div>
					` + data;
				} if(getperm('developer', doc.title)) {
					data = `
						<div style="border-width: 5px 1px 1px; border-style: solid; border-color: purple gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'red\';" onmouseout="this.style.borderTopColor=\'purple\';">
							<span style="font-size:14pt">이 사용자는 ${config.getString('wiki.site_name', '더 시드')}의 개발자 입니다.</span>
						</div>
					` + data;
				}
			} else if(getperm('admin', doc.title)) {
				data = `
					<div style="border-width: 5px 1px 1px; border-style: solid; border-color: orange gray gray; padding: 10px; margin-bottom: 10px;" onmouseover="this.style.borderTopColor=\'red\';" onmouseout="this.style.borderTopColor=\'orange\';">
						<span${ver('4.13.0') ? '' : ' style="font-size: 14pt;"'}>이 사용자는 특수 권한을 가지고 있습니다.</span>
					</div>
				` + data;
			}
		}
	}
	
	if(!flags.includes('include') && !flags.includes('noframe') && !discussion && doc.namespace == '분류') {
		let content = '';
		
		const dbdata = await curs.execute("select title, namespace, type from backlink where type = 'category' and link = ? and linkns = ?", [doc.title, doc.namespace]);
		const _nslist = dbdata.map(item => item.namespace);
		const nslistd = fetchNamespaces().filter(item => _nslist.includes(item));
		const nslist = (nslistd.includes('분류') ? ['분류'] : []).concat(nslistd.filter(item => item != '분류'));
		let nsopt = '';
		for(let ns of nslist) {
			const data = dbdata.filter(item => item.namespace == ns);
			let cnt = data.length;
			if(!cnt) continue;
			
			let indexes = {};
			const hj = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
			const ha = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하', String.fromCharCode(55204)];
			for(let item of data) {
				if(!item) continue;
				let chk = 0;
				for(let i=0; i<ha.length-1; i++) {
					const fchr = item.title[0].toUpperCase().charCodeAt(0);
					
					if((hj[i].includes(item.title[0])) || (fchr >= ha[i].charCodeAt(0) && fchr < ha[i+1].charCodeAt(0))) {
						if(!indexes[hj[i]]) indexes[hj[i]] = [];
						indexes[hj[i]].push(item);
						chk = 1;
						break;
					}
				} if(!chk) {
					if(!indexes[item.title[0].toUpperCase()]) indexes[item.title[0].toUpperCase()] = [];
					indexes[item.title[0].toUpperCase()].push(item);
				}
			}
			
			content += `
				<h2 class=wiki-heading>${ns == '분류' ? '하위 분류' : ('"' + doc.title + '" 분류에 속하는 ' + ns)}</h2>
				<div>전체 ${cnt}개 문서</div>
			`;
			
			let listc = '<div class=wiki-category-container>';
			let list = '';
			for(let idx of Object.keys(indexes).sort()) {
				list += `
					<div>
						<h3 class=wiki-heading>${html.escape(idx)}</h3>
						<ul class=wiki-list>
				`;
				for(let item of indexes[idx])
					list += `
						<li>
							<a href="/w/${encodeURIComponent(totitle(item.title, item.namespace))}">${html.escape(item.title)}</a>
						</li>
					`;
				list += '</ul></div>';
			}
			listc += list + '</div>';
			content += listc;
		}
		
		data += content;
	}
	
	if(!discussion && !flags.includes('noframe') && !flags.includes('include')) data = '<div class="wiki-content clearfix">' + data + '</div>';
	
	// 분류
	if(!flags.includes('noframe') && !flags.includes('include')) {
		if(cates) {
			data = `
				<div class=wiki-category>
					<h2>분류</h2>
					<ul>${cates}</ul>
				</div>
			` + data;
		} else if(doc.namespace != '사용자' && !discussion && !flags.includes('preview')) {
			data = alertBalloon('이 문서는 분류가 되어 있지 않습니다. <a href="/w/분류:분류">분류:분류</a>에서 적절한 분류를 찾아 문서를 분류해주세요!', 'info', true) + data;
		}
	}
	
	// 리터럴블록 복구
	for(var item in nwblocks) {
		var nwdata = nwblocks[item];
		
		// #!html 문법
		if(nwdata.startsWith('<rawhtml>')) {
			var document = jsdom(nwdata);
			var dom = document.querySelector('rawhtml');
			dom.innerHTML = dom.textContent.replace(/\n/g, '<br>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
			for(var el of dom.getElementsByTagName('*')) {
				if(whtags.includes(el.tagName.toLowerCase())) {
					var atl = el.attributes.length, attr;
					for(let i=0; i<atl; i++) {
						attr = el.attributes[i];
						if(((whattr[el.tagName.toLowerCase()] || []).concat(whattr['*'])).includes(attr.name)) {
							if(attr.name == 'style')
								el.setAttribute('style', filterCSS(attr.value));
						} else el.removeAttribute(attr.name);
					}
					switch(el.tagName.toLowerCase()) {
						case 'a':
							el.setAttribute('target', '_blank');
							if(ver('4.20.0')) {
								el.className += (el.className ? ' ' : '') + 'wiki-link-external';
							}
					}
				} else el.outerHTML = el.innerHTML;
			}
			nwdata = dom.innerHTML;
		}
		
		data = data.replace(item, nwdata);
	}
	
	// log('렌더러', (title || '문서') + ' 파싱 완료.');
	
	return data;
}

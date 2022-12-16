router.get(/^\/License$/, async(req, res) => {
	var licepage = `
		<p>imitated-seed</p>
		<p>(the seed v${major}.${minor}.${revision})</p>
	`;
	
	if(hostconfig.replicate_theseed_license) {
		licepage = '';
		if(ver('4.11.1')) {
			licepage += `<h2>the seed</h2><p>v${major}.${minor}.${revision}</p>`;
		} else {
			licepage += `<h2>the seed (v${major}.${minor}.${revision})</h2>`;
		}
		licepage += `
			<p>Copyright <a href="https://theseed.io/">theseed.io</a> all rights reserved.</p>
			
			<h3>Contributors</h3>
			<ul class=wiki-list>
				${
					ver('4.13.0') ? `
						<li>namu@theseed.io (backend & frontend)</li>
						<li>PPPP@theseed.io (old frontend)</li>
						<li>kasio@theseed.io (old render)</li>
					` : `
						<li>namu@theseed.io (backend)</li>
						<li>PPPP@theseed.io (frontend)</li>
						<li>kasio@theseed.io (old render)</li>
					`
				}
			</ul>
			
			<h3>Open source license</h3>
			<ul class=wiki-list>
				<li>
					<a href="https://github.com/Khan/KaTeX">KaTex</a><br>
					Author : <a href="https://github.com/Khan">Khan Academy</a><br />
					KaTeX is licensed under the <a rel="license" href="https://github.com/Khan/KaTeX/blob/master/LICENSE.txt">MIT license</a>.
				</li>
				<li>
					<a href="https://paularmstrong.github.io/swig/">Swig</a><br />
					Author : <a href="https://github.com/paularmstrong">Paul Armstrong</a><br />
					Swig is licensed under the <a rel="license" href="https://github.com/paularmstrong/swig/blob/master/LICENSE">MIT license</a>.
				</li>
				
				${ver('4.13.0') ? `
					<li><pre>/*!
 * nano-assign v1.0.1
 * (c) 2018-present egoist &lt;0x142857@gmail.com&gt;
 * Released under the MIT License.
 */
/*!
 * Vue.js v2.6.10
 * (c) 2014-2019 Evan You
 * Released under the MIT License.
 */

/**!
 * @fileOverview Kickass library to create and place poppers near their reference elements.
 * @version 1.16.0
 * @license
 * Copyright (c) 2016 Federico Zivolo and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * vuex v3.1.2
 * (c) 2019 Evan You
 * @license MIT
 */

/**
 * vue-global-events v1.1.2
 * (c) 2019 Damian Dulisz &lt;damian.dulisz@gmail.com&gt;, Eduardo San Martin Morote &lt;posva13@gmail.com&gt;
 * @license MIT
 */

/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh &lt;https://feross.org&gt;
 * @license  MIT
 */

/**!
 * Sortable 1.10.1
 * @author	RubaXa   &lt;trash@rubaxa.org&gt;
 * @author	owenm    &lt;owen23355@gmail.com&gt;
 * @license MIT
 */
/*!---------------------------------------------------------------------------------------------
 *  Copyright (C) David Owens II, owensd.io. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
</pre></li>
				` : ''}
			</ul>
		`;
	}
	
	if(!ver('4.13.0')) {
		licepage += await readFile('./skins/' + getSkin(req) + '/license.html')
	}
	
	return res.send(await render(req, '라이선스', `
		<div class=wiki-content>
			${licepage}
	` + '</div>', {}, _, _, 'license'));
});
const fs = require('fs');
const express = require('express');
const router = express.Router();

router.attachRoutes = function attachRoutes() {
	const routes = fs.readdirSync('./routes', { withFileTypes: true }).filter(f => !(fs.statSync('./routes/' + (f.name || f)).isDirectory())).map(dirent => dirent.name || dirent);
	const header = 'const router = require(\'./router.js\'); const hostconfig = require(\'./hostconfig\'); const functions = require(\'./functions\'); for(var item in functions) global[item] = functions[item];';
	for(var src of routes)
		module._compile(header + fs.readFileSync('./routes/' + src), src);
};

module.exports = router;

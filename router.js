const fs = require('fs');
const express = require('express');
const router = express.Router();
const { readdir } = require('./functions.js');

router.attachRoutes = function attachRoutes() {
	const routes = readdir('./routes', 'file');
	const header = 'const router = require(\'./router.js\'); const hostconfig = require(\'./hostconfig\'); const functions = require(\'./functions\'); for(var item in functions) global[item] = functions[item]; const database = require(\'./database\'); for(var item in database) global[item] = database[item];';
	for(var src of routes)
		module._compile(header + fs.readFileSync('./routes/' + src), src);
};

module.exports = router;

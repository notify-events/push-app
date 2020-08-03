#!/usr/bin/env node

const fs = require('fs');

const rootDir = process.argv[2];

const config = process.env.config || "local";

fs.copyFileSync(rootDir + '/config/' + config + '.js', rootDir + '/www/js/config.js');

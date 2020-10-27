#!/usr/bin/env node

const fs     = require('fs');
const config = process.env.config || "dev";

fs.copyFileSync('config/' + config + '.js', 'www/js/config.js');

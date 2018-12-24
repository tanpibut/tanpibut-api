process.env.TANPIBUT_MODE = process.env.TANPIBUT_MODE || 'dev';
var express = require('./conf/express');
var app = express();

app.listen(3000);
module.exports = app;
console.log('Server running at http://localhost:3000')
var express = require('express');
var bodyParser = require('body-parser');
var compression = require('compression');
var fs = require('fs');
var path = require('path');
var app = express();
const _ = require('lodash');

app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(compression());

// handling coinsearch backend data
var cachedData = null
const data_path = path.join(__dirname, '..', 'data')
const json_file_path = path.join(data_path, 'coinsearch.json')
if (fs.existsSync(json_file_path)) {
    fs.readFile(json_file_path, 'utf8', (err, data) => {
        if (err) throw err;
        cachedData = JSON.parse(data);
    });
}
app.post('/upload', (req, res) => {
    console.log('POST /');
    if (!!req.body.title) {
        const fpath = path.join(__dirname, '..', 'data', req.body.title + '.json')
        // cache the received data for serving routes
        cachedData = req.body.data
        fs.writeFile(fpath, JSON.stringify(req.body.data)+'\n', err => {
            if (err) throw err;
            console.log('The file has been saved!');
        })
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('thanks');
});

app.get('/data/keys', (req, res) => {
	const keys = Object.keys(cachedData[0])
	res.send(keys);
})

app.get('/data/brief', (req, res) => {
	const fields = ["No. (HC)","Name (HC)","Symbol","Brief Explanation","Type","Chaintype","Consensus","Hash"]
	const result = cachedData.map((item) => {
		var subset = _.pick(item, fields);
		return _.mapKeys(subset, (val, k) => _.kebabCase(k))
	})
	res.send(result);
})

app.get('/data/all', (req, res) => {
	res.send(cachedData);
})

// serving coinsearch app
const app_path = path.join(__dirname, '..', '..', 'coinsearch', 'dist')
app.use('/static', express.static(path.join(app_path, 'static')));
app.get('/*', (req, res) => {
    console.log('GET /');
    res.sendFile(path.join(app_path, 'index.html'))
});

port = 9999;
app.listen(port);
console.log('Listening at http://localhost:' + port)

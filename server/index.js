var express = require('express');
var bodyParser = require('body-parser');
var compression = require('compression');
var fs = require('fs');
var path = require('path');
var app = express();
var cors = require('cors')
const _ = require('lodash');

app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(compression());
app.use(cors());

// handling coinsearch backend data
var cachedData = null
function snakeCaseProps(obj) {
    return _.mapKeys(obj, (val, k) => _.snakeCase(k))
}
const data_path = path.join(__dirname, '..', 'data')
const json_file_path = path.join(data_path, 'coinsearch.json')
if (fs.existsSync(json_file_path)) {
    fs.readFile(json_file_path, 'utf8', (err, data) => {
        if (err) throw err;
        cachedData = JSON.parse(data).map( (item) => snakeCaseProps(item) );
    });
}
app.post('/api/upload', (req, res) => {
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

app.get('/api/keys', (req, res) => {
    const keys = Object.keys(cachedData[0])
    res.send(keys);
})

app.get('/api/brief', (req, res) => {
    const fields = ["no_hc","name_hc","symbol","type","chaintype","consensus","hash"]
    const result = cachedData.map((item) => {
        var subset = _.pick(item, fields);
        return snakeCaseProps(subset);
    })
    res.send(result);
})

app.get('/api/all', (req, res) => {
    res.send(cachedData);
})

// get details of a particular coin
app.get('/api/d/:name', (req, res) => {
    const detail = _.find(cachedData, (item) => item['name_hc'].toLowerCase() == req.params.name.toLowerCase());
    res.send(detail);
})

// get coins of a particular category
app.get('/api/category', (req, res) => {
	const conds = req.query
    const details = _.filter(cachedData, (item) => {
		return _.every(_.map(conds, (v, k) => {
			if (v[0] != '!')
				return item[k] == 'Yes' || item[k] == v
			else
				return !(item[k] == 'Yes' || item[k] == v) && item[k] != ''
			// assume blank fields not even considered in this scope
		}))
    });
    res.send(details);
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

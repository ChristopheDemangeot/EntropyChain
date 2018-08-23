const express = require('express');
const bodyParser = require('body-parser');
const EntropyNode = require('./entropyNode');

const EntropyServer = function () {

    const port = 18070 + Math.floor(Math.random() * 30);
    const http_port = 3000 + Math.floor(Math.random() * 10);
    const app = new express();

    function init() {
        console.log('Starting EntropyServer node on http://localhost:' + port);

        let mainNode = new EntropyNode(port);
        mainNode.init();

        app.use(bodyParser.json());

        app.get('/addNode/:port', (req, res) => {
            console.log('Addind Node: ' + req.params.port)
            mainNode.addNode('localhost', req.params.port)
            res.send();
        })

        app.get('/addData/:blockData', (req, res) => {
            let newBlock = mainNode.createBlock(req.params.blockData);
            console.log('New block created - Hash: ' + newBlock.hash);
            res.send();
        })

        app.listen(http_port, () => {
            console.log('HTTP Server is up on http://localhost:' + http_port);
        })
    }

    return {
        init
    };
}

module.exports = EntropyServer;
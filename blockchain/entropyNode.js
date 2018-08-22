const EntropyChain = require('./entropyChain');
const WebSocket = require('ws');

const EntropyNode = function (port) {
    let connectionList = [];
    let wsServer;
    let _port = port
    let chain = new EntropyChain();

    const REQUEST_CHAIN = "REQUEST_CHAIN";
    const REQUEST_BLOCK = "REQUEST_BLOCK";
    const BLOCK = "BLOCK";
    const CHAIN = "CHAIN";

    function init() {

        chain.init();

        wsServer = new WebSocket.Server({
            port: _port
        });

        wsServer.on('connection', (connection) => {
            console.log('Connection in');
            initConnection(connection);
        });
    }

    const messageHandler = (connection) => {
        connection.on('message', (data) => {
            const msg = JSON.parse(data);
            switch (msg.event) {
                case REQUEST_CHAIN:
                    connection.send(JSON.stringify({
                        event: CHAIN,
                        message: chain.getChain()
                    }))
                    break;
                case REQUEST_BLOCK:
                    requestLatestBlock(connection);
                    break;
                case BLOCK:
                    processedReceivedBlock(msg.message);
                    break;
                case CHAIN:
                    processedReceivedChain(msg.message);
                    break;

                default:
                    console.log('Unknown message ');
            }
        });
    }


    const processedReceivedChain = (blocks) => {
        let newChain = blocks.sort((block1, block2) => (block1.index - block2.index))

        if (newChain.length > chain.getTotalBlocks() && chain.checkNewChainIsValid(newChain)) {
            chain.replaceChain(newChain);
            console.log('chain replaced');
        }
    }

    const processedReceivedBlock = (block) => {

        let currentTopBlock = chain.getLatestBlock();

        // Is the same or older?
        if (block.index <= currentTopBlock.index) {
            console.log('No update needed');
            return;
        }

        //Is claiming to be the next in the chain
        if (block.previousHash == currentTopBlock.hash) {
            //Attempt the top block to our chain
            chain.addToChain(block);

            console.log('New block added');
            console.log(chain.getLatestBlock());
        } else {
            // It is ahead.. we are therefore a few behind, request the whole chain
            console.log('Requesting chain');
            broadcastMessage(REQUEST_CHAIN, "");
        }
    }

    const requestLatestBlock = (connection) => {
        connection.send(JSON.stringify({
            event: BLOCK,
            message: chain.getLatestBlock()
        }))
    }

    const broadcastMessage = (event, message) => {
        connectionList.forEach(node => node.send(JSON.stringify({
            event,
            message
        })))
    }

    const closeConnection = (connection) => {
        console.log('Closing connection');
        connectionList.splice(connectionList.indexOf(connection), 1);
    }

    const initConnection = (connection) => {
        console.log('Init connection');

        messageHandler(connection);

        requestLatestBlock(connection);

        connectionList.push(connection);

        connection.on('error', () => closeConnection(connection));
        connection.on('close', () => closeConnection(connection));
    }

    const createBlock = (teammember) => {
        let newBlock = chain.createBlock(teammember)
        chain.addToChain(newBlock);

        broadcastMessage(BLOCK, newBlock);

    }

    const getStats = () => {
        return {
            blocks: chain.getTotalBlocks()
        }
    }

    const addNode = (host, port) => {
        let connection = new WebSocket(`ws://${host}:${port}`);

        connection.on('error', (error) => {
            console.log(error);
        });

        connection.on('open', (msg) => {
            initConnection(connection);
        });
    }

    return {
        init,
        broadcastMessage,
        addNode,
        createBlock,
        getStats
    }

}

module.exports = EntropyNode;
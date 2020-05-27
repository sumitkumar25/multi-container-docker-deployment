const keys = require('./keys');



const express = require('express');
const cors = require('cors');
const bodyparser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyparser.json());

//  postgress conf.
const { Pool } = require('pg');
const pgClinet = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
});
pgClinet.on('error', () => console.log('pg conneciton lost'));

// intial pg data.
pgClinet.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch((err) => console.log('pg error ' + err));

// Redis client setup

const redis = require('redis');

const redisClinet = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
})

const redisPublisher = redisClinet.duplicate();


// express routes
app.get('/', (req, res) => {
    res.send('Hi')
});

app.get('/values/all', async (req, res) => {
    const values = await pgClinet.query('SELECT * from values');
    res.send(values.rows)
});

app.get('/values/current', async (req, res) => {
    redisClinet.hgetall('values', (err, values) => {
        res.send(values)
    });
});

app.post('/values', async (req, res) => {
    const index = req.body.index;
    if (parseInt(index) > 40) {
        return res.status(422).send('index to high')
    }
    redisClinet.hset('values', index, 'Nothing yet');
    redisPublisher.publish('insert', index);
    pgClinet.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({ working: true });
});

app.listen(5000, () => {
    console.log('listening')
})
const { read, send }= require('./kafka.js')

const express = require('express')
const { Kafka } = require('kafkajs')
const bodyParser = require('body-parser')

let users = []

console.log(process.env.KAFKA)

const kafka = new Kafka({
  clientId: 'users',
  brokers: [process.env.KAFKA],
  logLevel: process.env.LOGLEVEL
})

app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const host = '0.0.0.0'
const port = 8080

app.get('/users', (req, res) => {
  res.json(users)
})

app.post('/users', async (req, res) => {
  const user = req.body
  users.push(user)
  await send(kafka, 'create_user', user)
  res.json(user)
})

app.listen(port, host, () => console.log(`Server listens http://${host}:${port}`))
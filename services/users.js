const { read, send }= require('./kafka.js')

const express = require('express')
const { Kafka } = require('kafkajs')

let users = []

const kafka = new Kafka({
  clientId: 'users',
  brokers: ['kafka:9092'],
  logLevel: 2
})

app = express()

const host = '0.0.0.0'
const port = 8080

app.get('/users', (req, res) => {
  res.json(users)
})

app.post('/users', async (req, res) => {
  const data = JSON.parse(req.data)
  const user = data
  users.push(user)
  await send(kafka, 'create_user', user)
  res.json(user)
})

app.listen(port, host, () => console.log(`Server listens http://${host}:${port}`))
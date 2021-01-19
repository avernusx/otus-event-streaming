const { read, send } = require('./kafka.js')

const express = require('express')
const { Kafka } = require('kafkajs')
const bodyParser = require('body-parser')

let accounts = []

const kafka = new Kafka({
  clientId: 'billing',
  brokers: [process.env.KAFKA],
  logLevel: process.env.LOGLEVEL
})

const createAccount = async (event) => {
  const data = JSON.parse(event.message.value)
  console.log("BILLING: Create billing account for new user", data)
  accounts.push({
    id: data.id,
    sum: 0
  })
}

const createOrder = async (event) => {
  const data = JSON.parse(event.message.value)
  console.log("BILLING: Create payment for new order", data)
  const account = accounts.find(acc => acc.id == data.account_id)
  if (account.sum >= data.sum) {
    account.sum -= data.sum
    setTimeout(async () => {
      send(kafka, 'success_payment', data)
    }, 500)
  } else {
    setTimeout(async () => {
      send(kafka, 'failed_payment', data)
    }, 500)
  }
}

const listenToKafka = async () => {
  const consumer = kafka.consumer({ groupId: 'billing-group' })
  await consumer.connect()
  await consumer.subscribe({ topic: 'create_user', fromBeginning: false })
  await consumer.subscribe({ topic: 'create_order', fromBeginning: false })
  setInterval(async () => {
    await consumer.run({ 
      eachMessage: (event) => {
        console.log("BILLING: Receive message " + event.topic)
        if (event.topic == 'create_user') createAccount(event)
        if (event.topic == 'create_order') createOrder(event)
      } 
    })
  }, process.env.READ_TIMEOUT)
}

app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const host = '0.0.0.0'
const port = 8080

app.get('/accounts', (req, res) => {
  res.json(accounts)
})

app.post('/accounts/deposit/:id', (req, res) => {
  const account = accounts.find(acc => acc.id == req.params.id)
  if (!account) res.status(404).send()
  account.sum += req.body.sum
  res.json(account)
})

app.get('/accounts/:id', (req, res) => {
  const account = accounts.find(acc => acc.id == req.params.id)
  if (!account) res.status(404).send()
  res.json(account)
})

app.listen(port, host, () => console.log(`Server listens http://${host}:${port}`))
listenToKafka()
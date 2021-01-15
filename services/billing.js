const { read, send }= require('./kafka.js')

const express = require('express')
const { Kafka } = require('kafkajs')

let accounts = []

const kafka = new Kafka({
  clientId: 'billing',
  brokers: ['kafka:9092'],
  logLevel: 2
})

setInterval(async () => {
  read(kafka, 'billing-group', 'create_user', async (event) => {
    console.log("BILLING: Create billing account for new user")
    const data = JSON.parse(event.message.value)
    accounts.push({
      id: data.id,
      sum: 0
    })
  })
}, 1000)

setInterval(async () => {
  read(kafka, 'billing-group', 'create_order', async (event) => {
    console.log("BILLING: Create payment for new order")
    const data = JSON.parse(event.message.value)
    const account = accounts.find(acc => acc.id == data.account_id)
    if (account.sum >= data.sum) {
      account.sum -= data.sum
      setTimeout(async () => {
        send(kafka, 'success_payment', { account_id: data.account_id })
      }, 500)
    } else {
      setTimeout(async () => {
        send(kafka, 'failed_payment', { account_id: data.account_id })
      }, 500)
    }
  })
}, 1000)

app = express()

const host = '0.0.0.0'
const port = 8080

app.get('/accounts', (req, res) => {
  res.json(accounts)
})

app.get('/account/:id', (req, res) => {
  const account = accounts.find(acc => acc.id == req.params.id)
  if (!account) res.status(404).send()
  res.json(account)
})

app.listen(port, host, () => console.log(`Server listens http://${host}:${port}`))
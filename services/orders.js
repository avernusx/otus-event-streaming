const { read, send }= require('./kafka.js')

const express = require('express')
const { Kafka } = require('kafkajs')

let orders = []

const kafka = new Kafka({
  clientId: 'orders',
  brokers: ['kafka:9092'],
  logLevel: 2
})

setInterval(async () => {
  await read(kafka, 'order-group', 'success_payment', async (event) => {
    console.log('ORDERS: Order was paid for succesfully')
    const data = JSON.parse(event.message.value)
    const order = orders.find(order => order.id == data.order_id)
    order.status = 'paid'
  })
}, 1000)

setInterval(async () => {
  await read(kafka, 'order-group', 'failed_payment', async (event) => {
    console.log('ORDERS: Failed to pay for order')
    const data = JSON.parse(event.message.value)
    const order = orders.find(order => order.id == data.order_id)
    orders.status = 'failed'
  })
}, 1000)

app = express()

const host = '0.0.0.0'
const port = 8080

app.get('/orders', (req, res) => {
  res.json(orders)
})

app.post('/orders', async (req, res) => {
  const data = JSON.parse(req.data)
  const order = {
    id: data.id,
    account_id: data.account_id,
    sum: data.sum,
    status: 'created'
  }
  orders.push(order)

  await send(kafka, 'create_order', {
    order_id: order.id,
    sum: order.sum,
    account_id: order.account_id
  })

  res.json(order)
})

app.get('/order/:id', (req, res) => {
  const order = orders.find(acc => acc.id == req.params.id)
  if (!order) res.status(404).send()
  res.json(order)
})

app.listen(port, host, () => console.log(`Server listens http://${host}:${port}`))
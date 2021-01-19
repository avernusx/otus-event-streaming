const { read, send }= require('./kafka.js')

const express = require('express')
const { Kafka } = require('kafkajs')

const bodyParser = require('body-parser')

let orders = []

const kafka = new Kafka({
  clientId: 'orders',
  brokers: [process.env.KAFKA],
  logLevel: process.env.LOGLEVEL
})

const successPayment = async (event) => {
  const data = JSON.parse(event.message.value)
  console.log('ORDERS: Order was paid for succesfully', data)
  const order = orders.find(order => order.id == data.order_id)
  order.status = 'paid'
}

const failedPayment = async (event) => {
  const data = JSON.parse(event.message.value)
  console.log('ORDERS: Failed to pay for order', data)
  const order = orders.find(order => order.id == data.order_id)
  order.status = 'failed'
}

const listenToKafka = async () => {
  const consumer = kafka.consumer({ groupId: 'orders-group' })
  await consumer.connect()
  await consumer.subscribe({ topic: 'success_payment', fromBeginning: false })
  await consumer.subscribe({ topic: 'failed_payment', fromBeginning: false })
  setInterval(async () => {
    await consumer.run({ 
      eachMessage: (event) => {
        console.log("ORDERS: Receive message " + event.topic)
        if (event.topic == 'success_payment') successPayment(event)
        if (event.topic == 'failed_payment') failedPayment(event)
      } 
    })
  }, process.env.READ_TIMEOUT)
}

app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const host = '0.0.0.0'
const port = 8080

app.get('/orders', (req, res) => {
  res.json(orders)
})

app.post('/orders', async (req, res) => {
  const data = req.body
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
listenToKafka()
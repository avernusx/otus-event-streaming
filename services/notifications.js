const { read, send }= require('./kafka.js')

const express = require('express')
const { Kafka } = require('kafkajs')

let accounts = []
let notifications = []

const kafka = new Kafka({
  clientId: 'notifications',
  brokers: [process.env.KAFKA],
  logLevel: process.env.LOGLEVEL
})

const createAccount = async (event) => {
  const data = JSON.parse(event.message.value)
  console.log("NOTIFICATIONS: Create notifications account for new user", data)
  accounts.push({
    id: data.id,
    mail: data.mail
  })
}

const successPayment = async (event) => {
  const data = JSON.parse(event.message.value)
  console.log('NOTIFICATIONS: Order was paid for succesfully', data)
  const account = accounts.find(acc => acc.id == data.account_id)
  notifications.push({ mail: account.mail, message: "Заказ оплачен успешно" })
}

const failedPayment = async (event) => {
  const data = JSON.parse(event.message.value)
  console.log('NOTIFICATIONS: Failed to pay for order', data)
  const account = accounts.find(acc => acc.id == data.account_id)
  notifications.push({ mail: account.mail, message: "Недостаточно денег для оплаты заказа" })
}

const listenToKafka = async () => {
  const consumer = kafka.consumer({ groupId: 'notification-group' })
  await consumer.connect()
  await consumer.subscribe({ topic: 'create_user', fromBeginning: false })
  await consumer.subscribe({ topic: 'success_payment', fromBeginning: false })
  await consumer.subscribe({ topic: 'failed_payment', fromBeginning: false })
  setInterval(async () => {
    await consumer.run({ 
      eachMessage: (event) => {
        console.log("NOTIFICATIONS: Receive message " + event.topic)
        if (event.topic == 'create_user') createAccount(event)
        if (event.topic == 'success_payment') successPayment(event)
        if (event.topic == 'failed_payment') failedPayment(event)
      } 
    })
  }, process.env.READ_TIMEOUT)
}

app = express()

const host = '0.0.0.0'
const port = 8080

app.get('/notifications', (req, res) => {
  res.json(notifications)
})

app.listen(port, host, () => console.log(`Server listens http://${host}:${port}`))
listenToKafka()
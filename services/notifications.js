const { read, send }= require('./kafka.js')

const express = require('express')
const { Kafka } = require('kafkajs')

let accounts = []
let notifications = []

const kafka = new Kafka({
  clientId: 'notifications',
  brokers: ['kafka:9092'],
  logLevel: 2
})

setInterval(async () => {
  read(kafka, 'notification-group', 'create_user', async (event) => {
    console.log("BILLING: Create billing account for new user")
    const data = JSON.parse(event.message.value)
    accounts.push({
      id: data.id,
      mail: data.mail
    })
  })
}, 1000)

setInterval(async () => {
  read(kafka, 'notification-group', 'success_payment', async (event) => {
    console.log('NOTIFICATIONS: Order was paid for succesfully')
    const data = JSON.parse(event.message.value)
    const account = accounts.find(acc => acc.id == data.account_id)
    notifications.push({ mail: account.mail, message: "Заказ оплачен успешно" })
  })
}, 1000)

setInterval(async () => {
  read(kafka, 'notification-group', 'failed_payment', async (event) => {
    console.log('NOTIFICATIONS: Failed to pay for order')
    const data = JSON.parse(event.message.value)
    const account = accounts.find(acc => acc.id == data.account_id)
    notifications.push({ mail: account.mail, message: "Недостаточно денег для оплаты заказа" })
  })
}, 1000)

app = express()

const host = '0.0.0.0'
const port = 8080

app.get('/notifications', (req, res) => {
  res.json(notifications)
})

app.listen(port, host, () => console.log(`Server listens http://${host}:${port}`))
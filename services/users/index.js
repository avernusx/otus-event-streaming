const http = require('http')
const { Kafka } = require('kafkajs')

const kafka = new Kafka({
  clientId: 'users',
  brokers: ['kafka:9092'],
  logLevel: 4
})

setInterval(async () => {
  try {
    const consumer = kafka.consumer({ groupId: 'users-group' })
    await consumer.connect()
    await consumer.subscribe({ topic: 'create_user', fromBeginning: true })
    await consumer.run({
      eachMessage: async (event) => {
        console.log("New user found ", JSON.stringify(event.message))
      },
    })
  } catch (e) {
    console.log(e)
  }
}, 1000)

let server = new http.Server(async function(req, res) {
  if (req.url == '/users' && req.method == 'GET') {
    res.writeHead(200, {'Content-Type': 'text/json'})
    res.end(JSON.stringify(users))
  } else if (req.url == '/users-add') {
    console.log('Старт')
    const producer = kafka.producer()

    await producer.connect()

    await producer.send({
      topic: 'create_user',
      messages: [
        { 
          value: JSON.stringify({
            name: "Игорь",
            login: "igor1990"
          })
        }
      ],
    })

    await producer.disconnect()

    res.writeHead(201, {'Content-Type': 'text/json'})
    res.end("Пользователь создан")
  } else if (req.url == '/create-topic') {
    console.log('START CREATE TOPIC')
    const admin = kafka.admin()
    await admin.createTopics({
      validateOnly: false,
      waitForLeaders: false,
      timeout: 1000,
      topics: [
        {
          topic: "create_user"
        }
      ],
    })
    await admin.connect()
    res.writeHead(200, {'Content-Type': 'text/json'})
    res.end("Created")
  } else if (req.url == '/topics') {
    const admin = kafka.admin()
    let topics = await admin.listTopics()
    await admin.connect()
    res.writeHead(200, {'Content-Type': 'text/json'})
    res.end(JSON.stringify(topics))
  } else {
    res.writeHead(200, {'Content-Type': 'text/json'})
    res.end("Hello world!")
  }
})

server.listen(8080, '0.0.0.0')
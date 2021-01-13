import { serve } from "https://deno.land/std@0.83.0/http/server.ts"
import { Kafka } from "https://jspm.dev/kafkajs"

const kafka = new Kafka({
  clientId: 'users',
  brokers: ['kafka:9092']
})

const producer = kafka.producer()

const consumer = kafka.consumer({ groupId: 'users-group' })

await consumer.connect()
await consumer.subscribe({ topic: 'create-user', fromBeginning: true })

class User {
  login: string = "login"
  name: string = "name"
  mail: string = "email"
  pass: string = "password"
}

const users: User[] = []

setInterval(async () => {
  await consumer.run({
    eachMessage: async (event: any) => {
      console.log("New user found ", JSON.stringify(event.message))
    },
  })
}, 1000)

const server = serve({ hostname: "0.0.0.0", port: 8080 })

console.log(`HTTP webserver running.  Access it at:  http://localhost:8080/`)

for await (const request of server) {
  if (request.url == '/users' && request.method == 'GET') {
    request.respond({ status: 200, body: JSON.stringify(users) })
  } else if (request.url == '/users') {
    let user = new User()

    await producer.connect()

    await producer.send({
      topic: 'сreate-user',
      messages: [
        new User(),
      ],
    })

    await producer.disconnect()

    request.respond({ status: 201, body: JSON.stringify(user) })
  } else {
    let bodyContent = "Your user-agent is:\n\n"
    bodyContent += request.headers.get("user-agent") || "Unknown"

    request.respond({ status: 200, body: "Hello world!" })
  }
}
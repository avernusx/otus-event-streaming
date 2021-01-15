async function send(kafka, topic, data) {
  const producer = kafka.producer()
  await producer.connect()
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(data) }],
  })
  await producer.disconnect()
}

async function read(kafka, group, topic, callback) {
  try {
    const consumer = kafka.consumer({ groupId: group })
    await consumer.connect()
    await consumer.subscribe({ topic: topic, fromBeginning: true })
    await consumer.run({ eachMessage: callback })
  } catch (e) {
    console.log(e)
  }
}

module.exports = { read, send }
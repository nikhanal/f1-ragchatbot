import {AzureOpenAI} from "openai"
import { DataAPIClient } from "@datastax/astra-db-ts"
// import {OpenAIStream, StreamingTextResponse} from "ai"
import "dotenv/config"
const {
  ASTRA_DB_NAMESPACE ,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT ,
  ASTRA_DB_APPLICATION_TOKEN,  
  OPENAI_API_KEY,
} = process.env

const endpoint = "https://ai-nishankhanaltest17791ai993711292023.openai.azure.com/";
const deployment = "text-embedding-3-small";
const apiVersion = "2024-04-01-preview";
const chatdeplotyment = "gpt-4o-mini"

const apiKey = OPENAI_API_KEY;
const options = { endpoint, apiKey, deployment, apiVersion }
const chatOptions = { endpoint, apiKey, deployment: chatdeplotyment, apiVersion }
const openai = new AzureOpenAI(options);
const chatOpenai = new AzureOpenAI(chatOptions);

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT, {namespace: ASTRA_DB_NAMESPACE})

export async function POST(req: Request) {
    try{
    const {messages} = await req.json()
    const latestMessage = messages[messages?.length - 1]?.content
    let docContext = ""

    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage,
      encoding_format: "float"
    })

    try{
      const collection = await db.collection(ASTRA_DB_COLLECTION)
      const cursor = collection.find(null, {
        sort: {
          $vector: embedding.data[0].embedding,
        },
        limit: 10
      })

      const documents = await cursor.toArray()
      const docsMap = documents?.map(doc=>doc.text)
      docContext = JSON.stringify(docsMap)

    }catch (err) {
      console.log("Error querying db...")
      docContext = ""
    }

    const template = {
      role: "system",
      content: `You are an AI assistant who knows everything about Formula One. Use the below context to augment what you know about Formula One racing. The context will provide you with the most recent page data from wikipedia, the official F1 website and others.
      If the context doesn't include the information you need answer based on your existing knowledge and don't mentions the source of your information or what the context does or doesn't include.
      Format responses using markdown where applicable and don't return images.
    --------------------
    START CONTEXT
    ${docContext}
    END CONTEXT
    --------------------
    Question: ${latestMessage}

    `
    }
    console.log("hereerererererererererere")
    
    const response = await chatOpenai.chat.completions.create({
        model:"gpt-4o-mini",
        stream:true,
        messages:[template,...messages],
    })
    console.log("hereerererererererererere-------------------------")
    const stream = new ReadableStream({
        async start(controller) {
          try {
            let fullResponse = '';
            // Process each chunk from OpenAI stream
            for await (const chunk of response) {
              const content = chunk.choices[0]?.delta?.content || '';
              if (content) {
                fullResponse += content; // Append the chunk to the full response
                // Stream out the data as it's received
                controller.enqueue(new TextEncoder().encode(content));
              }
            }
            // Once the stream is done, return the full response as a JSON object
            controller.close();
          } catch (error) {
            console.error("Error during streaming:", error);
            controller.error(error);
          }
        }
      });
  
      // Return the stream as a response with a JSON wrapper
      return new Response(stream, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8', // Ensure this is JSON
        },
      });
    }catch(err){
        console.log("Error in chat route", err)
        return new Response("Error in chat route", {status:500})
    }
}

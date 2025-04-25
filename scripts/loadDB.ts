import {DataAPIClient} from '@datastax/astra-db-ts'
import {PuppeteerWebBaseLoader} from 'langchain/document_loaders/web/puppeteer'
import {RecursiveCharacterTextSplitter} from 'langchain/text_splitter'
import { AzureOpenAI } from "openai";
const endpoint = "https://ai-nishankhanaltest17791ai993711292023.openai.azure.com/";
const deployment = "text-embedding-3-small";
const apiVersion = "2024-04-01-preview";
import "dotenv/config"

type SimilarityMetric = "dot_product" | "cosine" | "euclidean"

const {
    ASTRA_DB_NAMESPACE ,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT ,
    ASTRA_DB_APPLICATION_TOKEN,  
    OPENAI_API_KEY,
}   = process.env


const apiKey = OPENAI_API_KEY;
const options = { endpoint, apiKey, deployment, apiVersion }
const openai = new AzureOpenAI(options);
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN)
const db = client.db(ASTRA_DB_API_ENDPOINT,{namespace:ASTRA_DB_NAMESPACE})

const f1Data = [
    'https://en.wikipedia.org/wiki/Formula_One',
    'https://www.formula1.com/en/latest/all',
    'https://en.wikipedia.org/wiki/2023_Formula_One_World_Championship' ,
    'https://en.wikipedia.org/wiki/2022_Formula_One_World_Championship' ,
    'https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers_Champions' ,
    'https://en.wikipedia.org/wiki/2024_Formula_One_World_Championship',
    'https://www.formula1.com/en/results.html/2024/races.html',
    'https://www.formula1.com/en/racing/2024.html',
  ]


const splitter = new RecursiveCharacterTextSplitter({
    chunkOverlap:100,
    chunkSize:512
})

const createCollection = async (similarityMetric: SimilarityMetric = 'dot_product')=>{
    const res = await db.createCollection(ASTRA_DB_COLLECTION,{
        vector:{
            dimension:1536,
            metric: similarityMetric
        }
    })
    console.log(res)
}

const loadSampleData = async ()=>{
    const collection = await db.collection(ASTRA_DB_COLLECTION)
    for await (const url of f1Data){
        const content =  await scrapePage(url)
        const chunks = await splitter.splitText(content)
        for await (const chunk of chunks){
            const embedding = await openai.embeddings.create({
                model:"text-embedding-3-small",
                input:chunk,
                encoding_format:"float"
            })
            const vector = embedding.data[0].embedding
            const res = await collection.insertOne({
                $vector: vector,
                text: chunk
            })
            console.log(res)
        }
    }
}

const scrapePage = async(url:string)=>{
    const loader = new PuppeteerWebBaseLoader(url,{
        launchOptions:{
            headless:true
        },
        gotoOptions:{
            waitUntil:"domcontentloaded"
        },
        evaluate: async (page,browser)=>{
           const result =  await page.evaluate(()=> document.body.innerHTML)
           await browser.close()
           return result
        }
    })
    return (await loader.scrape())?.replace(/<[^>]*>?/gm,'')
}

createCollection().then(()=> loadSampleData())
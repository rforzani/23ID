import { MongoClient, ServerApiVersion } from "mongodb";
import "dotenv/config";

class MongoManager {
    constructor() {
        const mongoUri = process.env.MONGO_URI;

        this.client = new MongoClient(mongoUri, {serverApi: ServerApiVersion.v1, maxPoolSize: 20 });
    }

    async init() {
        try {
            await this.client.connect();

            this.db = this.client.db("23id");
        } catch (err) {
            console.error(err);
        }
    }
}

export default new MongoManager();
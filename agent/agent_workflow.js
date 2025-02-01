import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { initializeAgent } from "./identity_agent.js";
import { HumanMessage } from "@langchain/core/messages";

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors({  origin: "*" }));
app.use(bodyParser.json());

// Function to run the workflow
async function runAgentWorkflow(userMessage) {
  try {
    // 1. Initialize your agent
    const { agent, config } = await initializeAgent();

    // 2. Run the agent with the user-provided message
    const stream = await agent.stream(
      { messages: [new HumanMessage(userMessage)] },
      config
    );

    // 3. Collect responses from the stream
    let result = "";
    for await (const chunk of stream) {
      if ("agent" in chunk) {
        result += chunk.agent.messages[0].content + "\n";
      } else if ("tools" in chunk) {
        result += chunk.tools.messages[0].content + "\n";
      }
    }

    return result;
  } catch (error) {
    console.error("Error running the agent workflow:", error);
    throw error;
  }
}

// API Endpoint to trigger the workflow
app.post("/api/runAgent", async (req, res) => {
  const { userMessage } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: "userMessage is required" });
  }

  try {
    const result = await runAgentWorkflow(userMessage);
    console.log("Agent workflow result:", result);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to run agent workflow" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

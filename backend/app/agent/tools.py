"""
Agent tool definitions for OpenAI function calling.

This is the heart of what makes QuantumIQ agentic vs a simple chatbot.
Each tool is a structured function the AI can autonomously decide to call.
The key insight: the agent doesn't just respond to questions — it actively
reads state, makes decisions, and writes back to the system.

Tool calling vs prompt stuffing:
- Prompt stuffing: dump all user data into the prompt every time. Wasteful,
  hits token limits, and the model can't take actions — only read.
- Tool calling: the model requests specific data when needed and can write
  back to the database. This is true agency — observe, decide, act.
"""

# OpenAI function calling schema for each agent tool
AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_user_circuit",
            "description": "Retrieves the user's current circuit state from the active session. Returns the list of gates and qubit count. Use this to understand what the user has built before giving feedback.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_progress",
            "description": "Retrieves the user's full learning progress including mastery levels for each quantum concept, practice counts, error rates, and their current learning plan. Use this to identify weak areas and decide what to teach next.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_challenge",
            "description": "Creates a new personalized quantum circuit challenge based on the user's weak areas. The challenge should target concepts where the user has low mastery. Returns the challenge details for the user to attempt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "concept": {
                        "type": "string",
                        "description": "The quantum concept to focus the challenge on (e.g., 'superposition', 'entanglement', 'phase')",
                    },
                    "difficulty": {
                        "type": "string",
                        "enum": ["easy", "medium", "hard"],
                        "description": "Difficulty level based on the user's current mastery",
                    },
                },
                "required": ["concept", "difficulty"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_quantum_docs",
            "description": "Searches quantum computing documentation to ground explanations in accurate technical content. Use this when the user asks about a concept and you want to provide precise, referenced information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query for quantum computing documentation",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_learning_plan",
            "description": "Updates the user's personalized learning plan in the database. Call this after identifying weak areas or when the user completes a topic. This is how the agent persistently adjusts the curriculum.",
            "parameters": {
                "type": "object",
                "properties": {
                    "current_topic": {
                        "type": "string",
                        "description": "The topic the user should focus on next",
                    },
                    "plan_updates": {
                        "type": "object",
                        "description": "Updates to the learning plan data — topic completion, new topics, reordering",
                    },
                    "agent_notes": {
                        "type": "object",
                        "description": "Agent's observations about the user's learning patterns",
                    },
                },
                "required": ["current_topic"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_user_progress",
            "description": "Updates the user's mastery level for a specific quantum concept. Call this after the user practices a concept or completes a challenge to track their improvement.",
            "parameters": {
                "type": "object",
                "properties": {
                    "concept": {
                        "type": "string",
                        "description": "The quantum concept to update (e.g., 'superposition', 'entanglement')",
                    },
                    "mastery_delta": {
                        "type": "number",
                        "description": "How much to adjust mastery (-1.0 to 1.0). Positive for improvement, negative for errors.",
                    },
                    "practiced": {
                        "type": "boolean",
                        "description": "Whether to increment the practice counter",
                    },
                    "error": {
                        "type": "boolean",
                        "description": "Whether to increment the error counter",
                    },
                },
                "required": ["concept"],
            },
        },
    },
]

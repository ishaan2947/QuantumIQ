"""
The QuantumIQ Agent — an autonomous AI tutor that uses tool calling to
observe, decide, and act on the user's learning state.

THIS IS WHAT MAKES THE SYSTEM AGENTIC:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A chatbot: receives message → generates response → done.
An agent:  receives message → observes state → plans actions → executes tools
           → observes results → decides next action → loops until goal is met
           → generates response with full context.

The agent loop here implements the Observe-Orient-Decide-Act (OODA) pattern:
1. OBSERVE: Read user's circuit and progress via tool calls
2. ORIENT: Analyze weak areas, current topic, learning plan
3. DECIDE: Choose whether to teach, challenge, correct, or advance
4. ACT: Update progress, generate challenges, modify learning plan

The loop continues until the LLM decides it has enough information to respond
(indicated by returning a message without tool calls). This means the agent
can chain multiple tool calls in sequence — e.g., read progress → identify
weakness → generate challenge → update plan — all autonomously.
"""

import json
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.user import User
from app.agent.tools import AGENT_TOOLS
from app.agent.executor import execute_tool

settings = get_settings()

SYSTEM_PROMPT = """You are QuantumIQ — a sharp, concise quantum computing tutor who actively manages the user's learning.

CORE RULES:
1. Be CONCISE. Max 2-3 short paragraphs unless the user asks for detail. No walls of text.
2. Be CONVERSATIONAL. Ask follow-up questions. A good tutor listens more than lectures.
3. Be SPECIFIC. Reference their actual gates and circuit. Never give generic advice.
4. Use your tools FIRST to check their circuit and progress before every response.

STYLE:
- Short paragraphs, not bullet-point essays
- Use ket notation naturally: |0⟩, |1⟩, |+⟩, |−⟩
- Use Unicode for math: π/2, √2, ⊗ — NEVER LaTeX like \\( or \\)
- Use **bold** for key terms, `code` for gate names
- When explaining, use their circuit as the example — "your `H` gate on qubit 0 puts it in..."
- End with a question or actionable suggestion, not a summary

PEDAGOGY:
- One concept at a time. Don't explain everything about a gate unprompted.
- If they're a beginner, guide them step by step. Don't dump all 8 curriculum topics.
- When you spot a weak area, suggest ONE challenge — don't overwhelm.
- Celebrate progress ("Nice — that's a proper Bell state!") before moving on.

AGENCY — what makes you different from a chatbot:
- Check circuit + progress before EVERY response (use tools)
- After they practice, update their progress tracking
- If they've mastered a topic, advance their learning plan
- Generate challenges when appropriate, not every message"""

# Maximum tool call iterations to prevent infinite loops
MAX_ITERATIONS = 8


async def run_agent(
    user_message: str,
    user: User,
    db: AsyncSession,
    circuit_context: dict | None = None,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Runs the agentic loop: sends message to GPT-4o, executes any tool calls,
    feeds results back, and repeats until the model produces a final response.

    Returns:
        {
            "response": str,          # The agent's final message
            "tool_calls": list[dict],  # Record of all tools the agent used
            "suggested_circuit": ...,  # Optional circuit suggestion
            "challenge": ...,          # Optional generated challenge
        }
    """
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    # Build conversation messages
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Include conversation history for persistent memory within session
    if conversation_history:
        messages.extend(conversation_history)

    messages.append({"role": "user", "content": user_message})

    all_tool_calls = []
    generated_challenge = None
    suggested_circuit = None

    # ─── The Agent Loop ──────────────────────────────────────────────────
    # This is the core agentic pattern. The LLM can call tools, get results,
    # and decide whether to call more tools or produce a final response.
    # Each iteration is one "thought-action-observation" cycle.

    for iteration in range(MAX_ITERATIONS):
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=AGENT_TOOLS,
            tool_choice="auto",  # Let the model decide when to use tools
            temperature=0.7,
        )

        choice = response.choices[0]

        # If the model produced a final message (no tool calls), we're done
        if choice.finish_reason == "stop" or not choice.message.tool_calls:
            final_response = choice.message.content or ""
            return {
                "response": final_response,
                "tool_calls": all_tool_calls,
                "suggested_circuit": suggested_circuit,
                "challenge": generated_challenge,
            }

        # Otherwise, execute each tool call the model requested
        messages.append(choice.message)

        for tool_call in choice.message.tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)

            # Execute the tool against real data
            result = await execute_tool(
                tool_name=fn_name,
                tool_args=fn_args,
                user=user,
                db=db,
                circuit_context=circuit_context,
            )

            # Track tool calls for transparency
            all_tool_calls.append({
                "tool": fn_name,
                "args": fn_args,
                "result_preview": result[:200] if len(result) > 200 else result,
            })

            # Capture generated challenges to return to frontend
            if fn_name == "generate_challenge":
                generated_challenge = json.loads(result)

            # Feed the tool result back to the model
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result,
            })

    # Safety: if we hit max iterations, return whatever we have
    return {
        "response": "I've gathered your information. How can I help you with your quantum circuit?",
        "tool_calls": all_tool_calls,
        "suggested_circuit": suggested_circuit,
        "challenge": generated_challenge,
    }

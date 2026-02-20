# Why OpenMandate?

When deploying AI agents in high-stakes environments, the standard approach to AI governance quickly breaks down. 

Most agentic frameworks rely heavily on **system prompts** to control behaviour. Developers tell the LLM: *"You must not give advice,"* *"You must always cite your sources,"* or *"You cannot access internal financial records."*

But LLMs are fundamentally non-deterministic probability engines. A clever user prompt, a complex logical puzzle, or even a sudden shift in the conversation's context can cause the model to forget, ignore, or bypass its system prompt entirely.

### The Problem with "Prompt Governance"

Relying on prompts for safety in high-stakes environments creates unacceptable risks:
- **Jailbreaks & Leaks:** Malicious (or simply creative) users can trick the agent into accessing prohibited tools or revealing sensitive data.
- **Hallucinated Actions:** If an LLM decides it wants to execute a workflow step that isn't appropriate for the current user, a prompt instruction alone cannot physically stop the code from running.
- **Compliance Failures:** In heavily regulated sectors, saying "we told the AI not to do that" is not a valid defence if the AI provides incorrect guidance or exposes a client to liability.

### The OpenMandate Solution: "Code Over Prompts"

OpenMandate was built specifically to solve the problem of non-deterministic execution. It shifts governance out of the prompt and into **deterministic, physical code**.

Instead of asking the LLM nicely to behave, OpenMandate surrounds the LLM with an impenetrable "Processor Chain" governed by a strict YAML mandate. 

1. **Before the LLM speaks**: Input processors intercept the user's message. If the user asks about a prohibited topic (e.g., a severe escalation like self-harm or a conflict of interest), the framework intercepts the message and redirects the user *before the LLM even sees it*.
2. **Before the LLM acts**: If the LLM tries to call a tool it isn't strictly authorized to use, the Tool Gate processor physically blocks the API call. The LLM cannot "jailbreak" an API key it doesn't have access to.
3. **Before the user reads**: Output processors scan the final response. If the agent forgot to include required citations, or if it attempted to issue professional advice, the output is rejected or modified (e.g., injecting mandatory disclaimers) before it ever reaches the screen.

### Separation of Concerns

By divorcing the *rules* (the Mandate) from the *logic* (the Agent), organisations achieve true oversight. 

Stakeholders who understand the risk—managers, compliance officers, and operations teams—can review and approve the plain-text YAML mandate. They can point to the exact line (`prohibitions.actions: ["provide_professional_advice"]`) and know with absolute certainty that the underlying architecture will physically enforce that rule, regardless of how the underlying AI model behaves. 

OpenMandate doesn't just ask AI agents to know their boundaries; it builds walls they cannot cross.

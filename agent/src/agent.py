import logging

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    RunContext,
    STTContextOptions,
    TurnHandlingOptions,
    cli,
    function_tool,
    inference,
    room_io,
)
from livekit.plugins import ai_coustics

from knowledge import KnowledgeBase
from prompts import build_instructions

logger = logging.getLogger("agent")

load_dotenv(".env.local")


class InterviewCoach(Agent):
    def __init__(self, kb: KnowledgeBase, focus: str | None = None) -> None:
        self._kb = kb
        super().__init__(
            llm=inference.LLM(model="google/gemma-4-31b-it"),
            instructions=build_instructions(focus, kb.titles()),
        )

    @function_tool
    async def search_knowledge(self, context: RunContext, query: str) -> str:
        """Search the coach's study notes and reference material (markdown files).

        Use this before choosing or grading a question on a topic the notes may cover,
        and whenever the candidate asks about something that could be in the notes.

        Args:
            query: A short description of the topic, e.g. "caching eviction policies" or "STAR method".
        """
        logger.info("search_knowledge: %s", query)
        hits = self._kb.search(query, k=3)
        if not hits:
            return "No relevant notes found. Use your general engineering knowledge."
        return "\n\n".join(f"[From notes: {c.label}]\n{c.text}" for c in hits)


server = AgentServer()


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: JobContext):
    # Logging setup
    # Add any other context you want in all log entries here
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline using AssemblyAI, Fish Audio, and the LiveKit turn detector
    session = AgentSession(
        # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
        # See all available models at https://docs.livekit.io/agents/models/stt/
        stt=inference.STT(model="assemblyai/assemblyai-stt-3-7-realtime-agent"),
        # Keyterms bias the STT toward distinctive words it would otherwise misspell.
        # List your own names, brands, and jargon in `keyterms`. Detection additionally
        # extracts terms from the live conversation, such as a caller's name, and applies
        # them once the transcript corroborates the spelling.
        # See more at https://docs.livekit.io/agents/models/stt/keyterms/
        stt_context_options=STTContextOptions(
            keyterms=[
                "STAR",
                "LeetCode",
                "Big O",
                "system design",
                "microservices",
                "Kubernetes",
            ],
            keyterm_detection={"enabled": True},
        ),
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        tts=inference.TTS(
            model="fishaudio/s2.1-pro", voice="fa4c9eb3dccc4806b382b40d61c6b10a"
        ),
        turn_handling=TurnHandlingOptions(
            # The LiveKit turn detector determines when the user is done speaking and the agent should respond.
            # TurnDetector is an end-of-turn model that listens to the user's audio directly, combining
            # semantic understanding with acoustic cues (intonation, pitch, rhythm) for state-of-the-art accuracy.
            # AgentSession supplies the required VAD automatically.
            # See more at https://docs.livekit.io/agents/build/turns
            turn_detection=inference.TurnDetector(),
            # Adaptive interruptions use the turn detector to tell a real interruption from a
            # backchannel like "mhm" or "right", so the agent keeps talking through the latter.
            # This model is on by default on LiveKit Cloud and in dev mode. To use the model elsewhere,
            # uncomment the `interruption` line. Self-hosted usage past the monthly allowance is billed.
            # See https://docs.livekit.io/deploy/admin/quotas-and-limits/#adaptive-interruption-handling for more information.
            # interruption={"mode": "adaptive"},
            # allow the LLM to generate a response while waiting for the end of turn
            # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
            preemptive_generation={"enabled": True},
        ),
        # Expressive mode injects the TTS provider's markup guide into the LLM prompt, so the model
        # emits inline delivery tags (emotion, pacing, non-verbal sounds) that the TTS renders and
        # the transcript never shows. Requires a TTS model that supports markup, such as the Fish
        # Audio model above.
        expressive=True,
    )

    # Start the session, which initializes the voice pipeline and warms up the models
    # The frontend sends the chosen focus area as a participant attribute on the token.
    participant = await ctx.wait_for_participant()
    focus = participant.attributes.get("focus")

    await session.start(
        agent=InterviewCoach(KnowledgeBase(), focus),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=ai_coustics.audio_enhancement(
                    model=ai_coustics.EnhancerModel.QUAIL_VF_S
                ),
            ),
        ),
    )

    # # Add a virtual avatar to the session, if desired
    # # For other providers, see https://docs.livekit.io/agents/models/avatar/
    # avatar = anam.AvatarSession(
    #     persona_config=anam.PersonaConfig(
    #         name="...",
    #         avatarId="...",  # See https://docs.livekit.io/agents/models/avatar/plugins/anam
    #     ),
    # )
    # # Start the avatar and wait for it to join
    # await avatar.start(session, room=ctx.room)

    # Join the room and connect to the user
    await ctx.connect()

    # Speak first: greet the user before they say anything
    await session.generate_reply(
        instructions="Greet the candidate warmly, introduce yourself as their interview coach, and begin the interview as instructed."
    )


if __name__ == "__main__":
    cli.run_app(server)

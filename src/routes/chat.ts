import { Router } from 'express';
import { prisma } from '../lib/prisma';
import {
  optionalAuthMiddleware,
  AuthRequest,
} from '../middleware/auth';
import { MOCK_CHARACTERS } from '../data/mock-characters';
import {
  MOCK_RESPONSES,
} from '../data/mock-responses';
import { config } from '../config';

export const chatRouter = Router();

const GUEST_MESSAGE_LIMIT = 4;

let lastResponseIndex = -1;

// ── Fallback mock (used when Flask is down) ────────────────────────────

function getRandomResponse(exclude: number): { text: string; index: number } {
  let idx: number;
  do {
    idx = Math.floor(Math.random() * MOCK_RESPONSES.length);
  } while (idx === exclude && MOCK_RESPONSES.length > 1);
  return { text: MOCK_RESPONSES[idx], index: idx };
}

function randomDelay(): Promise<void> {
  const ms = Math.floor(Math.random() * 2000) + 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Call Flask chat service ────────────────────────────────────────────

interface ChatServiceResponse {
  content: string;
  image_url: string | null;
}

async function callChatService(
  message: string,
  character: { id: string; name: string; personality: string },
  userTier: string,
): Promise<ChatServiceResponse | null> {
  try {
    const resp = await fetch(`${config.chatService.url}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Secret': config.chatService.secret,
      },
      body: JSON.stringify({
        message,
        character_id: character.id,
        character_name: character.name,
        character_personality: character.personality,
        user_tier: userTier,
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!resp.ok) {
      console.error(`Chat service error: ${resp.status}`);
      return null;
    }

    return (await resp.json()) as ChatServiceResponse;
  } catch (err) {
    console.error('Chat service unreachable, falling back to Node.js mock:', err);
    return null;
  }
}

async function generateResponse(
  message: string,
  character: { id: string; name: string; personality: string },
  userTier: string,
): Promise<{ content: string; imageUrl: string | null }> {
  // Try Flask service first
  const aiResp = await callChatService(message, character, userTier);
  if (aiResp) {
    return { content: aiResp.content, imageUrl: aiResp.image_url };
  }

  // Fallback: inline mock
  await randomDelay();
  const resp = getRandomResponse(lastResponseIndex);
  lastResponseIndex = resp.index;
  return { content: resp.text, imageUrl: null };
}

// ── Guest sessions (in-memory) ─────────────────────────────────────────

const guestSessions = new Map<
  string,
  Map<string, { role: string; content: string; imageUrl?: string | null }[]>
>();

function getGuestSessionId(req: AuthRequest): string {
  const existing = req.cookies?.guestSessionId;
  if (existing) return existing;
  return `guest_${req.ip}_${Date.now()}`;
}

// ── GET messages ───────────────────────────────────────────────────────

chatRouter.get(
  '/:characterId/messages',
  optionalAuthMiddleware,
  async (req: AuthRequest, res) => {
    const user = req.appUser;
    const characterId = req.params.characterId as string;

    const character = MOCK_CHARACTERS.find((c) => c.id === characterId);
    if (!character) {
      res.status(404).json({ error: 'Không tìm thấy nhân vật' });
      return;
    }

    if (user) {
      let conversation = await prisma.conversation.findUnique({
        where: {
          userId_characterId: { userId: user.id, characterId },
        },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: { userId: user.id, characterId },
          include: { messages: true },
        });
      }

      res.json({ conversation, character, isGuest: false });
      return;
    }

    // Guest
    const sessionId = getGuestSessionId(req);
    const sessionChats = guestSessions.get(sessionId);
    const guestMessages = sessionChats?.get(characterId) || [];

    res.json({
      conversation: {
        id: `guest_${sessionId}_${characterId}`,
        userId: null,
        characterId,
        messages: guestMessages.map((m, i) => ({
          id: `guest_msg_${i}`,
          conversationId: `guest_${sessionId}_${characterId}`,
          role: m.role,
          content: m.content,
          imageUrl: m.imageUrl || null,
          createdAt: new Date().toISOString(),
        })),
      },
      character,
      isGuest: true,
      guestMessagesUsed: Math.ceil(guestMessages.length / 2),
      guestMessageLimit: GUEST_MESSAGE_LIMIT,
    });
  },
);

// ── POST message ───────────────────────────────────────────────────────

chatRouter.post(
  '/:characterId/messages',
  optionalAuthMiddleware,
  async (req: AuthRequest, res) => {
    const user = req.appUser;
    const characterId = req.params.characterId as string;
    const { content } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ error: 'Tin nhắn không được để trống' });
      return;
    }

    const character = MOCK_CHARACTERS.find((c) => c.id === characterId);
    if (!character) {
      res.status(404).json({ error: 'Không tìm thấy nhân vật' });
      return;
    }

    // === GUEST MODE ===
    if (!user) {
      const sessionId = getGuestSessionId(req);

      if (!guestSessions.has(sessionId)) {
        guestSessions.set(sessionId, new Map());
      }
      const sessionChats = guestSessions.get(sessionId)!;
      if (!sessionChats.has(characterId)) {
        sessionChats.set(characterId, []);
      }
      const messages = sessionChats.get(characterId)!;

      const userMessageCount = messages.filter((m) => m.role === 'USER').length;
      if (userMessageCount >= GUEST_MESSAGE_LIMIT) {
        res.status(429).json({
          error: 'Đăng ký tài khoản để tiếp tục trò chuyện nhé!',
          guestLimitReached: true,
          guestMessageLimit: GUEST_MESSAGE_LIMIT,
        });
        return;
      }

      // Call Flask chat service (or fallback)
      const aiResp = await generateResponse(content.trim(), character, 'FREE');

      messages.push({ role: 'USER', content: content.trim() });
      messages.push({ role: 'ASSISTANT', content: aiResp.content, imageUrl: aiResp.imageUrl });

      const msgIdx = messages.length;
      const userMessage = {
        id: `guest_msg_${msgIdx - 2}`,
        conversationId: `guest_${sessionId}_${characterId}`,
        role: 'USER' as const,
        content: content.trim(),
        imageUrl: null,
        createdAt: new Date().toISOString(),
      };
      const assistantMessage = {
        id: `guest_msg_${msgIdx - 1}`,
        conversationId: `guest_${sessionId}_${characterId}`,
        role: 'ASSISTANT' as const,
        content: aiResp.content,
        imageUrl: aiResp.imageUrl,
        createdAt: new Date().toISOString(),
      };

      res.cookie('guestSessionId', sessionId, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });

      res.json({
        userMessage,
        assistantMessage,
        isGuest: true,
        guestMessagesUsed: userMessageCount + 1,
        guestMessageLimit: GUEST_MESSAGE_LIMIT,
      });
      return;
    }

    // === LOGGED-IN MODE ===
    if (user.tier === 'FREE' && user.messagesUsedToday >= 10) {
      res.status(429).json({
        error: 'Bạn đã hết tin nhắn miễn phí hôm nay',
        limit: 10,
        used: user.messagesUsedToday,
        upgradeUrl: '/goi-dich-vu',
      });
      return;
    }

    let conversation = await prisma.conversation.findUnique({
      where: {
        userId_characterId: { userId: user.id, characterId },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { userId: user.id, characterId },
      });
    }

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: content.trim(),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { messagesUsedToday: { increment: 1 } },
    });

    // Call Flask chat service (or fallback)
    const aiResp = await generateResponse(content.trim(), character, user.tier);

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: aiResp.content,
        imageUrl: aiResp.imageUrl,
      },
    });

    res.json({
      userMessage,
      assistantMessage,
      messagesUsedToday: user.messagesUsedToday + 1,
      isGuest: false,
    });
  },
);

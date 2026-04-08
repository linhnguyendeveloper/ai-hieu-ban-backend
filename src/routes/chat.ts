import { Router } from 'express';
import { prisma } from '../lib/prisma';
import {
  authMiddleware,
  optionalAuthMiddleware,
  AuthRequest,
} from '../middleware/auth';
import { tierCheckMiddleware } from '../middleware/tier-check';
import { MOCK_CHARACTERS } from '../data/mock-characters';
import {
  MOCK_RESPONSES,
  MOCK_IMAGE_RESPONSES,
  IMAGE_KEYWORDS,
  MOCK_IMAGE_URLS,
} from '../data/mock-responses';
import { config } from '../config';

export const chatRouter = Router();

const GUEST_MESSAGE_LIMIT = 4;

let lastResponseIndex = -1;

function getRandomResponse(exclude: number): { text: string; index: number } {
  let idx: number;
  do {
    idx = Math.floor(Math.random() * MOCK_RESPONSES.length);
  } while (idx === exclude && MOCK_RESPONSES.length > 1);
  return { text: MOCK_RESPONSES[idx], index: idx };
}

function isImageRequest(content: string): boolean {
  const lower = content.toLowerCase();
  return IMAGE_KEYWORDS.some((kw) => lower.includes(kw));
}

function randomDelay(): Promise<void> {
  const ms = Math.floor(Math.random() * 2000) + 1000; // 1-3s
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// In-memory guest sessions: sessionId → { characterId → messages[] }
const guestSessions = new Map<
  string,
  Map<string, { role: string; content: string; imageUrl?: string | null }[]>
>();

function getGuestSessionId(req: AuthRequest): string {
  // Use a cookie-based session ID or generate from IP+UA
  const existing = req.cookies?.guestSessionId;
  if (existing) return existing;
  return `guest_${req.ip}_${Date.now()}`;
}

// Get conversation with messages — supports guest
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

    // Logged-in user: use DB
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

    // Guest user: use in-memory
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

// Send a message — supports guest (in-memory, limited)
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

      // Count user messages sent so far
      const userMessageCount = messages.filter((m) => m.role === 'USER').length;
      if (userMessageCount >= GUEST_MESSAGE_LIMIT) {
        res.status(429).json({
          error: 'Đăng ký tài khoản để tiếp tục trò chuyện nhé!',
          guestLimitReached: true,
          guestMessageLimit: GUEST_MESSAGE_LIMIT,
        });
        return;
      }

      // Simulate AI delay
      await randomDelay();

      const resp = getRandomResponse(lastResponseIndex);
      lastResponseIndex = resp.index;

      messages.push({ role: 'USER', content: content.trim() });
      messages.push({ role: 'ASSISTANT', content: resp.text });

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
        content: resp.text,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      };

      // Set session cookie
      res.cookie('guestSessionId', sessionId, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24h
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
    // Check tier limits
    if (
      user.tier === 'FREE' &&
      user.messagesUsedToday >= 10
    ) {
      res.status(429).json({
        error: 'Bạn đã hết tin nhắn miễn phí hôm nay',
        limit: 10,
        used: user.messagesUsedToday,
        upgradeUrl: '/goi-dich-vu',
      });
      return;
    }

    // Get or create conversation
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

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: content.trim(),
      },
    });

    // Increment daily message counter
    await prisma.user.update({
      where: { id: user.id },
      data: { messagesUsedToday: { increment: 1 } },
    });

    if (config.mockAi) {
      await randomDelay();

      const wantsImage = isImageRequest(content);
      let responseContent: string;
      let imageUrl: string | null = null;

      if (wantsImage && user.tier === 'PREMIUM') {
        responseContent =
          MOCK_IMAGE_RESPONSES[
            Math.floor(Math.random() * MOCK_IMAGE_RESPONSES.length)
          ];
        imageUrl =
          MOCK_IMAGE_URLS[Math.floor(Math.random() * MOCK_IMAGE_URLS.length)];
      } else if (wantsImage && user.tier === 'FREE') {
        responseContent =
          'Tính năng tạo ảnh chỉ dành cho thành viên Premium. Nâng cấp để trải nghiệm nhé!';
      } else {
        const resp = getRandomResponse(lastResponseIndex);
        responseContent = resp.text;
        lastResponseIndex = resp.index;
      }

      const assistantMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: responseContent,
          imageUrl,
        },
      });

      res.json({
        userMessage,
        assistantMessage,
        messagesUsedToday: user.messagesUsedToday + 1,
        isGuest: false,
      });
      return;
    }

    // Future: forward to Flask AI service
    res.status(501).json({ error: 'Dịch vụ AI chưa sẵn sàng' });
  },
);

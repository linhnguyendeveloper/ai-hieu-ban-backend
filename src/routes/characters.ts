import { Router } from 'express';
import { MOCK_CHARACTERS, Character } from '../data/mock-characters';
import { optionalAuthMiddleware, AuthRequest } from '../middleware/auth';

export const characterRouter = Router();

// Get all characters
characterRouter.get('/', (_req, res) => {
  res.json(MOCK_CHARACTERS);
});

// Get featured characters
characterRouter.get('/featured', (_req, res) => {
  res.json(MOCK_CHARACTERS.filter((c) => c.isFeatured));
});

// Get single character by id
characterRouter.get('/:id', (req, res) => {
  const character = MOCK_CHARACTERS.find((c) => c.id === req.params.id);
  if (!character) {
    res.status(404).json({ error: 'Không tìm thấy nhân vật' });
    return;
  }
  res.json(character);
});

// Mock character creation — simulates 2s AI generation delay
characterRouter.post(
  '/',
  optionalAuthMiddleware,
  async (req: AuthRequest, res) => {
    const { name, gender, personality, appearance } = req.body;

    if (!name?.trim() || !personality?.trim()) {
      res.status(400).json({ error: 'Vui lòng điền tên và tính cách nhân vật' });
      return;
    }

    // Simulate AI processing delay (2s)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate a mock avatar using DiceBear
    const seed = name.replace(/\s/g, '') + Date.now();
    const bgColors: Record<string, string> = {
      female: 'ffd5dc',
      male: 'c0e8ff',
    };
    const bg = bgColors[gender] || 'e8d5f5';
    const avatarUrl = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=${bg}&radius=0&size=400&scale=80`;

    const newCharacter: Character = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      gender: gender || 'female',
      personality: personality.trim(),
      appearance: (appearance || '').trim(),
      avatarUrl,
      chatCount: 0,
      isFeatured: false,
      tagline: personality.trim().slice(0, 60) + (personality.length > 60 ? '...' : ''),
    };

    res.json(newCharacter);
  },
);

export interface Character {
  id: string;
  name: string;
  gender: 'male' | 'female';
  personality: string;
  appearance: string;
  avatarUrl: string;
  chatCount: number;
  isFeatured: boolean;
  tagline: string;
}

// Helper to build DiceBear avatar URL (adventurer style, large, no radius for card fill)
function avatar(seed: string, bg: string): string {
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=${bg}&radius=0&size=400&scale=80`;
}

export const MOCK_CHARACTERS: Character[] = [
  {
    id: '1',
    name: 'Linh Chi',
    gender: 'female',
    personality: 'Dịu dàng, biết lắng nghe, luôn đồng cảm với mọi người',
    appearance: 'Tóc dài đen mượt, mắt nâu ấm áp, nụ cười hiền lành',
    avatarUrl: avatar('LinhChi', 'ffd5dc'),
    chatCount: 1250,
    isFeatured: true,
    tagline: 'Cô gái dịu dàng luôn lắng nghe bạn',
  },
  {
    id: '2',
    name: 'Minh Khoa',
    gender: 'male',
    personality: 'Vui vẻ, lạc quan, tràn đầy năng lượng tích cực',
    appearance: 'Tóc ngắn nâu, mắt sáng, nụ cười rạng rỡ',
    avatarUrl: avatar('MinhKhoa', 'c0e8ff'),
    chatCount: 980,
    isFeatured: true,
    tagline: 'Chàng trai vui vẻ mang đến năng lượng tích cực',
  },
  {
    id: '3',
    name: 'Hana',
    gender: 'female',
    personality: 'Nhẹ nhàng, thích triết lý, hay suy tư về cuộc sống',
    appearance: 'Tóc ngắn bob tím nhạt, mắt xanh dương, đeo kính tròn',
    avatarUrl: avatar('HanaPurple', 'e8d5f5'),
    chatCount: 856,
    isFeatured: true,
    tagline: 'Cô gái nhẹ nhàng yêu triết lý và suy tư',
  },
  {
    id: '4',
    name: 'Đức Anh',
    gender: 'male',
    personality: 'Chín chắn, đáng tin cậy, luôn cho lời khuyên tốt',
    appearance: 'Cao ráo, tóc đen gọn gàng, ánh mắt trầm tĩnh',
    avatarUrl: avatar('DucAnhCalm', 'bfdbfe'),
    chatCount: 723,
    isFeatured: false,
    tagline: 'Người anh đáng tin cậy luôn bên bạn',
  },
  {
    id: '5',
    name: 'Mai Anh',
    gender: 'female',
    personality: 'Hoạt bát, hài hước, thích kể chuyện cười',
    appearance: 'Tóc buộc cao cam đỏ, mắt to tròn, má phúng phính',
    avatarUrl: avatar('MaiAnhFun', 'fed7aa'),
    chatCount: 645,
    isFeatured: false,
    tagline: 'Cô nàng vui nhộn giúp bạn quên mọi buồn phiền',
  },
  {
    id: '6',
    name: 'Khánh',
    gender: 'male',
    personality: 'Nghệ sĩ, lãng mạn, yêu âm nhạc và thơ ca',
    appearance: 'Tóc dài buộc đuôi ngựa, mắt mơ màng, hay đeo tai nghe',
    avatarUrl: avatar('KhanhArtist', 'ddd6fe'),
    chatCount: 512,
    isFeatured: false,
    tagline: 'Chàng nghệ sĩ lãng mạn yêu âm nhạc',
  },
  {
    id: '7',
    name: 'Thảo Vy',
    gender: 'female',
    personality: 'Mạnh mẽ, quyết đoán, luôn động viên người khác cố gắng',
    appearance: 'Tóc ngắn đen, mắt sắc, phong cách sporty năng động',
    avatarUrl: avatar('ThaoVySport', 'bbf7d0'),
    chatCount: 489,
    isFeatured: true,
    tagline: 'Cô gái mạnh mẽ truyền cảm hứng cho bạn',
  },
  {
    id: '8',
    name: 'Hoàng Nam',
    gender: 'male',
    personality: 'Thông minh, hay đùa, kiến thức rộng, thích chia sẻ',
    appearance: 'Tóc xoăn nâu, đeo kính, nụ cười tinh nghịch',
    avatarUrl: avatar('HoangNamSmart', 'fef08a'),
    chatCount: 367,
    isFeatured: false,
    tagline: 'Chàng trai thông minh biết mọi thứ trên đời',
  },
  {
    id: '9',
    name: 'Yuki',
    gender: 'female',
    personality: 'Bí ẩn, ít nói nhưng sâu sắc, hay nói những điều ý nghĩa',
    appearance: 'Tóc trắng bạc dài, mắt tím, vẻ bí ẩn cuốn hút',
    avatarUrl: avatar('YukiMystic', 'e9d5ff'),
    chatCount: 298,
    isFeatured: false,
    tagline: 'Cô gái bí ẩn với những lời nói sâu sắc',
  },
  {
    id: '10',
    name: 'Tuấn Kiệt',
    gender: 'male',
    personality: 'Nhiệt tình, thích giúp đỡ, luôn sẵn sàng lắng nghe',
    appearance: 'Tóc ngắn đen, mặt tròn thân thiện, hay cười',
    avatarUrl: avatar('TuanKietFriend', 'a5f3fc'),
    chatCount: 234,
    isFeatured: false,
    tagline: 'Người bạn nhiệt tình luôn sẵn sàng giúp đỡ',
  },
];

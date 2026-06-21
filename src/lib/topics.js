export const TOPICS = [
  {
    id: 1,
    title: "Impact of AI on the Job Market",
    emoji: "🤖",
    description: "How artificial intelligence is reshaping employment, skill requirements, and career opportunities.",
  },
  {
    id: 2,
    title: "Climate Change and Sustainability",
    emoji: "🌍",
    description: "The urgent need for sustainable practices and how businesses can lead the green revolution.",
  },
  {
    id: 3,
    title: "The Startup Ecosystem in India",
    emoji: "🚀",
    description: "India's booming startup culture, unicorns, funding landscape, and entrepreneurial challenges.",
  },
  {
    id: 4,
    title: "Social Media: Addiction vs. Opportunity",
    emoji: "📱",
    description: "The dual nature of social media as both a productivity killer and a powerful business tool.",
  },
  {
    id: 5,
    title: "Ethics vs. Profit in Business",
    emoji: "⚖️",
    description: "Navigating the tension between maximizing shareholder value and maintaining ethical standards.",
  },
  {
    id: 6,
    title: "E-Commerce and Rural India",
    emoji: "🛒",
    description: "How digital marketplaces are transforming rural economies and bridging the urban-rural divide.",
  },
  {
    id: 7,
    title: "Electric Vehicles (EVs) in India",
    emoji: "⚡",
    description: "The EV revolution in India — policy push, infrastructure challenges, and market potential.",
  },
  {
    id: 8,
    title: "Digital Payments and Cashless Economy",
    emoji: "💳",
    description: "UPI, digital wallets, and India's journey toward becoming a cashless economy.",
  },
  {
    id: 9,
    title: "Women in Leadership",
    emoji: "👩‍💼",
    description: "Breaking the glass ceiling — challenges, progress, and the case for gender diversity in leadership.",
  },
  {
    id: 10,
    title: "Globalization vs. Make in India",
    emoji: "🇮🇳",
    description: "Balancing global trade integration with self-reliance and domestic manufacturing growth.",
  },
];

export function getRandomTopic() {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}
